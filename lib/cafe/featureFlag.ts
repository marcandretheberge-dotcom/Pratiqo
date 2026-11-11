export function isCafeV1Enabled(): boolean {
  return process.env.CAFE_V1_ENABLED?.trim().toLowerCase() === "true";
}
