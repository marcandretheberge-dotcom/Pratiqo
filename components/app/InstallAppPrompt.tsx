"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { getPwaCopy } from "@/lib/pwa/copy";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "pratiqo-pwa-install-dismissed";
const SENSITIVE_PREFIXES = [
  "/account",
  "/admin",
  "/api",
  "/app",
  "/booking",
  "/checkout",
  "/connexion",
  "/dashboard",
  "/legal",
  "/login",
  "/loyalty",
  "/messages",
  "/onboarding",
  "/profile",
  "/resolution",
  "/student",
  "/teacher",
  "/upgrade",
  "/yo/checkout",
  // Keep the learning controls and Yoppo unobstructed on small screens.
  "/yo/langues/allemand/parcours",
];

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isMobileBrowser(): boolean {
  return window.matchMedia("(max-width: 767px)").matches || /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
}

function isCrawler(): boolean {
  return /bot|crawler|spider|crawling|facebookexternalhit|preview/i.test(window.navigator.userAgent);
}

function isSensitivePath(pathname: string): boolean {
  return SENSITIVE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function InstallAppPrompt() {
  const pathname = usePathname() ?? "/";
  const { locale } = useLocale();
  const copy = getPwaCopy(locale);
  const [mounted, setMounted] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const deviceInstruction = useMemo(() => {
    if (!mounted) return "";
    return /iPad|iPhone|iPod/i.test(window.navigator.userAgent) ? copy.installIos : copy.installAndroid;
  }, [copy.installAndroid, copy.installIos, mounted]);

  useEffect(() => {
    setMounted(true);

    if (isCrawler() || isStandaloneDisplay() || !isMobileBrowser()) return;

    try {
      if (window.localStorage.getItem(DISMISSED_KEY) === "1") return;
    } catch {
      return;
    }

    setVisible(true);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (isSensitivePath(pathname)) {
      setVisible(false);
    }
  }, [pathname]);

  if (!mounted || !visible || isSensitivePath(pathname)) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      dismiss();
    }
  };

  return (
    <aside
      className="fixed inset-x-3 z-40 mx-auto max-w-md rounded-3xl border border-[#1D9E75]/20 bg-white/95 p-4 text-slate-900 shadow-[0_18px_60px_rgba(15,110,86,0.18)] backdrop-blur"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      aria-label={copy.installTitle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#0F6E56]">{copy.installTitle}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{copy.installBody}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{deviceInstruction}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-10 shrink-0 rounded-full px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
        >
          {copy.installDismiss}
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {installPrompt ? (
          <button
            type="button"
            onClick={install}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#1D9E75] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2"
          >
            {copy.installCta}
          </button>
        ) : null}
        <Link
          href="/app"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#1D9E75]/25 bg-white px-4 text-sm font-semibold text-[#0F6E56] transition hover:bg-[#DDF4F1] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2"
        >
          {copy.installHelp}
        </Link>
      </div>
    </aside>
  );
}
