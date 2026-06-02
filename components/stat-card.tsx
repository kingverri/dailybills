import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "neutral"
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  return (
    <section
      className={clsx(
        "card p-5",
        tone === "good" && "border-brand-200 shadow-glow",
        tone === "warn" && "border-amber-200",
        tone === "danger" && "border-red-200"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-500">{label}</p>
        {Icon ? (
          <span
            className={clsx(
              "icon-chip",
              tone === "good" && "border-brand-200 bg-brand-50 text-brand-700",
              tone === "warn" && "border-amber-200 bg-amber-50 text-amber-700",
              tone === "danger" && "border-red-200 bg-red-50 text-red-700"
            )}
          >
            <Icon size={25} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-4xl font-black tracking-normal text-ink">{value}</p>
      {helper ? <p className="mt-2 text-sm font-medium leading-6 text-neutral-600">{helper}</p> : null}
    </section>
  );
}
