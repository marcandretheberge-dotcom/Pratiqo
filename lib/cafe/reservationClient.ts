import { sanitizeRelativeRedirectPath } from "@/lib/auth/redirects";

/**
 * Client helpers for the Café seat-hold reservation API.
 * Attendance / Daily / mastery are out of scope — this only confirms a place.
 *
 * GET rows mirror `cafe_my_reservations_server`:
 * reservation_status, session_status, effective_status, version, slug, …
 */

export type CafeReservationMutationResult =
  | { ok: true; code?: string; version?: number; status?: string; replay?: boolean }
  | { ok: false; code: string; status?: number; version?: number; uncertain?: boolean };

export type CafeMyReservation = {
  slug: string;
  reservationStatus: string;
  sessionStatus: string;
  effectiveStatus: string;
  version: number;
};

/** UI seat derived from a GET row (or absence of one). */
export type CafeSeatState =
  | {
      kind: "confirmed";
      /** Use for display and as expectedVersion while confirmed. */
      version: number;
      expectedVersion: number;
    }
  | {
      kind: "ready";
      /**
       * Version to send on the next reserve.
       * 0 when no row exists; otherwise the cancelled (or non-effective) row version.
       */
      expectedVersion: number;
      reservationStatus: string | null;
      sessionStatus: string | null;
      effectiveStatus: string | null;
    };

/** True when the Café reservation HTTP path is reachable under the review gate. */
export function isCafeReservationPathAvailable(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.CAFE_V1_ENABLED?.trim().toLowerCase() === "true";
}

export function buildCafeSessionPath(input: {
  slug: string;
  yoReturn?: string | null;
  yoExpression?: string | null;
  yoMission?: string | null;
  fromYo?: boolean;
}): string {
  const params = new URLSearchParams();
  if (input.fromYo !== false && (input.yoReturn || input.yoExpression || input.yoMission)) {
    params.set("from", "yo");
  }
  const safeReturn = sanitizeRelativeRedirectPath(input.yoReturn ?? null);
  if (safeReturn) params.set("yoReturn", safeReturn);
  if (input.yoExpression?.trim()) params.set("yoExpression", input.yoExpression.trim().slice(0, 80));
  if (input.yoMission?.trim()) params.set("yoMission", input.yoMission.trim());
  const query = params.toString();
  return query
    ? `/cafe/${encodeURIComponent(input.slug)}?${query}`
    : `/cafe/${encodeURIComponent(input.slug)}`;
}

/** Learner login handoff that preserves the Café deep-link (and Yo return context). */
export function buildCafeReservationLoginHref(cafePathWithQuery: string): string {
  const safe = sanitizeRelativeRedirectPath(cafePathWithQuery) ?? "/cafe";
  const params = new URLSearchParams({
    intent: "student",
    next: safe,
  });
  return `/login?${params.toString()}`;
}

export function parseYoCafeContext(searchParams: {
  get(name: string): string | null;
}): {
  fromYo: boolean;
  yoReturn: string | null;
  yoExpression: string;
  yoMission: string;
} {
  return {
    fromYo: searchParams.get("from") === "yo",
    yoReturn: sanitizeRelativeRedirectPath(searchParams.get("yoReturn")),
    yoExpression: (searchParams.get("yoExpression") ?? "").trim().slice(0, 80),
    yoMission: (searchParams.get("yoMission") ?? "").trim(),
  };
}

function readString(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function readVersion(row: Record<string, unknown>): number {
  const value = row.version;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return 0;
}

/** Parse one RPC/API reservation row into the client contract. */
export function parseCafeMyReservationRow(
  row: Record<string, unknown>,
): CafeMyReservation | null {
  const slug = readString(row, "slug");
  if (!slug) return null;
  return {
    slug,
    reservationStatus: readString(row, "reservation_status", "reservationStatus"),
    sessionStatus: readString(row, "session_status", "sessionStatus"),
    effectiveStatus: readString(row, "effective_status", "effectiveStatus"),
    version: readVersion(row),
  };
}

/**
 * Map a GET row to seat UI.
 * Confirmation uses effective_status so a cancelled session never looks confirmed.
 * Cancelled (or otherwise non-effective) rows still expose version for expectedVersion.
 */
export function seatStateFromReservation(
  reservation: CafeMyReservation | null | undefined,
): CafeSeatState {
  if (!reservation) {
    return {
      kind: "ready",
      expectedVersion: 0,
      reservationStatus: null,
      sessionStatus: null,
      effectiveStatus: null,
    };
  }
  if (reservation.effectiveStatus === "confirmed") {
    return {
      kind: "confirmed",
      version: reservation.version,
      expectedVersion: reservation.version,
    };
  }
  return {
    kind: "ready",
    expectedVersion: reservation.version,
    reservationStatus: reservation.reservationStatus || null,
    sessionStatus: reservation.sessionStatus || null,
    effectiveStatus: reservation.effectiveStatus || null,
  };
}

export function findReservationForSlug(
  reservations: CafeMyReservation[],
  slug: string,
): CafeMyReservation | null {
  return reservations.find((row) => row.slug === slug) ?? null;
}

export async function fetchMyCafeReservations(input: {
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; reservations: CafeMyReservation[] } | { ok: false; code: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl("/api/cafe/reservations", {
      method: "GET",
      headers: { Authorization: `Bearer ${input.accessToken}` },
      cache: "no-store",
    });
  } catch {
    return { ok: false, code: "network_error" };
  }

  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    reservations?: Array<Record<string, unknown>>;
  };
  if (!response.ok || body.ok === false) {
    return { ok: false, code: body.error ?? `http_${response.status}` };
  }
  const reservations = (body.reservations ?? [])
    .map((row) => parseCafeMyReservationRow(row))
    .filter((row): row is CafeMyReservation => row !== null);
  return { ok: true, reservations };
}

export async function reconcileCafeSeatState(input: {
  slug: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<
  | { ok: true; seat: CafeSeatState; reservation: CafeMyReservation | null }
  | { ok: false; code: string }
> {
  const mine = await fetchMyCafeReservations({
    accessToken: input.accessToken,
    fetchImpl: input.fetchImpl,
  });
  if (!mine.ok) return mine;
  const reservation = findReservationForSlug(mine.reservations, input.slug);
  return {
    ok: true,
    reservation,
    seat: seatStateFromReservation(reservation),
  };
}

export async function postCafeReservation(input: {
  slug: string;
  action: "reserve" | "cancel";
  expectedVersion: number;
  requestId: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<CafeReservationMutationResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl("/api/cafe/reservations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slug: input.slug,
        action: input.action,
        expectedVersion: input.expectedVersion,
        requestId: input.requestId,
      }),
    });
  } catch {
    return { ok: false, code: "network_error", uncertain: true };
  }

  let body: {
    ok?: boolean;
    code?: string;
    version?: number;
    status?: string;
    error?: string;
    replay?: boolean;
  };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    // Response received but body lost/unreadable — treat as uncertain for idempotent retry.
    return {
      ok: false,
      code: "response_lost",
      status: response.status,
      uncertain: true,
    };
  }

  if (!response.ok || body.ok === false) {
    return {
      ok: false,
      code: body.code ?? body.error ?? `http_${response.status}`,
      status: response.status,
      version: typeof body.version === "number" ? body.version : undefined,
      uncertain: false,
    };
  }

  if (body.ok !== true) {
    return {
      ok: false,
      code: "response_lost",
      status: response.status,
      uncertain: true,
    };
  }

  return {
    ok: true,
    code: body.code,
    version: typeof body.version === "number" ? body.version : undefined,
    status: typeof body.status === "string" ? body.status : undefined,
    replay: body.replay === true,
  };
}

/** Complete confirmed POST: explicit status + version — never invent either. */
function isCompleteConfirmedMutation(
  posted: Extract<CafeReservationMutationResult, { ok: true }>,
): posted is Extract<CafeReservationMutationResult, { ok: true }> & {
  status: "confirmed";
  version: number;
} {
  return posted.status === "confirmed" && typeof posted.version === "number";
}

export type CafeReserveAttemptResult =
  | {
      ok: true;
      seat: CafeSeatState;
      /** Clear pending requestId — attempt resolved. */
      reuseRequestId: false;
      replay?: boolean;
    }
  | {
      ok: false;
      code: string;
      seat: CafeSeatState;
      /**
       * True when the POST outcome is unknown (lost response / network) —
       * retry must reuse the same requestId.
       */
      reuseRequestId: boolean;
    };

/**
 * POST reserve, then reconcile on uncertain outcomes or version_conflict.
 * Callers must keep `requestId` across retries while `reuseRequestId` is true.
 */
export async function attemptCafeReserve(input: {
  slug: string;
  expectedVersion: number;
  requestId: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<CafeReserveAttemptResult> {
  const posted = await postCafeReservation({
    slug: input.slug,
    action: "reserve",
    expectedVersion: input.expectedVersion,
    requestId: input.requestId,
    accessToken: input.accessToken,
    fetchImpl: input.fetchImpl,
  });

  if (posted.ok) {
    // Never invent status/version. Incomplete or non-confirmed POST → GET reconcile.
    // "Place confirmée" only after effective_status === "confirmed" (or a complete confirmed POST).
    if (isCompleteConfirmedMutation(posted)) {
      return {
        ok: true,
        seat: {
          kind: "confirmed",
          version: posted.version,
          expectedVersion: posted.version,
        },
        reuseRequestId: false,
        replay: posted.replay,
      };
    }

    const reconciled = await reconcileCafeSeatState({
      slug: input.slug,
      accessToken: input.accessToken,
      fetchImpl: input.fetchImpl,
    });

    if (!reconciled.ok) {
      return {
        ok: false,
        code: "incomplete_response",
        seat: {
          kind: "ready",
          expectedVersion: input.expectedVersion,
          reservationStatus: null,
          sessionStatus: null,
          effectiveStatus: null,
        },
        // POST acknowledged but outcome unclear — keep requestId for idempotent retry.
        reuseRequestId: true,
      };
    }

    if (reconciled.seat.kind === "confirmed") {
      return {
        ok: true,
        seat: reconciled.seat,
        reuseRequestId: false,
        replay: posted.replay,
      };
    }

    return {
      ok: false,
      code: "incomplete_response",
      seat: reconciled.seat,
      reuseRequestId: false,
    };
  }

  const needsReconcile =
    posted.uncertain === true || posted.code === "version_conflict";

  if (!needsReconcile) {
    return {
      ok: false,
      code: posted.code,
      seat: {
        kind: "ready",
        expectedVersion: typeof posted.version === "number" ? posted.version : input.expectedVersion,
        reservationStatus: null,
        sessionStatus: null,
        effectiveStatus: null,
      },
      reuseRequestId: false,
    };
  }

  const reconciled = await reconcileCafeSeatState({
    slug: input.slug,
    accessToken: input.accessToken,
    fetchImpl: input.fetchImpl,
  });

  if (!reconciled.ok) {
    return {
      ok: false,
      code: posted.code,
      seat: {
        kind: "ready",
        expectedVersion: input.expectedVersion,
        reservationStatus: null,
        sessionStatus: null,
        effectiveStatus: null,
      },
      reuseRequestId: posted.uncertain === true,
    };
  }

  if (reconciled.seat.kind === "confirmed") {
    return {
      ok: true,
      seat: reconciled.seat,
      reuseRequestId: false,
    };
  }

  return {
    ok: false,
    code: posted.code,
    seat: reconciled.seat,
    // Uncertain POST: keep requestId for idempotent replay.
    // version_conflict: clear requestId; next attempt uses a fresh id with reconciled expectedVersion.
    reuseRequestId: posted.uncertain === true,
  };
}
