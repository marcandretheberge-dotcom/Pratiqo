import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { guestBookingLogin, readBookingChoice, pendingGuestBookingPath, clearGuestBooking } from "../../lib/bookings/guestBookingIntent";
import { publicSearchFilters, filterPublicTeachers } from "../../lib/search/publicTeacherSearch";
import type { RawDiscoveryTeacher } from "../../lib/seo/localTeacherDiscoveryPages";
import { resolvePostAuthRedirect } from "../../lib/auth/postAuthRedirect";
import { STUDENT_ONBOARDING_CONSENT_VERSION } from "../../lib/auth/studentOnboardingConsent";

const store = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", { value: {
  getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key,value),
  removeItem: (key: string) => store.delete(key),
} });
const offer = "11111111-1111-4111-8111-111111111111";
const next = new URL(guestBookingLogin("teacher-a", "home", offer), "https://example.test").searchParams.get("next")!;
const target = new URL(next, "https://example.test");
assert.equal(target.pathname, "/teacher/profile/teacher-a");
assert.deepEqual(readBookingChoice(target.searchParams), {kind:"home", offerId:offer});
assert.equal(readBookingChoice(new URLSearchParams({book:"home",offer:"unavailable-id"})),null);
assert.equal(pendingGuestBookingPath(), next);
const enrolled = { companion_chosen: true, student_onboarding_consent_completed_at: "2026-11-24", student_onboarding_consent_version: STUDENT_ONBOARDING_CONSENT_VERSION, dashboard: {onboarding_role_confirmed:true} };
assert.equal(resolvePostAuthRedirect("student", enrolled, next), next);
clearGuestBooking();
assert.equal(pendingGuestBookingPath(),null);
const teacher = { name:"Guitar teacher",discipline:"Guitare",disciplineIds:["guitare"],teaching_mode:"both",city:"Saint-Georges" } as RawDiscoveryTeacher;
const remote = {...teacher,teaching_mode:"online",city:"Québec"};
assert.deepEqual(filterPublicTeachers([teacher,remote],publicSearchFilters({ q:"guitar", place:"Saint-Georges, QC",format:"in_person" })),[teacher]);
assert.equal(filterPublicTeachers([teacher,remote],publicSearchFilters({q:"guitarra",format:"online"})).length,2);
assert.equal(filterPublicTeachers([teacher],publicSearchFilters({place:"Montréal, QC",format:"hybrid"})).length,0);
const idPage = readFileSync("app/teacher/profile/[id]/page.tsx","utf8");
assert.match(idPage,/redirect\(`\/professeurs\/.+\$\{suffix\}/);
console.log("Anonymous filters, selected lesson, canonical return and onboarding continuation passed.");
