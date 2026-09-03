"use client";

import { useState } from "react";
import type { Opportunity, PriorityLevel } from "@/lib/types";
import { formatINR } from "@/lib/calculations";

const PROBLEM_LABEL: Record<Opportunity["problem"], string> = {
  abandoned_cart: "Abandoned Cart",
  payment_failure: "Payment Failure",
};

const ACTION_LABEL: Record<Opportunity["recommendedAction"], string> = {
  discount: "Offer Discount",
  payment_retry_suggestion: "Suggest Payment Retry",
  payment_reminder: "Send Zero-Cost Reminder",
};

const PRIORITY_BADGE: Record<PriorityLevel, { text: string; bg: string; border: string }> = {
  critical: { text: "text-red-700 dark:text-red-300 font-bold", bg: "bg-red-500/10", border: "border-red-500/30" },
  high: { text: "text-orange-700 dark:text-orange-300 font-bold", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  medium: { text: "text-amber-700 dark:text-amber-300 font-semibold", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  low: { text: "text-emerald-700 dark:text-emerald-300 font-medium", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
};

const PRIORITY_LABEL: Record<PriorityLevel, string> = {
  critical: "Critical 🔥",
  high: "High 🔴",
  medium: "Medium 🟡",
  low: "Low 🟢",
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

  const priorityLevel = opportunity.priorityLevel || "low";
  const priorityBadgeStyle = PRIORITY_BADGE[priorityLevel];

  const segmentLabel = opportunity.customerSegment
    ? opportunity.customerSegment.replace(/_/g, " ").toUpperCase()
    : "STANDARD";

  return (
    <div className="card p-5 space-y-4 hover:border-brand/40 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-semibold text-ink">{opportunity.customerName}</h4>
            <span className="rounded bg-canvas border border-border px-2 py-0.5 text-[10px] font-mono text-muted uppercase">
              {segmentLabel}
            </span>
            {opportunity.productCategory && (
              <span className="rounded bg-surface border border-border px-2 py-0.5 text-[10px] font-mono text-muted">
                {opportunity.productCategory}
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1">
            Product: <span className="font-medium text-ink">{opportunity.productName || "E-Commerce Cart"}</span> • Transaction #{opportunity.transactionId}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`rounded-lg border px-3 py-1.5 text-xs text-center ${priorityBadgeStyle.bg} ${priorityBadgeStyle.border}`}>
            <p className="text-[10px] text-muted uppercase tracking-wider">Priority Score</p>
            <p className={`font-mono text-sm ${priorityBadgeStyle.text}`}>
              {opportunity.priorityScore}/100 ({PRIORITY_LABEL[priorityLevel]})
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5 bg-canvas/50 p-3 rounded-lg border border-border/50">
        <div>
          <p className="text-[11px] text-muted uppercase">Revenue At Risk</p>
          <p className="font-semibold text-ink text-base">{formatINR(opportunity.cartValue)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted uppercase">Problem Type</p>
          <p className="font-medium text-ink">{PROBLEM_LABEL[opportunity.problem]}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted uppercase">Recovery Score</p>
          <p className="font-medium text-ink">{confidenceScore}% Score</p>
        </div>
        <div>
          <p className="text-[11px] text-muted uppercase">Recommended Action</p>
          <p className="font-medium text-brand">{ACTION_LABEL[opportunity.recommendedAction]}</p>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <p className="text-[11px] text-muted uppercase">Expected Recovery</p>
            <span
              className="cursor-help text-xs text-muted hover:text-ink"
              title="Model-based estimate. Actual recovery may vary."
            >
              ⓘ
            </span>
          </div>
          <p className="font-semibold text-[var(--success)] text-base">
            {formatINR(opportunity.expectedRecovery)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
        >
          {expanded ? "▲ Hide Recommendation Factors" : "▼ Show Recommendation Factors & Guardrails"}
        </button>

        {onReview && (
          <button
            type="button"
            onClick={() => onReview(opportunity)}
            className="rounded-md bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-ink hover:opacity-90 transition-opacity"
          >
            Review Guardrail Check →
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-4 border-t border-border pt-4 text-xs">
          <div>
            <p className="font-bold text-muted uppercase tracking-wider text-[10px]">RECOMMENDATION FACTORS</p>
            <ul className="mt-2 space-y-1.5">
              {(opportunity.recommendationFactors && opportunity.recommendationFactors.length > 0
                ? opportunity.recommendationFactors
                : [
                    `Customer completed ${opportunity.explanation?.whyCustomer[0] || "multiple purchases"}.`,
                    `Cart value is ${formatINR(opportunity.cartValue)}.`,
                    `Customer belongs to ${segmentLabel} segment.`,
                  ]
              ).map((factor, idx) => (
                <li key={idx} className="flex items-start gap-2 text-ink">
                  <span className="text-[var(--success)] font-bold">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-bold text-muted uppercase tracking-wider text-[10px]">AGENT REASONING SUMMARY</p>
            <p className="mt-1 text-ink bg-canvas p-3 rounded border border-border/60">{opportunity.reasoning}</p>
          </div>

          <div className="rounded border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] text-muted flex items-center justify-between">
            <span>💡 <strong>Expected Recovery Value</strong>: Model-based estimate. Actual recovery may vary.</span>
            <span className="font-mono text-ink font-semibold">{formatINR(opportunity.expectedRecovery)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
