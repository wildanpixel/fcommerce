import { Fragment, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  Circle,
  FileText,
  GripVertical,
  LockKeyhole,
  Pencil,
  Save,
  Sparkles
} from "lucide-react";
import {
  REPORT_SECTION_GROUPS,
  type ReportSectionConfig,
  type ReportSectionGroupId,
  type ReportSectionId
} from "../../shared/reportSections.js";
import { reportText } from "../../shared/reportLocalization.js";
import { translate, type AppLanguage } from "../app/languages.js";
import { Button } from "../components/primitives.js";

export function ReportContentSettingsPage({
  language,
  previewLanguage,
  sections,
  projectName,
  aiConfigured,
  saving,
  onBack,
  onSave
}: {
  language: AppLanguage;
  previewLanguage: AppLanguage;
  sections: ReportSectionConfig[];
  projectName?: string;
  aiConfigured: boolean;
  saving: boolean;
  onBack: () => void;
  onSave: (sections: ReportSectionConfig[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => applyIntelligenceAvailability(sections, aiConfigured));
  const [draggedGroupId, setDraggedGroupId] = useState<ReportSectionGroupId | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<ReportSectionId | null>(null);
  const [groupDropIndex, setGroupDropIndex] = useState<number | null>(null);
  const [sectionDropTarget, setSectionDropTarget] = useState<{ groupId: ReportSectionGroupId; index: number } | null>(null);

  useEffect(() => {
    if (!editing) setDraft(applyIntelligenceAvailability(sections, aiConfigured));
  }, [aiConfigured, editing, sections]);

  function toggle(sectionId: ReportSectionConfig["id"]) {
    if (!editing || (sectionId === "intelligence" && !aiConfigured)) return;
    setDraft((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, enabled: !section.enabled } : section
      )
    );
  }

  function moveGroup(dropIndex: number) {
    if (!editing || !draggedGroupId) return;
    setDraft((current) => reorderReportGroup(current, draggedGroupId, dropIndex));
    setDraggedGroupId(null);
    setGroupDropIndex(null);
  }

  function moveSection(groupId: ReportSectionGroupId, dropIndex: number) {
    if (!editing || !draggedSectionId) return;
    setDraft((current) => reorderReportSubsection(current, groupId, draggedSectionId, dropIndex));
    setDraggedSectionId(null);
    setSectionDropTarget(null);
  }

  function cancel() {
    setDraft(applyIntelligenceAvailability(sections, aiConfigured));
    setEditing(false);
  }

  function save() {
    onSave(applyIntelligenceAvailability(draft, aiConfigured));
    setEditing(false);
  }

  const enabledSections = draft.filter((section) => section.enabled);
  const groupOrder = orderedReportGroups(draft);

  return (
    <section className="mio-report-content-page space-y-5">
      <div className="mio-page-heading">
        <div>
          <nav className="mio-inline-breadcrumbs" aria-label="Breadcrumb">
            <button type="button" onClick={onBack}>{translate(language, "Reports")}</button>
            <span>/</span>
            <span>{translate(language, "Choose Report Content")}</span>
          </nav>
          <h2>{translate(language, "Choose Report Content")}</h2>
          <p>{translate(language, "Configure the evidence sections used by single and bulk reports.")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBack}>
            <ChevronLeft size={15} />
            {translate(language, "Back")}
          </Button>
        </div>
      </div>

      <div className="mio-report-content-split">
        <aside className="mio-report-content-settings-pane">
          <div className="mio-report-content-pane-heading">
            <div>
              <div className="text-sm font-semibold">{translate(language, "Report structure")}</div>
              <div className="mt-1 text-xs text-[var(--mio-text-muted)]">
                {translate(language, "Drag sections to reorder the generated document.")}
              </div>
            </div>
            <div className="mio-report-structure-actions">
              <span>{enabledSections.length}/{draft.length}</span>
              {editing ? (
                <>
                  <Button variant="ghost" onClick={cancel}>{translate(language, "Cancel")}</Button>
                  <Button variant="primary" loading={saving} onClick={save}>
                    <Save size={15} />
                    {translate(language, "Save")}
                  </Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil size={15} />
                  {translate(language, "Edit")}
                </Button>
              )}
            </div>
          </div>

          <div className="mio-report-section-order" aria-label={translate(language, "Report structure")}>
            {groupOrder.map((groupId, groupIndex) => {
              const group = REPORT_SECTION_GROUPS.find((item) => item.id === groupId);
              if (!group) return null;
              const children = draft.filter((section) => group.sectionIds.some((sectionId) => sectionId === section.id));
              const intelligenceLocked = group.id === "intelligence" && !aiConfigured;
              return (
                <Fragment key={group.id}>
                <div
                  className={["mio-report-drop-zone", draggedGroupId && groupDropIndex === groupIndex ? "mio-report-drop-zone-active" : ""].join(" ")}
                  aria-hidden="true"
                  onDragOver={(event) => {
                    if (!editing || !draggedGroupId) return;
                    event.preventDefault();
                    setGroupDropIndex(groupIndex);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    moveGroup(groupIndex);
                  }}
                />
                <section
                  className={["mio-report-group-row", intelligenceLocked ? "mio-report-section-row-locked" : ""].join(" ")}
                  draggable={editing && !intelligenceLocked}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", group.id);
                    setDraggedGroupId(group.id);
                  }}
                  onDragEnd={() => {
                    setDraggedGroupId(null);
                    setGroupDropIndex(null);
                  }}
                >
                  <header className="mio-report-group-heading">
                    <span className="mio-report-section-position">{String(groupIndex + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 text-sm font-semibold">{reportText(language, group.title)}</span>
                    <span className="text-[10px] text-[var(--mio-text-muted)]">{children.filter((section) => section.enabled).length}/{children.length}</span>
                    <GripVertical size={16} />
                  </header>
                  <div className="mio-report-subsection-order">
                    {children.map((section, sectionIndex) => (
                      <Fragment key={section.id}>
                      <div
                        className={["mio-report-drop-zone mio-report-subsection-drop-zone", draggedSectionId && sectionDropTarget?.groupId === group.id && sectionDropTarget.index === sectionIndex ? "mio-report-drop-zone-active" : ""].join(" ")}
                        aria-hidden="true"
                        onDragOver={(event) => {
                          if (!editing || !draggedSectionId) return;
                          event.preventDefault();
                          event.stopPropagation();
                          setSectionDropTarget({ groupId: group.id, index: sectionIndex });
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          moveSection(group.id, sectionIndex);
                        }}
                      />
                      <div
                        className="mio-report-section-row"
                        draggable={editing && !intelligenceLocked && children.length > 1}
                        onDragStart={(event) => {
                          event.stopPropagation();
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", section.id);
                          setDraggedSectionId(section.id);
                        }}
                        onDragEnd={(event) => {
                          event.stopPropagation();
                          setDraggedSectionId(null);
                          setSectionDropTarget(null);
                        }}
                      >
                        <button
                          type="button"
                          className="mio-report-section-toggle"
                          aria-pressed={section.enabled}
                          disabled={!editing || intelligenceLocked}
                          onClick={() => toggle(section.id)}
                        >
                          <span className="mio-report-section-position">{String(sectionIndex + 1).padStart(2, "0")}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{reportText(language, childReportLabel(section))}</span>
                          {intelligenceLocked ? <LockKeyhole size={15} /> : section.enabled ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                        </button>
                        <span className="mio-report-section-grip" aria-hidden="true"><GripVertical size={16} /></span>
                      </div>
                      </Fragment>
                    ))}
                    <div
                      className={["mio-report-drop-zone mio-report-subsection-drop-zone", draggedSectionId && sectionDropTarget?.groupId === group.id && sectionDropTarget.index === children.length ? "mio-report-drop-zone-active" : ""].join(" ")}
                      aria-hidden="true"
                      onDragOver={(event) => {
                        if (!editing || !draggedSectionId) return;
                        event.preventDefault();
                        event.stopPropagation();
                        setSectionDropTarget({ groupId: group.id, index: children.length });
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        moveSection(group.id, children.length);
                      }}
                    />
                  </div>
                  {intelligenceLocked ? (
                    <div className="mio-report-intelligence-note">
                      {translate(language, "Configure OpenAI, Gemini, or Claude to enable specialist intelligence recommendations.")}
                    </div>
                  ) : null}
                </section>
                {groupIndex === groupOrder.length - 1 ? (
                  <div
                    className={["mio-report-drop-zone", draggedGroupId && groupDropIndex === groupOrder.length ? "mio-report-drop-zone-active" : ""].join(" ")}
                    aria-hidden="true"
                    onDragOver={(event) => {
                      if (!editing || !draggedGroupId) return;
                      event.preventDefault();
                      setGroupDropIndex(groupOrder.length);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      moveGroup(groupOrder.length);
                    }}
                  />
                ) : null}
                </Fragment>
              );
            })}
          </div>
        </aside>

        <div className="mio-report-docx-preview" aria-label={translate(language, "DOCX preview")}>
          <div className="mio-report-content-pane-heading">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold"><FileText size={15} /> {translate(language, "DOCX preview")}</div>
              <div className="mt-1 text-xs text-[var(--mio-text-muted)]">{reportText(previewLanguage, "Marketplace Research Report")}</div>
            </div>
            <span>{enabledSections.length} {translate(language, "sections enabled")}</span>
          </div>
          <article className="mio-docx-preview-page">
            <header>
              <div className="mio-docx-preview-brand">Research Product Market</div>
              <h3>{reportText(previewLanguage, "Marketplace Research Report")}</h3>
              <p>{projectName || translate(language, "Select a project")}</p>
            </header>
            <div className="mio-docx-preview-divider" />
            {orderedReportGroups(enabledSections).map((groupId, groupIndex) => {
              const group = REPORT_SECTION_GROUPS.find((item) => item.id === groupId);
              if (!group) return null;
              const children = enabledSections.filter((section) => group.sectionIds.some((sectionId) => sectionId === section.id));
              const intelligenceSection = children.find((section) => section.id === "intelligence");
              return (
              <section key={group.id} className="mio-docx-preview-section">
                <div className="mio-docx-preview-section-number">{String(groupIndex + 1).padStart(2, "0")}</div>
                <div className="min-w-0 flex-1">
                  <h4>{reportText(previewLanguage, group.title)}</h4>
                  {intelligenceSection ? (
                    <div className="mio-docx-preview-intelligence">
                      <p><Sparkles size={13} /> {reportText(previewLanguage, "Keyword Search Analysis & Top 10 Competition Matrix")}</p>
                      <div className="mio-docx-preview-matrix" aria-hidden="true">
                        <div className="mio-docx-preview-matrix-head">
                          <span>{reportText(previewLanguage, "Product Name")}</span>
                          <span>{reportText(previewLanguage, "Price Range")}</span>
                          <span>{reportText(previewLanguage, "USP/Key Claim")}</span>
                          <span>{reportText(previewLanguage, "Rating")}</span>
                          <span>{reportText(previewLanguage, "Short Description")}</span>
                        </div>
                        {[0, 1, 2].map((row) => (
                          <div key={row} className="mio-docx-preview-matrix-row">
                            <span /><span /><span /><span /><span />
                          </div>
                        ))}
                      </div>
                      <div className="mio-docx-preview-insights">
                        <strong>{reportText(previewLanguage, "Synthesized Category Insights")}</strong>
                        {[
                          "PRICING ARCHITECTURE & TIERING",
                          "COMPETITIVE POSITIONING & KEY CLAIMS",
                          "CUSTOMER TRUST & RATING SIGNALS",
                          "DEMAND CONCENTRATION & PRODUCT MOMENTUM",
                          "CATEGORY OPPORTUNITIES & RECOMMENDED ACTIONS"
                        ].map((title, insightIndex) => (
                          <span key={title}><b>{insightIndex + 1}.</b> {reportText(previewLanguage, title)}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mio-docx-preview-subsections">
                      {children.map((section) => (
                        <div key={section.id}>
                          <strong>{reportText(previewLanguage, childReportLabel(section))}</strong>
                          <div className="mio-docx-preview-lines"><span /><span /><span /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );})}
            {enabledSections.length === 0 ? <p className="mio-docx-preview-empty">{translate(language, "No report sections selected.")}</p> : null}
          </article>
        </div>
      </div>
    </section>
  );
}

function applyIntelligenceAvailability(sections: ReportSectionConfig[], aiConfigured: boolean): ReportSectionConfig[] {
  return sections.map((section) =>
    section.id === "intelligence" && !aiConfigured ? { ...section, enabled: false } : section
  );
}

function orderedReportGroups(sections: ReportSectionConfig[]): ReportSectionGroupId[] {
  const positions = new Map(sections.map((section, index) => [section.id, index]));
  return [...REPORT_SECTION_GROUPS]
    .filter((group) => group.sectionIds.some((sectionId) => positions.has(sectionId)))
    .sort((left, right) => {
      const leftPosition = Math.min(...left.sectionIds.map((sectionId) => positions.get(sectionId) ?? Number.MAX_SAFE_INTEGER));
      const rightPosition = Math.min(...right.sectionIds.map((sectionId) => positions.get(sectionId) ?? Number.MAX_SAFE_INTEGER));
      return leftPosition - rightPosition;
    })
    .map((group) => group.id);
}

function reorderReportGroup(
  sections: ReportSectionConfig[],
  sourceGroupId: ReportSectionGroupId,
  dropIndex: number
): ReportSectionConfig[] {
  const groupOrder = orderedReportGroups(sections);
  const sourceIndex = groupOrder.indexOf(sourceGroupId);
  if (sourceIndex < 0) return sections;
  const nextGroupOrder = [...groupOrder];
  const [moved] = nextGroupOrder.splice(sourceIndex, 1);
  const adjustedDropIndex = sourceIndex < dropIndex ? dropIndex - 1 : dropIndex;
  nextGroupOrder.splice(Math.max(0, Math.min(adjustedDropIndex, nextGroupOrder.length)), 0, moved);
  const groupedIds = new Set<ReportSectionId>(REPORT_SECTION_GROUPS.flatMap((group) => [...group.sectionIds]));
  const ordered = nextGroupOrder.flatMap((groupId) => {
    const group = REPORT_SECTION_GROUPS.find((item) => item.id === groupId);
    return group
      ? sections.filter((section) => group.sectionIds.some((sectionId) => sectionId === section.id))
      : [];
  });
  return [...ordered, ...sections.filter((section) => !groupedIds.has(section.id))];
}

function reorderReportSubsection(
  sections: ReportSectionConfig[],
  groupId: ReportSectionGroupId,
  sourceSectionId: ReportSectionId,
  dropIndex: number
): ReportSectionConfig[] {
  const group = REPORT_SECTION_GROUPS.find((item) => item.id === groupId);
  if (!group || !group.sectionIds.some((id) => id === sourceSectionId)) {
    return sections;
  }
  const children = sections.filter((section) => group.sectionIds.some((id) => id === section.id));
  const sourceIndex = children.findIndex((section) => section.id === sourceSectionId);
  if (sourceIndex < 0) return sections;
  const reordered = [...children];
  const [moved] = reordered.splice(sourceIndex, 1);
  const adjustedDropIndex = sourceIndex < dropIndex ? dropIndex - 1 : dropIndex;
  reordered.splice(Math.max(0, Math.min(adjustedDropIndex, reordered.length)), 0, moved);
  let childIndex = 0;
  return sections.map((section) => group.sectionIds.some((id) => id === section.id) ? reordered[childIndex++] : section);
}

function childReportLabel(section: ReportSectionConfig): string {
  return section.label
    .replace(/^Product Detail\s*-\s*/iu, "")
    .replace(/^Key Store\s*-\s*/iu, "")
    .replace(/^Key Products?$/iu, "Key Product list");
}
