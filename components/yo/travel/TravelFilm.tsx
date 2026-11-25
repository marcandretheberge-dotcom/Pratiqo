"use client";
import type { YoLocale } from "@/lib/yo/types";
import { filmForLeg, type TravelLeg } from "@/lib/yo/travelCinema";
import { CinemaPlayer } from "./CinemaPlayer";

const labels = {
  fr: { flight: "En avion", train: "En train", car: "En voiture", taxi: "En taxi", destination: "Destination" },
  en: { flight: "By plane", train: "By train", car: "By car", taxi: "By taxi", destination: "Destination" },
  es: { flight: "En avión", train: "En tren", car: "En coche", taxi: "En taxi", destination: "Destino" },
};

export function TravelFilm({ leg, locale, onArrival }: { leg: TravelLeg; locale: YoLocale; onArrival: () => void }) {
  const copy = labels[locale], id = `travel:${leg.mode}:${leg.from?.country ?? "start"}:${leg.from?.city ?? ""}:${leg.to.country}:${leg.to.city}`;
  return <CinemaPlayer key={id} id={id} film={filmForLeg(leg)} locale={locale} travelMode={leg.mode}
    eyebrow={copy[leg.mode]} title={leg.from ? `${leg.from.city} → ${leg.to.city}` : leg.to.city}
    caption={`${copy[leg.mode]} · ${copy.destination} : ${leg.to.city}`} onFinish={onArrival}/>;
}
