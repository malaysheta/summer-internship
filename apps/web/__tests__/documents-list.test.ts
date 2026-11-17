import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseListParams, toDocument, nextCursor, DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from '../lib/documents-list'

// GET /api/documents (#262) — query parsing, row mapping, keyset cursor.

test('parseListParams: defaults when nothing is passed', () => {
  const p = parseListParams(new URLSearchParams(''))
  assert.deepEqual(p, { status: null, doc_type: null, language: null, limit: DEFAULT_LIST_LIMIT, cursor: null })
})

test('parseListParams: reads every filter and clamps limit', () => {
  const p = parseListParams(new URLSearchParams('status=draft&doc_type=nda&language=hi&limit=500&cursor=2026-06-01T00:00:00Z'))
  assert.equal(p.status, 'draft')
  assert.equal(p.doc_type, 'nda')
  assert.equal(p.language, 'hi')
  assert.equal(p.limit, MAX_LIST_LIMIT)
  assert.equal(p.cursor, '2026-06-01T00:00:00Z')
})

test('parseListParams: garbage limit falls back to default', () => {
  assert.equal(parseListParams(new URLSearchParams('limit=abc')).limit, DEFAULT_LIST_LIMIT)
  assert.equal(parseListParams(new URLSearchParams('limit=-5')).limit, DEFAULT_LIST_LIMIT)
})

const row = {
  id: 'd1', owner_id: 'u1', title: 'NDA', doc_type: 'nda', language: 'en', status: 'draft' as const,
  created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-02T00:00:00Z',
}

test('toDocument: maps the contract shape and defaults current_version_id to null', () => {
  const doc = toDocument(row)
  assert.equal(doc.current_version_id, null)
  assert.equal(doc.doc_type, 'nda')
  assert.equal(toDocument({ ...row, current_version_id: 'v9' }).current_version_id, 'v9')
})

test('nextCursor: only when the page is full', () => {
  assert.equal(nextCursor([row, { ...row, id: 'd2', created_at: '2026-05-01T00:00:00Z' }], 2), '2026-05-01T00:00:00Z')
  assert.equal(nextCursor([row], 2), null)
  assert.equal(nextCursor([], 2), null)
})
