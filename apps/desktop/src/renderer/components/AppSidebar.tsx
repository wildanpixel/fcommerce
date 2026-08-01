import { memo } from "react";
import { Brain, ChevronRight, ExternalLink, FileDown, HardDrive, PanelLeftClose, PanelLeftOpen, Search, Settings, Table2, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { APP_AUTHOR_LINKEDIN, APP_AUTHOR_NAME } from "../app/appMetadata.js";
import { apiClient } from "../api/client.js";
import { type AppView, useUiStore } from "../store/uiStore.js";
import { Button, IconButton, NavigationItem, Popover } from "./primitives.js";

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
  onToggle: () => void;
};

export const AppSidebar = memo(function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const activeView = useUiStore((state) => state.activeView);
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
    >
      <div
        className={[
          "mio-sidebar-brand mb-8 flex items-center gap-3",
          collapsed ? "flex-col px-0" : "px-2"
        ].join(" ")}
      >
        <div className="mio-brand-mark flex h-9 w-9 items-center justify-center">
          <Brain size={19} strokeWidth={1.65} />
        </div>
        {!collapsed && (
          <motion.div
            className="min-w-0 flex-1"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="mio-brand-title text-sm font-semibold leading-5">Marketplace</div>
            <div className="mio-brand-subtitle text-xs leading-5 text-ink-500">Intelligence OS</div>
          </motion.div>
        )}
        <IconButton
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          variant="ghost"
          className="mio-sidebar-collapse shrink-0"
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </IconButton>
      </div>

      <nav className="mio-primary-nav space-y-5" aria-label="Primary navigation">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && <div className="mio-nav-section-label px-3">{group.label}</div>}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <NavigationItem
                  key={item.id}
                  icon={Icon}
                  label={item.label}
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
                label="Local Evidence Vault"
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
              <span>Local Evidence Vault</span>
              <span className="mio-status-dot" aria-label="Available" />
            </div>
            <p className="mio-popover-copy">
              Keyword projects, screenshots, reports, browser sessions, and keys stay on this machine.
            </p>
          </Popover>
          <IconButton label="Open Settings" variant="ghost" onClick={() => setActiveView("settings")}>
            <Settings size={17} />
          </IconButton>
        </div>

        <Popover
          align="start"
          trigger={({ open, toggle }) => (
            <button
              type="button"
              className={["mio-account-button", collapsed ? "mio-account-button-collapsed" : ""].join(" ")}
              aria-label="Developer profile"
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
              <div className="mio-popover-profile-meta">Developer · Marketplace Intelligence OS</div>
            </div>
          </div>
          <div className="mio-popover-separator" />
          <Button variant="ghost" className="mio-popover-row" onClick={() => void apiClient.openUrl(APP_AUTHOR_LINKEDIN)}>
            <ExternalLink size={16} />
            <span>Open developer profile</span>
            <ChevronRight size={14} className="ml-auto" />
          </Button>
        </Popover>
      </div>
    </motion.aside>
  );
});
