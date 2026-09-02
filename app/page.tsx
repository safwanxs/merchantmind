import Link from "next/link";
import Navbar from "@/components/shared/Navbar";

const SEQUENCE = [
  { step: "01", title: "Detect", body: "Scan commerce data for abandoned carts and failed payments." },
  { step: "02", title: "Reason", body: "The agent explains why each opportunity is worth acting on." },
  { step: "03", title: "Guard", body: "Every action is checked against fixed financial limits." },
  { step: "04", title: "Approve", body: "A merchant reviews and approves before anything executes." },
  { step: "05", title: "Execute", body: "Approved actions run through Razorpay Test Mode." },
  { step: "06", title: "Audit", body: "Every event is logged, visible, and traceable." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6">
        <section className="flex flex-col items-start gap-6 py-24">
          <span className="rounded-md border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
            Track 01 — AI Growth & Agentic Commerce
          </span>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            MerchantMind
          </h1>
          <p className="max-w-xl text-lg text-muted">
            AI-powered revenue recovery with human-controlled financial actions.
          </p>
          <Link
            href="/dashboard"
            className="mt-2 inline-flex items-center rounded-md bg-brand px-5 py-3 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90"
          >
            Open Dashboard
          </Link>
        </section>

        <section className="border-t border-border py-16">
          <ol className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {SEQUENCE.map((item) => (
              <li key={item.step} className="flex gap-4">
                <span className="text-sm font-mono text-muted">{item.step}</span>
                <div>
                  <h3 className="text-base font-medium text-ink">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
