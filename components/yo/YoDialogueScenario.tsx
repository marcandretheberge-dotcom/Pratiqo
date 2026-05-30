/**
 * YoDialogueScenario — dialogue-style chat bubbles for the lesson panel.
 *
 * Pure presentational component (no client state). Renders each line
 * with speaker-aligned bubbles:
 *   - "host" (réceptionniste / receptionist, vendeur / cashier, …) →
 *     cream bubble, left-aligned
 *   - "self" (toi / you) → teal bubble, right-aligned
 *
 * Spanish lines carry `lang="es"`. Speaker labels and the optional gloss
 * are localized via `t()`. The HTML id used for `aria-labelledby` slugs
 * the FR title so it stays stable across language switches (no anchor
 * drift, no hydration flips).
 */

import type { YoDialogueScenarioData, YoLocale } from "@/lib/yo/types";
import { t } from "@/lib/yo/localize";
import {
  YoSpanishAudioButton,
  type YoSpanishAudioContext,
} from "@/components/yo/YoSpanishAudioButton";

export interface YoDialogueScenarioProps {
  scenario: YoDialogueScenarioData;
  locale: YoLocale;
  /**
   * Optional audio context. When provided, each dialogue line gets a
   * `YoSpanishAudioButton` so learners can hear the receptionist /
   * learner turns. The wrapper picks the correct accent variant for
   * the lesson (e.g. dominican_republic for the RD hotel dialogue).
   */
  audioContext?: YoSpanishAudioContext;
}

export function YoDialogueScenario({
  scenario,
  locale,
  audioContext,
}: YoDialogueScenarioProps) {
  const titleId = `yo-dialogue-${slug(scenario.title.fr)}-title`;
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5"
    >
      <h4
        id={titleId}
        className="mb-3 text-[0.95rem] font-medium text-[#1a3a32] sm:text-base"
      >
        {t(scenario.title, locale)}
      </h4>

      <ol role="list" className="flex flex-col gap-2.5">
        {scenario.lines.map((line, index) => {
          const isSelf = line.speakerKind === "self";
          return (
            <li
              key={`${line.speakerKind}-${index}`}
              className={`flex flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${isSelf ? "text-teal-800" : "text-[#8a5a17]"}`}
              >
                {t(line.speakerLabel, locale)}
              </span>
              <div
                className={`flex max-w-[88%] items-start gap-2 rounded-2xl px-3.5 py-2.5 text-sm leading-snug shadow-[0_1px_2px_rgba(15,58,52,0.05)] ring-1 sm:text-[0.95rem] ${
                  isSelf
                    ? "rounded-br-md bg-teal-600 text-white ring-teal-700/20"
                    : "rounded-bl-md bg-[#fff4e2] text-[#7a4f1d] ring-[#f3dcb4]"
                }`}
              >
                <div className="flex flex-1 flex-col">
                  <p lang="es" className="font-medium">
                    {line.target}
                  </p>
                  {line.translation ? (
                    <p
                      className={`mt-1 text-xs ${isSelf ? "text-white/85" : "text-[#7a4f1d]/85"}`}
                    >
                      {t(line.translation, locale)}
                    </p>
                  ) : null}
                </div>
                {audioContext ? (
                  <YoSpanishAudioButton
                    text={line.target}
                    locale={locale}
                    moduleId={audioContext.moduleId}
                    lessonId={audioContext.lessonId}
                    type={audioContext.type ?? "dialogue"}
                    accentProfile={audioContext.accentProfile}
                    speechLang={audioContext.speechLang}
                    size="xs"
                    className="mt-0.5 shrink-0"
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
