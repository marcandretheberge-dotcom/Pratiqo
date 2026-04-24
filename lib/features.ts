export const FEATURES = {
  individual_lessons: true,
  geolocation_search: true,
  stripe_payments: true,
  google_auth: true,
  messaging: true,
  progress_tracking: true,
  verification_badges: true,
  loyalty_program: true,
  home_lessons: true,
  ai_description: true,

  group_sessions: false,
  enterprise_plan: false,
  video_lessons_jitsi: false,

  stripe_identity_verification: false,
  open_marketplace: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature];
}
