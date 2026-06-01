import clsx from "clsx";

export function StatCard({
  label,
  value,
  helper,
  tone = "neutral"
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  return (
    <section
      className={clsx(
        "card p-4",
        tone === "good" && "border-brand-200 shadow-glow",
        tone === "warn" && "border-amber-200 bg-amber-50",
        tone === "danger" && "border-red-200 bg-red-50"
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-normal text-ink">{value}</p>
      {helper ? <p className="mt-2 text-sm text-neutral-600">{helper}</p> : null}
    </section>
  );
}
