"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/locale-context";
import type { CompanionType } from "@/lib/companions";
import { COMPANIONS, getCompanionStage } from "@/lib/companions";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

function localizedText(locale: string, fr: string, en: string, es: string) {
  if (locale === "en") return en;
  if (locale === "es") return es;
  return fr;
}

function isCompanionType(value: unknown): value is CompanionType {
  return value === "phoenix" || value === "forest" || value === "dragon" || value === "star";
}

export default function ChooseCompanionPage() {
  const { user, loading } = useAuth();
  const { locale, t } = useLocale();

  const [selected, setSelected] = useState<CompanionType>("phoenix");
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<"choose" | "animating" | "done">("choose");
  const [showCards, setShowCards] = useState(true);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    const supabase = getSupabaseClient();
    void (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("companion_type")
        .eq("id", user.id)
        .maybeSingle();
      const companionType = (profile as { companion_type?: string | null } | null)?.companion_type;
      if (isCompanionType(companionType)) {
        setSelected(companionType);
      }
    })();
  }, [loading, user]);

  const companions = useMemo(() => Object.values(COMPANIONS), []);
  const selectedCompanion = COMPANIONS[selected];
  const stages = selectedCompanion.stages;

  const selectedName = useMemo(() => {
    return localizedText(locale, selectedCompanion.name, selectedCompanion.nameEn, selectedCompanion.nameEs);
  }, [locale, selectedCompanion]);

  const stageName = useMemo(() => {
    const s = stages[currentStageIndex] ?? stages[0]!;
    return localizedText(locale, s.name, s.nameEn, s.nameEs);
  }, [locale, stages, currentStageIndex]);

  const stageEmoji = useMemo(() => {
    const s = stages[currentStageIndex] ?? stages[0]!;
    return s.emoji;
  }, [stages, currentStageIndex]);

  const handleStart = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/companion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ companionType: selected }),
      });
      if (!res.ok) {
        console.error("Failed to save companion", await res.text());
        return;
      }
      window.location.assign("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  const startAdventure = async () => {
    await handleStart();
  };

  useEffect(() => {
    if (state !== "animating") return;

    const timeouts: number[] = [];
    const safeSetTimeout = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      timeouts.push(id);
      return id;
    };

    // initial bounce settle
    safeSetTimeout(() => setBounce(false), 200);

    // Step through each stage every 500ms.
    for (let i = 1; i < stages.length; i += 1) {
      safeSetTimeout(() => {
        setCurrentStageIndex(i);
        setBounce(true);
        safeSetTimeout(() => setBounce(false), 200);
      }, i * 500);
    }

    // After the last stage, wait a bit then show the done view.
    safeSetTimeout(() => setState("done"), stages.length * 500 + 400);

    return () => {
      for (const id of timeouts) window.clearTimeout(id);
    };
  }, [state, stages]);

  return (
    <div
      className="w-full"
      style={{
        paddingTop: 60, // space for sticky AppShell header
        paddingBottom: 80, // mobile bottom tabs
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link
          href="/profile"
          aria-label={localizedText(locale, "Retour", "Back", "Volver")}
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-[#E8E6DF] bg-white px-4 text-sm font-semibold text-[#0F6E56] shadow-sm transition hover:border-teal-200 hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          <span aria-hidden>←</span>
          {localizedText(locale, "Retour", "Back", "Volver")}
        </Link>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#2C2C2A]">{t("companionTitle")}</h1>
          <p className="text-sm text-[#6B6A65]">{t("companionSubtitle")}</p>
        </div>

        {/* CHOOSE */}
        {showCards ? (
          <div
            className="mt-5"
            style={{
              opacity: state === "choose" ? 1 : 0,
              transform: state === "choose" ? "translateY(0)" : "translateY(-10px)",
              transition: "all 0.3s",
              pointerEvents: state === "choose" ? "auto" : "none",
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {companions.map((c) => {
                const firstStage = getCompanionStage(c.id, 0);
                const name = localizedText(locale, c.name, c.nameEn, c.nameEs);
                const tagline = localizedText(locale, c.tagline, c.taglineEn, c.taglineEs);
                const emoji = firstStage.emoji;
                const active = selected === c.id;
                const dim = selected !== c.id;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelected(c.id)}
                    className={cn("text-left w-full rounded-2xl border bg-white p-5")}
                    style={{
                      borderColor: active ? "var(--palette-teal-500)" : "#E8E6DF",
                      opacity: active ? 1 : dim ? 0.5 : 1,
                      transform: active ? "scale(1.02)" : dim ? "scale(0.97)" : "scale(1)",
                      transition: "all 0.2s",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[40px] leading-none">{emoji}</div>
                        <div className="mt-2 font-semibold text-[#2C2C2A]">{name}</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-1 bg-teal-50 text-teal-700">
                        {c.tag}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-[#6B6A64]">{tagline}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setCurrentStageIndex(0);
                  setBounce(true);
                  setState("animating");
                  setTimeout(() => setShowCards(false), 300);
                }}
                disabled={saving}
                className={cn(
                  "rounded-xl px-5 py-3 text-sm font-bold text-white bg-teal-600 hover:bg-[#178C67] transition-all",
                  saving && "opacity-70 cursor-not-allowed",
                )}
                style={{ transition: "all 0.2s" }}
              >
                Commencer avec {selectedName}
              </button>
            </div>
          </div>
        ) : null}

        {/* ANIMATING */}
        {state === "animating" ? (
          <div
            className="mt-8 flex flex-col items-center justify-center text-center"
            style={{
              opacity: 1,
              transition: "all 0.3s",
              minHeight: 360,
            }}
          >
            <div
              style={{
                fontSize: 64,
                lineHeight: 1,
                transform: bounce ? "scale(1.3)" : "scale(1)",
                transition: "transform 0.2s",
              }}
            >
              {stageEmoji}
            </div>
            <div className="mt-4 text-lg font-bold text-[#2C2C2A]">{selectedName}</div>
            <div className="mt-1 text-sm font-semibold text-[#6B6A65]">{stageName}</div>

            <div className="mt-5 flex items-center gap-2">
              {stages.map((_, idx) => {
                const reached = idx <= currentStageIndex;
                return (
                  <span
                    key={idx}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: reached ? "var(--palette-teal-500)" : "#D3D1C7",
                      transition: "all 0.2s",
                      display: "inline-block",
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-4 text-sm font-semibold text-teal-700">Chargement…</div>
          </div>
        ) : null}

        {/* DONE */}
        {state === "done" ? (
          <div
            className="mt-6"
            style={{
              opacity: 1,
              transition: "all 0.3s",
            }}
          >
            <div
              className="rounded-3xl p-5 text-white shadow-[0_18px_60px_rgba(15,110,86,0.20)]"
              style={{ background: "linear-gradient(135deg, var(--palette-teal-700), var(--palette-teal-500))" }}
            >
              <div className="flex items-start gap-4">
                <div className="text-[48px] leading-none">{stages[0]?.emoji}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{localizedText(locale, stages[0]!.name, stages[0]!.nameEn, stages[0]!.nameEs)}</p>
                  <p className="text-[12px] text-white/80 truncate">{selectedName}</p>
                  <div className="mt-3 h-2 rounded-full bg-white/25 overflow-hidden">
                    <div className="h-full rounded-full bg-white" style={{ width: "0%" }} />
                  </div>
                  <p className="mt-3 text-[12px] text-white/90 font-semibold">Commence tes cours pour évoluer!</p>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-bold text-[#2C2C2A]">Toutes les évolutions</p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                {stages.map((s, idx) => {
                  const current = idx === 0;
                  const label = localizedText(locale, s.name, s.nameEn, s.nameEs);
                  const range = `${s.minLessons}–${s.maxLessons === 9999 ? "∞" : s.maxLessons}`;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "relative shrink-0 rounded-2xl px-3 py-3",
                        current ? "bg-teal-600 text-white" : "bg-[#F4F4F3] text-[#6B6A65]",
                      )}
                      style={{
                        minWidth: 132,
                        opacity: current ? 1 : 0.4,
                        transition: "all 0.2s",
                      }}
                    >
                      <div className={cn("leading-none", current ? "text-[28px]" : "text-[22px]")}>{s.emoji}</div>
                      <div className={cn("mt-2 text-xs font-bold", current ? "text-white" : "text-[#6B6A64]")}>{label}</div>
                      <div className={cn("mt-1 text-[10px] font-semibold", current ? "text-white/80" : "text-[#6B6A65]")}>
                        {range}
                      </div>
                      {!current ? <span className="absolute top-2 right-2 text-xs">🔒</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={startAdventure}
                disabled={saving}
                className={cn(
                  "rounded-xl px-5 py-3 text-sm font-bold text-white bg-teal-600 hover:bg-[#178C67] transition-all",
                  saving && "opacity-70 cursor-not-allowed",
                )}
              >
                Commencer l&apos;aventure →
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

