import assert from "node:assert/strict";
import { createLegalHeadingIdRegistry, normalizeLegalHeadingId, slugifyLegalHeadingText } from "../../lib/legal/headingIds";

assert.equal(slugifyLegalHeadingText("1. Présentation de Pratiqo"), "presentation-de-pratiqo");
assert.equal(slugifyLegalHeadingText("4a. Teacher Status"), "teacher-status");
assert.equal(slugifyLegalHeadingText("6bis. YoPratiqo — Cours autonomes"), "yopratiqo-cours-autonomes");
assert.equal(slugifyLegalHeadingText("8. Personas menores y clases a domicilio"), "personas-menores-y-clases-a-domicilio");
assert.equal(normalizeLegalHeadingId(" Identité vérifiée / diplômes "), "identite-verifiee-diplomes");

const nextId = createLegalHeadingIdRegistry();
assert.equal(nextId("1. Contact"), "contact");
assert.equal(nextId("2. Contact"), "contact-2");
assert.equal(nextId("Ignored", "teacher-pro"), "teacher-pro");
assert.equal(nextId("Ignored again", "teacher-pro"), "teacher-pro-2");

console.log("[legal:headingIds] tests passed");
