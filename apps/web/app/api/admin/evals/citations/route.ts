import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildCitationRows,
  errorResponse,
  forbiddenResponse,
  isAdminViaDb,
  TRACE_PAGE_SIZE,
  unauthorizedResponse,
} from "../lib";
import type { AdminSupabaseClient, CitatorTraceRow } from "../lib";

// One row per Citator run (i.e. per generated draft), all history, newest first.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorizedResponse();
  if (!(await isAdminViaDb(supabase as unknown as AdminSupabaseClient, user.id))) {
    return forbiddenResponse();
  }

  const rows: CitatorTraceRow[] = [];
  for (let from = 0; ; from += TRACE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("agent_traces")
      .select("id, created_at, status, document_id, metadata, documents (title, doc_type, language)")
      .eq("agent_name", "citator")
      .order("created_at", { ascending: false })
      .range(from, from + TRACE_PAGE_SIZE - 1);
    if (error) return errorResponse(500, "internal_error", error.message, null);
    rows.push(...((data ?? []) as unknown as CitatorTraceRow[]));
    if ((data?.length ?? 0) < TRACE_PAGE_SIZE) break;
  }

  return NextResponse.json({ runs: buildCitationRows(rows) });
}
