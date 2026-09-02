import type { AuditEvent } from "./types";

// ---------------------------------------------------------------------------
// Audit trail (Phase 6). Every important event across the whole app —
// analysis, guardrails, approvals, payments, failures — is appended here
// and persisted to localStorage for the browser session so it survives a
// page refresh.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "merchantmind_audit_log";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Reads the full audit log from localStorage. Returns an empty array if
 * running on the server, if nothing is stored yet, or if the stored value
 * is corrupted.
 */
export function getAuditLog(): AuditEvent[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditEvent[]) : [];
  } catch {
    return [];
  }
}

/**
 * Appends a new event to the audit log and persists it. Returns the full
 * updated log (most recent first) so callers can immediately update UI
 * state without a second read.
 */
export function appendAuditEvent(
  event: Omit<AuditEvent, "id" | "timestamp">
): AuditEvent[] {
  const entry: AuditEvent = {
    ...event,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };

  const current = getAuditLog();
  const updated = [entry, ...current];

  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Storage unavailable (private browsing, quota) — event still exists
      // in the in-memory return value for this session's UI.
    }
  }

  return updated;
}

/** Clears the entire audit log. Callers are responsible for confirming with the user first. */
export function clearAuditLog(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — nothing more we can do if storage is unavailable.
  }
}
