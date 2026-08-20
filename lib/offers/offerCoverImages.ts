/**
 * Teacher offer cover image helpers (PR 15).
 *
 * Covers are teacher-owned visuals for course offers — not Pratiqo stock art.
 * Upload/delete only via owned-teacher API. image_url is not client-writable
 * via generic JSON PATCH.
 *
 * Future PR: optional image crop/position tools and moderation review.
 */

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { isSafeTeacherOfferImageUrl } from "./validation";

export const TEACHER_OFFER_COVER_BUCKET = "teacher-offer-covers";
export const TEACHER_OFFER_COVER_MAX_BYTES = 3 * 1024 * 1024;
export const TEACHER_OFFER_COVER_MAX_WIDTH = 1600;
export const TEACHER_OFFER_COVER_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type TeacherOfferCoverMime = (typeof TEACHER_OFFER_COVER_ALLOWED_MIME)[number];

export type CoverValidationFailure =
  | { ok: false; error: "invalid_file" }
  | { ok: false; error: "unsupported_image_type" }
  | { ok: false; error: "image_too_large" };

export type CoverValidationSuccess = {
  ok: true;
  mime: TeacherOfferCoverMime;
  size: number;
};

export function isAllowedTeacherOfferCoverMime(
  value: string | null | undefined,
): value is TeacherOfferCoverMime {
  return (
    value === "image/jpeg" || value === "image/png" || value === "image/webp"
  );
}

export function validateTeacherOfferCoverFile(input: {
  mime: string | null | undefined;
  size: number;
}): CoverValidationSuccess | CoverValidationFailure {
  if (!Number.isFinite(input.size) || input.size <= 0) {
    return { ok: false, error: "invalid_file" };
  }
  if (!isAllowedTeacherOfferCoverMime(input.mime)) {
    return { ok: false, error: "unsupported_image_type" };
  }
  if (input.size > TEACHER_OFFER_COVER_MAX_BYTES) {
    return { ok: false, error: "image_too_large" };
  }
  return { ok: true, mime: input.mime, size: input.size };
}

/** Constrained object key: {teacherId}/{offerId}/{uuid}.webp */
export function buildTeacherOfferCoverStoragePath(input: {
  teacherId: string;
  offerId: string;
  objectId?: string;
}): string {
  const teacherId = input.teacherId.trim();
  const offerId = input.offerId.trim();
  const objectId = (input.objectId ?? randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!teacherId || !offerId || !objectId) {
    throw new Error("invalid_cover_path_parts");
  }
  if (teacherId.includes("/") || offerId.includes("/") || teacherId.includes("..") || offerId.includes("..")) {
    throw new Error("invalid_cover_path_parts");
  }
  return `${teacherId}/${offerId}/${objectId}.webp`;
}

export function isTeacherOfferCoverStoragePath(
  value: string | null | undefined,
  teacherId: string,
  offerId: string,
): boolean {
  if (!value?.trim()) return false;
  const path = value.trim();
  if (path.includes("..") || path.startsWith("/")) return false;
  const prefix = `${teacherId}/${offerId}/`;
  return path.startsWith(prefix) && /^[A-Za-z0-9._~/-]+$/.test(path);
}

export function publicUrlForTeacherOfferCoverPath(storagePath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base || !storagePath.trim()) return null;
  return `${base}/storage/v1/object/public/${TEACHER_OFFER_COVER_BUCKET}/${storagePath.trim()}`;
}

/** Extract storage object key from a public URL we own, else null. */
export function extractTeacherOfferCoverStoragePath(
  imageUrl: string | null | undefined,
): string | null {
  if (!imageUrl?.trim()) return null;
  const value = imageUrl.trim();
  const marker = `/storage/v1/object/public/${TEACHER_OFFER_COVER_BUCKET}/`;
  const idx = value.indexOf(marker);
  if (idx === -1) return null;
  const path = decodeURIComponent(value.slice(idx + marker.length).split("?")[0] ?? "");
  if (!path || path.includes("..")) return null;
  return path;
}

export async function processTeacherOfferCoverImage(
  input: Buffer,
): Promise<{ buffer: Buffer; contentType: "image/webp" }> {
  const buffer = await sharp(input)
    .rotate()
    .resize({
      width: TEACHER_OFFER_COVER_MAX_WIDTH,
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
  return { buffer, contentType: "image/webp" };
}

export function assertSafeCoverImageUrlForPersist(url: string): boolean {
  return isSafeTeacherOfferImageUrl(url) && url.startsWith("https://");
}
