"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/lib/locale-context";

type MarketWaitlistRole = "teacher" | "student";

export function MarketWaitlistCard({
  defaultEmail,
  defaultCountryCode,
  defaultRole = "teacher",
}: {
  defaultEmail?: string | null;
  defaultCountryCode?: string | null;
  defaultRole?: MarketWaitlistRole;
}) {
  const { t } = useLocale();
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [countryCode, setCountryCode] = useState(defaultCountryCode ?? "");
  const [role, setRole] = useState<MarketWaitlistRole>(defaultRole);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [busy, setBusy] = useState(false);

  const feature = useMemo(() => {
    const safeCountry = countryCode.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) || "UNKNOWN";
    return `market_access_${role}_${safeCountry}`;
  }, [countryCode, role]);

  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), feature }),
      });
      const payload = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !payload.ok) throw new Error("waitlist_failed");
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-white/80 p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-[1fr_130px_130px_auto] sm:items-end">
        <label className="text-[12px] font-medium text-slate-700">
          {t("marketWaitlistEmailLabel")}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] text-slate-900 outline-none focus:border-teal-600"
            autoComplete="email"
          />
        </label>
        <label className="text-[12px] font-medium text-slate-700">
          {t("marketWaitlistCountryLabel")}
          <input
            type="text"
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] uppercase text-slate-900 outline-none focus:border-teal-600"
            maxLength={2}
            autoComplete="country"
          />
        </label>
        <label className="text-[12px] font-medium text-slate-700">
          {t("marketWaitlistRoleLabel")}
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as MarketWaitlistRole)}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] text-slate-900 outline-none focus:border-teal-600"
          >
            <option value="teacher">{t("marketWaitlistRoleTeacher")}</option>
            <option value="student">{t("marketWaitlistRoleStudent")}</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !email.trim()}
          className="h-10 rounded-xl bg-teal-700 px-4 text-[13px] font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "..." : t("marketWaitlistSubmit")}
        </button>
      </div>
      {status === "success" ? (
        <p className="mt-2 text-[12px] font-medium text-teal-800">{t("marketWaitlistSuccess")}</p>
      ) : null}
      {status === "error" ? (
        <p className="mt-2 text-[12px] font-medium text-red-700">{t("marketWaitlistError")}</p>
      ) : null}
    </div>
  );
}
