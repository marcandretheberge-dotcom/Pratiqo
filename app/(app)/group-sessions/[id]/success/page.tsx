"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

export default function GroupSessionSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const sid = searchParams.get("session_id");

  return (
    <div className="max-w-lg mx-auto text-center py-16 space-y-6">
      <h1 className="text-2xl font-bold text-[var(--p-text)]">Paiement réussi</h1>
      <p className="text-sm text-[var(--p-text-muted)]">
        Ta place pour le cours de groupe est confirmée. Tu recevras une notification dans l&apos;app.
        {sid ? (
          <>
            <br />
            <span className="text-[11px] text-[var(--p-text-subtle)]">Réf. Stripe : {sid}</span>
          </>
        ) : null}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href={`/group-sessions/${id}`}
          className="inline-flex justify-center items-center h-11 px-6 rounded-full border border-[var(--p-border-light)] font-semibold text-[var(--p-text)]"
        >
          Fiche séance
        </Link>
        <Link href="/student/group-sessions" className="inline-flex justify-center items-center h-11 px-6 rounded-full font-semibold text-white bg-[#1D9E75]">
          Mes cours de groupe
        </Link>
      </div>
    </div>
  );
}
