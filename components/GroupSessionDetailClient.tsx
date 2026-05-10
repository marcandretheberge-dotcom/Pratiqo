"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, UsersRound } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { isSessionBookable, spotsRemaining, type GroupSessionRow } from "@/lib/groupSessions";
import { useAuth } from "@/components/AuthProvider";
import { GroupSessionMap } from "@/components/GroupSessionMap";
import { hasConfirmedGroupRegistration } from "@/lib/maps";

type Row = GroupSessionRow & { teachers?: { name: string; image_url: string; bio: string } | null };

export default function GroupSessionDetailClient({ sessionId: id }: { sessionId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [session, setSession] = useState<Row | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [related, setRelated] = useState<GroupSessionRow[]>([]);
  const [paying, setPaying] = useState(false);
  const [groupRegistered, setGroupRegistered] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setGroupRegistered(false);
      return;
    }
    let cancelled = false;
    void hasConfirmedGroupRegistration(user.id, id).then((ok) => {
      if (!cancelled) setGroupRegistered(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, id]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const load = async () => {
      setLoadingSession(true);
      const { data, error } = await supabase
        .from("group_sessions")
        .select("*, teachers(name, image_url, bio)")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        setSession(null);
        setRelated([]);
        setLoadingSession(false);
        return;
      }
      setSession(data as Row);
      const { data: more } = await supabase
        .from("group_sessions")
        .select("*")
        .eq("teacher_id", (data as Row).teacher_id)
        .eq("is_recurring", true)
        .neq("id", id)
        .in("status", ["open", "full"])
        .limit(5);
      setRelated((more as GroupSessionRow[]) ?? []);
      setLoadingSession(false);
    };
    void load();
  }, [id]);

  const startCheckout = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/group-sessions/${id}`)}`);
      return;
    }
    setPaying(true);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      if (!token) throw new Error("Session expirée.");
      const res = await fetch("/api/group-sessions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ group_session_id: id }),
      });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) throw new Error(json.error || "Paiement impossible.");
      if (json.url) window.location.assign(json.url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPaying(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-teal-700" size={36} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-[var(--p-text-muted)]">Séance introuvable.</p>
        <Link href="/group-sessions" className="text-teal-700 font-semibold mt-4 inline-block">
          Retour aux cours de groupe
        </Link>
      </div>
    );
  }

  const rem = spotsRemaining(session);
  const max = Number(session.max_participants);
  const cur = Number(session.current_participants);
  const bookable = isSessionBookable(session);
  const ratio = max ? rem / max : 0;
  const barColor = ratio > 0.5 ? "bg-teal-600" : ratio < 0.25 ? "bg-amber-500" : "bg-amber-400";
  const showOnlineLink = session.teaching_mode === "online" && groupRegistered && Boolean(session.online_link?.trim());

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Link href="/group-sessions" className="text-sm font-semibold text-teal-700 hover:underline">
        ← Tous les cours de groupe
      </Link>

      <header className="rounded-3xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-6 sm:p-8">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
            <UsersRound size={12} /> Groupe
          </span>
          <span className="badge-teal">{session.discipline}</span>
          {session.is_recurring ? (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-violet-50 text-violet-800 border border-violet-100">
              {session.recurrence === "weekly"
                ? "Hebdo"
                : session.recurrence === "biweekly"
                  ? "Bi-mensuel"
                  : session.recurrence === "monthly"
                    ? "Mensuel"
                    : "Récurrent"}
            </span>
          ) : null}
        </div>
        <h1 className="text-3xl font-bold text-[var(--p-text)]">{session.title}</h1>
        <p className="text-sm text-[var(--p-text-muted)] mt-2">
          {session.date} · {session.time} · {session.duration_minutes} min ·{" "}
          {session.teaching_mode === "online" ? "En ligne" : "En personne"}
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-3">Professeur</h2>
        <div className="flex gap-4 items-start">
          <img
            src={session.teachers?.image_url || "https://picsum.photos/seed/gp/120/120"}
            alt=""
            className="w-20 h-20 rounded-2xl object-cover border border-[var(--p-border-light)]"
          />
          <div>
            <p className="text-lg font-bold text-[var(--p-text)]">{session.teachers?.name ?? "Professeur"}</p>
            <p className="text-sm text-[var(--p-text-muted)] mt-2 line-clamp-4">{session.teachers?.bio ?? ""}</p>
            <button
              type="button"
              onClick={() => router.push(`/teacher/profile/${session.teacher_id}`)}
              className="mt-3 text-sm font-semibold text-teal-700 hover:underline"
            >
              Voir le profil
            </button>
          </div>
        </div>
      </section>

      {session.description ? (
        <section className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-3">Description</h2>
          <p className="text-[var(--p-text)] whitespace-pre-wrap">{session.description}</p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--color-background-secondary)] p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-3">Lieu</h2>
        {session.teaching_mode === "online" ? (
          <p className="text-sm text-[var(--p-text)] break-words">
            {showOnlineLink ? (
              session.online_link
            ) : (
              <span className="text-[var(--p-text-muted)]">Lien communiqué après inscription confirmée.</span>
            )}
          </p>
        ) : groupRegistered ? (
          <p className="text-sm text-[var(--p-text)] flex items-start gap-2">
            <MapPin className="text-teal-700 shrink-0 mt-0.5" size={18} />
            {session.location || "Adresse communiquée après inscription."}
          </p>
        ) : (
          <p className="text-sm text-[var(--p-text-muted)]">
            Le lieu exact est communiqué après inscription confirmée. La carte ci-dessous indique une zone approximative.
          </p>
        )}
      </section>

      <GroupSessionMap
        className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-6"
        sessionId={id}
        teachingMode={session.teaching_mode}
        location={session.location}
        isRegistered={groupRegistered}
      />

      <section className="rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-3">Places</h2>
        <div className="flex justify-between text-sm font-semibold text-[var(--p-text-muted)] mb-2">
          <span>
            {cur} / {max} inscrits
          </span>
          <span>{rem} restantes</span>
        </div>
        <div className="h-3 rounded-full bg-[var(--color-background-secondary)] overflow-hidden border border-[var(--p-border-light)]">
          <div className={cn("h-full rounded-full", barColor)} style={{ width: `${max ? (cur / max) * 100 : 0}%` }} />
        </div>
      </section>

      {related.length > 0 ? (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--p-text-subtle)] mb-3">
            Autres séances récurrentes
          </h2>
          <ul className="space-y-2">
            {related.map((r) => (
              <li key={r.id}>
                <Link href={`/group-sessions/${r.id}`} className="text-sm font-medium text-teal-700 hover:underline">
                  {r.title} — {r.date} {r.time}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="sticky bottom-4 rounded-2xl border border-[var(--p-border-light)] bg-[var(--p-surface)] p-4 shadow-lg flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p className="text-lg font-bold text-teal-700">
          Réserver ma place — {Number(session.price_per_person).toFixed(0)} $ / pers.
        </p>
        {bookable ? (
          <button
            type="button"
            disabled={paying}
            onClick={() => void startCheckout()}
            className="h-11 px-6 rounded-full font-bold text-white bg-teal-600 hover:brightness-[0.98] disabled:opacity-50"
          >
            {paying ? "Redirection…" : "Payer avec Stripe"}
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="h-11 px-6 rounded-full font-bold border border-amber-400 text-amber-900 bg-amber-50 cursor-not-allowed"
          >
            Complet — liste d&apos;attente bientôt
          </button>
        )}
      </div>
    </div>
  );
}
