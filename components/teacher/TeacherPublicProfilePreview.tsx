"use client";

/**
 * Public profile preview — read-only result surface for teachers.
 * Editing lives in /teacher/verification (Gestion du profil).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Pencil } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase";
import { useLocale } from "@/lib/locale-context";
import { getDisciplineById } from "@/lib/disciplines";
import { TEACHER_SETUP_PATH } from "@/lib/auth/teacherLoginRouting";
import { buildTeacherSetupChecklist, teacherSetupProgressPercent } from "@/lib/teachers/teacherSetupProgress";
import { fetchEnsureTeacherProfile } from "@/lib/teachers/ensureTeacherProfileClient";

type DisciplineRow = {
  discipline_id: string;
  specialite: string | null;
};

type PreviewTeacher = {
  id: string;
  name?: string | null;
  bio?: string | null;
  discipline?: string | null;
  price_per_lesson?: number | null;
  image_url?: string | null;
  teaching_mode?: string | null;
  is_public?: boolean | null;
  deactivated_at?: string | null;
  deleted_at?: string | null;
  city?: string | null;
  region?: string | null;
  availability?: unknown[] | null;
};

export function TeacherPublicProfilePreview() {
  const { user, profile: authProfile } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<PreviewTeacher | null>(null);
  const [disciplines, setDisciplines] = useState<DisciplineRow[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const supabase = getSupabaseClient();
    void (async () => {
      const [{ data: prof }, teacherRes] = await Promise.all([
        supabase.from("profiles").select("photo_url").eq("id", user.id).maybeSingle(),
        supabase
          .from("teachers")
          .select("id, name, bio, discipline, price_per_lesson, image_url, teaching_mode, is_public, deactivated_at, deleted_at, city, region, availability")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      let trow = teacherRes.data;
      if (!trow) {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (token) {
          const ensured = await fetchEnsureTeacherProfile(token);
          if (!ensured.ok) {
            console.error("[teacher/my-profile] fetchEnsureTeacherProfile failed", ensured.error);
          } else {
            const refetch = await supabase
              .from("teachers")
              .select("id, name, bio, discipline, price_per_lesson, image_url, teaching_mode, is_public, deactivated_at, deleted_at, city, region, availability")
              .eq("user_id", user.id)
              .maybeSingle();
            trow = refetch.data;
          }
        }
      }
      if (cancelled) return;
      setPhotoUrl((prof as { photo_url?: string | null } | null)?.photo_url ?? null);
      setTeacher((trow as PreviewTeacher | null) ?? null);
      if (trow?.id) {
        const { data: drows } = await supabase
          .from("teacher_disciplines")
          .select("discipline_id, specialite")
          .eq("teacher_id", trow.id)
          .order("sort_order", { ascending: true });
        if (!cancelled) setDisciplines((drows as DisciplineRow[]) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setupComplete = useMemo(() => {
    if (!teacher) return false;
    const items = buildTeacherSetupChecklist({
      name: teacher.name || authProfile?.name,
      bio: teacher.bio,
      disciplineCount: disciplines.length,
      pricePerLesson: teacher.price_per_lesson ?? 0,
      availabilityCount: Array.isArray(teacher.availability) ? teacher.availability.length : 0,
      city: teacher.city,
      region: teacher.region,
    });
    return teacherSetupProgressPercent(items) === 100;
  }, [teacher, disciplines.length, authProfile?.name]);

  useEffect(() => {
    if (loading || setupComplete) return;
    router.replace(TEACHER_SETUP_PATH);
  }, [loading, setupComplete, router]);

  const disciplineSummary = useMemo(() => {
    if (disciplines.length === 0) return teacher?.discipline?.trim() || "—";
    return disciplines
      .map((d) => {
        const meta = getDisciplineById(d.discipline_id);
        const label = meta?.label ?? d.discipline_id;
        const spec = d.specialite?.trim();
        return spec ? `${label}: ${spec}` : label;
      })
      .join(" · ");
  }, [disciplines, teacher?.discipline]);

  const isPublic = teacher?.is_public === true;

  if (loading || !setupComplete) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-[#6B6A65]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    );
  }

  const avatar = teacher?.image_url || photoUrl;
  const publicHref = teacher?.id ? `/teacher/profile/${teacher.id}` : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-12" data-testid="teacher-public-profile-preview">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-teal-700/80">
          {t("teacherPublicProfileLabel")}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#2C2C2A]">{t("teacherPublicProfileLabel")}</h1>
        <p className="mt-2 text-sm text-[#6B6A65]">{t("teacherPublicProfilePreviewLead")}</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-[#E8E6DF] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              className="h-16 w-16 rounded-2xl object-cover border border-[#E8E6DF]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-teal-500/15 border border-teal-500/25" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-[#2C2C2A] truncate">{teacher?.name?.trim() || "—"}</p>
            <p className="text-sm text-[#6B6A65] mt-0.5">{disciplineSummary}</p>
            {(teacher?.price_per_lesson ?? 0) > 0 ? (
              <p className="text-sm font-semibold text-teal-700 mt-2">
                ${teacher?.price_per_lesson} / {t("regularLesson").toLowerCase()}
              </p>
            ) : null}
          </div>
        </div>

        {teacher?.bio?.trim() ? (
          <p className="text-sm leading-relaxed text-[#2C2C2A] whitespace-pre-wrap">{teacher.bio.trim()}</p>
        ) : (
          <p className="text-sm text-[#6B6A65] italic">—</p>
        )}

        {!isPublic ? (
          <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            {t("previewProfileHiddenWarning")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href={TEACHER_SETUP_PATH}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-teal-600 px-5 text-sm font-bold text-white hover:bg-teal-700 sm:w-auto"
          data-testid="teacher-public-profile-edit-cta"
        >
          <Pencil size={16} />
          {t("teacherPublicProfileEditCta")}
        </Link>
        {publicHref && isPublic ? (
          <a
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-teal-500/30 bg-white px-5 text-sm font-semibold text-teal-700 hover:bg-teal-50 sm:w-auto"
            data-testid="teacher-public-profile-view-cta"
          >
            <ExternalLink size={16} />
            {t("teacherPublicProfileViewCta")}
          </a>
        ) : null}
      </div>
    </div>
  );
}
