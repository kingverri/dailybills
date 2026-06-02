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
    <header className="card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
      <div className="min-w-0">
        {showBackToDashboard ? (
          <Link className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-700" href="/dashboard">
            <ArrowLeft size={16} aria-hidden="true" />
            {backToDashboardLabel}
          </Link>
        ) : null}
        {eyebrow ? <p className="text-sm font-bold uppercase tracking-wide text-brand-700">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-black leading-tight text-ink sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-neutral-600">{subtitle}</p> : null}
      </div>
      {action ?? children}
    </header>
  );
}
