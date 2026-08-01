import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { MarketplaceIllustration, type MarketplaceIllustrationVariant } from "./MarketplaceIllustration.js";
import { Card } from "./primitives.js";

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
    <Card className={["mio-panel p-5", className ?? ""].join(" ")}>
      <div className="mio-panel-header mb-5 flex items-center justify-between gap-3">
        <div className="mio-panel-title flex items-center gap-2 text-sm font-semibold text-white">
          <Icon size={17} strokeWidth={1.65} />
          {title}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mio-field block">
      <span className="mio-field-label">{label}</span>
      {children}
    </div>
  );
}

export function StatusLine({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="mio-status-line flex items-center justify-between px-3 py-2">
      <span>{label}</span>
      <span className={active ? "mio-status-ready" : "mio-status-muted"}>{active ? "Ready" : "Not configured"}</span>
    </div>
  );
}

function inferIllustration(label: string): MarketplaceIllustrationVariant {
  const normalized = label.toLowerCase();
  if (normalized.includes("report")) return "reports";
  if (normalized.includes("project")) return "projects";
  if (normalized.includes("image") || normalized.includes("video") || normalized.includes("screenshot")) return "screenshots";
  if (normalized.includes("product") || normalized.includes("store") || normalized.includes("collected")) return "products";
  if (normalized.includes("browser") || normalized.includes("page")) return "browser";
  if (normalized.includes("search") || normalized.includes("match")) return "search";
  return "generic";
}

export function EmptyState({
  label,
  title,
  illustration,
  action,
  compact = false
}: {
  label: string;
  title?: string;
  illustration?: MarketplaceIllustrationVariant;
  action?: ReactNode;
  compact?: boolean;
}) {
  const loading = label.toLowerCase().startsWith("loading");
  return (
    <div className={["mio-empty-state", compact ? "mio-empty-state-compact" : ""].join(" ")} aria-live={loading ? "polite" : undefined}>
      {loading ? (
        <span className="mio-empty-state-loader" aria-hidden="true" />
      ) : (
        <MarketplaceIllustration variant={illustration ?? inferIllustration(label)} label={`${title ?? label} illustration`} />
      )}
      <div className="mio-empty-state-copy">
        {title && <div className="mio-empty-state-title">{title}</div>}
        <div className="mio-empty-state-label">{label}</div>
        {action && <div className="mio-empty-state-action">{action}</div>}
      </div>
    </div>
  );
}
