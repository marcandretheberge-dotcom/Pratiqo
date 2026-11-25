import assert from "node:assert/strict";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import nextConfig from "../../next.config";

async function main() {
  const rules = await nextConfig.headers!();
  function headersFor(path: string) {
    const headers = new Map<string, string>();
    for (const rule of rules) {
      if (getPathMatch(rule.source)(path)) {
        for (const header of rule.headers) headers.set(header.key, header.value);
      }
    }
    return headers;
  }
  for (const path of [
    "/yo/langues/anglais/demarrer", "/yo/langues/anglais/intro",
    "/yo/langues/francais-quebec/demarrer", "/yo/langues/espagnol/demarrer",
    "/yo/langues/allemand/demarrer", "/yo/langues/portugais-bresil/demarrer",
    "/yo/langues/japonais/demarrer", "/yo/langues/mandarin/demarrer",
    "/yo/langues/italien/intro", "/yo/langues/italien/parcours/u01",
    "/yo/langues/allemand/parcours/u01", "/yo/langues/portugais-bresil/parcours/u01",
    "/yo/langues/japonais/parcours/01", "/yo/langues/mandarin/parcours/01",
    "/yo/langues/francais-quebec/module-1",
    "/yo/langues/francais-quebec/module-1/lecon-3",
    "/yo/langues/espagnol/pays/republique-dominicaine/intro",
    "/yo/langues/espagnol/pays/republique-dominicaine/module-5",
  ]) {
    const headers = headersFor(path);
    const policy = headers.get("Permissions-Policy")!;
    assert.match(policy, /microphone=\(self\)/, path);
    assert.match(policy, /camera=\(\)/, path);
    assert.match(policy, /display-capture=\(\)/, path);
    assert.doesNotMatch(policy, /https:|\*/, path);
    assert.ok(headers.get("Content-Security-Policy"), path);
    assert.doesNotMatch(headers.get("Content-Security-Policy")!, /api\.openai\.com/, path);
  }
  for (const path of ["/", "/connexion", "/teacher", "/admin", "/student", "/yo", "/yo/langues", "/yo/langues/invented/demarrer", "/api/yo/speech", "/cafe"]) {
    const policy = headersFor(path).get("Permissions-Policy")!;
    assert.match(policy, /microphone=\(\)/, path);
    assert.match(policy, /camera=\(\)/, path);
  }
  for (const path of ["/cafe/preview/salle", "/cafe/italian/salle", "/cafe/appels/call-1"]) {
    assert.match(headersFor(path).get("Permissions-Policy")!, /microphone=\(self/, path);
    assert.match(headersFor(path).get("Permissions-Policy")!, /camera=\(self/, path);
  }
  console.log("Yo microphone permissions: lesson route matching and deny-by-default passed.");
}
void main();
