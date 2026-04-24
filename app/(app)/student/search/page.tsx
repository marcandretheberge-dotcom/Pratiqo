"use client";

import React, { useEffect, useState } from "react";
import type { Teacher } from "../../../../types";
import { Explore } from "../../../../components/Explore";
import { BookingModal, type BookingInitialLessonKind } from "../../../../components/BookingModal";
import { TeacherProfile } from "../../../../components/TeacherProfile";
import { useRouter, useSearchParams } from "next/navigation";

export default function StudentSearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingTeacher, setBookingTeacher] = useState<Teacher | null>(null);
  const [bookingInitialKind, setBookingInitialKind] = useState<BookingInitialLessonKind>("standard");
  const [selectedTeacherProfile, setSelectedTeacherProfile] = useState<Teacher | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchQuery(q);
  }, [searchParams]);

  return (
    <>
      <Explore
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onBook={(t) => {
          setBookingInitialKind("standard");
          setBookingTeacher(t);
        }}
        onViewProfile={setSelectedTeacherProfile}
      />

      {selectedTeacherProfile && (
        <TeacherProfile
          teacher={selectedTeacherProfile}
          onClose={() => setSelectedTeacherProfile(null)}
          onBook={(kind) => {
            setBookingInitialKind(kind);
            setBookingTeacher(selectedTeacherProfile);
            setSelectedTeacherProfile(null);
          }}
          onSendMessage={
            selectedTeacherProfile.userId
              ? () => {
                  const uid = selectedTeacherProfile.userId!;
                  setSelectedTeacherProfile(null);
                  router.push(`/messages?peer=${encodeURIComponent(uid)}`);
                }
              : undefined
          }
        />
      )}

      {bookingTeacher && (
        <BookingModal
          key={`${bookingTeacher.id}-${bookingInitialKind}`}
          teacher={bookingTeacher}
          initialLessonKind={bookingInitialKind}
          onClose={() => {
            setBookingTeacher(null);
            setBookingInitialKind("standard");
          }}
        />
      )}
    </>
  );
}

