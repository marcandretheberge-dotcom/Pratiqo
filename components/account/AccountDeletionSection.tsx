"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/locale-context";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function AccountDeletionSection({ className }: { className?: string }) {
  const { user } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredWord = useMemo(() => t("deleteAccountConfirmWord"), [t]);
  const canConfirm = typed.trim() === requiredWord && checked && !busy;

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setChecked(false);
    setError(null);
  };

  const submit = async () => {
    if (!user || !canConfirm) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error(t("sessionExpiredShort"));

      const res = await fetch("/api/account/delete-request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || t("accountDeletionError"));

      await supabase.auth.signOut();
      router.replace("/account/deletion-requested");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("accountDeletionError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cn("rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm space-y-3", className)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600">
          <AlertTriangle size={18} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-rose-700">{t("dangerZone")}</p>
          <h2 className="mt-1 text-lg font-bold text-[#2C2C2A]">{t("deleteAccountTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{t("deleteAccountDescription")}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center justify-center rounded-full border border-rose-300 bg-white px-5 text-sm font-bold text-rose-700 hover:bg-rose-50"
      >
        {t("requestAccountDeletion")}
      </button>
      {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-rose-700">{t("dangerZone")}</p>
                <h3 className="mt-1 text-xl font-bold text-[#2C2C2A]">{t("confirmAccountDeletionTitle")}</h3>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label={t("cancel")}
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-700">{t("confirmAccountDeletionBody")}</p>

            <label className="mt-5 block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                {t("deleteAccountTypeConfirm").replace("{word}", requiredWord)}
              </span>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold tracking-widest text-slate-900 outline-none focus:border-rose-400"
                autoComplete="off"
              />
            </label>

            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600"
              />
              <span>{t("deleteAccountCheckbox")}</span>
            </label>

            {error ? <p className="mt-3 text-xs font-semibold text-rose-700">{error}</p> : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="min-h-11 rounded-full border border-slate-200 px-5 text-sm font-bold text-slate-700 disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!canConfirm}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("confirmDeletionRequest")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
