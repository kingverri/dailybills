import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  children
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center border-dashed p-7 text-center">
      <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50 p-3.5 text-brand-700 shadow-glow">
        <Icon size={24} aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-neutral-600">{body}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
