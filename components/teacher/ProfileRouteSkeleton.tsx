/** Neutral loading shell for /teacher/profile/[id] (route + client). */
export function ProfileRouteSkeleton() {
  const bar = "animate-pulse rounded-lg bg-slate-100";
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="status"
      aria-busy="true"
      aria-label="Chargement du profil"
    >
      <div className="w-full max-w-3xl rounded-t-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className={`mb-6 h-8 w-8 rounded-full ${bar}`} />
        <div className="flex items-start gap-4">
          <div className={`h-20 w-20 shrink-0 rounded-2xl ${bar}`} />
          <div className="min-w-0 flex-1 space-y-3 pt-1">
            <div className={`h-6 w-48 ${bar}`} />
            <div className={`h-4 w-32 ${bar}`} />
            <div className={`h-4 w-56 ${bar}`} />
          </div>
        </div>
        <div className="mt-8 space-y-3">
          <div className={`h-4 w-full ${bar}`} />
          <div className={`h-4 w-full ${bar}`} />
          <div className={`h-4 w-4/5 ${bar}`} />
        </div>
      </div>
    </div>
  );
}
