import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CheckCircle2,
  Circle,
  FileArchive,
  FolderOpen,
  Languages,
  ListChecks,
  Search,
  Settings2
} from "lucide-react";
import type { BulkReportFormat, ProjectSummary } from "../../shared/contracts.js";
import type { ReportSectionConfig } from "../../shared/reportSections.js";
import { apiClient } from "../api/client.js";
import { translate, type AppLanguage } from "../app/languages.js";
import { APP_LANGUAGES } from "../app/languages.js";
import type { ThemeMode } from "../components/AppTopBar.js";
import { Button, Checkbox, IconButton, Input } from "../components/primitives.js";
import { EmptyState, LoadingProgressModal, Panel } from "../components/ui.js";

type BulkReportHistoryEntry = {
  id: string;
  zipPath: string;
  fileCount: number;
  projectCount: number;
  formats: BulkReportFormat[];
  generatedAt: string;
};

const BULK_REPORT_HISTORY_KEY = "mio.bulk-report-history.v2";

export function BulkReportWorkspace({
  projects,
  themeMode,
  language,
  outputLanguage,
  onOutputLanguageChange,
  sections,
  defaultExportFolder,
  onEditContent
}: {
  projects: ProjectSummary[];
  themeMode: ThemeMode;
  language: AppLanguage;
  outputLanguage: AppLanguage;
  onOutputLanguageChange: (language: AppLanguage) => void;
  sections: ReportSectionConfig[];
  defaultExportFolder: string;
  onEditContent: () => void;
}) {
  const queryClient = useQueryClient();
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [formats, setFormats] = useState<BulkReportFormat[]>(["PDF"]);
  const [search, setSearch] = useState("");
  const [exportFolder, setExportFolder] = useState(defaultExportFolder);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState<BulkReportHistoryEntry[]>(() => {
    try {
      const value = window.localStorage.getItem(BULK_REPORT_HISTORY_KEY);
      return value ? JSON.parse(value) as BulkReportHistoryEntry[] : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!exportFolder && defaultExportFolder) {
      setExportFolder(defaultExportFolder);
    }
  }, [defaultExportFolder, exportFolder]);

  const visibleProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? projects.filter((project) =>
          [project.name, project.keyword, project.productCategory]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        )
      : projects;
  }, [projects, search]);

  const generateBulk = useMutation({
    mutationFn: apiClient.generateBulkReports,
    onMutate: () => setProgress(5),
    onSuccess: (result) => {
      setProgress(100);
      const entry: BulkReportHistoryEntry = {
        id: String(Date.now()) + "-" + result.zipPath,
        zipPath: result.zipPath,
        fileCount: result.fileCount,
        projectCount: projectIds.length,
        formats,
        generatedAt: new Date().toISOString()
      };
      setHistory((current) => {
        const next = [entry, ...current].slice(0, 30);
        window.localStorage.setItem(BULK_REPORT_HISTORY_KEY, JSON.stringify(next));
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => setProgress(0)
  });

  useEffect(() => {
    if (!generateBulk.isPending) return;
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(94, current + (current < 50 ? 6 : current < 80 ? 3 : 1)));
    }, 500);
    return () => window.clearInterval(timer);
  }, [generateBulk.isPending]);

  function toggleProject(projectId: string) {
    setProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId]
    );
  }

  function toggleFormat(format: BulkReportFormat) {
    setFormats((current) =>
      current.includes(format)
        ? current.filter((item) => item !== format)
        : [...current, format]
    );
  }

  async function chooseFolder() {
    const selected = await window.marketplaceOS?.platform?.pickFolder();
    if (selected) setExportFolder(selected);
  }

  function generate() {
    if (projectIds.length === 0 || formats.length === 0 || !exportFolder) return;
    generateBulk.mutate({
      category: "selected-projects",
      projectIds,
      formats,
      templateId: "marketplace-research-os-v1",
      sections,
      theme: themeMode,
      language: outputLanguage,
      exportFolder
    });
  }

  const enabledCount = sections.filter((section) => section.enabled).length;
  const canGenerate = projectIds.length > 0 && formats.length > 0 && Boolean(exportFolder);

  return (
    <div className="mio-bulk-report-workspace grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
      <LoadingProgressModal
        open={generateBulk.isPending}
        title={translate(language, "Generating Report")}
        label={`${translate(language, "Rendering report and export files")} · ${projectIds.length}`}
        progress={progress}
        detail={formats.join(", ")}
      />
      <Panel title={"1. " + translate(language, "Select projects")} icon={Search}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={translate(language, "Search projects")}
            className="min-w-[220px] flex-1"
          />
          <Button variant="secondary" size="sm" onClick={() => setProjectIds(visibleProjects.map((project) => project.id))}>
            {translate(language, "Select all")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setProjectIds([])}>
            {translate(language, "Clear all")}
          </Button>
        </div>
        <div className="mio-bulk-project-list max-h-[500px] space-y-2 overflow-auto pr-1">
          {visibleProjects.map((project) => {
            const selected = projectIds.includes(project.id);
            return (
              <Checkbox
                key={project.id}
                checked={selected}
                onChange={() => toggleProject(project.id)}
                className="mio-bulk-project-row"
                label={<span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--mio-text-primary)]">{project.name}</span>
                  <span className="mt-1 block truncate text-xs text-[var(--mio-text-muted)]">
                    {project.keyword} · {project.productCategory || translate(language, "Uncategorized")}
                  </span>
                </span>}
              />
            );
          })}
          {visibleProjects.length === 0 ? <EmptyState label={translate(language, "No matching projects.")} /> : null}
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel title={"2. " + translate(language, "File types")} icon={FileArchive}>
          <div className="mio-report-format-grid">
            {(["DOCX", "PDF", "HTML"] as BulkReportFormat[]).map((format) => {
              const selected = formats.includes(format);
              return (
                <button
                  key={format}
                  type="button"
                  className="mio-report-format-option"
                  aria-pressed={selected}
                  onClick={() => toggleFormat(format)}
                >
                  <span>{format}</span>
                  {selected ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title={"3. " + translate(language, "Report language")} icon={Languages}>
          <select
            className="input w-full"
            value={outputLanguage}
            onChange={(event) => onOutputLanguageChange(event.target.value as AppLanguage)}
          >
            {APP_LANGUAGES.map((option) => (
              <option key={option.id} value={option.id}>{option.nativeLabel}</option>
            ))}
          </select>
        </Panel>

        <Panel title={"4. " + translate(language, "Where to save")} icon={FolderOpen}>
          <div className="flex min-w-0 gap-2">
            <Input className="min-w-0 flex-1" value={exportFolder} readOnly title={exportFolder} />
            <IconButton label={translate(language, "Choose folder")} onClick={() => void chooseFolder()}>
              <FolderOpen size={16} />
            </IconButton>
          </div>
        </Panel>

        <Panel title={translate(language, "Report content settings")} icon={ListChecks}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-[var(--mio-text-primary)]">
                {enabledCount} / {sections.length} {translate(language, "sections enabled")}
              </div>
              <div className="mt-1 text-xs text-[var(--mio-text-muted)]">
                {translate(language, "Use saved content settings")}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={onEditContent}>
              <Settings2 size={15} />
              {translate(language, "Edit")}
            </Button>
          </div>
        </Panel>

        {!generateBulk.isPending && progress > 0 ? (
          <div className="mio-report-progress">
            <div className="flex items-center justify-between text-xs">
              <span>{generateBulk.isPending ? translate(language, "Generating Report") + " · " + projectIds.length : translate(language, "Bulk report ready")}</span>
              <strong>{progress}%</strong>
            </div>
            <div className="mio-report-progress-track"><span style={{ width: String(progress) + "%" }} /></div>
          </div>
        ) : null}

        <Button variant="primary" className="w-full" loading={generateBulk.isPending} disabled={!canGenerate} onClick={generate}>
          <Archive size={16} />
          {translate(language, "Generate Bulk Reports")}
        </Button>
        {generateBulk.error ? <div className="mio-inline-error">{generateBulk.error.message}</div> : null}
      </div>

      <Panel title={translate(language, "Bulk report history")} icon={Archive} className="xl:col-span-2">
        <div className="space-y-2">
          {history.map((entry) => (
            <div key={entry.id} className="mio-generated-report-row">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--mio-text-primary)]">
                  {entry.projectCount} projects
                </div>
                <div className="mt-1 text-xs text-[var(--mio-text-muted)]">
                  {new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.generatedAt))}
                  {" · "}{entry.formats.join(", ")}{" · "}{entry.fileCount} files
                </div>
              </div>
              <IconButton label={translate(language, "Locate")} onClick={() => void apiClient.revealPath(entry.zipPath)}>
                <FolderOpen size={15} />
              </IconButton>
              <Button variant="secondary" size="sm" onClick={() => void apiClient.openPath(entry.zipPath)}>
                {translate(language, "Open")}
              </Button>
            </div>
          ))}
          {history.length === 0 ? <EmptyState label={translate(language, "No bulk reports generated yet.")} /> : null}
        </div>
      </Panel>
    </div>
  );
}
