import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { isCafePeopleEnabled } from "./communityFeatureFlag";
import { authenticateCafeRequest } from "./serverAuth";
import { communityJson, type CafeCommunityRpcReply } from "./communityServer";
import { communityRecord, communityUuid, isCommunitySameOrigin } from "./communityValidation";
import { getSupabaseAdmin } from "../supabaseAdmin";
import { CAFE_PHOTO_MAX_BYTES } from "./communityPhotoPolicy";

const MAX_UPLOAD = CAFE_PHOTO_MAX_BYTES;
const BUCKET = "cafe-avatars";
type Dependencies = {
  enabled: () => boolean;
  authenticate: typeof authenticateCafeRequest;
  limit: (request: Request, actor: string, write: boolean) => Promise<boolean>;
  rpc: (args: Record<string, unknown>) => Promise<CafeCommunityRpcReply>;
  upload: (path: string, bytes: Buffer) => Promise<boolean>;
  download: (path: string) => Promise<Blob | null>;
  remove: (path: string) => Promise<void>;
};

/** Decode before accepting: no SVG, animation, EXIF, GPS or original filename survives. */
export async function processCafePhoto(request: Request): Promise<Buffer | null> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(request.headers.get("content-type") ?? "")) return null;
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD || !request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_UPLOAD) { void reader.cancel().catch(() => undefined); return null; }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    const options = { limitInputPixels: 16_000_000, failOn: "warning" as const };
    const metadata = await sharp(bytes, options).metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) return null;
    const result = await sharp(bytes, options).rotate().resize(384, 384, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
    return result.length <= 262_144 ? result : null;
  } catch { return null; } finally { reader.releaseLock(); }
}

export function createCafePhotoHandler(deps: Dependencies) {
  return async (request: Request, memberId?: string): Promise<Response> => {
    const fail = (code: string, status: number) => communityJson({ ok: false, code }, status);
    try {
      if (!deps.enabled()) return fail("not_found", 404);
      const write = request.method !== "GET";
      if (!(memberId ? request.method === "GET" : ["PUT", "DELETE"].includes(request.method))) return fail("method_not_allowed", 405);
      if (write && !isCommunitySameOrigin(request)) return fail("origin_not_allowed", 403);
      const auth = await deps.authenticate(request);
      if (!auth.ok) return fail("unauthorized", auth.status);
      const actor = communityUuid(auth.id), target = memberId ? communityUuid(memberId) : actor;
      if (!actor || !target) return fail("not_found", 404);
      if (!await deps.limit(request, actor, write)) return fail("rate_limited", 429);
      // Authorization precedes decoding and Storage access.
      const permission = await deps.rpc({ p_actor_id: actor, p_member_id: target });
      const previous = communityRecord(permission.data);
      if (permission.error) return fail("cafe_unavailable", 503);
      if (previous?.ok !== true) return fail("not_found", 404);
      if (!write) {
        const version = communityUuid(previous.version);
        if (!version) return fail("not_found", 404);
        const blob = await deps.download(`${target}/${version}.webp`);
        if (!blob) return fail("not_found", 404);
        return new Response(blob, { headers: {
          "Content-Type": "image/webp", "Cache-Control": "private, no-store", "Vary": "Authorization, Cookie",
          "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'",
        } });
      }
      const version = request.method === "DELETE" ? null : randomUUID();
      if (version) {
        const image = await processCafePhoto(request);
        if (!image) return fail("invalid_photo", 400);
        if (!await deps.upload(`${actor}/${version}.webp`, image)) return fail("cafe_unavailable", 503);
      }
      const saved = await deps.rpc({ p_actor_id: actor, p_member_id: actor, p_write: true, p_version: version });
      const result = communityRecord(saved.data);
      // An ambiguous database timeout may have committed. Never delete the new
      // object in that case; a future orphan cleanup can safely reconcile it.
      if (saved.error) return fail("cafe_unavailable", 503);
      if (result?.ok !== true) {
        if (version) await deps.remove(`${actor}/${version}.webp`).catch(() => undefined);
        return fail("not_allowed", 403);
      }
      const old = communityUuid(result.version);
      if (old) await deps.remove(`${actor}/${old}.webp`).catch(() => undefined);
      return communityJson({ ok: true });
    } catch { return fail("cafe_unavailable", 503); }
  };
}

export const cafePhotoHandler = createCafePhotoHandler({
  enabled: isCafePeopleEnabled,
  authenticate: authenticateCafeRequest,
  limit: async (request, actor, write) => {
    const { rateLimitByIp } = await import("../rateLimit");
    const personal = await rateLimitByIp(request, write ? "cafe-photo-write" : "cafe-photo-read", { identifier: actor, limit: write ? 6 : 180, windowSeconds: 60 });
    if (!personal.allowed) return false;
    return (await rateLimitByIp(request, "cafe-photo-ip", { limit: 600, windowSeconds: 60 })).allowed;
  },
  rpc: async args => {
    const reply = await getSupabaseAdmin().rpc("cafe_community_avatar_server", args);
    return { data: reply.data, error: reply.error ? { code: reply.error.code } : null };
  },
  upload: async (path, bytes) => !(await getSupabaseAdmin().storage.from(BUCKET).upload(path, bytes, { contentType: "image/webp", upsert: false })).error,
  download: async path => (await getSupabaseAdmin().storage.from(BUCKET).download(path)).data,
  remove: async path => { await getSupabaseAdmin().storage.from(BUCKET).remove([path]); },
});
