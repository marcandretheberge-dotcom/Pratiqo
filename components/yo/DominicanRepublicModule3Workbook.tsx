import { t } from "@/lib/yo/localize";
import {
  buildRdM3WorkbookAnswerGroups,
  countRdM3WorkbookPageResponses,
  countRdM3WorkbookResponseOpportunities,
  dominicanRepublicModule3Workbook,
  listRdM3WorkbookMechanics,
  resolveRdM3WorkbookChoice,
  type RdM3WorkbookActivity,
  type RdM3WorkbookItem,
  type RdM3WorkbookPage,
} from "@/lib/yo/dominicanRepublicModule3Workbook";
import type { YoLocale } from "@/lib/yo/types";

const PAGE_LABEL = {
  fr: "Page",
  en: "Page",
  es: "Página",
} as const;

const RESPONSE_LABEL = {
  fr: "réponses",
  en: "responses",
  es: "respuestas",
} as const;

const MECHANICS_LABEL = {
  fr: "Progression",
  en: "Progression",
  es: "Progresión",
} as const;

const NOTES_LABEL = {
  fr: "À retenir",
  en: "Keep in mind",
  es: "Para recordar",
} as const;

const STEPS_LABEL = {
  fr: "Marche à suivre",
  en: "How to proceed",
  es: "Cómo proceder",
} as const;

const DIGITAL_LABEL = {
  fr: "Ouvre le Module 3 numérique",
  en: "Open digital Module 3",
  es: "Abre el Módulo 3 digital",
} as const;

const KEY_PAGE_LABEL = {
  fr: "Page",
  en: "Page",
  es: "Página",
} as const;

export function DominicanRepublicModule3Workbook({
  locale,
}: {
  locale: YoLocale;
}) {
  const workbook = dominicanRepublicModule3Workbook;
  const totalResponses = countRdM3WorkbookResponseOpportunities();
  const mechanics = listRdM3WorkbookMechanics();

  return (
    <div
      data-yo-rd-m3-workbook="true"
      data-yo-workbook-id={workbook.id}
      data-yo-workbook-page-count={workbook.pages.length}
      data-yo-workbook-response-count={totalResponses}
      data-yo-workbook-mechanic-count={mechanics.length}
      className="grid gap-6"
    >
      <section
        data-yo-rd-m3-workbook-overview="true"
        className="rounded-[28px] border border-[#D8ECE6] bg-[#F8FCFB] p-4 print:break-inside-avoid print:border-[#B8CFC6] print:bg-white sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]/65">
          <span>
            {workbook.pages.length} {PAGE_LABEL[locale].toLowerCase()}s
          </span>
          <span aria-hidden>•</span>
          <span>
            {totalResponses} {RESPONSE_LABEL[locale]}
          </span>
        </div>
        <h2 className="mt-3 text-2xl font-black leading-tight text-[#0F6E56]">
          {t(workbook.title, locale)}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[#0F6E56]/75">
          {t(workbook.subtitle, locale)}
        </p>
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1D9E75]">
            {MECHANICS_LABEL[locale]}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {mechanics.map((mechanic) => (
              <span
                key={mechanic}
                className="rounded-full border border-[#D8ECE6] bg-white px-3 py-1 text-[0.72rem] font-extrabold text-[#0F6E56]"
              >
                {mechanic.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        </div>
      </section>

      {workbook.pages.map((page, index) => (
        <WorkbookPage
          key={page.id}
          page={page}
          locale={locale}
          isLast={index === workbook.pages.length - 1}
        />
      ))}
    </div>
  );
}

function WorkbookPage({
  page,
  locale,
  isLast,
}: {
  page: RdM3WorkbookPage;
  locale: YoLocale;
  isLast: boolean;
}) {
  return (
    <section
      data-yo-rd-m3-workbook-page={page.id}
      data-yo-rd-m3-workbook-page-kind={page.kind}
      data-yo-rd-m3-workbook-support={page.supportLevel}
      data-yo-rd-m3-workbook-response-count={countRdM3WorkbookPageResponses(page)}
      className="rounded-[30px] border border-[#D8ECE6] bg-white p-4 shadow-[0_14px_34px_rgba(15,58,52,0.08)] print:rounded-none print:border-[#B8CFC6] print:shadow-none sm:p-5"
      style={{ breakAfter: isLast ? "auto" : "page" }}
    >
      <header className="border-b border-[#D8ECE6] pb-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1D9E75]">
          {PAGE_LABEL[locale]} {page.pageNumber}
        </p>
        <h2 className="mt-2 text-2xl font-black leading-tight text-[#0F6E56]">
          {t(page.title, locale)}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-[#0F6E56]/72">
          {t(page.purpose, locale)}
        </p>
      </header>

      <div className="mt-5 grid gap-4">
        {page.activities.map((activity) => (
          <WorkbookActivityCard key={activity.id} activity={activity} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function WorkbookActivityCard({
  activity,
  locale,
}: {
  activity: RdM3WorkbookActivity;
  locale: YoLocale;
}) {
  return (
    <section
      data-yo-rd-m3-workbook-activity={activity.id}
      data-yo-rd-m3-workbook-activity-kind={activity.kind}
      className="break-inside-avoid rounded-[24px] border border-[#E4F1ED] bg-[#F8FCFB] p-4 print:border-[#B8CFC6] print:bg-white"
    >
      <div className="min-w-0">
        <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
          {activity.kind.replace(/-/g, " ")}
        </p>
        <h3 className="mt-1 text-lg font-black leading-tight text-[#0F6E56]">
          {t(activity.title, locale)}
        </h3>
      </div>

      <p className="mt-3 text-sm font-semibold leading-relaxed text-[#0F6E56]/78">
        {t(activity.instructions, locale)}
      </p>

      {activity.digitalPath ? (
        <div
          data-yo-rd-m3-workbook-digital-bridge="true"
          className="mt-4 rounded-2xl border border-[#1D9E75]/40 bg-white p-3"
        >
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#1D9E75]">
            {DIGITAL_LABEL[locale]}
          </p>
          <p className="mt-1 break-all font-mono text-[0.78rem] font-bold text-[#12372f]">
            {activity.digitalPath}
          </p>
        </div>
      ) : null}

      {activity.steps?.length ? (
        <div className="mt-4 rounded-2xl border border-[#D8ECE6] bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#1D9E75]">
            {STEPS_LABEL[locale]}
          </p>
          <ol className="mt-2 grid list-decimal gap-1 pl-5 text-sm font-semibold leading-relaxed text-[#12372f]">
            {activity.steps.map((step) => (
              <li key={step.fr}>{t(step, locale)}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {activity.inputLines?.length ? (
        <div className="mt-4 rounded-2xl border border-[#D8ECE6] bg-white p-4">
          {activity.inputTitle ? (
            <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[#1D9E75]">
              {t(activity.inputTitle, locale)}
            </p>
          ) : null}
          <div
            lang={activity.targetLanguage === "es" ? "es" : undefined}
            data-yo-rd-m3-workbook-contextual-input="true"
            className="grid gap-2 text-sm font-bold leading-relaxed text-[#12372f]"
          >
            {activity.inputLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      ) : null}

      {activity.notes?.length ? (
        <div className="mt-4 rounded-2xl border border-[#F4B400]/35 bg-[#FFF8E3] p-3 text-sm font-semibold leading-relaxed text-[#5a3f0f]">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#9B6B00]">
            {NOTES_LABEL[locale]}
          </p>
          <ul className="mt-2 grid gap-1">
            {activity.notes.map((note) => (
              <li key={note.fr}>{t(note, locale)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {activity.answerKeySection ? (
        <WorkbookAnswerKeySection section={activity.answerKeySection} locale={locale} />
      ) : null}

      {activity.items?.length ? (
        <div className="mt-4 grid gap-3">
          {activity.items.map((item, index) => (
            <WorkbookItemRow
              key={item.id}
              item={item}
              index={index}
              targetLanguage={activity.targetLanguage}
              locale={locale}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function WorkbookAnswerKeySection({
  section,
  locale,
}: {
  section: "objective" | "model";
  locale: YoLocale;
}) {
  const groups = buildRdM3WorkbookAnswerGroups(section);

  return (
    <div
      data-yo-rd-m3-workbook-answer-key={section}
      data-yo-rd-m3-workbook-answer-count={groups.reduce(
        (total, group) => total + group.entries.length,
        0,
      )}
      className="mt-4 grid gap-3"
    >
      {groups.map((group) => (
        <div
          key={`${section}-${group.pageNumber}`}
          className="break-inside-avoid rounded-2xl border border-[#D8ECE6] bg-white p-3"
        >
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#1D9E75]">
            {KEY_PAGE_LABEL[locale]} {group.pageNumber} · {t(group.pageTitle, locale)}
          </p>
          <ul className="mt-2 grid gap-1.5">
            {group.entries.map((entry) => (
              <li
                key={entry.ref}
                data-yo-rd-m3-workbook-answer-ref={entry.ref}
                className="flex flex-wrap items-baseline gap-2 text-sm leading-relaxed"
              >
                <span className="shrink-0 rounded-md bg-[#EFF8F5] px-1.5 py-0.5 font-mono text-[0.72rem] font-black text-[#0F6E56]">
                  {entry.ref}
                </span>
                {entry.answer ? (
                  <span lang="es" data-yo-rd-m3-workbook-spanish-target="true" className="font-black text-[#12372f]">
                    {entry.answer}
                  </span>
                ) : null}
                {entry.answerNote ? (
                  <span className="font-semibold text-[#0F6E56]/80">
                    {t(entry.answerNote, locale)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function WorkbookItemRow({
  item,
  index,
  targetLanguage,
  locale,
}: {
  item: RdM3WorkbookItem;
  index: number;
  targetLanguage?: "es";
  locale: YoLocale;
}) {
  const lineCount = item.responseLines ?? 1;
  const isChecklistRow = lineCount === 0;

  return (
    <div
      data-yo-rd-m3-workbook-item={item.id}
      data-yo-rd-m3-workbook-answer-ref={item.answerRef ?? undefined}
      data-yo-rd-m3-workbook-answer-kind={item.answerKind ?? undefined}
      className="rounded-2xl border border-[#D8ECE6] bg-white p-3"
    >
      <div className="flex items-start gap-3">
        {isChecklistRow ? (
          <span
            aria-hidden
            className="mt-0.5 size-6 shrink-0 rounded-md border-2 border-[#0F6E56]/45 bg-white"
          />
        ) : (
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0F6E56] text-xs font-black text-white">
            {index + 1}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-relaxed text-[#12372f]">
            {t(item.prompt, locale)}
          </p>
          {item.target ? (
            <p
              lang="es"
              data-yo-rd-m3-workbook-spanish-target="true"
              className="mt-2 rounded-xl bg-[#EFF8F5] px-3 py-2 text-sm font-black text-[#0F6E56]"
            >
              {item.target}
            </p>
          ) : null}
          {item.choices?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {item.choices.map((choice, choiceIndex) => {
                const resolved = resolveRdM3WorkbookChoice(choice, locale);
                return (
                  <span
                    key={`${item.id}-choice-${choiceIndex}`}
                    lang={resolved.isSpanishTarget ? "es" : undefined}
                    data-yo-rd-m3-workbook-choice={
                      resolved.isSpanishTarget ? "spanish-target" : "scaffold"
                    }
                    className="rounded-full border border-[#D8ECE6] bg-[#F8FCFB] px-3 py-1 text-xs font-extrabold text-[#0F6E56]"
                  >
                    {resolved.text}
                  </span>
                );
              })}
            </div>
          ) : null}
          {lineCount >= 1 ? (
            <div
              className="mt-3 grid gap-2"
              aria-label={`${lineCount} ${RESPONSE_LABEL[locale]}`}
              lang={targetLanguage === "es" ? "es" : undefined}
            >
              {Array.from({ length: lineCount }).map((_, lineIndex) => (
                <div
                  key={`${item.id}-line-${lineIndex}`}
                  className="h-7 border-b border-dashed border-[#8CB8AD]"
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
