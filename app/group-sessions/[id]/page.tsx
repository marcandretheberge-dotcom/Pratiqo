import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import GroupSessionDetailClient from "@/components/GroupSessionDetailClient";

import { SITE_URL } from "@/lib/seo/site";
import { isGroupSessionsMarketplaceIndexable } from "@/lib/groupSessionsLaunch";

const BASE_URL = SITE_URL;

type GroupSessionMetaRow = {
  id: string;
  title: string;
  description: string | null;
  discipline: string;
  date: string;
  time: string;
  duration_minutes: number;
  teaching_mode: string;
  status: string;
  teachers: { name: string; image_url: string | null } | null;
};

const getGroupSessionMeta = cache(async (id: string): Promise<GroupSessionMetaRow | null> => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("group_sessions")
      .select("id, title, description, discipline, date, time, duration_minutes, teaching_mode, status, teachers(name, image_url)")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return data as unknown as GroupSessionMetaRow;
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const row = await getGroupSessionMeta(id);
  const canonical = `${BASE_URL}/group-sessions/${encodeURIComponent(id)}`;
  const checkoutLive = isGroupSessionsMarketplaceIndexable();

  if (!row) {
    return {
      title: "Séance",
      robots: { index: false, follow: false },
      alternates: { canonical },
    };
  }

  if (!checkoutLive) {
    return {
      title: row.title,
      description: "Réservation en ligne bientôt disponible — cette séance n'est pas indexée pour le lancement.",
      alternates: { canonical },
      robots: { index: false, follow: false },
    };
  }

  const indexable = row.status === "open" || row.status === "full";
  const modeLabel = row.teaching_mode === "online" ? "En ligne" : "En personne";
  const factualDesc =
    (row.description && row.description.trim()) ||
    `${row.discipline} · ${row.date} ${row.time} · ${modeLabel}${row.teachers?.name ? ` · ${row.teachers.name}` : ""}`;

  const description = factualDesc.slice(0, 160);
  const ogTitle = `${row.title} | Pratiqo`;

  return {
    title: row.title,
    description,
    alternates: { canonical },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      type: "website",
      images: row.teachers?.image_url ? [{ url: row.teachers.image_url, width: 400, height: 400 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: row.teachers?.image_url ? [row.teachers.image_url] : [],
    },
  };
}

export default async function GroupSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getGroupSessionMeta(id);
  if (!row) notFound();
  return <GroupSessionDetailClient sessionId={id} />;
}
