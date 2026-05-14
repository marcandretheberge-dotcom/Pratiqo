"use client";

import { cn } from "@/lib/utils";

/** Matches `LandingTeacherListingCard` outer chrome for stable grid layout while teachers load. */
export function LandingTeacherCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "min-h-[280px] sm:min-h-[300px] animate-pulse rounded-3xl border border-[#E8E6DF] bg-white p-4 shadow-[0_10px_40px_rgba(44,44,42,0.06)] sm:p-[1.125rem]",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-start gap-3.5 sm:gap-4">
        <div className="h-24 w-24 shrink-0 rounded-2xl bg-[#ECEAE4] sm:h-28 sm:w-28" />
        <div className="min-w-0 flex-1 space-y-2.5 pt-0.5">
          <div className="h-5 w-[72%] max-w-[14rem] rounded-md bg-[#E4E2DC]" />
          <div className="h-3.5 w-[45%] rounded-md bg-[#EFECE6]" />
          <div className="h-3 w-full max-w-md rounded-md bg-[#F4F2EC]" />
          <div className="h-3 w-[55%] rounded-md bg-[#F4F2EC]" />
          <div className="mt-4 flex justify-between border-t border-[#EFECE6] pt-3">
            <div className="h-4 w-24 rounded-md bg-[#EFECE6]" />
            <div className="h-5 w-16 rounded-md bg-[#E8F8F2]" />
          </div>
          <div className="h-3 w-full rounded-md bg-[#F4F2EC]" />
        </div>
      </div>
    </div>
  );
}
