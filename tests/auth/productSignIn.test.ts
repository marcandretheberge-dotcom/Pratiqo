import assert from "node:assert/strict";
import { test } from "node:test";
import { productArrivalPath, productLoginHref, productReturnPath, YO_ACCOUNT_PATH } from "@/lib/auth/productReturn";
import { clearProductAttempt, rememberProductAttempt, resumeOAuthCallback } from "@/lib/auth/productOAuthAttempt";
import { resolveAuthCallbackParams } from "@/lib/auth/pendingOnboardingIntent";
import { resolvePostLoginDestination } from "@/lib/auth/authenticatedLoginDestination";
import { resolveOAuthCallbackRedirect } from "@/lib/auth/oauthCallbackRedirect";

const origin = "https://pratiqo.test";
const lesson = "/yo/langues/italien/parcours/u01?lang=en&lecon=u01-l01&activite=u01-l01-a01&mission=continue#exercice";
const invite = "/cafe?" + new URLSearchParams({ salon: "f0000001-0000-4000-8000-000000000001", language: "it", yoReturn: lesson });
const teacherCookie = { get: (key: string) => key === "pratiqo_poi" ? { value: "teacher" } : undefined };

for (const path of [invite, lesson, "/cafe/appels/abc", "/yo/mon-parcours?demo=cours&step=2"]) {
  for (const role of ["student", "teacher", "admin"] as const) {
    test(`${role} resumes ${path.split("?")[0]} with a new or incomplete marketplace profile`, () => {
      const link = new URL(productLoginHref(path), origin);
      link.searchParams.set("intent", "student"); // Previously distributed reservation link.
      const state = resolveAuthCallbackParams(link, teacherCookie);
      assert.equal(state.intent, null);
      assert.equal(state.next, path);
      const profile = { role, teacher_onboarding_complete: false, companion_chosen: false };
      const expected = productArrivalPath(path);
      assert.equal(resolveOAuthCallbackRedirect({ ...state, role, profile }), expected);
      assert.equal(resolvePostLoginDestination({ nextPath: path, preAuthIntent: "teacher", profile }), expected);
      if (path === lesson) assert.equal(new URL(expected, origin).searchParams.get("reprendre"), lesson);
    });
  }
}

test("old personal hub bookmarks keep their state outside the marketplace", () => {
  assert.equal(productReturnPath("/student/yopratiqo/?step=2"), YO_ACCOUNT_PATH + "?step=2");
  assert.equal(productArrivalPath(YO_ACCOUNT_PATH + "?step=2"), YO_ACCOUNT_PATH + "?step=2");
});

test("return paths carry only recognized product navigation fields", () => {
  for (const path of [null, 42, "/dashboard", "/student/settings", "/yogurt", "//other.test", "/cafe/../admin", "/yo/%2e%2e/admin"]) {
    assert.equal(productReturnPath(path), null);
  }
  assert.equal(productReturnPath("/yo?code=private&lang=en"), "/yo?lang=en");
  assert.equal(productReturnPath("/cafe?yoReturn=https%3A%2F%2Fexample.org"), "/cafe");
  assert.equal(productReturnPath("/cafe?yoReturn=%2Fcafe"), "/cafe");
  assert.equal(productReturnPath("/cafe?yoReturn=%2Fyo%3FyoReturn%3D%252Fyo"), "/cafe");
});

test("each returning tab restores its own product and referral when the provider omits parameters", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  }});
  try {
    const id = rememberProductAttempt(invite, "friend");
    assert.ok(id);
    const recovery = (input: string) => new URL(resumeOAuthCallback(new URLSearchParams(input), "teacher"), origin).searchParams;
    assert.equal(recovery("product=yo&attempt=other").get("next"), "/yo");
    assert.equal(recovery("product=cafe&attempt=other").get("next"), "/cafe");
    const actual = recovery("ticket=local-test-code");
    assert.equal(actual.get("next"), invite);
    assert.equal(actual.get("ref"), "friend");
    assert.equal(actual.get("intent"), null);
    assert.equal(actual.get("code"), "local-test-code");
    assert.equal(entries.size, 0);
    assert.equal(recovery("product=cafe").get("next"), "/cafe");
    rememberProductAttempt(lesson);
    for (const [key, value] of entries) entries.set(key, JSON.stringify({ ...JSON.parse(value), expires: 1 }));
    assert.equal(recovery("").get("next"), "/yo");
    clearProductAttempt();
    assert.equal(recovery("").get("intent"), "teacher");
  } finally {
    if (previous) Object.defineProperty(globalThis, "sessionStorage", previous);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});

test("deliberate marketplace entry still starts or resumes the role-specific flow", () => {
  assert.equal(resolveAuthCallbackParams(new URL("/auth/callback?intent=teacher", origin), teacherCookie).next, "/onboarding/teacher");
  assert.equal(resolveAuthCallbackParams(new URL("/auth/callback?intent=student", origin), teacherCookie).next, "/student/choose-companion");
  assert.equal(resolvePostLoginDestination({ profile: { role: "student", dashboard: {} }, preAuthIntent: "teacher" }), "/onboarding/choose-role?intent=teacher");
  assert.equal(resolvePostLoginDestination({ profile: { role: "teacher", teacher_onboarding_complete: false }, preAuthIntent: "teacher" }), "/onboarding/teacher");
});
