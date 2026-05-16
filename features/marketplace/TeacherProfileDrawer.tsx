"use client";

import dynamic from "next/dynamic";
import { ShieldCheck } from "lucide-react";
import type { Teacher } from "@/types";
import type { TeacherBookKind } from "@/components/TeacherProfile";
import { useLocale } from "@/lib/locale-context";

const TeacherProfile = dynamic(
  () => import("@/components/TeacherProfile").then((mod) => mod.TeacherProfile),
  { ssr: false, loading: () => <TeacherProfileDrawerSkeleton /> },
);

export function TeacherProfileDrawer({
  teacher,
  onClose,
  onBook,
  onSendMessage,
}: {
  teacher: Teacher;
  onClose: () => void;
  onBook: (kind: TeacherBookKind) => void;
  onSendMessage?: () => void;
}) {
  return (
    <TeacherProfile
      teacher={teacher}
      onClose={onClose}
      onBook={onBook}
      onSendMessage={onSendMessage}
    />
  );
}

function TeacherProfileDrawerSkeleton() {
  const { t } = useLocale();

  return (
    <div className="fixed inset-0 z-[90] bg-[#2C2C2A]/35 p-0 backdrop-blur-sm sm:p-6">
      <div className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-none border border-[#E8E6DF] bg-[#FAFCFB] shadow-2xl sm:rounded-3xl">
        <div className="border-b border-[#E8E6DF] bg-white p-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-2xl bg-[#E8E6DF]" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-5 w-44 animate-pulse rounded-full bg-[#E8E6DF]" />
              <div className="h-3 w-64 max-w-full animate-pulse rounded-full bg-[#EEF4F1]" />
            </div>
            <div className="hidden h-10 w-24 animate-pulse rounded-full bg-teal-50 sm:block" />
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-hidden p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-[#E8E6DF] bg-white p-4">
                <div className="h-4 w-20 animate-pulse rounded-full bg-[#E8E6DF]" />
                <div className="mt-3 h-7 w-24 animate-pulse rounded-full bg-[#EEF4F1]" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-[#E8E6DF] bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-teal-800">
              <ShieldCheck size={16} aria-hidden />
              {t("loading")}
            </div>
            <div className="mt-5 space-y-3">
              <div className="h-4 w-full animate-pulse rounded-full bg-[#E8E6DF]" />
              <div className="h-4 w-11/12 animate-pulse rounded-full bg-[#E8E6DF]" />
              <div className="h-4 w-4/5 animate-pulse rounded-full bg-[#E8E6DF]" />
            </div>
          </div>
        </div>

        <div className="border-t border-[#E8E6DF] bg-white p-5">
          <div className="h-12 w-full animate-pulse rounded-2xl bg-teal-100" />
        </div>
      </div>
    </div>
  );
}
