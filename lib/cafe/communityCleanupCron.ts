import { createHash, timingSafeEqual } from "node:crypto";
import { communityJson } from "./communityServer";
import { isCommunitySameOrigin } from "./communityValidation";

type CleanupDependencies = {
  secret: () => string | undefined;
  cleanup: (input: { actorId: null }) => Promise<{ pending: boolean }>;
};

function authorized(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  // Fixed-size digests keep the secret comparison constant-time even for a wrong-length value.
  const match = /^Bearer[\t ]+(\S+)$/i.exec(header);
  if (!match || match[1].length > 8_192) return false;
  const expected = createHash("sha256").update(secret, "utf8").digest();
  const provided = createHash("sha256").update(match[1], "utf8").digest();
  return timingSafeEqual(provided, expected);
}

/** Close-only work deliberately survives both community and video feature switches. */
export function createCommunityCleanupCron(deps: CleanupDependencies) {
  return async (request: Request): Promise<Response> => {
    try {
      const secret = deps.secret()?.trim();
      if (!secret) return communityJson({ ok: false, code: "cleanup_unavailable" }, 503);
      if (!authorized(request, secret)) return communityJson({ ok: false, code: "unauthorized" }, 401);
      if (request.method !== "GET" && request.method !== "POST") {
        return communityJson({ ok: false, code: "method_not_allowed" }, 405, { Allow: "GET, POST" });
      }
      if (request.method === "POST" && !isCommunitySameOrigin(request)) {
        return communityJson({ ok: false, code: "origin_not_allowed" }, 403);
      }
      // Client body/query identifiers are never read; only the trusted cron can drain global outbox rows.
      const result = await deps.cleanup({ actorId: null });
      return result.pending
        ? communityJson({ ok: false, code: "cleanup_pending", retryAfter: 60 }, 503, { "Retry-After": "60" })
        : communityJson({ ok: true });
    } catch {
      // No provider text, identifiers, tokens, request contents, or configured secret are logged/returned.
      return communityJson({ ok: false, code: "cleanup_unavailable", retryAfter: 60 }, 503, { "Retry-After": "60" });
    }
  };
}

export const cafeCommunityCleanupCron = createCommunityCleanupCron({
  secret: () => process.env.CRON_SECRET,
  cleanup: async input => {
    const { cleanupCommunityCalls } = await import("./communityCallProvider");
    return cleanupCommunityCalls(input);
  },
});
