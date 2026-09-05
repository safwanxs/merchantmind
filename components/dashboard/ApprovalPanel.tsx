"use client";

import { useState } from "react";
import type { Opportunity } from "@/lib/types";
import { formatINR } from "@/lib/calculations";

export default function ApprovalPanel({
  opportunity,
  onApprove,
  onReject,
  disabled,
}: {
  opportunity: Opportunity;
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="card p-5">
      <h3 className="mb-1 text-sm font-semibold text-ink">Merchant Approval</h3>
      <p className="mb-4 text-sm text-muted">
        Guardrails passed for {opportunity.customerName}&rsquo;s{" "}
        {formatINR(opportunity.recommendedDiscount)} incentive. This action still requires your
        explicit approval before anything is executed.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowConfirm(true)}
          className="h-10 rounded-md bg-brand px-4 text-sm font-medium text-brand-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Approve Action
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onReject}
          className="h-10 rounded-md border border-border px-4 text-sm font-medium text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reject Action
        </button>
      </div>

      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="approval-confirm-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="card w-full max-w-md p-6">
            <p id="approval-confirm-heading" className="text-sm text-ink">
              You are authorizing this commerce action. The agent cannot execute financial
              actions without your approval.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="h-10 rounded-md border border-border px-4 text-sm font-medium text-ink hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  onApprove();
                }}
                className="h-10 rounded-md bg-brand px-4 text-sm font-medium text-brand-ink hover:opacity-90"
              >
                Approve &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
