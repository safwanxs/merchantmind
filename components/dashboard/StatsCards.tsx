import type { Customer, Opportunity, Transaction } from "@/lib/types";
import {
  calculateRevenueAtRisk,
  calculateAbandonedCarts,
  calculateFailedPayments,
  calculateProjectedRecovery,
  formatINR,
} from "@/lib/calculations";

export default function StatsCards({
  customers = [],
  transactions,
  opportunities = [],
  verifiedRecovered = 0,
}: {
  customers?: Customer[];
  transactions: Transaction[];
  opportunities?: Opportunity[];
  verifiedRecovered?: number;
}) {
  const atRisk = calculateRevenueAtRisk(transactions);
  const projectedRec = calculateProjectedRecovery(opportunities);
  const highPriorityCount = opportunities.filter(
    (o) => o.priorityLevel === "critical" || o.priorityLevel === "high"
  ).length;

  const cards = [
    {
      label: "TOTAL REVENUE AT RISK",
      value: formatINR(atRisk),
      subtext: `${calculateAbandonedCarts(transactions)} abandoned, ${calculateFailedPayments(transactions)} failed`,
      accent: "danger" as const,
    },
    {
      label: "RECOVERY OPPORTUNITIES",
      value: opportunities.length.toString(),
      subtext: `${opportunities.length} actionable targets identified`,
      accent: "neutral" as const,
    },
    {
      label: "HIGH PRIORITY",
      value: highPriorityCount.toString(),
      subtext: `${highPriorityCount} critical & high priority targets`,
      accent: "brand" as const,
    },
    {
      label: "EXPECTED RECOVERY VALUE",
      value: formatINR(projectedRec),
      subtext: "Model-based net estimate",
      accent: "pending" as const,
    },
    {
      label: "VERIFIED RECOVERED REVENUE",
      value: formatINR(verifiedRecovered),
      subtext: "Confirmed via Razorpay verification",
      accent: "success" as const,
    },
    {
      label: "CUSTOMERS ANALYZED",
      value: customers.length > 0 ? customers.length.toString() : "300",
      subtext: `Across ${transactions.length} transactions`,
      accent: "neutral" as const,
    },
  ];

  const accentClass: Record<string, string> = {
    danger: "text-[var(--danger)]",
    success: "text-[var(--success)]",
    pending: "text-[var(--pending)]",
    brand: "text-brand font-bold",
    neutral: "text-ink font-semibold",
  };

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="card p-4 flex flex-col justify-between hover:border-brand/30 transition-colors">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{card.label}</p>
          <p className={`mt-2 text-xl font-bold ${accentClass[card.accent]}`}>
            {card.value}
          </p>
          <p className="mt-1 text-[11px] text-muted leading-tight">{card.subtext}</p>
        </div>
      ))}
    </div>
  );
}
