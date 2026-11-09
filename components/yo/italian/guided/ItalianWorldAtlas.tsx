"use client";

import Link from "next/link";
import { Check, Crown, LockKeyhole, Play, Sparkles, Star } from "lucide-react";
import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import type { ItalianWorldView } from "@/lib/yo/italian/worlds";
import type { YoLocale } from "@/lib/yo/types";
import { ItalianAdventureLandscape } from "./ItalianAdventureLandscape";
import { ItalianCityArtwork } from "./ItalianCityArtwork";

type Props = {
  world: ItalianWorldView;
  locale: YoLocale;
  currentUnitId: string;
  hrefForUnit: (unitId: string) => string;
  canReview: (unitId: string) => boolean;
  /** The current city opens its lesson without replacing the world map. */
  onPlayCurrentCity?: () => void;
  currentActionLabel?: string;
  guideMessage?: string;
};

/** One winding path, four illustrated destinations, one final castle.
 * Former 2x2 dashboard cards obscured the actual adventure; these small
 * milestone tokens let players see the landscape and where to go next.
 * None of the visual effects can change the canonical journey gate. */
const stops = [
  { x: "25%", y: "21%" },
  { x: "73%", y: "37%" },
  { x: "27%", y: "57%" },
  { x: "73%", y: "76%" },
] as const;

export function ItalianWorldAtlas({ world, locale, currentUnitId, hrefForUnit, canReview, onPlayCurrentCity, currentActionLabel, guideMessage }: Props) {
  const copy = {
    fr: {
      title: "Carte d'aventure", level: "Ton aventure", mastered: "Villes maîtrisées",
      next: "Prochaine mission", explore: "Explorer", open: "Jouer", completed: "Réussie",
      locked: "À découvrir", lockHint: "Termine d'abord les missions précédentes",
      current: "Yoppo t'attend", gate: "Château du monde",
      gateOpen: "La porte est ouverte !", gateClosed: "Gagne les 4 tampons",
      destination: "Destination",
    },
    en: {
      title: "Adventure map", level: "Your adventure", mastered: "Cities mastered",
      next: "Next mission", explore: "Explore", open: "Play", completed: "Passed",
      locked: "Coming up", lockHint: "Complete the earlier missions first",
      current: "Yoppo awaits", gate: "World castle",
      gateOpen: "The gate is open!", gateClosed: "Earn all 4 stamps",
      destination: "Destination",
    },
    es: {
      title: "Mapa de aventura", level: "Tu aventura", mastered: "Ciudades superadas",
      next: "Próxima misión", explore: "Explorar", open: "Jugar", completed: "Superada",
      locked: "Por descubrir", lockHint: "Termina las misiones anteriores primero",
      current: "Yoppo te espera", gate: "Castillo del mundo",
      gateOpen: "¡La puerta está abierta!", gateClosed: "Consigue los 4 sellos",
      destination: "Destino",
    },
  }[locale];
  const completed = world.citiesWithProgress.filter(city => city.mastered).length;
  const nextStop = world.citiesWithProgress.find(city => city.unlocked && !city.mastered);
  const selectedStop = world.citiesWithProgress.find(city => city.unitId === currentUnitId);
  const guideId = nextStop?.unitId ?? (selectedStop?.unlocked ? currentUnitId : world.citiesWithProgress.find(city => city.unlocked)?.unitId);

  return <section data-yoppo-immersive-atlas={world.id} aria-label={copy.title + ": " + world.title[locale]}
    className="relative isolate aspect-[4/7] w-full overflow-hidden rounded-[28px] border-[4px] border-[#f9e2a4] bg-[#5fc2b2] shadow-[0_12px_0_#987350,0_22px_40px_rgba(33,67,59,.24)]">
    <div className="absolute inset-0 h-full w-full">
      <ItalianAdventureLandscape worldId={world.id} complete={world.complete}/>
      <div className="absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-[#173d49]/45 via-[#173d49]/15 to-transparent" aria-hidden="true"/>
      <header className="absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2 sm:inset-x-5 sm:top-5">
        <div className="min-w-0 rounded-2xl border border-white/40 bg-[#173f47]/90 px-3 py-2.5 text-white shadow-lg backdrop-blur-sm">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffe19a]">{copy.level} · {world.number} / 3</p>
          <p className="mt-0.5 text-sm font-black sm:text-base">{world.title[locale]}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-[#fff5cf] bg-[#fff6d9]/95 px-3 py-2 text-[#59401c] shadow-lg" aria-label={completed + " / 4 " + copy.mastered}>
          <Star className="fill-[#f0ae37] text-[#b97920]" size={17} aria-hidden/>
          <span className="text-sm font-black tabular-nums">{completed}<span className="text-xs opacity-70">/4</span></span>
        </div>
      </header>

      {/* A real ordered list preserves keyboard and screen-reader navigation. */}
      <ol className="absolute inset-0 z-20 m-0 list-none p-0" aria-label={copy.title} data-yoppo-world-cities={world.id}>
        {world.citiesWithProgress.map((city, index) => {
          const accessible = city.unlocked || canReview(city.unitId);
          const isGuide = city.unitId === guideId && accessible;
          const status = city.mastered ? copy.completed : accessible ? copy.open : copy.locked;
          const position = stops[index];
          if (!position) return null;
          const node = <div className="group relative flex w-[112px] flex-col items-center sm:w-[136px]" data-yoppo-map-token={city.unitId}>
            {isGuide ? <span aria-hidden="true" className="yo-map-pulse absolute -inset-x-2 -top-2 h-24 rounded-full bg-[#fff19e]/55 blur-xl"/> : null}
            <div className={"relative h-[78px] w-[100px] overflow-hidden rounded-[26px] border-[4px] shadow-[0_7px_0_rgba(65,61,37,.34),0_14px_25px_rgba(26,55,46,.28)] transition-transform duration-200 sm:h-[96px] sm:w-[128px] " +
              (isGuide ? "border-[#ffdc66] bg-[#fff8d9] ring-[3px] ring-white/80 group-hover:-translate-y-1 " :
                city.mastered ? "border-[#88e4a3] bg-[#eeffe1] " :
                accessible ? "border-[#fff0b5] bg-[#fff8e9] group-hover:-translate-y-1 " :
                "border-[#c0d1c7] bg-[#e7eee9] opacity-80")}>
              <ItalianCityArtwork unitId={city.unitId} locale={locale} compact decorative
                className={"h-full w-full " + (!accessible ? "grayscale-[.85] opacity-65" : "")}/>
              {city.mastered ? <span className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[#23865c] text-white shadow"><Check size={18} strokeWidth={4} aria-hidden/></span> : null}
              {!accessible ? <span className="absolute inset-0 grid place-items-center bg-[#2f453e]/30"><span className="grid h-10 w-10 place-items-center rounded-full border-2 border-white/70 bg-[#34443e]/90 text-white shadow-lg"><LockKeyhole size={20} aria-hidden/></span></span> : null}
            </div>
            <span className={"relative -mt-3 max-w-full truncate rounded-full border-[2px] px-3 py-1 text-[13px] font-black leading-5 shadow-[0_4px_0_rgba(56,63,47,.25)] sm:text-base " +
              (isGuide ? "border-[#d0792f] bg-[#fff2b5] text-[#663c17] " :
                city.mastered ? "border-[#278258] bg-[#e0ffdc] text-[#185842] " :
                accessible ? "border-[#98674c] bg-[#fff7e2] text-[#543824] " :
                "border-[#93a7a0] bg-[#dbe8df] text-[#53635d]")}>{city.name}</span>
            {accessible ? <span className={"mt-1.5 inline-flex min-h-7 items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-extrabold shadow sm:text-xs " +
              (isGuide ? "border-[#ffeb82] bg-[#ed6c35] text-white " :
                city.mastered ? "border-[#d4fbe3] bg-[#277b5a] text-white " :
                "border-white/60 bg-[#315d55] text-white")}>
              {city.mastered ? <Check size={12} aria-hidden/> : <Play size={12} fill="currentColor" aria-hidden/>}{status}
            </span> : <span className="mt-2 text-[10px] font-bold text-[#354e45]">{status}</span>}
            {isGuide ? <span className="yo-yoppo-map-guide absolute -right-5 -top-8 grid h-12 w-12 place-items-center rounded-full border-[3px] border-[#fff1a7] bg-white shadow-[0_6px_14px_rgba(30,61,44,.3)] sm:-right-6 sm:-top-9" aria-label={copy.current}>
              <CompanionAvatar visualId="travel" state="map" locale={locale} size="xs" compact/>
              {city.unitId === currentUnitId && guideMessage ? <span aria-hidden="true" className="absolute -right-1 top-[46px] w-[124px] rounded-2xl border-2 border-amber-300 bg-white px-2 py-1.5 text-center text-[11px] font-black leading-4 text-emerald-950 shadow-lg">{guideMessage}</span> : null}
            </span> : null}
          </div>;
          return <li key={city.unitId} aria-current={isGuide ? "step" : undefined}
            className="absolute z-10 flex items-center justify-center"
            style={{ left: position.x, top: position.y, transform: "translate(-50%, -50%)" }}>
            {accessible
              ? city.unitId === currentUnitId && onPlayCurrentCity
                ? <button type="button" data-yoppo-current-mission={city.unitId} onClick={onPlayCurrentCity}
                    aria-label={currentActionLabel ?? (copy.open + " " + city.name)}
                    className="rounded-3xl outline-offset-[5px] focus-visible:outline-4 focus-visible:outline-[#fff8bf]">
                    {node}
                  </button>
                : <Link href={hrefForUnit(city.unitId)}
                    aria-label={copy.explore + " " + city.name + " — " + (city.step?.unit.title[locale] ?? city.unitId)}
                    className="rounded-3xl outline-offset-[5px] focus-visible:outline-4 focus-visible:outline-[#fff8bf]">
                    {node}
                  </Link>
              : <div aria-label={city.name + ": " + copy.lockHint} title={copy.lockHint}>{node}</div>}
          </li>;
        })}
      </ol>

      <div className="absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-[#184b49]/40 to-transparent" aria-hidden="true"/>
      <div data-yoppo-world-gate={world.complete ? "open" : "closed"}
        className={"absolute bottom-3 left-1/2 z-20 flex w-max max-w-[88%] -translate-x-1/2 items-center gap-2 rounded-full border-[2px] px-3 py-2 text-center text-xs font-extrabold shadow-lg sm:text-sm " +
          (world.complete ? "border-[#f9e2a4] bg-[#fff2be] text-[#69441f]" : "border-[#c2d6bd] bg-[#163c48]/90 text-white")}>
        {world.complete ? <Crown size={18} className="text-[#b7761e]" aria-hidden/> : <LockKeyhole size={16} aria-hidden/>}
        <span>{world.complete ? copy.gateOpen : copy.gateClosed}</span>
        {world.complete ? <Sparkles size={17} aria-hidden/> : null}
      </div>
    </div>
    <style>{`
      @media (prefers-reduced-motion:no-preference) {
        .yo-yoppo-map-guide { animation:yo-yoppo-guide-arrive .85s cubic-bezier(.2,.8,.2,1) both; }
        .yo-yoppo-map-guide img { animation:yo-yoppo-map-float 2.8s ease-in-out 1s infinite; }
        .yo-map-pulse { animation:yo-adventure-pulse 2.8s ease-in-out infinite; }
      }
      @keyframes yo-yoppo-guide-arrive { from { transform:translate(-56px,38px) scale(.8);opacity:.1; } to { transform:translate(0,0) scale(1);opacity:1; } }
      @keyframes yo-yoppo-map-float { 0%,100%{transform:translateY(0) rotate(-4deg)} 50%{transform:translateY(-8px) rotate(4deg)} }
      @keyframes yo-adventure-pulse { 0%,100%{opacity:.45} 50%{opacity:.9} }
    `}</style>
  </section>;
}
