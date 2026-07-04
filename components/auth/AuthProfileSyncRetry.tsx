"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";

type AuthProfileSyncRetryProps = {
  onRetry: () => void;
  showHomeLink?: boolean;
};

/** User-facing retry when profile sync fails on auth/entry surfaces. */
export function AuthProfileSyncRetry({ onRetry, showHomeLink = true }: AuthProfileSyncRetryProps) {
  const { t } = useLocale();

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-[var(--p-text-muted)]">{t("companionProfileSyncError")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:brightness-[0.98]"
      >
        {t("companionProfileSyncRetry")}
      </button>
      {showHomeLink ? (
        <Link href="/" className="text-sm font-semibold text-teal-700 hover:underline">
          ← {t("loginReturnHome")}
        </Link>
      ) : null}
    </div>
  );
}
