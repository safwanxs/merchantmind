import fs from "fs";
import path from "path";

// Server-side persistence for campaign budget & execution state without external DB infrastructure.
const BUDGET_FILE = path.join(process.cwd(), "data", "budget.json");

interface BudgetStore {
  approvedIncentiveTotal: number;
  completedOpportunityIds: string[];
}

function readStore(): BudgetStore {
  try {
    if (fs.existsSync(BUDGET_FILE)) {
      const content = fs.readFileSync(BUDGET_FILE, "utf-8");
      const parsed = JSON.parse(content);
      return {
        approvedIncentiveTotal:
          typeof parsed.approvedIncentiveTotal === "number" ? parsed.approvedIncentiveTotal : 0,
        completedOpportunityIds: Array.isArray(parsed.completedOpportunityIds)
          ? (parsed.completedOpportunityIds as string[])
          : [],
      };
    }
  } catch {
    // Fall through to default if file read/parse fails
  }
  return { approvedIncentiveTotal: 0, completedOpportunityIds: [] };
}

function writeStore(store: BudgetStore): void {
  try {
    fs.mkdirSync(path.dirname(BUDGET_FILE), { recursive: true });
    fs.writeFileSync(BUDGET_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // Ignore write failures in read-only environments
  }
}

export function getApprovedIncentiveTotal(): number {
  return readStore().approvedIncentiveTotal;
}

export function recordApprovedIncentive(discountAmount: number): number {
  const store = readStore();
  store.approvedIncentiveTotal += discountAmount;
  writeStore(store);
  return store.approvedIncentiveTotal;
}

export function rollbackApprovedIncentive(discountAmount: number): number {
  const store = readStore();
  store.approvedIncentiveTotal = Math.max(0, store.approvedIncentiveTotal - discountAmount);
  writeStore(store);
  return store.approvedIncentiveTotal;
}

export function isOpportunityCompleted(opportunityId: string): boolean {
  const store = readStore();
  return store.completedOpportunityIds.includes(opportunityId);
}

export function recordCompletedOpportunity(opportunityId: string): void {
  const store = readStore();
  if (!store.completedOpportunityIds.includes(opportunityId)) {
    store.completedOpportunityIds.push(opportunityId);
    writeStore(store);
  }
}
