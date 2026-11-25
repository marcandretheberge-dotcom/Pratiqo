export type CafePublicSession = {
  slug: string;
  title: string;
  primary_language: string;
  practice_language: string | null;
  level: string | null;
  starts_at: string;
  duration_minutes: number;
  max_participants: number;
  confirmed_count: number;
  remaining_spots: number;
};

export function languagePair(session: CafePublicSession) {
  const primary = session.primary_language.trim();
  const practice = session.practice_language?.trim();
  return practice ? `${primary} ↔ ${practice}` : primary;
}
