import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildEvalRuns,
  handleAdminEvals,
  isAdminUser,
  handleAdminEvalRun,
  buildCitationRows,
} from "../../../apps/web/app/api/admin/evals/lib";

type TraceRow = {
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number;
  timestamp: string;
};

type AdminUser = {
  id?: string;
  user_metadata?: { role?: string | null } | null;
  app_metadata?: { role?: string | null } | null;
} | null;

function createSupabaseMock({
  user,
  traces,
  queryError,
  insertedRunId,
}: {
  user: AdminUser;
  traces: TraceRow[];
  queryError?: string | null;
  insertedRunId?: string;
}) {
  // The mock drives admin authorisation from the same role claim the test
  // sets on `user.user_metadata.role`. In production this role is now read
  // from public.users via isAdminViaDb, so the mock's `from('users')`
  // branch returns that role to match the production flow.
  const roleFromUser =
    user?.user_metadata?.role ?? user?.app_metadata?.role ?? null;

  return {
    auth: {
      async getUser() {
        return {
          data: { user },
          error: null,
        };
      },
    },
    from(table: string) {
      if (table === "users") {
        return {
          select() {
            return {
              eq() {
                return {
                  async single() {
                    return {
                      data: { role: roleFromUser },
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      }
      if (table === "agent_traces") {
        return {
          select() {
            return {
              order() {
                return {
                  async range(from: number, to: number) {
                    return {
                      data: traces.slice(from, to + 1),
                      error: queryError ? { message: queryError } : null,
                    };
                  },
                };
              },
            };
          },
        };
      }
      // eval_runs
      return {
        insert() {
          return {
            select() {
              return {
                async single() {
                  return {
                    data: insertedRunId ? { id: insertedRunId } : null,
                    error: insertedRunId ? null : { message: "insert failed" },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

test("admin eval endpoint returns EvalRunResult shape", async () => {
  const response = await handleAdminEvals(
    createSupabaseMock({
      user: { id: "test-user-admin", user_metadata: { role: "admin" } },
      traces: [
        {
          model: "gpt-4",
          tokens_in: 100,
          tokens_out: 50,
          cost_usd: 0.25,
          latency_ms: 120,
          timestamp: "2026-05-25T08:00:00.000Z",
        },
      ],
    }),
  );

  assert.equal(response.status, 200);

  const payload = await readJson(response);
  assert.ok(Array.isArray(payload.runs));
  assert.equal((payload.runs as Array<Record<string, unknown>>).length, 1);
  assert.deepEqual((payload.runs as Array<Record<string, unknown>>)[0].dataset_id, "prod-traces");
});

test("only admin users can access the endpoint", async () => {
  const response = await handleAdminEvals(
    createSupabaseMock({
      user: { id: "test-user-member", user_metadata: { role: "member" } },
      traces: [],
    }),
  );

  assert.equal(response.status, 403);
  const payload = await readJson(response);
  assert.equal(payload.error, "forbidden");
});

test("includes all history, not just a recent window", () => {
  const runs = buildEvalRuns(
    [
      {
        model: "gpt-4",
        tokens_in: 100,
        tokens_out: 50,
        cost_usd: 0.25,
        latency_ms: 120,
        timestamp: "2026-05-10T08:00:00.000Z",
      },
      {
        model: "gpt-4",
        tokens_in: 200,
        tokens_out: 75,
        cost_usd: 0.5,
        latency_ms: 180,
        timestamp: "2026-05-20T08:00:00.000Z",
      },
    ],
  );

  assert.deepEqual(runs.map((r) => r.run_id), ["run-2026-05-20-gpt-4", "run-2026-05-10-gpt-4"]);
});

test("metrics are aggregated correctly", async () => {
  const response = await handleAdminEvals(
    createSupabaseMock({
      user: { id: "test-user-admin", user_metadata: { role: "admin" } },
      traces: [
        {
          model: "claude-opus",
          tokens_in: 100,
          tokens_out: 30,
          cost_usd: 0.4,
          latency_ms: 100,
          timestamp: "2026-05-25T08:00:00.000Z",
        },
        {
          model: "claude-opus",
          tokens_in: 200,
          tokens_out: 20,
          cost_usd: 0.6,
          latency_ms: 200,
          timestamp: "2026-05-25T09:00:00.000Z",
        },
        {
          model: "claude-opus",
          tokens_in: 50,
          tokens_out: 10,
          cost_usd: 0.1,
          latency_ms: 500,
          timestamp: "2026-05-25T10:00:00.000Z",
        },
      ],
    }),
  );

  const payload = (await response.json()) as { runs: Array<{ metrics: Array<{ name: string; value: number }> }> };
  const run = payload.runs[0];

  assert.equal(run.metrics.find((metric) => metric.name === "total_calls")?.value, 3);
  assert.equal(run.metrics.find((metric) => metric.name === "total_tokens_in")?.value, 350);
  assert.equal(run.metrics.find((metric) => metric.name === "total_tokens_out")?.value, 60);
  assert.equal(run.metrics.find((metric) => metric.name === "total_cost_usd")?.value, 1.1);
  assert.equal(run.metrics.find((metric) => metric.name === "p50_latency_ms"), undefined);
});

test("empty results are handled gracefully", async () => {
  const response = await handleAdminEvals(
    createSupabaseMock({
      user: { id: "test-user-admin", user_metadata: { role: "admin" } },
      traces: [],
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as { runs: unknown[] };
  assert.deepEqual(payload.runs, []);
});

test("admin role helpers work as expected", () => {
  assert.equal(isAdminUser({ user_metadata: { role: "admin" } }), true);
  assert.equal(isAdminUser({ app_metadata: { role: "admin" } }), true);
  assert.equal(isAdminUser({ user_metadata: { role: "member" } }), false);
});

test("admin eval run endpoint queues a run and returns run_id", async () => {
  const response = await handleAdminEvalRun(
    createSupabaseMock({
      user: { id: "user-1", user_metadata: { role: "admin" } },
      traces: [],
      insertedRunId: "run-123",
    }),
    {
      dataset_id: "prod-traces",
      models: ["claude-opus", "gpt-4"],
    },
    new Date("2026-05-25T12:00:00.000Z"),
  );

  assert.equal(response.status, 202);
  const payload = (await response.json()) as { run_id: string };
  assert.equal(payload.run_id, "run-123");
});

test("admin eval run endpoint rejects invalid payloads", async () => {
  const response = await handleAdminEvalRun(
    createSupabaseMock({
      user: { id: "user-1", user_metadata: { role: "admin" } },
      traces: [],
      insertedRunId: "run-123",
    }),
    { dataset_id: "prod-traces", models: [] },
    new Date("2026-05-25T12:00:00.000Z"),
  );

  assert.equal(response.status, 400);
});

test("pages through more than one PostgREST page of traces", async () => {
  const traces = Array.from({ length: 2500 }, (_, i) => ({
    model: "gpt-4",
    tokens_in: 1,
    tokens_out: 1,
    cost_usd: 0,
    latency_ms: 0,
    timestamp: "2026-05-25T08:00:00.000Z",
  }));
  const response = await handleAdminEvals(
    createSupabaseMock({ user: { id: "a", user_metadata: { role: "admin" } }, traces }),
  );
  const payload = (await response.json()) as { runs: Array<{ metrics: Array<{ name: string; value: number }> }> };
  assert.equal(payload.runs[0].metrics.find((m) => m.name === "total_calls")?.value, 2500);
});

test("citation rows: validity from cited/rejected nodes, old rejected traces stay unknown", () => {
  const base = { created_at: "2026-11-22T10:00:00.000Z", document_id: "d1", documents: { title: "RTI", doc_type: "rti_application", language: "gu" } };
  const [mixed, oldPassed, oldRejected, noCites, errored] = buildCitationRows([
    { ...base, id: "1", status: "error", metadata: { agent_status: "rejected", cited_nodes: ["a", "b", "c"], rejected_nodes: ["x"] } },
    { ...base, id: "2", status: "ok", metadata: { agent_status: "ok", cited_nodes: ["a", "b"] } },
    { ...base, id: "3", status: "error", metadata: { agent_status: "rejected", cited_nodes: ["a"] } },
    { ...base, id: "4", status: "error", metadata: { agent_status: "rejected", cited_nodes: [], rejected_nodes: [] } },
    { ...base, id: "5", status: "error", metadata: { agent_status: "error", cited_nodes: [] } },
  ]);
  assert.deepEqual([mixed.status, mixed.valid, mixed.invalid, mixed.total, mixed.validity_pct], ["rejected", 3, 1, 4, 75]);
  assert.deepEqual([oldPassed.status, oldPassed.invalid, oldPassed.validity_pct], ["passed", 0, 100]);
  assert.deepEqual([oldRejected.invalid, oldRejected.total, oldRejected.validity_pct], [null, null, null]);
  assert.deepEqual([noCites.total, noCites.validity_pct], [0, null]);
  assert.equal(errored.status, "error");
  assert.equal(mixed.document_title, "RTI");
});
