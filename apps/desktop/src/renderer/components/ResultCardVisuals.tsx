import { useEffect, useState, type ReactNode } from "react";
import type { StoreType } from "../../shared/storeTypes.js";
import { storeTypeImage, storeTypeLabel } from "../../shared/storeTypes.js";

type ResultCardVariant = "product" | "store" | "project";

export function StoreTypeMark({
  value,
  showLabel = false,
  className = ""
}: {
  value?: StoreType | null;
  showLabel?: boolean;
  className?: string;
}) {
  const imageUrl = storeTypeImage(value);
  const label = storeTypeLabel(value);
  return (
    <span className={["mio-store-type-mark", className].filter(Boolean).join(" ")}>
      {imageUrl ? (
        <img src={imageUrl} alt={label} loading="lazy" decoding="async" />
      ) : (
        <span className="mio-store-type-fallback">{label}</span>
      )}
      {imageUrl && showLabel ? <span>{label}</span> : null}
    </span>
  );
}

export function ResultCardMedia({
  imageUrl,
  alt,
  variant,
  children
}: {
  imageUrl?: string | null;
  alt: string;
  variant: ResultCardVariant;
  children?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [imageUrl]);
  return (
    <div className={["mio-result-card-media", `mio-result-card-media-${variant}`].join(" ")}>
      {imageUrl && !failed ? (
        <img src={imageUrl} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <MarketplaceCardPlaceholder variant={variant} label={alt} />
      )}
      {children ? <div className="mio-result-card-media-overlay">{children}</div> : null}
    </div>
  );
}

function MarketplaceCardPlaceholder({ variant, label }: { variant: ResultCardVariant; label: string }) {
  return (
    <svg
      className="mio-result-card-placeholder"
      viewBox="0 0 360 180"
      role="img"
      aria-label={label}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="38" y="28" width="284" height="124" rx="14" className="mio-card-visual-surface" />
      {variant === "project" ? (
        <>
          <rect x="62" y="51" width="236" height="26" rx="8" className="mio-card-visual-panel" />
          <circle cx="82" cy="64" r="6" className="mio-card-visual-accent" />
          <path d="m87 69 8 8" className="mio-card-visual-accent-line" />
          <rect x="62" y="94" width="66" height="38" rx="8" className="mio-card-visual-panel" />
          <rect x="147" y="94" width="66" height="38" rx="8" className="mio-card-visual-panel" />
          <rect x="232" y="94" width="66" height="38" rx="8" className="mio-card-visual-panel" />
        </>
      ) : variant === "store" ? (
        <>
          <path d="M108 79h144l-12-30H120l-12 30Z" className="mio-card-visual-panel" />
          <path d="M116 79v53h128V79" className="mio-card-visual-line" />
          <path d="M148 132V98h64v34" className="mio-card-visual-line" />
          <path d="M108 79c0 12 18 12 18 0 0 12 18 12 18 0 0 12 18 12 18 0 0 12 18 12 18 0 0 12 18 12 18 0 0 12 18 12 18 0 0 12 18 12 18 0 0 12 18 12 18 0" className="mio-card-visual-accent-line" />
        </>
      ) : (
        <>
          <rect x="111" y="47" width="138" height="86" rx="10" className="mio-card-visual-panel" />
          <path d="m111 74 69 34 69-34M180 108v25" className="mio-card-visual-line" />
          <path d="m111 74 69-27 69 27" className="mio-card-visual-accent-line" />
        </>
      )}
    </svg>
  );
}
