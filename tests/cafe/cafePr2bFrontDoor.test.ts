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
const heroStyles = read("components/cafe/CafeHeroMedia.module.css");
const publicTypes = read("lib/cafe/publicTypes.ts");

assert.match(front, /cafeCopy/);
assert.match(front, /CafeHeroMedia/);
assert.match(heroStyles, /\/images\/yo\/mandarin\/cafe\.webp/);
assert.doesNotMatch(front + styles + heroStyles, /coffee\.avif|styles\.steam|\.steam/);

assert.match(front, /router\.push\("\/cafe\?step=format"\)/);
assert.match(front, /router\.push\("\/cafe\?step=groups"\)/);
assert.match(front, /useSearchParams/);
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
assert.doesNotMatch(front, /api\/cafe\/reservations/);
assert.match(detail, /attemptCafeReserve|reconcileCafeSeatState/);
assert.match(detail, /returnToCourse/);
assert.match(detail, /yoReturn/);
assert.match(detail, /pendingRequestIdRef/);
assert.match(copy, /La réservation n’est pas encore ouverte/);
assert.match(copy, /Le café n’est pas encore ouvert/);
assert.match(copy, /Revenir à mon cours/);
assert.match(copy, /Return to my course/);
assert.match(copy, /Volver a mi curso/);

assert.match(page, /index: false/);
assert.match(detailPage, /index: false/);
assert.match(page, /title: "Café des langues"/);
assert.match(page, /Suspense/);
assert.match(detailPage, /title: "Table — Café des langues"/);
assert.doesNotMatch(page, /title: "[^"]*Pratiqo/);
assert.doesNotMatch(detailPage, /title: "[^"]*Pratiqo/);

assert.doesNotMatch(publicTypes, /\bprofile_id\b|\bparticipant\b|\bavatar\b|\bhost_profile_id\b|\bcreated_by_profile_id\b|\bemail\b/i);
assert.doesNotMatch(front + detail + card, /<Avatar|ParticipantList|participantName|participantAvatar|hostProfile/i);
assert.doesNotMatch(front + detail + card, /caméra|camera/i);
assert.doesNotMatch(front + detail + card, /copy\.host|hostLine/);

assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(styles, /focus-visible/);
assert.match(styles, /min-height: 44px/);
assert.match(styles, /\.noticeCard/);
assert.doesNotMatch(styles, /\.messageCard/);

console.log("[cafe:pr2b] front-door contract passed");
