export function AuthCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-400 text-xl font-black text-slate-950 shadow-glow">
            DB
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">DailyBills</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-neutral-600">{subtitle}</p>
        </div>
        <div className="card p-5 sm:p-6">{children}</div>
      </section>
    </main>
  );
}
