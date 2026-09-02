import type { Opportunity, Transaction } from "@/lib/types";
import {
  calculateRevenueAtRisk,
  calculateAbandonedCarts,
  calculateFailedPayments,
  calculateAIOpportunityValue,
  calculateProjectedRecovery,
  formatINR,
} from "@/lib/calculations";

export default function StatsCards({
  transactions,
  opportunities = [],
  verifiedRecovered = 0,
}: {
  transactions: Transaction[];
  opportunities?: Opportunity[];
  verifiedRecovered?: number;
}) {
  const atRisk = calculateRevenueAtRisk(transactions);
  const aiOpp = calculateAIOpportunityValue(opportunities);
  const projectedRec = calculateProjectedRecovery(opportunities);

  const cards = [
    {
      label: "Revenue At Risk",
      value: formatINR(atRisk),
      subtext: `${calculateAbandonedCarts(transactions)} abandoned, ${calculateFailedPayments(transactions)} failed`,
      accent: "danger" as const,
    },
    {
      label: "AI Opportunity",
      value: formatINR(aiOpp),
      subtext: `${opportunities.length} opportunities identified`,
      accent: "neutral" as const,
    },
    {
      label: "Projected Recovery",
      value: formatINR(projectedRec),
      subtext: "Model estimate (net of incentives)",
      accent: "pending" as const,
    },
    {
      label: "Verified Recovered",
      value: formatINR(verifiedRecovered),
      subtext: "Confirmed via Razorpay verification",
      accent: "success" as const,
    },
  ];

  const accentClass: Record<string, string> = {
    danger: "text-[var(--danger)]",
    success: "text-[var(--success)]",
    pending: "text-[var(--pending)]",
    neutral: "text-ink",
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="card p-5">
          <p className="text-sm text-muted">{card.label}</p>
          <p className={`mt-2 text-2xl font-semibold ${accentClass[card.accent]}`}>
            {card.value}
          </p>
          <p className="mt-1 text-xs text-muted">{card.subtext}</p>
        </div>
      ))}
    </div>
  );
}

