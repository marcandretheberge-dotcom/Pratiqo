/**
 * Simulated foundation tests for Café social practice — not live browser E2E.
 */
import assert from "node:assert/strict";
import {
  CAFE_PRACTICE_LANGUAGES,
  getCafePracticeLanguage,
  isCafePracticeLanguageCode,
  searchCafePracticeLanguages,
} from "@/lib/cafe/practiceLanguages";
import { cafeCopy } from "@/lib/cafe/copy";
import { getCafeSocialFlags } from "@/lib/cafe/socialFeatureFlags";

assert.equal(CAFE_PRACTICE_LANGUAGES.length >= 9, true);
assert.equal(isCafePracticeLanguageCode("it"), true);
assert.equal(isCafePracticeLanguageCode("xx"), false);
assert.equal(getCafePracticeLanguage("ja")?.nativeName, "日本語");
assert.ok(searchCafePracticeLanguages("ital").some((lang) => lang.code === "it"));
assert.ok(searchCafePracticeLanguages("日本語").some((lang) => lang.code === "ja"));

assert.match(cafeCopy.fr.brandLine, /Une racine/);
assert.match(cafeCopy.en.brandLine, /One root/);
assert.match(cafeCopy.es.brandLine, /Una raíz/);
assert.match(cafeCopy.fr.philosophy, /parfaitement/);
assert.match(cafeCopy.en.enter, /Enter the Café/);
assert.match(cafeCopy.fr.tablesEmptyLoungeOpen, /salon public reste ouvert/i);

const previous = {
  social: process.env.CAFE_SOCIAL_V1_ENABLED,
  presence: process.env.CAFE_PRESENCE_ENABLED,
  lounge: process.env.CAFE_LOUNGE_CHAT_ENABLED,
  privateChat: process.env.CAFE_PRIVATE_CHAT_ENABLED,
  liveTables: process.env.CAFE_LIVE_TABLES_ENABLED,
};

try {
  delete process.env.CAFE_SOCIAL_V1_ENABLED;
  delete process.env.CAFE_PRESENCE_ENABLED;
  delete process.env.CAFE_LOUNGE_CHAT_ENABLED;
  delete process.env.CAFE_PRIVATE_CHAT_ENABLED;
  delete process.env.CAFE_LIVE_TABLES_ENABLED;
  assert.deepEqual(getCafeSocialFlags(), {
    socialV1: false,
    presence: false,
    loungeChat: false,
    privateChat: false,
    liveTables: false,
  });

  process.env.CAFE_SOCIAL_V1_ENABLED = "true";
  process.env.CAFE_PRESENCE_ENABLED = "true";
  process.env.CAFE_LOUNGE_CHAT_ENABLED = "true";
  assert.equal(getCafeSocialFlags().presence, true);
  assert.equal(getCafeSocialFlags().loungeChat, true);
  assert.equal(getCafeSocialFlags().privateChat, false);
} finally {
  for (const [key, value] of Object.entries({
    CAFE_SOCIAL_V1_ENABLED: previous.social,
    CAFE_PRESENCE_ENABLED: previous.presence,
    CAFE_LOUNGE_CHAT_ENABLED: previous.lounge,
    CAFE_PRIVATE_CHAT_ENABLED: previous.privateChat,
    CAFE_LIVE_TABLES_ENABLED: previous.liveTables,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log("[cafe:social-foundation] language registry, brand copy, flags (simulated) passed");
