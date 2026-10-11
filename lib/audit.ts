import "server-only";
import type { AuditEvent } from "./types";
import { getStore } from "@/lib/store";

const AUDIT_KEY = "merchantmind:audit:ledger";
function makeId(): string { return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
export async function getAuditLog(): Promise<AuditEvent[]> { return (await getStore().get<AuditEvent[]>(AUDIT_KEY)) ?? []; }
export async function appendAuditEvent(event: Omit<AuditEvent, "id" | "timestamp">): Promise<AuditEvent> {
  const entry: AuditEvent = { ...event, id: makeId(), timestamp: new Date().toISOString() };
  const store = getStore();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = (await store.get<AuditEvent[]>(AUDIT_KEY)) ?? [];
    if (await store.compareAndSet(AUDIT_KEY, current, [entry, ...current])) return entry;
  }
  throw new Error("Audit ledger is busy; event was not appended.");
}
export async function clearAuditLog(): Promise<void> { await getStore().set(AUDIT_KEY, []); }
