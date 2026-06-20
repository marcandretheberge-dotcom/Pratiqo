/** Preview/dev auth funnel tracing — never log secrets or PII. */
export function shouldTraceAuthFlow(): boolean {
  if (process.env.AUTH_FLOW_TRACE === "1") return true;
  if (process.env.VERCEL_ENV === "preview") return true;
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

export function logAuthFlowDecision(
  guard: string,
  fields: Record<string, string | boolean | null | undefined>,
): void {
  if (!shouldTraceAuthFlow()) return;
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
