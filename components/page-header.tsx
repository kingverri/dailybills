import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  showBackToDashboard = false,
  backToDashboardLabel = "Back to dashboard",
  action,
  children
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  showBackToDashboard?: boolean;
  backToDashboardLabel?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="app-page-hero mb-6 flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
      <div className="min-w-0">
        {showBackToDashboard ? (
          <Link className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/90 px-3 py-1.5 text-sm font-bold text-brand-700 shadow-sm" href="/dashboard">
            <ArrowLeft size={16} aria-hidden="true" />
            {backToDashboardLabel}
          </Link>
        ) : null}
        {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-700">{eyebrow}</p> : null}
        <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight text-ink sm:text-5xl">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-neutral-600 sm:text-base">{subtitle}</p> : null}
      </div>
      {(action ?? children) ? <div className="flex shrink-0 flex-wrap gap-2">{action ?? children}</div> : null}
    </header>
  );
}
