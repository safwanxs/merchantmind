"use client";

import { useState } from "react";
import type { Opportunity } from "@/lib/types";
import { formatINR } from "@/lib/calculations";
import StatusBadge from "@/components/shared/StatusBadge";

const RISK_TONE: Record<Opportunity["riskLevel"], "success" | "pending" | "danger"> = {
  low: "success",
  medium: "pending",
  high: "danger",
};

const PROBLEM_LABEL: Record<Opportunity["problem"], string> = {
  abandoned_cart: "Abandoned cart",
  payment_failure: "Payment failure",
};

const ACTION_LABEL: Record<Opportunity["recommendedAction"], string> = {
  discount: "Offer discount",
  payment_retry_suggestion: "Suggest retry",
  payment_reminder: "Payment reminder (₹0)",
};

export default function RevenueOpportunity({
  opportunity,
  onReview,
}: {
  opportunity: Opportunity;
  onReview?: (opportunity: Opportunity) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const confidenceScore = Math.round(opportunity.confidence * 100);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink">{opportunity.customerName}</p>
          <p className="text-sm text-muted">{PROBLEM_LABEL[opportunity.problem]}</p>
        </div>
        <StatusBadge label={opportunity.riskLevel} tone={RISK_TONE[opportunity.riskLevel]} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted">Cart value</p>
          <p className="font-medium text-ink">{formatINR(opportunity.cartValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">AI Confidence</p>
          <p className="font-medium text-ink">{confidenceScore}% AI Confidence Score</p>
        </div>
        <div>
          <p className="text-xs text-muted">Action</p>
          <p className="font-medium text-ink">{ACTION_LABEL[opportunity.recommendedAction]}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Expected recovery</p>
          <p className="font-medium text-[var(--success)]">
            {formatINR(opportunity.expectedRecovery)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-sm font-medium text-brand hover:opacity-80"
        >
          {expanded ? "Hide details" : "Review Action & Explanation"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">AI Reasoning</p>
            <p className="mt-1 text-sm text-ink">{opportunity.reasoning}</p>
          </div>

          {opportunity.explanation && (
            <div className="grid grid-cols-1 gap-4 rounded-md bg-canvas p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-muted">WHY THIS CUSTOMER?</p>
                <ul className="mt-1.5 space-y-1 text-xs text-ink">
                  {opportunity.explanation.whyCustomer.map((bullet, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="text-[var(--success)] font-bold">✓</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted">WHY THIS ACTION?</p>
                <p className="mt-1 text-xs text-ink">{opportunity.explanation.whyAction}</p>

                <p className="mt-3 text-xs font-semibold text-muted">WHY THIS AMOUNT?</p>
                <p className="mt-1 text-xs text-ink">{opportunity.explanation.whyAmount}</p>
              </div>
            </div>
          )}

          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Financial Impact Analysis</p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted">Original Cart</dt>
                <dd className="font-medium text-ink">{formatINR(opportunity.cartValue)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Incentive Cost</dt>
                <dd className="font-medium text-ink">{formatINR(opportunity.recommendedDiscount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Expected Recovery</dt>
                <dd className="font-medium text-[var(--success)]">{formatINR(opportunity.expectedRecovery)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Estimated Net Revenue</dt>
                <dd className="font-medium text-ink">
                  {formatINR(opportunity.explanation?.estimatedIncrementalRevenue ?? (opportunity.expectedRecovery - opportunity.recommendedDiscount))}
                  <span className="block text-[10px] text-muted font-normal">(Model Estimate)</span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-md border border-border bg-surface p-3 text-xs text-muted">
            <span className="font-semibold text-ink">Note on Confidence:</span> Decision confidence based on available customer and transaction signals; not a calibrated probability.
          </div>

          {onReview && (
            <button
              type="button"
              onClick={() => onReview(opportunity)}
              className="mt-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink hover:opacity-90"
            >
              Continue to guardrail check
            </button>
          )}
        </div>
      )}
    </div>
  );
}

