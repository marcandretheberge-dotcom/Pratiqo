"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Teacher } from "@/types";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchTeacherDisciplinesMap, mergeTeachersWithDisciplines } from "@/lib/teacherDisciplines";
import { teacherRowToTeacher, type TeacherRow } from "@/lib/teacherMapper";
import { TEACHERS_PUBLIC_TABLE } from "@/lib/supabase/queries";
import { TeacherProfile } from "@/components/TeacherProfile";
import { BookingModal, type BookingInitialLessonKind } from "@/components/BookingModal";
import { useRouter } from "next/navigation";
import { haversineDistance } from "@/lib/geo";
import { hasConfirmedBooking } from "@/lib/maps";
import { useAuth } from "@/components/AuthProvider";

export default function TeacherProfileClient({
  id,
  initialTeacher = null,
}: {
  id: string;
  initialTeacher?: Teacher | null;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const hadInitialTeacher = useRef(Boolean(initialTeacher));
  const [teacher, setTeacher] = useState<Teacher | null>(initialTeacher);
  const [embeddedPlan, setEmbeddedPlan] = useState<{ plan: string | null; loading: boolean }>({
    plan: null,
    loading: true,
  });
  const [booking, setBooking] = useState(false);
  const [bookingInitialKind, setBookingInitialKind] = useState<BookingInitialLessonKind>("standard");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoDeniedOrUnavailable, setGeoDeniedOrUnavailable] = useState(false);
  const [studioMapHasConfirmedBooking, setStudioMapHasConfirmedBooking] = useState(false);

  useEffect(() => {
    if (!teacher?.id || !user?.id) {
      setStudioMapHasConfirmedBooking(false);
      return;
    }
    let cancelled = false;
    void hasConfirmedBooking(user.id, teacher.id).then((ok) => {
      if (!cancelled) setStudioMapHasConfirmedBooking(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [teacher?.id, user?.id]);

  useEffect(() => {
    if (!teacher?.id) return;
    let cancelled = false;
    setEmbeddedPlan({ plan: null, loading: true });
    void fetch(`/api/teachers/plan?teacherId=${encodeURIComponent(teacher.id)}`)
      .then((r) => r.json())
      .then((j: { plan?: string }) => {
        if (cancelled) return;
        setEmbeddedPlan({ plan: j.plan ?? "free", loading: false });
      })
      .catch(() => {
        if (!cancelled) setEmbeddedPlan({ plan: "free", loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [teacher?.id]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const load = async () => {
      const { data, error } = await supabase.from(TEACHERS_PUBLIC_TABLE).select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        if (!hadInitialTeacher.current) setTeacher(null);
        return;
      }
      const base = teacherRowToTeacher(data as TeacherRow);
      const discMap = await fetchTeacherDisciplinesMap(supabase, [id]);
      setTeacher(mergeTeachersWithDisciplines([base], discMap)[0] ?? base);
    };

    void load();

    const channel = supabase
      .channel(`teacher-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teachers",
          filter: `id=eq.${id}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id]);

  const requestGeo = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoDeniedOrUnavailable(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoDeniedOrUnavailable(false);
      },
      () => {
        setGeo(null);
        setGeoDeniedOrUnavailable(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  const distanceKm =
    !teacher || !geo || geoDeniedOrUnavailable
      ? null
      : haversineDistance(geo.lat, geo.lng, teacher.location.lat, teacher.location.lng);

  if (!teacher) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8">
        <p className="text-sm font-semibold text-slate-600">Professeur introuvable.</p>
      </div>
    );
  }

  const profilePath = `/teacher/profile/${encodeURIComponent(id)}`;

  return (
    <>
      {!geo ? (
        <div className="fixed bottom-6 left-1/2 z-[220] -translate-x-1/2 px-4">
          <button
            type="button"
            onClick={requestGeo}
            className="rounded-full border border-[#E8E6DF] bg-white px-4 py-2.5 text-sm font-semibold text-teal-700 shadow-lg hover:bg-[#FAFCFB]"
          >
            {geoDeniedOrUnavailable
              ? "Réessayer la localisation"
              : "Activer la localisation pour voir la distance"}
          </button>
        </div>
      ) : null}
      <TeacherProfile
        teacher={teacher}
        embeddedPlan={embeddedPlan}
        showGoogleStudioMap
        studioMapHasConfirmedBooking={studioMapHasConfirmedBooking}
        onClose={() => router.push("/teacher/profile")}
        onBook={(kind) => {
          setBookingInitialKind(kind);
          setBooking(true);
        }}
        onSendMessage={
          teacher.userId
            ? () => {
                if (!user?.id) {
                  router.push(`/login?next=${encodeURIComponent(profilePath)}`);
                  return;
                }
                router.push(`/messages?peer=${encodeURIComponent(teacher.userId!)}`);
              }
            : undefined
        }
        distanceKm={geoDeniedOrUnavailable ? null : distanceKm}
      />
      {booking && (
        <BookingModal
          key={`${teacher.id}-${bookingInitialKind}`}
          teacher={teacher}
          initialLessonKind={bookingInitialKind}
          onClose={() => {
            setBooking(false);
            setBookingInitialKind("standard");
          }}
        />
      )}
    </>
  );
}
