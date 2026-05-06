export type ReviewSafetyReason = "profanity" | "harassment" | "privacy";

export type ReviewSafetyResult =
  | { ok: true }
  | { ok: false; reason: ReviewSafetyReason; message: string };

const REVIEW_BLOCKED_PATTERNS: Array<{ reason: ReviewSafetyReason; pattern: RegExp }> = [
  { reason: "profanity", pattern: /\b(fuck|shit|bitch|asshole|criss|tabarnak|ostie|caliss?e?|connard|connasse|salope)\b/i },
  { reason: "harassment", pattern: /\b(kill yourself|go die|menace|harcelement|harc[eè]lement)\b/i },
  { reason: "privacy", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { reason: "privacy", pattern: /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/ },
  { reason: "privacy", pattern: /\b\d{1,5}\s+(?:rue|avenue|av\.|boulevard|boul\.|chemin|ch\.|street|st\.|road|rd\.|drive|dr\.)\b/i },
];

const REVIEW_SAFETY_MESSAGES: Record<ReviewSafetyReason, string> = {
  profanity: "Oups ! Veuillez utiliser un langage respectueux pour que votre avis puisse etre publie.",
  harassment: "Oups ! Veuillez reformuler votre avis de facon constructive pour qu'il puisse etre publie.",
  privacy: "Oups ! Retirez les informations privees avant de publier votre avis.",
};

export function checkReviewSafety(text: string | null | undefined): ReviewSafetyResult {
  const value = (text ?? "").trim();
  if (!value) return { ok: true };

  for (const rule of REVIEW_BLOCKED_PATTERNS) {
    if (rule.pattern.test(value)) {
      return {
        ok: false,
        reason: rule.reason,
        message: REVIEW_SAFETY_MESSAGES[rule.reason],
      };
    }
  }

  return { ok: true };
}
