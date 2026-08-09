import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Bot, ExternalLink, FileText, FolderOpen, KeyRound, RotateCcw, Settings, ShieldCheck, SlidersHorizontal, TerminalSquare } from "lucide-react";
import type { SaveSettingsPayload, SettingsPayload } from "../../shared/contracts.js";
import { apiClient } from "../api/client.js";
import { APP_LANGUAGES, translate } from "../app/languages.js";
import { useUiStore } from "../store/uiStore.js";
import { EmptyState, Field, Panel, StatusLine } from "../components/ui.js";
import { Button, IconButton, Input, SegmentedControl, Select } from "../components/primitives.js";

const APP_DISPLAY_NAME = "Research Product Market";

export function SettingsView() {
  const queryClient = useQueryClient();
  const language = useUiStore((state) => state.language);
  const setAppLanguage = useUiStore((state) => state.setLanguage);
  const settings = useQuery({ queryKey: ["settings"], queryFn: apiClient.settings });
  const platform = useQuery({ queryKey: ["platform"], queryFn: apiClient.platform });
  const health = useQuery({ queryKey: ["health"], queryFn: apiClient.health });
  const browsers = useQuery({ queryKey: ["browsers"], queryFn: apiClient.browsers });
  const [activeSection, setActiveSection] = useState<"general" | "ai">("general");
  type SettingsFormState = SaveSettingsPayload &
    Pick<SettingsPayload, "openAiKeyConfigured" | "geminiKeyConfigured">;
  const [form, setForm] = useState<SettingsFormState | null>(null);
  const value: SettingsFormState | null = form ?? settings.data ?? null;
  const save = useMutation({
    mutationFn: apiClient.saveSettings,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["settings"] })
  });

  if (!value) {
    return <EmptyState label={translate(language, "Loading settings.")} />;
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
      reportFilenameTemplate: value.reportFilenameTemplate,
      reportSectionOrder: value.reportSectionOrder,
      openAiApiKey: value.openAiApiKey,
      geminiApiKey: value.geminiApiKey
    });
  }

  async function chooseFolder(field: "exportFolder" | "screenshotFolder") {
    const selected = await window.marketplaceOS?.platform?.pickFolder();
    if (selected) {
      update({ [field]: selected });
    }
  }

  function resetFolder(field: "exportFolder" | "screenshotFolder") {
    const directory = field === "exportFolder"
      ? platform.data?.directories.reports
      : platform.data?.directories.screenshots;
    if (directory) {
      update({ [field]: directory });
    }
  }

  return (
    <section className="mio-settings-view space-y-5">
      <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-5">
        <nav className="mio-settings-nav h-fit" aria-label="Settings sections">
          <SegmentedControl
            value={activeSection}
            options={[
              { value: "general", label: translate(language, "General"), icon: SlidersHorizontal },
              { value: "ai", label: translate(language, "AI Configuration"), icon: Bot }
            ]}
            onChange={setActiveSection}
            label="Settings sections"
            orientation="vertical"
          />
        </nav>
        <div className="space-y-5">
        {activeSection === "general" ? (
        <>
        <Panel title={translate(language, "Settings")} icon={Settings}>
        <form className="grid grid-cols-2 gap-4" onSubmit={submit}>
          <Field label={translate(language, "Theme")}>
            <Select value={value.theme} onChange={(event) => update({ theme: event.target.value as SaveSettingsPayload["theme"] })}>
              <option value="dark">{translate(language, "Dark")}</option>
              <option value="light">{translate(language, "Light")}</option>
              <option value="system">{translate(language, "System")}</option>
            </Select>
          </Field>
          <Field label={translate(language, "Preferred Browser")}>
            <Select value={value.browser} onChange={(event) => update({ browser: event.target.value as SaveSettingsPayload["browser"] })}>
              {(browsers.data ?? [{ id: "chromium" as const, name: "Bundled Chromium", available: true, profilePath: "" }]).map((browser) => (
                <option key={browser.id} value={browser.id} disabled={!browser.available}>
                  {browser.name}
                  {browser.available ? "" : ` (${translate(language, "not detected")})`}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={translate(language, "Export folder")}>
            <div className="flex gap-2">
              <Input value={value.exportFolder} readOnly className="min-w-0 flex-1" title={value.exportFolder} />
              <IconButton label={translate(language, "Choose report export folder")} className="shrink-0" onClick={() => void chooseFolder("exportFolder")}>
                <FolderOpen size={16} />
              </IconButton>
              <IconButton label={translate(language, "Reset report export folder to default")} className="shrink-0" onClick={() => resetFolder("exportFolder")}>
                <RotateCcw size={16} />
              </IconButton>
            </div>
          </Field>
          <Field label={translate(language, "Screenshot folder")}>
            <div className="flex gap-2">
              <Input value={value.screenshotFolder} readOnly className="min-w-0 flex-1" title={value.screenshotFolder} />
              <IconButton label={translate(language, "Choose screenshot folder")} className="shrink-0" onClick={() => void chooseFolder("screenshotFolder")}>
                <FolderOpen size={16} />
              </IconButton>
              <IconButton label={translate(language, "Reset screenshot folder to default")} className="shrink-0" onClick={() => resetFolder("screenshotFolder")}>
                <RotateCcw size={16} />
              </IconButton>
            </div>
          </Field>
          <Field label={translate(language, "Language")}>
            <Select value={value.language} onChange={(event) => {
              const language = event.target.value as (typeof APP_LANGUAGES)[number]["id"];
              update({ language });
              setAppLanguage(language);
            }}>
              {APP_LANGUAGES.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={translate(language, "Concurrency")}>
            <Input
              type="number"
              min={1}
              max={5}
              value={value.concurrency}
              onChange={(event) => update({ concurrency: Number(event.target.value) })}
            />
          </Field>
          <Field label={translate(language, "Report filename template")}>
            <Input value={value.reportFilenameTemplate} onChange={(event) => update({ reportFilenameTemplate: event.target.value })} />
          </Field>
          <Button variant="primary" className="col-span-2" type="submit" loading={save.isPending}>
            <KeyRound size={16} />
            {translate(language, "Save Settings")}
          </Button>
        </form>
        </Panel>
        <Panel title={translate(language, "Runtime")} icon={TerminalSquare}>
        <div className="space-y-3 text-sm text-ink-300">
          <StatusLine label="OpenAI" active={value.openAiKeyConfigured} />
          <StatusLine label="Gemini" active={value.geminiKeyConfigured} />
          <StatusLine label={translate(language, "Marketplace adapters")} active />
          <StatusLine label={translate(language, "Local database")} active />
          <div className="rounded-md border border-white/8 bg-white/5 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.12em] text-ink-500">{translate(language, "Application")}</div>
            <div className="mb-3 space-y-1 break-all text-xs leading-5 text-ink-300">
              <div>{translate(language, "Product")}: {health.data?.product ?? APP_DISPLAY_NAME}</div>
              <div>{translate(language, "Version")}: {health.data?.version ?? "-"}</div>
              <div>{translate(language, "Packaged")}: {translate(language, platform.data?.isPackaged ? "Yes value" : "No value")}</div>
            </div>
            <div className="mb-2 text-xs uppercase tracking-[0.12em] text-ink-500">
              {platform.data?.os ?? translate(language, "Platform")} {translate(language, "folders")}
            </div>
            <div className="space-y-1 break-all text-xs leading-5 text-ink-300">
              <div>{translate(language, "Data")}: {platform.data?.directories.data ?? "-"}</div>
              <div>{translate(language, "Reports")}: {platform.data?.directories.reports ?? "-"}</div>
              <div>{translate(language, "Browser profiles")}: {platform.data?.directories.browserProfiles ?? "-"}</div>
            </div>
            {platform.data?.directories.appData && (
              <Button variant="secondary" className="mt-3" onClick={() => void apiClient.openPath(platform.data.directories.appData)}>
                <Archive size={16} />
                {translate(language, "Open App Folder")}
              </Button>
            )}
          </div>
        </div>
        </Panel>
        </>
        ) : (
        <>
        <Panel title={translate(language, "AI Configuration")} icon={KeyRound}>
          <form className="grid gap-4 lg:grid-cols-2" onSubmit={submit}>
            <Field label={translate(language, "OpenAI API key")}>
              <Input type="password" onChange={(event) => update({ openAiApiKey: event.target.value })} placeholder={value.openAiKeyConfigured ? translate(language, "Configured") : ""} />
            </Field>
            <Field label={translate(language, "Gemini API key")}>
              <Input type="password" onChange={(event) => update({ geminiApiKey: event.target.value })} placeholder={value.geminiKeyConfigured ? translate(language, "Configured") : ""} />
            </Field>
            <Button variant="primary" className="lg:col-span-2" type="submit" loading={save.isPending}>
              <KeyRound size={16} />
              {translate(language, "Save AI Configuration")}
            </Button>
          </form>
        </Panel>
      <Panel title={translate(language, "AI API Key Setup")} icon={KeyRound}>
        <div className="grid gap-4 lg:grid-cols-2">
          <ApiKeyGuide
            provider="OpenAI"
            configured={value.openAiKeyConfigured}
            steps={[
              "Open the OpenAI API Keys page and sign in.",
              "Select Create new secret key and copy it when it is shown.",
              "Paste it into OpenAI API key above, then save settings."
            ]}
            primaryLabel="Open OpenAI API Keys"
            primaryUrl="https://platform.openai.com/api-keys"
            documentationUrl="https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key"
          />
          <ApiKeyGuide
            provider="Gemini"
            configured={value.geminiKeyConfigured}
            steps={[
              "Open the Gemini API Keys page and sign in with your Google account.",
              "Select Create API key, choose a project, and copy the generated key.",
              "Paste it into Gemini API key above, then save settings."
            ]}
            primaryLabel="Open Gemini API Keys"
            primaryUrl="https://aistudio.google.com/app/apikey"
            documentationUrl="https://ai.google.dev/gemini-api/docs/api-key"
          />
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-signal-amber/10 p-4 text-sm leading-6 text-ink-400">
          <ShieldCheck className="mt-0.5 shrink-0 text-signal-amber" size={18} />
          <span>{translate(language, "API keys are secrets. Keep each key private, do not place it in screenshots or source control, and rotate it immediately if it is exposed.")}</span>
        </div>
      </Panel>
        </>
        )}
        </div>
      </div>
    </section>
  );
}

function ApiKeyGuide({
  provider,
  configured,
  steps,
  primaryLabel,
  primaryUrl,
  documentationUrl
}: {
  provider: string;
  configured: boolean;
  steps: string[];
  primaryLabel: string;
  primaryUrl: string;
  documentationUrl: string;
}) {
  const language = useUiStore((state) => state.language);
  return (
    <article className="rounded-[24px] bg-white/6 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-white">{provider}</div>
          <div className="mt-1 text-xs text-ink-500">{translate(language, "Official provider setup")}</div>
        </div>
        <span className={configured ? "status-pill status-running" : "status-pill status-pending"}>{translate(language, configured ? "Configured" : "Not configured")}</span>
      </div>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm leading-6 text-ink-300">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal-blue/14 text-xs font-semibold text-signal-blue">{index + 1}</span>
            <span>{translate(language, step)}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="primary" className="mio-pill-button" onClick={() => void apiClient.openUrl(primaryUrl)}>
          <ExternalLink size={15} />
          {translate(language, primaryLabel)}
        </Button>
        <Button variant="secondary" className="mio-pill-button" onClick={() => void apiClient.openUrl(documentationUrl)}>
          <FileText size={15} />
          {translate(language, "Official guide")}
        </Button>
      </div>
    </article>
  );
}
