import type { Opportunity, Transaction } from "./types";

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
 * Labeled clearly in UI as a model estimate based on expected recovery (cart value - discount).
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

