import { cafeCommunityTransport, type CafeCommunityTransport } from "./communityClient";
import type { CafeCommunityCallJoin, CafeCommunityFailure } from "./communityTypes";

export type CafeCallStatusResult = { ok: true; callId: string; roomId: string; endsAt: string } | CafeCommunityFailure;
export interface CafeCommunityCallTransport extends CafeCommunityTransport {
  status(token: string, callId: string, signal?: AbortSignal): Promise<CafeCallStatusResult>;
  join(token: string, callId: string, signal?: AbortSignal): Promise<CafeCommunityCallJoin>;
}

async function callRequest(token: string, callId: string, join: boolean, signal?: AbortSignal): Promise<Record<string, unknown> | null> {
  const response = await fetch(`/api/cafe/community/calls/${encodeURIComponent(callId)}${join ? "/join" : ""}`, {
    method: join ? "POST" : "GET", cache: "no-store", credentials: "same-origin", signal,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const body = await response.json().catch(() => null);
  return response.ok && body && typeof body === "object" && !Array.isArray(body) ? body : { ok: false, code: "call_unavailable" };
}

export const cafeCommunityCallTransport: CafeCommunityCallTransport = {
  ...cafeCommunityTransport,
  async status(token, callId, signal) {
    const body = await callRequest(token, callId, false, signal);
    if (!body || body.ok !== true || body.callId !== callId || typeof body.roomId !== "string" ||
      typeof body.endsAt !== "string" || !Number.isFinite(Date.parse(body.endsAt))) return { ok: false, code: "call_unavailable" };
    return { ok: true, callId, roomId: body.roomId, endsAt: body.endsAt };
  },
  async join(token, callId, signal) {
    const body = await callRequest(token, callId, true, signal);
    if (!body || body.ok !== true || typeof body.roomUrl !== "string" || typeof body.token !== "string" ||
      !body.token || typeof body.endsAt !== "string" || typeof body.expiresAt !== "string") return { ok: false, code: "call_unavailable" };
    try {
      const url = new URL(body.roomUrl);
      if (url.protocol !== "https:" || !/^[a-z0-9-]+\.daily\.co$/.test(url.hostname) || url.username || url.password ||
        url.port || !Number.isFinite(Date.parse(body.endsAt)) || !Number.isFinite(Date.parse(body.expiresAt))) return { ok: false, code: "call_unavailable" };
      return { ok: true, roomUrl: url.href, token: body.token, expiresAt: body.expiresAt, endsAt: body.endsAt };
    } catch { return { ok: false, code: "call_unavailable" }; }
  },
};
