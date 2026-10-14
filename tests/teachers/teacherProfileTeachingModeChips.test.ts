/**
 * Profile teaching-mode chips are calm slate metadata, not teal CTAs.
 * Display only — booking flow, payments, and teacher_offers stay untouched.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import {
  PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS,
  PUBLIC_TEACHER_PROFILE_TEACHING_MODE_CHIP_CLASS,
} from "@/lib/teachers/display";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

const PROFILE = read("components/TeacherProfile.tsx");
const BOOKING = read("components/BookingModal.tsx");
const PKG = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
function courseOptions(source: string): string {
  const file = ts.createSourceFile("profile.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const matches: ts.JsxElement[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some((attribute) =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(file) === "data-testid" &&
      attribute.initializer && ts.isStringLiteral(attribute.initializer) &&
      attribute.initializer.text === "teacher-profile-course-options",
    )) matches.push(node);
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.equal(matches.length, 1, "exactly one teaching-mode container must exist");
  return matches[0].getText(file);
}
const OPTIONS = courseOptions(PROFILE);

test("selector excludes sibling zones but catches forbidden content inside options", () => {
  const source = '<><div data-testid="teacher-profile-course-options"><span>Modes</span></div><div className="bg-teal-50">Zones</div></>';
  assert.doesNotMatch(courseOptions(source), /bg-teal-/);
  assert.match(courseOptions(source.replace("<span>", '<span className="bg-teal-50">')), /bg-teal-/);
  assert.match(courseOptions(source.replace("<span>Modes</span>", "<button>Modes</button>")), /<button/);
  assert.throws(() => courseOptions("<div />"), /exactly one/);
});

test("profile still renders teaching-mode chips with existing labels", () => {
  assert.match(PROFILE, /teacher-profile-course-options/);
  assert.match(PROFILE, /label: t\("filterInPerson"\)/);
  assert.match(PROFILE, /label: t\("filterOnline"\)/);
  assert.match(PROFILE, /label: t\("modeHome"\)/);
  assert.match(PROFILE, /teachingModes\.map/);
});

test("teaching-mode chips share the calm discipline-pill family and are not teal", () => {
  assert.ok(PUBLIC_TEACHER_PROFILE_TEACHING_MODE_CHIP_CLASS.includes(PUBLIC_TEACHER_PROFILE_DISCIPLINE_CHIP_CLASS));
  assert.match(PUBLIC_TEACHER_PROFILE_TEACHING_MODE_CHIP_CLASS, /bg-slate-50/);
  assert.match(PUBLIC_TEACHER_PROFILE_TEACHING_MODE_CHIP_CLASS, /text-slate-700/);
  assert.match(PUBLIC_TEACHER_PROFILE_TEACHING_MODE_CHIP_CLASS, /border-slate-200/);
  assert.doesNotMatch(PUBLIC_TEACHER_PROFILE_TEACHING_MODE_CHIP_CLASS, /bg-teal-|text-teal-|border-teal-|emerald/);
  assert.doesNotMatch(PUBLIC_TEACHER_PROFILE_TEACHING_MODE_CHIP_CLASS, /hover:/);
  assert.match(PROFILE, /PUBLIC_TEACHER_PROFILE_TEACHING_MODE_CHIP_CLASS/);
  assert.doesNotMatch(OPTIONS, /bg-teal-|text-teal-|border-teal-|bg-emerald-|text-emerald-/);
});

test("teaching-mode chips are static metadata, not buttons", () => {
  assert.doesNotMatch(OPTIONS, /<button/);
  assert.match(OPTIONS, /<div\s+key=\{String\(m\.label\)\}/);
  assert.match(PROFILE, /aria-hidden/);
});

test("primary booking CTA stays the action and booking math is unchanged", () => {
  assert.match(PROFILE, /onClick=\{handlePrimaryAction\}/);
  assert.match(PROFILE, /const handlePrimaryAction[\s\S]*openBooking\("standard"\)/);
  assert.match(PROFILE, /palette-teal-700/);
  assert.match(PROFILE, /t\(teacherBookingActionKey\(teacher\.bookingAction\)\)/);
  assert.match(BOOKING, /payableAmountCents/);
  assert.match(BOOKING, /handleConfirmAndPay/);
  assert.doesNotMatch(PROFILE, /from ["']stripe["']/);
  assert.doesNotMatch(PROFILE, /teacherOffersClient|teacher_offer_id/);
  assert.doesNotMatch(OPTIONS, /onBook\(/);
});

test("this contract is wired into npm run test:taxonomy and test:launch-critical", () => {
  assert.match(
    PKG.scripts?.["test:taxonomy"] ?? "",
    /tests\/teachers\/teacherProfileTeachingModeChips\.test\.ts/,
  );
  assert.match(
    PKG.scripts?.["test:launch-critical"] ?? "",
    /tests\/teachers\/teacherProfileTeachingModeChips\.test\.ts/,
  );
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
    passed += 1;
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(`[teachers:teacherProfileTeachingModeChips] ${passed} tests passed`);
}
