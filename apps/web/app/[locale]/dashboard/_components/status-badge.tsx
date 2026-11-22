import type { DocumentStatus } from "@trionic/shared";
import { Badge } from "@/components/ui/badge";

// Square outlined tags; colour carries the state (devx pills).
const statusConfig: Record<DocumentStatus, string> = {
  draft:      "border-border text-muted-foreground",
  generating: "border-brand-soft/60 text-brand-soft animate-pulse",
  final:      "border-success/50 text-success",
  failed:     "border-destructive/50 text-destructive",
  exported:   "border-teal/50 text-teal",
  archived:   "border-hairline-soft text-subtle-foreground",
};

import { useTranslations } from "next-intl";

const STATUS_KEYS: Record<DocumentStatus, string> = {
  draft: "statusDraft",
  generating: "statusGenerating",
  final: "statusFinal",
  failed: "statusFailed",
  exported: "statusExported",
  archived: "statusArchived",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const t = useTranslations("dashboard.filters");
  return (
    <Badge variant="outline" className={statusConfig[status]}>
      {t(STATUS_KEYS[status])}
    </Badge>
  );
}
