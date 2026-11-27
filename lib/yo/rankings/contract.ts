/** Shared wire contract. Public IDs are never authentication user IDs. */
export const RANKING_LANGUAGES = ["it", "de", "pt-BR", "en", "es", "fr-CA", "ja", "zh"] as const;
export type RankingLanguage = typeof RANKING_LANGUAGES[number];
export type RankingScope = "everyone" | "friends";
export type RankingPeriod = "week" | "all";
export type RankingAnswer = string | string[] | Record<string, string>;
export interface RankingAttempt {
  language: RankingLanguage;
  itemId: string;
  answer: RankingAnswer;
}
export interface RankingProfile {
  id: string;
  displayName: string;
  participating: boolean;
  friendCode: string;
  totalXp: number;
  weekXp: number;
}
export interface RankingRow {
  id: string;
  name: string;
  xp: number;
  rank: number;
  isYou: boolean;
  friend: boolean;
}
export interface RankingFriend { id: string; name: string }
export interface RankingSnapshot {
  profile: RankingProfile;
  scope: RankingScope;
  period: RankingPeriod;
  language: RankingLanguage | "all";
  weekStartsAt: string;
  rows: RankingRow[];
  nearby: RankingRow[];
  me: RankingRow | null;
  totalParticipants: number;
  friends: {
    incoming: RankingFriend[];
    outgoing: RankingFriend[];
    accepted: RankingFriend[];
    blocked: RankingFriend[];
  };
}
export type RankingFriendAction =
  | { action: "request"; code: string }
  | { action: "accept" | "decline" | "remove" | "block" | "unblock"; id: string };
export interface RankingAward { awarded: number; totalXp: number; weekXp: number }
