"use client";

export type DemoScenario =
  | "high_value_recovery"
  | "excessive_discount"
  | "low_value_transaction"
  | "ai_failure"
  | "merchant_rejection"
  | "payment_failure";

const OPTIONS: { value: DemoScenario; label: string; badge: string; description: string }[] = [
  {
    value: "high_value_recovery",
    label: "Scenario 1: High Value Recovery",
    badge: "VIP Target",
    description: "VIP customer with high cart value & strong purchase history. Passes guardrail engine to merchant approval.",
  },
  {
    value: "excessive_discount",
    label: "Scenario 2: Excessive Discount",
    badge: "Policy Violation",
    description: "Simulates AI recommending discount above policy maximum (>5% / >₹500). Guardrail blocks action: BLOCKED BY POLICY.",
  },
  {
    value: "low_value_transaction",
    label: "Scenario 3: Low Value Transaction",
    badge: "Below Threshold",
    description: "Cart value below minimum policy threshold (<₹3,000). System flags as not eligible for automated recovery.",
  },
  {
    value: "ai_failure",
    label: "Scenario 4: AI Service Failure",
    badge: "Fallback Mode",
    description: "Simulates Gemini API failure/timeout. Activates Rule-Based Fallback: AI UNAVAILABLE / RULE-BASED FALLBACK ACTIVATED.",
  },
  {
    value: "merchant_rejection",
    label: "Scenario 5: Merchant Rejection",
    badge: "Merchant Veto",
    description: "Recommendation passes all financial guardrails, but merchant explicitly rejects it: NO ACTION EXECUTED.",
  },
  {
    value: "payment_failure",
    label: "Scenario 6: Payment Failure",
    badge: "Razorpay Fail",
    description: "Simulates payment processing failure / dismissal. Workflow state updates: Payment Processing → Failed.",
  },
];

export default function DemoScenarios({
  value,
  onChange,
}: {
  value: DemoScenario;
  onChange: (scenario: DemoScenario) => void;
}) {
  return (
    <section className="card border-dashed p-5 space-y-3 bg-surface/50">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">BUILDATHON DEMO SCENARIO SIMULATOR</h3>
          <p className="text-xs text-muted">
            Test all 6 edge cases live during judging—including guardrail blocks, fallback modes, and merchant vetos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex flex-col justify-between text-left rounded-lg border p-3 transition-all ${
                isSelected
                  ? "border-brand bg-brand/10 ring-1 ring-brand text-ink"
                  : "border-border bg-canvas text-muted hover:border-brand/50 hover:bg-surface"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-ink">{option.label}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      isSelected
                        ? "bg-brand text-brand-ink"
                        : "bg-surface border border-border text-muted"
                    }`}
                  >
                    {option.badge}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-tight text-muted">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
