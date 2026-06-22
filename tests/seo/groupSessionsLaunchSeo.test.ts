/**
 * Group-session SEO alignment when checkout is launch-disabled.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SITE_URL } from "../../lib/seo/site";
import sitemap from "../../app/sitemap";
import {
  isGroupSessionsCheckoutEnabled,
  isGroupSessionsMarketplaceIndexable,
} from "../../lib/groupSessionsLaunch";
import { FEATURES } from "../../lib/features";

const REPO_ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const sitemapSrc = read("app/sitemap.ts");
const groupLayoutSrc = read("app/group-sessions/layout.tsx");
const groupDetailSrc = read("app/group-sessions/[id]/page.tsx");
const groupPageSrc = read("app/group-sessions/page.tsx");
const groupDetailClientSrc = read("components/GroupSessionDetailClient.tsx");
const featuresSrc = read("lib/features.ts");

test("feature flag is the default source of truth for group checkout (disabled at launch)", () => {
  assert.equal(FEATURES.group_sessions, false);
  assert.equal(isGroupSessionsCheckoutEnabled(), false);
  assert.equal(isGroupSessionsMarketplaceIndexable(), false);
});

test("sitemap gates /group-sessions on isGroupSessionsMarketplaceIndexable", () => {
  assert.match(sitemapSrc, /isGroupSessionsMarketplaceIndexable/);
});

test("sitemap excludes disabled group-session checkout hub", async () => {
  const entries = await sitemap();
  const urls = new Set(entries.map((e) => e.url));
  assert.ok(
    !urls.has(`${SITE_URL}/group-sessions`),
    "Sitemap must not include /group-sessions while checkout is launch-disabled",
  );
});

test("group-sessions layout is noindex while checkout is disabled", () => {
  assert.match(groupLayoutSrc, /isGroupSessionsMarketplaceIndexable/);
  assert.match(groupLayoutSrc, /robots:\s*\{\s*index:\s*false/);
  assert.match(groupLayoutSrc, /Bientôt/i);
});

test("group session detail metadata is noindex while checkout is disabled", () => {
  assert.match(groupDetailSrc, /isGroupSessionsMarketplaceIndexable/);
  assert.match(groupDetailSrc, /robots:\s*\{\s*index:\s*false/);
});

test("group marketplace UI does not advertise live booking when disabled", () => {
  assert.match(groupPageSrc, /isEnabled\("group_sessions"\)/);
  assert.match(groupPageSrc, /Bientôt disponible/i);
  assert.match(groupDetailClientSrc, /isEnabled\("group_sessions"\)/);
  assert.match(groupDetailClientSrc, /Bientôt disponible/i);
});

test("disabled group pages do not ship Product/Event/Course JSON-LD", () => {
  for (const src of [groupLayoutSrc, groupPageSrc, groupDetailSrc, groupDetailClientSrc]) {
    assert.doesNotMatch(src, /"@type"\s*:\s*"(?:Product|Event|Course)"/);
    assert.doesNotMatch(src, /application\/ld\+json[\s\S]*Product/i);
  }
});

test("features.ts keeps group_sessions false until launch flip", () => {
  assert.match(featuresSrc, /group_sessions:\s*false/);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[seo:groupSessionsLaunchSeo] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
