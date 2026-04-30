"use client";

import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/locale-context";

const PEER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NextLesson = {
  studentName?: string;
  studentPhotoUrl?: string | null;
  /** Booking `student_id` for `/messages?peer=`. */
  student_id?: string | null;
  slot_date?: string | null;
  date?: string | null;
  time_slot?: string | null;
  time?: string | null;
  teaching_mode?: string | null;
  price?: unknown;
};

export function TeacherNextLessonCard({
  next,
  disciplineLabel,
  lessonPriceFmt,
}: {
  next: NextLesson;
  disciplineLabel: string;
  lessonPriceFmt: string;
}) {
  const { t } = useLocale();
  const router = useRouter();

  const photoUrl = next.studentPhotoUrl?.trim();
  const peer = typeof next.student_id === "string" ? next.student_id.trim() : "";
  const messagesHref = peer && PEER_UUID_RE.test(peer) ? `/messages?peer=${encodeURIComponent(peer)}` : "/messages";

  return (
    <div className="rounded-xl border-2 border-[#00694c]/25 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] sm:p-6">
      <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-[#00694c]">{t("nextLessonCard")}</p>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt=""
              width={64}
              height={64}
              unoptimized
              className="h-16 w-16 shrink-0 rounded-full border-2 border-[#00694c]/30 object-cover"
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
              style={{ background: "linear-gradient(135deg,#1D9E75,#0f6e56)" }}
            >
              {(next.studentName || "?").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-900">{next.studentName}</p>
            <p className="text-sm text-slate-600">{disciplineLabel}</p>
            <p className="mt-1 text-sm text-slate-700">
              {next.slot_date || next.date} · {next.time_slot || next.time} · {t("lessonDuration1h")} · {lessonPriceFmt}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {next.teaching_mode === "domicile"
                ? t("homeVisit")
                : next.teaching_mode === "online"
                  ? t("online")
                  : t("inPerson")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push(messagesHref)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#00694c] px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#008560] hover:shadow"
          >
            {t("startLesson")}
          </button>
          <button
            type="button"
            onClick={() => router.push(messagesHref)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-[#00694c] hover:bg-slate-50"
          >
            <MessageCircle size={16} className="shrink-0" aria-hidden />
            {t("messageStudent")}
          </button>
        </div>
      </div>
    </div>
  );
}
