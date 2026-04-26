"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/locale-context";
import type { CompanionType } from "@/lib/companions";
import { COMPANIONS, getCompanionStage } from "@/lib/companions";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

function localizedText(locale: string, fr: string, en: string, es: string) {
  if (locale === "en-CA") return en;
  if (locale === "es") return es;
  return fr;
}

export default function ChooseCompanionPage() {
  const { user, loading } = useAuth();
  const { locale, t } = useLocale();
  const router = useRouter();

  const [selected, setSelected] = useState<CompanionType>("phoenix");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    const supabase = getSupabaseClient();
    void (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("companion_chosen")
        .eq("id", user.id)
        .maybeSingle();
      const chosen = Boolean((profile as { companion_chosen?: boolean | null } | null)?.companion_chosen);
      if (chosen) router.replace("/dashboard");
    })();
  }, [loading, user, router]);

  const companions = useMemo(() => Object.values(COMPANIONS), []);

  const handleStart = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch("/api/companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companionType: selected }),
      });
      if (!res.ok) {
        console.error("Failed to save companion", await res.text());
        return;
      }
      router.replace("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="w-full"
      style={{
        paddingTop: 60, // space for sticky AppShell header
        paddingBottom: 80, // mobile bottom tabs
      }}
    >
      <div className="max-w-3xl mx-auto space-y-5 px-4 sm:px-6">
        <div>
        <h1 className="text-2xl font-bold text-[#2C2C2A]">{t("companionTitle")}</h1>
        <p className="mt-2 text-sm text-[#888780]">{t("companionSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {companions.map((c) => {
            const firstStage = getCompanionStage(c.id, 0);
            const name = localizedText(locale, c.name, c.nameEn, c.nameEs);
            const tagline = localizedText(locale, c.tagline, c.taglineEn, c.taglineEs);
            const stageEmoji = firstStage.emoji;
            const active = selected === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c.id)}
                className={cn(
                  "text-left w-full rounded-2xl border bg-white p-5 transition-all",
                  "hover:shadow-[0_14px_40px_rgba(44,44,42,0.08)]",
                  active ? "border-[#1D9E75] ring-2 ring-[#1D9E75]/15" : "border-[#E8E6DF] hover:border-[#D7D3C9]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[40px] leading-none">{stageEmoji}</div>
                    <div className="mt-2 font-semibold text-[#2C2C2A]">{name}</div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-1 bg-[#E1F5EE] text-[#1D9E75]">
                    {c.tag}
                  </span>
                </div>
                <div className="mt-3 text-sm text-[#6B6A64]">{tagline}</div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleStart}
            disabled={saving}
            className={cn(
              "rounded-xl px-5 py-3 text-sm font-bold text-white bg-[#1D9E75] hover:bg-[#178C67] transition-all",
              saving && "opacity-70 cursor-not-allowed",
            )}
          >
            {t("companionStart")}{" "}
            {localizedText(locale, COMPANIONS[selected].name, COMPANIONS[selected].nameEn, COMPANIONS[selected].nameEs)}
          </button>
        </div>
      </div>
    </div>
  );
}

