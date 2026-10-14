import assert from "node:assert/strict";
import { send } from "@/lib/email/transport";

async function main() {
  const original = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "re_mock_only";
  let mode = "reject";
  let key: string | null = null;
  globalThis.fetch = async (_url, init) => {
    key = new Headers(init?.headers).get("idempotency-key");
    if (mode === "timeout") throw new Error("mock timeout");
    return new Response(JSON.stringify(mode === "reject"
      ? { name: "validation_error", message: "mock rejection" } : { id: "mock-email" }),
    { status: mode === "reject" ? 422 : 200, headers: { "content-type": "application/json" } });
  };
  try {
    const input = { to: "fixture@example.test", subject: "Test", html: "Test", idempotencyKey: "learner-demand/mock-id" };
    assert.equal(await send(input), false);
    mode = "timeout";
    assert.equal(await send(input), false);
    mode = "accept";
    assert.equal(await send(input), true);
    assert.equal(key, input.idempotencyKey);
    console.log("PASS mocked transport: resolved rejection, timeout, acceptance, stable idempotency key");
  } finally {
    globalThis.fetch = original;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
