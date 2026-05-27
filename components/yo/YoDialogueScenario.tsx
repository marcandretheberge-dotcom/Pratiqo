/**
 * YoDialogueScenario — dialogue-style chat bubbles for the lesson panel.
 *
 * Pure presentational component (no client state). Renders each line
 * with speaker-aligned bubbles:
 *   - "host" (réceptionniste, vendeur, …) → cream bubble, left-aligned
 *   - "self" (toi)                         → teal bubble, right-aligned
 *
 * Spanish lines carry `lang="es"`. An optional French translation can be
 * shown under each bubble — currently unused in Phase 1 to encourage
 * immersion, but supported in the type so the data layer can add it later.
 */

import type { YoDialogueScenarioData } from "@/lib/yo/types";

export interface YoDialogueScenarioProps {
  scenario: YoDialogueScenarioData;
}

export function YoDialogueScenario({ scenario }: YoDialogueScenarioProps) {
  return (
    <section
      aria-labelledby={`yo-dialogue-${slug(scenario.title)}-title`}
      className="rounded-2xl border border-teal-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,58,52,0.04)] sm:p-5"
    >
      <h4
        id={`yo-dialogue-${slug(scenario.title)}-title`}
        className="mb-3 text-[0.95rem] font-medium text-[#1a3a32] sm:text-base"
      >
        {scenario.title}
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
                {line.speakerLabel}
              </span>
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug shadow-[0_1px_2px_rgba(15,58,52,0.05)] ring-1 sm:text-[0.95rem] ${
                  isSelf
                    ? "rounded-br-md bg-teal-600 text-white ring-teal-700/20"
                    : "rounded-bl-md bg-[#fff4e2] text-[#7a4f1d] ring-[#f3dcb4]"
                }`}
              >
                <p lang="es" className="font-medium">
                  {line.target}
                </p>
                {line.translation ? (
                  <p
                    className={`mt-1 text-xs ${isSelf ? "text-white/85" : "text-[#7a4f1d]/85"}`}
                  >
                    {line.translation}
                  </p>
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
