"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";

const NAV = [
  { href: "/dashboard", emoji: "📊", label: "Tableau de bord" },
  { href: "/teacher/schedule", emoji: "📅", label: "Mes cours" },
  { href: "/teacher/progress", emoji: "👥", label: "Mes élèves" },
  { href: "/messages", emoji: "💬", label: "Messages" },
  { href: "/loyalty", emoji: "⭐", label: "Fidélité" },
  { href: "/teacher/verification", emoji: "🛡️", label: "Vérification" },
  { href: "/teacher/settings", emoji: "⚙️", label: "Paramètres" },
] as const;

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/teacher/schedule") return pathname.startsWith("/teacher/schedule");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TeacherShellNav({
  unreadMessages,
  loyaltyTier,
  studentCount,
}: {
  unreadMessages: number;
  loyaltyTier: string | null;
  studentCount: number | null;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const badge =
          item.href === "/messages" && unreadMessages > 0
            ? { kind: "count" as const, value: unreadMessages }
            : item.href === "/teacher/progress" && studentCount != null && studentCount > 0
              ? { kind: "count" as const, value: studentCount }
              : item.href === "/loyalty" && loyaltyTier
                ? { kind: "tier" as const, value: loyaltyTier }
                : null;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between gap-2 rounded-xl px-2.5 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-[rgba(255,255,255,0.08)]" : "hover:bg-[rgba(255,255,255,0.05)]",
            )}
          >
            <span className="flex items-center gap-3 min-w-0">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base",
                  active ? "bg-[#1D9E75]" : "bg-[rgba(255,255,255,0.1)]",
                )}
                aria-hidden
              >
                {item.emoji}
              </span>
              <span className={cn("truncate", active ? "text-[#5DCAA5]" : "text-[rgba(255,255,255,0.7)]")}>{item.label}</span>
            </span>
            {badge?.kind === "count" ? (
              <span
                className={cn(
                  "min-w-[1.25rem] h-6 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0",
                  item.href === "/messages" ? "bg-red-500 text-white" : "bg-[#1D9E75] text-white",
                )}
              >
                {badge.value > 99 ? "99+" : badge.value}
              </span>
            ) : badge?.kind === "tier" ? (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-[#1D9E75]/35 text-[#B8F5DC] shrink-0 max-w-[5.5rem] truncate">
                {badge.value}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
