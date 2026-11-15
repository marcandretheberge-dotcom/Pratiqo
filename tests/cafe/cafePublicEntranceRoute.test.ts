import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");

const page = read("app/cafe/page.tsx");
const publicEntrance = read("components/cafe/CafePublicEntrance.tsx");
const video = readFileSync(join(root, "public/videos/cafe-world-journey.mp4"));
const hash = createHash("sha256").update(video).digest("hex");

assert.match(page, /isCafeCommunityEnabled\(\)/);
assert.match(page, /CafePublicEntrance/);
assert.match(page, /CafeCommunity/);
assert.doesNotMatch(page, /CafeFrontDoor/);
assert.match(page, /videoEnabled=\{isCafeRoomProviderEnabled\(\)\}/);

assert.match(publicEntrance, /CafeEntranceScreen/);
assert.match(publicEntrance, /LanguagePicker/);
assert.match(publicEntrance, /CommunityFrame/);
assert.match(publicEntrance, /CafeCommunityChrome/);
assert.match(publicEntrance, /data-cafe-step="soon"/);
assert.match(publicEntrance, /resolveCafeRoomCourseReturn/);
assert.doesNotMatch(publicEntrance, /useCafeCommunity|createCommunityDemoTransport|profile\.save|\/api\/cafe|getUserMedia|CafeCommunityDemo/);
assert.doesNotMatch(publicEntrance, /preferences were saved|préférences ont été enregistr|preferencias se guardaron/i);
assert.doesNotMatch(publicEntrance, /from ["']\.\/CafeCommunityApp["']|from ["']@\/components\/cafe\/community\/CafeCommunityApp["']/);

assert.equal(hash, "c057899c53239fd0baf806bf605877b1ec82ecef3dac73840976f96e214be9b6");

console.log("[cafe:public-entrance] route contract and video hash passed");
