"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

const WEEKS_PER_MONTH = 4;
const PRO_MONTHLY_FEE = 29.99;
const FREE_COMMISSION = 0.1;
const PRO_COMMISSION = 0.05;
const FREE_STUDENT_CAP = 5;

function formatCad(amount: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, amount));
}

function EarningsSliderRow({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-white/85">
          {label}
        </label>
        <span className="text-xs font-bold tabular-nums text-white/60" aria-hidden>
          {value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full max-w-full cursor-pointer accent-teal-500"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/35">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function ResultCard({
  title,
  value,
  sub,
  highlight,
}: {
  title: string;
  value: string;
  sub?: string;
  highlight?: "teal" | "positive" | "negative";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5",
        highlight === "teal" && "border-teal-500/30 bg-teal-600/10",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">{title}</p>
      <p
        className={cn(
          "mt-2 text-xl font-bold tabular-nums sm:text-2xl",
          highlight === "teal" && "text-[#B8F5DC]",
          highlight === "positive" && "text-[#7FE0C3]",
          highlight === "negative" && "text-rose-300",
          !highlight && "text-white",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-2 text-xs leading-relaxed text-white/55">{sub}</p> : null}
    </div>
  );
}

/** Side-by-side Free vs Pro earnings board for teacher recruitment pages. */
export function TeacherEarningsCalculator({ className }: { className?: string }) {
  const { t } = useLocale();
  const [students, setStudents] = useState(5);
  const [hourlyRate, setHourlyRate] = useState(45);
  const [lessonsPerWeek, setLessonsPerWeek] = useState(1);

  const calc = useMemo(() => {
    const grossMonthly = students * hourlyRate * lessonsPerWeek * WEEKS_PER_MONTH;
    const freeStudents = Math.min(students, FREE_STUDENT_CAP);
    const freeGross = freeStudents * hourlyRate * lessonsPerWeek * WEEKS_PER_MONTH;
    const freeNet = freeGross * (1 - FREE_COMMISSION);
    const proNet = grossMonthly * (1 - PRO_COMMISSION) - PRO_MONTHLY_FEE;
    const difference = proNet - freeNet;
    return {
      grossMonthly,
      freeNet,
      proNet,
      difference,
      freeStudentsCapped: students > FREE_STUDENT_CAP,
    };
  }, [students, hourlyRate, lessonsPerWeek]);

  return (
    <section
      id="calculateur-revenus"
      aria-labelledby="teacher-earnings-calc-title"
      className={cn("scroll-mt-24", className)}
    >
      <div className="mx-auto max-w-6xl">
        <h2 id="teacher-earnings-calc-title" className="text-2xl font-bold text-white sm:text-3xl">
          {t("teacherEarnCalcTitle")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
          {t("teacherEarnCalcSubtitle")}
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <EarningsSliderRow
              id="earn-calc-students"
              label={t("teacherEarnCalcStudentsLabel")}
              value={students}
              min={1}
              max={20}
              onChange={setStudents}
            />
            <EarningsSliderRow
              id="earn-calc-hourly"
              label={t("teacherEarnCalcHourlyLabel")}
              value={hourlyRate}
              min={20}
              max={150}
              onChange={setHourlyRate}
            />
            <EarningsSliderRow
              id="earn-calc-lessons"
              label={t("teacherEarnCalcLessonsPerWeekLabel")}
              value={lessonsPerWeek}
              min={1}
              max={5}
              onChange={setLessonsPerWeek}
            />
          </div>

          <div className="min-w-0 space-y-4">
            <ResultCard title={t("teacherEarnCalcGrossLabel")} value={formatCad(calc.grossMonthly)} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ResultCard
                title={t("teacherEarnCalcFreePlan")}
                value={formatCad(calc.freeNet)}
                sub={
                  calc.freeStudentsCapped
                    ? t("teacherEarnCalcFreeCapNote")
                    : `${t("teacherEarnCalcCommissionFree")} · ${t("teacherEarnCalcFreeStudentLimit")}`
                }
              />
              <ResultCard
                title={t("teacherEarnCalcProPlan")}
                value={formatCad(calc.proNet)}
                sub={`${t("teacherEarnCalcCommissionPro")} · ${t("teacherEarnCalcProFee")}`}
                highlight="teal"
              />
            </div>
            <ResultCard
              title={t("teacherEarnCalcDifference")}
              value={`${calc.difference >= 0 ? "+" : "−"} ${formatCad(Math.abs(calc.difference))}`}
              highlight={calc.difference >= 0 ? "positive" : "negative"}
            />
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-white/75">
              {t("teacherEarnCalcBreakeven")}
            </p>
            <p className="text-xs leading-relaxed text-white/45">{t("teacherEarnCalcDisclaimer")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
