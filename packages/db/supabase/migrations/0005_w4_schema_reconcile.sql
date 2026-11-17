-- =============================================================================
-- Migration: 0005_w4_schema_reconcile.sql
-- Purpose:   Close the W4 schema gaps that the app code already assumes exist.
--
--   1. document_templates          — issue #263 (Om / PR #342, rebased onto the
--                                    TEXT doc_type contract from 0004)
--   2. documents.current_version_id — written by /api/draft, /api/draft/retry
--                                    and read by GET /api/documents; never
--                                    existed in any migration
--   3. PageIndex reconciliation     — the legacy 001/002 migrations (now in
--                                    migrations/_legacy/) declared a second,
--                                    incompatible pageindex_nodes. This adds
--                                    their columns additively so agnoTool.ts
--                                    (snapshots / descend / pageindex_search)
--                                    works against the 0001 + 0002 tables.
--
-- Reversible: every statement is additive (ADD COLUMN IF NOT EXISTS /
-- CREATE TABLE IF NOT EXISTS). To roll back: drop document_templates,
-- pageindex_snapshots, pageindex_ingest_log, the pageindex_search function and
-- the added columns.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. document_templates (one canonical template per doc type)
-- ---------------------------------------------------------------------------
create table if not exists public.document_templates (
  id                uuid        primary key default gen_random_uuid(),
  doc_type          text        not null unique,
  title             text        not null,
  required_sections jsonb       not null default '[]'::jsonb,
  template_markdown text        not null default '',
  snapshot_id       text,       -- PageIndex snapshot the template was authored against
  created_at        timestamptz not null default now(),
  constraint document_templates_doc_type_check check (doc_type in (
    'rti_application',
    'legal_notice',
    'nda',
    'consumer_complaint',
    'cheque_bounce_notice'
  ))
);

comment on table  public.document_templates is
  'Canonical per-doc-type templates consumed by Editor, Planner, Drafter and Reviewer.';
comment on column public.document_templates.required_sections is
  'Ordered list of section descriptors: [{id, title, required, hint}]';

alter table public.document_templates enable row level security;

-- Read-only for everyone (public catalogue); writes only via service role,
-- which bypasses RLS. No write policy is created on purpose.
drop policy if exists "document_templates: read" on public.document_templates;
create policy "document_templates: read"
  on public.document_templates for select
  using (true);

-- Section ids match apps/web/lib/document-templates.ts so the editor can use
-- the DB row verbatim.
insert into public.document_templates (doc_type, title, required_sections, template_markdown)
values
(
  'rti_application',
  'Right to Information (RTI) Application',
  '[
    {"id": "address",            "title": "Address",            "required": true,  "hint": "Public Information Officer, department and address"},
    {"id": "subject",            "title": "Subject",            "required": true,  "hint": "One-line summary of the information sought"},
    {"id": "information_sought", "title": "Information Sought", "required": true,  "hint": "Specific, itemised questions under Section 6(1), RTI Act 2005"},
    {"id": "declaration",        "title": "Declaration",        "required": true,  "hint": "Indian citizen; Rs. 10 fee paid; signature and date"}
  ]'::jsonb,
  E'# Application under the Right to Information Act, 2005\n\n**To,**\nThe Public Information Officer,\n{{pio_department}}\n\n## Subject\n\n{{subject}}\n\n## Information Sought\n\n{{information_sought}}\n\n## Declaration\n\nI am a citizen of India. The application fee of Rs. 10 has been paid.\n\nSignature: ___________  Date: {{date}}\n'
),
(
  'legal_notice',
  'Legal Notice',
  '[
    {"id": "sender",    "title": "Sender",    "required": true, "hint": "Name, address and counsel (if any)"},
    {"id": "recipient", "title": "Recipient", "required": true, "hint": "Full name and last-known address"},
    {"id": "cause",     "title": "Cause",     "required": true, "hint": "Facts and legal basis of the grievance"},
    {"id": "demand",    "title": "Demand",    "required": true, "hint": "Specific action or payment demanded"},
    {"id": "deadline",  "title": "Deadline",  "required": true, "hint": "Days to comply and consequences of default"}
  ]'::jsonb,
  E'# Legal Notice\n\n**From:** {{sender}}\n\n**To:** {{recipient}}\n\n## Cause\n\n{{cause}}\n\n## Demand\n\n{{demand}}\n\n## Deadline\n\nYou are called upon to comply within {{deadline_days}} days of receipt of this notice, failing which legal proceedings will be initiated at your risk and cost.\n\nSignature: ___________  Date: {{date}}\n'
),
(
  'nda',
  'Non-Disclosure Agreement (NDA)',
  '[
    {"id": "parties",           "title": "Parties",           "required": true, "hint": "Disclosing Party and Receiving Party"},
    {"id": "purpose",           "title": "Purpose",           "required": true, "hint": "Why confidential information is being shared"},
    {"id": "confidential_info", "title": "Confidential Info", "required": true, "hint": "Definition and exclusions"},
    {"id": "term",              "title": "Term",              "required": true, "hint": "Duration of the confidentiality obligation"},
    {"id": "remedies",          "title": "Remedies",          "required": true, "hint": "Injunctive relief, damages, governing law"}
  ]'::jsonb,
  E'# Non-Disclosure Agreement\n\n## Parties\n\n{{parties}}\n\n## Purpose\n\n{{purpose}}\n\n## Confidential Information\n\n{{confidential_info}}\n\n## Term\n\n{{term}}\n\n## Remedies\n\n{{remedies}}\n\nSigned by the parties on {{date}}.\n'
),
(
  'consumer_complaint',
  'Consumer Complaint (Consumer Protection Act, 2019)',
  '[
    {"id": "complainant",    "title": "Complainant",    "required": true, "hint": "Name, address, contact"},
    {"id": "opposite_party", "title": "Opposite Party", "required": true, "hint": "Seller / service provider name and address"},
    {"id": "goods_service",  "title": "Goods/Service",  "required": true, "hint": "What was bought, when, for how much"},
    {"id": "deficiency",     "title": "Deficiency",     "required": true, "hint": "Deficiency of service or unfair trade practice"},
    {"id": "relief",         "title": "Relief",         "required": true, "hint": "Refund, replacement, compensation; limitation (2 years)"}
  ]'::jsonb,
  E'# Consumer Complaint\n\n**Before the {{forum}}**\n\n## Complainant\n\n{{complainant}}\n\n## Opposite Party\n\n{{opposite_party}}\n\n## Goods / Service\n\n{{goods_service}}\n\n## Deficiency\n\n{{deficiency}}\n\n## Relief Sought\n\n{{relief}}\n\nVerified at {{place}} on {{date}}.\n'
),
(
  'cheque_bounce_notice',
  'Cheque Bounce Notice (Section 138, Negotiable Instruments Act, 1881)',
  '[
    {"id": "drawer",                 "title": "Drawer",                 "required": true, "hint": "Person who issued the cheque"},
    {"id": "drawee",                 "title": "Drawee",                 "required": true, "hint": "Bank on which the cheque was drawn"},
    {"id": "cheque_details",         "title": "Cheque Details",         "required": true, "hint": "Cheque no., date, amount, dishonour memo"},
    {"id": "section_138_invocation", "title": "Section 138 Invocation", "required": true, "hint": "Statutory notice under S.138 NI Act within 30 days of memo"},
    {"id": "demand",                 "title": "Demand",                 "required": true, "hint": "Pay the cheque amount within 15 days of receipt"}
  ]'::jsonb,
  E'# Notice under Section 138 of the Negotiable Instruments Act, 1881\n\n## Drawer\n\n{{drawer}}\n\n## Drawee\n\n{{drawee}}\n\n## Cheque Details\n\n{{cheque_details}}\n\n## Section 138 Invocation\n\nThe cheque was returned unpaid vide memo dated {{memo_date}}. This notice is issued within 30 days of that memo as required by Section 138(b).\n\n## Demand\n\nYou are called upon to pay Rs. {{amount}} within 15 days of receipt of this notice, failing which prosecution under Section 138 will be initiated.\n\nSignature: ___________  Date: {{date}}\n'
)
on conflict (doc_type) do nothing;

-- ---------------------------------------------------------------------------
-- 2. documents.current_version_id
-- ---------------------------------------------------------------------------
alter table public.documents
  add column if not exists current_version_id uuid
    references public.document_versions(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. PageIndex reconciliation (legacy 001/002 columns, added additively)
-- ---------------------------------------------------------------------------
create table if not exists public.pageindex_snapshots (
  id          text primary key,      -- "YYYY-MM-DD"
  act_code    text not null,
  label       text not null,
  source_url  text,
  total_nodes integer default 0,
  created_at  timestamptz default now()
);

alter table public.pageindex_nodes
  add column if not exists snapshot_id     text references public.pageindex_snapshots(id) on delete cascade,
  add column if not exists act_code        text,
  add column if not exists parent_id       text,
  add column if not exists depth           integer not null default 0,
  add column if not exists sort_order      integer not null default 0,
  add column if not exists node_type       text,
  add column if not exists part_code       text,
  add column if not exists part_name       text,
  add column if not exists article_number  text,
  add column if not exists article_title   text,
  add column if not exists clause_number   text,
  add column if not exists schedule_number integer,
  add column if not exists schedule_title  text,
  add column if not exists text_content    text;

create index if not exists pageindex_nodes_snapshot_idx on public.pageindex_nodes(snapshot_id);
create index if not exists pageindex_nodes_parent_idx   on public.pageindex_nodes(parent_id);
create index if not exists pageindex_nodes_act_code_idx on public.pageindex_nodes(act_code);

create table if not exists public.pageindex_ingest_log (
  id             uuid primary key default gen_random_uuid(),
  snapshot_id    text not null references public.pageindex_snapshots(id),
  run_at         timestamptz default now(),
  status         text not null default 'running',
  nodes_upserted integer default 0,
  nodes_embedded integer default 0,
  errors         jsonb default '[]'::jsonb,
  duration_ms    integer,
  triggered_by   text default 'script'
);

alter table public.pageindex_snapshots  enable row level security;
alter table public.pageindex_ingest_log enable row level security;

drop policy if exists "pageindex_snapshots: read" on public.pageindex_snapshots;
create policy "pageindex_snapshots: read"
  on public.pageindex_snapshots for select using (true);

-- Writes to all pageindex tables go through the service role (bypasses RLS).

-- pageindex_search RPC (agnoTool.search) over the reconciled table. Returns the
-- text node_id as `id` so callers keep receiving "ACT-YEAR/..." identifiers.
create or replace function public.pageindex_search(
  query_embedding vector(1536),
  p_snapshot_id   text,
  p_scope         text default null,
  p_top_k         integer default 5
)
returns table (
  id              text,
  snapshot_id     text,
  node_type       text,
  parent_id       text,
  part_code       text,
  part_name       text,
  article_number  text,
  article_title   text,
  clause_number   text,
  schedule_number integer,
  schedule_title  text,
  text_content    text,
  sort_order      integer,
  similarity      float
)
language sql stable
as $$
  select
    coalesce(n.node_id, n.id::text),
    n.snapshot_id,
    n.node_type,
    n.parent_id,
    n.part_code,
    n.part_name,
    n.article_number,
    n.article_title,
    n.clause_number,
    n.schedule_number,
    n.schedule_title,
    coalesce(n.text_content, n.body_text),
    n.sort_order,
    1 - (n.embedding <=> query_embedding) as similarity
  from public.pageindex_nodes n
  where n.snapshot_id = p_snapshot_id
    and n.embedding is not null
    and (p_scope is null or coalesce(n.node_id, n.id::text) like (p_scope || '%'))
  order by n.embedding <=> query_embedding
  limit p_top_k;
$$;

grant execute on function public.pageindex_search to authenticated, service_role, anon;

commit;
