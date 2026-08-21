"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import PratiqoLogo from "@/components/PratiqoLogo";
import { useLocale } from "@/lib/locale-context";
import {
  buildTeacherNavSections,
  isTeacherNavActive,
  TEACHER_DRAWER_EXTRA_NAV,
  type TeacherNavItem,
} from "@/components/teacher/teacherNavConfig";

function SidebarLink({
  item,
  pathname,
  unreadMessages,
}: {
  item: TeacherNavItem;
  pathname: string | null;
  unreadMessages: number;
}) {
  const { t } = useLocale();
  const Icon = item.icon;
  const active = isTeacherNavActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600",
        active
          ? "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200/80"
          : "text-slate-700 hover:bg-slate-50 hover:text-teal-800",
      )}
      data-active={active ? "true" : undefined}
    >
      <Icon
        size={18}
        className={cn("shrink-0", active ? "text-teal-700" : "text-slate-500 group-hover:text-teal-700")}
        aria-hidden
      />
      <span className="min-w-0 truncate">{t(item.labelKey)}</span>
      {item.href === "/messages" && unreadMessages > 0 ? (
        <span className="ml-auto inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {unreadMessages > 99 ? "99+" : unreadMessages}
        </span>
      ) : null}
    </Link>
  );
}

export function TeacherSidebarNav({ unreadMessages }: { unreadMessages: number }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const sections = buildTeacherNavSections();

  return (
    <aside
      className="hidden h-full min-h-0 w-[260px] shrink-0 flex-col border-r border-[#E8E6DF] bg-white md:flex"
      data-testid="teacher-sidebar-nav"
      aria-label={t("teacherSpaceLabel")}
    >
      <div className="flex h-[52px] shrink-0 items-center border-b border-[#E8E6DF] px-4">
        <Link href="/dashboard" className="min-w-0" aria-label={t("ariaHome")} data-testid="teacher-sidebar-logo">
          <PratiqoLogo variant="full" size="md" />
        </Link>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-5" aria-label={t("teacherSpaceLabel")}>
        {sections.map((section) => (
          <div key={section.id}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
              {t(section.headingKey)}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <SidebarLink item={item} pathname={pathname} unreadMessages={unreadMessages} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="mt-auto border-t border-slate-100 pt-4">
          <ul className="flex flex-col gap-0.5">
            {TEACHER_DRAWER_EXTRA_NAV.map((item) => (
              <li key={item.href}>
                <SidebarLink item={item} pathname={pathname} unreadMessages={unreadMessages} />
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
