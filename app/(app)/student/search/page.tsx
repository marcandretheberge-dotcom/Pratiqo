"use client";

import React, { useEffect, useState } from "react";
import type { Teacher } from "../../../../types";
import { Explore } from "../../../../components/Explore";
import { BookingModal } from "../../../../components/BookingModal";
import { TeacherProfile } from "../../../../components/TeacherProfile";
import { useSearchParams } from "next/navigation";

export default function StudentSearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingTeacher, setBookingTeacher] = useState<Teacher | null>(null);
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
        onBook={setBookingTeacher}
        onViewProfile={setSelectedTeacherProfile}
      />

      {selectedTeacherProfile && (
        <TeacherProfile
          teacher={selectedTeacherProfile}
          onClose={() => setSelectedTeacherProfile(null)}
          onBook={() => {
            setBookingTeacher(selectedTeacherProfile);
            setSelectedTeacherProfile(null);
          }}
        />
      )}

      {bookingTeacher && (
        <BookingModal teacher={bookingTeacher} onClose={() => setBookingTeacher(null)} />
      )}
    </>
  );
}

