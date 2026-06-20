import { mergeOnboardingRoleConfirmedDashboard } from "@/lib/auth/onboardingRoleChoice";
import { resolvePostAuthRedirect, type ProfileRole } from "@/lib/auth/postAuthRedirect";
import {
  oauthNextPathForPreAuthIntent,
  type PreAuthOnboardingIntent,
} from "@/lib/auth/preAuthOnboardingIntent";

/** Never send authenticated users to the public landing page. */
export function guardAuthRedirectPath(
  path: string,
  intent: PreAuthOnboardingIntent | null,
): string {
  if (path === "/" || path === "") {
    if (intent === "teacher") return oauthNextPathForPreAuthIntent("teacher");
    if (intent === "learner") return oauthNextPathForPreAuthIntent("learner");
    return "/dashboard";
  }
  return path;
}

/**
 * Deterministic post-OAuth redirect for the server callback route.
 * When pre-auth intent is known, resolve the final in-app destination directly.
 */
export function resolveOAuthCallbackRedirect(input: {
  intent: PreAuthOnboardingIntent | null;
  next: string;
  role: ProfileRole;
  profile: {
    teacher_onboarding_complete?: boolean | null;
    companion_chosen?: boolean | null;
    dashboard?: unknown;
  } | null;
}): string {
  const profileForRedirect = input.profile ??
    (input.intent
      ? {
          companion_chosen: false,
          teacher_onboarding_complete: false,
          dashboard: mergeOnboardingRoleConfirmedDashboard({}),
        }
      : {
          companion_chosen: false,
          dashboard: {},
        });

  const path = resolvePostAuthRedirect(
    input.role,
    profileForRedirect,
    input.intent ? input.next : undefined,
    input.intent ? { preAuthIntentConsumed: input.intent } : undefined,
  );

  return guardAuthRedirectPath(path, input.intent);
}
