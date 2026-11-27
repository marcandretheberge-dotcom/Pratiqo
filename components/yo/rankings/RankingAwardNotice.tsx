"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/locale-context";
import { rankingCopy } from "@/lib/yo/rankings/copy";
import type { RankingAward } from "@/lib/yo/rankings/contract";
import type { YoLocale } from "@/lib/yo/types";
import { getYoLocale } from "@/lib/yo/localize";

const syncCopy = {
  fr: "Ces XP n’ont pas pu être enregistrés. Continue à apprendre et réessaie cet exercice une fois connecté.",
  en: "These XP couldn’t be saved. Keep learning and retry this exercise when you’re back online.",
  es: "No se pudieron guardar estos XP. Sigue aprendiendo y repite este ejercicio cuando vuelvas a estar en línea.",
};
const replayCopy = {
  fr: "Tes progrès sont conservés. Rejoue cet exercice pour gagner des XP.",
  en: "Progress saved. Replay this exercise to earn XP.",
  es: "Tu progreso está guardado. Repite este ejercicio para ganar XP.",
};

/** An overlay with no focus capture or sound; only confirmed server awards are celebrated. */
export function RankingAwardNotice() {
  return <Suspense fallback={null}><CurrentAwardNotice /></Suspense>;
}

function CurrentAwardNotice() {
  const { user } = useAuth();
  const { locale: fallbackLocale } = useLocale();
  const query = useSearchParams();
  const locale = getYoLocale(query?.get("lang") ?? fallbackLocale);
  return user ? <AccountAwardNotice key={user.id} locale={locale} /> : null;
}

function AccountAwardNotice({ locale }: { locale: YoLocale }) {
  const [notice, setNotice] = useState<{ kind: "award"; xp: number } | { kind: "sync" } | { kind: "replay" } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const award = (event: Event) => {
      const value = (event as CustomEvent<RankingAward>).detail;
      if (!value || !Number.isSafeInteger(value.awarded) || value.awarded <= 0 || !Number.isSafeInteger(value.totalXp)) return;
      setNotice({ kind: "award", xp: value.awarded });
      clearTimeout(timer); timer = setTimeout(() => setNotice(null), 5500);
    };
    const failed = () => { clearTimeout(timer); setNotice({ kind: "sync" }); };
    const replay = () => { clearTimeout(timer); setNotice({ kind: "replay" }); timer = setTimeout(() => setNotice(null), 9000); };
    window.addEventListener("yo:ranking-award", award); window.addEventListener("yo:ranking-sync-error", failed); window.addEventListener("yo:ranking-replay-needed", replay);
    return () => { clearTimeout(timer); window.removeEventListener("yo:ranking-award", award); window.removeEventListener("yo:ranking-sync-error", failed); window.removeEventListener("yo:ranking-replay-needed", replay); };
  }, []);
  if (!notice) return null;
  const c = rankingCopy[locale];
  return <aside className="pointer-events-none fixed inset-x-3 top-20 z-50 flex justify-center" data-testid="yo-xp-notice">
    <div className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg ${notice.kind === "sync" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-200 bg-white text-emerald-900"}`}>
      <span role="status" className="flex min-w-0 items-center gap-2 text-sm">
        {notice.kind === "sync" ? syncCopy[locale] : notice.kind === "replay" ? replayCopy[locale] : <><Sparkles size={18} aria-hidden /><strong>+{notice.xp} {c.award}</strong></>}
      </span>
      {notice.kind === "award" ? <Link href={`/yo/classement?lang=${locale}`} className="shrink-0 text-xs font-bold underline">{c.rankings}</Link> : null}
      <button type="button" aria-label={c.close} onClick={() => setNotice(null)} className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2"><X size={16} aria-hidden /></button>
    </div>
  </aside>;
}
