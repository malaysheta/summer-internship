import { describe, it, expect } from "vitest";
import { traceContext, withTraceContext } from "./index.js";

// The chain relies on the context surviving every await inside an agent call.
describe("traceContext", () => {
  it("is visible across awaits inside the wrapped call and gone outside it", async () => {
    const seen = await withTraceContext({ document_id: "d1", doc_type: "nda" }, async () => {
      await new Promise((r) => setTimeout(r, 1));
      await Promise.resolve();
      return traceContext.getStore();
    });
    expect(seen).toEqual({ document_id: "d1", doc_type: "nda" });
    expect(traceContext.getStore()).toBeUndefined();
  });

  it("keeps concurrent runs isolated", async () => {
    const run = (id: string) =>
      withTraceContext({ document_id: id }, async () => {
        await new Promise((r) => setTimeout(r, Math.random() * 5));
        return traceContext.getStore()?.document_id;
      });
    expect(await Promise.all([run("a"), run("b"), run("c")])).toEqual(["a", "b", "c"]);
  });
});
