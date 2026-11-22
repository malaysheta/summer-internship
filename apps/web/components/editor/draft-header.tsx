import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Loader2, PanelRight, ArrowLeft, Languages, Download } from "lucide-react";
import { SaveStatus } from "../../hooks/use-autosave";
import { useDraftStore } from "../../hooks/use-draft-store";
import { StatusBadge } from "@/app/[locale]/dashboard/_components/status-badge";
import { Link } from "@/i18n/routing";
import { Button } from "../ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { DocumentType } from "@trionic/shared";

interface DraftHeaderProps {
  saveStatus: SaveStatus;
}

export function DraftHeader({ saveStatus }: DraftHeaderProps) {
  const documentData = useDraftStore((state) => state.document);
  const isCitationDrawerOpen = useDraftStore((state) => state.isCitationDrawerOpen);
  const toggleCitationDrawer = useDraftStore((state) => state.toggleCitationDrawer);
  const updateDocType = useDraftStore((state) => state.updateDocType);

  const content = useDraftStore((state) => state.content);
  const [isExporting, setIsExporting] = useState(false);

  const baseName = (documentData?.title || "legal-draft").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Contract: POST /api/documents/{id}/export?format= → { url } (signed Storage URL, 5 min TTL).
  // Exports the latest SAVED version, so flush autosave first by waiting for "saved".
  const handleExport = async (format: "pdf" | "docx" | "md") => {
    if (!content || !documentData?.id) return;
    if (format === "md") {
      saveBlob(new Blob([content], { type: "text/markdown;charset=utf-8" }), `${baseName}.md`);
      return;
    }
    setIsExporting(true);
    try {
      const res = await fetch(`/api/documents/${documentData.id}/export?format=${format}`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) {
        throw new Error(body.error || body.message || `Export failed (${res.status})`);
      }
      const fileRes = await fetch(body.url);
      if (!fileRes.ok) throw new Error(`Could not download the exported file (${fileRes.status})`);
      saveBlob(await fileRes.blob(), `${baseName}.${format}`);
      toast({ title: "Export complete", description: `${baseName}.${format} downloaded.` });
    } catch (err) {
      console.error("[Export] failed:", err);
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Unexpected error while exporting.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const save = {
    idle: { dot: "bg-subtle-foreground", text: "No changes" },
    unsaved: { dot: "bg-brand-soft animate-pulse", text: "Unsaved" },
    saving: { dot: "bg-brand-soft animate-pulse", text: "Saving…" },
    saved: { dot: "bg-success", text: "Saved" },
    error: { dot: "bg-destructive", text: "Error" },
  }[saveStatus];

  return (
    <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background/90 px-5 py-3 backdrop-blur-md md:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <Link
          href="/dashboard"
          className="label-caps flex shrink-0 items-center gap-2 text-muted-foreground transition-colors duration-[180ms] hover:text-foreground"
        >
          <ArrowLeft strokeWidth={1.25} className="size-3.5" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <span className="h-6 w-px shrink-0 bg-border" />

        <h1 className="min-w-0 truncate font-serif text-[22px] leading-none tracking-[-0.01em] sm:max-w-[360px]">
          {documentData?.title || "Legal Draft"}
        </h1>

        {documentData?.status && <StatusBadge status={documentData.status} />}

        {documentData && (
          <Select value={documentData.doc_type} onValueChange={(val) => updateDocType(val as DocumentType)}>
            <SelectTrigger size="sm" className="hidden w-[190px] text-[13px] md:flex">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rti_application">RTI Application</SelectItem>
              <SelectItem value="legal_notice">Legal Notice</SelectItem>
              <SelectItem value="nda">NDA</SelectItem>
              <SelectItem value="consumer_complaint">Consumer Complaint</SelectItem>
              <SelectItem value="cheque_bounce_notice">Cheque Bounce Notice</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {/* Autosave indicator */}
        <span className="label-caps hidden items-center gap-2 text-[10px] text-muted-foreground sm:flex" aria-live="polite">
          <span className={`size-1.5 rounded-full ${save.dot}`} />
          {save.text}
        </span>
        <span className="hidden h-6 w-px bg-border sm:block" />

        <Button variant="ghost" size="sm" className="hidden sm:flex" disabled>
          <Languages strokeWidth={1.25} />
          Translate
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button size="sm" disabled={!content || isExporting || saveStatus === "saving"}>
              {isExporting ? "Exporting…" : "Export"}
              {isExporting ? <Loader2 className="animate-spin" /> : <Download strokeWidth={1.25} />}
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-[220px] border border-border bg-popover py-1 text-popover-foreground shadow-[0_32px_64px_rgba(0,0,0,0.55)]"
            >
              {([
                ["pdf", "PDF document (.pdf)"],
                ["docx", "Word document (.docx)"],
                ["md", "Markdown (.md)"],
              ] as const).map(([fmt, label]) => (
                <DropdownMenu.Item
                  key={fmt}
                  onSelect={() => handleExport(fmt)}
                  className="flex cursor-pointer items-center gap-3 border-l-2 border-transparent px-4 py-2.5 text-[13px] outline-none select-none data-[highlighted]:border-brand data-[highlighted]:bg-accent"
                >
                  <span className="label-caps w-9 text-[10px] text-brand-soft">{fmt}</span>
                  {label}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <Button
          variant={isCitationDrawerOpen ? "secondary" : "outline"}
          size="sm"
          onClick={toggleCitationDrawer}
          className="hidden lg:flex"
          aria-label="Toggle citation drawer"
          aria-pressed={isCitationDrawerOpen}
        >
          <PanelRight strokeWidth={1.25} />
          {isCitationDrawerOpen ? "Hide Citations" : "Citations"}
        </Button>
      </div>
    </header>
  );
}
