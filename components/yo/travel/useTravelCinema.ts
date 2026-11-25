"use client";
import { useCallback, useRef, useState } from "react";
import { lastPlace, planTravel, rememberPlace, travelLocationKey, type TravelLeg, type TravelPlace } from "@/lib/yo/travelCinema";

type Journey = { leg: TravelLeg; replay: boolean; onArrival?: () => void };

export function useTravelCinema(storageKey = travelLocationKey) {
  const [leg, setLeg] = useState<TravelLeg | null>(null);
  const pending = useRef<Journey | null>(null);

  const depart = useCallback((to: TravelPlace, onArrival?: () => void, replay = false) => {
    if (pending.current) return;
    const trip = planTravel(replay ? null : lastPlace(storageKey), to);
    if (!trip) { onArrival?.(); return; }
    pending.current = { leg: trip, replay, onArrival };
    setLeg(trip);
  }, [storageKey]);

  const finish = useCallback(() => {
    const journey = pending.current;
    if (!journey) return;
    pending.current = null;
    if (!journey.replay) rememberPlace(journey.leg.to, storageKey);
    setLeg(null);
    journey.onArrival?.();
  }, [storageKey]);

  return { leg, depart, finish };
}
