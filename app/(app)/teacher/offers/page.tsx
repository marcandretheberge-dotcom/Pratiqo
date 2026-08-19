"use client";

import React from "react";
import { TeacherOffersDashboard } from "@/components/teacher/TeacherOffersDashboard";

export default function TeacherOffersPage() {
  return (
    <main className="min-h-[70dvh] bg-[#F3FAF6] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <TeacherOffersDashboard />
      </div>
    </main>
  );
}
