"use client";

import { useEffect, useState, useCallback } from "react";
import type { Document, DocumentType } from "@trionic/shared";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/routing";
import { AppHeader } from "@/components/brand/app-header";
import { ArrowIcon, SectionHeading, splitAccent } from "@/components/brand";
import { createClient } from "@/lib/supabase/client";
import { FilterBar, type FilterState } from "./_components/filter-bar";
import { DocumentTable } from "./_components/document-table";
import { EmptyState } from "./_components/empty-state";
import { useTranslations } from "next-intl";

type FetchState = "idle" | "loading" | "error" | "done";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("navigation");

  const [documents, setDocuments]     = useState<Document[]>([]);
  const [fetchState, setFetchState]   = useState<FetchState>("idle");
  const [nextCursor, setNextCursor]   = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const router   = useRouter();
  const supabase = createClient();

  const [filters, setFilters] = useState<FilterState>({
    search:   "",
    status:   "all",
    language: "all",
    doc_type: "all",
  });

  // ── fetch documents (initial + filter change) ─────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setFetchState("loading");
    setNextCursor(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/sign-in");
        return;
      }

      const params = new URLSearchParams();
      if (filters.status   !== "all") params.set("status",   filters.status);
      if (filters.language !== "all") params.set("language", filters.language);
      if (filters.doc_type !== "all") params.set("doc_type", filters.doc_type);
      params.set("limit", "20");

      const res = await fetch(`/api/documents?${params.toString()}`);

      if (!res.ok) {
        setFetchState("error");
        return;
      }

      const data = await res.json() as { documents: Document[]; next_cursor: string | null };
      setDocuments(data.documents);
      setNextCursor(data.next_cursor);
      setFetchState("done");
    } catch (err) {
      console.error("[Dashboard] Error fetching documents:", err);
      setFetchState("error");
    }
  }, [filters.status, filters.language, filters.doc_type]);

  // ── load more (pagination via next_cursor) ────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (filters.status   !== "all") params.set("status",   filters.status);
      if (filters.language !== "all") params.set("language", filters.language);
      if (filters.doc_type !== "all") params.set("doc_type", filters.doc_type);
      params.set("limit",  "20");
      params.set("cursor", nextCursor);

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (!res.ok) { setLoadingMore(false); return; }

      const data = await res.json() as { documents: Document[]; next_cursor: string | null };
      setDocuments((prev) => [...prev, ...data.documents]);
      setNextCursor(data.next_cursor);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, filters.status, filters.language, filters.doc_type]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ── client-side title search ──────────────────────────────────────────────
  const visibleDocuments = filters.search.trim()
    ? documents.filter((d) =>
        d.title.toLowerCase().includes(filters.search.toLowerCase())
      )
    : documents;

  // ── which empty state to show ─────────────────────────────────────────────
  const hasActiveFilters =
    filters.status !== "all" ||
    filters.language !== "all" ||
    filters.doc_type !== "all" ||
    filters.search.trim() !== "";

  const emptyType = hasActiveFilters ? "no-results" : "empty";

  const [titleLead, titleAccent] = splitAccent(t("title"));

  return (
    <>
    <AppHeader />
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-5 py-12 md:px-10 md:py-16">
      <SectionHeading label={tNav("dashboard")} title={titleLead} accent={titleAccent} subtitle={t("subtitle")}>
        <Button asChild size="lg">
          <Link href="/new">
            {tCommon("newDraft")}
            <ArrowIcon />
          </Link>
        </Button>
      </SectionHeading>

      {/* Filters */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Content */}
      {fetchState === "loading" && (
        <EmptyState type="loading" />
      )}

      {fetchState === "error" && (
        <EmptyState type="error" onRetry={fetchDocuments} />
      )}

      {fetchState === "done" && documents.length === 0 && (
        <EmptyState
          type={emptyType}
          activeFilter={filters.doc_type !== "all" ? (filters.doc_type as DocumentType) : undefined}
        />
      )}

      {fetchState === "done" && documents.length > 0 && visibleDocuments.length === 0 && (
        <EmptyState type="no-results" />
      )}

      {fetchState === "done" && visibleDocuments.length > 0 && (
        <>
          <DocumentTable documents={visibleDocuments} />

          {/* Pagination */}
          {nextCursor && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-48"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </main>
    </>
  );
}