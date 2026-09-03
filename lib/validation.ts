import rawCustomers from "@/data/customers.json";
import rawTransactions from "@/data/transactions.json";
import type { Customer, Transaction, TransactionStatus } from "./types";

const ALLOWED_TRANSACTION_STATUSES: ReadonlySet<string> = new Set<TransactionStatus>([
  "completed",
  "abandoned",
  "payment_failed",
  "pending",
]);

/**
 * Validates transaction data at load time.
 * Checks every transaction.status against the exact literal values allowed by TransactionStatus.
 * Throws a clear error listing which records are invalid if any don't match.
 */
export function validateDataset(
  rawCusts: unknown[],
  rawTxns: unknown[]
): { customers: Customer[]; transactions: Transaction[] } {
  const invalidRecords: { id: string; status: unknown }[] = [];

  for (const item of rawTxns) {
    if (typeof item !== "object" || item === null) {
      invalidRecords.push({ id: "unknown", status: item });
      continue;
    }
    const t = item as Record<string, unknown>;
    const status = t.status;
    if (typeof status !== "string" || !ALLOWED_TRANSACTION_STATUSES.has(status)) {
      invalidRecords.push({
        id: typeof t.id === "string" ? t.id : "unknown",
        status,
      });
    }
  }

  if (invalidRecords.length > 0) {
    const errorList = invalidRecords
      .map((r) => `Transaction '${r.id}' has invalid status: ${JSON.stringify(r.status)}`)
      .join("; ");
    throw new Error(
      `Dataset Validation Failed: ${invalidRecords.length} record(s) contain invalid transaction status values. Allowed status values are ["completed", "abandoned", "payment_failed", "pending"]. Details: ${errorList}`
    );
  }

  return {
    customers: rawCusts as Customer[],
    transactions: rawTxns as Transaction[],
  };
}

// Executes validation once when module is loaded.
const validated = validateDataset(rawCustomers, rawTransactions);
export const customers = validated.customers;
export const transactions = validated.transactions;
