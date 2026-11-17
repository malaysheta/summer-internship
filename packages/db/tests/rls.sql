-- RLS regression check. Run against the LOCAL stack only:
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f packages/db/tests/rls.sql
-- Exits non-zero if any assertion fails. Everything runs in a rolled-back transaction.
begin;

insert into auth.users (id, email, instance_id, aud, role) values
  ('a0000000-0000-0000-0000-000000000001', 'alice@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000002', 'bob@test.local',   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-000000000003', 'admin@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
update public.users set role = 'admin' where id = 'c0000000-0000-0000-0000-000000000003';
insert into public.documents (owner_id, title, doc_type, intake_text) values
  ('a0000000-0000-0000-0000-000000000001', 'Alice NDA', 'nda', 'x'),
  ('b0000000-0000-0000-0000-000000000002', 'Bob RTI', 'rti_application', 'y');

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- Alice: sees only herself and her own document (no recursion error).
select pg_temp.as_user('a0000000-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from public.users) = 1, 'alice should see exactly her own users row';
  assert (select count(*) from public.documents) = 1, 'alice should see only her document';
  assert (select title from public.documents) = 'Alice NDA', 'alice sees the wrong document';
  assert (select count(*) from public.document_templates) = 5, 'templates must be readable';
end $$;

-- Alice cannot promote herself.
do $$ begin
  begin
    update public.users set role = 'admin' where id = 'a0000000-0000-0000-0000-000000000001';
    raise exception 'self-escalation was allowed';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;

-- Alice cannot write templates.
do $$ begin
  begin
    insert into public.document_templates (doc_type, title) values ('nda', 'hijack');
    raise exception 'template write was allowed';
  exception when insufficient_privilege or unique_violation then null;
  end;
end $$;

-- Admin: reads every user and every document.
select pg_temp.as_user('c0000000-0000-0000-0000-000000000003');
do $$ begin
  assert (select count(*) from public.users where email in ('alice@test.local','bob@test.local','admin@test.local')) = 3, 'admin should see all users';
  assert (select count(*) from public.documents where title in ('Alice NDA','Bob RTI')) = 2, 'admin should see all documents';
end $$;

rollback;
\echo 'RLS checks passed'
