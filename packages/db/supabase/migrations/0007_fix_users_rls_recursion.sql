-- =============================================================================
-- Migration: 0007_fix_users_rls_recursion.sql
-- Purpose:   Every policy in 0001 that checks "is the caller an admin?" did so
--            with a subquery on public.users. Postgres evaluates the users
--            policies for that subquery too, so ANY authenticated read of
--            users, documents or agent_traces failed with
--              ERROR: infinite recursion detected in policy for relation "users"
--            (reproduced on a fresh `supabase db reset`). That breaks
--            /api/users/me, the /admin gate, the dashboard and the audit page.
--
-- Fix: read the caller's role through a SECURITY DEFINER function, which runs
-- as the table owner and therefore skips RLS. Same semantics, no recursion.
-- Reversible: drop the two functions and re-create the 0001 policies.
-- =============================================================================

create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$ select role from public.users where id = auth.uid() $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.current_user_role() = 'admin', false) $$;

revoke all on function public.current_user_role() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;

drop policy if exists "users: self update" on public.users;
create policy "users: self update"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = public.current_user_role());  -- no self-escalation

drop policy if exists "users: admin read all" on public.users;
create policy "users: admin read all"
  on public.users for select
  using (public.is_admin());

drop policy if exists "documents: admin read" on public.documents;
create policy "documents: admin read"
  on public.documents for select
  using (public.is_admin());

drop policy if exists "agent_traces: admin read all" on public.agent_traces;
create policy "agent_traces: admin read all"
  on public.agent_traces for select
  using (public.is_admin());
