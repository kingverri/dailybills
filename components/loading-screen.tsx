export function LoadingScreen({ label = "Loading DailyBills..." }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-6">
      <div className="card w-full max-w-sm p-6 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-xl bg-gradient-to-br from-brand-500 to-cyan-400 shadow-glow" />
        <p className="text-sm font-medium text-neutral-600">{label}</p>
      </div>
    </div>
  );
}
