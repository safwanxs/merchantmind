type Tone = "success" | "pending" | "danger" | "neutral";

const TONE_STYLES: Record<Tone, string> = {
  success: "bg-[var(--success-bg)] text-[var(--success)]",
  pending: "bg-[var(--pending-bg)] text-[var(--pending)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger)]",
  neutral: "bg-canvas text-muted",
};

export default function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${TONE_STYLES[tone]}`}
    >
      {label}
    </span>
  );
}
