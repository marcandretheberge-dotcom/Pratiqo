/**
 * Server/workflow-only Daily diagnostics. Never log secrets, Authorization,
 * meeting tokens, tokenized URLs, PII, or raw provider bodies.
 */

export type CafeDailyOperation =
  | "account_lookup"
  | "room_create"
  | "room_get"
  | "token_create"
  | "participant_remove"
  | "room_delete";

export type CafeDailyDiagnostic = {
  operation: CafeDailyOperation;
  httpStatus: number | null;
  errorCode: string | null;
  info: string | null;
  rejectedField: string | null;
  requestId: string | null;
};

const RECORDING_MODES = new Set(["cloud", "cloud-audio-only", "local", "raw-tracks"]);
const MAX_TEXT = 160;

/** Daily room/token recording is enabled only for documented enum/array modes. */
export function isDailyRecordingEnabled(value: unknown): boolean {
  if (value === undefined || value === null || value === "" || value === false) return false;
  if (Array.isArray(value)) {
    return value.some((entry) => typeof entry === "string" && RECORDING_MODES.has(entry));
  }
  return typeof value === "string" && RECORDING_MODES.has(value);
}

/** Effective boolean using Daily's documented default when the field is omitted. */
export function effectiveDailyBool(value: unknown, documentedDefault: boolean): boolean {
  if (value === undefined || value === null) return documentedDefault;
  return value === true;
}

export function sanitizeDailyDiagnosticText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let text = value.replace(/\s+/g, " ").trim();
  if (!text) return null;
  text = text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "[redacted]")
    .replace(/https?:\/\/[^\s"']+/gi, "[url]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      "[id]",
    )
    .replace(/\b(?:sk_|tok_|token_|jwt_)[A-Za-z0-9._-]{8,}\b/gi, "[redacted]");
  if (text.length > MAX_TEXT) text = `${text.slice(0, MAX_TEXT)}…`;
  return text;
}

export function extractDailyRejectedField(info: string | null): string | null {
  if (!info) return null;
  const patterns = [
    /(?:unknown|invalid|unsupported)\s+(?:value\s+for\s+)?(?:property|field|param(?:eter)?)\s+[`'"]?([a-z0-9_]+)[`'"]?/i,
    /(?:property|field|param(?:eter)?)\s+[`'"]?([a-z0-9_]+)[`'"]?\s+(?:is\s+)?(?:invalid|unknown|unsupported|not\s+allowed)/i,
    /[`'"]([a-z0-9_]+)[`'"]\s+must be one of/i,
  ];
  for (const pattern of patterns) {
    const match = info.match(pattern);
    if (match?.[1]) return match[1].toLowerCase();
  }
  return null;
}

export function isDailyExistingRoomConflict(
  status: number,
  diagnostic: Pick<CafeDailyDiagnostic, "errorCode" | "info">,
): boolean {
  if (status === 409) return true;
  if (status !== 400) return false;
  const haystack = `${diagnostic.errorCode ?? ""} ${diagnostic.info ?? ""}`.toLowerCase();
  return /already exists|name.?taken|room.+exists|duplicate/.test(haystack);
}

export function publicCafeDailyDiagnostic(diagnostic: CafeDailyDiagnostic): CafeDailyDiagnostic {
  return {
    operation: diagnostic.operation,
    httpStatus: diagnostic.httpStatus,
    errorCode: sanitizeDailyDiagnosticText(diagnostic.errorCode),
    info: sanitizeDailyDiagnosticText(diagnostic.info),
    rejectedField: sanitizeDailyDiagnosticText(diagnostic.rejectedField),
    requestId: sanitizeDailyDiagnosticText(diagnostic.requestId),
  };
}

export async function readDailyErrorDiagnostic(
  response: Response,
  operation: CafeDailyOperation,
): Promise<CafeDailyDiagnostic> {
  const requestId =
    sanitizeDailyDiagnosticText(response.headers.get("x-daily-request-id"))
    ?? sanitizeDailyDiagnosticText(response.headers.get("x-request-id"));

  let errorCode: string | null = null;
  let info: string | null = null;
  let rejectedField: string | null = null;

  try {
    const raw = await response.text();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        errorCode = sanitizeDailyDiagnosticText(
          parsed.error ?? parsed.error_type ?? parsed.type ?? null,
        );
        info = sanitizeDailyDiagnosticText(
          parsed.info ?? parsed.message ?? parsed.msg ?? null,
        );
        rejectedField =
          sanitizeDailyDiagnosticText(parsed.invalid_parameter ?? parsed.param ?? null)
          ?? extractDailyRejectedField(info);
      } catch {
        // Non-JSON error bodies are ignored — never log the raw text.
      }
    }
  } catch {
    // Body read failures leave status-only diagnostics.
  }

  return publicCafeDailyDiagnostic({
    operation,
    httpStatus: response.status,
    errorCode,
    info,
    rejectedField,
    requestId,
  });
}
