type TeacherImageOptions = {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp";
};

export function getTeacherImageUrl(url: string | null | undefined, options: TeacherImageOptions = {}) {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    const marker = "/storage/v1/object/public/";
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return raw;

    const objectPath = parsed.pathname.slice(index + marker.length);
    if (!objectPath) return raw;
    // Avatars bucket: keep the stable object/public URL. Supabase render/image
    // requires optional image transformations and 404s on many projects — search
    // cards were falling back to initials while raw <img> on profile preview worked.
    if (objectPath.startsWith("avatars/")) {
      return raw;
    }
    parsed.pathname = `${parsed.pathname.slice(0, index)}/storage/v1/render/image/public/${objectPath}`;
    if (options.width) parsed.searchParams.set("width", String(options.width));
    if (options.height) parsed.searchParams.set("height", String(options.height));
    if (options.quality) parsed.searchParams.set("quality", String(options.quality));
    if (options.format) parsed.searchParams.set("format", options.format);
    return parsed.toString();
  } catch {
    return raw;
  }
}

export function shouldUseUnoptimizedImage(url: string) {
  if (!url || url.startsWith("/")) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname.length > 0;
  } catch {
    return false;
  }
}
