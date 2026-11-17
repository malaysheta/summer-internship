import type { Document, DocumentType, SupportedLanguage } from '@trionic/shared'

// Pure helpers for GET /api/documents (#262). Kept free of Next/Supabase so
// they can be unit-tested with plain node:test.

export const MAX_LIST_LIMIT = 100
export const DEFAULT_LIST_LIMIT = 50

export type ListParams = {
  status: string | null
  doc_type: string | null
  language: string | null
  limit: number
  cursor: string | null
}

export function parseListParams(searchParams: URLSearchParams): ListParams {
  const rawLimit = parseInt(searchParams.get('limit') || '', 10)
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, MAX_LIST_LIMIT)
    : DEFAULT_LIST_LIMIT
  return {
    status: searchParams.get('status'),
    doc_type: searchParams.get('doc_type'),
    language: searchParams.get('language'),
    limit,
    cursor: searchParams.get('cursor'),
  }
}

export type DocumentRowLike = {
  id: string
  owner_id: string
  title: string
  doc_type: string
  language: string
  status: Document['status']
  current_version_id?: string | null
  created_at: string
  updated_at: string
}

export function toDocument(row: DocumentRowLike): Document {
  return {
    id: row.id,
    owner_id: row.owner_id,
    title: row.title,
    doc_type: row.doc_type as DocumentType,
    language: row.language as SupportedLanguage,
    status: row.status,
    current_version_id: row.current_version_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/** Keyset cursor: the created_at of the last row when the page was full. */
export function nextCursor(rows: DocumentRowLike[], limit: number): string | null {
  return rows.length === limit ? rows[rows.length - 1].created_at : null
}
