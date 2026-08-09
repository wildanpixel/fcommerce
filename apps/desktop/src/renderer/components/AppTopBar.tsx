import { memo, type ReactNode } from "react";
import { Check, Gauge, Languages, Moon, Sun } from "lucide-react";
import { APP_LANGUAGES, languageOption, translate, type AppLanguage } from "../app/languages.js";
import { IconButton, Popover, Tooltip } from "./primitives.js";

export type ThemeMode = "dark" | "light";

type AppTopBarProps = {
  title: string;
  themeMode: ThemeMode;
  onThemeToggle: () => void;
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
  breadcrumbs?: string[];
  description?: string;
  action?: ReactNode;
  showActivityButton?: boolean;
  onActivityToggle?: () => void;
};

export const AppTopBar = memo(function AppTopBar({
  title,
  themeMode,
  onThemeToggle,
  language,
  onLanguageChange,
  breadcrumbs = [],
  description,
  action,
  showActivityButton = false,
  onActivityToggle,
}: AppTopBarProps) {
  return (
    <header
      className="mio-top-bar sticky top-0 z-50 flex h-16 items-center justify-between px-8"
    >
      <div className="mio-topbar-heading min-w-0">
        <nav className="mio-breadcrumbs" aria-label="Breadcrumb">
          <span>{translate(language, "Research Product Market")}</span>
          {breadcrumbs.map((item) => (
            <span key={item} className="mio-breadcrumb-item">
              <span aria-hidden="true">/</span>
              <span>{translate(language, item)}</span>
            </span>
          ))}
        </nav>
        <h1 className="truncate text-lg font-semibold text-[var(--mio-text)]">{translate(language, title)}</h1>
        {description ? <p className="mio-topbar-description">{translate(language, description)}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {action}
        <Popover
          align="end"
          trigger={({ open, toggle }) => (
            <IconButton
              label={translate(language, "Language")}
              variant="secondary"
              aria-expanded={open}
              aria-haspopup="menu"
              data-mio-popover-trigger
              className="mio-language-trigger"
              onClick={toggle}
            >
              <Languages size={16} />
              <span className="mio-language-code">{languageOption(language).shortLabel}</span>
            </IconButton>
          )}
        >
          {({ close }) => <div className="mio-language-menu" role="menu" aria-label={translate(language, "Language")}>
            {APP_LANGUAGES.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={language === option.id}
                className="mio-language-option"
                onClick={() => {
                  onLanguageChange(option.id);
                  close();
                }}
              >
                <span className="mio-language-option-check">
                  {language === option.id ? <Check size={14} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mio-language-option-label">{option.nativeLabel}</span>
                  <span className="mio-language-option-preview">{option.preview}</span>
                </span>
              </button>
            ))}
          </div>}
        </Popover>
        <Tooltip content={translate(language, themeMode === "dark" ? "Light theme" : "Dark theme")}>
          <button
            className="mio-theme-switch"
            type="button"
            role="switch"
            aria-checked={themeMode === "light"}
            aria-label={translate(language, "Switch theme")}
            onClick={onThemeToggle}
          >
            <span className="mio-theme-switch-icon" aria-hidden="true">
              {themeMode === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </span>
          </button>
        </Tooltip>
        {showActivityButton ? (
          <IconButton
            label="Toggle activity"
            variant="secondary"
            onClick={onActivityToggle}
          >
            <Gauge size={15} />
          </IconButton>
        ) : null}
      </div>
    </header>
  );
});
