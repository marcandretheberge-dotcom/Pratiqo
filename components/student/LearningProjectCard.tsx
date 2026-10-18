"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";
import { CANADIAN_PLACES } from "@/lib/search/canadianPlaces";
import {
  PRATIQO_DISCIPLINES,
  resolveDisciplineId,
} from "@/lib/taxonomy/disciplines";
import { learningProjectCopy } from "@/lib/studentLearningProjectCopy";
import {
  EMPTY_LEARNING_PROJECT,
  learningProjectDraftKey,
  readLearningProjectDraft,
  type LearningProjectInput,
  type LearningProjectResponse,
} from "@/lib/studentLearningProject";

export type LearningProjectTransport = (
  userId: string,
  payload?: { action: "dismiss" } | (LearningProjectInput & { action: "save" }),
  signal?: AbortSignal,
) => Promise<LearningProjectResponse>;

const requestProject: LearningProjectTransport = async (
  userId,
  payload,
  signal,
) => {
  const {
    data: { session },
  } = await getSupabaseClient().auth.getSession();
  if (!session?.access_token || session.user.id !== userId)
    throw new Error("session_unavailable");
  const response = await fetch("/api/student/learning-project", {
    method: payload ? "PUT" : "GET",
    cache: "no-store",
    signal,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(payload ? { "Content-Type": "application/json" } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  if (response.status === 429) throw new Error("rate_limited");
  if (!response.ok) throw new Error("project_unavailable");
  const result = (await response.json()) as LearningProjectResponse;
  if (!Object.prototype.hasOwnProperty.call(result, "project"))
    throw new Error("invalid_response");
  return result;
};

export function LearningProjectCard({
  userId,
  locale,
  manage = false,
  transport = requestProject,
}: {
  userId: string;
  locale: string;
  manage?: boolean;
  transport?: LearningProjectTransport;
}) {
  const copy = learningProjectCopy(locale);
  const id = useId();
  const [data, setData] = useState<LearningProjectResponse | null>(null);
  const [values, setValues] = useState<LearningProjectInput>({
    ...EMPTY_LEARNING_PROJECT,
  });
  const [step, setStep] = useState<1 | 2>(1);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<
    "subjectError" | "cityError" | "saveError" | "rateLimitError" | null
  >(null);
  const [notice, setNotice] = useState<"saved" | "restored" | null>(null);
  const alive = useRef(true);
  const draftKey = learningProjectDraftKey(userId);
  const field =
    "w-full min-h-12 rounded-xl border border-[var(--p-border-light)] bg-white px-3 py-2 text-base text-slate-900";
  const primary =
    "min-h-12 rounded-xl bg-teal-700 px-4 py-3 text-center text-sm font-semibold text-white disabled:opacity-60";
  const secondary =
    "min-h-11 rounded-xl px-3 py-2 text-sm font-medium text-teal-800";

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    setLoadFailed(false);
    void transport(userId, undefined, abort.signal)
      .then((result) => {
        if (abort.signal.aborted) return;
        setData(result);
        const saved = result.project;
        const query = new URLSearchParams(window.location.search);
        const discipline = PRATIQO_DISCIPLINES.find(
          (item) => item.id === resolveDisciplineId(query.get("q") ?? ""),
        );
        const subjectHint = discipline
          ? locale === "en"
            ? discipline.labelEn
            : locale === "es"
              ? discipline.labelEs
              : discipline.labelFr
          : (query.get("q") ?? "").slice(0, 120);
        let seed: LearningProjectInput = saved?.completed_at
          ? saved
          : {
              ...EMPTY_LEARNING_PROJECT,
              subject: subjectHint,
              city: (query.get("city") ?? "").slice(0, 120),
              format: query.get("format") === "online" ? "online" : "in_person",
            };
        let draft: ReturnType<typeof readLearningProjectDraft> = null;
        try {
          draft = readLearningProjectDraft(sessionStorage.getItem(draftKey));
        } catch {
          /* Storage can be unavailable in private browsing. */
        }
        const resumeDraft = draft !== null &&
          (!saved?.completed_at || draft.savedAt > Date.parse(saved.updated_at));
        if (draft && resumeDraft) {
          seed = draft.values;
          setStep(draft.step);
          setNotice("restored");
          setDirty(true);
        }
        setValues(seed);
        setEditing(!saved?.dismissed_at && (resumeDraft || !saved?.completed_at));
      })
      .catch(() => {
        if (!abort.signal.aborted) setLoadFailed(true);
      });
    return () => abort.abort();
    // Locale changes must not replace ongoing input or refetch the project.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, attempt, transport, draftKey]);

  useEffect(() => {
    if (!dirty || !data) return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ values, step, savedAt: Date.now() }),
      );
    } catch {
      /* Keep in-memory input even if browser storage is denied. */
    }
  }, [values, step, dirty, data, draftKey]);

  function change(patch: Partial<LearningProjectInput>) {
    setValues((current) => ({ ...current, ...patch }));
    setDirty(true);
    setError(null);
    setNotice(null);
  }
  async function persist(action: "save" | "dismiss") {
    setBusy(true);
    setError(null);
    try {
      const result = await transport(
        userId,
        action === "save" ? { ...values, action } : { action },
      );
      if (!alive.current) return;
      setDirty(false);
      setData(result);
      setEditing(false);
      setNotice(action === "save" ? "saved" : null);
      if (action === "save") {
        try {
          sessionStorage.removeItem(draftKey);
        } catch {
          /* Best effort local draft cleanup. */
        }
      }
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error && cause.message === "rate_limited" ? "rateLimitError" : "saveError");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function continueForm(event: React.FormEvent) {
    event.preventDefault();
    if (!values.subject.trim()) {
      setError("subjectError");
      return;
    }
    if (step === 1) {
      setStep(2);
      setDirty(true);
      return;
    }
    if (values.format !== "online" && !values.city.trim()) {
      setError("cityError");
      return;
    }
    void persist("save");
  }

  if (!data && !loadFailed) return null;
  if (loadFailed)
    return (
      <aside
        className="rounded-2xl border border-[var(--p-border-light)] bg-white p-4 text-sm"
        aria-label={copy.title}
      >
        <p>{copy.loadedError}</p>
        <button
          type="button"
          className={secondary}
          onClick={() => setAttempt((value) => value + 1)}
        >
          {copy.retry}
        </button>
      </aside>
    );
  const project = data?.project;
  if (!editing && !project?.completed_at && !manage)
    return (
      <section
        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--p-border-light)] bg-white p-4"
        aria-label={copy.title}
      >
        <p className="text-sm text-slate-600">{copy.deferred}</p>
        <button
          type="button"
          className={secondary}
          onClick={() => {
            setEditing(true);
            setError(null);
          }}
        >
          {copy.start}
        </button>
        {error ? (
          <p role="alert" className="w-full text-sm text-red-700">
            {copy[error]}
          </p>
        ) : null}
      </section>
    );

  return (
    <section
      className="rounded-3xl border border-[var(--p-border-light)] bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby={`${id}-title`}
    >
      {!editing ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id={`${id}-title`} className="text-lg font-bold text-slate-900">
              {copy.title}
            </h2>
            <button
              type="button"
              className={secondary}
              onClick={() => {
                setEditing(true);
                setError(null);
              }}
            >
              {project?.completed_at ? copy.edit : copy.start}
            </button>
          </div>
          {project?.completed_at ? (
            <>
              <p className="mt-2 break-words text-xl font-semibold text-teal-900">
                {project.subject}
              </p>
              <p className="mt-1 break-words text-sm text-slate-600">
                {copy[project.audience]} · {copy[project.format]}
                {project.city ? ` · ${project.city}` : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={data!.searchHref ?? "/student/search"}
                  className={primary}
                >
                  {data!.searchHref
                    ? project.format === "online"
                      ? copy.findOnline
                      : copy.find
                    : copy.browse}
                </Link>
                {project.format === "both" && data!.searchHref ? (
                  <Link
                    className={secondary}
                    href={data!.searchHref.replace(
                      "format=in_person",
                      "format=online",
                    )}
                  >
                    {copy.findOnline}
                  </Link>
                ) : null}
              </div>
              {!data!.searchHref ? (
                <p className="mt-3 text-sm text-slate-600">{copy.unknown}</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-600">{copy.deferred}</p>
          )}
        </>
      ) : (
        <form onSubmit={continueForm}>
          <fieldset disabled={busy} className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              {step === 1 ? copy.step1 : copy.step2}
            </p>
            <h2
              id={`${id}-title`}
              className="mt-2 text-xl font-bold text-slate-900"
            >
              {step === 1 ? copy.intro : copy.where}
            </h2>
            {step === 1 ? (
              <>
                <p className="mt-2 text-sm text-slate-600">{copy.why}</p>
                <label
                  htmlFor={`${id}-subject`}
                  className="mt-5 block text-sm font-semibold"
                >
                  {copy.subject}
                </label>
                <input
                  id={`${id}-subject`}
                  className={`${field} mt-2`}
                  value={values.subject}
                  maxLength={120}
                  placeholder={copy.placeholder}
                  onChange={(event) => change({ subject: event.target.value })}
                  aria-invalid={error === "subjectError"}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {PRATIQO_DISCIPLINES.filter((item) =>
                    ["espagnol", "francais", "mathematiques", "piano"].includes(
                      item.id,
                    ),
                  ).map((item) => {
                    const label =
                      locale === "en"
                        ? item.labelEn
                        : locale === "es"
                          ? item.labelEs
                          : item.labelFr;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`${secondary} border border-[var(--p-border-light)] aria-pressed:bg-teal-50`}
                        aria-pressed={
                          resolveDisciplineId(values.subject) === item.id
                        }
                        onClick={() => change({ subject: label })}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <fieldset className="mt-5">
                  <legend className="text-sm font-semibold">
                    {copy.audience}
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {(["self", "child"] as const).map((audience) => (
                      <label
                        key={audience}
                        className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--p-border-light)] px-4 py-2 text-sm"
                      >
                        <input
                          type="radio"
                          name={`${id}-audience`}
                          checked={values.audience === audience}
                          onChange={() => change({ audience })}
                        />
                        {copy[audience]}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            ) : (
              <>
                <fieldset className="mt-4 grid gap-2">
                  <legend className="sr-only">{copy.where}</legend>
                  {(["in_person", "online", "both"] as const).map((format) => (
                    <label
                      key={format}
                      className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--p-border-light)] px-4 py-3 text-sm has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50"
                    >
                      <input
                        type="radio"
                        name={`${id}-format`}
                        checked={values.format === format}
                        onChange={() => change({ format })}
                      />
                      {copy[format]}
                    </label>
                  ))}
                </fieldset>
                {values.format !== "online" ? (
                  <div className="mt-5">
                    <label
                      htmlFor={`${id}-city`}
                      className="block text-sm font-semibold"
                    >
                      {copy.city}
                    </label>
                    <input
                      id={`${id}-city`}
                      className={`${field} mt-2`}
                      list={`${id}-cities`}
                      value={values.city}
                      maxLength={120}
                      placeholder={copy.cityPlaceholder}
                      onChange={(event) => change({ city: event.target.value })}
                      aria-invalid={error === "cityError"}
                    />
                    <datalist id={`${id}-cities`}>
                      {CANADIAN_PLACES.map((place) => (
                        <option
                          key={`${place.name}|${place.provinceCode}`}
                          value={`${place.name}, ${place.provinceCode}`}
                        />
                      ))}
                    </datalist>
                    <p className="mt-2 text-xs text-slate-600">
                      {copy.cityHint}
                    </p>
                  </div>
                ) : null}
              </>
            )}
            {error ? (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {copy[error]}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="submit" className={primary}>
                {busy ? copy.saving : step === 1 ? copy.next : copy.save}
              </button>
              {step === 2 ? (
                <button
                  type="button"
                  className={secondary}
                  onClick={() => {
                    setStep(1);
                    setError(null);
                  }}
                >
                  {copy.back}
                </button>
              ) : null}
              <button
                type="button"
                className={secondary}
                onClick={() =>
                  project?.completed_at
                    ? setEditing(false)
                    : void persist("dismiss")
                }
              >
                {project?.completed_at ? copy.cancel : copy.skip}
              </button>
            </div>
          </fieldset>
        </form>
      )}
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        {copy.privacy}
      </p>
      <p
        className="mt-2 text-sm text-teal-800"
        role="status"
        aria-live="polite"
      >
        {notice ? copy[notice] : ""}
      </p>
    </section>
  );
}
