/** Preview/dev-only auth funnel tracing — never log secrets or PII. */
export function logAuthFlowDecision(
  guard: string,
  fields: Record<string, string | boolean | null | undefined>,
): void {
  if (process.env.NODE_ENV === "production") return;
  const safe: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) {
      safe[key] = value === null ? "null" : "undefined";
    } else {
      safe[key] = value;
    }
  }
  console.info(`[auth-flow:${guard}]`, safe);
}
