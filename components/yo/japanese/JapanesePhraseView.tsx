import type { JapanesePhrase } from "@/lib/yo/japaneseCourseTypes";
import type { YoLocale } from "@/lib/yo/types";
import { JapaneseCourseAudio } from "./JapaneseCourseAudio";

export function JapanesePhraseView({ phrase, locale, showReading = true, showMeaning = true, showRomaji = false, audio = true, large = false }: {
  phrase: JapanesePhrase; locale: YoLocale; showReading?: boolean; showMeaning?: boolean; showRomaji?: boolean; audio?: boolean; large?: boolean;
}) {
  return <div className="space-y-2">
    <p lang="ja" className={(large ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl") + " leading-relaxed font-medium text-slate-900 break-words"}>{phrase.ja}</p>
    {showReading && phrase.kana !== phrase.ja ? <p lang="ja" className="text-sm leading-relaxed text-indigo-700">{phrase.kana}</p> : null}
    {showRomaji ? <p lang="ja-Latn" className="text-sm italic text-slate-500">{phrase.romaji}</p> : null}
    {showMeaning ? <p className="text-sm leading-relaxed text-slate-600">{phrase.meaning[locale]}</p> : null}
    {audio ? <JapaneseCourseAudio text={phrase.ja} locale={locale} /> : null}
  </div>;
}
