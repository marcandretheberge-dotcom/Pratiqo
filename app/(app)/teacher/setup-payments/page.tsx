"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { TeacherSetupNavigation } from "@/components/teacher/TeacherSetupNavigation";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import type { TranslationKey } from "@/lib/translations";
import { finishTeacherSetup } from "@/lib/teachers/guidedSetup";

const stateKeys: Record<string, TranslationKey> = {
  book: "teacherGuidedBookable", request: "teacherGuidedRequestable", contact: "teacherGuidedContactable",
  waitlist: "teacherGuidedUnavailable", not_public: "teacherGuidedNotPublic", unknown: "teacherGuidedUnknown",
};

export default function TeacherSetupPaymentsPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState("unknown");
  const [error, setError] = useState(false);
  const inFlight = useRef(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => {
    request.current?.abort();
    request.current = null;
    inFlight.current = false;
  }, [user?.id]);
  const token = async () => (await getSupabaseClient().auth.getSession()).data.session?.access_token;
  const refresh = useCallback(async () => {
    if (!user?.id || inFlight.current) return;
    const controller = new AbortController(); request.current = controller;
    inFlight.current = true; setBusy(true); setError(false); setState("unknown");
    try {
      const access = await token();
      if (controller.signal.aborted) return;
      if (!access) throw new Error("session_required");
      const headers = { Authorization: `Bearer ${access}` };
      // A return URL never proves readiness. Reuse the authenticated Stripe sync.
      const sync = await fetch("/api/stripe/connect", { headers, cache: "no-store", signal: controller.signal });
      if (!sync.ok) throw new Error("sync_failed");
      const res = await fetch("/api/teacher/setup-status", { headers, cache: "no-store", signal: controller.signal });
      if (!res.ok) throw new Error("status_failed");
      const body = await res.json();
      if (!controller.signal.aborted) setState(Object.hasOwn(stateKeys, body.state) ? body.state : "unknown");
    } catch { if (!controller.signal.aborted) setError(true); } finally {
      if (request.current === controller) { setBusy(false); inFlight.current = false; }
    }
  }, [user?.id]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const focus = () => { void refresh(); };
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [refresh]);
  async function connect() {
    if (inFlight.current) return;
    const controller = new AbortController(); request.current = controller;
    inFlight.current = true; setBusy(true); setError(false);
    try {
      const access = await token();
      if (controller.signal.aborted) return;
      if (!access) throw new Error("session_required");
      const res = await fetch("/api/stripe/connect?flow=teacher-setup", { method: "POST", headers: { Authorization: `Bearer ${access}` }, signal: controller.signal });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error("connect_failed");
      const url = new URL(data.url);
      if (url.protocol !== "https:" || !url.hostname.endsWith(".stripe.com")) throw new Error("invalid_connect_url");
      if (!controller.signal.aborted) window.location.assign(url.href);
    } catch { if (!controller.signal.aborted) setError(true); } finally {
      if (request.current === controller) { setBusy(false); inFlight.current = false; }
    }
  }
  return <div className="mx-auto max-w-3xl space-y-6 pb-24">
    <TeacherSetupNavigation step="payments" />
    <h1 className="text-2xl font-bold">{t("teacherGuidedPayments")}</h1>
    <p className="text-sm leading-relaxed text-slate-600">{t("teacherGuidedPaymentExplanation")}</p>
    <div role="status" className="rounded-lg border border-teal-200 bg-teal-50 p-4">
      {busy ? <Loader2 className="animate-spin" aria-label={t("loading")} /> : t(stateKeys[state] ?? "teacherGuidedUnknown")}
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{t("anErrorOccurred")}</p>}
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy || !user} onClick={() => void connect()} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-teal-700 px-4 text-white disabled:opacity-50"><CreditCard size={18} />{t("manageStripe")}</button>
      <button type="button" disabled={busy || !user} onClick={() => void refresh()} className="inline-flex min-h-12 items-center gap-2 rounded-lg border px-4 disabled:opacity-50"><RefreshCw size={18} />{t("teacherGuidedRefresh")}</button>
    </div>
    <Link href="/teacher/verification" className="block text-teal-700 underline">{t("teacherProfileManagementTitle")}</Link>
    <Link href="/dashboard" onClick={() => { if (user?.id) finishTeacherSetup(user.id); }} className="block text-teal-700 underline">{t("teacherGuidedDashboard")}</Link>
  </div>;
}
