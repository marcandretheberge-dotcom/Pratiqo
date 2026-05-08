export type MeetingProvider = "zoom" | "google_meet" | "microsoft_teams" | "other";

const BLOCKED_PROTOCOLS = new Set(["javascript:", "data:", "file:", "vbscript:"]);

export function isValidMeetingUrl(raw: string): boolean {
  try {
    const s = String(raw || "").trim();
    if (!s) return false;
    // Fast reject unsafe schemes even if URL parsing would accept them.
    const lower = s.toLowerCase();
    for (const proto of BLOCKED_PROTOCOLS) {
      if (lower.startsWith(proto)) return false;
    }
    const url = new URL(s);
    if (url.protocol !== "https:") return false;
    if (!url.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

export function sanitizeMeetingUrl(raw: string): string {
  const s = String(raw || "").trim();
  if (!isValidMeetingUrl(s)) return "";
  // Keep transformations minimal: trim only, preserve query/hash.
  return s;
}

export function detectMeetingProvider(urlLike: string): MeetingProvider {
  try {
    const url = new URL(String(urlLike || "").trim());
    const host = url.hostname.toLowerCase();
    if (host === "zoom.us" || host.endsWith(".zoom.us")) return "zoom";
    if (host === "meet.google.com") return "google_meet";
    if (host === "teams.microsoft.com" || host.endsWith(".teams.microsoft.com")) return "microsoft_teams";
    return "other";
  } catch {
    return "other";
  }
}

export function getMeetingProviderLabel(provider: MeetingProvider): string {
  if (provider === "zoom") return "Zoom";
  if (provider === "google_meet") return "Google Meet";
  if (provider === "microsoft_teams") return "Microsoft Teams";
  return "Autre";
}

