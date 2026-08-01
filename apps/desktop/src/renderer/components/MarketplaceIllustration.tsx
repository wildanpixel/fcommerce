export type MarketplaceIllustrationVariant =
  | "research"
  | "projects"
  | "reports"
  | "products"
  | "screenshots"
  | "browser"
  | "search"
  | "generic";

export function MarketplaceIllustration({
  variant = "generic",
  label
}: {
  variant?: MarketplaceIllustrationVariant;
  label: string;
}) {
  return (
    <svg
      className={`mio-illustration mio-illustration-${variant}`}
      viewBox="0 0 144 112"
      role="img"
      aria-label={label}
      fill="none"
    >
      <rect className="mio-illustration-surface" x="20" y="20" width="94" height="70" rx="9" />
      <path className="mio-illustration-muted" d="M20 37h94" />
      <circle className="mio-illustration-dot" cx="31" cy="29" r="2" />
      <circle className="mio-illustration-dot" cx="39" cy="29" r="2" />
      <circle className="mio-illustration-dot" cx="47" cy="29" r="2" />

      {variant === "research" && (
        <>
          <path className="mio-illustration-line" d="M43 76V53l13-8 13 8v23l-13 8-13-8Z" />
          <path className="mio-illustration-muted" d="m43 53 13 8 13-8M56 61v23" />
          <circle className="mio-illustration-accent" cx="88" cy="61" r="13" />
          <path className="mio-illustration-accent" d="m97 70 12 12" />
          <path className="mio-illustration-muted" d="M79 61h18M88 52v18" />
        </>
      )}

      {variant === "projects" && (
        <>
          <rect className="mio-illustration-line" x="34" y="48" width="28" height="28" rx="4" />
          <rect className="mio-illustration-line" x="70" y="48" width="28" height="28" rx="4" />
          <path className="mio-illustration-muted" d="M40 57h16M40 64h11M76 57h16M76 64h10" />
          <path className="mio-illustration-accent" d="M42 76h12M78 76h12" />
        </>
      )}

      {variant === "reports" && (
        <>
          <path className="mio-illustration-line" d="M43 47h36l12 12v25H43V47Z" />
          <path className="mio-illustration-muted" d="M79 47v12h12M51 68h31M51 76h23" />
          <path className="mio-illustration-accent" d="M51 61h17" />
        </>
      )}

      {variant === "products" && (
        <>
          <rect className="mio-illustration-line" x="34" y="47" width="26" height="31" rx="4" />
          <rect className="mio-illustration-line" x="68" y="47" width="26" height="31" rx="4" />
          <path className="mio-illustration-muted" d="m39 65 7-7 9 9M73 65l6-6 10 10M40 73h14M74 73h14" />
          <circle className="mio-illustration-accent-fill" cx="88" cy="53" r="3" />
        </>
      )}

      {variant === "screenshots" && (
        <>
          <path className="mio-illustration-line" d="M39 51h9l4-5h20l4 5h9v27H39V51Z" />
          <circle className="mio-illustration-accent" cx="62" cy="64" r="9" />
          <path className="mio-illustration-muted" d="M91 47v31M96 52h8M96 60h8M96 68h8" />
        </>
      )}

      {variant === "browser" && (
        <>
          <path className="mio-illustration-line" d="M34 48h67v32H34z" />
          <path className="mio-illustration-muted" d="M34 56h67M40 52h14M42 63h22M42 70h36" />
          <path className="mio-illustration-accent" d="m89 66 5 5 9-12" />
        </>
      )}

      {variant === "search" && (
        <>
          <rect className="mio-illustration-line" x="35" y="49" width="34" height="28" rx="4" />
          <path className="mio-illustration-muted" d="M42 57h20M42 64h14M42 71h18" />
          <circle className="mio-illustration-accent" cx="84" cy="62" r="12" />
          <path className="mio-illustration-accent" d="m93 71 10 10" />
        </>
      )}

      {variant === "generic" && (
        <>
          <path className="mio-illustration-line" d="M41 75V52l15-9 15 9v23l-15 9-15-9Z" />
          <path className="mio-illustration-muted" d="m41 52 15 9 15-9M56 61v23" />
          <path className="mio-illustration-accent" d="M83 54h17M83 62h12M83 70h15" />
        </>
      )}

      <path className="mio-illustration-base" d="M45 97h44" />
    </svg>
  );
}
