#!/usr/bin/env node
// Load every PageIndex act shipped in packages/pageindex/artifacts into the
// LOCAL Supabase Postgres (pnpm db:start first). Idempotent: wipes and reloads
// pageindex_trees / pageindex_nodes. Embeddings are left NULL — hybrid search
// falls back to the in-memory keyword search when they are missing.
//
//   pnpm --filter @trionic/pageindex build && pnpm db:seed:pageindex
//
// Never point DATABASE_URL at the hosted project: this script truncates.
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { allNodes } = require("../../pageindex/dist/index.js");

const DB = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (!/127\.0\.0\.1|localhost/.test(DB) && process.env.ALLOW_REMOTE_SEED !== "1") {
  console.error(`Refusing to seed non-local database: ${DB}`);
  process.exit(1);
}

const q = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const nodes = allNodes();

const acts = new Map();
for (const n of nodes) {
  if (!acts.has(n.act_code)) {
    acts.set(n.act_code, { name: n.act_name, year: Number(n.act_code.match(/(\d{4})/)?.[1]) || null, url: n.source_url });
  }
}

const sql = ["begin;", "truncate public.pageindex_trees cascade;"];
for (const [code, a] of acts) {
  sql.push(
    `insert into public.pageindex_trees (act_name, act_year, act_code, source_url) values (${q(a.name)}, ${a.year ?? "NULL"}, ${q(code)}, ${q(a.url)});`,
  );
}
for (const n of nodes) {
  const path = [n.act_name, n.number && `Section ${n.number}`, n.title].filter(Boolean).join(" › ");
  sql.push(
    `insert into public.pageindex_nodes (tree_id, node_id, act_code, parent_id, node_type, node_path, heading, body_text, text_content)
     select id, ${q(n.node_id)}, ${q(n.act_code)}, ${q(n.parent_id)}, ${q(n.level)}, ${q(path)}, ${q(n.title)}, ${q(n.text || n.title || n.node_id)}, ${q(n.text)}
     from public.pageindex_trees where act_code = ${q(n.act_code)};`,
  );
}
sql.push("commit;");

const res = spawnSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-q"], { input: sql.join("\n"), encoding: "utf-8" });
if (res.status !== 0) {
  console.error(res.stderr || res.stdout);
  process.exit(res.status ?? 1);
}
console.log(`Seeded ${acts.size} acts / ${nodes.length} nodes into ${DB.replace(/:[^:@/]+@/, ":***@")}`);
