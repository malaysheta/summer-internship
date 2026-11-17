-- Local-only seed, applied by `pnpm db:reset` after migrations.
-- Legal corpus is loaded separately (it is ~10k rows generated from
-- packages/pageindex/artifacts): `pnpm db:seed:pageindex`.
--
-- Create a local user by signing up at http://localhost:3000 (email
-- confirmations are off locally; Inbucket at http://127.0.0.1:54324).
-- Promote yourself to admin for /admin:
--   update public.users set role = 'admin' where email = '<you>';
select 1;
