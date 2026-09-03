"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AnalysisResponse,
  AuditEvent,
  Customer,
  GuardrailResult,
  Opportunity,
  OpportunityWorkflowStatus,
  Transaction,
} from "@/lib/types";
import { validateOpportunity } from "@/lib/guardrails";
import { appendAuditEvent, clearAuditLog, getAuditLog } from "@/lib/audit";
import { formatINR } from "@/lib/calculations";
import type { PaymentVerificationResult } from "@/app/api/payment-status/route";

import DemoModeBadge from "./DemoModeBadge";
import StatsCards from "./StatsCards";
import DatasetOverview from "./DatasetOverview";
import CustomerSegmentAnalytics from "./CustomerSegmentAnalytics";
import AnalyticsVisualizations from "./AnalyticsVisualizations";
import AgentDecisionFlow from "./AgentDecisionFlow";
import AgentAnalysis from "./AgentAnalysis";
import GuardrailPanel from "./GuardrailPanel";
import ApprovalPanel from "./ApprovalPanel";
import PaymentModal from "./PaymentModal";
import DemoScenarios, { type DemoScenario } from "./DemoScenarios";
import AuditTrail from "./AuditTrail";
import RevenueImpactPanel from "./RevenueImpactPanel";
import AgentActivity from "./AgentActivity";

import { customers as rawCustomers, transactions as rawTransactions } from "@/lib/validation";

interface OppState {
  status: OpportunityWorkflowStatus;
  guardrailResult: GuardrailResult;
  failureMessage?: string;
  failureIsSimulated?: boolean;
}

export default function DashboardClient() {
  const [demoScenario, setDemoScenario] = useState<DemoScenario>("high_value_recovery");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [oppStates, setOppStates] = useState<Record<string, OppState>>({});
  const [approvedIncentiveTotal, setApprovedIncentiveTotal] = useState(0);
  const [paymentModalOppId, setPaymentModalOppId] = useState<string | null>(null);
  const [approvalTokens, setApprovalTokens] = useState<Record<string, string>>({});
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [verifiedRecovered, setVerifiedRecovered] = useState(0);

  // Load persisted audit history once, client-side only (localStorage), and fetch server budget total.
  useEffect(() => {
    setAuditLog(getAuditLog());
    fetch("/api/budget")
      .then((res) => res.json())
      .then((body) => {
        if (body.success && typeof body.data?.approvedIncentiveTotal === "number") {
          setApprovedIncentiveTotal(body.data.approvedIncentiveTotal);
        }
      })
      .catch(() => {});
  }, []);

  const guardrailLogged = useRef<Set<string>>(new Set());

  function logEvent(event: Omit<AuditEvent, "id" | "timestamp">) {
    setAuditLog(appendAuditEvent(event));
  }

  function handleAnalysisComplete(result: AnalysisResponse, forcedFallback: boolean) {
    setOpportunities(result.opportunities);
    logEvent({
      actor: "SYSTEM",
      actionType: "ANALYSIS_STARTED",
      status: "info",
      description: "Revenue intelligence analysis started on 1,000 transactions across 300 customers.",
    });
    logEvent({
      actor: "AI_AGENT",
      actionType: "ANALYSIS_COMPLETED",
      status: forcedFallback ? "pending" : "success",
      description: forcedFallback
        ? "AI UNAVAILABLE — RULE-BASED FALLBACK ACTIVATED"
        : result.summary,
      metadata: { source: result.source, opportunityCount: result.opportunities.length },
    });
    result.opportunities.forEach((opp) => {
      logEvent({
        actor: "AI_AGENT",
        actionType: "OPPORTUNITY_IDENTIFIED",
        status: "info",
        description: `${opp.customerName} — ${formatINR(opp.cartValue)} ${opp.problem.replace(
          /_/g,
          " "
        )}. Priority: ${opp.priorityScore}/100.`,
        metadata: { opportunityId: opp.id, priorityScore: opp.priorityScore },
      });
    });
  }

  function handleReview(opportunity: Opportunity) {
    setReviewingId(opportunity.id);

    if (!oppStates[opportunity.id]) {
      const result = validateOpportunity(opportunity, approvedIncentiveTotal);
      handleGuardrailReviewed(opportunity, result);
    }
  }

  function handleGuardrailReviewed(opportunity: Opportunity, result: GuardrailResult) {
    if (!guardrailLogged.current.has(opportunity.id)) {
      guardrailLogged.current.add(opportunity.id);
      setOppStates((prev) => ({
        ...prev,
        [opportunity.id]: {
          status: result.allowed ? "pending_approval" : "blocked",
          guardrailResult: result,
        },
      }));
      logEvent({
        actor: "SYSTEM",
        actionType: "GUARDRAIL_CHECKED",
        status: result.allowed ? "success" : "failed",
        description: result.allowed
          ? `All financial guardrails passed for ${opportunity.customerName}.`
          : `BLOCKED BY POLICY: Guardrails blocked recommended action for ${opportunity.customerName}.`,
        metadata: { opportunityId: opportunity.id, checks: result.checks },
      });
    }
  }

  async function handleApprove(opportunity: Opportunity) {
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: opportunity.id }),
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.data?.approvalToken) {
        const errorMsg = data.error || "Approval failed on the server.";
        setOppStates((prev) => ({
          ...prev,
          [opportunity.id]: {
            ...prev[opportunity.id],
            status: "blocked",
            failureMessage: errorMsg,
          },
        }));
        logEvent({
          actor: "SYSTEM",
          actionType: "APPROVAL_REFUSED",
          status: "failed",
          description: `Approval refused for ${opportunity.customerName}: ${errorMsg}`,
          metadata: { opportunityId: opportunity.id, error: errorMsg },
        });
        return;
      }

      const token = data.data.approvalToken as string;
      setApprovalTokens((prev) => ({ ...prev, [opportunity.id]: token }));

      setApprovedIncentiveTotal((prev) => prev + opportunity.recommendedDiscount);
      fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", discount: opportunity.recommendedDiscount }),
      }).catch(() => {});

      setOppStates((prev) => ({
        ...prev,
        [opportunity.id]: { ...prev[opportunity.id], status: "processing_payment" },
      }));

      logEvent({
        actor: "MERCHANT",
        actionType: "ACTION_APPROVED",
        status: "success",
        description: `Approved ${formatINR(opportunity.recommendedDiscount)} incentive for ${
          opportunity.customerName
        }. Approval token issued.`,
        metadata: { opportunityId: opportunity.id, approvalToken: token },
      });
      setPaymentModalOppId(opportunity.id);
    } catch {
      setOppStates((prev) => ({
        ...prev,
        [opportunity.id]: {
          ...prev[opportunity.id],
          status: "blocked",
          failureMessage: "Network error requesting merchant approval token.",
        },
      }));
    }
  }

  function handleReject(opportunity: Opportunity) {
    setOppStates((prev) => ({
      ...prev,
      [opportunity.id]: { ...prev[opportunity.id], status: "rejected" },
    }));
    logEvent({
      actor: "MERCHANT",
      actionType: "ACTION_REJECTED",
      status: "rejected",
      description: `NO ACTION EXECUTED: Merchant rejected recommendation for ${opportunity.customerName}.`,
      metadata: { opportunityId: opportunity.id },
    });
  }

  function handleOrderCreated(opportunity: Opportunity, orderId: string) {
    logEvent({
      actor: "SYSTEM",
      actionType: "RAZORPAY_ORDER_CREATED",
      status: "info",
      description: `Created Razorpay Test Mode order for ${opportunity.customerName}.`,
      metadata: { opportunityId: opportunity.id, orderId },
    });
  }

  function handlePaymentSuccess(opportunity: Opportunity, result: PaymentVerificationResult) {
    setOppStates((prev) => ({
      ...prev,
      [opportunity.id]: { ...prev[opportunity.id], status: "payment_success" },
    }));
    setVerifiedRecovered((prev) => prev + result.amount);
    logEvent({
      actor: "RAZORPAY",
      actionType: "PAYMENT_SUCCESS",
      status: "success",
      description: `Payment succeeded for ${opportunity.customerName} (${formatINR(
        result.amount
      )}).`,
      metadata: { ...result },
    });
    setPaymentModalOppId(null);
  }

  function handlePaymentFailure(opportunity: Opportunity, isSimulated: boolean) {
    logEvent({
      actor: "RAZORPAY",
      actionType: "PAYMENT_FAILED",
      status: "failed",
      description: isSimulated
        ? `Simulated payment failure for ${opportunity.customerName} (Payment Processing → Failed).`
        : `Payment failed or Checkout was dismissed for ${opportunity.customerName}.`,
      metadata: { opportunityId: opportunity.id, simulated: isSimulated },
    });
    logEvent({
      actor: "SYSTEM",
      actionType: "WORKFLOW_STOPPED",
      status: "stopped",
      description: "The agent has stopped this workflow. No automatic retry will occur.",
      metadata: { opportunityId: opportunity.id },
    });

    setApprovedIncentiveTotal((prev) => Math.max(0, prev - opportunity.recommendedDiscount));
    setApprovalTokens((prev) => {
      const copy = { ...prev };
      delete copy[opportunity.id];
      return copy;
    });
    fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rollback", discount: opportunity.recommendedDiscount }),
    }).catch(() => {});

    setOppStates((prev) => ({
      ...prev,
      [opportunity.id]: {
        ...prev[opportunity.id],
        status: "pending_approval",
        failureMessage: "Payment Processing → Failed. Workflow stopped.",
        failureIsSimulated: isSimulated,
      },
    }));
    setPaymentModalOppId(null);
  }

  function handleClearAudit() {
    clearAuditLog();
    setAuditLog([]);
  }

  const reviewingOpportunity = opportunities.find((o) => o.id === reviewingId) ?? null;
  const reviewingState = reviewingId ? oppStates[reviewingId] : undefined;
  const paymentOpportunity = opportunities.find((o) => o.id === paymentModalOppId) ?? null;

  return (
    <div className="space-y-8">
      {/* Top Banner with Demo Mode Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">MerchantMind Intelligence Dashboard</h1>
          <p className="text-xs text-muted mt-1">
            AI-powered revenue recovery platform with human-in-the-loop merchant controls and Razorpay Test Mode execution.
          </p>
        </div>
        <div>
          <DemoModeBadge />
        </div>
      </div>

      {/* Phase 3: Enhanced Dashboard Metrics */}
      <StatsCards
        customers={rawCustomers as Customer[]}
        transactions={rawTransactions as Transaction[]}
        opportunities={opportunities}
        verifiedRecovered={verifiedRecovered}
      />

      {/* Phase 12: Dataset Statistics Panel */}
      <DatasetOverview
        customers={rawCustomers as Customer[]}
        transactions={rawTransactions as Transaction[]}
        opportunities={opportunities}
      />

      {/* Phase 11: Agent Decision Flow Architecture */}
      <AgentDecisionFlow />

      {/* Phase 9: Demo Scenario Simulator */}
      <DemoScenarios value={demoScenario} onChange={setDemoScenario} />

      {/* Revenue Intelligence Analysis & Opportunity List */}
      <AgentAnalysis
        demoScenario={demoScenario}
        onAnalysisComplete={handleAnalysisComplete}
        onReview={handleReview}
      />

      {/* Phase 4: Customer Segment Analytics */}
      <CustomerSegmentAnalytics
        customers={rawCustomers as Customer[]}
        transactions={rawTransactions as Transaction[]}
        opportunities={opportunities}
      />

      {/* Phase 10: Analytics Visualizations */}
      <AnalyticsVisualizations
        customers={rawCustomers as Customer[]}
        transactions={rawTransactions as Transaction[]}
        opportunities={opportunities}
      />

      {/* Financial Guardrails & Merchant Approval Modal / Panel */}
      {reviewingOpportunity && reviewingState && (
        <section className="space-y-4 rounded-xl border border-brand/40 bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-base font-bold text-ink">
                Reviewing Recovery Target: {reviewingOpportunity.customerName}
              </h3>
              <p className="text-xs text-muted">
                Transaction #{reviewingOpportunity.transactionId} • {formatINR(reviewingOpportunity.cartValue)} Cart
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReviewingId(null)}
              className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-muted hover:bg-canvas hover:text-ink"
            >
              Close Review Panel ✕
            </button>
          </div>

          <GuardrailPanel result={reviewingState.guardrailResult} />

          {reviewingState.failureMessage && (
            <div className="card border-[var(--danger)] bg-red-500/5 p-4 text-sm">
              <p className="font-semibold text-[var(--danger)]">{reviewingState.failureMessage}</p>
              <p className="mt-1 text-xs text-muted">
                Suggested next step: Request customer to retry with an alternate payment method.
              </p>
              <span
                className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                  reviewingState.failureIsSimulated
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    : "bg-red-500/20 text-red-700 dark:text-red-300"
                }`}
              >
                {reviewingState.failureIsSimulated
                  ? "Simulated Demo Scenario Failure"
                  : "Razorpay Payment Failure"}
              </span>
            </div>
          )}

          {reviewingState.status === "blocked" && (
            <div className="card border-red-500 bg-red-500/10 p-4 text-sm font-bold text-red-600 dark:text-red-400">
              🛑 BLOCKED BY POLICY: This action violates financial limits and cannot proceed to merchant approval.
            </div>
          )}

          {(reviewingState.status === "pending_approval" ||
            reviewingState.status === "processing_payment") && (
            <ApprovalPanel
              opportunity={reviewingOpportunity}
              onApprove={() => handleApprove(reviewingOpportunity)}
              onReject={() => handleReject(reviewingOpportunity)}
              disabled={reviewingState.status === "processing_payment"}
            />
          )}

          {reviewingState.status === "rejected" && (
            <div className="card bg-canvas p-4 text-sm font-semibold text-muted">
              🔒 NO ACTION EXECUTED: Merchant explicitly rejected this recovery recommendation.
            </div>
          )}

          {reviewingState.status === "payment_success" && (
            <div className="card border-emerald-500 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              ✅ PAYMENT SUCCESSFUL: Revenue recovered and verified via Razorpay signature.
            </div>
          )}
        </section>
      )}

      {/* Razorpay Test Mode Payment Modal */}
      {paymentOpportunity && (
        <PaymentModal
          opportunity={paymentOpportunity}
          demoScenario={demoScenario}
          onClose={() => setPaymentModalOppId(null)}
          onOrderCreated={(orderId) => handleOrderCreated(paymentOpportunity, orderId)}
          onSuccess={(result) => handlePaymentSuccess(paymentOpportunity, result)}
          onFailure={(isSimulated) => handlePaymentFailure(paymentOpportunity, isSimulated)}
        />
      )}

      {/* Verified Revenue & Stepper Activity */}
      <RevenueImpactPanel
        transactions={rawTransactions as Transaction[]}
        opportunities={opportunities}
        verifiedRecovered={verifiedRecovered}
      />

      <AgentActivity
        hasAnalyzed={opportunities.length > 0}
        status={reviewingState?.status}
      />

      {/* Session Audit Log */}
      <AuditTrail events={auditLog} onClear={handleClearAudit} />
    </div>
  );
}
