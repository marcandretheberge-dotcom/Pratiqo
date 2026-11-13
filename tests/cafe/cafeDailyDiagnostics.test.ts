/**
 * Simulated Daily diagnostics — not live API, not browser join.
 */
import assert from "node:assert/strict";
import { dailyDomainLabelsMatch } from "@/lib/cafe/providers/daily";
import {
  effectiveDailyBool,
  extractDailyRejectedField,
  fingerprintDailyRequestId,
  isDailyExistingRoomConflict,
  isDailyRecordingEnabled,
  publicCafeDailyDiagnostic,
  readDailyErrorDiagnostic,
  sanitizeDailyDiagnosticText,
} from "@/lib/cafe/providers/dailyDiagnostics";

assert.equal(dailyDomainLabelsMatch("pratiqo.daily.co", "pratiqo"), true);
assert.equal(dailyDomainLabelsMatch("pratiqo.daily.co", "pratiqo.daily.co"), true);
assert.equal(dailyDomainLabelsMatch("pratiqo.daily.co", "other"), false);
assert.equal(dailyDomainLabelsMatch("pratiqo.daily.co", null), false);

assert.equal(isDailyRecordingEnabled(undefined), false);
assert.equal(isDailyRecordingEnabled(false), false);
assert.equal(isDailyRecordingEnabled("cloud"), true);
assert.equal(isDailyRecordingEnabled(["local"]), true);
assert.equal(isDailyRecordingEnabled([]), false);
for (const malformed of [null, "", "off", true, 1, {}, "future-mode", ["future-mode"], ["cloud", null]]) {
  assert.equal(isDailyRecordingEnabled(malformed), null);
}

assert.equal(effectiveDailyBool(undefined, false), false);
assert.equal(effectiveDailyBool(undefined, true), true);
assert.equal(effectiveDailyBool(false, true), false);
assert.equal(effectiveDailyBool(true, false), true);
for (const malformed of [null, "true", "false", 1, 0, {}, []]) {
  assert.equal(effectiveDailyBool(malformed, false), null);
}

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

const fakeJwt = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX25hbWUiOiJUZXN0In0.syntheticSignature";
const fakeApiKey = "0123456789abcdef".repeat(4);
for (const untrustedText of [
  fakeJwt,
  `api_key=${fakeApiKey}`,
  "Bearer sk_live_abc email@example.com https://evil.example/x?t=secret",
  "Participant Test Person has an invalid token",
]) {
  assert.equal(sanitizeDailyDiagnosticText(untrustedText), null);
}
assert.equal(sanitizeDailyDiagnosticText("provider_field_rejected"), "provider_field_rejected");
assert.equal(extractDailyRejectedField(`invalid property ${fakeApiKey}`), null);
assert.equal(isDailyExistingRoomConflict(400, { errorCode: null, info: "duplicate property name" }), false);

const publicDiagnostic = publicCafeDailyDiagnostic({
  operation: "token_create",
  httpStatus: 400,
  errorCode: fakeJwt,
  info: `api_key=${fakeApiKey}`,
  rejectedField: fakeApiKey,
  requestId: fakeJwt,
});
assert.deepEqual(publicDiagnostic, {
  operation: "token_create", httpStatus: 400,
  errorCode: null, info: null, rejectedField: null, requestId: null,
});

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
  assert.equal(diagnostic.info, "provider_field_rejected");
  assert.equal(diagnostic.requestId, fingerprintDailyRequestId("req_abc"));
  assert.match(diagnostic.requestId ?? "", /^request_sha256:[a-f0-9]{24}$/);
  assert.equal(JSON.stringify(diagnostic).includes("req_abc"), false);
  assert.equal(JSON.stringify(diagnostic).includes("never-log-this"), false);
  assert.deepEqual(publicCafeDailyDiagnostic(diagnostic), diagnostic);

  for (const rawInfo of [
    `${fakeJwt} api_key=${fakeApiKey}`,
    `invalid value for property enable_recording: ${fakeJwt} api_key=${fakeApiKey}`,
    `a room named ${fakeJwt} already exists`,
  ]) {
    const rawResponse = Response.json({
      error: fakeJwt,
      info: rawInfo,
      invalid_parameter: fakeApiKey,
    }, {
      status: 400,
      headers: { "x-daily-request-id": `api_key=${fakeApiKey}` },
    });
    const safe = await readDailyErrorDiagnostic(rawResponse, "room_create");
    const serialized = JSON.stringify(safe);
    assert.equal(serialized.includes(fakeJwt), false);
    assert.equal(serialized.includes(fakeApiKey), false);
    assert.equal(serialized.includes("api_key="), false);
    assert.equal(safe.errorCode, null);
    assert.match(safe.requestId ?? "", /^request_sha256:[a-f0-9]{24}$/);
    if (rawInfo.includes("already exists")) {
      assert.equal(safe.info, "room_already_exists");
      assert.equal(isDailyExistingRoomConflict(400, safe), true);
    } else if (rawInfo.includes("enable_recording")) {
      assert.equal(safe.info, "provider_field_rejected");
      assert.equal(safe.rejectedField, "enable_recording");
      assert.equal(isDailyExistingRoomConflict(400, safe), false);
    } else {
      assert.equal(safe.info, "provider_request_rejected");
      assert.equal(safe.rejectedField, null);
    }
  }

  console.log("[cafe:daily-diagnostics] sanitization + conflict detection (simulated) passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
