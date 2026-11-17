#!/usr/bin/env node
// Live end-to-end smoke test: real Chrome → running Next app → local Supabase.
//   pnpm db:start && pnpm dev            (in another terminal)
//   pnpm --filter web e2e                (BASE_URL defaults to http://localhost:3000)
// Signs up a fresh throwaway user, walks onboarding → dashboard → intake →
// editor (with real PageIndex citations) → PDF export → settings → admin →
// Hindi UI. Screenshots go to e2e/screenshots/. Exits 1 if any step fails.
// Local-only: refuses to run against a non-localhost BASE_URL (it promotes the
// test user to admin through the local database).
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DB = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE) || !/127\.0\.0\.1|localhost/.test(DB)) {
  console.error("live-smoke runs against local dev only");
  process.exit(1);
}
const SHOTS = join(dirname(fileURLToPath(import.meta.url)), "screenshots");
mkdirSync(SHOTS, { recursive: true });

const email = `e2e+${Date.now()}@example.test`;
const password = `e2e-${Math.random().toString(36).slice(2)}-Aa1!`;
const results = [];
const consoleErrors = [];
const serverErrors = [];

const browser = await puppeteer.launch({ headless: process.env.HEADFUL ? false : "new", defaultViewport: { width: 1360, height: 900 } });
const page = await browser.newPage();
page.on("console", (m) => m.type() === "error" && consoleErrors.push(`${page.url()} :: ${m.text()}`));
page.on("response", (r) => r.status() >= 500 && serverErrors.push(`${r.status()} ${r.request().method()} ${r.url()}`));

async function step(name, fn) {
  const t0 = Date.now();
  try {
    const note = await fn();
    results.push({ step: name, ok: true, ms: Date.now() - t0, note: note ?? "" });
  } catch (e) {
    results.push({ step: name, ok: false, ms: Date.now() - t0, note: String(e?.message ?? e).slice(0, 200) });
  }
  await page.screenshot({ path: join(SHOTS, `${String(results.length).padStart(2, "0")}-${name.replace(/\W+/g, "-")}.png`) }).catch(() => {});
}
const go = (path) => page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 120_000 });
const api = (path, init) =>
  page.evaluate(async (p, i) => {
    const r = await fetch(p, i);
    return { status: r.status, body: await r.text() };
  }, path, init);
const clickText = async (selector, text) => {
  const handles = await page.$$(selector);
  for (const h of handles) if ((await h.evaluate((el) => el.textContent ?? "")).includes(text)) return h.click();
  throw new Error(`no ${selector} containing "${text}"`);
};
const psql = (sql) => spawnSync("psql", [DB, "-Atqc", sql], { encoding: "utf-8" }).stdout.trim();

await step("landing page renders", async () => {
  await go("/");
  if (!page.url().includes("/en")) throw new Error(`expected /en redirect, got ${page.url()}`);
  return page.url();
});

await step("protected route redirects to sign-in", async () => {
  await go("/en/dashboard");
  if (!page.url().includes("/auth/sign-in")) throw new Error(`no redirect: ${page.url()}`);
});

await step("sign up a new account", async () => {
  await go("/en/auth/sign-in");
  await clickText("button", "Create a new account");
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await Promise.all([page.waitForNavigation({ timeout: 60_000 }).catch(() => {}), clickText("button", "Create account")]);
  await page.waitForFunction(() => !location.pathname.includes("/auth/"), { timeout: 60_000 });
  return page.url();
});

await step("users row created by auth trigger", async () => {
  const row = psql(`select role from public.users where email = '${email}'`);
  if (row !== "user") throw new Error(`users row missing or wrong role: "${row}"`);
});

await step("onboarding completes", async () => {
  if (!page.url().includes("/onboarding")) await go("/en/onboarding");
  await page.type('input[type="text"]', "E2E Tester");
  await Promise.all([page.waitForNavigation({ timeout: 60_000 }).catch(() => {}), page.click("main button, button[type='submit'], form button")]);
  await page.waitForFunction(() => location.pathname.includes("/dashboard"), { timeout: 60_000 });
  const onboarded = psql(`select onboarded_at is not null from public.users where email = '${email}'`);
  if (onboarded !== "t") throw new Error("onboarded_at not persisted");
});

await step("GET /api/users/me returns the profile", async () => {
  const r = await api("/api/users/me");
  if (r.status !== 200 || !r.body.includes(email)) throw new Error(`${r.status} ${r.body.slice(0, 120)}`);
});

await step("dashboard renders with empty list", async () => {
  await go("/en/dashboard");
  const r = await api("/api/documents");
  if (r.status !== 200) throw new Error(`list ${r.status}`);
  return `documents=${JSON.parse(r.body).documents.length}`;
});

let streamedDocId = null;
await step("intake: cheque-bounce draft starts streaming", async () => {
  await go("/en/new");
  await page.click('input[value="cheque_bounce_notice"]').catch(() => page.evaluate(() => document.querySelector('input[value="cheque_bounce_notice"]')?.closest("label")?.click()));
  await page.type("#intake-text", "My tenant Ramesh Kumar gave me cheque no. 004512 dated 01/10/2026 for Rs. 85,000 drawn on HDFC Bank, Pune. It was returned unpaid on 20/10/2026 for insufficient funds. I want to send a legal notice.");
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/documents") && r.request().method() === "POST", { timeout: 60_000 }),
    page.click("#btn-generate-draft"),
  ]);
  if (resp.status() !== 201) throw new Error(`POST /api/documents → ${resp.status()} ${await resp.text()}`);
  streamedDocId = (await resp.json()).document_id;
  const draftResp = await page.waitForResponse((r) => r.url().includes("/api/draft"), { timeout: 60_000 });
  await new Promise((r) => setTimeout(r, 8000));
  const status = psql(`select status from public.documents where id = '${streamedDocId}'`);
  return `doc=${streamedDocId} /api/draft=${draftResp.status()} doc.status=${status}`;
});

let docId = null;
await step("editor: create NDA + save a version with real citations", async () => {
  const created = await api("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doc_type: "nda", language: "en", intake_text: "Mutual NDA between Acme Pvt Ltd and Beta LLP for a joint bid." }),
  });
  if (created.status !== 201) throw new Error(`create ${created.status}`);
  docId = JSON.parse(created.body).document_id;
  const body = [
    "## Parties", "Acme Pvt Ltd and Beta LLP.",
    "## Purpose", "Evaluating a joint bid.",
    "## Confidential Info", "An agreement enforceable by law is a contract [CITE:contract-act:s10].",
    "## Term", "Two years.",
    "## Remedies", "Specific performance may be enforced [CITE:SRA-1963/S-10]; data handled per [CITE:DPDP-2023/CH-I/S-2].",
  ].join("\n\n");
  const v = await api(`/api/documents/${docId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body_markdown: body, change_note: "e2e" }) });
  if (v.status !== 200) throw new Error(`PATCH ${v.status} ${v.body.slice(0, 160)}`);
  const cur = psql(`select current_version_id = '${JSON.parse(v.body).id}' from public.documents where id = '${docId}'`);
  if (cur !== "t") throw new Error("current_version_id not updated by PATCH");
  await go(`/en/draft/${docId}`);
  await page.waitForFunction(() => document.body.innerText.includes("Specific performance"), { timeout: 60_000 });
  return docId;
});

await step("citation API resolves cited nodes", async () => {
  const ids = ["SRA-1963/S-10", "DPDP-2023/CH-I/S-2", "NI-1881/S-138", "CPA-2019/CH-I/S-2"];
  const out = [];
  for (const id of ids) {
    const r = await api(`/api/pageindex/node/${id}`);
    if (r.status !== 200) throw new Error(`${id} → ${r.status}`);
    out.push(`${id}: ${JSON.parse(r.body).act_name}`);
  }
  const missing = await api("/api/pageindex/node/NOPE-1/S-1");
  if (missing.status !== 404) throw new Error(`unknown node → ${missing.status}, want 404`);
  return out.join(" | ");
});

await step("document templates come from the DB", async () => {
  const r = await api("/api/document_templates?type=cheque_bounce_notice");
  if (r.status !== 200 || !r.body.includes("Section 138")) throw new Error(`${r.status} ${r.body.slice(0, 120)}`);
});

await step("export PDF through storage signed URL", async () => {
  const r = await api(`/api/documents/${docId}/export?format=pdf`, { method: "POST" });
  if (r.status !== 200) throw new Error(`export ${r.status} ${r.body.slice(0, 200)}`);
  const { url } = JSON.parse(r.body);
  const head = await page.evaluate(async (u) => {
    const f = await fetch(u);
    const b = new Uint8Array(await f.arrayBuffer());
    return { status: f.status, magic: String.fromCharCode(...b.slice(0, 5)), size: b.length };
  }, url);
  if (head.status !== 200 || head.magic !== "%PDF-") throw new Error(JSON.stringify(head));
  return `pdf ${head.size} bytes`;
});

await step("export DOCX", async () => {
  const r = await api(`/api/documents/${docId}/export?format=docx`, { method: "POST" });
  if (r.status !== 200) throw new Error(`export ${r.status} ${r.body.slice(0, 200)}`);
});

await step("dashboard lists both documents", async () => {
  await go("/en/dashboard");
  const r = JSON.parse((await api("/api/documents?limit=10")).body);
  if (r.documents.length < 2) throw new Error(`only ${r.documents.length} documents`);
  return r.documents.map((d) => `${d.doc_type}:${d.status}`).join(", ");
});

await step("settings page loads profile", async () => {
  await go("/en/settings");
  await page.waitForFunction(() => document.body.innerText.includes("E2E Tester"), { timeout: 30_000 });
});

await step("non-admin is kept out of /admin", async () => {
  await go("/en/admin");
  if (page.url().includes("/admin")) throw new Error(`non-admin reached ${page.url()}`);
});

await step("admin can open dashboard + audit + CSV export", async () => {
  psql(`update public.users set role = 'admin' where email = '${email}'`);
  await go("/en/admin");
  if (!page.url().includes("/admin")) throw new Error(`admin bounced to ${page.url()}`);
  await go("/en/admin/audit");
  const csv = await api(`/api/admin/audit-export?from=2026-01-01&to=2027-01-01`);
  if (csv.status !== 200) throw new Error(`audit-export ${csv.status}`);
  return `csv ${csv.body.split("\n").length - 1} rows`;
});

await step("Hindi UI renders", async () => {
  await go("/hi/dashboard");
  const hasDevanagari = await page.evaluate(() => /[ऀ-ॿ]/.test(document.body.innerText));
  if (!hasDevanagari) throw new Error("no Devanagari text on /hi/dashboard");
});

await step("account deletion is scheduled for real", async () => {
  const r = await api("/api/users/me", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) });
  if (r.status !== 200) throw new Error(`DELETE ${r.status} ${r.body.slice(0, 120)}`);
  if (psql(`select deleted_at is not null from public.users where email = '${email}'`) !== "t") throw new Error("deleted_at not stamped");
});

await browser.close();

console.table(results.map(({ step, ok, ms, note }) => ({ step, ok: ok ? "PASS" : "FAIL", ms, note })));
if (serverErrors.length) console.log("\nHTTP 5xx seen:\n  " + [...new Set(serverErrors)].join("\n  "));
if (consoleErrors.length) console.log("\nBrowser console errors:\n  " + [...new Set(consoleErrors)].slice(0, 15).join("\n  "));
console.log(`\nTest user: ${email}   Screenshots: ${SHOTS}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
