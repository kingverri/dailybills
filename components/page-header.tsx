import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  showBackToDashboard = false,
  backToDashboardLabel = "Back to dashboard",
  variant = "compact",
  action,
  children
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  showBackToDashboard?: boolean;
  backToDashboardLabel?: string;
  variant?: "compact" | "hero";
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const isHero = variant === "hero";

  return (
    <header className={`${isHero ? "app-page-hero mb-6 gap-5 p-5 sm:p-7" : "mb-4 rounded-[1.5rem] border border-line bg-surface/78 p-4 shadow-sm backdrop-blur sm:p-5"} flex flex-col sm:flex-row sm:items-center sm:justify-between`}>
      <div className="min-w-0">
        {showBackToDashboard ? (
          <Link className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-600 lg:hidden" href="/dashboard">
            <ArrowLeft size={16} aria-hidden="true" />
            {backToDashboardLabel}
          </Link>
        ) : null}
        {eyebrow ? <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-700">{eyebrow}</p> : null}
        <h1 className={`${isHero ? "mt-2 text-3xl sm:text-5xl" : "mt-1 text-2xl sm:text-3xl"} max-w-3xl font-black leading-tight text-ink`}>{title}</h1>
        {subtitle ? <p className={`${isHero ? "mt-3 sm:text-base" : "mt-1"} max-w-2xl text-sm font-semibold leading-6 text-neutral-600`}>{subtitle}</p> : null}
      </div>
      {(action ?? children) ? <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">{action ?? children}</div> : null}
    </header>
  );
}
