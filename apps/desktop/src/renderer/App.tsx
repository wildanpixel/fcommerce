import { FormEvent, ReactNode, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  BadgeCheck,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileDown,
  Gauge,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  MonitorSmartphone,
  Play,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Table2,
  TerminalSquare,
} from "lucide-react";
import type {
  CreateJobPayload,
  DashboardSnapshot,
  MarketplaceId,
  NewProjectInput,
  SaveSettingsPayload,
  SettingsPayload
} from "../shared/contracts.js";
import { DEFAULT_REPORT_SECTIONS, type ReportSectionConfig } from "../shared/reportSections.js";
import { apiClient } from "./api/client.js";
import { type AppView, useUiStore } from "./store/uiStore.js";

const navItems: Array<{ id: AppView; label: string; icon: typeof LayoutDashboard }> = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "research", label: "New Research", icon: Search },
  { id: "projects", label: "Projects", icon: Table2 },
  { id: "keyStores", label: "Key Stores", icon: Store },
  { id: "reports", label: "Reports", icon: FileDown },
  { id: "settings", label: "Settings", icon: Settings }
];

const recentExamples = ["False Eyelashes", "Lip Tint", "Baby Lotion", "Hair Dryer"];

const workflowStages = [
  "Searching",
  "Collecting Products",
  "Opening Product Pages",
  "Capturing Images",
  "Collecting Reviews",
  "Opening Stores",
  "Analyzing Store Design",
  "Running AI",
  "Generating Report",
  "Exporting PDF"
];

type WizardMarketplace = MarketplaceId | "MULTIPLE";
type ResearchDepth = "Basic" | "Normal" | "Deep";
type ProjectTab =
  | "Overview"
  | "Products"
  | "Stores"
  | "Reviews"
  | "Media"
  | "Visual Analysis"
  | "Key Stores"
  | "Report"
  | "Export";

export default function App() {
  const activeView = useUiStore((state) => state.activeView);
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <div className="grid min-h-screen grid-cols-[264px_minmax(0,1fr)]">
        <Sidebar />
        <main className="min-w-0 border-l border-white/8 bg-[linear-gradient(180deg,#10141d,#090b10_48%)]">
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
                {activeView === "home" && <HomeView />}
                {activeView === "research" && <ResearchView />}
                {activeView === "projects" && <ProjectsView />}
                {activeView === "keyStores" && <KeyStoresView />}
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
          <Brain size={20} />
        </div>
        <div>
          <div className="text-sm font-semibold">Marketplace Intelligence OS</div>
          <div className="text-xs text-ink-500">Research Marketplace Competitors</div>
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
          Local Research Vault
        </div>
        <div className="text-xs leading-5 text-ink-500">
          Projects, evidence, screenshots, reports, and keys stay on this machine.
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="flex h-16 items-center justify-between px-8">
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-ink-500">
          Marketplace Research Operating System
        </div>
        <h1 className="text-lg font-semibold text-white">Competitive Intelligence Workspace</h1>
      </div>
      <div className="flex items-center gap-2 rounded-md border border-white/8 bg-white/5 px-3 py-2 text-xs text-ink-300">
        <MonitorSmartphone size={14} />
        Auto Collection Method
      </div>
    </header>
  );
}

function HomeView() {
  const setActiveView = useUiStore((state) => state.setActiveView);
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: apiClient.dashboard });
  const projects = dashboard.data?.projects ?? [];
  const jobs = dashboard.data?.jobs ?? [];
  const recent = projects.length > 0 ? projects.slice(0, 4).map((project) => project.keyword) : recentExamples;

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="rounded-md border border-white/8 bg-ink-900/72 p-7 shadow-glow">
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-signal-blue/25 bg-signal-blue/10 px-3 py-1.5 text-xs text-signal-blue">
            <Sparkles size={14} />
            AI-assisted marketplace research
          </div>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-normal text-white">
            Marketplace Intelligence OS
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-ink-300">
            Research marketplace competitors from keyword to evidence-backed consulting report with minimal manual work.
          </p>
          <div className="mt-6 flex gap-3">
            <button className="primary-button w-auto px-4" type="button" onClick={() => setActiveView("research")}>
              <Plus size={16} />
              New Research
            </button>
            <button className="secondary-button w-auto px-4" type="button" onClick={() => setActiveView("projects")}>
              <Archive size={16} />
              Recent Research
            </button>
          </div>
          <div className="mt-8 grid grid-cols-4 gap-3">
            <Metric icon={Search} label="Searches" value={projects.length || 4} />
            <Metric icon={Store} label="Stores" value={dashboard.data?.metrics.collectedProducts ?? 0} />
            <Metric icon={Bot} label="AI Reports" value={dashboard.data?.metrics.completedReports ?? 0} />
            <Metric icon={Clock3} label="Running" value={dashboard.data?.metrics.runningJobs ?? 0} />
          </div>
        </div>
        <Panel title="Recent Research" icon={Clock3}>
          <div className="space-y-2">
            {recent.map((keyword) => (
              <button
                key={keyword}
                className="flex w-full items-center justify-between rounded-md border border-white/8 bg-white/5 px-3 py-3 text-left text-sm text-white transition hover:bg-white/8"
                type="button"
                onClick={() => setActiveView(projects.length > 0 ? "projects" : "research")}
              >
                {keyword}
                <ChevronRight size={16} className="text-ink-500" />
              </button>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Research Workflow" icon={ListChecks}>
        <WorkflowRail jobs={jobs} />
      </Panel>
    </section>
  );
}

function ResearchView() {
  const queryClient = useQueryClient();
  const setActiveView = useUiStore((state) => state.setActiveView);
  const [step, setStep] = useState<1 | 2>(1);
  const [marketplace, setMarketplace] = useState<WizardMarketplace>("SHOPEE_ID");
  const [keyword, setKeyword] = useState("False Eyelashes");
  const [country, setCountry] = useState("Indonesia");
  const [language, setLanguage] = useState("Bahasa Indonesia");
  const [limit, setLimit] = useState(20);
  const [depth, setDepth] = useState<ResearchDepth>("Normal");
  const [options, setOptions] = useState({
    autoMethod: true,
    productDetails: true,
    storeHomepage: true,
    reviews: true,
    userMedia: true,
    storeDecoration: true,
    aiVisualAnalysis: true,
    pdf: true
  });

  const effectiveMarketplace: MarketplaceId = marketplace === "MULTIPLE" ? "SHOPEE_ID" : marketplace;
  const estimates = estimateResearch(limit, depth, options);

  const createProject = useMutation({
    mutationFn: apiClient.createProject,
    onSuccess: async (project) => {
      const job: CreateJobPayload = {
        projectId: project.id,
        keyword,
        marketplace: effectiveMarketplace,
        limit: Math.min(limit, 50),
        includeTopSales: true,
        collectReviews: options.reviews,
        collectStores: options.storeHomepage,
        captureScreenshots: options.productDetails || options.storeDecoration || options.userMedia
      };
      await apiClient.createJob(job);
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setActiveView("projects");
    }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const project: NewProjectInput = {
      name: `${keyword} Intelligence`,
      keyword,
      marketplace: effectiveMarketplace,
      language
    };
    createProject.mutate(project);
  }

  return (
    <section className="grid grid-cols-[minmax(0,1fr)_380px] gap-5">
      <Panel title="New Research Wizard" icon={Search}>
        <form className="space-y-6" onSubmit={submit}>
          <StepHeader current={step} />
          {step === 1 ? (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <MarketplaceCard
                  active={marketplace === "SHOPEE_ID"}
                  title="Shopee"
                  subtitle="Indonesia web and mobile evidence"
                  onClick={() => setMarketplace("SHOPEE_ID")}
                />
                <MarketplaceCard
                  active={marketplace === "TIKTOK_SHOP"}
                  title="TikTok Shop"
                  subtitle="Mobile-first collection plan"
                  onClick={() => setMarketplace("TIKTOK_SHOP")}
                />
                <MarketplaceCard
                  active={marketplace === "MULTIPLE"}
                  title="Multiple Platforms"
                  subtitle="Compare marketplace evidence"
                  onClick={() => setMarketplace("MULTIPLE")}
                />
              </div>
              <PanelInset title="Advanced Research Scope">
                <div className="grid grid-cols-2 gap-3">
                  <Toggle label="Auto Select Best Collection Method" checked={options.autoMethod} onChange={(value) => setOptions({ ...options, autoMethod: value })} />
                  <Toggle label="Collect Product Details" checked={options.productDetails} onChange={(value) => setOptions({ ...options, productDetails: value })} />
                  <Toggle label="Collect Store Homepage" checked={options.storeHomepage} onChange={(value) => setOptions({ ...options, storeHomepage: value })} />
                  <Toggle label="Collect Reviews" checked={options.reviews} onChange={(value) => setOptions({ ...options, reviews: value })} />
                  <Toggle label="Collect User Media" checked={options.userMedia} onChange={(value) => setOptions({ ...options, userMedia: value })} />
                  <Toggle label="Collect Store Decoration" checked={options.storeDecoration} onChange={(value) => setOptions({ ...options, storeDecoration: value })} />
                  <Toggle label="AI Visual Analysis" checked={options.aiVisualAnalysis} onChange={(value) => setOptions({ ...options, aiVisualAnalysis: value })} />
                  <Toggle label="Generate PDF" checked={options.pdf} onChange={(value) => setOptions({ ...options, pdf: value })} />
                </div>
              </PanelInset>
              <button className="primary-button" type="button" onClick={() => setStep(2)}>
                Continue
                <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Keyword">
                  <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="input" />
                </Field>
                <Field label="Country">
                  <input value={country} onChange={(event) => setCountry(event.target.value)} className="input" />
                </Field>
                <Field label="Language">
                  <input value={language} onChange={(event) => setLanguage(event.target.value)} className="input" />
                </Field>
                <Field label="Products to Analyze">
                  <select value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="input">
                    <option value={20}>Top 20</option>
                    <option value={50}>Top 50</option>
                    <option value={100}>Top 100</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(["Basic", "Normal", "Deep"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={[
                      "rounded-md border p-4 text-left transition",
                      depth === item ? "border-signal-blue/40 bg-signal-blue/10 text-white" : "border-white/8 bg-white/5 text-ink-300"
                    ].join(" ")}
                    onClick={() => setDepth(item)}
                  >
                    <div className="font-medium">{item}</div>
                    <div className="mt-1 text-xs text-ink-500">{depthDescription(item)}</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-3">
                <Estimate label="Time" value={estimates.time} />
                <Estimate label="AI Cost" value={estimates.aiCost} />
                <Estimate label="Screenshots" value={estimates.screenshots} />
                <Estimate label="Storage" value={estimates.storage} />
              </div>
              <div className="flex gap-3">
                <button className="secondary-button" type="button" onClick={() => setStep(1)}>
                  Back
                </button>
                <button className="primary-button" type="submit" disabled={createProject.isPending || keyword.trim().length < 2}>
                  <Play size={16} />
                  Start Research
                </button>
              </div>
            </div>
          )}
        </form>
      </Panel>
      <Panel title="Automation Plan" icon={Bot}>
        <div className="space-y-3">
          <PlanRow label="Search Results" value="Fast marketplace web collection" />
          <PlanRow label="Product Evidence" value="Screenshots, images, detail text, reviews" />
          <PlanRow label="Store Homepage" value="Best available storefront evidence" />
          <PlanRow label="Mobile Evidence" value="Activated when adapter support is available" />
          <PlanRow label="AI Output" value="Structured scoring, SWOT, gaps, and recommendations" />
        </div>
        <div className="mt-5 rounded-md border border-white/8 bg-white/5 p-3 text-xs leading-5 text-ink-500">
          The software chooses the reliable collection method automatically. The research screen stays focused on marketplace, keyword, country, depth, and output.
        </div>
      </Panel>
    </section>
  );
}

function ProjectsView() {
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: apiClient.dashboard });
  const projects = dashboard.data?.projects ?? [];
  const [selectedId, setSelectedId] = useState("");
  const selected = projects.find((project) => project.id === selectedId) ?? projects[0];

  return (
    <section className="grid grid-cols-[340px_minmax(0,1fr)] gap-5">
      <Panel title="Project Dashboard" icon={Table2}>
        <div className="space-y-3">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={[
                "w-full rounded-md border p-4 text-left transition",
                selected?.id === project.id ? "border-signal-blue/35 bg-signal-blue/10" : "border-white/8 bg-white/5"
              ].join(" ")}
              onClick={() => setSelectedId(project.id)}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-white">{project.keyword}</span>
                <StatusPill status={project.status} />
              </div>
              <div className="text-xs text-ink-500">{project.marketplace} · {formatDate(project.updatedAt)}</div>
            </button>
          ))}
          {projects.length === 0 && <EmptyState label="No projects yet. Start a new research workflow." />}
        </div>
      </Panel>
      <ProjectDetail project={selected} jobs={dashboard.data?.jobs ?? []} />
    </section>
  );
}

function ProjectDetail({
  project,
  jobs
}: {
  project: DashboardSnapshot["projects"][number] | undefined;
  jobs: DashboardSnapshot["jobs"];
}) {
  const [tab, setTab] = useState<ProjectTab>("Overview");
  if (!project) {
    return <Panel title="Project Detail" icon={Gauge}><EmptyState label="Select or create a project." /></Panel>;
  }
  const projectJobs = jobs.filter((job) => job.projectId === project.id);
  const tabs: ProjectTab[] = [
    "Overview",
    "Products",
    "Stores",
    "Reviews",
    "Media",
    "Visual Analysis",
    "Key Stores",
    "Report",
    "Export"
  ];
  return (
    <Panel title={`${project.keyword} Research OS`} icon={Gauge}>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            className={[
              "rounded-md px-3 py-2 text-xs transition",
              tab === item ? "bg-white/10 text-white" : "bg-white/5 text-ink-400 hover:text-white"
            ].join(" ")}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-3">
            <Metric icon={Archive} label="Products" value={project.counts.products} />
            <Metric icon={Store} label="Stores" value={project.counts.stores} />
            <Metric icon={FileDown} label="Reports" value={project.counts.reports} />
            <Metric icon={Clock3} label="Jobs" value={project.counts.jobs} />
          </div>
          <PanelInset title="AI Executive Summary">
            <div className="text-sm leading-6 text-ink-300">
              This project is structured for market opportunity, pricing range, store quality, creative quality, and key-store ranking. As evidence is collected, the report engine turns product, store, review, media, and visual signals into recommendations.
            </div>
          </PanelInset>
          <WorkflowRail jobs={projectJobs} />
        </div>
      )}
      {tab !== "Overview" && (
        <EvidencePlaceholder
          tab={tab}
          products={project.counts.products}
          stores={project.counts.stores}
          reports={project.counts.reports}
        />
      )}
    </Panel>
  );
}

function KeyStoresView() {
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: apiClient.dashboard });
  const projects = dashboard.data?.projects ?? [];
  const source = projects.slice(0, 4);
  const rows = source.length > 0 ? source : recentExamples.map((keyword, index) => ({
    id: keyword,
    name: keyword,
    keyword,
    marketplace: index === 1 ? "TIKTOK_SHOP" : "SHOPEE_ID",
    status: "DRAFT",
    language: "id-ID",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    counts: { jobs: 0, products: 0, stores: 0, reports: 0 }
  } satisfies DashboardSnapshot["projects"][number]));

  return (
    <section className="space-y-5">
      <Panel title="Key Stores AI Ranking" icon={Store}>
        <div className="overflow-hidden rounded-md border border-white/8">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.12em] text-ink-500">
              <tr>
                <th className="px-4 py-3">Keyword</th>
                <th className="px-4 py-3">Brand Identity</th>
                <th className="px-4 py-3">Visual Consistency</th>
                <th className="px-4 py-3">Voucher Strategy</th>
                <th className="px-4 py-3">Trust</th>
                <th className="px-4 py-3">Overall Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((project, index) => {
                const score = Math.max(62, 92 - index * 7 + project.counts.stores);
                return (
                  <tr key={project.id} className="border-t border-white/8">
                    <td className="px-4 py-3 text-white">{project.keyword}</td>
                    <td className="px-4 py-3 text-ink-300">{score - 4}</td>
                    <td className="px-4 py-3 text-ink-300">{score - 2}</td>
                    <td className="px-4 py-3 text-ink-300">{score - 8}</td>
                    <td className="px-4 py-3 text-ink-300">{score - 1}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-signal-green/12 px-2 py-1 text-signal-green">{score}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="grid grid-cols-3 gap-4">
        <InsightCard title="Strengths" body="Rank storefronts by identity, hero banner quality, product matrix, and trust signals." />
        <InsightCard title="Weaknesses" body="Expose decoration gaps, inconsistent thumbnails, weak voucher placement, and low premium feeling." />
        <InsightCard title="Recommendations" body="Generate actions for banner hierarchy, packaging cues, category navigation, offers, and proof points." />
      </div>
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
      templateId: "marketplace-research-os-v1",
      sections
    });
  }

  return (
    <section className="grid grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)] gap-5">
      <Panel title="AI Report Generator" icon={FileDown}>
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
          <div className="grid grid-cols-2 gap-2">
            {["PDF", "PowerPoint", "Excel", "CSV", "JSON", "HTML"].map((format) => (
              <div key={format} className="rounded-md border border-white/8 bg-white/5 px-3 py-2 text-sm text-ink-300">
                {format}
              </div>
            ))}
          </div>
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
      <Panel title="Report Workflow Sections" icon={ListChecks}>
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
                  current.map((item) => (item.id === section.id ? { ...item, enabled: !item.enabled } : item))
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
  const health = useQuery({ queryKey: ["health"], queryFn: apiClient.health });
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
          <Field label="Preferred Browser">
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
          <StatusLine label="Marketplace adapters" active />
          <StatusLine label="Local database" active />
          <div className="rounded-md border border-white/8 bg-white/5 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.12em] text-ink-500">
              Application
            </div>
            <div className="mb-3 space-y-1 break-all text-xs leading-5 text-ink-300">
              <div>Product: {health.data?.product ?? "Marketplace Intelligence OS"}</div>
              <div>Version: {health.data?.version ?? "-"}</div>
              <div>Packaged: {platform.data?.isPackaged ? "Yes" : "No"}</div>
            </div>
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

function WorkflowRail({ jobs }: { jobs: DashboardSnapshot["jobs"] }) {
  const latest = jobs[0];
  const activeIndex = latest ? Math.min(workflowStages.length - 1, Math.floor(latest.progress / 10)) : -1;
  return (
    <div className="grid grid-cols-5 gap-3">
      {workflowStages.map((stage, index) => (
        <div
          key={stage}
          className={[
            "rounded-md border p-3",
            index <= activeIndex ? "border-signal-blue/35 bg-signal-blue/10" : "border-white/8 bg-white/5"
          ].join(" ")}
        >
          <div className="mb-2 text-xs text-ink-500">Step {index + 1}</div>
          <div className="text-sm text-white">{stage}</div>
        </div>
      ))}
    </div>
  );
}

function EvidencePlaceholder({
  tab,
  products,
  stores,
  reports
}: {
  tab: Exclude<ProjectTab, "Overview">;
  products: number;
  stores: number;
  reports: number;
}) {
  const copy = {
    Products: `Modern product table with rank, thumbnail, monthly sold, price, rating, reviews, store, official badges, AI score, and visual score. Current product records: ${products}.`,
    Stores: `Store homepage evidence, banners, voucher area, featured products, categories, followers, chat performance, store age, and mall signals. Current store records: ${stores}.`,
    Reviews: "Review sentiment, pain points, positive/negative themes, timestamps, variants, and user media evidence.",
    Media: "Product slides, first-page screenshots, review images, user media, store banners, vouchers, and homepage decoration.",
    "Visual Analysis": "AI scoring for brand consistency, typography, color palette, packaging cues, creative quality, and professional feeling.",
    "Key Stores": "AI-ranked key stores with strengths, weaknesses, trust signals, homepage quality, voucher strategy, and recommendations.",
    Report: `Executive summary, SWOT, market gaps, pricing opportunities, visual trends, packaging trends, and recommendations. Current reports: ${reports}.`,
    Export: "PDF, PowerPoint, Excel, CSV, JSON, and HTML export targets are represented in the export workflow."
  }[tab];
  return (
    <PanelInset title={tab}>
      <div className="text-sm leading-6 text-ink-300">{copy}</div>
    </PanelInset>
  );
}

function StepHeader({ current }: { current: 1 | 2 }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className={["rounded-md border p-3", current === 1 ? "border-signal-blue/35 bg-signal-blue/10" : "border-white/8 bg-white/5"].join(" ")}>
        <div className="text-xs text-ink-500">Step 1</div>
        <div className="text-sm font-medium text-white">Choose Marketplace</div>
      </div>
      <div className={["rounded-md border p-3", current === 2 ? "border-signal-blue/35 bg-signal-blue/10" : "border-white/8 bg-white/5"].join(" ")}>
        <div className="text-xs text-ink-500">Step 2</div>
        <div className="text-sm font-medium text-white">Keyword And Depth</div>
      </div>
    </div>
  );
}

function MarketplaceCard({
  active,
  title,
  subtitle,
  onClick
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "rounded-md border p-4 text-left transition",
        active ? "border-signal-blue/40 bg-signal-blue/10" : "border-white/8 bg-white/5 hover:bg-white/8"
      ].join(" ")}
      onClick={onClick}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-white">{title}</span>
        {active && <CheckCircle2 size={16} className="text-signal-blue" />}
      </div>
      <div className="text-xs leading-5 text-ink-500">{subtitle}</div>
    </button>
  );
}

function estimateResearch(limit: number, depth: ResearchDepth, options: Record<string, boolean>) {
  const depthMultiplier = depth === "Basic" ? 1 : depth === "Normal" ? 1.6 : 2.4;
  const screenshotBase = Math.round(limit * depthMultiplier * (options.userMedia ? 3 : 2));
  return {
    time: `${Math.round((limit * depthMultiplier) / 2)}-${Math.round((limit * depthMultiplier) / 1.2)} min`,
    aiCost: options.aiVisualAnalysis ? "$1-$8" : "$0-$2",
    screenshots: `${screenshotBase}`,
    storage: `${Math.max(1, Math.round(screenshotBase / 40))}-${Math.max(2, Math.round(screenshotBase / 20))} GB`
  };
}

function depthDescription(depth: ResearchDepth): string {
  if (depth === "Basic") {
    return "Fast scan";
  }
  if (depth === "Deep") {
    return "Full evidence";
  }
  return "Balanced";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short" }).format(new Date(value));
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
  children: ReactNode;
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

function PanelInset({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-white/8 bg-white/[0.04] p-4">
      <div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-ink-500">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
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
        "flex min-h-[58px] items-center justify-between gap-3 rounded-md border px-4 text-left text-sm transition",
        checked ? "border-signal-green/35 bg-signal-green/10 text-white" : "border-white/8 bg-white/5 text-ink-500"
      ].join(" ")}
      onClick={() => onChange(!checked)}
    >
      <span>{label}</span>
      <span className={["h-5 w-9 shrink-0 rounded-full p-0.5 transition", checked ? "bg-signal-green" : "bg-ink-700"].join(" ")}>
        <span className={["block h-4 w-4 rounded-full bg-white transition", checked ? "translate-x-4" : "translate-x-0"].join(" ")} />
      </span>
    </button>
  );
}

function Estimate({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/8 bg-white/5 p-3">
      <div className="text-xs uppercase tracking-[0.12em] text-ink-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/8 bg-white/5 p-3">
      <div className="mb-1 text-sm font-medium text-white">{label}</div>
      <div className="text-xs leading-5 text-ink-500">{value}</div>
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

function StatusPill({ status }: { status: string }) {
  return (
    <span className="rounded-full bg-signal-green/15 px-2 py-1 text-xs text-signal-green">
      {status}
    </span>
  );
}

function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-white/8 bg-ink-900/72 p-5 shadow-glow">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <BadgeCheck size={17} className="text-signal-blue" />
        {title}
      </div>
      <div className="text-sm leading-6 text-ink-300">{body}</div>
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
