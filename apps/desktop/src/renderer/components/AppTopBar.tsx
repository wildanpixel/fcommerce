import { memo, useEffect, useRef, useState } from "react";
import { Gauge, Moon, Sun } from "lucide-react";

export type ThemeMode = "dark" | "light";

type AppTopBarProps = {
  title: string;
  themeMode: ThemeMode;
  onThemeToggle: () => void;
  showActivityButton?: boolean;
  onActivityToggle?: () => void;
};

function useCompactTopBar(): boolean {
  const [compact, setCompact] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let frame = 0;
    const threshold = 12;

    const update = () => {
      const nextScrollY = Math.max(0, window.scrollY);
      const delta = nextScrollY - lastScrollY.current;

      if (nextScrollY < 24) {
        setCompact(false);
      } else if (delta > threshold) {
        setCompact(true);
        lastScrollY.current = nextScrollY;
      } else if (delta < -threshold) {
        setCompact(false);
        lastScrollY.current = nextScrollY;
      }

      frame = 0;
    };

    const handleScroll = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return compact;
}

export const AppTopBar = memo(function AppTopBar({
  title,
  themeMode,
  onThemeToggle,
  showActivityButton = false,
  onActivityToggle,
}: AppTopBarProps) {
  const compact = useCompactTopBar();

  return (
    <header
      className={[
        "mio-top-bar sticky top-0 z-50 flex items-center justify-between px-8",
        compact ? "mio-top-bar-compact h-12" : "h-16",
      ].join(" ")}
    >
      <h1 className="text-lg font-semibold text-[var(--mio-text)]">{title}</h1>
      <div className="flex items-center gap-2">
        <button
          className="secondary-button h-9 w-auto px-3"
          type="button"
          onClick={onThemeToggle}
        >
          {themeMode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          {themeMode === "dark" ? "Light" : "Dark"}
        </button>
        {showActivityButton ? (
          <button
            aria-label="Toggle activity"
            className="secondary-button mio-round-icon-button h-10 w-10 px-0"
            type="button"
            onClick={onActivityToggle}
          >
            <Gauge size={15} />
          </button>
        ) : null}
      </div>
    </header>
  );
});
