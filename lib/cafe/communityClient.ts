import type {
  CafeCommunityCommand, CafeCommunityCommandResult, CafeCommunityFailure,
  CafeCommunitySnapshot, CafeModerationReport,
} from "./communityTypes";

export type CafeIdentity = { userId: string; accessToken: string };
export type CafeSnapshotResult = CafeCommunitySnapshot | CafeCommunityFailure;
export interface CafeCommunityTransport {
  snapshot(token: string, roomId: string | null, signal?: AbortSignal): Promise<CafeSnapshotResult>;
  command(token: string, command: CafeCommunityCommand, signal?: AbortSignal, keepalive?: boolean): Promise<CafeCommunityCommandResult>;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function failure(value: unknown, status: number): CafeCommunityFailure {
  if (record(value) && value.ok === false && typeof value.code === "string") {
    return { ok: false, code: value.code, ...(typeof value.retryAfter === "number" ? { retryAfter: value.retryAfter } : {}) };
  }
  return { ok: false, code: status === 401 ? "unauthenticated" : status === 403 ? "forbidden" : "unavailable" };
}

async function json(response: Response): Promise<unknown> {
  try { return await response.json(); } catch { return null; }
}

async function requestJson(fetcher: typeof fetch, url: string, init: RequestInit): Promise<{ response: Response; body: unknown }> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 10_000);
  try {
    const response = await fetcher(url, { ...init, signal: controller.signal });
    return { response, body: await json(response) };
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abort);
  }
}

/** Tokens stay in Authorization headers; private reads never enter the HTTP cache. */
export function createCafeCommunityTransport(fetcher: typeof fetch = (...args) => fetch(...args)): CafeCommunityTransport {
  return {
    async snapshot(token, roomId, signal) {
      const query = roomId ? `?roomId=${encodeURIComponent(roomId)}` : "";
      const { response, body } = await requestJson(fetcher, `/api/cafe/community${query}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store", credentials: "same-origin", signal,
      });
      if (!response.ok || !record(body) || body.ok !== true) return failure(body, response.status);
      if (!(body.me === null || record(body.me)) || !Array.isArray(body.people) || !Array.isArray(body.rooms)
        || !Array.isArray(body.calls) || !Array.isArray(body.blockedMembers)
        || !(body.room === null || (record(body.room) && Array.isArray(body.room.messages)))
        || typeof body.serverTime !== "string") return { ok: false, code: "invalid_response" };
      return body as CafeCommunitySnapshot;
    },
    async command(token, command, signal, keepalive) {
      const { response, body } = await requestJson(fetcher, "/api/cafe/community", {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(command), cache: "no-store", credentials: "same-origin", signal, keepalive,
      });
      if (!response.ok || !record(body) || body.ok !== true) return failure(body, response.status);
      return {
        ok: true,
        ...(typeof body.roomId === "string" ? { roomId: body.roomId } : {}),
        ...(typeof body.callId === "string" ? { callId: body.callId } : {}),
        ...(typeof body.reportId === "string" ? { reportId: body.reportId } : {}),
        ...(body.cleanupPending === true ? { cleanupPending: true } : {}),
      };
    },
  };
}
export const cafeCommunityTransport = createCafeCommunityTransport();

export async function getCafeReports(token: string, signal?: AbortSignal): Promise<{ok:true;reports:CafeModerationReport[]} | CafeCommunityFailure> {
  const response = await fetch("/api/admin/cafe/community/reports", {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal,
  });
  const body = await json(response);
  if (!response.ok || !record(body) || body.ok !== true || !Array.isArray(body.reports)) return failure(body, response.status);
  return { ok: true, reports: body.reports as CafeModerationReport[] };
}

export async function reviewCafeReport(token: string, reportId: string, signal?: AbortSignal): Promise<CafeCommunityCommandResult> {
  const response = await fetch("/api/admin/cafe/community/reports", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ reportId, action: "review" }), cache: "no-store", signal,
  });
  const body = await json(response);
  return response.ok && record(body) && body.ok === true ? { ok: true } : failure(body, response.status);
}
