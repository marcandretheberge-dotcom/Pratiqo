/**
 * Server/workflow-only Daily diagnostics. Never log secrets, Authorization,
 * meeting tokens, tokenized URLs, PII, or raw provider bodies.
 */
import { createHash } from "node:crypto";

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
const SAFE_ERROR_CODES = new Set([
  "invalid-request-error",
  "not-found",
  "network_error",
  "invalid_json",
  "invalid_token_payload",
  "safety_config_mismatch",
  "domain_mismatch",
]);
const SAFE_INFO = new Set([
  "room_already_exists",
  "provider_field_rejected",
  "provider_request_rejected",
  "recording_config_unrecognized",
  "recording_enabled_in_config",
  "domain_name_missing",
]);
const SAFE_FIELDS = new Set([
  "name", "privacy", "domain_name", "nbf", "exp", "max_participants",
  "enable_prejoin_ui", "enable_knocking", "enable_chat", "enable_advanced_chat",
  "enable_shared_chat_history", "enable_screenshare", "enable_live_captions_ui",
  "start_video_off", "start_audio_off", "eject_at_room_exp", "enable_hidden_participants",
  "enable_recording", "enable_recording_ui", "enable_transcription_storage", "enable_dialout",
  "room_name", "eject_at_token_exp", "is_owner", "user_name", "user_id",
  "start_cloud_recording", "auto_start_transcription", "permissions",
  "hasPresence", "canSend", "canReceive", "canAdmin", "user_ids", "ban",
]);
const REQUEST_FINGERPRINT = /^request_sha256:[a-f0-9]{24}$/;

function allowlistedText(value: unknown, allowed: ReadonlySet<string>): string | null {
  return typeof value === "string" && allowed.has(value) ? value : null;
}

function safeRejectedField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return allowlistedText(value.replace(/^properties\./, ""), SAFE_FIELDS);
}

/** Request IDs are useful for correlation, but untrusted headers are never echoed. */
export function fingerprintDailyRequestId(value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > 4096) return null;
  return `request_sha256:${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

/**
 * Missing recording configuration is disabled for REST-created Daily rooms:
 * https://www.daily.co/security/data-protection/
 * Return null for an unrecognized representation so callers must fail closed.
 */
export function isDailyRecordingEnabled(value: unknown): boolean | null {
  if (value === undefined || value === false) return false;
  if (Array.isArray(value)) {
    if (!value.every((entry) => typeof entry === "string" && RECORDING_MODES.has(entry))) {
      return null;
    }
    return value.length > 0;
  }
  return typeof value === "string" && RECORDING_MODES.has(value) ? true : null;
}

/** Effective boolean using Daily's documented default when the field is omitted. */
export function effectiveDailyBool(value: unknown, documentedDefault: boolean): boolean | null {
  if (value === undefined) return documentedDefault;
  return typeof value === "boolean" ? value : null;
}

export function sanitizeDailyDiagnosticText(value: unknown): string | null {
  // Only application-owned templates are loggable. Regex redaction cannot
  // guarantee that arbitrary provider prose contains no secret or personal data.
  return allowlistedText(value, SAFE_INFO);
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
    if (match?.[1]) return safeRejectedField(match[1].toLowerCase());
  }
  return null;
}

export function isDailyExistingRoomConflict(
  status: number,
  diagnostic: Pick<CafeDailyDiagnostic, "errorCode" | "info">,
): boolean {
  if (status === 409) return true;
  if (status !== 400) return false;
  if (diagnostic.info === "room_already_exists") return true;
  const haystack = `${diagnostic.errorCode ?? ""} ${diagnostic.info ?? ""}`.toLowerCase();
  return /\b(?:room|name)\b[^\n]{0,256}\b(?:already exists|already in use|taken)\b/.test(haystack)
    || /\bduplicate[\s_-]+(?:room|room[\s_-]+name)\b/.test(haystack);
}

export function publicCafeDailyDiagnostic(diagnostic: CafeDailyDiagnostic): CafeDailyDiagnostic {
  return {
    operation: diagnostic.operation,
    httpStatus: diagnostic.httpStatus,
    errorCode: allowlistedText(diagnostic.errorCode, SAFE_ERROR_CODES),
    info: sanitizeDailyDiagnosticText(diagnostic.info),
    rejectedField: safeRejectedField(diagnostic.rejectedField),
    requestId: typeof diagnostic.requestId === "string" && REQUEST_FINGERPRINT.test(diagnostic.requestId)
      ? diagnostic.requestId
      : null,
  };
}

export async function readDailyErrorDiagnostic(
  response: Response,
  operation: CafeDailyOperation,
): Promise<CafeDailyDiagnostic> {
  const requestId =
    fingerprintDailyRequestId(response.headers.get("x-daily-request-id"))
    ?? fingerprintDailyRequestId(response.headers.get("x-request-id"));

  let errorCode: string | null = null;
  let info: string | null = null;
  let rejectedField: string | null = null;

  try {
    const raw = await response.text();
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const body = parsed as Record<string, unknown>;
          const rawCode = body.error ?? body.error_type ?? body.type;
          const rawInfo = body.info ?? body.message ?? body.msg;
          const providerInfo = typeof rawInfo === "string" ? rawInfo.slice(0, 4096) : null;
          // Classify before discarding arbitrary provider prose. Only the fixed
          // result of this classification may leave this function.
          const roomConflict = operation === "room_create" && isDailyExistingRoomConflict(
            response.status,
            {
              errorCode: typeof rawCode === "string" ? rawCode.slice(0, 4096) : null,
              info: providerInfo,
            },
          );
          errorCode = allowlistedText(rawCode, SAFE_ERROR_CODES);
          rejectedField = safeRejectedField(body.invalid_parameter ?? body.param)
            ?? extractDailyRejectedField(providerInfo);
          info = roomConflict
            ? "room_already_exists"
            : rejectedField ? "provider_field_rejected"
              : providerInfo ? "provider_request_rejected" : null;
        }
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
