"use client";

import type { Customer, Opportunity, Transaction } from "@/lib/types";
import { formatINR } from "@/lib/calculations";

export default function DatasetOverview({
  customers,
  transactions,
  opportunities = [],
}: {
  customers: Customer[];
  transactions: Transaction[];
  opportunities?: Opportunity[];
}) {
  const totalValue = transactions.reduce((sum, t) => sum + t.cartValue, 0);
  const abandonedCount = transactions.filter((t) => t.status === "abandoned").length;
  const failedCount = transactions.filter((t) => t.status === "payment_failed").length;

  const stats = [
    { label: "Total Customers", value: customers.length.toLocaleString() },
    { label: "Total Transactions", value: transactions.length.toLocaleString() },
    { label: "Total Gross Value", value: formatINR(totalValue) },
    { label: "Abandoned Carts", value: abandonedCount },
    { label: "Failed Payments", value: failedCount },
    { label: "Active Recovery Opps", value: opportunities.length },
  ];

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">DATASET OVERVIEW</h3>
          <p className="text-xs text-muted">
            Static, deterministic merchant benchmark dataset used for Buildathon evaluation.
          </p>
        </div>
        <span className="rounded-md border border-border bg-canvas px-2.5 py-1 text-[11px] font-mono text-muted">
          Static JSON Engine
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-canvas p-3 border border-border/50">
            <p className="text-[11px] font-medium text-muted uppercase tracking-wider">{s.label}</p>
            <p className="mt-1 text-lg font-bold text-ink">{s.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
