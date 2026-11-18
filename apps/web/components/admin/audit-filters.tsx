"use client";

import type { AuditFilters as AuditFiltersType } from "@/hooks/use-audit-trails";
import { mapDbDocTypeToLabel } from "./metrics-cards";
import { RotateCcw } from "lucide-react";

interface AuditFiltersProps {
  filters: AuditFiltersType;
  onChange: (filters: AuditFiltersType) => void;
  uniqueUsers: { id: string; email: string; display_name: string | null }[];
  uniqueModels: string[];
}

const DOCUMENT_TYPES = ["petition", "notice", "agreement", "complaint", "other"];

const EMPTY: AuditFiltersType = { user_id: "all", doc_type: "all", model: "all", startDate: "", endDate: "" };

const CONTROL =
  "h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 shadow-xs outline-none transition-colors hover:border-zinc-300 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200";

export function AuditFilters({ filters, onChange, uniqueUsers, uniqueModels }: AuditFiltersProps) {
  const set = (key: keyof AuditFiltersType, value: string) => onChange({ ...filters, [key]: value });
  const dirty = (Object.keys(EMPTY) as (keyof AuditFiltersType)[]).some((k) => filters[k] !== EMPTY[k]);

  return (
    <div className="grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
      <Field id="user-filter" label="User">
        <select id="user-filter" className={CONTROL} value={filters.user_id} onChange={(e) => set("user_id", e.target.value)}>
          <option value="all">All users</option>
          {uniqueUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.display_name || user.email}
            </option>
          ))}
        </select>
      </Field>

      <Field id="doc-type-filter" label="Document type">
        <select id="doc-type-filter" className={CONTROL} value={filters.doc_type} onChange={(e) => set("doc_type", e.target.value)}>
          <option value="all">All types</option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {mapDbDocTypeToLabel(type)}
            </option>
          ))}
        </select>
      </Field>

      <Field id="model-filter" label="Model">
        <select id="model-filter" className={CONTROL} value={filters.model} onChange={(e) => set("model", e.target.value)}>
          <option value="all">All models</option>
          {uniqueModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </Field>

      <Field id="start-date" label="From">
        <input id="start-date" type="date" className={CONTROL} value={filters.startDate} onChange={(e) => set("startDate", e.target.value)} />
      </Field>

      <Field id="end-date" label="To">
        <input id="end-date" type="date" className={CONTROL} value={filters.endDate} onChange={(e) => set("endDate", e.target.value)} />
      </Field>

      <button
        type="button"
        onClick={() => onChange(EMPTY)}
        disabled={!dirty}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-40"
      >
        <RotateCcw className="size-3.5" />
        Reset
      </button>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  );
}
