import assert from "node:assert/strict";
import {
  cafeLocalSandboxConnectSrcExtra,
  resolveCafeLocalSandboxConnectOrigin,
} from "../../lib/security/cafeLocalSandboxCsp";

assert.equal(resolveCafeLocalSandboxConnectOrigin({}), null);
assert.equal(cafeLocalSandboxConnectSrcExtra({}), "");

{
  const origin = resolveCafeLocalSandboxConnectOrigin({
    CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN: "http://127.0.0.1:55421",
    NODE_ENV: "development",
  });
  assert.equal(origin, "http://127.0.0.1:55421");
  const extra = cafeLocalSandboxConnectSrcExtra({
    CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN: "http://127.0.0.1:55421",
  });
  assert.match(extra, /http:\/\/127\.0\.0\.1:55421/);
  assert.match(extra, /ws:\/\/127\.0\.0\.1:55421/);
}

assert.throws(
  () =>
    resolveCafeLocalSandboxConnectOrigin({
      CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN: "http://127.0.0.1:55421",
      VERCEL_ENV: "production",
    }),
  /must not be set when VERCEL_ENV=production/,
);

assert.throws(
  () =>
    resolveCafeLocalSandboxConnectOrigin({
      CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN: "https://xyz.supabase.co",
    }),
  /hostname must be exactly/,
);
assert.throws(
  () =>
    resolveCafeLocalSandboxConnectOrigin({
      CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN: "http://127.0.0.1:55421/auth",
    }),
  /origin-only/,
);

{
  const extra = cafeLocalSandboxConnectSrcExtra({
    VERCEL_ENV: "production",
    NODE_ENV: "production",
    VERCEL: "1",
  });
  assert.equal(extra, "");
  assert.doesNotMatch(extra, /127\.0\.0\.1|localhost/);
}

console.log("[cafe:local-sandbox-csp] contract passed");
