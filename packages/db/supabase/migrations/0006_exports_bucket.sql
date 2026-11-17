-- =============================================================================
-- Migration: 0006_exports_bucket.sql
-- Purpose:   POST /api/documents/{id}/export uploads to storage bucket
--            'exports' at "<document_id>/<file>" with the caller's JWT and then
--            signs a 5-minute URL (#172, #265). No migration ever created the
--            bucket or its RLS, so every export failed on a fresh project.
-- Reversible: delete the policies and the bucket row.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;

-- Owner of the document named by the first path segment may write/read/overwrite.
drop policy if exists "exports: owner rw" on storage.objects;
create policy "exports: owner rw"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'exports'
    and exists (
      select 1 from public.documents d
      where d.id::text = (storage.foldername(name))[1]
        and d.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'exports'
    and exists (
      select 1 from public.documents d
      where d.id::text = (storage.foldername(name))[1]
        and d.owner_id = auth.uid()
    )
  );
