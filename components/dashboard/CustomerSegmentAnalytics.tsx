"use client";

import type { Customer, Opportunity, Transaction } from "@/lib/types";
import { calculateSegmentAnalytics, formatINR } from "@/lib/calculations";

const SEGMENT_COLORS: Record<string, string> = {
  vip: "border-purple-500/40 bg-purple-500/5 text-purple-700 dark:text-purple-300",
  high_value: "border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-300",
  returning: "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
  new: "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  at_risk: "border-orange-500/40 bg-orange-500/5 text-orange-700 dark:text-orange-300",
  inactive: "border-rose-500/40 bg-rose-500/5 text-rose-700 dark:text-rose-300",
};

export default function CustomerSegmentAnalytics({
  customers,
  transactions,
  opportunities = [],
}: {
  customers: Customer[];
  transactions: Transaction[];
  opportunities?: Opportunity[];
}) {
  const metrics = calculateSegmentAnalytics(customers, transactions, opportunities);
  const totalCustomers = customers.length || 1;

  return (
    <section className="card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">CUSTOMER SEGMENT ANALYTICS</h3>
          <p className="text-xs text-muted">
            Revenue risk distribution and opportunity counts categorized by customer behavioral profiles.
          </p>
        </div>
        <div className="text-xs text-muted">
          Total Analyzed: <span className="font-semibold text-ink">{customers.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => {
          const sharePct = ((m.customerCount / totalCustomers) * 100).toFixed(1);
          return (
            <div
              key={m.segment}
              className={`rounded-lg border p-4 transition-shadow hover:shadow-sm ${
                SEGMENT_COLORS[m.segment] || "border-border bg-surface"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider">{m.label}</span>
                <span className="text-[11px] font-mono opacity-80">{sharePct}% of total</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-muted uppercase">Customers</p>
                  <p className="font-semibold text-sm text-ink">{m.customerCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase">Revenue At Risk</p>
                  <p className="font-semibold text-sm text-[var(--danger)]">{formatINR(m.revenueAtRisk)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase">Avg Lifetime Value</p>
                  <p className="font-semibold text-ink">{formatINR(m.avgLtv)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase">Recovery Opps</p>
                  <p className="font-semibold text-[var(--success)]">{m.opportunityCount}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
