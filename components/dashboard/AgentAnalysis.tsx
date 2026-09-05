"use client";

import { useState } from "react";
import type { AnalysisResponse, ApiResponse, Opportunity } from "@/lib/types";
import OpportunityList from "./OpportunityList";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import type { DemoScenario } from "./DemoScenarios";

export default function AgentAnalysis({
  demoScenario,
  onAnalysisComplete,
  onReview,
}: {
  demoScenario: DemoScenario;
  onAnalysisComplete?: (result: AnalysisResponse, forcedFallback: boolean) => void;
  onReview?: (opportunity: Opportunity) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forcedFallback, setForcedFallback] = useState(false);

  async function runAnalysis() {
    setStatus("loading");
    setError(null);
    const forceFallback = demoScenario === "ai_failure";

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceFallback }),
      });
      const body: ApiResponse<AnalysisResponse> = await res.json();

      if (!body.success) {
        setError(body.error);
        setStatus("error");
        return;
      }

      let data = body.data;

      // Handle custom demo scenario injections for judging presentation
      if (demoScenario === "excessive_discount") {
        // Inject an opportunity proposing ₹750 discount on a ₹10,000 cart (exceeds ₹500 & 5% cap)
        const excessiveOpp: Opportunity = {
          id: "opp_demo_excessive",
          customerId: "c007",
          customerName: "Manish Agarwal (Excessive Discount Demo)",
          customerSegment: "vip",
          productCategory: "Home & Living",
          productName: "Robot Vacuum Cleaner XL",
          transactionId: "t002_demo",
          problem: "abandoned_cart",
          cartValue: 10000,
          recommendedAction: "discount",
          recommendedDiscount: 750, // Violates max ₹500 & 5% cap (7.5%)
          confidence: 0.88,
          priorityScore: 92,
          priorityLevel: "critical",
          expectedRecovery: 9250,
          reasoning: "AI recommended a ₹750 discount (7.5% of cart) to maximize conversion, exceeding standard merchant cap.",
          recommendationFactors: [
            "Customer lifetime value is ₹41,200 (VIP).",
            "High intent abandoned cart value ₹10,000.",
            "AI proposed ₹750 incentive (7.5% cart value).",
          ],
          riskLevel: "high",
        };
        data = {
          ...data,
          summary: "Demo Scenario 2 Active: Excessive Discount recommendation generated to test policy guardrail enforcement.",
          opportunities: [excessiveOpp, ...data.opportunities],
        };
      } else if (demoScenario === "low_value_transaction") {
        const lowValueOpp: Opportunity = {
          id: "opp_demo_low_value",
          customerId: "c002",
          customerName: "Priya Nair (Low Value Cart)",
          customerSegment: "new",
          productCategory: "Accessories",
          productName: "Tech Organizer Pouch",
          transactionId: "t003_demo",
          problem: "abandoned_cart",
          cartValue: 999, // Below MIN_ABANDONED_CART_VALUE (3000)
          recommendedAction: "discount",
          recommendedDiscount: 0,
          confidence: 0.45,
          priorityScore: 35,
          priorityLevel: "low",
          expectedRecovery: 999,
          reasoning: "Cart value (₹999) is below the minimum threshold (₹3,000) for automated discount recovery. Marked as not eligible.",
          recommendationFactors: [
            "Cart value is ₹999 (Below ₹3,000 minimum threshold).",
            "Customer purchase history is low (1 purchase).",
            "Not eligible for automated incentive recovery.",
          ],
          riskLevel: "low",
        };
        data = {
          ...data,
          summary: "Demo Scenario 3 Active: Low value transaction evaluated.",
          opportunities: [lowValueOpp, ...data.opportunities],
        };
      }

      setResult(data);
      setForcedFallback(forceFallback);
      setStatus("idle");
      onAnalysisComplete?.(data, forceFallback);
    } catch {
      setError("Could not reach the analysis service. Please try again.");
      setStatus("error");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Revenue Intelligence Engine</h2>
          <p className="text-sm text-muted">AI-powered scan of abandoned carts and failed payments.</p>
        </div>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={status === "loading"}
          className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-brand-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "MerchantMind Analyzing…" : "Run Intelligence Analysis"}
        </button>
      </div>

      {status === "loading" && (
        <LoadingState label="MerchantMind is analyzing transaction patterns and identifying recovery opportunities..." />
      )}

      {status === "error" && error && (
        <div className="card border-[var(--danger)] p-4 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {forcedFallback && result && status !== "loading" && (
        <div className="card border-[var(--pending)] bg-[var(--pending-bg)] p-4 text-sm font-semibold text-[var(--pending)] flex items-center gap-2">
          <span>⚠️</span>
          <span>AI UNAVAILABLE — RULE-BASED FALLBACK ACTIVATED</span>
        </div>
      )}

      {result && status !== "loading" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-canvas p-3 rounded-lg border border-border">
            <p className="text-xs font-medium text-ink">{result.summary}</p>
            <StatusBadge
              label={result.source === "fallback" ? "Rule-Based Recovery Score" : "AI Analysis Badge"}
              tone={result.source === "fallback" ? "pending" : "success"}
            />
          </div>
          <OpportunityList opportunities={result.opportunities} onReview={onReview} />
        </div>
      )}

      {!result && status === "idle" && (
        <div className="card p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-ink">
            READY TO SCAN MERCHANT DATASET
          </p>
          <p className="text-xs text-muted max-w-md mx-auto">
            Click &ldquo;Run Intelligence Analysis&rdquo; to evaluate 1,000 transactions across 300 customers for high-priority recovery targets.
          </p>
        </div>
      )}
    </section>
  );
}
