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

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
        <AuditFilters
          filters={filters}
          onChange={setFilters}
          uniqueUsers={uniqueUsers}
          uniqueModels={uniqueModels}
        />

        <div className="flex items-center justify-between border-y border-zinc-100 bg-zinc-50/60 px-4 py-2.5 text-xs text-zinc-500">
          <span>
            {loading ? "Loading…" : `${filteredTraces.length.toLocaleString()} ${filteredTraces.length === 1 ? "trace" : "traces"}`}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin" />
            Loading audit logs…
          </div>
        ) : error ? (
          <div className="m-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" />
            Failed to load audit logs: {error}
          </div>
        ) : (
          <AuditTable traces={filteredTraces} />
        )}
      </section>
    </>
  );
}
