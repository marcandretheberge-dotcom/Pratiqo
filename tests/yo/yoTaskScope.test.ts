import assert from "node:assert/strict";
import test from "node:test";
import { assertYoTaskScope, readYoTaskComparison, YO_TASK_SCOPES } from "./yoTaskScope";

test("both task policies accept lesson-only changes and reject actual restricted changes", () => {
  for (const scope of Object.keys(YO_TASK_SCOPES) as Array<keyof typeof YO_TASK_SCOPES>) {
    assert.doesNotThrow(() => assertYoTaskScope(scope, [
      "components/yo/DominicanRepublicIntroContent.tsx", "lib/yo/dominicanRepublicA1.ts",
    ]));
    for (const path of [
      "app/api/stripe/checkout/route.ts", "lib/payments/commission.ts",
      "supabase/migrations/example.sql", "content/legal/fr/terms.md",
      "lib/seo/localTeacherDiscoveryPages.ts", "public/audio/example.mp3",
      "scripts/generate-yopratiqo-audio.ts",
    ]) assert.throws(() => assertYoTaskScope(scope, [path]), /Outside/);
  }
});

test("task-specific restrictions remain distinct and cannot be bypassed by Windows separators", () => {
  assert.throws(() => assertYoTaskScope("flashcards-printables", ["app/api/unrelated/route.ts"]), /Outside/);
  assert.throws(() => assertYoTaskScope("intro-deck", ["app/sitemap.ts"]), /Outside/);
  assert.throws(() => assertYoTaskScope("intro-deck", ["lib\\payments\\refunds.ts"]), /Outside/);
});

test("comparison requires valid refs and resolves the exact immutable commit", () => {
  assert.throws(() => readYoTaskComparison("", "HEAD"), /explicit/);
  assert.throws(() => readYoTaskComparison("--help", "HEAD"), /explicit/);
  const comparison = readYoTaskComparison("HEAD", "HEAD");
  assert.match(comparison.baseSha, /^[a-f0-9]{40}$/);
  assert.equal(comparison.baseSha, comparison.headSha);
  assert.deepEqual(comparison.files, []);
});
