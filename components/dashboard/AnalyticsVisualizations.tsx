"use client";

import type { Customer, Opportunity, Transaction } from "@/lib/types";
import {
  calculateCategoryBreakdown,
  calculatePriorityDistribution,
  calculateStatusDistribution,
  formatINR,
} from "@/lib/calculations";

export default function AnalyticsVisualizations({
  customers,
  transactions,
  opportunities = [],
}: {
  customers: Customer[];
  transactions: Transaction[];
  opportunities?: Opportunity[];
}) {
  const statusDist = calculateStatusDistribution(transactions);
  const totalTxns = transactions.length || 1;

  const categoryBreakdown = calculateCategoryBreakdown(transactions);
  const totalCategoryRisk = Object.values(categoryBreakdown).reduce((a, b) => a + b, 0) || 1;
  const sortedCategories = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]);

  const priorityDist = calculatePriorityDistribution(opportunities);
  const totalOpps = opportunities.length || 1;

  const priorityColors: Record<string, { bg: string; text: string; label: string }> = {
    critical: { bg: "bg-red-500", text: "text-red-600 dark:text-red-400", label: "Critical 🔥" },
    high: { bg: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", label: "High 🔴" },
    medium: { bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", label: "Medium 🟡" },
    low: { bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Low 🟢" },
  };

  const statusColors: Record<string, { bg: string; label: string }> = {
    completed: { bg: "bg-emerald-500", label: "Completed" },
    abandoned: { bg: "bg-rose-500", label: "Abandoned" },
    failed_payment: { bg: "bg-amber-500", label: "Failed Payment" },
    pending: { bg: "bg-blue-500", label: "Pending" },
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">ANALYTICS & RISK VISUALIZATIONS</h3>
          <p className="text-xs text-muted">Visual breakdown of transaction status, revenue risk, and opportunity priority.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 1. Transaction Status Distribution */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Transaction Status Distribution</h4>
            <span className="text-xs text-muted">{totalTxns} total</span>
          </div>

          {/* Combined stacked bar */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-canvas">
            {Object.entries(statusDist).map(([status, count]) => {
              const widthPct = (count / totalTxns) * 100;
              if (widthPct === 0) return null;
              return (
                <div
                  key={status}
                  style={{ width: `${widthPct}%` }}
                  className={`h-full ${statusColors[status]?.bg || "bg-gray-400"}`}
                  title={`${statusColors[status]?.label}: ${count} (${widthPct.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(statusDist).map(([status, count]) => {
              const pct = ((count / totalTxns) * 100).toFixed(1);
              return (
                <div key={status} className="flex items-center justify-between rounded bg-canvas p-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusColors[status]?.bg}`} />
                    <span className="text-ink">{statusColors[status]?.label}</span>
                  </div>
                  <span className="font-mono text-muted">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Recovery Opportunity Priority Distribution */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Opportunity Priority Breakdown</h4>
            <span className="text-xs text-muted">{opportunities.length} opportunities</span>
          </div>

          {/* Priority stacked bar */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-canvas">
            {Object.entries(priorityDist).map(([priority, count]) => {
              const widthPct = (count / totalOpps) * 100;
              if (widthPct === 0) return null;
              return (
                <div
                  key={priority}
                  style={{ width: `${widthPct}%` }}
                  className={`h-full ${priorityColors[priority]?.bg || "bg-gray-400"}`}
                  title={`${priorityColors[priority]?.label}: ${count}`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(priorityDist).map(([priority, count]) => {
              const pct = ((count / totalOpps) * 100).toFixed(1);
              return (
                <div key={priority} className="flex items-center justify-between rounded bg-canvas p-2">
                  <span className={`font-medium ${priorityColors[priority]?.text}`}>
                    {priorityColors[priority]?.label}
                  </span>
                  <span className="font-mono text-muted">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Revenue At Risk By Category */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Revenue At Risk By Product Category</h4>
          <span className="text-xs font-semibold text-[var(--danger)]">{formatINR(totalCategoryRisk)}</span>
        </div>

        <div className="space-y-3">
          {sortedCategories.map(([category, amount]) => {
            const pct = (amount / totalCategoryRisk) * 100;
            return (
              <div key={category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">{category}</span>
                  <span className="font-mono text-muted">{formatINR(amount)} ({pct.toFixed(1)}%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                  <div
                    style={{ width: `${pct}%` }}
                    className="h-full bg-brand rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
