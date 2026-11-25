import { buildDefaultPermissionsPolicy, type NextHeaderRule } from "./cafeRoomHeaders";

/** Only lesson documents may ask for the learner's microphone. Camera and
 * screen capture remain denied, and no provider receives browser permission. */
export function yoSpeechHeaderRules(): NextHeaderRule[] {
  const policy = buildDefaultPermissionsPolicy()
    .replace("microphone=()", "microphone=(self)") + ", display-capture=()";
  const languages = "anglais|francais-quebec|espagnol|allemand|portugais-bresil|japonais|mandarin|italien";
  return [
    `/yo/langues/:language(${languages})/:entry(intro|demarrer)`,
    `/yo/langues/:language(${languages})/parcours/:path*`,
    "/yo/langues/francais-quebec/module-1/:path*",
    "/yo/langues/espagnol/pays/republique-dominicaine/:lesson(intro|module-2|module-3|module-4|module-5)/:path*",
  ].map((source) => ({
    source,
    headers: [{ key: "Permissions-Policy", value: policy }],
  }));
}
