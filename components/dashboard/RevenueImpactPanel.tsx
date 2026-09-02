"use client";

import type { Opportunity, Transaction } from "@/lib/types";
import {
  calculateRevenueAtRisk,
  calculateAIOpportunityValue,
  calculateProjectedRecovery,
  calculateRecoveryRate,
  formatINR,
} from "@/lib/calculations";

export default function RevenueImpactPanel({
  transactions,
  opportunities,
  verifiedRecovered,
}: {
  transactions: Transaction[];
  opportunities: Opportunity[];
  verifiedRecovered: number;
}) {
  const atRisk = calculateRevenueAtRisk(transactions);
  const aiOpportunity = calculateAIOpportunityValue(opportunities);
  const projectedRecovery = calculateProjectedRecovery(opportunities);
  const recoveryRate = calculateRecoveryRate(verifiedRecovered, atRisk);

  return (
    <section className="card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Revenue Impact Ledger</h2>
          <p className="text-xs text-muted">
            Real-time audit of at-risk capital, AI-targeted opportunities, and verified payment outcomes.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-surface px-3 py-1 border border-border">
          <span className="text-xs font-medium text-muted">Verified Recovery Rate:</span>
          <span className="text-sm font-semibold text-[var(--success)]">{recoveryRate}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-border pt-4 text-sm">
        <div>
          <p className="text-xs text-muted">Revenue At Risk</p>
          <p className="mt-1 font-semibold text-[var(--danger)]">{formatINR(atRisk)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">AI Targeted Opportunity</p>
          <p className="mt-1 font-semibold text-ink">{formatINR(aiOpportunity)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Projected Recovery (Est.)</p>
          <p className="mt-1 font-semibold text-[var(--pending)]">{formatINR(projectedRecovery)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Verified Recovered Revenue</p>
          <p className="mt-1 font-semibold text-[var(--success)]">{formatINR(verifiedRecovered)}</p>
        </div>
      </div>
    </section>
  );
}
