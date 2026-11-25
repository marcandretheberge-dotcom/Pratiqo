import type { ItalianCafeActivity, ItalianMapActivity, ItalianMapDirection } from "./italianModuleTypes";

/** Tolerate typography, case and sentence punctuation, but retain Italian accents. */
export function normalizeItalianAnswer(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("it-IT").replace(/[’‘`]/g, "'")
    .replace(/[.,!?;:¡¿]/g, "").replace(/\s+/g, " ").trim();
}

export function matchesItalianAnswer(value: string, accepted: readonly string[]): boolean {
  const normalized = normalizeItalianAnswer(value);
  return normalized.length > 0 && accepted.some((answer) => normalizeItalianAnswer(answer) === normalized);
}

export function checkItalianOrder(tokens: readonly string[], answer: readonly string[]): boolean {
  return tokens.length === answer.length && tokens.every((token, index) => token === answer[index]);
}

export function italianCafeTotal(activity: ItalianCafeActivity, basket: Readonly<Record<string, number>>): number {
  return activity.menu.reduce((sum, item) => sum + item.priceCents * (basket[item.id] ?? 0), 0);
}

export function checkItalianCafe(activity: ItalianCafeActivity, basket: Readonly<Record<string, number>>): boolean {
  const expected = new Map(activity.order.map((line) => [line.itemId, line.quantity]));
  const ids = new Set(activity.menu.map((item) => item.id));
  if (Object.entries(basket).some(([id, count]) => !ids.has(id) || !Number.isInteger(count) || count < 0 || count > 9)) return false;
  return activity.menu.every((item) => (basket[item.id] ?? 0) === (expected.get(item.id) ?? 0))
    && italianCafeTotal(activity, basket) <= activity.budgetCents;
}

export function italianMapPosition(activity: ItalianMapActivity, path: readonly ItalianMapDirection[]) {
  let { row, col } = activity.start;
  for (const direction of path) {
    if (direction === "up") row -= 1;
    if (direction === "down") row += 1;
    if (direction === "left") col -= 1;
    if (direction === "right") col += 1;
    if (row < 0 || col < 0 || row >= activity.gridSize || col >= activity.gridSize) return null;
  }
  return { row, col };
}

export function checkItalianMap(activity: ItalianMapActivity, path: readonly ItalianMapDirection[]): boolean {
  const position = italianMapPosition(activity, path);
  return Boolean(position && position.row === activity.goal.row && position.col === activity.goal.col
    && path.length === activity.path.length && path.every((direction, index) => direction === activity.path[index]));
}

/** Stable scrambling avoids hydration mismatches and identical left/right pair order. */
export function scrambleItalianItems<T>(items: readonly T[], seed: string): T[] {
  const result = [...items];
  let state = Array.from(seed).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const target = state % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  if (result.length > 1 && result.every((item, index) => item === items[index])) result.push(result.shift()!);
  return result;
}
