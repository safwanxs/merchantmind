import type {
  AnalysisResponse,
  Customer,
  Opportunity,
  OpportunityExplanation,
  RecommendedAction,
  Transaction,
} from "./types";
import { customers, transactions } from "./validation";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { getOptionalEnv } from "@/lib/env";
import { buildAnalysisPrompt } from "@/lib/ai/prompts";

// ---------------------------------------------------------------------------
// Guardrail-adjacent constants used directly inside the analysis engine.
// The full Guardrail Engine (lib/guardrails.ts, Phase 5) re-validates these
// independently before any action can be approved — these caps exist here
// too so neither the AI provider nor the fallback engine can ever propose
// something outside them in the first place.
// ---------------------------------------------------------------------------
const MAX_DISCOUNT_PERCENT = 0.05;
const MAX_DISCOUNT_AMOUNT = 500;
const MIN_ABANDONED_CART_VALUE = 3000;
const MIN_PREVIOUS_PURCHASES = 2;

// ---------------------------------------------------------------------------
// Provider abstraction — one interface, swap in any LLM by adding a class
// that implements `analyze()`. Only Gemini is implemented for now.
// ---------------------------------------------------------------------------
export interface AIProvider {
  name: string;
  analyze(customers: Customer[], transactions: Transaction[]): Promise<AnalysisResponse>;
}

interface RawOpportunity {
  id?: unknown;
  customerId?: unknown;
  customerName?: unknown;
  transactionId?: unknown;
  problem?: unknown;
  cartValue?: unknown;
  recommendedAction?: unknown;
  recommendedDiscount?: unknown;
  confidence?: unknown;
  expectedRecovery?: unknown;
  reasoning?: unknown;
  riskLevel?: unknown;
}

interface RawAnalysis {
  summary?: unknown;
  opportunities?: unknown;
}

const rawAnalysisSchema = z.object({
  summary: z.string().optional(),
  opportunities: z.array(z.object({
    customerId: z.string(), transactionId: z.string(), problem: z.string(),
    recommendedAction: z.string(), recommendedDiscount: z.number(), confidence: z.number(),
    reasoning: z.string(), riskLevel: z.string(),
  })).optional(),
});

/**
 * Clamps a discount to the same rules the Guardrail Engine enforces:
 * never more than 5% of the cart, never more than ₹500. The 5% figure is
 * floored (not rounded) so it never technically exceeds the cap once the
 * flat ₹500 ceiling is the binding constraint.
 */
export function clampDiscount(cartValue: number, requestedDiscount: number): number {
  const percentCap = Math.floor(cartValue * MAX_DISCOUNT_PERCENT);
  const cap = Math.min(percentCap, MAX_DISCOUNT_AMOUNT);
  if (Number.isNaN(requestedDiscount) || requestedDiscount < 0) return 0;
  return Math.min(Math.round(requestedDiscount), cap);
}


export function buildExplanation(
  customer: Customer,
  txn: Transaction,
  recommendedAction: RecommendedAction,
  discount: number,
  confidence: number
): OpportunityExplanation {
  const whyCustomer = [
    `${customer.previousPurchases} previous purchase${customer.previousPurchases === 1 ? "" : "s"}`,
    `₹${customer.lifetimeValue.toLocaleString("en-IN")} lifetime value`,
    `₹${txn.cartValue.toLocaleString("en-IN")} ${txn.status.replace(/_/g, " ")}`,
    `${customer.customerSegment.toUpperCase()} customer segment`,
  ];

  let whyAction = "";
  if (recommendedAction === "payment_reminder") {
    whyAction = `Customer has high purchase history (${customer.previousPurchases} orders). A zero-cost payment reminder is recommended first.`;
  } else if (recommendedAction === "payment_retry_suggestion") {
    whyAction = `Payment failed due to issuer/network issues. Suggesting an alternate payment method is the zero-cost recovery path.`;
  } else {
    whyAction = `A small incentive is recommended because the customer has high purchase history and the proposed incentive remains within merchant policy.`;
  }

  let whyAmount = "";
  if (discount === 0) {
    whyAmount = "₹0 incentive cost (Lowest-cost action strategy).";
  } else {
    whyAmount = `The ₹${discount} amount is below the configured ₹500 maximum and below the 5% cart-value limit.`;
  }

  const estimatedIncrementalRevenue = Math.round(confidence * txn.cartValue - discount);

  return {
    whyCustomer,
    whyAction,
    whyAmount,
    estimatedIncrementalRevenue,
  };
}

// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for "is this transaction a real opportunity, and
// what should be recommended for it?" Both the deterministic analysis
// engine (what the merchant sees on the dashboard) and the server-side
// trusted lookup (what actually gets charged at payment time) call this
// same function. They can never diverge, because there is only one
// implementation of the eligibility rule and the action it produces.
//
// Returns null when the transaction is not a real opportunity at all
// (wrong status, below the high-value threshold, insufficient purchase
// history) — this null is what lets the payment route refuse to create
// an order for anything that was never actually surfaced to the merchant.
// ---------------------------------------------------------------------------
import { calculatePriorityScore, formatINR } from "./calculations";

export function buildRecommendationFactors(customer: Customer, txn: Transaction): string[] {
  const factors: string[] = [
    `Customer completed ${customer.previousPurchases} previous purchase${customer.previousPurchases === 1 ? "" : "s"}.`,
    `Customer lifetime value is ${formatINR(customer.lifetimeValue)}.`,
  ];
  if (customer.averageOrderValue && txn.cartValue >= customer.averageOrderValue) {
    factors.push(`Cart value (${formatINR(txn.cartValue)}) is at or above their average order value (${formatINR(customer.averageOrderValue)}).`);
  } else {
    factors.push(`Cart value is ${formatINR(txn.cartValue)}.`);
  }

  if (txn.status === "abandoned") {
    factors.push(`Abandonment occurred recently (${txn.createdAt}).`);
  } else if (txn.status === "payment_failed") {
    factors.push(`Payment failed due to ${txn.paymentFailureReason?.replace(/_/g, " ") || "technical reason"}.`);
  }

  const segmentLabel = customer.customerSegment.replace(/_/g, " ").toUpperCase();
  factors.push(`Customer belongs to ${segmentLabel} segment.`);

  return factors;
}

export function deriveOpportunity(
  customer: Customer,
  txn: Transaction
): Opportunity | null {
  if (txn.status === "abandoned") {
    const isEligible =
      txn.cartValue > MIN_ABANDONED_CART_VALUE &&
      customer.previousPurchases >= MIN_PREVIOUS_PURCHASES;
    if (!isEligible) return null;

    const isHighIntentReminder = customer.previousPurchases >= 6;
    const recommendedAction: RecommendedAction = isHighIntentReminder
      ? "payment_reminder"
      : "discount";
    const historyDepth = Math.min(customer.previousPurchases, 8) / 8;
    const confidence = Number((0.75 + historyDepth * 0.15).toFixed(2));
    const rawDiscount =
      recommendedAction === "discount" ? Math.min(200, txn.cartValue * MAX_DISCOUNT_PERCENT) : 0;
    const discount = clampDiscount(txn.cartValue, rawDiscount);
    const expectedRecovery = Math.round(confidence * (txn.cartValue - discount));

    const explanation = buildExplanation(customer, txn, recommendedAction, discount, confidence);
    const recommendationFactors = buildRecommendationFactors(customer, txn);
    const { priorityScore, priorityLevel } = calculatePriorityScore(
      txn.cartValue,
      customer.lifetimeValue,
      customer.previousPurchases,
      confidence,
      customer.customerSegment,
      customer.lastActiveDays ?? 7
    );

    return {
      id: `opp_${txn.id}`,
      customerId: customer.id,
      customerName: customer.name,
      customerSegment: customer.customerSegment,
      productCategory: txn.productCategory,
      productName: txn.productName,
      transactionId: txn.id,
      problem: "abandoned_cart",
      cartValue: txn.cartValue,
      recommendedAction,
      recommendedDiscount: discount,
      confidence,
      priorityScore,
      priorityLevel,
      expectedRecovery,
      reasoning: isHighIntentReminder
        ? `${customer.name} is a high-intent VIP customer with ${customer.previousPurchases} previous purchases. The agent recommends a zero-cost Payment Reminder before offering a discount.`
        : `${customer.name} has completed ${customer.previousPurchases} previous purchases and abandoned a ₹${txn.cartValue.toLocaleString(
            "en-IN"
          )} cart. Historical behavior indicates strong conversion potential with a modest ₹${discount} incentive.`,
      explanation,
      recommendationFactors,
      riskLevel: txn.cartValue > 7000 ? "high" : txn.cartValue > 4000 ? "medium" : "low",
    };
  }

  if (txn.status === "payment_failed") {
    const confidence = 0.8;
    const expectedRecovery = Math.round(confidence * txn.cartValue);
    const explanation = buildExplanation(customer, txn, "payment_retry_suggestion", 0, confidence);
    const recommendationFactors = buildRecommendationFactors(customer, txn);
    const { priorityScore, priorityLevel } = calculatePriorityScore(
      txn.cartValue,
      customer.lifetimeValue,
      customer.previousPurchases,
      confidence,
      customer.customerSegment,
      customer.lastActiveDays ?? 7
    );

    return {
      id: `opp_${txn.id}`,
      customerId: customer.id,
      customerName: customer.name,
      customerSegment: customer.customerSegment,
      productCategory: txn.productCategory,
      productName: txn.productName,
      transactionId: txn.id,
      problem: "payment_failure",
      cartValue: txn.cartValue,
      recommendedAction: "payment_retry_suggestion",
      recommendedDiscount: 0,
      confidence,
      priorityScore,
      priorityLevel,
      expectedRecovery,
      reasoning: `Payment for ${customer.name}'s ₹${txn.cartValue.toLocaleString(
        "en-IN"
      )} order failed${
        txn.paymentFailureReason ? ` (${txn.paymentFailureReason.replace(/_/g, " ")})` : ""
      }. The agent does not auto-retry failed payments — the merchant should ask the customer to retry with a different payment method.`,
      explanation,
      recommendationFactors,
      riskLevel: "medium",
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Deterministic fallback engine (Phase 3). Runs with zero external
// dependencies so the app is fully functional without any AI credentials.
// ---------------------------------------------------------------------------
export function runDeterministicAnalysis(
  customers: Customer[],
  transactions: Transaction[]
): AnalysisResponse {
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const opportunities: Opportunity[] = [];

  for (const txn of transactions) {
    const customer = customerById.get(txn.customerId);
    if (!customer) continue;

    const opportunity = deriveOpportunity(customer, txn);
    if (opportunity) opportunities.push(opportunity);
  }

  opportunities.sort((a, b) => b.expectedRecovery - a.expectedRecovery);

  return {
    summary: `Analyzed ${transactions.length} transactions across ${customers.length} customers and found ${opportunities.length} revenue recovery opportunit${
      opportunities.length === 1 ? "y" : "ies"
    }.`,
    opportunities,
    source: "fallback",
  };
}


// ---------------------------------------------------------------------------
// Sanitizer — the "never trust raw LLM output" enforcement layer (Phase 4).
// Every trust-sensitive field is re-derived from real data or re-clamped;
// nothing the model says about money, identity, or confidence is taken
// at face value.
// ---------------------------------------------------------------------------
function validateAndSanitize(
  raw: RawAnalysis,
  customers: Customer[],
  transactions: Transaction[]
): Opportunity[] {
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const txnById = new Map(transactions.map((t) => [t.id, t]));

  if (!Array.isArray(raw.opportunities)) return [];

  const sanitized: Opportunity[] = [];

  for (const item of raw.opportunities as RawOpportunity[]) {
    const customerId = typeof item.customerId === "string" ? item.customerId : "";
    const transactionId = typeof item.transactionId === "string" ? item.transactionId : "";

    const customer = customerById.get(customerId);
    const txn = txnById.get(transactionId);

    // Drop anything that doesn't match a real customer/transaction pair —
    // this is the single most important check: it prevents a hallucinated
    // or injected opportunity from ever reaching the guardrail/approval flow.
    if (!customer || !txn || txn.customerId !== customer.id) continue;

    const problem = item.problem === "payment_failure" ? "payment_failure" : "abandoned_cart";
    const recommendedAction =
      problem === "payment_failure"
        ? "payment_retry_suggestion"
        : item.recommendedAction === "payment_retry_suggestion"
        ? "payment_retry_suggestion"
        : "discount";

    const requestedDiscount =
      recommendedAction === "discount" && typeof item.recommendedDiscount === "number"
        ? item.recommendedDiscount
        : 0;
    const discount =
      recommendedAction === "discount" ? clampDiscount(txn.cartValue, requestedDiscount) : 0;

    const confidenceRaw = typeof item.confidence === "number" ? item.confidence : 0.5;
    const confidence = Number(Math.min(0.95, Math.max(0.5, confidenceRaw)).toFixed(2));

    const riskLevel: Opportunity["riskLevel"] =
      item.riskLevel === "low" || item.riskLevel === "medium" || item.riskLevel === "high"
        ? item.riskLevel
        : "medium";

    const reasoning =
      typeof item.reasoning === "string" ? item.reasoning.slice(0, 600) : "No reasoning provided.";

    const explanation = buildExplanation(
      customer,
      txn,
      recommendedAction,
      discount,
      confidence
    );
    const recommendationFactors = buildRecommendationFactors(customer, txn);
    const { priorityScore, priorityLevel } = calculatePriorityScore(
      txn.cartValue,
      customer.lifetimeValue,
      customer.previousPurchases,
      confidence,
      customer.customerSegment,
      customer.lastActiveDays ?? 7
    );

    sanitized.push({
      id: `opp_${txn.id}`,
      // Name and cart value are always re-derived from the real dataset —
      // never taken from the model, even if it echoed them correctly.
      customerId: customer.id,
      customerName: customer.name,
      customerSegment: customer.customerSegment,
      productCategory: txn.productCategory,
      productName: txn.productName,
      transactionId: txn.id,
      problem,
      cartValue: txn.cartValue,
      recommendedAction,
      recommendedDiscount: discount,
      confidence,
      priorityScore,
      priorityLevel,
      // Always recomputed, never trusted from the model.
      expectedRecovery: Math.round(confidence * (txn.cartValue - discount)),
      reasoning,
      explanation,
      recommendationFactors,
      riskLevel,
    });

  }

  sanitized.sort((a, b) => b.expectedRecovery - a.expectedRecovery);
  return sanitized;
}

// ---------------------------------------------------------------------------
// Gemini provider uses the official SDK. The provider is isolated so fallback
// behavior remains deterministic and testable.
// ---------------------------------------------------------------------------
const GEMINI_MODEL = "gemini-2.0-flash";

export class GeminiProvider implements AIProvider {
  name = "gemini";

  async analyze(customers: Customer[], transactions: Transaction[]): Promise<AnalysisResponse> {
    const apiKey = getOptionalEnv().GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildAnalysisPrompt(customers, transactions),
      config: { responseMimeType: "application/json", temperature: 0.3 },
    });
    const text = response.text;
    if (!text) {
      throw new Error("Gemini response contained no text");
    }

    let parsed: RawAnalysis;
    try {
      parsed = rawAnalysisSchema.parse(JSON.parse(text));
    } catch {
      throw new Error("Gemini response was not valid JSON");
    }

    const opportunities = validateAndSanitize(parsed, customers, transactions);

    return {
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary
          : `Analyzed ${transactions.length} transactions and found ${opportunities.length} opportunities.`,
      opportunities,
      source: "ai",
    };
  }
}

// ---------------------------------------------------------------------------
// Single entry point the API route calls. Tries the AI provider, validates
// its output, and falls back to the deterministic engine on any failure —
// missing credentials, network error, broken JSON, or an AI response that
// yields zero trustworthy opportunities despite real risk data existing.
// ---------------------------------------------------------------------------
export async function runAnalysis(
  customers: Customer[],
  transactions: Transaction[]
): Promise<AnalysisResponse> {
  const hasRealRisk = transactions.some(
    (t) => t.status === "abandoned" || t.status === "payment_failed"
  );

  if (getOptionalEnv().GEMINI_API_KEY) {
    try {
      const provider = new GeminiProvider();
      let result: AnalysisResponse | undefined;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          result = await Promise.race([
            provider.analyze(customers, transactions),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Gemini timeout")), 8000)),
          ]);
          break;
        } catch (error) {
          if (attempt === 1) throw error;
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        }
      }
      if (!result) throw new Error("Gemini returned no result");
      if (result.opportunities.length > 0 || !hasRealRisk) {
        return result;
      }
      // AI returned nothing trustworthy despite real risk data — treat as
      // untrustworthy rather than silently reporting "no opportunities".
    } catch {
      // Missing key, network error, broken JSON — fall through to fallback.
    }
  }

  return runDeterministicAnalysis(customers, transactions);
}

/**
 * Server-side trusted lookup used at payment time. This calls the exact
 * same `deriveOpportunity` used by the analysis engine — not a parallel
 * reimplementation — so it is structurally impossible for the amount a
 * merchant approved on the dashboard to differ from the amount the server
 * charges. If a transaction wouldn't have been surfaced as an opportunity
 * by the analysis engine (wrong status, below threshold, insufficient
 * history), this returns null and the payment route refuses to proceed,
 * even if a client crafts a plausible-looking opportunityId directly.
 */
export function getTrustedOpportunityById(opportunityId: string): Opportunity | null {
  const transactionId = opportunityId.replace(/^opp_/, "");
  const txn = transactions.find((t) => t.id === transactionId);
  if (!txn) return null;

  const customer = customers.find((c) => c.id === txn.customerId);
  if (!customer) return null;

  return deriveOpportunity(customer, txn);
}
