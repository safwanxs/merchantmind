import type {
  Customer,
  CustomerSegment,
  Opportunity,
  PriorityLevel,
  ProductCategory,
  Transaction,
  TransactionStatus,
} from "./types";

/**
 * All dashboard KPI & revenue impact math lives here.
 * Components use these functions to maintain transparent revenue tracking.
 */

export function calculateRevenueAtRisk(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.status === "abandoned" || t.status === "payment_failed")
    .reduce((sum, t) => sum + t.cartValue, 0);
}

export function calculateAbandonedCarts(transactions: Transaction[]): number {
  return transactions.filter((t) => t.status === "abandoned").length;
}

export function calculateFailedPayments(transactions: Transaction[]): number {
  return transactions.filter((t) => t.status === "payment_failed").length;
}

export function calculateAIOpportunityValue(opportunities: Opportunity[]): number {
  return opportunities.reduce((sum, o) => sum + o.cartValue, 0);
}

/**
 * Projected Recovery estimates expected recovery value from current AI opportunities.
 * Labeled clearly in UI as a model-based probability-weighted estimate: confidence * (cartValue - discount).
 */
export function calculateProjectedRecovery(opportunities: Opportunity[]): number {
  return opportunities.reduce((sum, o) => sum + o.expectedRecovery, 0);
}

/**
 * Recovery Rate percentage calculated dynamically from verified recovered revenue
 * against total revenue at risk.
 */
export function calculateRecoveryRate(revenueRecovered: number, revenueAtRisk: number): number {
  if (revenueAtRisk <= 0) return 0;
  return Number(((revenueRecovered / revenueAtRisk) * 100).toFixed(1));
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Phase 5: Deterministic Priority Score (0–100)
 * Evaluates Cart Value, Lifetime Value, Previous Purchases, Confidence, Segment, and Recency.
 * 90–100 = Critical, 75–89 = High, 50–74 = Medium, 0–49 = Low
 */
export function calculatePriorityScore(
  cartValue: number,
  lifetimeValue: number,
  previousPurchases: number,
  confidence: number,
  segment: CustomerSegment,
  lastActiveDays: number = 7
): { priorityScore: number; priorityLevel: PriorityLevel } {
  // Cart value component (0-30 pts)
  const cartScore = Math.min(30, Math.round((cartValue / 10000) * 30));

  // LTV component (0-25 pts)
  const ltvScore = Math.min(25, Math.round((lifetimeValue / 50000) * 25));

  // Previous purchases component (0-15 pts)
  const purchaseScore = Math.min(15, previousPurchases * 2.5);

  // AI/Rule confidence component (0-15 pts)
  const confidenceScore = Math.round(confidence * 15);

  // Customer segment weight (0-10 pts)
  const segmentWeights: Record<CustomerSegment, number> = {
    vip: 10,
    high_value: 8,
    returning: 6,
    at_risk: 5,
    new: 3,
    inactive: 1,
  };
  const segmentScore = segmentWeights[segment] ?? 5;

  // Recency bonus/penalty (0-5 pts)
  const recencyScore = lastActiveDays <= 7 ? 5 : lastActiveDays <= 30 ? 3 : lastActiveDays <= 90 ? 1 : 0;

  const rawScore = cartScore + ltvScore + purchaseScore + confidenceScore + segmentScore + recencyScore;
  const priorityScore = Math.max(0, Math.min(100, rawScore));

  let priorityLevel: PriorityLevel = "low";
  if (priorityScore >= 90) priorityLevel = "critical";
  else if (priorityScore >= 75) priorityLevel = "high";
  else if (priorityScore >= 50) priorityLevel = "medium";

  return { priorityScore, priorityLevel };
}

/**
 * Phase 4: Customer Segment Analytics
 */
export interface SegmentMetrics {
  segment: CustomerSegment;
  label: string;
  customerCount: number;
  revenueAtRisk: number;
  avgLtv: number;
  opportunityCount: number;
}

export function calculateSegmentAnalytics(
  customers: Customer[],
  transactions: Transaction[],
  opportunities: Opportunity[]
): SegmentMetrics[] {
  const segmentLabels: Record<CustomerSegment, string> = {
    vip: "VIP",
    high_value: "High Value",
    returning: "Returning",
    new: "New",
    at_risk: "At Risk",
    inactive: "Inactive",
  };

  const segments: CustomerSegment[] = ["vip", "high_value", "returning", "new", "at_risk", "inactive"];

  return segments.map((seg) => {
    const segCustomers = customers.filter((c) => c.customerSegment === seg);
    const segCustIds = new Set(segCustomers.map((c) => c.id));

    const segTxns = transactions.filter(
      (t) => segCustIds.has(t.customerId) && (t.status === "abandoned" || t.status === "payment_failed")
    );
    const revenueAtRisk = segTxns.reduce((sum, t) => sum + t.cartValue, 0);

    const totalLtv = segCustomers.reduce((sum, c) => sum + c.lifetimeValue, 0);
    const avgLtv = segCustomers.length > 0 ? Math.round(totalLtv / segCustomers.length) : 0;

    const segOpps = opportunities.filter((o) => segCustIds.has(o.customerId));

    return {
      segment: seg,
      label: segmentLabels[seg],
      customerCount: segCustomers.length,
      revenueAtRisk,
      avgLtv,
      opportunityCount: segOpps.length,
    };
  });
}

/**
 * Phase 10: Category Breakdown
 */
export function calculateCategoryBreakdown(transactions: Transaction[]): Record<string, number> {
  const atRiskTxns = transactions.filter((t) => t.status === "abandoned" || t.status === "payment_failed");
  const breakdown: Record<string, number> = {};

  for (const t of atRiskTxns) {
    const cat = t.productCategory || "Electronics";
    breakdown[cat] = (breakdown[cat] || 0) + t.cartValue;
  }

  return breakdown;
}

/**
 * Phase 10: Status Distribution
 */
export function calculateStatusDistribution(transactions: Transaction[]): Record<TransactionStatus, number> {
  const dist: Record<TransactionStatus, number> = {
    completed: 0,
    abandoned: 0,
    payment_failed: 0,
    pending: 0,
  };

  for (const t of transactions) {
    if (dist[t.status] !== undefined) {
      dist[t.status] += 1;
    }
  }

  return dist;
}

/**
 * Phase 10: Priority Level Distribution
 */
export function calculatePriorityDistribution(opportunities: Opportunity[]): Record<PriorityLevel, number> {
  const dist: Record<PriorityLevel, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const o of opportunities) {
    const level = o.priorityLevel || "low";
    dist[level] = (dist[level] || 0) + 1;
  }

  return dist;
}
