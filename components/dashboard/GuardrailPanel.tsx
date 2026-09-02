import type { GuardrailResult } from "@/lib/types";

const APPROVAL_CHECK_NAME = "Merchant approval required";

export default function GuardrailPanel({ result }: { result: GuardrailResult }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Guardrail Checks</h3>
        <span
          className={`rounded-md px-2 py-1 text-xs font-medium ${
            result.allowed
              ? "bg-[var(--success-bg)] text-[var(--success)]"
              : "bg-[var(--danger-bg)] text-[var(--danger)]"
          }`}
        >
          {result.allowed ? "All checks passed" : "Blocked"}
        </span>
      </div>

      <ul className="space-y-3">
        {result.checks.map((check) => {
          const isInfo = check.name === APPROVAL_CHECK_NAME;
          const icon = isInfo ? "⚠" : check.passed ? "✓" : "✗";
          const color = isInfo
            ? "text-[var(--pending)]"
            : check.passed
            ? "text-[var(--success)]"
            : "text-[var(--danger)]";

          return (
            <li key={check.name} className="flex gap-3 text-sm">
              <span className={`mt-0.5 font-semibold ${color}`} aria-hidden>
                {icon}
              </span>
              <div>
                <p className={`font-medium ${color}`}>
                  {check.name} {isInfo ? "" : check.passed ? "passed" : "failed"}
                </p>
                <p className="text-muted">{check.explanation}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
