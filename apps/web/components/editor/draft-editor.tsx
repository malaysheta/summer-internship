"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Edit3, Eye } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { useDraftStore } from "../../hooks/use-draft-store";
import { formatNodeIdToBreadcrumb } from "@/lib/citation-utils";
import {
  parseMarkdownToSections,
  serializeSectionsToMarkdown,
  fetchTemplate,
  SectionData,
  DocumentTemplate,
} from "@/lib/document-templates";
import { DraftSection } from "./draft-section";
import { LegalMarkdownView } from "./legal-markdown-view";
import type { DocumentType } from "@trionic/shared";
import { useTranslations } from "next-intl";

interface DraftEditorProps {
  value: string;
  onChange: (value: string) => void;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
  className?: string;
  docType?: DocumentType;
  /** Draft language — template section top-up only applies to English drafts. */
  language?: string;
}

function CitationBadge({ nodeId, index }: { nodeId: string; index: number }) {
  const [hovered, setHovered] = useState(false);
  const [nodeText, setNodeText] = useState<{ title: string; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  
  const activeCitationNodeId = useDraftStore((state) => state.activeCitationNodeId);
  const setActiveCitationNodeId = useDraftStore((state) => state.setActiveCitationNodeId);
  const toggleCitationDrawer = useDraftStore((state) => state.toggleCitationDrawer);
  const isCitationDrawerOpen = useDraftStore((state) => state.isCitationDrawerOpen);
  const t = useTranslations("draft");

  const handleMouseEnter = async () => {
    setHovered(true);
    if (nodeText || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pageindex/node/${encodeURIComponent(nodeId)}`);
      if (res.ok) {
        const data = await res.json();
        setNodeText({
          title: data.title || formatNodeIdToBreadcrumb(nodeId),
          text: data.text || t("legalTextNotFound")
        });
      } else {
        setNodeText({
          title: formatNodeIdToBreadcrumb(nodeId),
          text: t("failedToFetchNode")
        });
      }
    } catch {
      setNodeText({
        title: formatNodeIdToBreadcrumb(nodeId),
        text: t("errorConnecting")
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    setActiveCitationNodeId(nodeId);
    if (!isCitationDrawerOpen) {
      toggleCitationDrawer();
    }
    
    // Smooth scroll the drawer card into view
    setTimeout(() => {
      const tileElement = document.getElementById(`node-tile-${nodeId}`);
      if (tileElement) {
        tileElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
        
        // Temporary ring glow
        tileElement.classList.add("outline", "outline-1", "outline-brand", "bg-accent");
        setTimeout(() => {
          tileElement.classList.remove("outline", "outline-1", "outline-brand", "bg-accent");
        }, 1500);
      }
    }, 150);
  };

  const isActive = activeCitationNodeId === nodeId;

  return (
    <button
      id={`citation-marker-${index + 1}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative mx-0.5 inline-flex size-[18px] cursor-pointer items-center justify-center border p-0 align-super font-mono text-[10px] leading-none transition-colors duration-[180ms] select-none",
        isActive
          ? "border-teal bg-teal text-white"
          : "border-teal/40 text-teal hover:border-teal hover:bg-teal hover:text-white"
      )}
    >
      {index + 1}
      {hovered && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2.5 w-72 -translate-x-1/2 animate-in border border-white/15 bg-black p-4 text-left font-sans text-xs leading-relaxed font-normal text-white shadow-[0_32px_64px_rgba(0,0,0,0.55)] duration-100 fade-in zoom-in-95">
          <span className="mb-2 block border-b border-white/15 pb-2 font-serif text-[15px] text-white">
            {loading ? t("loading") : nodeText?.title}
          </span>
          <span className="block max-h-32 overflow-y-auto text-[12px] text-white/70">
            {loading ? t("fetchingNode") : nodeText?.text}
          </span>
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-black" />
        </span>
      )}
    </button>
  );
}

export function DraftEditor({
  value,
  onChange,
  isSaving = false,
  lastSavedAt,
  className,
  docType,
  language,
}: DraftEditorProps) {
  const t = useTranslations("draft");
  const [sections, setSections] = useState<SectionData[]>([]);
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const citations = useDraftStore((state) => state.citations);
  const [activeId, setActiveId] = useState<string | null>(null);

  // `value` arrives from the draft store a tick AFTER mount, and later from
  // iterate/translate. Sections used to be parsed once (from the empty first
  // render) and that empty skeleton was then pushed back up via onChange,
  // replacing the real draft. Now:
  //   - parse whenever `value` changes from OUTSIDE this editor;
  //   - only emit onChange after a real local edit (text differs from the
  //     serialized form of what we last parsed).
  const valueRef = useRef(value);
  valueRef.current = value;
  const parsedFromRef = useRef<string | null>(null); // upstream text the sections came from
  const baselineRef = useRef<string>("");            // serialize(parsed sections) — "no local edits"
  const lastEmittedRef = useRef<string | null>(null);

  const loadSections = (text: string, tpl: DocumentTemplate) => {
    const parsed = parseMarkdownToSections(text, tpl, (language ?? "en") === "en");
    parsedFromRef.current = text;
    baselineRef.current = serializeSectionsToMarkdown(parsed);
    setSections(parsed);
  };

  // Initialize template (re-run only when docType changes)
  useEffect(() => {
    let active = true;
    async function loadTemplate() {
      if (!docType) return;
      const tpl = await fetchTemplate(docType);
      if (active) {
        setTemplate(tpl);
        loadSections(valueRef.current, tpl);
      }
    }
    loadTemplate();
    return () => { active = false; };
  }, [docType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Upstream content changed (initial load, iterate, translate) → re-parse.
  useEffect(() => {
    if (!template) return;
    if (value === parsedFromRef.current || value === lastEmittedRef.current) return;
    loadSections(value, template);
  }, [value, template]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push local edits upstream + keep the citation drawer in sync
  useEffect(() => {
    const handler = setTimeout(() => {
      const fullText = serializeSectionsToMarkdown(sections);
      const edited = fullText !== baselineRef.current;
      const textForCitations = edited ? fullText : (parsedFromRef.current ?? value);

      if (edited && fullText !== value) {
        lastEmittedRef.current = fullText;
        onChange(fullText);
      }

      const matches = Array.from(textForCitations.matchAll(/\[CITE:([^\]]+)\]/g));
      const dynamicCitations = matches.map((match) => ({
        node_id: match[1],
        snapshot_id: "2026-05-28",
        span: [match.index!, match.index! + match[0].length] as [number, number]
      }));

      useDraftStore.setState({ citations: dynamicCitations });
    }, 500);

    return () => clearTimeout(handler);
  }, [sections, onChange, value]);

  const handleSectionChange = (id: string, newContent: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, content: newContent } : s))
    );
  };

  const handleRemoveSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddSection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const title = e.target.value;
    if (!title) return;
    
    setSections((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title, content: "", required: false },
    ]);
    // Reset select
    e.target.value = "";
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const availableSectionsToAdd = useMemo(() => {
    if (!template) return [];
    return template.allowedSections.filter(
      (as) => !sections.some((s) => s.title.toLowerCase() === as.title.toLowerCase())
    );
  }, [template, sections]);

  // Preview: shared legal markdown renderer (same tokens as PDF/DOCX export)
  const renderCite = (nodeId: string, key: string) => {
    const citationIdx = citations.findIndex((c) => c.node_id === nodeId);
    return <CitationBadge key={key} nodeId={nodeId} index={citationIdx !== -1 ? citationIdx : 0} />;
  };

  return (
    <div className={cn("flex h-full w-full flex-col overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-2.5 md:px-8">
        <div className="flex border border-border" role="tablist">
          {(["preview", "edit"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "label-caps flex cursor-pointer items-center gap-2 px-3.5 py-2 text-[10px] transition-colors duration-[180ms]",
                mode === m ? "bg-accent text-foreground shadow-[inset_0_-2px_0_var(--brand)]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "preview" ? <Eye strokeWidth={1.25} className="size-3.5" /> : <Edit3 strokeWidth={1.25} className="size-3.5" />}
              {t(m)}
            </button>
          ))}
        </div>

        <span className="label-caps text-[10px] text-subtle-foreground" aria-live="polite">
          {isSaving
            ? t("saving")
            : lastSavedAt
            ? t("savedAt", { time: lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })
            : t("ready")}
        </span>
      </div>

      {/* Desk: the document is a paper page on the dark canvas */}
      <div className="relative flex-1 overflow-y-auto bg-card px-4 py-8 md:px-8 md:py-12">
        <div className="paper mx-auto max-w-[820px] border border-border bg-background shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
          {mode === "edit" ? (
            <div className="space-y-6 px-6 py-10 md:px-14 md:py-14">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {sections.map((section) => (
                      <DraftSection
                        key={section.id}
                        section={section}
                        onChange={handleSectionChange}
                        onRemove={handleRemoveSection}
                        isActive={activeId === section.id}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {availableSectionsToAdd.length > 0 && (
                <div className="border-t border-dashed border-border pt-5">
                  <select
                    className="label-caps h-9 cursor-pointer border border-border bg-transparent px-3 text-[10px] text-muted-foreground outline-none hover:border-foreground/40 hover:text-foreground"
                    onChange={handleAddSection}
                    defaultValue=""
                  >
                    <option value="" disabled>+ Add Section</option>
                    {availableSectionsToAdd.map((sec) => (
                      <option key={sec.id} value={sec.title}>{sec.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-in px-6 py-10 duration-200 select-text fade-in md:px-16 md:py-16">
              <LegalMarkdownView markdown={serializeSectionsToMarkdown(sections)} renderCite={renderCite} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
