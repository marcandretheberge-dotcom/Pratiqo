import { getSupabaseClient } from "@/lib/supabase";
import type { TeacherOfferDto } from "./types";

async function bearerHeaders(): Promise<HeadersInit> {
  const { data } = await getSupabaseClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("unauthenticated");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export type TeacherOffersApiError = {
  status: number;
  error: string;
  issues?: Array<{ path?: string; message?: string }>;
  missingFields?: string[];
};

export type TeacherOffersApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: TeacherOffersApiError };

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function asError(status: number, payload: unknown): TeacherOffersApiError {
  if (payload && typeof payload === "object" && "error" in payload) {
    const row = payload as {
      error?: unknown;
      issues?: TeacherOffersApiError["issues"];
      missingFields?: unknown;
    };
    return {
      status,
      error: typeof row.error === "string" ? row.error : "server_error",
      issues: Array.isArray(row.issues) ? row.issues : undefined,
      missingFields: Array.isArray(row.missingFields)
        ? row.missingFields.filter((item): item is string => typeof item === "string")
        : undefined,
    };
  }
  return { status, error: "server_error" };
}

export async function fetchTeacherOffers(): Promise<TeacherOffersApiResult<{ offers: TeacherOfferDto[] }>> {
  const headers = await bearerHeaders();
  const res = await fetch("/api/teacher/offers", { headers });
  const payload = await parseJson(res);
  if (!res.ok) return { ok: false, error: asError(res.status, payload) };
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { offers?: unknown }).offers)) {
    return { ok: false, error: { status: res.status, error: "server_error" } };
  }
  return { ok: true, data: { offers: (payload as { offers: TeacherOfferDto[] }).offers } };
}

export async function createTeacherOffer(
  body: Record<string, unknown>,
): Promise<TeacherOffersApiResult<{ offer: TeacherOfferDto }>> {
  const headers = await bearerHeaders();
  const res = await fetch("/api/teacher/offers", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const payload = await parseJson(res);
  if (!res.ok) return { ok: false, error: asError(res.status, payload) };
  const offer = (payload as { offer?: TeacherOfferDto } | null)?.offer;
  if (!offer) return { ok: false, error: { status: res.status, error: "server_error" } };
  return { ok: true, data: { offer } };
}

export async function updateTeacherOffer(
  offerId: string,
  body: Record<string, unknown>,
): Promise<TeacherOffersApiResult<{ offer: TeacherOfferDto }>> {
  const headers = await bearerHeaders();
  const res = await fetch(`/api/teacher/offers/${offerId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  const payload = await parseJson(res);
  if (!res.ok) return { ok: false, error: asError(res.status, payload) };
  const offer = (payload as { offer?: TeacherOfferDto } | null)?.offer;
  if (!offer) return { ok: false, error: { status: res.status, error: "server_error" } };
  return { ok: true, data: { offer } };
}

export async function archiveTeacherOffer(offerId: string): Promise<TeacherOffersApiResult<{ ok: true }>> {
  const headers = await bearerHeaders();
  const res = await fetch(`/api/teacher/offers/${offerId}`, {
    method: "DELETE",
    headers,
  });
  const payload = await parseJson(res);
  if (!res.ok) return { ok: false, error: asError(res.status, payload) };
  return { ok: true, data: { ok: true } };
}
