import type { Customer, Transaction } from "@/lib/types";

export function buildAnalysisPrompt(customers: Customer[], transactions: Transaction[]): string {
  return `You are a revenue recovery analyst for an e-commerce merchant.
Identify opportunities only for abandoned or payment_failed transactions. For abandoned carts, recommend a discount no larger than 5% of cart value and ₹500. For payment failures, recommend payment_retry_suggestion with discount 0. Return only JSON matching the requested schema.
Customers: ${JSON.stringify(customers)}
Transactions: ${JSON.stringify(transactions)}`;
}
