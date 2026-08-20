/**
 * PR 15 — Teacher offer cover image upload (validation, path, route guards, UI wiring).
 * Static + unit tests only (mocked helpers; no live Supabase Storage).
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildTeacherOfferCoverStoragePath,
  extractTeacherOfferCoverStoragePath,
  isAllowedTeacherOfferCoverMime,
  isTeacherOfferCoverStoragePath,
  TEACHER_OFFER_COVER_BUCKET,
  TEACHER_OFFER_COVER_MAX_BYTES,
  validateTeacherOfferCoverFile,
} from "../../lib/offers/offerCoverImages";
import {
  parseTeacherOfferCreateInput,
  parseTeacherOfferUpdateInput,
  teacherOfferCreateToInsertRow,
  teacherOfferUpdateToPatchRow,
} from "../../lib/offers/validation";
import { isTeacherOfferFormPublishReady } from "../../lib/offers/publishReadiness";
import { emptyTeacherOfferFormValues } from "../../lib/offers/clientPayload";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const COVER_ROUTE = "app/api/teacher/offers/[offerId]/cover/route.ts";
const MIGRATION = "supabase/migrations/104_teacher_offer_covers_bucket.sql";
const HELPERS = "lib/offers/offerCoverImages.ts";
const FORM = "components/teacher/TeacherOfferForm.tsx";
const UPLOAD = "components/teacher/TeacherOfferCoverUpload.tsx";
const COVER_IMG = "components/teacher/TeacherOfferCoverImage.tsx";
const PREVIEW = "components/teacher/TeacherOfferPreview.tsx";
const DASH_CARD = "components/teacher/TeacherOfferCard.tsx";
const PUBLIC_CARD = "components/teacher/PublicTeacherOfferCard.tsx";
const DASHBOARD = "components/teacher/TeacherOffersDashboard.tsx";
const VALIDATION = "lib/offers/validation.ts";

test("migration creates public teacher-offer-covers bucket with size/mime limits", () => {
  assert.equal(existsSync(join(ROOT, MIGRATION)), true);
  const sql = read(MIGRATION);
  assert.match(sql, /teacher-offer-covers/);
  assert.match(sql, /3145728/);
  assert.match(sql, /image\/jpeg/);
  assert.match(sql, /image\/png/);
  assert.match(sql, /image\/webp/);
  assert.match(sql, /public\s*=\s*true|public,\s*\n\s*true/);
  assert.match(sql, /Teacher offer covers are publicly readable/);
  assert.doesNotMatch(sql, /for insert[\s\S]*teacher-offer-covers/);
});

test("cover helpers validate mime/size and reject SVG/GIF/empty/oversize", () => {
  assert.equal(TEACHER_OFFER_COVER_BUCKET, "teacher-offer-covers");
  assert.equal(TEACHER_OFFER_COVER_MAX_BYTES, 3 * 1024 * 1024);
  assert.equal(isAllowedTeacherOfferCoverMime("image/jpeg"), true);
  assert.equal(isAllowedTeacherOfferCoverMime("image/svg+xml"), false);
  assert.equal(isAllowedTeacherOfferCoverMime("image/gif"), false);
  assert.deepEqual(validateTeacherOfferCoverFile({ mime: "image/png", size: 100 }), {
    ok: true,
    mime: "image/png",
    size: 100,
  });
  assert.deepEqual(validateTeacherOfferCoverFile({ mime: "image/svg+xml", size: 100 }), {
    ok: false,
    error: "unsupported_image_type",
  });
  assert.deepEqual(validateTeacherOfferCoverFile({ mime: "image/jpeg", size: 0 }), {
    ok: false,
    error: "invalid_file",
  });
  assert.deepEqual(
    validateTeacherOfferCoverFile({
      mime: "image/jpeg",
      size: TEACHER_OFFER_COVER_MAX_BYTES + 1,
    }),
    { ok: false, error: "image_too_large" },
  );
});

test("cover storage path is constrained to teacherId/offerId/uuid.webp", () => {
  const path = buildTeacherOfferCoverStoragePath({
    teacherId: "teacher-a",
    offerId: "offer-b",
    objectId: "abc123",
  });
  assert.equal(path, "teacher-a/offer-b/abc123.webp");
  assert.equal(isTeacherOfferCoverStoragePath(path, "teacher-a", "offer-b"), true);
  assert.equal(isTeacherOfferCoverStoragePath(path, "other", "offer-b"), false);
  assert.equal(isTeacherOfferCoverStoragePath("../evil.webp", "teacher-a", "offer-b"), false);
  assert.throws(() =>
    buildTeacherOfferCoverStoragePath({ teacherId: "a/b", offerId: "offer-b" }),
  );
});

test("extractTeacherOfferCoverStoragePath only parses owned public bucket URLs", () => {
  const base = "https://xyz.supabase.co/storage/v1/object/public/teacher-offer-covers/";
  assert.equal(
    extractTeacherOfferCoverStoragePath(`${base}t1/o1/u1.webp`),
    "t1/o1/u1.webp",
  );
  assert.equal(
    extractTeacherOfferCoverStoragePath(
      "https://xyz.supabase.co/storage/v1/object/public/avatars/x.png",
    ),
    null,
  );
});

test("cover route requires owned teacher auth and ownership checks", () => {
  const src = read(COVER_ROUTE);
  assert.match(src, /requireOwnedTeacher/);
  assert.match(src, /loadOwnedTeacherOffer/);
  assert.match(src, /export async function POST/);
  assert.match(src, /export async function DELETE/);
  assert.match(src, /validateTeacherOfferCoverFile/);
  assert.match(src, /buildTeacherOfferCoverStoragePath/);
  assert.match(src, /image_url/);
  assert.match(src, /offerNotFoundResponse/);
  assert.doesNotMatch(src, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("generic JSON create forces image_url null; update patch omits image_url", () => {
  const created = parseTeacherOfferCreateInput({
    title: "Piano",
    offer_type: "private_lesson",
    format: "online",
    price_cents: 4000,
    image_url: "https://evil.example/x.png",
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const insert = teacherOfferCreateToInsertRow(
    "teacher-1",
    "user-1",
    created.data,
    "2026-01-01T00:00:00.000Z",
  );
  assert.equal(insert.image_url, null);

  const updated = parseTeacherOfferUpdateInput({
    title: "Piano 2",
    image_url: "https://evil.example/hijack.png",
  });
  assert.equal(updated.ok, true);
  if (!updated.ok) return;
  assert.equal("imageUrl" in updated.data, false);
  const patch = teacherOfferUpdateToPatchRow(updated.data);
  assert.equal("image_url" in patch, false);

  const validationSrc = read(VALIDATION);
  assert.match(validationSrc, /Cover images are set only via POST\/DELETE/);
});

test("missing cover does not block draft or publish readiness helpers", () => {
  const draftValues = emptyTeacherOfferFormValues();
  draftValues.title = "Piano débutant";
  draftValues.offerType = "private_lesson";
  draftValues.format = "online";
  draftValues.priceDollars = "45";
  draftValues.disciplineId = "piano";
  draftValues.durationMinutes = "60";
  draftValues.shortDescription = "Cours de piano pour débutants.";
  // No cover image field on form values — publish readiness must not require it.
  assert.equal(isTeacherOfferFormPublishReady(draftValues), true);
});

test("builder, preview, dashboard, and public cards wire cover UI", () => {
  const form = read(FORM);
  assert.match(form, /TeacherOfferCoverUpload/);
  assert.match(form, /teacherOffersSectionPresentation/);
  assert.match(form, /coverImageUrl/);

  const upload = read(UPLOAD);
  assert.match(upload, /teacher-offer-cover-upload/);
  assert.match(upload, /teacherOffersCoverLabel/);
  assert.match(upload, /\/api\/teacher\/offers\/\$\{offerId\}\/cover/);
  assert.match(upload, /Remplacer|teacherOffersCoverReplace/);
  assert.match(upload, /teacherOffersCoverRemove/);

  const preview = read(PREVIEW);
  assert.match(preview, /TeacherOfferCoverImage/);
  assert.match(preview, /coverImageUrl/);

  const dashCard = read(DASH_CARD);
  assert.match(dashCard, /TeacherOfferCoverImage/);
  assert.match(dashCard, /offer\.imageUrl/);

  const publicCard = read(PUBLIC_CARD);
  assert.match(publicCard, /TeacherOfferCoverImage/);
  assert.match(publicCard, /teacherOffersCoverAlt/);

  const coverImg = read(COVER_IMG);
  assert.match(coverImg, /object-cover/);
  assert.match(coverImg, /onError/);
  assert.doesNotMatch(coverImg, /\/logo|Logo\.|pratiqo-logo|src=["'][^"']*logo/i);
  assert.match(coverImg, /Does not use the Pratiqo logo/);

  const dashboard = read(DASHBOARD);
  assert.match(dashboard, /onCoverUploaded/);
  assert.match(dashboard, /coverImageUrl/);
});

test("i18n cover keys exist in FR/EN/ES without employer wording", () => {
  for (const locale of ["fr", "en", "es"] as const) {
    const catalog = JSON.parse(read(`lib/i18n/locales/${locale}.json`)) as Record<string, string>;
    for (const key of [
      "teacherOffersCoverLabel",
      "teacherOffersCoverHint",
      "teacherOffersCoverFormats",
      "teacherOffersCoverMaxSize",
      "teacherOffersCoverReplace",
      "teacherOffersCoverRemove",
      "teacherOffersCoverAlt",
      "teacherOffersCoverTooLarge",
      "teacherOffersCoverUnsupported",
      "teacherOffersCoverUploadFailed",
    ]) {
      assert.equal(typeof catalog[key], "string", `${locale}:${key}`);
      assert.doesNotMatch(catalog[key], /Nos professeurs|Salaire|Employé|Mes formules/i);
    }
  }
  const fr = JSON.parse(read("lib/i18n/locales/fr.json")) as Record<string, string>;
  assert.match(fr.teacherOffersCoverLabel, /Image de couverture/);
  assert.match(fr.teacherOffersCoverHint, /profil public/);
});

test("PR 15 does not touch Stripe/checkout/package mutation surfaces", () => {
  const helpers = read(HELPERS);
  const route = read(COVER_ROUTE);
  for (const src of [helpers, route]) {
    assert.doesNotMatch(src, /stripe|checkout\.sessions|createCheckout/i);
    assert.doesNotMatch(src, /redeemPackage|reversePackage|remaining_sessions/);
    assert.doesNotMatch(src, /openai|dall-e|ai image|generateImage/i);
    assert.doesNotMatch(src, /Mes formules|\bformules\b/);
  }
  assert.doesNotMatch(helpers, /public catalog|featured offer|paid boost/i);
});

test("TODO notes future crop/moderation without implementing them", () => {
  const helpers = read(HELPERS);
  assert.match(helpers, /Future PR: optional image crop/);
  assert.doesNotMatch(helpers, /cropper|background.?removal|moderation.?automat/i);
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`fail - ${name}`);
    console.error(error);
  }
}

if (failed > 0) {
  console.error(`[offers:cover-images] ${failed} failed`);
  process.exit(1);
}
console.log("[offers:cover-images] tests passed");
