import { memo } from "react";
import { Brain, ExternalLink, FileDown, PanelLeftClose, PanelLeftOpen, Search, Settings, ShieldCheck, Table2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { APP_AUTHOR_LINKEDIN, APP_AUTHOR_NAME } from "../app/appMetadata.js";
import { apiClient } from "../api/client.js";
import { type AppView, useUiStore } from "../store/uiStore.js";

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
          "mb-8 flex items-center gap-3",
          collapsed ? "flex-col px-0" : "px-2"
        ].join(" ")}
      >
        <div className="mio-brand-mark flex h-9 w-9 items-center justify-center rounded-md bg-signal-blue/15 text-signal-blue">
          <Brain size={20} />
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
        <button
          type="button"
          className="secondary-button mio-round-icon-button h-10 w-10 shrink-0 px-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggle}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="mio-primary-nav space-y-5" aria-label="Primary navigation">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && <div className="mio-nav-section-label px-3">{group.label}</div>}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  data-tooltip={collapsed ? item.label : undefined}
                  className={[
                    "mio-nav-button flex h-10 w-full items-center rounded-md text-left text-sm transition",
                    collapsed ? "justify-center px-0" : "gap-3 px-3",
                    active ? "mio-nav-active bg-white/9 text-white" : "text-ink-300 hover:bg-white/6 hover:text-white"
                  ].join(" ")}
                  onClick={() => setActiveView(item.id)}
                >
                  <Icon size={17} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {!collapsed && <div className="mt-auto space-y-3">
        <button
          type="button"
          className="mio-sidebar-utility w-full rounded-md border border-white/8 bg-white/5 p-3 text-left transition hover:border-signal-blue/35 hover:bg-signal-blue/10"
          onClick={() => void apiClient.openUrl(APP_AUTHOR_LINKEDIN)}
        >
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-ink-300">
            <ExternalLink size={14} />
            Developer
          </div>
          <div className="text-xs leading-5 text-ink-500">{APP_AUTHOR_NAME}</div>
        </button>
        <div className="mio-sidebar-vault rounded-md border border-white/8 bg-white/5 p-3 transition-opacity duration-300">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-300">
            <ShieldCheck size={14} />
            Local Evidence Vault
          </div>
          <div className="text-xs leading-5 text-ink-500">
            Keyword projects, screenshots, reports, browser sessions, and keys stay on this machine.
          </div>
        </div>
      </div>}
    </motion.aside>
  );
});
