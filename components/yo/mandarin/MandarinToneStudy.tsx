"use client";
import { toneExercise, toneLabels } from "@/lib/yo/mandarin/activities";
import type { YoLocale } from "@/lib/yo/types";
import toneAssets from "@/lib/yo/mandarin/toneAssets.json";
import { MandarinAudio } from "./MandarinAudio";
export function MandarinToneStudy({ locale }: { locale: YoLocale }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {toneLabels.map((label, index) => {
        const task = toneExercise("reference", index);
        const tone = String(index + 1) as keyof typeof toneAssets;
        return (
          <div
            key={tone}
            className="space-y-2 rounded-lg border border-teal-200 bg-white p-4"
          >
            <p className="font-semibold">{label[locale]}</p>
            <p lang="zh-Latn-pinyin">{task.model.pinyin}</p>
            <MandarinAudio
              text={task.model.hanzi}
              tone={tone}
              locale={locale}
            />
            <a
              href={toneAssets[tone].source}
              target="_blank"
              rel="noreferrer"
              className="block text-xs underline"
            >
              {toneAssets[tone].credit} · {toneAssets[tone].license}
            </a>
          </div>
        );
      })}
    </div>
  );
}
