"use client";

const STEPS = [
  { id: "01", name: "Data Analysis", desc: "Monitors 1000+ transactions for cart abandonments and payment failures." },
  { id: "02", name: "AI / Rule Analysis", desc: "Evaluates LTV, purchase history, and priority score (0–100)." },
  { id: "03", name: "Opportunity Identified", desc: "Derives optimal recovery action & incentive parameters." },
  { id: "04", name: "Guardrail Validation", desc: "Enforces 5% cart cap, ₹500 discount ceiling, and budget limits." },
  { id: "05", name: "Merchant Approval", desc: "🔒 Human-in-the-loop sign-off required before execution." },
  { id: "06", name: "Payment Action", desc: "Triggers Razorpay Test Mode checkout order." },
  { id: "07", name: "Audit Record", desc: "Appends tamper-evident audit event log to session state." },
];

export default function AgentDecisionFlow() {
  return (
    <section className="card p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-base font-semibold text-ink">AGENT DECISION ARCHITECTURE</h3>
          <p className="text-xs text-muted">
            The safety-first workflow governing every revenue recovery recommendation in MerchantMind.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-canvas p-2 text-xs">
          <span className="font-semibold text-brand">AI RECOMMENDS</span>
          <span className="text-muted">→</span>
          <span className="font-semibold text-[var(--pending)]">GUARDRAILS CONSTRAIN</span>
          <span className="text-muted">→</span>
          <span className="font-semibold text-[var(--success)]">MERCHANT DECIDES</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="relative flex flex-col justify-between rounded-lg bg-canvas p-3 border border-border/60">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted">{s.id}</span>
                {idx < STEPS.length - 1 && (
                  <span className="hidden lg:block text-muted text-xs font-bold">→</span>
                )}
              </div>
              <p className="mt-1.5 text-xs font-bold text-ink">{s.name}</p>
              <p className="mt-1 text-[11px] leading-tight text-muted">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
