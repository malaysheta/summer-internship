"use client";

import { AdminPageHeader } from "@/components/admin/admin-layout";
import { AuditFilters } from "@/components/admin/audit-filters";
import { AuditTable } from "@/components/admin/audit-table";
import { ExportButton } from "@/components/admin/export-button";
import { useAuditTrails } from "@/hooks/use-audit-trails";
import { AlertCircle, Loader2 } from "lucide-react";

export default function AdminAuditPage() {
  const { filteredTraces, uniqueUsers, uniqueModels, filters, setFilters, loading, error } = useAuditTrails();

  return (
    <>
      <AdminPageHeader
        title="Audit logs"
        description="Every LLM call across the platform, newest first."
        actions={<ExportButton startDate={filters.startDate} endDate={filters.endDate} />}
      />

      <section className="border border-border">
        <AuditFilters
          filters={filters}
          onChange={setFilters}
          uniqueUsers={uniqueUsers}
          uniqueModels={uniqueModels}
        />

        <div className="label-caps flex items-center justify-between border-y border-border px-4 py-3 text-[10px] text-subtle-foreground">
          <span>
            {loading ? "Loading…" : `${filteredTraces.length.toLocaleString()} ${filteredTraces.length === 1 ? "trace" : "traces"}`}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading audit logs…
          </div>
        ) : error ? (
          <div className="m-4 flex items-center gap-3 border-l-[3px] border-destructive py-3 pl-4 text-[13px] text-destructive">
            <AlertCircle strokeWidth={1.25} className="size-4 shrink-0" />
            Failed to load audit logs: {error}
          </div>
        ) : (
          <AuditTable traces={filteredTraces} />
        )}
      </section>
    </>
  );
}
