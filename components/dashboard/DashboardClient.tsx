"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AnalysisResponse,
  AuditEvent,
  GuardrailResult,
  Opportunity,
  OpportunityWorkflowStatus,
} from "@/lib/types";
import { validateOpportunity } from "@/lib/guardrails";
import { appendAuditEvent, clearAuditLog, getAuditLog } from "@/lib/audit";
import { formatINR } from "@/lib/calculations";
import type { PaymentVerificationResult } from "@/app/api/payment-status/route";

import AgentAnalysis from "./AgentAnalysis";
import GuardrailPanel from "./GuardrailPanel";
import ApprovalPanel from "./ApprovalPanel";
import PaymentModal from "./PaymentModal";
import DemoScenarios, { type DemoScenario } from "./DemoScenarios";
import AuditTrail from "./AuditTrail";
import StatsCards from "./StatsCards";
import RevenueImpactPanel from "./RevenueImpactPanel";
import AgentActivity from "./AgentActivity";
import EvaluationPanel from "./EvaluationPanel";
import rawTransactions from "@/data/transactions.json";
import type { Transaction } from "@/lib/types";



interface OppState {
  status: OpportunityWorkflowStatus;
  guardrailResult: GuardrailResult;
  failureMessage?: string;
  failureIsSimulated?: boolean;
}

export default function DashboardClient() {
  const [demoScenario, setDemoScenario] = useState<DemoScenario>("success");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [oppStates, setOppStates] = useState<Record<string, OppState>>({});
  const [approvedIncentiveTotal, setApprovedIncentiveTotal] = useState(0);
  const [paymentModalOppId, setPaymentModalOppId] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [verifiedRecovered, setVerifiedRecovered] = useState(0);

  // Load persisted audit history once, client-side only (localStorage).
  useEffect(() => {
    setAuditLog(getAuditLog());
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
      description: "Revenue intelligence analysis started.",
    });
    logEvent({
      actor: "AI_AGENT",
      actionType: "ANALYSIS_COMPLETED",
      status: forcedFallback ? "pending" : "success",
      description: forcedFallback
        ? "AI provider unavailable. Ran deterministic recovery analysis."
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
        )}.`,
        metadata: { opportunityId: opp.id },
      });
    });
  }

  function handleReview(opportunity: Opportunity) {
    setReviewingId(opportunity.id);

    if (!oppStates[opportunity.id]) {
      const result = validateOpportunity(opportunity, approvedIncentiveTotal);
      setOppStates((prev) => ({
        ...prev,
        [opportunity.id]: {
          status: result.allowed ? "pending_approval" : "blocked",
          guardrailResult: result,
        },
      }));

      if (!guardrailLogged.current.has(opportunity.id)) {
        guardrailLogged.current.add(opportunity.id);
        logEvent({
          actor: "SYSTEM",
          actionType: "GUARDRAIL_CHECKED",
          status: result.allowed ? "success" : "failed",
          description: result.allowed
            ? `All guardrails passed for ${opportunity.customerName}.`
            : `Guardrails blocked the recommended action for ${opportunity.customerName}.`,
          metadata: { opportunityId: opportunity.id, checks: result.checks },
        });
      }
    }
  }

  function handleApprove(opportunity: Opportunity) {
    setApprovedIncentiveTotal((prev) => prev + opportunity.recommendedDiscount);
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
      }.`,
      metadata: { opportunityId: opportunity.id },
    });
    setPaymentModalOppId(opportunity.id);
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
      description: `Rejected recommended action for ${opportunity.customerName}.`,
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
        ? `Simulated payment failure for ${opportunity.customerName} (Demo Scenario).`
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

    // Reverse the provisional budget hold — a fresh approval will re-add it.
    setApprovedIncentiveTotal((prev) => Math.max(0, prev - opportunity.recommendedDiscount));

    // Require a fresh merchant approval before any retry — send the
    // opportunity back to the Approval Panel, not straight back to payment.
    setOppStates((prev) => ({
      ...prev,
      [opportunity.id]: {
        ...prev[opportunity.id],
        status: "pending_approval",
        failureMessage: "Payment could not be completed. The agent has stopped this workflow.",
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
      <StatsCards
        transactions={rawTransactions as Transaction[]}
        opportunities={opportunities}
        verifiedRecovered={verifiedRecovered}
      />

      <RevenueImpactPanel
        transactions={rawTransactions as Transaction[]}
        opportunities={opportunities}
        verifiedRecovered={verifiedRecovered}
      />

      <AgentActivity
        hasAnalyzed={opportunities.length > 0}
        status={reviewingState?.status}
      />

      <DemoScenarios value={demoScenario} onChange={setDemoScenario} />

      <AgentAnalysis
        demoScenario={demoScenario}
        onAnalysisComplete={handleAnalysisComplete}
        onReview={handleReview}
      />

      <EvaluationPanel />

      {reviewingOpportunity && reviewingState && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">
              Reviewing: {reviewingOpportunity.customerName}
            </h3>
            <button
              type="button"
              onClick={() => setReviewingId(null)}
              className="text-xs font-medium text-muted hover:text-ink"
            >
              Close
            </button>
          </div>

          <GuardrailPanel result={reviewingState.guardrailResult} />

          {reviewingState.failureMessage && (
            <div className="card border-[var(--danger)] p-4 text-sm">
              <p className="font-medium text-[var(--danger)]">{reviewingState.failureMessage}</p>
              <p className="mt-1 text-muted">
                Suggested next step: Request customer to choose another payment method.
              </p>
              <span
                className={`mt-2 inline-block rounded-md px-2 py-1 text-xs font-medium ${
                  reviewingState.failureIsSimulated
                    ? "bg-[var(--pending-bg)] text-[var(--pending)]"
                    : "bg-[var(--danger-bg)] text-[var(--danger)]"
                }`}
              >
                {reviewingState.failureIsSimulated
                  ? "Simulated demo failure"
                  : "Real payment failure"}
              </span>
            </div>
          )}

          {reviewingState.status === "blocked" && (
            <div className="card border-[var(--danger)] p-4 text-sm text-[var(--danger)]">
              This action is blocked by one or more guardrails and cannot proceed to approval.
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
            <div className="card p-4 text-sm text-muted">This action was rejected.</div>
          )}

          {reviewingState.status === "payment_success" && (
            <div className="card border-[var(--success)] p-4 text-sm text-[var(--success)]">
              Payment succeeded. This opportunity is fully resolved.
            </div>
          )}
        </section>
      )}

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

      <AuditTrail events={auditLog} onClear={handleClearAudit} />
    </div>
  );
}
