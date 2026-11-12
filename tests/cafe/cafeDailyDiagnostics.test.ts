/**
 * Simulated Daily diagnostics — not live API, not browser join.
 */
import assert from "node:assert/strict";
import {
  extractDailyRejectedField,
  isDailyExistingRoomConflict,
  isDailyRecordingEnabled,
  readDailyErrorDiagnostic,
  sanitizeDailyDiagnosticText,
} from "@/lib/cafe/providers/dailyDiagnostics";

assert.equal(isDailyRecordingEnabled(undefined), false);
assert.equal(isDailyRecordingEnabled(null), false);
assert.equal(isDailyRecordingEnabled(""), false);
assert.equal(isDailyRecordingEnabled("off"), false);
assert.equal(isDailyRecordingEnabled("cloud"), true);
assert.equal(isDailyRecordingEnabled(["local"]), true);
assert.equal(isDailyRecordingEnabled([]), false);

assert.equal(
  extractDailyRejectedField("invalid value for property enable_recording: off"),
  "enable_recording",
);
assert.equal(isDailyExistingRoomConflict(409, { errorCode: null, info: null }), true);
assert.equal(
  isDailyExistingRoomConflict(400, {
    errorCode: "invalid-request-error",
    info: "a room with that name already exists",
  }),
  true,
);
assert.equal(
  isDailyExistingRoomConflict(400, {
    errorCode: "invalid-request-error",
    info: "invalid value for property enable_recording: off",
  }),
  false,
);

const redacted = sanitizeDailyDiagnosticText(
  "Bearer sk_live_abc email@example.com https://evil.example/x?t=secret",
);
assert.ok(redacted);
assert.equal(redacted.includes("Bearer sk_"), false);
assert.equal(redacted.includes("email@"), false);
assert.equal(redacted.includes("https://"), false);

void (async () => {
  const response = new Response(
    JSON.stringify({
      error: "invalid-request-error",
      info: "invalid value for property enable_recording: off",
      secret_provider_detail: "never-log-this",
    }),
    {
      status: 400,
      headers: { "x-daily-request-id": "req_abc", "Content-Type": "application/json" },
    },
  );
  const diagnostic = await readDailyErrorDiagnostic(response, "room_create");
  assert.equal(diagnostic.httpStatus, 400);
  assert.equal(diagnostic.operation, "room_create");
  assert.equal(diagnostic.rejectedField, "enable_recording");
  assert.equal(diagnostic.requestId, "req_abc");
  assert.equal(JSON.stringify(diagnostic).includes("never-log-this"), false);

  console.log("[cafe:daily-diagnostics] sanitization + conflict detection (simulated) passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
