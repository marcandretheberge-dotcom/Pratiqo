"use client";

import React from "react";
import { motion } from "motion/react";

export function StudentDashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6 bg-[#F3FAF6] px-4 pb-16 sm:px-6 lg:rounded-3xl lg:p-8 animate-pulse">
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-[#DCEAE3] rounded-full"></div>
          <div className="h-10 w-48 bg-white rounded-xl border border-[#DCEAE3]"></div>
          <div className="h-4 w-64 bg-[#E8E6DE] rounded-full"></div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="h-32 bg-white rounded-3xl border border-[#DCEAE3] shadow-[0_14px_44px_rgba(44,44,42,0.05)]"></div>
            <div className="h-32 bg-white rounded-3xl border border-[#DCEAE3] shadow-[0_14px_44px_rgba(44,44,42,0.05)]"></div>
          </div>
          <div className="h-64 bg-white rounded-3xl border border-[#DCEAE3] shadow-[0_14px_44px_rgba(44,44,42,0.05)]"></div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="h-80 bg-white rounded-3xl border border-[#DCEAE3] p-6 flex flex-col gap-4 shadow-[0_14px_44px_rgba(44,44,42,0.05)]">
            <div className="h-4 w-24 bg-[#DCEAE3] rounded-full"></div>
            <div className="h-20 bg-[#F7FBF8] rounded-2xl"></div>
            <div className="h-20 bg-[#F7FBF8] rounded-2xl"></div>
            <div className="h-20 bg-[#F7FBF8] rounded-2xl"></div>
          </div>
          <div className="h-40 bg-[#073F32] rounded-3xl border border-[#BFE3D6]"></div>
        </div>
      </div>
    </div>
  );
}

export function TeacherDashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 bg-[#F3FAF6] pb-16 px-4 sm:px-6 lg:rounded-3xl lg:p-8 animate-pulse">
      <header className="space-y-3">
        <div className="h-3 w-32 bg-[#DCEAE3] rounded-full"></div>
        <div className="h-8 w-64 bg-white rounded-xl border border-[#DCEAE3]"></div>
        <div className="h-4 w-48 bg-[#E8E6DE] rounded-full"></div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-24 bg-white rounded-2xl border border-[#DCEAE3] shadow-[0_14px_44px_rgba(44,44,42,0.05)]"></div>
        <div className="h-24 bg-white rounded-2xl border border-[#DCEAE3] shadow-[0_14px_44px_rgba(44,44,42,0.05)]"></div>
        <div className="h-24 bg-white rounded-2xl border border-[#DCEAE3] shadow-[0_14px_44px_rgba(44,44,42,0.05)]"></div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Pending requests */}
          <div className="h-32 bg-white rounded-2xl border border-[#DCEAE3] shadow-[0_14px_44px_rgba(44,44,42,0.05)]"></div>
          {/* Schedule */}
          <div className="h-64 bg-white rounded-2xl border border-[#DCEAE3] shadow-[0_14px_44px_rgba(44,44,42,0.05)]"></div>
          {/* Assignment Hub */}
          <div className="h-64 bg-white rounded-2xl border border-[#DCEAE3] shadow-[0_14px_44px_rgba(44,44,42,0.05)]"></div>
        </div>

        <div className="space-y-6 lg:col-span-1">
          {/* Completeness card */}
          <div className="h-48 bg-white rounded-2xl border border-[#DCEAE3] shadow-[0_14px_44px_rgba(44,44,42,0.05)]"></div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton({ role }: { role?: "teacher" | "student" }) {
  if (role === "teacher") return <TeacherDashboardSkeleton />;
  if (role === "student") return <StudentDashboardSkeleton />;
  
  // Generic loading fallback before role is known (or if user has no role yet)
  return (
    <div className="h-[calc(100vh-200px)] flex flex-col items-center justify-center p-12 text-center animate-pulse bg-[#F3FAF6]">
      <div className="h-12 w-12 bg-white rounded-full mb-4 border border-[#DCEAE3]"></div>
      <div className="h-6 w-48 bg-white rounded-xl border border-[#DCEAE3]"></div>
    </div>
  );
}
