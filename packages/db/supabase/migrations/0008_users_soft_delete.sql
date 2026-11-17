-- =============================================================================
-- Migration: 0008_users_soft_delete.sql
-- Purpose:   DELETE /api/users/me (#264/#268) soft-deletes by stamping
--            users.deleted_at, but the column never existed: the UPDATE
--            failed, the error was only logged, and the route still answered
--            200 "Account scheduled for deletion". Nothing was ever scheduled.
-- Reversible: alter table public.users drop column deleted_at;
-- =============================================================================

alter table public.users
  add column if not exists deleted_at timestamptz;

comment on column public.users.deleted_at is
  'Soft-delete timestamp set by DELETE /api/users/me; hard delete after a 30-day grace period.';
