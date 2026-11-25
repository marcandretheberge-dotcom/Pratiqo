"use client";
import { useEffect } from "react";
import type { YoLocale } from "@/lib/yo/types";
import { useTravelCinema } from "./useTravelCinema";
import { TravelFilm } from "./TravelFilm";

export function CountryDeparture({ country, city, locale }: { country: string; city: string; locale: YoLocale }) {
  const { leg, depart, finish } = useTravelCinema();
  useEffect(() => { depart({ country, city }); }, [country, city, depart]);
  return leg ? <TravelFilm leg={leg} locale={locale} onArrival={finish}/> : null;
}
