import { YoCourseAccountEntry } from "@/components/yo/YoCourseSignInLink";
import { RankingAwardNotice } from "@/components/yo/rankings/RankingAwardNotice";
import type { ReactNode } from "react";
import "@/components/yo/onboarding/yoppoJournal.css";
import "@/components/yo/travel/travelFilm.css";

export default function LanguageLayout({ children }: { children: ReactNode }) {
  return <>{children}<YoCourseAccountEntry /><RankingAwardNotice /></>;
}
