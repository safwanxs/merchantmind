"use client";

import type { OpportunityWorkflowStatus } from "@/lib/types";

interface Step {
  id: string;
  name: string;
}

const STAGES: Step[] = [
  { id: "1", name: "Observe" },
  { id: "2", name: "Analyze" },
  { id: "3", name: "Identify Opp" },
  { id: "4", name: "Reason" },
  { id: "5", name: "Guard" },
  { id: "6", name: "Approve" },
  { id: "7", name: "Execute" },
  { id: "8", name: "Verify" },
  { id: "9", name: "Audit" },
];

export default function AgentActivity({
  hasAnalyzed,
  status,
}: {
  hasAnalyzed: boolean;
  status?: OpportunityWorkflowStatus;
}) {
  function getStepState(index: number): "completed" | "current" | "pending" {
    if (!hasAnalyzed) {
      return index === 0 ? "current" : "pending";
    }

    if (!status) {
      if (index <= 3) return "completed";
      if (index === 4) return "current";
      return "pending";
    }

    switch (status) {
      case "guardrail_review":
        if (index <= 3) return "completed";
        if (index === 4) return "current";
        return "pending";
      case "blocked":
        if (index <= 3) return "completed";
        if (index === 4) return "current";
        return "pending";
      case "pending_approval":
        if (index <= 4) return "completed";
        if (index === 5) return "current";
        return "pending";
      case "processing_payment":
        if (index <= 5) return "completed";
        if (index === 6) return "current";
        return "pending";
      case "payment_success":
        return "completed";
      case "payment_failed":
        if (index <= 5) return "completed";
        if (index === 6) return "current";
        return "pending";
      default:
        return "pending";
    }
  }

  return (
    <section className="card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Controlled Agent Workflow</h2>
          <p className="text-xs text-muted">
            The AI operates within a strict 9-stage lifecycle. No financial action executes without merchant sign-off.
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          9-Stage Autonomous Lifecycle
        </span>
      </div>

      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-9 border-t border-border pt-4">
        {STAGES.map((step, idx) => {
          const state = getStepState(idx);
          const isDone = state === "completed";
          const isCurrent = state === "current";

          return (
            <li key={step.id} className="flex flex-col items-center text-center space-y-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isDone
                    ? "bg-[var(--success)] text-white"
                    : isCurrent
                    ? "bg-brand text-brand-ink ring-2 ring-brand/30"
                    : "bg-surface text-muted border border-border"
                }`}
              >
                {isDone ? "✓" : step.id}
              </div>
              <span className="text-[11px] font-medium text-ink leading-tight">{step.name}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
