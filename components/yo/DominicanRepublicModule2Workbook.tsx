import { t } from "@/lib/yo/localize";
import {
  countRdM2WorkbookResponseOpportunities,
  dominicanRepublicModule2Workbook,
  listRdM2WorkbookMechanics,
  type RdM2WorkbookActivity,
  type RdM2WorkbookItem,
  type RdM2WorkbookPage,
} from "@/lib/yo/dominicanRepublicModule2Workbook";
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

export function DominicanRepublicModule2Workbook({
  locale,
}: {
  locale: YoLocale;
}) {
  const workbook = dominicanRepublicModule2Workbook;
  const totalResponses = countRdM2WorkbookResponseOpportunities();
  const mechanics = listRdM2WorkbookMechanics();

  return (
    <div
      data-yo-rd-m2-workbook="true"
      data-yo-workbook-id={workbook.id}
      data-yo-workbook-page-count={workbook.pages.length}
      data-yo-workbook-response-count={totalResponses}
      data-yo-workbook-mechanic-count={mechanics.length}
      className="grid gap-6"
    >
      <section
        data-yo-rd-m2-workbook-overview="true"
        className="rounded-[28px] border border-[#D8ECE6] bg-[#F8FCFB] p-4 print:break-inside-avoid print:border-[#B8CFC6] print:bg-white sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]/65">
          <span>{workbook.pages.length} {PAGE_LABEL[locale].toLowerCase()}s</span>
          <span aria-hidden>•</span>
          <span>{totalResponses} {RESPONSE_LABEL[locale]}</span>
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
  page: RdM2WorkbookPage;
  locale: YoLocale;
  isLast: boolean;
}) {
  return (
    <section
      data-yo-rd-m2-workbook-page={page.id}
      data-yo-rd-m2-workbook-page-kind={page.kind}
      data-yo-rd-m2-workbook-support={page.supportLevel}
      data-yo-rd-m2-workbook-response-count={page.responseCount}
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
  activity: RdM2WorkbookActivity;
  locale: YoLocale;
}) {
  return (
    <section
      data-yo-rd-m2-workbook-activity={activity.id}
      data-yo-rd-m2-workbook-activity-kind={activity.kind}
      className="break-inside-avoid rounded-[24px] border border-[#E4F1ED] bg-[#F8FCFB] p-4 print:border-[#B8CFC6] print:bg-white"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#0F6E56]/55">
            {activity.kind.replace(/-/g, " ")}
          </p>
          <h3 className="mt-1 text-lg font-black leading-tight text-[#0F6E56]">
            {t(activity.title, locale)}
          </h3>
        </div>
      </div>

      <p className="mt-3 text-sm font-semibold leading-relaxed text-[#0F6E56]/78">
        {t(activity.instructions, locale)}
      </p>

      {activity.inputLines?.length ? (
        <div className="mt-4 rounded-2xl border border-[#D8ECE6] bg-white p-4">
          {activity.inputTitle ? (
            <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[#1D9E75]">
              {t(activity.inputTitle, locale)}
            </p>
          ) : null}
          <div
            lang={activity.targetLanguage === "es" ? "es" : undefined}
            data-yo-rd-m2-workbook-contextual-input="true"
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

function WorkbookItemRow({
  item,
  index,
  targetLanguage,
  locale,
}: {
  item: RdM2WorkbookItem;
  index: number;
  targetLanguage?: "es";
  locale: YoLocale;
}) {
  const lineCount = Math.max(1, item.responseLines ?? 1);

  return (
    <div
      data-yo-rd-m2-workbook-item={item.id}
      data-yo-rd-m2-workbook-answer-ref={item.answerRef ?? undefined}
      className="rounded-2xl border border-[#D8ECE6] bg-white p-3"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0F6E56] text-xs font-black text-white">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-relaxed text-[#12372f]">
            {t(item.prompt, locale)}
          </p>
          {item.target ? (
            <p
              lang="es"
              data-yo-rd-m2-workbook-spanish-target="true"
              className="mt-2 rounded-xl bg-[#EFF8F5] px-3 py-2 text-sm font-black text-[#0F6E56]"
            >
              {item.target}
            </p>
          ) : null}
          {item.choices?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {item.choices.map((choice) => (
                <span
                  key={choice}
                  lang={targetLanguage === "es" && /[¿áéíóúñ]/i.test(choice) ? "es" : undefined}
                  className="rounded-full border border-[#D8ECE6] bg-[#F8FCFB] px-3 py-1 text-xs font-extrabold text-[#0F6E56]"
                >
                  {choice}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-3 grid gap-2" aria-label={`${lineCount} ${RESPONSE_LABEL[locale]}`}>
            {Array.from({ length: lineCount }).map((_, lineIndex) => (
              <div
                key={`${item.id}-line-${lineIndex}`}
                className="h-7 border-b border-dashed border-[#8CB8AD]"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
