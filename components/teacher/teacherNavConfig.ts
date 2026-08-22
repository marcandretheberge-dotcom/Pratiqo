import type { ComponentType } from "react";
import {
  Calendar,
  CircleDollarSign,
  History,
  LayoutDashboard,
  LifeBuoy,
  NotebookPen,
  Package,
  Settings,
  Shield,
  Star,
  User,
  Users,
  MessageCircle,
} from "lucide-react";
import { isTeacherPackageVisibilityUiEnabled } from "@/lib/offers/teacherPackages";
import { isTeacherPlannedPackageDashboardUiEnabled } from "@/lib/offers/plannedPackageTeacherDashboard";

export type TeacherNavLabelKey =
  | "teacherDashboard"
  | "teacherSchedule"
  | "teacherStudents"
  | "teacherMessages"
  | "teacherLoyalty"
  | "teacherProfileManagementNav"
  | "teacherNavRevenue"
  | "teacherHistoryTitle"
  | "teacherOffersNav"
  | "teacherPackagesNav"
  | "teacherPlannedPackagesNav"
  | "teacherNavMyProfile"
  | "resolutionCenterTitle"
  | "settings";

export type TeacherNavItem = {
  href: string;
  labelKey: TeacherNavLabelKey;
  icon: ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
};

export type TeacherNavSectionId = "main" | "activity" | "account";

export type TeacherNavSection = {
  id: TeacherNavSectionId;
  headingKey: "teacherNavGroupMain" | "teacherNavGroupActivity" | "teacherNavGroupAccount";
  items: TeacherNavItem[];
};

/** Active-state matching for teacher dashboard routes (including nested pages). */
export function isTeacherNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/teacher/my-profile") return pathname.startsWith("/teacher/my-profile");
  if (href === "/teacher/settings") return pathname.startsWith("/teacher/settings");
  if (href === "/teacher/schedule") {
    return pathname.startsWith("/teacher/schedule") || pathname.startsWith("/teacher/group-sessions");
  }
  if (href === "/teacher/progress") return pathname.startsWith("/teacher/progress");
  if (href === "/teacher/revenue") return pathname.startsWith("/teacher/revenue");
  if (href === "/teacher/history") return pathname.startsWith("/teacher/history");
  if (href === "/teacher/offers") return pathname.startsWith("/teacher/offers");
  if (href === "/teacher/packages") return pathname.startsWith("/teacher/packages");
  if (href === "/teacher/verification") return pathname.startsWith("/teacher/verification");
  if (href === "/resolution") return pathname.startsWith("/resolution");
  if (href === "/loyalty") return pathname.startsWith("/loyalty");
  return pathname === href || pathname.startsWith(`${href}/`);
}

const MAIN_NAV: TeacherNavItem[] = [
  { href: "/dashboard", labelKey: "teacherDashboard", icon: LayoutDashboard },
  { href: "/teacher/schedule", labelKey: "teacherSchedule", icon: Calendar },
  { href: "/teacher/progress", labelKey: "teacherStudents", icon: Users },
  { href: "/messages", labelKey: "teacherMessages", icon: MessageCircle },
  { href: "/teacher/offers", labelKey: "teacherOffersNav", icon: NotebookPen },
  { href: "/teacher/revenue", labelKey: "teacherNavRevenue", icon: CircleDollarSign },
];

function buildMainNav(): TeacherNavItem[] {
  const entitlementsOn = isTeacherPackageVisibilityUiEnabled();
  const plannedOn = isTeacherPlannedPackageDashboardUiEnabled();
  if (!entitlementsOn && !plannedOn) return MAIN_NAV;
  const packagesItem: TeacherNavItem = {
    href: "/teacher/packages",
    labelKey: plannedOn ? "teacherPlannedPackagesNav" : "teacherPackagesNav",
    icon: Package,
  };
  // Keep packages with offers in the main group when either packages flag is on.
  const offersIdx = MAIN_NAV.findIndex((item) => item.href === "/teacher/offers");
  if (offersIdx < 0) return [...MAIN_NAV, packagesItem];
  return [...MAIN_NAV.slice(0, offersIdx + 1), packagesItem, ...MAIN_NAV.slice(offersIdx + 1)];
}

const ACTIVITY_NAV: TeacherNavItem[] = [
  { href: "/teacher/history", labelKey: "teacherHistoryTitle", icon: History },
  { href: "/resolution", labelKey: "resolutionCenterTitle", icon: LifeBuoy },
];

const ACCOUNT_NAV: TeacherNavItem[] = [
  { href: "/loyalty", labelKey: "teacherLoyalty", icon: Star },
  { href: "/teacher/verification", labelKey: "teacherProfileManagementNav", icon: Shield },
];

/** Profile + settings — drawer / sidebar footer (also in avatar menu). */
export const TEACHER_DRAWER_EXTRA_NAV: TeacherNavItem[] = [
  { href: "/teacher/my-profile", labelKey: "teacherNavMyProfile", icon: User },
  { href: "/teacher/settings", labelKey: "settings", icon: Settings },
];

export function buildTeacherNavSections(): TeacherNavSection[] {
  return [
    { id: "main", headingKey: "teacherNavGroupMain", items: buildMainNav() },
    { id: "activity", headingKey: "teacherNavGroupActivity", items: ACTIVITY_NAV },
    { id: "account", headingKey: "teacherNavGroupAccount", items: ACCOUNT_NAV },
  ];
}

export function flattenTeacherNavSections(sections: TeacherNavSection[]): TeacherNavItem[] {
  return sections.flatMap((section) => section.items);
}

export function buildTeacherMobileDrawerNav(): TeacherNavItem[] {
  return [...flattenTeacherNavSections(buildTeacherNavSections()), ...TEACHER_DRAWER_EXTRA_NAV];
}
