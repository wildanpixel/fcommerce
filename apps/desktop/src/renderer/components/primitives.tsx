import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, disabled, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={clsx("mio-button", `mio-button-${variant}`, `mio-button-${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="mio-spinner" aria-hidden="true" />}
      <span className="mio-button-content">{children}</span>
    </button>
  );
});

export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<number>();
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, placement: "bottom" as "bottom" | "right" });

  function show(delay: number) {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect || rootRef.current?.querySelector('[aria-expanded="true"]')) return;
      const opensRight = rect.left < 90;
      setPosition(opensRight
        ? {
            left: Math.min(window.innerWidth - 8, rect.right + 8),
            top: Math.max(16, Math.min(window.innerHeight - 16, rect.top + rect.height / 2)),
            placement: "right"
          }
        : {
            left: Math.max(92, Math.min(window.innerWidth - 92, rect.left + rect.width / 2)),
            top: Math.min(window.innerHeight - 8, rect.bottom + 8),
            placement: "bottom"
          });
      setVisible(true);
    }, delay);
  }

  function hide() {
    window.clearTimeout(timerRef.current);
    setVisible(false);
  }

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return (
    <span
      ref={rootRef}
      className="mio-tooltip"
      aria-describedby={tooltipId}
      onMouseEnter={() => show(260)}
      onMouseLeave={hide}
      onFocus={() => show(120)}
      onBlur={hide}
      onPointerDown={hide}
    >
      {children}
      {visible && createPortal(
        <span
          id={tooltipId}
          className="mio-tooltip-bubble"
          role="tooltip"
          data-placement={position.placement}
          style={{ left: position.left, top: position.top }}
        >
          {content}
        </span>,
        document.querySelector(".mio-app") ?? document.body
      )}
    </span>
  );
}

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps & { label: string }>(function IconButton(
  { label, className, children, ...props },
  ref
) {
  return (
    <Tooltip content={label}>
      <Button ref={ref} size="icon" aria-label={label} className={className} {...props}>
        {children}
      </Button>
    </Tooltip>
  );
});

export function Chip({
  active = false,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={clsx("mio-chip", active && "mio-chip-active", className)}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  );
}

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  orientation = "horizontal",
  className
}: {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  label: string;
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  return (
    <div
      className={clsx("mio-segmented-control", `mio-segmented-${orientation}`, className)}
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={clsx("mio-segmented-item", active && "mio-segmented-item-active")}
            aria-pressed={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
          >
            {Icon && <Icon size={16} aria-hidden="true" />}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={clsx("input mio-input", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <span className="mio-select-wrap">
      <select ref={ref} className={clsx("input mio-select", className)} {...props}>
        {children}
      </select>
    </span>
  );
});

export function Checkbox({
  label,
  description,
  tile = false,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  description?: ReactNode;
  tile?: boolean;
}) {
  return (
    <label
      className={clsx(
        "mio-checkbox-row",
        tile && "mio-checkbox-tile",
        props.checked && "mio-checkbox-row-checked",
        props.disabled && "mio-checkbox-row-disabled",
        className
      )}
    >
      <input type="checkbox" className="mio-checkbox-input" {...props} />
      <span className="mio-checkbox-control" aria-hidden="true">
        <Check size={11} strokeWidth={2.25} />
      </span>
      <span className="min-w-0">
        <span className="mio-checkbox-label">{label}</span>
        {description && <span className="mio-checkbox-description">{description}</span>}
      </span>
    </label>
  );
}

export function Card({
  interactive = false,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div className={clsx("mio-card", interactive && "mio-card-interactive", className)} {...props}>
      {children}
    </div>
  );
}

export function NavigationItem({
  icon: Icon,
  label,
  active,
  collapsed,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  const button = (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={clsx("mio-nav-button", active && "mio-nav-active", collapsed && "mio-nav-button-collapsed", className)}
      {...props}
    >
      <Icon size={18} strokeWidth={1.65} aria-hidden="true" />
      {!collapsed && <span>{label}</span>}
    </button>
  );
  return collapsed ? <Tooltip content={label}>{button}</Tooltip> : button;
}

export function Popover({
  trigger,
  children,
  align = "start",
  className
}: {
  trigger: (controls: { open: boolean; toggle: () => void; close: () => void }) => ReactNode;
  children: ReactNode | ((controls: { close: () => void }) => ReactNode);
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top?: number; bottom?: number }>({ left: 8, bottom: 8 });

  useEffect(() => {
    if (!open) return;
    const positionPopover = () => {
      const triggerElement = rootRef.current?.querySelector<HTMLElement>("[data-mio-popover-trigger]");
      if (!triggerElement) return;
      const rect = triggerElement.getBoundingClientRect();
      const popoverWidth = 268;
      const preferredLeft = align === "end" ? rect.right - popoverWidth : rect.left;
      const left = Math.max(8, Math.min(preferredLeft, window.innerWidth - popoverWidth - 8));
      if (rect.top < window.innerHeight / 2) {
        setPosition({ left, top: Math.min(window.innerHeight - 8, rect.bottom + 8) });
      } else {
        setPosition({ left, bottom: Math.max(8, window.innerHeight - rect.top + 8) });
      }
    };
    positionPopover();
    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", positionPopover, true);
    return () => {
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
    };
  }, [align, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: globalThis.PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      rootRef.current?.querySelector<HTMLElement>("[data-mio-popover-trigger]")?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutside, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const close = () => setOpen(false);
  return (
    <div ref={rootRef} className="mio-popover-root">
      {trigger({ open, toggle: () => setOpen((current) => !current), close })}
      {open && createPortal(
        <div
          ref={popoverRef}
          className={clsx("mio-popover", `mio-popover-${align}`, className)}
          role="menu"
          style={{ left: position.left, bottom: position.bottom }}
        >
          {typeof children === "function" ? children({ close }) : children}
        </div>,
        document.querySelector(".mio-app") ?? document.body
      )}
    </div>
  );
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  actions,
  className,
  closeLabel = "Close dialog",
  dismissible = true
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  closeLabel?: string;
  dismissible?: boolean;
}) {
  const titleId = useId();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => {
      const preferred = surfaceRef.current?.querySelector<HTMLElement>("[data-mio-autofocus], [autofocus]");
      const first = surfaceRef.current?.querySelector<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
      );
      (preferred ?? first)?.focus();
    }, 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !surfaceRef.current) return;
      const focusable = Array.from(
        surfaceRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [dismissible, open]);

  if (!open) return null;

  return createPortal(
    <div className="mio-modal-overlay" onMouseDown={(event) => dismissible && event.target === event.currentTarget && onClose()}>
      <div ref={surfaceRef} className={clsx("mio-modal", className)} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="mio-modal-header">
          <div className="min-w-0">
            <h2 id={titleId} className="mio-modal-title">{title}</h2>
            {description && <div className="mio-modal-description">{description}</div>}
          </div>
          {dismissible && (
            <IconButton label={closeLabel} variant="ghost" onClick={onClose}>
              <X size={17} />
            </IconButton>
          )}
        </div>
        <div className="mio-modal-body">{children}</div>
        {actions && <div className="mio-modal-actions">{actions}</div>}
      </div>
    </div>,
    document.querySelector(".mio-app") ?? document.body
  );
}
