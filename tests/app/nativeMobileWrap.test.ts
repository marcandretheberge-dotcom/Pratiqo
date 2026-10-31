import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const pkg = JSON.parse(read("apps/mobile/package.json"));
assert.match(pkg.dependencies.expo, /58/);
assert.equal(pkg.dependencies["react-native-webview"], "14.0.1");
assert.equal(pkg.dependencies["@supabase/supabase-js"], "2.105.4");

const config = read("apps/mobile/app.config.ts");
assert.ok(config.includes('bundleIdentifier: "ca.pratiqo.app"'));
assert.ok(config.includes('package: "ca.pratiqo.app"'));
assert.ok(config.includes('scheme: "pratiqo"'));
assert.ok(config.includes("expo-web-browser"));

const app = read("apps/mobile/App.tsx");
for (const required of [
  "react-native-webview",
  "openAuthSessionAsync",
  "pratiqo://auth/callback",
  "hardwareBackPress",
  "onShouldStartLoadWithRequest",
  "mediaPlaybackRequiresUserAction",
  '"/upgrade"',
  '"/yo/checkout"',
  "applicationNameForUserAgent",
]) {
  assert.ok(app.includes(required), "missing mobile contract: " + required);
}
assert.ok(!app.includes("SUPABASE_SERVICE_ROLE_KEY"));
assert.ok(!app.includes("OPENAI_API_KEY"));
assert.ok(!app.includes("STRIPE_SECRET"));

const bridge = read("components/mobile/MobileNativeBridge.tsx");
assert.ok(bridge.includes("supabase.auth.setSession"));
assert.ok(bridge.includes("/api/auth/profile/ensure"));
assert.ok(bridge.includes("pratiqo:native-auth-session"));

const auth = read("lib/auth.ts");
assert.ok(auth.includes("postPratiqoNativeMessage"));
assert.ok(auth.includes('return loginWithOAuthProvider("google"'));
assert.ok(auth.includes('return loginWithOAuthProvider("apple"'));

const login = read("app/login/page.tsx");
assert.ok(login.includes("getPratiqoNativePlatform"));
assert.ok(login.includes("handleAppleLogin"));

const providers = read("app/providers.tsx");
assert.ok(providers.includes("MobileNativeBridge"));

const sw = read("components/PwaServiceWorker.tsx");
assert.ok(sw.includes("isPratiqoNativeApp"));
const prompt = read("components/app/InstallAppPrompt.tsx");
assert.ok(prompt.includes("isPratiqoNativeApp"));

const tsconfig = JSON.parse(read("tsconfig.json"));
assert.ok(tsconfig.exclude.includes("apps/mobile"));

console.log("[mobile-wrap] static contract passed");
