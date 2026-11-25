/** Basic kana only; voiced forms, combinations and length are taught explicitly below the chart. */
const rows = [
  ["あ","a"],["い","i"],["う","u"],["え","e"],["お","o"],
  ["か","ka"],["き","ki"],["く","ku"],["け","ke"],["こ","ko"],
  ["さ","sa"],["し","shi"],["す","su"],["せ","se"],["そ","so"],
  ["た","ta"],["ち","chi"],["つ","tsu"],["て","te"],["と","to"],
  ["な","na"],["に","ni"],["ぬ","nu"],["ね","ne"],["の","no"],
  ["は","ha"],["ひ","hi"],["ふ","fu"],["へ","he"],["ほ","ho"],
  ["ま","ma"],["み","mi"],["む","mu"],["め","me"],["も","mo"],
  ["や","ya"],["ゆ","yu"],["よ","yo"],
  ["ら","ra"],["り","ri"],["る","ru"],["れ","re"],["ろ","ro"],
  ["わ","wa"],["を","o"],["ん","n"],
] as const;
export const japaneseKana = rows.flatMap(([character, romaji]) => [
  { character, romaji, script: "hiragana" as const },
  { character: String.fromCharCode(character.charCodeAt(0) + 0x60), romaji, script: "katakana" as const },
]);
export const getJapaneseKana = (character: string) => japaneseKana.find((entry) => entry.character === character);
export function kanaDistractors(character: string): string[] {
  const entry = getJapaneseKana(character);
  if (!entry) return [];
  const others = [...new Set(japaneseKana.map((item) => item.romaji))].filter((reading) => reading !== entry.romaji);
  const seed = character.charCodeAt(0);
  const choices = [entry.romaji, others[seed % others.length], others[(seed + 13) % others.length], others[(seed + 27) % others.length]];
  const offset = seed % choices.length;
  return [...choices.slice(offset), ...choices.slice(0, offset)];
}
