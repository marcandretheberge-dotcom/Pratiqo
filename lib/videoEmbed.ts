/**
 * Converts a YouTube or Vimeo share/watch URL into a privacy-respecting embed URL.
 * Returns `null` for unrecognised or empty input.
 *
 * Supported formats
 *   YouTube : https://www.youtube.com/watch?v=ID
 *             https://youtu.be/ID
 *             https://www.youtube.com/embed/ID  (already an embed URL — normalised)
 *   Vimeo   : https://vimeo.com/ID
 *             https://player.vimeo.com/video/ID (already embed — normalised)
 */
export function getEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = raw.trim();
  if (!url) return null;

  // ── YouTube ──────────────────────────────────────────────────────────────
  // watch?v=  or  /embed/  or  youtu.be/
  const ytWatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  if (ytWatch) {
    // Use youtube-nocookie for privacy (no third-party cookies)
    return `https://www.youtube-nocookie.com/embed/${ytWatch[1]}?rel=0`;
  }

  // ── Vimeo ────────────────────────────────────────────────────────────────
  // vimeo.com/ID  or  player.vimeo.com/video/ID
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return `https://player.vimeo.com/video/${vimeo[1]}?dnt=1`;
  }

  return null;
}

/** Returns `true` if the URL is a YouTube or Vimeo link we can embed. */
export function isValidVideoUrl(url: string): boolean {
  return getEmbedUrl(url) !== null;
}
