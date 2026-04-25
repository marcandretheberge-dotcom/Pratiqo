"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Save, X } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { logout } from "../../../../lib/auth";
import { getSupabaseClient } from "../../../../lib/supabase";
import { cn } from "../../../../lib/utils";
import { disciplineLabelToTeacherCategory, getDisciplineById, getEnabledDisciplines } from "../../../../lib/disciplines";
import type { TeacherRow } from "../../../../lib/teacherMapper";

type TeacherDisciplineDbRow = {
  id: string;
  discipline_id: string;
  specialite: string | null;
  sort_order: number;
};

type NotifPrefs = {
  newBooking: boolean;
  reminder1h: boolean;
  studentMessages: boolean;
  promotions: boolean;
};

const defaultNotif: NotifPrefs = {
  newBooking: true,
  reminder1h: true,
  studentMessages: true,
  promotions: false,
};

async function syncTeacherPrimaryFromDisciplines(
  supabase: ReturnType<typeof getSupabaseClient>,
  teacherId: string,
): Promise<void> {
  const { data: rows } = await supabase
    .from("teacher_disciplines")
    .select("discipline_id, specialite, sort_order")
    .eq("teacher_id", teacherId)
    .order("sort_order", { ascending: true });
  if (!rows?.length) return;
  const first = rows[0] as { discipline_id: string; specialite: string | null };
  const meta = getDisciplineById(first.discipline_id);
  const label = meta?.label ?? "Musique";
  const category = disciplineLabelToTeacherCategory(label);
  const discipline = String(first.specialite || "").trim() || "—";
  await supabase.from("teachers").update({ discipline, category }).eq("id", teacherId);
}

function readNotifPrefs(dash: Record<string, unknown> | null): NotifPrefs {
  if (!dash || typeof dash !== "object") return { ...defaultNotif };
  const raw = dash.teacherNotifications as Partial<NotifPrefs> | undefined;
  if (!raw || typeof raw !== "object") return { ...defaultNotif };
  return {
    newBooking: raw.newBooking !== false,
    reminder1h: raw.reminder1h !== false,
    studentMessages: raw.studentMessages !== false,
    promotions: raw.promotions === true,
  };
}

function encodeTeachingMode(p: boolean, o: boolean, h: boolean): string {
  const n = (p ? 1 : 0) + (o ? 1 : 0) + (h ? 1 : 0);
  if (n === 0) return "both";
  if (n === 3) return "all";
  if (p && o && !h) return "both";
  if (p && !o && !h) return "person";
  if (!p && o && !h) return "online";
  if (!p && !o && h) return "home";
  return "all";
}

export default function TeacherSettingsPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [hourly, setHourly] = useState("");
  const [city, setCity] = useState("");
  const [locationJson, setLocationJson] = useState<Record<string, unknown>>({});
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [teachingMode, setTeachingMode] = useState("both");
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [plan, setPlan] = useState("free");
  const [notif, setNotif] = useState<NotifPrefs>(defaultNotif);
  const [dashboardJson, setDashboardJson] = useState<Record<string, unknown>>({});

  const [discRows, setDiscRows] = useState<TeacherDisciplineDbRow[]>([]);
  const [discLoading, setDiscLoading] = useState(true);
  const [showAddDisc, setShowAddDisc] = useState(false);
  const [addDiscId, setAddDiscId] = useState("");
  const [addSpec, setAddSpec] = useState("");
  const [discSaving, setDiscSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setDiscLoading(false);
      setLoading(false);
      return;
    }
    const supabase = getSupabaseClient();
    const load = async () => {
      const { data: prof } = await supabase.from("profiles").select("email, name, photo_url, plan, dashboard").eq("id", user.id).maybeSingle();
      setEmail(String((prof as { email?: string })?.email || user.email || ""));
      setDisplayName(String((prof as { name?: string })?.name || ""));
      setPhotoUrl(((prof as { photo_url?: string | null })?.photo_url as string | null) ?? null);
      setPlan(String((prof as { plan?: string | null })?.plan || "free"));
      const dash = (prof as { dashboard?: unknown })?.dashboard;
      const d = typeof dash === "object" && dash !== null ? (dash as Record<string, unknown>) : {};
      setDashboardJson(d);
      setNotif(readNotifPrefs(d));

      const { data, error } = await supabase.from("teachers").select("*").eq("user_id", user.id).maybeSingle();
      if (error || !data) {
        setTeacherId(null);
        setDiscLoading(false);
        setLoading(false);
        return;
      }
      const row = data as TeacherRow & { stripe_account_id?: string | null };
      setTeacherId(row.id);
      setBio(row.bio || "");
      setHourly(String(row.price_per_lesson ?? ""));
      setTeachingMode(row.teaching_mode || "both");
      setStripeAccountId(row.stripe_account_id?.trim() || null);
      const loc = (row.location || {}) as Record<string, unknown>;
      setLocationJson(loc);
      setCity(typeof loc.neighborhood === "string" ? loc.neighborhood : "");

      const enabledList = getEnabledDisciplines();
      setAddDiscId(enabledList[0]?.id ?? "musique");
      const { data: drows, error: dErr } = await supabase
        .from("teacher_disciplines")
        .select("id, discipline_id, specialite, sort_order")
        .eq("teacher_id", row.id)
        .order("sort_order", { ascending: true });
      if (!dErr && drows) setDiscRows(drows as TeacherDisciplineDbRow[]);
      else setDiscRows([]);
      setDiscLoading(false);
      setLoading(false);
    };
    void load();
  }, [user]);

  const reloadDisciplines = async (tid: string) => {
    const supabase = getSupabaseClient();
    const { data: drows } = await supabase
      .from("teacher_disciplines")
      .select("id, discipline_id, specialite, sort_order")
      .eq("teacher_id", tid)
      .order("sort_order", { ascending: true });
    setDiscRows((drows as TeacherDisciplineDbRow[]) ?? []);
  };

  const removeDiscipline = async (rowId: string) => {
    if (!teacherId || discRows.length <= 1) return;
    setDiscSaving(true);
    setMessage(null);
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("teacher_disciplines").delete().eq("id", rowId);
    if (error) {
      setMessage(error.message);
      setDiscSaving(false);
      return;
    }
    await syncTeacherPrimaryFromDisciplines(supabase, teacherId);
    await reloadDisciplines(teacherId);
    setDiscSaving(false);
    setMessage("Enregistré.");
  };

  const addDiscipline = async () => {
    if (!teacherId || discRows.length >= 3) return;
    const spec = addSpec.trim();
    if (!spec) {
      setMessage("Indique une spécialité.");
      return;
    }
    if (discRows.some((r) => r.discipline_id === addDiscId)) {
      setMessage("Cette discipline est déjà ajoutée.");
      return;
    }
    setDiscSaving(true);
    setMessage(null);
    const supabase = getSupabaseClient();
    const nextOrder = discRows.length ? Math.max(...discRows.map((r) => r.sort_order)) + 1 : 0;
    const { error } = await supabase.from("teacher_disciplines").insert({
      teacher_id: teacherId,
      discipline_id: addDiscId,
      specialite: spec,
      sort_order: nextOrder,
    });
    if (error) {
      setMessage(error.message);
      setDiscSaving(false);
      return;
    }
    await syncTeacherPrimaryFromDisciplines(supabase, teacherId);
    await reloadDisciplines(teacherId);
    setAddSpec("");
    setShowAddDisc(false);
    setDiscSaving(false);
    setMessage("Enregistré.");
  };

  const saveProfile = async () => {
    if (!user || !teacherId) return;
    setSaving(true);
    setMessage(null);
    const supabase = getSupabaseClient();
    const nextLocation: Record<string, unknown> = { ...locationJson };
    if (city.trim()) nextLocation.neighborhood = city.trim();
    else delete nextLocation.neighborhood;
    const { error: e1 } = await supabase
      .from("teachers")
      .update({
        name: displayName.trim() || undefined,
        bio: bio.trim(),
        price_per_lesson: Number(hourly) || 0,
        location: nextLocation,
      })
      .eq("id", teacherId);
    const { error: e2 } = await supabase
      .from("profiles")
      .update({ name: displayName.trim() || null, photo_url: photoUrl })
      .eq("id", user.id);
    setSaving(false);
    if (e1 || e2) {
      setMessage(e1?.message || e2?.message || "Erreur");
      return;
    }
    setLocationJson(nextLocation);
    setMessage("Enregistré.");
  };

  const saveTeachingModeOnly = async () => {
    if (!user || !teacherId) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("teachers").update({ teaching_mode: teachingMode }).eq("id", teacherId);
    setSaving(false);
    if (error) setMessage(error.message);
    else setMessage("Enregistré.");
  };

  const saveNotifications = async () => {
    if (!user) return;
    setSaving(true);
    const nextDash = { ...dashboardJson, teacherNotifications: notif };
    const { error } = await getSupabaseClient().from("profiles").update({ dashboard: nextDash }).eq("id", user.id);
    setSaving(false);
    if (error) setMessage(error.message);
    else {
      setDashboardJson(nextDash as Record<string, unknown>);
      setMessage("Enregistré.");
    }
  };

  const openStripeDashboard = async () => {
    const supabase = getSupabaseClient();
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) {
      setMessage("Session expirée.");
      return;
    }
    const res = await fetch("/api/stripe/connect", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !body.url) {
      setMessage(body.error || "Impossible d’ouvrir Stripe.");
      return;
    }
    window.location.href = body.url;
  };

  const chipsPerson = teachingMode === "person" || teachingMode === "both" || teachingMode === "all";
  const chipsOnline = teachingMode === "online" || teachingMode === "both" || teachingMode === "all";
  const chipsHome = teachingMode === "home" || teachingMode === "all";
  const toggleFormat = (key: "person" | "online" | "home") => {
    const p = key === "person" ? !chipsPerson : chipsPerson;
    const o = key === "online" ? !chipsOnline : chipsOnline;
    const h = key === "home" ? !chipsHome : chipsHome;
    setTeachingMode(encodeTeachingMode(p, o, h));
  };

  const initials = (displayName || email || "?").slice(0, 2).toUpperCase();

  if (!user) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-3xl p-8 text-center">
        <p className="text-sm text-slate-600">Connecte-toi pour accéder aux paramètres.</p>
        <Link href="/" className="mt-4 inline-block text-[#1D9E75] font-medium underline">
          Accueil
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#1D9E75]" size={32} />
      </div>
    );
  }

  if (!teacherId) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-amber-200 rounded-3xl p-8">
        <p className="text-sm font-semibold text-slate-800">Aucun profil professeur lié</p>
        <p className="mt-2 text-sm text-slate-600">
          Ce compte ({profile?.role ?? "élève"}) n&apos;est pas relié à une fiche professeur.
        </p>
      </div>
    );
  }

  const addableDisciplines = getEnabledDisciplines().filter((d) => !discRows.some((r) => r.discipline_id === d.id));

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-16">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#1D9E75]">Professeur</p>
        <h1 className="text-2xl font-bold text-[#2C2C2A]">Paramètres</h1>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#2C2C2A]">Mon profil</h2>
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer shrink-0">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = () => setPhotoUrl(typeof r.result === "string" ? r.result : photoUrl);
                r.readAsDataURL(f);
              }}
            />
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-[#1D9E75]/30" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-[#1D9E75] text-white flex items-center justify-center text-lg font-bold border-2 border-white shadow">
                {initials}
              </div>
            )}
            <span className="block text-center text-[10px] text-slate-500 mt-1">Modifier</span>
          </label>
          <p className="text-xs text-slate-500">Clic sur la photo pour changer (aperçu local — enregistre pour conserver si URL base64).</p>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">Nom affiché</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">Tarif horaire ($)</span>
          <input
            value={hourly}
            onChange={(e) => setHourly(e.target.value)}
            type="number"
            min={0}
            step="0.5"
            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm text-[#1D9E75] font-semibold"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">Ville</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="Quartier ou ville affichée"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveProfile()}
          className="h-11 px-6 rounded-full bg-[#1D9E75] text-white text-sm font-semibold disabled:opacity-50"
        >
          Enregistrer le profil
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#2C2C2A]">Mes disciplines</h2>
        {discLoading ? (
          <Loader2 className="animate-spin text-[#1D9E75]" size={24} />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {discRows.map((r) => {
                const meta = getDisciplineById(r.discipline_id);
                const label = `${meta?.emoji ?? "✨"} ${meta?.label ?? r.discipline_id}${r.specialite ? ` — ${r.specialite}` : ""}`;
                return (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(29,158,117,0.35)] bg-[rgba(29,158,117,0.08)] px-3 py-1.5 text-xs font-semibold text-[#0f6d52]"
                  >
                    {label}
                    <button
                      type="button"
                      disabled={discRows.length <= 1 || discSaving}
                      onClick={() => void removeDiscipline(r.id)}
                      className="rounded-full p-0.5 hover:bg-[rgba(29,158,117,0.2)] disabled:opacity-30"
                      aria-label="Retirer"
                    >
                      <X size={14} />
                    </button>
                  </span>
                );
              })}
            </div>
            {discRows.length < 3 ? (
              <div className="space-y-3">
                {!showAddDisc ? (
                  <button
                    type="button"
                    disabled={discSaving || addableDisciplines.length === 0}
                    onClick={() => setShowAddDisc(true)}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-[#1D9E75]/40 text-[#0f6e56] text-sm font-semibold hover:bg-[#e1f5ee]/50"
                  >
                    + Ajouter
                  </button>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <select
                      value={addDiscId}
                      onChange={(e) => setAddDiscId(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white"
                    >
                      {addableDisciplines.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.emoji} {d.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={addSpec}
                      onChange={(e) => setAddSpec(e.target.value)}
                      placeholder="Spécialité"
                      className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={discSaving}
                        onClick={() => void addDiscipline()}
                        className="h-10 px-4 rounded-full bg-[#1D9E75] text-white text-sm font-semibold"
                      >
                        Ajouter
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddDisc(false);
                          setAddSpec("");
                        }}
                        className="h-10 px-4 rounded-full border border-slate-200 text-sm text-slate-600"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            <p className="text-xs text-slate-500">Maximum 3 disciplines</p>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#2C2C2A]">Format des cours</h2>
        <div className="flex flex-wrap gap-2">
          {(["En personne", "En ligne", "À domicile"] as const).map((label, i) => {
            const keys = ["person", "online", "home"] as const;
            const on = keys[i] === "person" ? chipsPerson : keys[i] === "online" ? chipsOnline : chipsHome;
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleFormat(keys[i])}
                className={cn(
                  "h-10 px-4 rounded-full text-sm font-semibold border",
                  on ? "border-[#1D9E75] bg-[rgba(29,158,117,0.12)] text-[#0f6e56]" : "border-slate-200 bg-slate-100 text-slate-600",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveTeachingModeOnly()}
          className="h-10 px-5 rounded-full bg-[#1D9E75] text-white text-sm font-semibold disabled:opacity-50"
        >
          Enregistrer le format
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#2C2C2A]">Notifications</h2>
        {(
          [
            ["newBooking", "Nouvelle réservation"],
            ["reminder1h", "Rappel 1h avant le cours"],
            ["studentMessages", "Messages des élèves"],
            ["promotions", "Promotions Pratiqo"],
          ] as const
        ).map(([key, label]) => {
          const on = notif[key];
          return (
            <label key={key} className="flex items-center justify-between gap-4 cursor-pointer py-1">
              <span className="text-sm text-[#2C2C2A]">{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => setNotif((n) => ({ ...n, [key]: !n[key] }))}
                className={cn(
                  "relative h-7 w-12 rounded-full transition-colors shrink-0",
                  on ? "bg-[#1D9E75]" : "bg-slate-300",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                    on ? "left-5" : "left-0.5",
                  )}
                />
              </button>
            </label>
          );
        })}
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveNotifications()}
          className="h-10 px-5 rounded-full bg-[#1D9E75] text-white text-sm font-semibold disabled:opacity-50"
        >
          Enregistrer les notifications
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[#2C2C2A]">Paiements</h2>
        <p className="text-sm text-slate-600">
          Stripe :{" "}
          <span className="font-semibold text-[#2C2C2A]">{stripeAccountId ? "Connecté" : "Non connecté"}</span>
        </p>
        <button
          type="button"
          onClick={() => void openStripeDashboard()}
          className="h-10 px-5 rounded-full border-2 border-[#2C2C2A]/15 bg-white text-sm font-semibold text-[#2C2C2A]"
        >
          Gérer
        </button>
        <p className="text-sm text-slate-600">
          Plan actuel : <span className="font-bold text-[#1D9E75]">{plan === "pro" ? "Pro" : "Gratuit"}</span>
        </p>
        <Link
          href="/upgrade"
          className="inline-flex h-10 px-5 rounded-full bg-[#1D9E75] text-white text-sm font-semibold items-center"
        >
          Passer Pro
        </Link>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-[#2C2C2A]">Compte</h2>
        <p className="text-sm text-slate-500">Email</p>
        <p className="text-sm font-medium text-[#2C2C2A]">{email}</p>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-sm font-semibold text-red-600 hover:underline"
        >
          Se déconnecter
        </button>
      </section>

      {message ? <p className={cn("text-sm text-center", message === "Enregistré." ? "text-[#1D9E75]" : "text-rose-600")}>{message}</p> : null}
    </div>
  );
}
