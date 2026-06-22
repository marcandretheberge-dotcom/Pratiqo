"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { getAnalyticsAnonymousId } from "@/lib/privacy/analyticsAnonymousId";
import { hasAnalyticsConsent } from "@/lib/privacy/cookieConsent";

type RecruitmentEventName = "teacher_recruitment_landing_view" | "teacher_recruitment_cta_click";

type RecruitmentEventProperties = {
  vertical: string;
  source?: string | null;
  path?: string;
  locale?: string;
  cta_label?: string;
  destination?: string;
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    plausible?: (eventName: string, options?: { props?: Record<string, unknown> }) => void;
  }
}

const ANON_KEY = "pratiqo_recruitment_anon_id";

function anonymousId(): string | null {
  if (!hasAnalyticsConsent()) return null;
  try {
    const current = window.localStorage.getItem(ANON_KEY);
    if (current) return current;
    const shared = getAnalyticsAnonymousId();
    if (shared) {
      window.localStorage.setItem(ANON_KEY, shared);
      return shared;
    }
    return null;
  } catch {
    return null;
  }
}

export function trackTeacherRecruitmentEvent(
  eventName: RecruitmentEventName,
  properties: RecruitmentEventProperties,
) {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;

  try {
    window.dataLayer?.push({ event: eventName, ...properties });
    window.plausible?.(eventName, { props: properties });
  } catch {
    /* best-effort only */
  }

  try {
    void fetch("/api/analytics/search-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        source: eventName,
        anonymous_session_id: anonymousId(),
        filters: properties,
        result_count: null,
      }),
    });
  } catch {
    /* best-effort only */
  }
}

export function TeacherRecruitmentAnalytics({
  vertical,
  source,
  path,
  locale,
}: {
  vertical: string;
  source?: string | null;
  path: string;
  locale: string;
}) {
  useEffect(() => {
    trackTeacherRecruitmentEvent("teacher_recruitment_landing_view", {
      vertical,
      source,
      path,
      locale,
    });
  }, [locale, path, source, vertical]);

  return null;
}

export function TeacherRecruitmentCtaLink({
  href,
  label,
  vertical,
  source,
  className,
  children,
}: {
  href: string;
  label: string;
  vertical: string;
  source?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        trackTeacherRecruitmentEvent("teacher_recruitment_cta_click", {
          vertical,
          source,
          cta_label: label,
          destination: href,
        });
      }}
    >
      {children}
    </Link>
  );
}
