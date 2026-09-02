import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="text-[15px] font-semibold tracking-tight text-ink">
            MerchantMind
          </Link>
          <span className="rounded-md bg-canvas px-2 py-1 text-xs text-muted border border-border">
            Razorpay Test Mode
          </span>
          <span className="hidden sm:inline-block rounded-md bg-brand-light/40 px-2.5 py-1 text-xs font-medium text-muted">
            &ldquo;AI recommends. Guardrails constrain. The merchant decides.&rdquo;
          </span>
        </div>

        <nav className="flex items-center gap-6 text-sm text-muted">
          <Link href="/dashboard" className="hover:text-ink transition-colors">
            Dashboard
          </Link>
          <Link href="/dashboard#audit-trail" className="hover:text-ink transition-colors">
            Audit Trail
          </Link>
        </nav>
      </div>
    </header>
  );
}

