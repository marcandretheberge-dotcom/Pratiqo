import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  displayNameForAuthProfile,
  parseProfileEnsureIntent,
  resolveEnsuredProfileRole,
} from "@/lib/auth/profileEnsure";
import {
  parsePublicPreAuthIntent,
  resolvePreAuthIntent,
} from "@/lib/auth/preAuthOnboardingIntent";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function readJson(rel: string): Record<string, string> {
  return JSON.parse(read(rel)) as Record<string, string>;
}

const EMAIL_PASSWORD_AUTH_SOURCES = [
  "app/login/page.tsx",
  "lib/auth.ts",
  "app/api/auth/profile/ensure/route.ts",
];

/** Generic auth failure labels — safe to log (no credential values). */
const SAFE_PASSWORD_LOG_LABEL =
  /(?:password reset failed|reset password failed|forgot password failed|email\/password auth failed)/i;

/** Logging patterns that expose credential material — must not appear in console calls. */
const UNSAFE_PASSWORD_LOG_PATTERNS: RegExp[] = [
  /\bcredentials\.password\b/,
  /\breq\.body\.password\b/,
  /\bbody\.password\b/,
  /\{\s*[^}]*\bemail\b[^}]*,\s*password\b/,
  /JSON\.stringify\([^)]*\bpassword\b/,
  /\bpassword\b\s*[,:=]\s*[a-zA-Z_$]/,
];

function extractConsoleCallArgs(source: string): string[] {
  const args: string[] = [];
  for (const line of source.split("\n")) {
    const match = line.match(/console\.(?:log|error|warn|debug|info)\((.*)\)\s*;?\s*$/);
    if (match) args.push(match[1]);
  }
  return args;
}

function assertNoSensitivePasswordLogging(sourcePaths: string[]) {
  const combined = sourcePaths.map(read).join("\n");
  assert.doesNotMatch(combined, /localStorage\.setItem\([^)]*password/i);
  assert.doesNotMatch(combined, /sessionStorage\.setItem\([^)]*password/i);

  for (const rel of sourcePaths) {
    for (const callArgs of extractConsoleCallArgs(read(rel))) {
      if (SAFE_PASSWORD_LOG_LABEL.test(callArgs)) continue;

      for (const unsafe of UNSAFE_PASSWORD_LOG_PATTERNS) {
        assert.doesNotMatch(
          callArgs,
          unsafe,
          `${rel} console call may log sensitive password data: ${callArgs.slice(0, 120)}`,
        );
      }

      if (/\bpassword\b/i.test(callArgs)) {
        const withoutStringLiterals = callArgs.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, "");
        assert.doesNotMatch(
          withoutStringLiterals,
          /\bpassword\b/i,
          `${rel} console call references password outside safe labels: ${callArgs.slice(0, 120)}`,
        );
      }
    }
  }
}

test("standard login page renders email-password auth without replacing Google", () => {
  const page = read("app/login/page.tsx");
  assert.match(page, /signInWithEmailPassword/);
  assert.match(page, /signUpWithEmailPassword/);
  assert.match(page, /sendPasswordResetEmail/);
  assert.match(page, /ensureAuthenticatedProfile/);
  assert.match(page, /loginEmailTitle/);
  assert.match(page, /loginCreateAccountTitle/);
  assert.match(page, /loginForgotPassword/);
  assert.match(page, /loginRememberMe/);
  assert.match(page, /loginContinueWithGoogle/);
  assert.match(page, /loginChangeGoogleAccount/);
  assert.doesNotMatch(page, /if \(!preAuthIntent && !user\)/);
  assert.doesNotMatch(page, /router\.replace\(qs \? `\$\{CONNEXION_PATH\}/);
});

test("student intent is accepted as learner intent for login links", () => {
  assert.equal(parsePublicPreAuthIntent("student"), "learner");
  assert.equal(resolvePreAuthIntent("student", null, null), "learner");
  assert.equal(resolvePreAuthIntent(null, null, "/student/choose-companion"), "learner");
});

test("email-password auth preserves teacher/student intent but allows generic login", () => {
  const page = read("app/login/page.tsx");
  const auth = read("lib/auth.ts");
  assert.match(page, /intent:\s*preAuthIntent \?\? undefined/);
  assert.match(page, /ensureAuthenticatedProfile\(\{ intent: preAuthIntent, displayName \}\)/);
  assert.match(page, /redirectAfterEnsuredProfile/);
  assert.match(auth, /signInWithPassword/);
  assert.match(auth, /signUp\(\{/);
  assert.match(auth, /emailRedirectTo/);
  assert.match(auth, /resetPasswordForEmail/);
  assert.match(auth, /prompt:\s*"select_account"/);
});

test("profile ensure API validates the Supabase user before using service role", () => {
  const route = read("app/api/auth/profile/ensure/route.ts");
  assert.match(route, /Authorization: `Bearer \$\{token\}`/);
  assert.match(route, /supabaseUser\.auth\.getUser\(\)/);
  assert.match(route, /getSupabaseAdmin\(\)/);
  assert.match(route, /ensureAuthProfileForUser/);
  assert.doesNotMatch(route, /full_name/);
  assert.doesNotMatch(route, /teacher_profiles/);
});

test("profile ensure uses schema-correct profile columns only", () => {
  const src = read("lib/auth/profileEnsure.ts");
  assert.match(src, /\.from\("profiles"\)/);
  assert.match(src, /select\("email, name, display_name, role, teacher_onboarding_complete, companion_chosen, dashboard"\)/);
  assert.match(src, /profileUpsert\.companion_chosen = false/);
  assert.match(src, /profileUpsert\.teacher_onboarding_complete = false/);
  assert.doesNotMatch(src, /full_name/);
  assert.doesNotMatch(src, /teacher_profiles/);
  assert.doesNotMatch(src, /ensureTeacherProfileRow/);
});

test("profile ensure role resolution preserves existing protected roles", () => {
  assert.equal(parseProfileEnsureIntent("teacher"), "teacher");
  assert.equal(parseProfileEnsureIntent("learner"), "learner");
  assert.equal(parseProfileEnsureIntent("student"), null);
  assert.equal(
    resolveEnsuredProfileRole({ intent: "teacher", existingRole: "student", email: "teacher@example.com" }),
    "teacher",
  );
  assert.equal(
    resolveEnsuredProfileRole({ intent: "learner", existingRole: "teacher", email: "teacher@example.com" }),
    "teacher",
  );
  assert.equal(
    resolveEnsuredProfileRole({ intent: null, existingRole: "admin", email: "admin@example.com" }),
    "admin",
  );
});

test("profile ensure display name uses auth metadata before email local part", () => {
  assert.equal(
    displayNameForAuthProfile({
      email: "marc@example.com",
      user_metadata: { display_name: "Marc-Andre" },
    }),
    "Marc-Andre",
  );
  assert.equal(
    displayNameForAuthProfile({
      email: "fallback@example.com",
      user_metadata: {},
    }),
    "fallback",
  );
});

test("email-password copy exists in FR, EN, and ES dictionaries", () => {
  const keys = [
    "loginEmailTitle",
    "loginCreateAccountTitle",
    "loginEmailLabel",
    "loginPasswordLabel",
    "loginEmailSubmit",
    "loginCreateAccountSubmit",
    "loginForgotPassword",
    "loginPasswordResetSent",
    "loginRememberMe",
    "loginOtherWays",
  ];
  for (const localePath of [
    "lib/i18n/locales/fr.json",
    "lib/i18n/locales/en.json",
    "lib/i18n/locales/es.json",
  ]) {
    const dictionary = readJson(localePath);
    for (const key of keys) {
      assert.equal(typeof dictionary[key], "string", `${localePath} missing ${key}`);
      assert.ok(dictionary[key].trim(), `${localePath} has empty ${key}`);
    }
  }
});

test("email-password auth does not store or log raw passwords", () => {
  assertNoSensitivePasswordLogging(EMAIL_PASSWORD_AUTH_SOURCES);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[auth:emailPasswordAuth] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
