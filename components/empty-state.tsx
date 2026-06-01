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
    <div className="card flex flex-col items-center p-6 text-center">
      <div className="mb-3 rounded-md bg-brand-50 p-3 text-brand-700">
        <Icon size={24} aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-neutral-600">{body}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
