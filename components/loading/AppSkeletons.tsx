"use client";

import { cn } from "@/lib/utils";

const pulse = "animate-pulse rounded-lg bg-slate-100";

export function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn(pulse, className)} aria-hidden />;
}

export function AppCardSkeleton({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div
      className={cn("rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5", className)}
      aria-hidden
    >
      <SkeletonBar className="h-3 w-24" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBar key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

export function AppListSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <SkeletonBar className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBar className="h-3.5 w-40" />
              <SkeletonBar className="h-3 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AppStatGridSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)} aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--p-border-light)] bg-white px-3 py-4 text-center shadow-sm">
          <SkeletonBar className="mx-auto h-6 w-10" />
          <SkeletonBar className="mx-auto mt-2 h-2.5 w-14" />
        </div>
      ))}
    </div>
  );
}

export function AppStudentDashboardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1280px] space-y-6 bg-[#F3FAF6] px-0 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:space-y-8 sm:px-6 lg:rounded-3xl lg:p-8",
        className,
      )}
      role="status"
      aria-busy="true"
    >
      <SkeletonBar className="h-8 w-48" />
      <div className="rounded-[1.75rem] p-5 sm:rounded-3xl" style={{ background: "var(--palette-teal-700)" }}>
        <SkeletonBar className="h-2.5 w-24 bg-white/20" />
        <SkeletonBar className="mt-4 h-14 w-full rounded-2xl bg-white/10" />
      </div>
      <div className="space-y-3">
        <SkeletonBar className="h-3 w-36" />
        <AppListSkeleton count={2} />
      </div>
      <div className="space-y-3">
        <SkeletonBar className="h-3 w-32" />
        <AppListSkeleton count={2} />
      </div>
    </div>
  );
}

export function AppTeacherDashboardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1280px] space-y-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:space-y-8 sm:px-6 lg:rounded-3xl lg:p-8",
        className,
      )}
      role="status"
      aria-busy="true"
      data-testid="teacher-dashboard-skeleton"
    >
      <div className="space-y-2">
        <SkeletonBar className="h-3 w-32" />
        <SkeletonBar className="h-8 w-56" />
        <SkeletonBar className="h-3 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <SkeletonBar className="h-3 w-20" />
            <SkeletonBar className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AppCardSkeleton lines={4} />
          <AppCardSkeleton lines={3} />
        </div>
        <AppCardSkeleton lines={5} />
      </div>
    </div>
  );
}

export function AppMessagesSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[calc(100dvh-13.5rem)] overflow-hidden rounded-2xl border border-[var(--p-border-light)] bg-white shadow-sm sm:min-h-[520px]",
        className,
      )}
      role="status"
      aria-busy="true"
      data-testid="messages-loading-skeleton"
    >
      <aside className="hidden w-[320px] shrink-0 border-r border-[var(--p-border-light)] bg-[#fafaf8] lg:flex lg:flex-col">
        <div className="border-b border-[var(--p-border-light)] p-3">
          <SkeletonBar className="h-3 w-28" />
        </div>
        <div className="flex-1 space-y-0 p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-[var(--p-border-light)]/60 px-4 py-3">
              <SkeletonBar className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBar className="h-3.5 w-32" />
                <SkeletonBar className="h-3 w-full max-w-[180px]" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-[var(--p-border-light)] px-4 py-3">
          <div className="flex items-center gap-2">
            <SkeletonBar className="h-9 w-9 rounded-full" />
            <SkeletonBar className="h-4 w-36" />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-3 px-4 py-4">
          <SkeletonBar className="ml-auto h-10 w-[62%] rounded-2xl" />
          <SkeletonBar className="mr-auto h-10 w-[55%] rounded-2xl" />
          <SkeletonBar className="ml-auto h-10 w-[48%] rounded-2xl" />
        </div>
      </section>
    </div>
  );
}

export function AppProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:space-y-6", className)} role="status" aria-busy="true">
      <div className="space-y-2 text-center">
        <SkeletonBar className="mx-auto h-20 w-20 rounded-full" />
        <SkeletonBar className="mx-auto h-4 w-40" />
        <SkeletonBar className="mx-auto h-3 w-28" />
      </div>
      <AppStatGridSkeleton />
      <SkeletonBar className="h-36 w-full rounded-3xl" />
      <AppCardSkeleton lines={4} />
    </div>
  );
}

export function AppScheduleSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto max-w-5xl space-y-5 pb-[calc(6rem+env(safe-area-inset-bottom))]", className)} role="status" aria-busy="true">
      <div className="space-y-2">
        <SkeletonBar className="h-3 w-24" />
        <SkeletonBar className="h-8 w-52" />
        <SkeletonBar className="h-3 w-64 max-w-full" />
      </div>
      <AppListSkeleton count={3} />
    </div>
  );
}

export function AppSectionListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y divide-[#EEF4F1]", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-6">
          <SkeletonBar className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBar className="h-3.5 w-44" />
            <SkeletonBar className="h-3 w-28" />
          </div>
          <SkeletonBar className="hidden h-6 w-16 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function AppTeacherSearchCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-[140px] animate-pulse rounded-2xl border border-[#E8E6DF] bg-white p-4 shadow-[0_12px_40px_rgba(44,44,42,0.06)]",
        className,
      )}
      aria-hidden
    >
      <div className="flex gap-3">
        <SkeletonBar className="h-14 w-14 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <SkeletonBar className="h-4 w-3/4" />
          <SkeletonBar className="h-3 w-1/2" />
          <SkeletonBar className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function AppShellLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1280px] space-y-4 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-6",
        className,
      )}
      role="status"
      aria-busy="true"
      data-testid="app-shell-loading-skeleton"
    >
      <SkeletonBar className="h-7 w-40" />
      <AppCardSkeleton lines={3} />
      <AppListSkeleton count={2} />
    </div>
  );
}
