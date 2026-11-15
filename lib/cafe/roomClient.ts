/**
 * Browser helper for Café room join.
 * Tokens stay in memory only — never URL, logs, analytics, or localStorage.
 */

export type CafeRoomJoinSuccess = {
  ok: true;
  role: "participant" | "host";
  roomUrl: string;
  token: string;
  expiresAt: string;
};

export type CafeRoomJoinFailure = {
  ok: false;
  code: string;
  opensAt?: string;
  retryAfter?: number;
};

export type CafeRoomJoinResult = CafeRoomJoinSuccess | CafeRoomJoinFailure;

export async function requestCafeRoomJoin(input: {
  slug: string;
  accessToken: string;
  role?: "participant" | "host" | "auto";
  fetchImpl?: typeof fetch;
}): Promise<CafeRoomJoinResult> {
  const role = input.role ?? "participant";
  if (role === "auto") {
    // The server checks the assigned host; the browser never grants a role.
    // Only an explicit host-authorization denial may try participant admission.
    const host = await requestCafeRoomJoinForRole({ ...input, role: "host" });
    if (!host.result.ok && host.status === 403 && host.result.code === "access_denied") {
      return (await requestCafeRoomJoinForRole({ ...input, role: "participant" })).result;
    }
    return host.result;
  }
  return (await requestCafeRoomJoinForRole({ ...input, role })).result;
}

async function requestCafeRoomJoinForRole(input: {
  slug: string;
  accessToken: string;
  role: "participant" | "host";
  fetchImpl?: typeof fetch;
}): Promise<{ result: CafeRoomJoinResult; status: number | null }> {
  const role = input.role;
  const fetchImpl = input.fetchImpl ?? fetch;
  const path =
    role === "host"
      ? `/api/cafe/sessions/${encodeURIComponent(input.slug)}/host`
      : `/api/cafe/sessions/${encodeURIComponent(input.slug)}/join`;

  let response: Response;
  try {
    response = await fetchImpl(path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    return { result: { ok: false, code: "network_error" }, status: null };
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    return { result: { ok: false, code: "response_lost" }, status: response.status };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { result: { ok: false, code: "response_lost" }, status: response.status };
  }
  const body = raw as Record<string, unknown>;

  if (
    response.ok
    && body.ok === true
    && typeof body.roomUrl === "string"
    && typeof body.token === "string"
    && typeof body.expiresAt === "string"
    && body.role === role
  ) {
    return {
      status: response.status,
      result: {
        ok: true,
        role,
        roomUrl: body.roomUrl,
        token: body.token,
        expiresAt: body.expiresAt,
      },
    };
  }

  return {
    status: response.status,
    result: {
      ok: false,
      code: body.ok === false && typeof body.code === "string" ? body.code : `http_${response.status}`,
      ...(typeof body.opensAt === "string" ? { opensAt: body.opensAt } : {}),
      ...(typeof body.retryAfter === "number" ? { retryAfter: body.retryAfter } : {}),
    },
  };
}

/** Redacted diagnostics — never include token or room URL. */
export function cafeRoomJoinDiagnostic(result: CafeRoomJoinResult): Record<string, unknown> {
  if (result.ok) {
    return {
      ok: true,
      role: result.role,
      expiresAtPresent: Boolean(result.expiresAt),
      tokenLength: result.token.length,
      roomHost: safeHost(result.roomUrl),
    };
  }
  return {
    ok: false,
    code: result.code,
    ...(result.opensAt ? { opensAtPresent: true } : {}),
    ...(typeof result.retryAfter === "number" ? { retryAfter: result.retryAfter } : {}),
  };
}

function safeHost(roomUrl: string): string | null {
  try {
    return new URL(roomUrl).host;
  } catch {
    return null;
  }
}
