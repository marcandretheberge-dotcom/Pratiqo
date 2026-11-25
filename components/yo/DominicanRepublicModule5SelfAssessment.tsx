"use client";

import { useId, useState } from "react";

import type { Dom5SelfAssessmentItem } from "@/lib/yo/dominicanRepublicA2Capstone";
import { t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";

const SELECTED_LABEL = {
  fr: "Éléments cochés",
  en: "Items checked",
  es: "Elementos marcados",
};

/** Personal reflection for this open lesson, independent of course completion. */
export function DominicanRepublicModule5SelfAssessment({
  items,
  locale,
}: {
  items: Dom5SelfAssessmentItem[];
  locale: YoLocale;
}) {
  const instanceId = useId();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const selectedCount = items.filter((item) => checked[item.id]).length;

  return (
    <div>
      <p role="status" aria-live="polite" className="mb-3 text-sm font-semibold text-[#0F6E56]/80">
        {t(SELECTED_LABEL, locale)} : {selectedCount}/{items.length}
      </p>
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const inputId = `${instanceId}-${item.id}`;
          return (
            <li key={item.id} data-yo-module5-self-assessment-item>
              <label
                htmlFor={inputId}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#0F6E56]/12 bg-white/90 p-4"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  name={item.id}
                  checked={Boolean(checked[item.id])}
                  onChange={(event) => {
                    const value = event.currentTarget.checked;
                    setChecked((current) => ({ ...current, [item.id]: value }));
                  }}
                  className="mt-0.5 size-5 shrink-0 accent-[#0F6E56] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
                />
                <span className="text-sm leading-relaxed text-[#0B3040]/85">
                  {t(item.statement, locale)}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
