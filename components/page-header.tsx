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
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {showBackToDashboard ? (
          <Link className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-700" href="/dashboard">
            <ArrowLeft size={16} aria-hidden="true" />
            {backToDashboardLabel}
          </Link>
        ) : null}
        {eyebrow ? <p className="text-sm font-bold uppercase tracking-wide text-brand-700">{eyebrow}</p> : null}
        <h1 className="mt-1 text-2xl font-black text-ink sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-neutral-600">{subtitle}</p> : null}
      </div>
      {action ?? children}
    </header>
  );
}
