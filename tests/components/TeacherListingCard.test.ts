import assert from "node:assert/strict";
import type { Teacher } from "@/types";
import type { TranslationKey } from "@/lib/translations";
import {
  resolveTeacherListingCardModel,
  teacherListingCardTrustSignals,
} from "@/components/teachers/teacherListingCardUtils";

const t = (key: TranslationKey) => key;

const baseTeacher: Teacher = {
  id: "t-1",
  name: "Marie Tremblay",
  discipline: "Piano",
  category: "Musique",
  rating: 4.9,
  reviews: 12,
  distance: 0,
  pricePerLesson: 55,
  bio: "Professeure passionnée avec dix ans d'expérience en studio et à domicile.",
  imageUrl: "",
  availability: ["Lun 18h", "Mer 19h"],
  location: { lat: 45.5, lng: -73.6, neighborhood: "Plateau" },
  isVerified: true,
  teachingMode: "both",
  languages: ["fr"],
  levels: ["beginner"],
  introSessionEnabled: true,
  introSessionDurationMinutes: 45,
  identityVerified: true,
  diplomaVerified: false,
  homeLessonEnabled: true,
  city: "Montréal",
  region: "QC",
};

const landingModel = resolveTeacherListingCardModel({
  teacher: baseTeacher,
  variant: "landing",
  t,
  geo: { lat: 45.48, lng: -73.58 },
});

const searchModel = resolveTeacherListingCardModel({
  teacher: baseTeacher,
  variant: "search",
  t,
  distanceKm: 3.2,
});

assert.equal(landingModel.variant, "landing");
assert.equal(searchModel.variant, "search");
assert.ok(landingModel.cardShortName.includes("Marie"));
assert.ok(landingModel.distanceKm != null);
assert.ok(landingModel.formatSummary.length > 0);
assert.ok(landingModel.bioOneLine.length > 0);
assert.equal(landingModel.showViewProfileAffordance, false);
assert.equal(searchModel.showViewProfileAffordance, true);
assert.ok(searchModel.formatLabels.length > 0);
assert.equal(searchModel.showBio, false);

const landingTrust = teacherListingCardTrustSignals(landingModel);
assert.equal(landingTrust.verificationBadge, true);
assert.equal(landingTrust.rating, true);
assert.equal(landingTrust.locationLine, true);
assert.equal(landingTrust.price, true);
assert.equal(landingTrust.teachingFormat, true);
assert.equal(landingTrust.introBadge, true);
assert.equal(landingTrust.bio, true);
assert.equal(landingTrust.availability, true);
assert.equal(landingTrust.viewProfile, false);

const searchTrust = teacherListingCardTrustSignals(searchModel);
assert.equal(searchTrust.viewProfile, true);
assert.equal(searchTrust.bio, false);
assert.equal(searchTrust.introBadge, true);

console.log("[TeacherListingCard] ok");
