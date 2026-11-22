"use client";

import * as React from "react";
import { X, Info, Bookmark } from "lucide-react";
import { Spark } from "@/components/brand";
import { useDraftStore } from "../../hooks/use-draft-store";
import { parseNodeId, formatNodeIdToBreadcrumb, getHumanBreadcrumb } from "@/lib/citation-utils";
import type { Citation } from "@trionic/shared";
import { useTranslations } from "next-intl";

interface TreeNode {
  id: string;
  label: string;
  level: number;
  children: TreeNode[];
  citationIndex?: number;
  citation?: Citation;
}

export function CitationDrawer() {
  const citations = useDraftStore((state) => state.citations);
  const content = useDraftStore((state) => state.content);
  const activeCitationNodeId = useDraftStore((state) => state.activeCitationNodeId);
  const setActiveCitationNodeId = useDraftStore((state) => state.setActiveCitationNodeId);
  const toggleCitationDrawer = useDraftStore((state) => state.toggleCitationDrawer);

  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [activeTileId, setActiveTileId] = React.useState<string | null>(null);
  const [hoveredTooltipNodeId, setHoveredTooltipNodeId] = React.useState<string | null>(null);

  // Cache for dynamic legal texts fetched from PageIndex
  const [nodeTexts, setNodeTexts] = React.useState<Record<string, any>>({});
  const [loadingNodes, setLoadingNodes] = React.useState<Record<string, boolean>>({});

  const t = useTranslations("draft");
  // Fetch page index text for a given node id
  const fetchNodeText = async (nodeId: string) => {
    if (nodeTexts[nodeId] || loadingNodes[nodeId]) return;
    setLoadingNodes(prev => ({ ...prev, [nodeId]: true }));
    try {
      const res = await fetch(`/api/pageindex/node/${encodeURIComponent(nodeId)}`);
      if (res.ok) {
        const data = await res.json();
        setNodeTexts(prev => ({
          ...prev,
          [nodeId]: {
            title: data.title || formatNodeIdToBreadcrumb(nodeId),
            text: data.text || t("legalTextNotFound"),
            act_name: data.act_name,
            number: data.number,
            snapshot_id: data.snapshot_id
          }
        }));
      } else {
        setNodeTexts(prev => ({
          ...prev,
          [nodeId]: {
            title: formatNodeIdToBreadcrumb(nodeId),
            text: t("failedToFetchNode")
          }
        }));
      }
    } catch (err) {
      console.error("[CitationDrawer] Fetch error:", err);
      setNodeTexts(prev => ({
        ...prev,
        [nodeId]: {
          title: formatNodeIdToBreadcrumb(nodeId),
          text: t("errorConnecting")
        }
      }));
    } finally {
      setLoadingNodes(prev => ({ ...prev, [nodeId]: false }));
    }
  };

  // Prefetch metadata for all citations in the draft
  React.useEffect(() => {
    citations.forEach(citation => {
      fetchNodeText(citation.node_id);
    });
  }, [citations]);

  // Build the hierarchical tree path dynamically from citation node IDs, grouped by Act
  const treeNodes = React.useMemo(() => {
    const rootNodes: TreeNode[] = [];

    citations.forEach((citation, idx) => {
      const parts = citation.node_id.split('/');
      const actCode = parts[0]?.split('-')[0] || parts[0];
      const meta = nodeTexts[citation.node_id];
      const parsed = parseNodeId(citation.node_id);

      // Level 0: Act Node
      let actNode = rootNodes.find(n => n.id === actCode);
      if (!actNode) {
        actNode = {
          id: actCode,
          label: meta?.act_name || parsed.actName || actCode,
          level: 0,
          children: []
        };
        rootNodes.push(actNode);
      } else if (meta?.act_name && actNode.label === actCode) {
        actNode.label = meta.act_name;
      }

      if (parts.length >= 3) {
        // Has Chapter and Section: Act -> Chapter -> Section -> Detail
        const chapterId = `${parts[0]}/${parts[1]}`;
        let chapterNode = actNode.children.find(n => n.id === chapterId);
        if (!chapterNode) {
          chapterNode = {
            id: chapterId,
            label: parsed.chapterName || "General",
            level: 1,
            children: []
          };
          actNode.children.push(chapterNode);
        }

        const sectionId = `${parts[0]}/${parts[1]}/${parts[2]}`;
        let sectionNode = chapterNode.children.find(n => n.id === sectionId);
        if (!sectionNode) {
          const secNum = meta?.number || parts[2].replace('S-', '');
          const secTitle = meta?.title || parsed.sectionName;
          const cleanTitle = secTitle ? secTitle.replace(/\.$/, '').trim() : '';
          const sectionLabel = cleanTitle ? `Section ${secNum} (${cleanTitle})` : `Section ${secNum}`;

          sectionNode = {
            id: sectionId,
            label: sectionLabel,
            level: 2,
            children: [],
            citationIndex: idx,
            citation
          };
          chapterNode.children.push(sectionNode);
        }

        const detailId = `${citation.node_id}/DETAIL`;
        const hasDetail = sectionNode.children.find(n => n.id === detailId);
        if (!hasDetail) {
          sectionNode.children.push({
            id: detailId,
            label: t("explanation"),
            level: 3,
            children: [],
            citationIndex: idx,
            citation
          });
        }
      } else {
        // No Chapter: Act -> Section -> Detail (2-part path, or a single-segment
        // legacy id like "contract-act:s27" — never index past the end of parts)
        const sectionId = parts.length > 1 ? `${parts[0]}/${parts[1]}` : citation.node_id;
        let sectionNode = actNode.children.find(n => n.id === sectionId);
        if (!sectionNode) {
          const secNum = meta?.number || (parts[1] ?? citation.node_id).replace('S-', '');
          const secTitle = meta?.title || parsed.sectionName;
          const cleanTitle = secTitle ? secTitle.replace(/\.$/, '').trim() : '';
          const sectionLabel = cleanTitle ? `Section ${secNum} (${cleanTitle})` : `Section ${secNum}`;

          sectionNode = {
            id: sectionId,
            label: sectionLabel,
            level: 1,
            children: [],
            citationIndex: idx,
            citation
          };
          actNode.children.push(sectionNode);
        }

        const detailId = `${citation.node_id}/DETAIL`;
        const hasDetail = sectionNode.children.find(n => n.id === detailId);
        if (!hasDetail) {
          sectionNode.children.push({
            id: detailId,
            label: t("explanation"),
            level: 2,
            children: [],
            citationIndex: idx,
            citation
          });
        }
      }
    });

    return rootNodes;
  }, [citations, nodeTexts, t]);

  // Compute Word Count and Density Info
  const wordCount = React.useMemo(() => {
    return content.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  const densityInfo = React.useMemo(() => {
    const density = wordCount > 0 ? citations.length / wordCount : 0;
    if (density === 0) return { text: "No Citations", color: "border-border text-subtle-foreground" };
    if (density < 0.01) return { text: "Low Density", color: "border-success/50 text-success" };
    if (density <= 0.03) return { text: "Medium Density", color: "border-warning/50 text-warning" };
    return { text: "High Density", color: "border-destructive/50 text-destructive" };
  }, [citations.length, wordCount]);

  // Automatically unfold the parent branch chain when activeCitationNodeId changes
  React.useEffect(() => {
    if (activeCitationNodeId) {
      const parts = activeCitationNodeId.split('/');
      const actId = parts[0]?.split('-')[0] || parts[0];
      
      const newExpanded: Record<string, boolean> = { ...expanded };
      
      if (parts.length >= 3) {
        const chapterId = `${parts[0]}/${parts[1]}`;
        const sectionId = `${parts[0]}/${parts[1]}/${parts[2]}`;
        setActiveTileId(sectionId);
        newExpanded[actId] = true;
        newExpanded[chapterId] = true;
        newExpanded[sectionId] = true;
      } else {
        const sectionId = `${parts[0]}/${parts[1]}`;
        setActiveTileId(sectionId);
        newExpanded[actId] = true;
        newExpanded[sectionId] = true;
      }
      
      setExpanded(newExpanded);
      fetchNodeText(activeCitationNodeId);
      
      setTimeout(() => {
        const targetId = parts.length >= 3 ? `${parts[0]}/${parts[1]}/${parts[2]}` : `${parts[0]}/${parts[1]}`;
        const elementId = `node-tile-${targetId}`;
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "nearest" });
          element.classList.add("outline", "outline-1", "outline-brand", "bg-accent");
          setTimeout(() => {
            element.classList.remove("outline", "outline-1", "outline-brand", "bg-accent");
          }, 1500);
        }
      }, 150);
    }
  }, [activeCitationNodeId]);

  const toggleNode = (nodeId: string) => {
    setExpanded(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleSectionClick = (node: TreeNode) => {
    toggleNode(node.id);
    setActiveTileId(node.id);
    
    const explanationNode = node.children[0];
    if (explanationNode && explanationNode.citation) {
      const origIndex = explanationNode.citationIndex ?? 0;
      const nodeIdStr = explanationNode.citation.node_id;

      setActiveCitationNodeId(nodeIdStr);
      fetchNodeText(nodeIdStr);

      const markerId = `citation-marker-${origIndex + 1}`;
      const markerElement = document.getElementById(markerId);
      if (markerElement) {
        markerElement.scrollIntoView({ behavior: "smooth", block: "center" });
        markerElement.classList.add("bg-teal", "text-white");
        setTimeout(() => {
          markerElement.classList.remove("bg-teal", "text-white");
        }, 2000);
      }
    }
  };

  // Recursive tree renderer function
  const renderTreeNode = (node: TreeNode) => {
    const isExpanded = !!expanded[node.id];
    const isActive = activeTileId === node.id;

    // Nested indentation based on hierarchy level
    let indentClass = "pl-0";
    if (node.level === 1) indentClass = "ml-2 border-l border-hairline-soft pl-4";
    if (node.level === 2) indentClass = "ml-2 border-l border-hairline-soft pl-6";
    if (node.level === 3) indentClass = "ml-2 border-l border-hairline-soft pl-8";

    // Level 3 details block (Explanation) or leaf explanation
    if (node.id.endsWith('/DETAIL')) {
      const nodeId = node.citation?.node_id || "";
      const textInfo = nodeTexts[nodeId];
      const isLoading = loadingNodes[nodeId];

      return (
        <div key={node.id} className={`${indentClass} py-1.5 pr-1`}>
          <div className="paper animate-in space-y-2.5 border border-border bg-background p-4 text-left text-foreground duration-150 select-text slide-in-from-top-1">
            <div className="label-caps flex items-center justify-between border-b border-border pb-2 text-[9.5px] text-muted-foreground">
              <span>{t("authoritativeText")}</span>
              <span className="border border-teal/40 px-1.5 py-0.5 font-mono text-teal">
                [{node.citationIndex! + 1}]
              </span>
            </div>
            
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 font-sans">
                <span className="size-3.5 animate-spin rounded-full border border-teal border-t-transparent" />
                {t("loading")}
              </div>
            ) : (
              <p className="font-document text-[14px] leading-relaxed text-foreground">
                {textInfo?.text || t("expandParent")}
              </p>
            )}

            <div className="border-t border-border pt-2 font-mono text-[10px] leading-normal text-subtle-foreground">
              {getHumanBreadcrumb(nodeId, textInfo)}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={node.id} className="space-y-1 relative">
        {/* Accordion Node Header */}
        <div
          id={`node-tile-${node.id}`}
          role="button"
          tabIndex={0}
          onMouseEnter={() => {
            if (node.citation) setHoveredTooltipNodeId(node.id);
          }}
          onMouseLeave={() => {
            if (node.citation) setHoveredTooltipNodeId(null);
          }}
          onClick={() => {
            if (node.citation) {
              handleSectionClick(node);
            } else {
              toggleNode(node.id);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (node.citation) {
                handleSectionClick(node);
              } else {
                toggleNode(node.id);
              }
            }
          }}
          className={`group flex cursor-pointer items-center justify-between border-l-2 px-3 py-2.5 transition-colors duration-[180ms] ${indentClass} ${
            isActive
              ? 'border-l-brand bg-accent text-foreground'
              : 'border-l-transparent text-foreground/85 hover:bg-muted hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {node.level === 0 && <Bookmark strokeWidth={1.25} className="size-3.5 shrink-0 text-brand-soft" />}
            <span className={`truncate ${
              node.level === 0
                ? 'font-serif text-[18px]'
                : node.level === 1 && !node.citation
                ? 'label-caps text-[10px] text-muted-foreground'
                : 'font-serif text-[16px]'
            }`}>
              {node.label}
            </span>
          </div>

          <span className={`shrink-0 font-mono text-[14px] leading-none text-subtle-foreground transition-transform duration-200 select-none ${isExpanded ? 'rotate-45 text-brand-soft' : ''}`}>
            +
          </span>
        </div>

        {/* Custom Premium Tooltip for Snapshot Date */}
        {hoveredTooltipNodeId === node.id && node.citation && (
          <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 animate-in border border-border bg-popover px-2.5 py-1 font-mono text-[10px] whitespace-nowrap text-muted-foreground duration-100 fade-in zoom-in-95">
            as of {node.citation.snapshot_id || "2024-12-01"}
          </div>
        )}

        {/* Child recursion */}
        {isExpanded && (
          <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-card">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-[22px] leading-none">
            {t("citations")} <em className="text-peach italic">{citations.length}</em>
          </h2>
          <span className={`label-caps border px-2 py-0.5 text-[9px] select-none ${densityInfo.color}`}>
            {densityInfo.text}
          </span>
        </div>
        <button 
          onClick={toggleCitationDrawer}
          className="cursor-pointer p-1.5 text-subtle-foreground transition-colors duration-[180ms] hover:text-foreground"
          aria-label="Close drawer"
        >
          <X strokeWidth={1.25} className="size-4" />
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {citations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4 text-center py-12">
            <Spark className="size-4" />
            <div className="space-y-2 max-w-[250px]">
              <h3 className="text-[24px] leading-tight text-foreground">
                {t("noCitationsFound")}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("addCitationMarkers")}
              </p>
              {useDraftStore.getState().document?.doc_type === "rti_application" && (
                <p className="mt-3 border-l-2 border-brand-soft py-1 pl-3 text-left text-[12px] text-muted-foreground">
                  Hint: Try citing the <strong>RTI Act, 2005</strong>.
                </p>
              )}
              {useDraftStore.getState().document?.doc_type === "cheque_bounce_notice" && (
                <p className="mt-3 border-l-2 border-brand-soft py-1 pl-3 text-left text-[12px] text-muted-foreground">
                  Hint: Try citing <strong>Negotiable Instruments Act, Section 138</strong>.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {treeNodes.map(rootNode => renderTreeNode(rootNode))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center gap-2.5 border-t border-border px-5 py-3 text-[11px] text-subtle-foreground">
        <Info strokeWidth={1.25} className="size-3.5 shrink-0 text-brand-soft" />
        <span>{t("clickPathsToExpand")}</span>
      </div>
    </div>
  );
}
