"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

type LessonDraft = Record<string, unknown>;

const LessonDraftContext = createContext<{
  values: LessonDraft;
  setValues: Dispatch<SetStateAction<LessonDraft>>;
} | null>(null);

/** One in-memory draft for the mobile and desktop presentations of a lesson. */
export function YoLessonDraftProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<LessonDraft>({});
  const value = useMemo(() => ({ values, setValues }), [values]);
  return <LessonDraftContext.Provider value={value}>{children}</LessonDraftContext.Provider>;
}

/** Without a provider or a stable key, a control keeps its usual local state. */
export function useYoLessonDraftState<T>(
  key: string | undefined,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const draft = useContext(LessonDraftContext);
  const [localValue, setLocalValue] = useState<T>(initialValue);
  const setValues = draft?.setValues;
  const value = draft && key && Object.prototype.hasOwnProperty.call(draft.values, key)
    ? draft.values[key] as T
    : localValue;

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    if (!key || !setValues) {
      setLocalValue(action);
      return;
    }
    setValues((previous) => {
      const current = Object.prototype.hasOwnProperty.call(previous, key)
        ? previous[key] as T
        : initialValue;
      const next = typeof action === "function"
        ? (action as (current: T) => T)(current)
        : action;
      return Object.is(current, next) ? previous : { ...previous, [key]: next };
    });
  }, [initialValue, key, setValues]);

  return [value, setValue];
}
