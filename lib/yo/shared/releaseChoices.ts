/** Resolve only a visible pace choice; hiding a custom field must not submit its invisible value. */
export function visibleIntroPace(minutes: number | null, custom: boolean, text: string): number | null {
  if (!custom) return minutes !== null && [0, 30, 60, 120, 180].includes(minutes) ? minutes : null;
  if (!/^\d+$/.test(text)) return null;
  const amount = Number(text);
  return Number.isInteger(amount) && amount >= 15 && amount <= 1200 ? amount : null;
}

/** Chinese variants are not interchangeable. Never substitute Cantonese for Mandarin. */
export function selectIntroVoice<T extends { lang: string }>(voices: readonly T[], requested: string): T | undefined {
  const normalize = (locale: string) => locale.trim().replace(/_/g, "-").toLowerCase();
  const target = normalize(requested);
  const exact = voices.find(v => normalize(v.lang) === target);
  if (exact) return exact;
  if (["fr-ca", "pt-br"].includes(target)) return undefined;
  if (target === "zh-cn") {
    return voices.find(v => ["zh-hans-cn", "cmn-cn", "cmn-hans-cn"].includes(normalize(v.lang)));
  }
  // Unknown Chinese requests also fail closed rather than guessing a spoken variety.
  if (/^(zh|cmn|yue)(-|$)/.test(target)) return undefined;
  return voices.find(v => normalize(v.lang).split("-")[0] === target.split("-")[0]);
}
