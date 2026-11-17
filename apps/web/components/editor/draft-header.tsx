import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AlertCircle, CheckCircle2, Loader2, Save, PanelRight, ArrowLeft, Languages, Download } from "lucide-react";
import { SaveStatus } from "../../hooks/use-autosave";
import { useDraftStore } from "../../hooks/use-draft-store";
import { StatusBadge } from "@/app/[locale]/dashboard/_components/status-badge";
import Link from "next/link";
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

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-3 shrink-0">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>

        <h1 className="text-base font-bold text-foreground truncate max-w-[200px] sm:max-w-[300px]">
          {documentData?.title || "Legal Draft"}
        </h1>

        {documentData?.status && (
          <StatusBadge status={documentData.status} />
        )}

        {documentData && (
          <Select 
            value={documentData.doc_type} 
            onValueChange={(val) => updateDocType(val as DocumentType)}
          >
            <SelectTrigger className="w-[180px] h-8 text-xs font-medium">
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
        
        {/* Pinned AI Banner */}
        <div className="hidden md:flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>AI-generated draft — not legal advice</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Autosave Indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground hidden sm:flex">
          {saveStatus === "idle" && (
            <>
              <Save className="h-4 w-4" />
              <span>No changes</span>
            </>
          )}
          {saveStatus === "unsaved" && (
            <>
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Unsaved</span>
            </>
          )}
          {saveStatus === "saving" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-blue-500">Saving...</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-green-500">Saved</span>
            </>
          )}
          {saveStatus === "error" && (
            <>
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">Error</span>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex" disabled>
            <Languages className="mr-2 h-4 w-4" />
            Translate
          </Button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="default" size="sm" disabled={!content || isExporting || saveStatus === "saving"}>
                {isExporting ? "Exporting..." : "Export"}
                {isExporting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Download className="ml-2 h-4 w-4" />}
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-[190px] rounded-lg border bg-background p-1 shadow-lg">
                {([
                  ["pdf", "PDF document (.pdf)"],
                  ["docx", "Word document (.docx)"],
                  ["md", "Markdown (.md)"],
                ] as const).map(([fmt, label]) => (
                  <DropdownMenu.Item
                    key={fmt}
                    onSelect={() => handleExport(fmt)}
                    className="flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
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
          >
            <PanelRight className="mr-2 h-4 w-4" />
            {isCitationDrawerOpen ? "Hide Citations" : "Citations"}
          </Button>
        </div>
      </div>
    </header>
  );
}
