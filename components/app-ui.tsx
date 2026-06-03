import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

export function AppIconTile({
  icon: Icon,
  tone = "brand",
  size = "md"
}: {
  icon: LucideIcon;
  tone?: "brand" | "cyan" | "purple" | "amber" | "green" | "red" | "neutral";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={clsx(
        "app-icon-tile",
        `app-icon-tile-${tone}`,
        size === "sm" && "h-10 w-10 rounded-2xl",
        size === "md" && "h-12 w-12 rounded-2xl",
        size === "lg" && "h-14 w-14 rounded-[1.35rem]"
      )}
    >
      <Icon size={size === "lg" ? 26 : size === "sm" ? 19 : 22} aria-hidden="true" />
    </span>
  );
}

export function AppSectionCard({
  icon,
  title,
  subtitle,
  children,
  action,
  className
}: {
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("card app-section-card p-5", className)}>
      {title || subtitle || icon || action ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            {icon ? <AppIconTile icon={icon} size="sm" /> : null}
            <div>
              {title ? <h2 className="text-lg font-black text-ink">{title}</h2> : null}
              {subtitle ? <p className="mt-1 text-sm font-medium leading-6 text-neutral-600">{subtitle}</p> : null}
            </div>
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AppMetricCard({
  icon,
  label,
  value,
  tone = "neutral",
  compact = false
}: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  tone?: "neutral" | "green" | "cyan" | "amber" | "red" | "purple";
  compact?: boolean;
}) {
  return (
    <div className={clsx("metric-card premium-metric", `premium-metric-${tone}`, compact ? "p-3" : "p-4")}>
      <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-neutral-500">
        {icon ? <AppIconTile icon={icon} tone={tone === "neutral" ? "brand" : tone} size="sm" /> : null}
        {label}
      </span>
      <span className={clsx("mt-2 block font-black text-ink", compact ? "text-lg" : "text-2xl")}>{value}</span>
    </div>
  );
}

export function AppActionPanel({
  icon,
  title,
  subtitle,
  expanded,
  children,
  onToggle
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  expanded: boolean;
  children?: React.ReactNode;
  onToggle: () => void;
}) {
  return (
    <section className="card app-action-panel p-5">
      <button className="flex w-full items-center justify-between gap-4 text-left" type="button" onClick={onToggle}>
        <span className="flex min-w-0 items-center gap-3">
          <AppIconTile icon={icon} tone="cyan" />
          <span className="min-w-0">
            <span className="block text-lg font-black text-ink">{title}</span>
            {subtitle ? <span className="mt-1 block text-sm font-medium text-neutral-600">{subtitle}</span> : null}
          </span>
        </span>
        <span className={clsx("app-chevron", expanded && "rotate-180")}>⌄</span>
      </button>
      {expanded ? <div className="mt-5 border-t border-line pt-5">{children}</div> : null}
    </section>
  );
}

export function AppFilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("card app-filter-bar p-3", className)}>{children}</div>;
}

export function AppListCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <article className={clsx("card app-list-card p-4 transition hover:-translate-y-0.5", className)}>{children}</article>;
}
