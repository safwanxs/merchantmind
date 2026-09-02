"use client";

export type DemoScenario = "success" | "failed_payment" | "ai_failure";

const OPTIONS: { value: DemoScenario; label: string; description: string }[] = [
  {
    value: "success",
    label: "Successful Payment",
    description: "Normal real Razorpay Test Mode success path.",
  },
  {
    value: "failed_payment",
    label: "Failed Payment",
    description: "Simulates the graceful failure UX without a real failed transaction.",
  },
  {
    value: "ai_failure",
    label: "AI API Failure",
    description: "Forces the deterministic fallback analysis engine.",
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
    <section className="card border-dashed p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-ink">Demo Scenarios</h3>
        <p className="text-xs text-muted">
          Developer/demo control — separate from the main workflow. Lets a reviewer exercise
          failure paths without needing a real failed transaction.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.description}
            onClick={() => onChange(option.value)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              value === option.value
                ? "border-brand bg-brand text-brand-ink"
                : "border-border text-muted hover:bg-canvas"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
