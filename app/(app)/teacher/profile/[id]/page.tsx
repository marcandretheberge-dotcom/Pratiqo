"use client";

import React, { useEffect, useState } from "react";
import type { Teacher } from "../../../../../types";
import { getSupabaseClient } from "../../../../../lib/supabase";
import { teacherRowToTeacher, type TeacherRow } from "../../../../../lib/teacherMapper";
import { TeacherProfile } from "../../../../../components/TeacherProfile";
import { BookingModal, type BookingInitialLessonKind } from "../../../../../components/BookingModal";
import { useRouter } from "next/navigation";
import { haversineDistance } from "../../../../../lib/geo";

export default function TeacherProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookingInitialKind, setBookingInitialKind] = useState<BookingInitialLessonKind>("standard");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoDeniedOrUnavailable, setGeoDeniedOrUnavailable] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const load = async () => {
      const { data, error } = await supabase.from("teachers").select("*").eq("id", params.id).maybeSingle();
      if (error || !data) {
        setTeacher(null);
        return;
      }
      setTeacher(teacherRowToTeacher(data as TeacherRow));
    };

    void load();

    const channel = supabase
      .channel(`teacher-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teachers",
          filter: `id=eq.${params.id}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [params.id]);

  useEffect(() => {
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

  return (
    <>
      <TeacherProfile
        teacher={teacher}
        onClose={() => router.push("/teacher/profile")}
        onBook={(kind) => {
          setBookingInitialKind(kind);
          setBooking(true);
        }}
        onSendMessage={
          teacher.userId
            ? () => router.push(`/messages?peer=${encodeURIComponent(teacher.userId!)}`)
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
