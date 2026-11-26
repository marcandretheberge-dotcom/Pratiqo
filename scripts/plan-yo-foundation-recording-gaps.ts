/** Offline publishing queue for high-priority, authored audio controls. No network or writes. */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { germanCourseUnits } from "../lib/yo/german/courseData";
import { germanAudioPaths } from "../lib/yo/german/courseAudio.server";
import { portugueseCourseUnits } from "../lib/yo/portuguese/courseData";
import { portugueseAudioPaths } from "../lib/yo/portuguese/courseAudio.server";
import type { CourseUnit } from "../lib/yo/italian/course/courseTypes";
import { japaneseCourseUnits } from "../lib/yo/japaneseCourse";
import { getJapaneseFoundationAudioItem } from "../lib/yo/audio/japaneseFoundationAudio";
import { mandarinUnits } from "../lib/yo/mandarin/course";
import mandarinAudio from "../lib/yo/mandarin/audioPaths.json";

type Surface = "dialogue" | "vocabulary" | "grammar";
type Row = { unit: number; surface: Surface; text: string };
type Published = (text: string) => string | undefined;

function entry(unit: number, surface: Surface, text: string): Row {
  return { unit, surface, text: text.normalize("NFC").trim() };
}

function western(unit: CourseUnit): Row[] {
  return unit.lessons.flatMap(lesson => [
    ...lesson.activities.flatMap(activity => activity.kind === "dialogue"
      ? activity.turns.map(turn => entry(unit.number, "dialogue", turn.line))
      : []),
    ...lesson.vocabulary.map(word => entry(unit.number, "vocabulary", word.it)),
    ...lesson.grammar.examples.map(example => entry(unit.number, "grammar", example.it)),
  ]);
}

function group(language: string, rows: Row[], published: Published) {
  const phrases = new Map<string, { text: string; firstUnit: number; uses: { unit: number; surface: Surface }[] }>();
  for (const { unit, surface, text } of rows) {
    if (!text) throw new Error(`Empty authored phrase in ${language}, unit ${unit}`);
    const item = phrases.get(text) ?? { text, firstUnit: unit, uses: [] };
    item.firstUnit = Math.min(item.firstUnit, unit);
    if (!item.uses.some(use => use.unit === unit && use.surface === surface)) item.uses.push({ unit, surface });
    phrases.set(text, item);
  }
  const items = [...phrases.values()].sort((a, b) => a.firstUnit - b.firstUnit);
  const missing = items.filter(item => !published(item.text));
  return { language, total: items.length, registered: items.length - missing.length, missing };
}

export function foundationRecordingGaps() {
  const german = Object.assign({}, ...germanCourseUnits.map(germanAudioPaths)) as Record<string, string>;
  const portuguese = Object.assign({}, ...portugueseCourseUnits.map(portugueseAudioPaths)) as Record<string, string>;
  return [
    group("de", germanCourseUnits.flatMap(western), text => german[text]),
    group("pt-BR", portugueseCourseUnits.flatMap(western), text => portuguese[text]),
    group("ja", japaneseCourseUnits.flatMap(unit => [
      ...unit.dialogue.map(line => entry(unit.number, "dialogue", line.ja)),
      ...unit.vocabulary.map(word => entry(unit.number, "vocabulary", word.ja)),
      ...unit.grammar.map(rule => entry(unit.number, "grammar", rule.example.ja)),
    ]), text => getJapaneseFoundationAudioItem(text)?.storagePath),
    group("zh-Hans", mandarinUnits.flatMap(unit => [
      ...unit.dialogue.map(line => entry(unit.number, "dialogue", line.hanzi)),
      ...unit.vocabulary.map(word => entry(unit.number, "vocabulary", word.hanzi)),
      ...unit.grammar.map(rule => entry(unit.number, "grammar", rule.example.hanzi)),
    ]), text => (mandarinAudio as Record<string, string>)[text]),
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const mode = process.argv[2];
  if (process.argv.length > 3 || (mode && mode !== "--queue")) {
    console.error("Use --queue for prioritized exact phrases, or no arguments for coverage totals.");
    process.exitCode = 2;
  } else {
    const gaps = foundationRecordingGaps();
    console.log(JSON.stringify(gaps.map(group => ({
      ...group, missing: mode === "--queue" ? group.missing : group.missing.length,
    })), null, 2));
  }
}
