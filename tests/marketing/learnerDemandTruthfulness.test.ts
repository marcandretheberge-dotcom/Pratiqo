import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Teacher } from "@/types";
import { buildTeacherRecruitShareUrl, matchLearnerDemand } from "@/lib/learnerDemand";
import { matchesLearnerAvailability } from "@/lib/learnerAvailability";
import { hasDeclaredLocalSupply } from "@/lib/teachers/localSupply";

const teacher = {
  id: "test-teacher", name: "Teacher", discipline: "Français", category: "Langues",
  city: "Saint-Georges", teachingMode: "both", bookingReady: true,
  location: { lat: 46.117, lng: -70.67 }, pricePerLesson: 45, bio: "", imageUrl: "",
  availability: [], rating: 0, reviews: 0,
  distance: 0, isVerified: true, languages: [], levels: [],
} as Teacher;
const need = { subject: "Français", city: "Saint-Georges", acceptsOnline: false };
assert.equal(matchLearnerDemand([teacher], need).outcome, "local_match");
assert.equal(matchLearnerDemand([teacher, teacher], need).matchCount, 1);
assert.equal(matchLearnerDemand([{ ...teacher, bookingReady: false, bookingAction: "request" }], need).outcome, "local_match");
assert.equal(matchLearnerDemand([{ ...teacher, bookingReady: false, bookingAction: "contact" }], need).outcome, "waitlist");
assert.equal(matchLearnerDemand([{ ...teacher, discipline: "Langues", additionalDisciplines: [{ disciplineId: "langues", specialite: "Français" }] }], need).outcome, "local_match");
for (const patch of [{ bookingReady: false }, { bookingReady: null }, { discipline: "Espagnol" },
  { discipline: "Langues" }, { teachingMode: "online" }, { city: "Québec" }]) {
  assert.equal(matchLearnerDemand([{ ...teacher, ...patch } as Teacher], need).outcome, "waitlist", JSON.stringify(patch));
}
assert.equal(matchLearnerDemand([teacher], { ...need, subject: "French" }).outcome, "local_match");
assert.equal(matchLearnerDemand([teacher], { ...need, subject: "besoin libre inconnu" }).outcome, "waitlist");
const online = matchLearnerDemand([{ ...teacher, teachingMode: "online", city: "Québec" }], { ...need, acceptsOnline: true });
assert.equal(online.outcome, "online_match");
assert.equal(new URL(online.searchUrl!, "https://example.test").searchParams.get("city"), need.city);
assert.equal(new URL(online.searchUrl!, "https://example.test").searchParams.get("format"), "online");
assert.equal(need.city, "Saint-Georges");
assert.doesNotMatch(buildTeacherRecruitShareUrl("contact me at private@example.test", "123 Private Street"), /private|123|example/i);
assert.equal(matchLearnerDemand([teacher], { ...need, requestedFormat: "online" }).outcome, "online_match");
assert.equal(matchLearnerDemand([{ ...teacher, teachingMode: "person" }], { ...need, requestedFormat: "online" }).outcome, "waitlist");
assert.equal(hasDeclaredLocalSupply({ teaching_mode: "online", city: need.city }, { name: need.city, lat: 46, lng: -70 }), false);
assert.equal(matchesLearnerAvailability("weekday_day", "2026-10-12", 17 * 60, 60), true);
assert.equal(matchesLearnerAvailability("weekday_day", "2026-10-12", 17 * 60 + 30, 60), false);
assert.equal(matchesLearnerAvailability("weekday_evening", "2026-10-12", 18 * 60, 60), true);
assert.equal(matchesLearnerAvailability("weekend", "2026-10-12", 12 * 60, 60), false);
assert.equal(matchesLearnerAvailability("weekend", "2026-10-17", 12 * 60, 60), true);

const api = readFileSync("app/api/learner-demand/route.ts", "utf8");
const ui = readFileSync("components/marketing/LearnerTeacherFinder.tsx", "utf8");
const landing = readFileSync("app/(marketing)/trouver-mon-prof/page.tsx", "utf8");
assert.doesNotMatch(landing, /Ta demande reste active|Your request stays active|Tu solicitud sigue activa/);
assert.match(landing, /tu peux choisir d'enregistrer ta demande/);
const sql = readFileSync("supabase/migrations/129_learner_demand_consent.sql", "utf8");
assert.match(api, /input.alertConsent !== true \|\| input.adultContactConfirmed !== true/);
assert.match(api, /marketing_consent: false/);
assert.match(api, /subject_normalized: resolveDisciplineId\(input.subject\) \?\? foldLearnerDemandText\(input.subject\)/);
assert.doesNotMatch(api, /parseReferrerAttribution|utm_source:/);
assert.match(ui, /\[alertConsent, setAlertConsent\] = useState\(false\)/);
assert.match(ui, /\[acceptsOnline, setAcceptsOnline\] = useState\(false\)/);
assert.match(ui, /t\("learnerFunnelEmpty"\)/);
assert.match(sql, /OLD.status IN \('notified', 'converted', 'closed'\)/);
assert.match(sql, /REVOKE ALL ON public.learner_unmet_demand_summary FROM PUBLIC, anon, authenticated/);
const responseStart = api.indexOf("const publicResult =");
assert.ok(responseStart > 0);
const response = api.slice(responseStart, api.indexOf("// Searching", responseStart));
assert.doesNotMatch(response, /email:|adult_contact|availability_preference/);
console.log("learner demand truthfulness: PASS (matching, availability, consent, privacy, delivery-state guards)");
