"use client";

export default function DemoModeBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--pending)]/30 bg-[var(--pending-bg)] px-3 py-1 text-xs font-medium text-[var(--pending)]">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
      </span>
      <span>
        <strong>DEMO MODE</strong> — Using simulated merchant transaction dataset (300 customers / 1,000 transactions)
      </span>
    </div>
  );
}
