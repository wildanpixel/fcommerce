import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Panel({
  title,
  icon: Icon,
  action,
  className,
  children
}: {
  title: string;
  icon: LucideIcon;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={["mio-panel rounded-[18px] border border-white/8 bg-ink-900/72 p-5", className ?? ""].join(" ")}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Icon size={17} className="text-signal-blue" />
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-ink-500">{label}</span>
      {children}
    </div>
  );
}

export function StatusLine({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/8 bg-white/5 px-3 py-2">
      <span>{label}</span>
      <span className={active ? "text-signal-green" : "text-ink-500"}>{active ? "Ready" : "Not configured"}</span>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-white/12 bg-white/[0.03] p-6 text-sm text-ink-500">
      {label}
    </div>
  );
}
