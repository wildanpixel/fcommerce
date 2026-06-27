import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Archive,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileDown,
  Gauge,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Moon,
  Play,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Store,
  TerminalSquare
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { DEFAULT_REPORT_SECTIONS, type ReportSectionConfig } from "../shared/reportSections.js";
import type {
  CreateJobPayload,
  MarketplaceId,
  NewProjectInput,
  SaveSettingsPayload,
  SettingsPayload
} from "../shared/contracts.js";
import { apiClient } from "./api/client.js";
import { type AppView, useUiStore } from "./store/uiStore.js";

const navItems: Array<{ id: AppView; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "research", label: "Research", icon: Search },
  { id: "reports", label: "Reports", icon: FileDown },
  { id: "settings", label: "Settings", icon: Settings }
];

export default function App() {
  const activeView = useUiStore((state) => state.activeView);
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <div className="grid min-h-screen grid-cols-[260px_minmax(0,1fr)]">
        <Sidebar />
        <main className="min-w-0 border-l border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(98,168,255,0.10),transparent_28%),linear-gradient(180deg,#10141d,#090b10_48%)]">
          <TopBar />
          <div className="px-8 pb-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {activeView === "dashboard" && <DashboardView />}
                {activeView === "research" && <ResearchView />}
                {activeView === "reports" && <ReportsView />}
                {activeView === "settings" && <SettingsView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar() {
  const activeView = useUiStore((state) => state.activeView);
  const setActiveView = useUiStore((state) => state.setActiveView);
  return (
    <aside className="flex min-h-screen flex-col bg-ink-900 px-4 py-5">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-signal-blue/15 text-signal-blue">
          <BriefcaseBusiness size={20} />
        </div>
        <div>
          <div className="text-sm font-semibold">Marketplace Intelligence OS</div>
          <div className="text-xs text-ink-500">Shopee Indonesia V1</div>
        </div>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={[
                "flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition",
                active
                  ? "bg-white/9 text-white shadow-glow"
                  : "text-ink-300 hover:bg-white/6 hover:text-white"
              ].join(" ")}
              onClick={() => setActiveView(item.id)}
            >
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto rounded-md border border-white/8 bg-white/5 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-300">
          <ShieldCheck size={14} />
          Local First
        </div>
        <div className="text-xs leading-5 text-ink-500">
          Data, screenshots, reports, and settings stay on this machine.
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="flex h-16 items-center justify-between px-8">
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-ink-500">Commercial Desktop App</div>
        <h1 className="text-lg font-semibold text-white">Marketplace Intelligence OS</h1>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-white/8 bg-white/5 px-3 py-2 text-xs text-ink-300">
        <Moon size={14} />
        Dark Mode
      </div>
    </header>
  );
}

function DashboardView() {
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: apiClient.dashboard });
  const metrics = dashboard.data?.metrics;
  const chartData = dashboard.data?.projects.map((project) => ({
    name: project.keyword,
    products: project.counts.products,
    stores: project.counts.stores,
    reports: project.counts.reports
  }));

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Metric icon={BriefcaseBusiness} label="Active Projects" value={metrics?.activeProjects ?? 0} />
        <Metric icon={Activity} label="Running Jobs" value={metrics?.runningJobs ?? 0} />
        <Metric icon={Store} label="Products" value={metrics?.collectedProducts ?? 0} />
        <Metric icon={Archive} label="Reports" value={metrics?.completedReports ?? 0} />
      </div>
      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] gap-5">
        <Panel title="Project Coverage" icon={Gauge}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#657187" tickLine={false} axisLine={false} />
                <YAxis stroke="#657187" tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ background: "#11151d", border: "1px solid rgba(255,255,255,0.10)" }}
                />
                <Bar dataKey="products" fill="#62a8ff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="stores" fill="#4ade80" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reports" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Recent Jobs" icon={Clock3}>
          <div className="space-y-3">
            {(dashboard.data?.jobs ?? []).slice(0, 7).map((job) => (
              <JobRow key={job.id} status={job.status} keyword={job.keyword} progress={job.progress} />
            ))}
            {dashboard.data?.jobs.length === 0 && <EmptyState label="No jobs created yet." />}
          </div>
        </Panel>
      </div>
      <Panel title="Projects" icon={ListChecks}>
        <div className="grid grid-cols-3 gap-3">
          {(dashboard.data?.projects ?? []).map((project) => (
            <div key={project.id} className="rounded-md border border-white/8 bg-white/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium text-white">{project.name}</div>
                <span className="rounded-full bg-signal-green/15 px-2 py-1 text-xs text-signal-green">
                  {project.status}
                </span>
              </div>
              <div className="text-sm text-ink-300">{project.keyword}</div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-ink-500">
                <span>{project.counts.products} products</span>
                <span>{project.counts.stores} stores</span>
                <span>{project.counts.reports} reports</span>
              </div>
            </div>
          ))}
          {dashboard.data?.projects.length === 0 && <EmptyState label="No projects created yet." />}
        </div>
      </Panel>
    </section>
  );
}

function ResearchView() {
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: apiClient.dashboard });
  const marketplaces = useQuery({ queryKey: ["marketplaces"], queryFn: apiClient.marketplaces });
  const [projectInput, setProjectInput] = useState<NewProjectInput>({
    name: "False Eyelashes Intelligence",
    keyword: "false eyelashes",
    marketplace: "SHOPEE_ID",
    language: "id-ID"
  });
  const [jobInput, setJobInput] = useState<Omit<CreateJobPayload, "projectId">>({
    keyword: "false eyelashes",
    marketplace: "SHOPEE_ID",
    limit: 7,
    includeTopSales: true,
    collectReviews: true,
    collectStores: true,
    captureScreenshots: true
  });
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const createProject = useMutation({
    mutationFn: apiClient.createProject,
    onSuccess: (project) => {
      setSelectedProjectId(project.id);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });
  const createJob = useMutation({
    mutationFn: apiClient.createJob,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  });

  const selectedProject = useMemo(
    () => dashboard.data?.projects.find((project) => project.id === selectedProjectId),
    [dashboard.data?.projects, selectedProjectId]
  );

  function submitProject(event: FormEvent) {
    event.preventDefault();
    createProject.mutate(projectInput);
  }

  function submitJob(event: FormEvent) {
    event.preventDefault();
    const projectId = selectedProjectId || dashboard.data?.projects[0]?.id;
    if (!projectId) {
      return;
    }
    createJob.mutate({ ...jobInput, projectId });
  }

  return (
    <section className="grid grid-cols-[minmax(380px,0.82fr)_minmax(0,1.18fr)] gap-5">
      <Panel title="Project Manager" icon={Plus}>
        <form className="space-y-4" onSubmit={submitProject}>
          <Field label="Project name">
            <input
              value={projectInput.name}
              onChange={(event) => setProjectInput({ ...projectInput, name: event.target.value })}
              className="input"
            />
          </Field>
          <Field label="Keyword">
            <input
              value={projectInput.keyword}
              onChange={(event) => {
                setProjectInput({ ...projectInput, keyword: event.target.value });
                setJobInput({ ...jobInput, keyword: event.target.value });
              }}
              className="input"
            />
          </Field>
          <Field label="Marketplace">
            <select
              value={projectInput.marketplace}
              onChange={(event) =>
                setProjectInput({ ...projectInput, marketplace: event.target.value as MarketplaceId })
              }
              className="input"
            >
              {(marketplaces.data ?? []).map((marketplace) => (
                <option key={marketplace.id} value={marketplace.id} disabled={!marketplace.enabled}>
                  {marketplace.displayName}
                </option>
              ))}
            </select>
          </Field>
          <button className="primary-button" type="submit" disabled={createProject.isPending}>
            <Plus size={16} />
            Create Project
          </button>
        </form>
      </Panel>

      <Panel title="Keyword Job" icon={Play}>
        <form className="grid grid-cols-2 gap-4" onSubmit={submitJob}>
          <Field label="Project">
            <select
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="input"
            >
              <option value="">{dashboard.data?.projects[0] ? "Use latest project" : "No project"}</option>
              {(dashboard.data?.projects ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Keyword">
            <input
              value={jobInput.keyword}
              onChange={(event) => setJobInput({ ...jobInput, keyword: event.target.value })}
              className="input"
            />
          </Field>
          <Field label="Product limit">
            <input
              type="number"
              min={1}
              max={50}
              value={jobInput.limit}
              onChange={(event) => setJobInput({ ...jobInput, limit: Number(event.target.value) })}
              className="input"
            />
          </Field>
          <Toggle
            label="Top sales"
            checked={jobInput.includeTopSales}
            onChange={(includeTopSales) => setJobInput({ ...jobInput, includeTopSales })}
          />
          <Toggle
            label="Reviews"
            checked={jobInput.collectReviews}
            onChange={(collectReviews) => setJobInput({ ...jobInput, collectReviews })}
          />
          <Toggle
            label="Stores"
            checked={jobInput.collectStores}
            onChange={(collectStores) => setJobInput({ ...jobInput, collectStores })}
          />
          <Toggle
            label="Screenshots"
            checked={jobInput.captureScreenshots}
            onChange={(captureScreenshots) => setJobInput({ ...jobInput, captureScreenshots })}
          />
          <div className="col-span-2 flex items-center justify-between rounded-md border border-white/8 bg-white/5 p-3 text-sm text-ink-300">
            <span>{selectedProject?.name ?? "No project selected"}</span>
            <button className="primary-button w-auto" type="submit" disabled={!dashboard.data?.projects.length}>
              <Play size={16} />
              Start Job
            </button>
          </div>
        </form>
      </Panel>
    </section>
  );
}

function ReportsView() {
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: apiClient.dashboard });
  const [projectId, setProjectId] = useState("");
  const [sections, setSections] = useState<ReportSectionConfig[]>(DEFAULT_REPORT_SECTIONS);
  const generateReport = useMutation({
    mutationFn: apiClient.generateReport,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const selectedProjectId = projectId || dashboard.data?.projects[0]?.id;
    if (!selectedProjectId) {
      return;
    }
    generateReport.mutate({
      projectId: selectedProjectId,
      templateId: "consulting-prd-v1",
      sections
    });
  }

  return (
    <section className="grid grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)] gap-5">
      <Panel title="Report Builder" icon={FileDown}>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Project">
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="input">
              <option value="">{dashboard.data?.projects[0] ? "Use latest project" : "No project"}</option>
              {(dashboard.data?.projects ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
          <button className="primary-button" type="submit" disabled={!dashboard.data?.projects.length || generateReport.isPending}>
            <FileDown size={16} />
            Export PDF
          </button>
          {generateReport.data && (
            <div className="rounded-md border border-signal-green/25 bg-signal-green/10 p-3 text-sm text-signal-green">
              PDF exported to {generateReport.data.pdfPath}
            </div>
          )}
        </form>
      </Panel>
      <Panel title="Modular Sections" icon={ListChecks}>
        <div className="grid grid-cols-2 gap-3">
          {sections.map((section) => (
            <button
              type="button"
              key={section.id}
              className={[
                "rounded-md border p-4 text-left transition",
                section.enabled
                  ? "border-signal-blue/35 bg-signal-blue/10"
                  : "border-white/8 bg-white/5 text-ink-500"
              ].join(" ")}
              onClick={() =>
                setSections((current) =>
                  current.map((item) =>
                    item.id === section.id ? { ...item, enabled: !item.enabled } : item
                  )
                )
              }
            >
              <div className="mb-2 flex items-center justify-between text-sm font-medium">
                {section.label}
                {section.enabled && <CheckCircle2 size={16} className="text-signal-blue" />}
              </div>
              <div className="text-xs leading-5 text-ink-500">
                {section.requiredEvidence.slice(0, 3).join(", ")}
              </div>
            </button>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function SettingsView() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: apiClient.settings });
  const platform = useQuery({ queryKey: ["platform"], queryFn: apiClient.platform });
  const browsers = useQuery({ queryKey: ["browsers"], queryFn: apiClient.browsers });
  type SettingsFormState = SaveSettingsPayload &
    Pick<SettingsPayload, "openAiKeyConfigured" | "geminiKeyConfigured">;
  const [form, setForm] = useState<SettingsFormState | null>(null);
  const value: SettingsFormState | null = form ?? settings.data ?? null;
  const save = useMutation({
    mutationFn: apiClient.saveSettings,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["settings"] })
  });

  if (!value) {
    return <EmptyState label="Loading settings." />;
  }

  function update(patch: Partial<SettingsFormState>) {
    if (!value) {
      return;
    }
    setForm({ ...value, ...patch });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!value) {
      return;
    }
    save.mutate({
      marketplace: value.marketplace,
      theme: value.theme,
      browser: value.browser,
      exportFolder: value.exportFolder,
      screenshotFolder: value.screenshotFolder,
      language: value.language,
      concurrency: value.concurrency,
      openAiApiKey: value.openAiApiKey,
      geminiApiKey: value.geminiApiKey
    });
  }

  return (
    <section className="grid grid-cols-[minmax(0,1fr)_360px] gap-5">
      <Panel title="Settings" icon={Settings}>
        <form className="grid grid-cols-2 gap-4" onSubmit={submit}>
          <Field label="Theme">
            <select value={value.theme} onChange={(event) => update({ theme: event.target.value as SaveSettingsPayload["theme"] })} className="input">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </Field>
          <Field label="Browser">
            <select value={value.browser} onChange={(event) => update({ browser: event.target.value as SaveSettingsPayload["browser"] })} className="input">
              {(browsers.data ?? [
                { id: "chromium" as const, name: "Bundled Chromium", available: true, profilePath: "" }
              ]).map((browser) => (
                <option key={browser.id} value={browser.id} disabled={!browser.available}>
                  {browser.name}
                  {browser.available ? "" : " (not detected)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Export folder">
            <input value={value.exportFolder} onChange={(event) => update({ exportFolder: event.target.value })} className="input" />
          </Field>
          <Field label="Screenshot folder">
            <input value={value.screenshotFolder} onChange={(event) => update({ screenshotFolder: event.target.value })} className="input" />
          </Field>
          <Field label="Language">
            <input value={value.language} onChange={(event) => update({ language: event.target.value })} className="input" />
          </Field>
          <Field label="Concurrency">
            <input
              type="number"
              min={1}
              max={5}
              value={value.concurrency}
              onChange={(event) => update({ concurrency: Number(event.target.value) })}
              className="input"
            />
          </Field>
          <Field label="OpenAI API key">
            <input type="password" onChange={(event) => update({ openAiApiKey: event.target.value })} className="input" placeholder={value.openAiKeyConfigured ? "Configured" : ""} />
          </Field>
          <Field label="Gemini API key">
            <input type="password" onChange={(event) => update({ geminiApiKey: event.target.value })} className="input" placeholder={value.geminiKeyConfigured ? "Configured" : ""} />
          </Field>
          <button className="primary-button col-span-2" type="submit" disabled={save.isPending}>
            <KeyRound size={16} />
            Save Settings
          </button>
        </form>
      </Panel>
      <Panel title="Runtime" icon={TerminalSquare}>
        <div className="space-y-3 text-sm text-ink-300">
          <StatusLine label="OpenAI" active={value.openAiKeyConfigured} />
          <StatusLine label="Gemini" active={value.geminiKeyConfigured} />
          <StatusLine label="Marketplace" active={value.marketplace === "SHOPEE_ID"} />
          <StatusLine label="Local database" active />
          <div className="rounded-md border border-white/8 bg-white/5 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.12em] text-ink-500">
              {platform.data?.os ?? "Platform"} folders
            </div>
            <div className="space-y-1 break-all text-xs leading-5 text-ink-300">
              <div>Data: {platform.data?.directories.data ?? "-"}</div>
              <div>Reports: {platform.data?.directories.reports ?? "-"}</div>
              <div>Browser profiles: {platform.data?.directories.browserProfiles ?? "-"}</div>
            </div>
            {platform.data?.directories.appData && (
              <button
                className="primary-button mt-3"
                type="button"
                onClick={() => void apiClient.openPath(platform.data.directories.appData)}
              >
                <Archive size={16} />
                Open App Folder
              </button>
            )}
          </div>
        </div>
      </Panel>
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/8 bg-white/6 p-4 shadow-glow">
      <div className="mb-4 flex items-center justify-between text-ink-500">
        <span className="text-xs uppercase tracking-[0.14em]">{label}</span>
        <Icon size={17} />
      </div>
      <div className="text-3xl font-semibold text-white">{value}</div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: typeof Gauge;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-white/8 bg-ink-900/72 p-5 shadow-glow">
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-white">
        <Icon size={17} className="text-signal-blue" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-ink-500">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={[
        "flex h-[66px] items-center justify-between rounded-md border px-4 text-sm transition",
        checked ? "border-signal-green/35 bg-signal-green/10 text-white" : "border-white/8 bg-white/5 text-ink-500"
      ].join(" ")}
      onClick={() => onChange(!checked)}
    >
      {label}
      <span className={["h-5 w-9 rounded-full p-0.5 transition", checked ? "bg-signal-green" : "bg-ink-700"].join(" ")}>
        <span className={["block h-4 w-4 rounded-full bg-white transition", checked ? "translate-x-4" : "translate-x-0"].join(" ")} />
      </span>
    </button>
  );
}

function JobRow({ status, keyword, progress }: { status: string; keyword: string; progress: number }) {
  return (
    <div className="rounded-md border border-white/8 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-white">{keyword}</span>
        <span className="text-xs text-ink-500">{status}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
        <div className="h-full rounded-full bg-signal-blue" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function StatusLine({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/8 bg-white/5 px-3 py-2">
      <span>{label}</span>
      <span className={active ? "text-signal-green" : "text-ink-500"}>{active ? "Ready" : "Not configured"}</span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-white/12 bg-white/[0.03] p-6 text-sm text-ink-500">
      {label}
    </div>
  );
}
