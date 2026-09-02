export default function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-6 text-sm text-muted" role="status">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-brand"
        aria-hidden
      />
      {label}
    </div>
  );
}
