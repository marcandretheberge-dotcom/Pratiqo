"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { resolveCafeRoomCourseReturn } from "@/lib/cafe/roomCourseReturn";
import { canonicalCafeLanguage } from "@/lib/cafe/communityLanguages";

function subscribeLocation(update: () => void) {
  window.addEventListener("popstate", update);
  window.addEventListener("hashchange", update);
  return () => { window.removeEventListener("popstate", update); window.removeEventListener("hashchange", update); };
}
const browserLocation = () => `${window.location.pathname}${window.location.search}`;
const serverLocation = () => "";

/** Permanent navigation; course context is a hint, never a language restriction. */
export function CafeNavLink({ className = "", full = false, preserveCourse = false }: { className?: string; full?: boolean; preserveCourse?: boolean }) {
  const pathname = usePathname();
  const location = useSyncExternalStore(subscribeLocation, browserLocation, serverLocation);
  const destination = preserveCourse && pathname ? resolveCafeRoomCourseReturn(location || pathname) : null;
  const query = new URLSearchParams();
  if (destination) query.set("yoReturn", destination);
  const part = preserveCourse && pathname ? /\/yo\/langues\/([^/]+)/.exec(pathname)?.[1] : null;
  const language = canonicalCafeLanguage(part);
  if (language) query.set("language", language);
  const href = `/cafe${query.size ? `?${query.toString()}` : ""}`;
  return <Link href={href} prefetch={false} aria-label="Café des langues" data-testid="cafe-nav-link" className={`inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-[#D3D1C7] bg-[#FAFAF6] px-2.5 py-1.5 text-xs font-semibold text-[#35372F] transition-colors hover:bg-[#ECEDE5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}>{full ? "Café des langues" : "Café"}</Link>;
}
