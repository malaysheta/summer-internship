import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DocumentType } from '@trionic/shared'
import type { DocumentTemplate, TemplateSection } from '@/lib/document-templates'

const ALLOWED_DOC_TYPES: DocumentType[] = [
  'rti_application',
  'legal_notice',
  'nda',
  'consumer_complaint',
  'cheque_bounce_notice',
]

// ─── GET /api/document_templates?type=<doc_type> ─────────────────────────────
// Reads the canonical per-doc-type template from document_templates (#263).
// The editor (lib/document-templates.ts) calls this first and falls back to its
// hard-coded copy when it fails, so this route must only ever answer 200/400/404.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const docType = searchParams.get('type')

  if (!docType || !ALLOWED_DOC_TYPES.includes(docType as DocumentType)) {
    return NextResponse.json(
      { error: 'bad_request', message: `type must be one of: ${ALLOWED_DOC_TYPES.join(', ')}` },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('document_templates')
    .select('doc_type, title, required_sections, template_markdown, snapshot_id')
    .eq('doc_type', docType)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'not_found', message: `No template for ${docType}` }, { status: 404 })
  }

  const sections = (data.required_sections as TemplateSection[]) ?? []
  const template: DocumentTemplate & { title: string; template_markdown: string; snapshot_id: string | null } = {
    docType: data.doc_type,
    allowedSections: sections,
    defaultSections: sections,
    title: data.title,
    template_markdown: data.template_markdown,
    snapshot_id: data.snapshot_id ?? null,
  }

  return NextResponse.json(template, { status: 200 })
}
