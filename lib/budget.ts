import "server-only";
import { getStore } from "@/lib/store";

const BUDGET_KEY = "merchantmind:budget:approved";
const OPPORTUNITY_PREFIX = "merchantmind:opportunity:";
const MAX_BUDGET = 5000;

export type WorkflowStatus = "pending" | "approved" | "order_created" | "successful" | "failed";
const transitions: Record<WorkflowStatus, readonly WorkflowStatus[]> = {
  pending: ["approved"], approved: ["order_created", "failed"], order_created: ["successful", "failed"], successful: [], failed: [],
};
export async function getApprovedIncentiveTotal(): Promise<number> { return (await getStore().get<number>(BUDGET_KEY)) ?? 0; }
export async function reserveApprovedIncentive(amount: number): Promise<number | null> {
  if (!Number.isFinite(amount) || amount < 0) return null;
  const next = await getStore().increment(BUDGET_KEY, amount);
  if (next > MAX_BUDGET) { await getStore().increment(BUDGET_KEY, -amount); return null; }
  return next;
}
export async function rollbackApprovedIncentive(amount: number): Promise<number> { return Math.max(0, await getStore().increment(BUDGET_KEY, -amount)); }
export async function recordApprovedIncentive(amount: number): Promise<number> { return (await reserveApprovedIncentive(amount)) ?? (await getApprovedIncentiveTotal()); }
export async function getOpportunityStatus(id: string): Promise<WorkflowStatus> { return (await getStore().get<WorkflowStatus>(`${OPPORTUNITY_PREFIX}${id}:status`)) ?? "pending"; }
export async function transitionOpportunity(id: string, next: WorkflowStatus): Promise<boolean> {
  const current = await getOpportunityStatus(id);
  if (current === next) return true;
  if (!transitions[current].includes(next)) return false;
  return getStore().compareAndSet(`${OPPORTUNITY_PREFIX}${id}:status`, current, next);
}
export async function isOpportunityCompleted(id: string): Promise<boolean> { return (await getOpportunityStatus(id)) === "successful"; }
export async function recordCompletedOpportunity(id: string): Promise<boolean> { return transitionOpportunity(id, "successful"); }
export async function recordPaymentResult(id: string, paymentId: string, amount: number): Promise<{ counted: boolean; amount: number }> {
  const first = await getStore().setIfNotExists(`${OPPORTUNITY_PREFIX}${id}:payment:${paymentId}`, { amount }, 86400);
  if (!first) return { counted: false, amount };
  await transitionOpportunity(id, "successful");
  return { counted: true, amount };
}
