"use client";

import type { DocumentStatus, DocumentType, SupportedLanguage } from "@trionic/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

const STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: "draft",      label: "Draft" },
  { value: "generating", label: "Generating" },
  { value: "final",      label: "Final" },
  { value: "failed",     label: "Failed" },
  { value: "exported",   label: "Exported" },
  { value: "archived",   label: "Archived" },
];

const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "gu", label: "Gujarati" },
  { value: "mr", label: "Marathi" },
  { value: "ta", label: "Tamil" },
];

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "rti_application",     label: "RTI Application" },
  { value: "legal_notice",        label: "Legal Notice" },
  { value: "nda",                 label: "NDA" },
  { value: "consumer_complaint",  label: "Consumer Complaint" },
  { value: "cheque_bounce_notice",label: "Cheque Bounce Notice" },
];

const STATUS_KEYS: Record<DocumentStatus, string> = {
  draft: "statusDraft",
  generating: "statusGenerating",
  final: "statusFinal",
  failed: "statusFailed",
  exported: "statusExported",
  archived: "statusArchived",
};

const DOC_TYPE_KEYS: Record<DocumentType, string> = {
  rti_application: "docTypeOptionRti",
  legal_notice: "docTypeOptionNotice",
  nda: "docTypeOptionNda",
  consumer_complaint: "docTypeOptionConsumer",
  cheque_bounce_notice: "docTypeOptionCheque",
};

export type FilterState = {
  search:   string;
  status:   DocumentStatus | "all";
  language: SupportedLanguage | "all";
  doc_type: DocumentType | "all";
};

interface FilterBarProps {
  filters:  FilterState;
  onChange: (filters: FilterState) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const t = useTranslations("dashboard.filters");
  const tLang = useTranslations("languages");
  const tIntake = useTranslations("intake");

  const hasActiveFilters =
    filters.search   !== "" ||
    filters.status   !== "all" ||
    filters.language !== "all" ||
    filters.doc_type !== "all";

  function clearFilters() {
    onChange({ search: "", status: "all", language: "all", doc_type: "all" });
  }

  return (
    <div className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:flex-wrap sm:items-center">

      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search strokeWidth={1.25} className="absolute top-1/2 left-0 size-4 -translate-y-1/2 text-subtle-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={filters.search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ ...filters, search: e.target.value })
          }
          className="border-0 pl-7 hover:border-0 focus-visible:border-0"
        />
      </div>

      {/* Status filter */}
      <Select
        value={filters.status}
        onValueChange={(v: string) =>
          onChange({ ...filters, status: v as DocumentStatus | "all" })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t("statusPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allStatuses")}</SelectItem>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{t(STATUS_KEYS[o.value])}</SelectItem>
          ))}
        </SelectContent>
      </Select>



      {/* Doc type filter */}
      <Select
        value={filters.doc_type}
        onValueChange={(v: string) =>
          onChange({ ...filters, doc_type: v as DocumentType | "all" })
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t("typePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allTypes")}</SelectItem>
          {DOC_TYPE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{tIntake(DOC_TYPE_KEYS[o.value])}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X strokeWidth={1.25} />
          {t("clear")}
        </Button>
      )}
    </div>
  );
}
