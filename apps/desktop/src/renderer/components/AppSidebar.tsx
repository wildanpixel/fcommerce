import { memo } from "react";
import { ChevronRight, ExternalLink, FileDown, HardDrive, PanelLeftClose, PanelLeftOpen, Search, Settings, Table2, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { APP_AUTHOR_LINKEDIN, APP_AUTHOR_NAME } from "../app/appMetadata.js";
import { translate } from "../app/languages.js";
import { apiClient } from "../api/client.js";
import { type AppView, useUiStore } from "../store/uiStore.js";
import { Button, IconButton, NavigationItem, Popover } from "./primitives.js";
import researchProductMarketLogo from "../assets/research-product-market-logo-dark.png";
import wildanLogoBlack from "../assets/wildan-logo-black.png";

const navGroups: Array<{ label: string; items: Array<{ id: AppView; label: string; icon: LucideIcon }> }> = [
  {
    label: "Research",
    items: [{ id: "research", label: "New Research", icon: Search }]
  },
  {
    label: "Library",
    items: [
      { id: "projects", label: "Keyword Projects", icon: Table2 },
      { id: "reports", label: "Reports", icon: FileDown }
    ]
  },
  {
    label: "System",
    items: [{ id: "settings", label: "Settings", icon: Settings }]
  }
];

type AppSidebarProps = {
  collapsed: boolean;
  themeMode: "dark" | "light";
  onToggle: () => void;
  onHoverChange?: (hovered: boolean) => void;
};

export const AppSidebar = memo(function AppSidebar({ collapsed, themeMode, onToggle, onHoverChange }: AppSidebarProps) {
  const activeView = useUiStore((state) => state.activeView);
  const language = useUiStore((state) => state.language);
  const setActiveView = useUiStore((state) => state.setActiveView);

  return (
    <motion.aside
      className={[
        "mio-sidebar flex min-h-screen flex-col bg-ink-900 py-5 transition-all duration-300 ease-out",
        collapsed ? "mio-sidebar-collapsed px-2" : "px-4"
      ].join(" ")}
      initial={false}
      animate={{ width: "100%" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocusCapture={() => onHoverChange?.(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onHoverChange?.(false);
        }
      }}
    >
      <div
        className={[
          "mio-sidebar-brand mb-8 flex items-center gap-3",
          collapsed ? "flex-col px-0" : "px-2"
        ].join(" ")}
      >
        <div className="mio-brand-mark flex h-9 w-9 items-center justify-center">
          <img src={themeMode === "light" ? wildanLogoBlack : researchProductMarketLogo} alt="" className="mio-brand-logo" />
        </div>
        {!collapsed && (
          <motion.div
            className="min-w-0 flex-1"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="mio-brand-title text-sm font-semibold leading-5">Research Product</div>
            <div className="mio-brand-subtitle text-xs leading-5 text-ink-500">Market</div>
          </motion.div>
        )}
        <IconButton
          label={translate(language, collapsed ? "Expand sidebar" : "Collapse sidebar")}
          variant="ghost"
          className="mio-sidebar-collapse shrink-0"
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </IconButton>
      </div>

      <nav className="mio-primary-nav space-y-5" aria-label={translate(language, "Primary navigation")}>
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && <div className="mio-nav-section-label px-3">{translate(language, group.label)}</div>}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <NavigationItem
                  key={item.id}
                  icon={Icon}
                  label={translate(language, item.label)}
                  active={active}
                  collapsed={collapsed}
                  onClick={() => setActiveView(item.id)}
                />
              );
            })}
          </div>
        ))}
      </nav>

      <div className={["mio-sidebar-footer mt-auto", collapsed ? "mio-sidebar-footer-collapsed" : ""].join(" ")}>
        <div className="mio-sidebar-utility-row">
          <Popover
            align="start"
            trigger={({ open, toggle }) => (
              <IconButton
                label={translate(language, "Local Evidence Vault")}
                variant="ghost"
                aria-expanded={open}
                aria-haspopup="menu"
                data-mio-popover-trigger
                onClick={toggle}
              >
                <HardDrive size={17} />
              </IconButton>
            )}
          >
            <div className="mio-popover-heading">
              <HardDrive size={16} />
              <span>{translate(language, "Local Evidence Vault")}</span>
              <span className="mio-status-dot" aria-label={translate(language, "Available")} />
            </div>
            <p className="mio-popover-copy">
              {translate(language, "Keyword projects, screenshots, reports, browser sessions, and keys stay on this machine.")}
            </p>
          </Popover>
          <IconButton label={translate(language, "Open Settings")} variant="ghost" onClick={() => setActiveView("settings")}>
            <Settings size={17} />
          </IconButton>
        </div>

        <Popover
          align="start"
          trigger={({ open, toggle }) => (
            <button
              type="button"
              className={["mio-account-button", collapsed ? "mio-account-button-collapsed" : ""].join(" ")}
              aria-label={translate(language, "Developer profile")}
              aria-expanded={open}
              aria-haspopup="menu"
              data-mio-popover-trigger
              onClick={toggle}
            >
              <span className="mio-account-avatar"><UserRound size={15} /></span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate text-left">{APP_AUTHOR_NAME}</span>
                  <ChevronRight size={14} className="mio-account-chevron" />
                </>
              )}
            </button>
          )}
        >
          <div className="mio-popover-profile">
            <span className="mio-account-avatar mio-account-avatar-large"><UserRound size={17} /></span>
            <div className="min-w-0">
              <div className="mio-popover-profile-name">{APP_AUTHOR_NAME}</div>
               <div className="mio-popover-profile-meta">{translate(language, "Developer")} · Research Product Market</div>
            </div>
          </div>
          <div className="mio-popover-separator" />
          <Button variant="ghost" className="mio-popover-row" onClick={() => void apiClient.openUrl(APP_AUTHOR_LINKEDIN)}>
            <ExternalLink size={16} />
            <span>{translate(language, "Open developer profile")}</span>
            <ChevronRight size={14} className="ml-auto" />
          </Button>
        </Popover>
      </div>
    </motion.aside>
  );
});
