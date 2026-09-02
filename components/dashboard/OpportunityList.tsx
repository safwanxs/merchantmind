import type { Opportunity } from "@/lib/types";
import RevenueOpportunity from "./RevenueOpportunity";

const MAX_DISPLAYED = 5;

export default function OpportunityList({
  opportunities,
  onReview,
}: {
  opportunities: Opportunity[];
  onReview?: (opportunity: Opportunity) => void;
}) {
  if (opportunities.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-muted">
          No revenue opportunities found in the current dataset.
        </p>
      </div>
    );
  }

  const sorted = [...opportunities]
    .sort((a, b) => b.expectedRecovery - a.expectedRecovery)
    .slice(0, MAX_DISPLAYED);

  return (
    <div className="space-y-4">
      {sorted.map((opportunity) => (
        <RevenueOpportunity key={opportunity.id} opportunity={opportunity} onReview={onReview} />
      ))}
    </div>
  );
}
