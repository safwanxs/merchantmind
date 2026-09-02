"use client";

import { useState } from "react";
import type { AuditActor, AuditEvent } from "@/lib/types";
import StatusBadge from "@/components/shared/StatusBadge";

const STATUS_TONE: Record<string, "success" | "pending" | "danger" | "neutral"> = {
  success: "success",
  failed: "danger",
  rejected: "danger",
  stopped: "danger",
  pending: "pending",
  info: "neutral",
};

const ACTOR_STYLE: Record<AuditActor, string> = {
  AI_AGENT: "bg-purple-100 text-purple-800 border-purple-200",
  SYSTEM: "bg-gray-100 text-gray-800 border-gray-200",
  MERCHANT: "bg-amber-100 text-amber-800 border-amber-200",
  RAZORPAY: "bg-blue-100 text-blue-800 border-blue-200",
};

function toneFor(status: string): "success" | "pending" | "danger" | "neutral" {
  const key = status.toLowerCase();
  return STATUS_TONE[key] ?? "neutral";
}

export default function AuditTrail({
  events,
  onClear,
}: {
  events: AuditEvent[];
  onClear: () => void;
}) {
  const [confirmingClear, setConfirmingClear] = useState(false);

  return (
    <section id="audit-trail" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Immutable Audit Trail</h2>
          <p className="text-sm text-muted">
            Append-only, session-persisted ledger of all AI reasoning, guardrail evaluations, merchant decisions, and Razorpay transactions.
          </p>
        </div>
        {events.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-canvas"
          >
            Clear Audit Log
          </button>
        )}
      </div>

      {confirmingClear && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-[var(--danger)] p-4">
          <p className="text-sm text-ink">Clear all {events.length} audit events? This action requires explicit confirmation.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onClear();
                setConfirmingClear(false);
              }}
              className="rounded-md bg-[var(--danger)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              Confirm Clear
            </button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-muted">
            No audit events recorded yet. Run an analysis or review an opportunity to generate events.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-border">
          {events.map((event) => {
            const actorStyle = ACTOR_STYLE[event.actor] ?? ACTOR_STYLE.SYSTEM;

            return (
              <div key={event.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold tracking-wider ${actorStyle}`}>
                      {event.actor}
                    </span>
                    <p className="text-sm font-medium text-ink">{event.actionType}</p>
                    <StatusBadge label={event.status} tone={toneFor(event.status)} />
                  </div>
                  <p className="text-sm text-muted">{event.description}</p>
                </div>
                <p className="whitespace-nowrap text-xs font-mono text-muted">
                  {new Date(event.timestamp).toLocaleTimeString("en-IN")}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

