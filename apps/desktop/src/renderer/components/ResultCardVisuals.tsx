import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from "react";
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
        <MediaThumbnail src={imageUrl} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <MarketplaceCardPlaceholder variant={variant} label={alt} />
      )}
      {children ? <div className="mio-result-card-media-overlay">{children}</div> : null}
    </div>
  );
}

export function MediaThumbnail({ src, onError, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src?: string | null }) {
  const [resolvedSource, setResolvedSource] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const source = normalizeMediaSource(src);
    setFailed(false);
    if (!source) {
      setResolvedSource(undefined);
      return () => {
        cancelled = true;
      };
    }
    const localPath = localMediaPath(source);
    const readPreviewFile = window.marketplaceOS?.platform?.readPreviewFile;
    if (!localPath || !readPreviewFile) {
      setResolvedSource(source);
      return () => {
        cancelled = true;
      };
    }
    setResolvedSource(undefined);
    void readPreviewFile(localPath)
      .then((result) => {
        if (!cancelled) setResolvedSource(`data:${result.mimeType};base64,${result.dataBase64}`);
      })
      .catch(() => {
        if (!cancelled) setResolvedSource(source);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!resolvedSource || failed) return null;
  return (
    <img
      {...props}
      src={resolvedSource}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}

function normalizeMediaSource(value?: string | null): string {
  const source = value?.trim() ?? "";
  if (source.startsWith("//")) return `https:${source}`;
  return source;
}

function localMediaPath(source: string): string | undefined {
  if (/^[a-z]:[\\/]/iu.test(source)) return source;
  if (!source.toLocaleLowerCase().startsWith("file:")) return undefined;
  try {
    const fileUrl = new URL(source);
    const decodedPath = decodeURIComponent(fileUrl.pathname);
    return /^\/[a-z]:\//iu.test(decodedPath) ? decodedPath.slice(1) : decodedPath;
  } catch {
    return source.replace(/^file:\/{2,3}/iu, "");
  }
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
