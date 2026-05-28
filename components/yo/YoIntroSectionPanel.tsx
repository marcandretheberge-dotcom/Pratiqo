/**
 * YoIntroSectionPanel — renders the detailed learning panel for ONE
 * Intro section (geography, history, food, first phrases).
 *
 * Pure presentational component (no client state). The parent
 * `YoIntroExperience` controls which section is open and passes the
 * matching `YoIntroDetailedSection` here. The panel knows how to render
 * every optional shape declared on the type (intro, bullets,
 * highlight, bullet groups, practical phrases, vocabulary, timeline,
 * mini mission, dialogue, audio-coming-soon chip).
 *
 * No section field is required — the renderer only emits a block when
 * the corresponding field is non-empty. Localization: every learner-
 * facing string is resolved with `t()` against `locale`. Spanish phrases
 * stay plain with `lang="es"`.
 */

import { Sparkles, VolumeX, X } from "lucide-react";
import type {
  YoIntroDetailedSection,
  YoLocale,
} from "@/lib/yo/types";
import { YoImageVisual } from "@/components/yo/YoImageVisual";
import { YoVocabularyTable } from "@/components/yo/YoVocabularyTable";
import { YoDialogueScenario } from "@/components/yo/YoDialogueScenario";
import { t } from "@/lib/yo/localize";
import { YO_COPY } from "@/lib/yo/copy";

export interface YoIntroSectionPanelProps {
  section: YoIntroDetailedSection;
  locale: YoLocale;
  /** Stable id used for aria-labelledby and the parent's aria-controls. */
  panelId: string;
  /** Close handler — Phase 1 always wires this to clear the selection. */
  onClose: () => void;
}

export function YoIntroSectionPanel({
  section,
  locale,
  panelId,
  onClose,
}: YoIntroSectionPanelProps) {
  const titleId = `${panelId}-title`;
  const sectionLabel = t(YO_COPY.panel.sectionLabel, locale);
  const closeAria = t(YO_COPY.panel.closeAria, locale);
  const highlightLabel = t(YO_COPY.panel.highlightLabel, locale);
  const learningNotePrefix = t(YO_COPY.panel.learningNotePrefix, locale);
  const vocabHeading = YO_COPY.panel.vocabularyHeading;
  const miniMissionFallbackTitle = YO_COPY.panel.miniMissionFallbackTitle;
  const miniMissionFootnote = t(YO_COPY.panel.miniMissionFootnote, locale);

  return (
    <section
      id={panelId}
      role="region"
      aria-labelledby={titleId}
      className="overflow-hidden rounded-3xl border border-teal-100 bg-white shadow-[0_8px_24px_rgba(15,58,52,0.07)]"
    >
      {/* Visual header: real image slot first, polished fallback while assets are pending. */}
      {section.visualHint || section.imagePath ? (
        <div className="relative border-b border-teal-100/70 p-3 pb-0 sm:p-4 sm:pb-0">
          <YoImageVisual
            imagePath={section.imagePath}
            alt={section.imageAlt ?? section.title}
            locale={locale}
            fallbackKind={section.visualHint}
            variant="panel"
            className="rounded-2xl shadow-none"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-6 p-5 sm:gap-7 sm:p-8 lg:p-10">
        {/* Title row + close button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <span className="ds-label text-teal-700/80">{sectionLabel}</span>
            <h3
              id={titleId}
              className="text-2xl font-medium tracking-tight text-[#1a3a32] sm:text-[1.75rem]"
            >
              {t(section.title, locale)}
              {section.emoji ? (
                <span aria-hidden className="ml-2">
                  {section.emoji}
                </span>
              ) : null}
            </h3>
            {section.audioComingSoonLabel ? (
              <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#fdecec] px-2.5 py-1 text-[11px] font-medium text-[#a23a3a] ring-1 ring-[#f6c8c8]">
                <VolumeX aria-hidden className="size-3.5" />
                {t(section.audioComingSoonLabel, locale)}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={closeAria}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-base-cream)] text-teal-700 ring-1 ring-teal-100 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        {/* Lead paragraph */}
        {section.intro ? (
          <p className="text-base leading-relaxed text-[#1a3a32]/90 sm:text-[1.05rem]">
            {t(section.intro, locale)}
          </p>
        ) : null}

        {/* Highlight callout (e.g. "La Bandera Dominicana") */}
        {section.highlightTitle ? (
          <div className="rounded-2xl bg-gradient-to-br from-[#fff4e2] to-[#f3e8d0] p-4 ring-1 ring-[#e6d3aa] sm:p-5">
            <p className="ds-label text-[#8a5a17]">{highlightLabel}</p>
            <p className="mt-1 text-lg font-medium tracking-tight text-[#1a3a32] sm:text-xl">
              {t(section.highlightTitle, locale)}
            </p>
            {section.highlightBody ? (
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.95rem]">
                {t(section.highlightBody, locale)}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Section lead-in + simple bullets (used by geography) */}
        {section.sectionLeadIn || section.bullets ? (
          <div className="flex flex-col gap-3">
            {section.sectionLeadIn ? (
              <p className="text-[0.95rem] font-medium text-[#1a3a32]">
                {t(section.sectionLeadIn, locale)}
              </p>
            ) : null}
            {section.bullets && section.bullets.length > 0 ? (
              <ul role="list" className="flex flex-col gap-2">
                {section.bullets.map((bullet) => {
                  const label = t(bullet.label, locale);
                  return (
                    <li
                      key={label}
                      className="flex items-start gap-3 rounded-xl bg-[var(--color-base-cream)] px-3 py-2.5 ring-1 ring-teal-100/70"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-teal-500"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-[#1a3a32]">
                          {label}
                        </span>
                        {bullet.description ? (
                          <span className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                            {t(bullet.description, locale)}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}

        {/* Bullet groups (typical plate / drinks / greetings / …) */}
        {section.bulletGroups && section.bulletGroups.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {section.bulletGroups.map((group, index) => (
              <YoVocabularyTable
                key={`${group.heading ? t(group.heading, locale) : "group"}-${index}`}
                items={group.items}
                heading={group.heading}
                id={`${panelId}-group-${index}`}
                locale={locale}
              />
            ))}
          </div>
        ) : null}

        {/* Practical phrases (inline highlight) */}
        {section.practicalPhrases && section.practicalPhrases.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-teal-50/70 p-4 ring-1 ring-teal-100 sm:p-5">
            {section.practicalPhrasesIntro ? (
              <p className="text-sm font-medium text-teal-800 sm:text-[0.95rem]">
                {t(section.practicalPhrasesIntro, locale)}
              </p>
            ) : null}
            <ul role="list" className="flex flex-col gap-1.5">
              {section.practicalPhrases.map((phrase) => {
                const translation = t(phrase.translation, locale);
                return (
                  <li
                    key={`${phrase.target}-${translation}`}
                    className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                  >
                    <span
                      lang="es"
                      className="text-[1.05rem] font-semibold tracking-tight text-[#1a3a32]"
                    >
                      {phrase.target}
                    </span>
                    <span className="text-sm text-teal-800/90">
                      {translation}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {/* History timeline */}
        {section.timeline && section.timeline.length > 0 ? (
          <ol
            role="list"
            className="relative ml-1 flex flex-col gap-3 border-l-2 border-teal-100 pl-5"
          >
            {section.timeline.map((entry, idx) => {
              const year = t(entry.year, locale);
              return (
                <li key={`${entry.year.fr}-${idx}`} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-[27px] top-1.5 flex size-3 items-center justify-center"
                  >
                    <span className="size-3 rounded-full bg-teal-500 ring-2 ring-white" />
                  </span>
                  <p className="text-sm font-semibold text-teal-800 sm:text-[0.95rem]">
                    {year}
                  </p>
                  <p className="text-sm leading-relaxed text-[#1a3a32]/90 sm:text-[0.95rem]">
                    {t(entry.description, locale)}
                  </p>
                </li>
              );
            })}
          </ol>
        ) : null}

        {/* Learning note (history) */}
        {section.learningNote ? (
          <p className="rounded-2xl bg-[var(--color-base-cream)] p-4 text-sm leading-relaxed text-[#1a3a32] ring-1 ring-teal-100 sm:p-5 sm:text-[0.95rem]">
            <span className="font-medium text-teal-800">
              {learningNotePrefix}
            </span>
            {t(section.learningNote, locale)}
          </p>
        ) : null}

        {/* Closing vocabulary table */}
        {section.vocabulary && section.vocabulary.length > 0 ? (
          <YoVocabularyTable
            items={section.vocabulary}
            heading={vocabHeading}
            id={`${panelId}-vocab`}
            locale={locale}
          />
        ) : null}

        {/* Mini mission */}
        {section.miniMission ? (
          <div className="rounded-2xl border border-dashed border-teal-200 bg-white p-4 sm:p-5">
            <p className="ds-label text-teal-700/90">
              {t(section.miniMission.title ?? miniMissionFallbackTitle, locale)}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#1a3a32]/90 sm:text-[0.95rem]">
              {t(section.miniMission.intro, locale)}
            </p>
            <ul role="list" className="mt-3 grid gap-2 sm:grid-cols-3">
              {section.miniMission.options.map((option) => (
                <li
                  key={option}
                  lang="es"
                  className="rounded-xl bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800 ring-1 ring-teal-100"
                >
                  {option}
                </li>
              ))}
            </ul>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
              <Sparkles aria-hidden className="size-3.5 text-teal-700" />
              {miniMissionFootnote}
            </p>
          </div>
        ) : null}

        {/* Dialogue scenario */}
        {section.dialogue ? (
          <YoDialogueScenario scenario={section.dialogue} locale={locale} />
        ) : null}
      </div>
    </section>
  );
}
