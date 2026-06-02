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
    <div className="card flex flex-col items-center border-dashed p-8 text-center">
      <div className="mb-5 rounded-3xl border border-brand-200 bg-brand-50 p-4 text-brand-700 shadow-glow">
        <Icon size={32} aria-hidden="true" />
      </div>
      <h3 className="text-lg font-black text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-neutral-600">{body}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
