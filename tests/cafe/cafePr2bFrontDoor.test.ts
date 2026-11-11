import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");

const front = read("app/cafe/CafeFrontDoor.tsx");
const page = read("app/cafe/page.tsx");
const detail = read("app/cafe/[slug]/CafeSessionDetails.tsx");
const detailPage = read("app/cafe/[slug]/page.tsx");
const card = read("components/cafe/CafeSessionCard.tsx");
const copy = read("lib/cafe/copy.ts");
const styles = read("app/cafe/cafe.module.css");
const publicTypes = read("lib/cafe/publicTypes.ts");

assert.match(front, /cafeCopy/);
assert.match(styles, /\/images\/yo\/mandarin\/cafe\.webp/);
assert.doesNotMatch(front + styles, /coffee\.avif|styles\.steam|\.steam/);

assert.match(front, /router\.push\("\/cafe\?step=format"\)/);
assert.match(front, /router\.push\("\/cafe\?step=groups"\)/);
assert.match(front, /useSearchParams/);
// Query-driven client navigation needs a boundary during Next production prerendering.
assert.match(page, /import \{ Suspense \} from "react"/);
assert.match(page, /<Suspense fallback=\{<AppLoadingFallback \/>\}>\s*<CafeFrontDoor \/>\s*<\/Suspense>/);
assert.doesNotMatch(page, /force-dynamic|"use client"/);
assert.match(front, /headingRef\.current\?\.focus\(\)/);
assert.match(front, /tabIndex=\{-1\}/);
assert.match(front, /role="status"/);
assert.match(front, /aria-live="polite"/);

assert.match(front, /aria-disabled="true"/);
assert.match(front, /copy\.soon/);
assert.match(front, /copy\.languageLabel/);
assert.match(front, /\/legal\/confidentialite/);

const doorSection = front.match(/view === "door"[\s\S]*?view === "choice"/)?.[0] ?? "";
assert.doesNotMatch(doorSection, /remaining_spots|confirmed_count|sessionsTitle|CafeSessionCard/);

assert.match(front, /fetch\("\/api\/cafe\/sessions"/);
assert.doesNotMatch(front + detail, /api\/cafe\/reservations/);
assert.match(detail, /disabledReservation/);
assert.match(detail, /disabled>/);
assert.match(copy, /La réservation n’est pas encore ouverte/);
assert.match(copy, /Le café n’est pas encore ouvert/);

assert.match(page, /index: false/);
assert.match(detailPage, /index: false/);
assert.match(page, /title: "Café des langues"/);
assert.match(detailPage, /title: "Table — Café des langues"/);
assert.doesNotMatch(page, /title: "[^"]*Pratiqo/);
assert.doesNotMatch(detailPage, /title: "[^"]*Pratiqo/);

// Capacity and aggregate counts are public by design. Identity-bearing fields
// and any public attendee/participant collection are not.
assert.doesNotMatch(
  publicTypes,
  /\b(profile_id|participant_id|avatar_url|host_profile_id|created_by_profile_id|email)\b/i,
);
assert.doesNotMatch(publicTypes, /\b(participants?|attendees?|roster)\s*:/i);
assert.doesNotMatch(front + detail + card, /<Avatar|ParticipantList|participantName|participantAvatar|hostProfile/i);
assert.doesNotMatch(front + detail + card, /caméra|camera/i);
assert.doesNotMatch(front + detail + card, /copy\.host|hostLine/);

assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(styles, /focus-visible/);
assert.match(styles, /min-height: 44px/);
assert.match(styles, /\.noticeCard/);
assert.doesNotMatch(styles, /\.messageCard/);

console.log("[cafe:pr2b] front-door contract passed");
