"use client";
import type { YoLocale } from "@/lib/yo/types";
import { filmForMission, missionSceneKey, type MissionCinemaScene } from "@/lib/yo/travelCinema";
import { CinemaPlayer } from "./CinemaPlayer";

const labels = {
  fr: { "mission-start": "Une nouvelle rencontre", "mission-success": "Mission réussie", artifact: "Un souvenir de voyage", start: "Yoppo prépare la prochaine rencontre.", success: "Une étape de plus dans ton voyage.", souvenir: "Un nouveau souvenir pour ton carnet." },
  en: { "mission-start": "A new encounter", "mission-success": "Mission complete", artifact: "A travel keepsake", start: "Yoppo prepares for the next encounter.", success: "One more step in your journey.", souvenir: "A new keepsake for your journal." },
  es: { "mission-start": "Un nuevo encuentro", "mission-success": "Misión cumplida", artifact: "Un recuerdo del viaje", start: "Yoppo prepara el próximo encuentro.", success: "Un paso más en tu viaje.", souvenir: "Un nuevo recuerdo para tu diario." },
};

export function MissionFilm({ scene, locale, onContinue }: { scene: MissionCinemaScene; locale: YoLocale; onContinue: () => void }) {
  const copy = labels[locale], id = `${scene.scope ?? "mission"}:${missionSceneKey(scene)}`;
  return <CinemaPlayer key={id} id={id} film={filmForMission(scene.kind)} locale={locale} missionKind={scene.kind}
    eyebrow={copy[scene.kind]} title={scene.title} caption={scene.detail ?? copy[scene.kind === "mission-start" ? "start" : scene.kind === "mission-success" ? "success" : "souvenir"]}
    onFinish={onContinue}/>;
}
