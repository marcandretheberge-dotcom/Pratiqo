"use client";

import { useMemo, useState } from "react";
import type { CafeCommunityTransport } from "@/lib/cafe/communityClient";
import type { CafeChatMessage, CafeCommunityRoom, CafeCommunitySnapshot, CafeMember } from "@/lib/cafe/communityTypes";
import { CafeCommunityApp } from "./CafeCommunityApp";
import type { CommunityLocale } from "./copy";
import { cafeHeroMedia } from "@/lib/cafe/heroMedia";

/** Fixture transport is imported only by the explicitly gated preview, never by /cafe. */
export function createCommunityDemoTransport(onboarding = false): CafeCommunityTransport {
  let me: CafeMember | null = onboarding ? null : { id: "00000000-0000-4000-8000-000000000001", displayName: "Alex · démo", nativeLanguages: ["fr"], learningLanguages: ["ja", "es"] };
  const maya: CafeMember = { id: "00000000-0000-4000-8000-000000000002", displayName: "Maya · démo", nativeLanguages: ["en"], learningLanguages: ["fr", "ja"] };
  const riku: CafeMember = { id: "00000000-0000-4000-8000-000000000003", displayName: "Riku · démo", nativeLanguages: ["ja"], learningLanguages: ["fr", "es"] };
  const room: CafeCommunityRoom = { id: "10000000-0000-4000-8000-000000000001", title: "Une pause et les petits plaisirs du jour", languages: ["fr", "en", "ja"], creator: maya, mode: "now", state: "waiting", startsAt: null, capacity: 4, participants: [maya], rsvpCount: 0, myRsvp: false };
  const data: CafeCommunitySnapshot = {
    ok: true, me,
    people: [{ ...maya, online: true, roomId: room.id }, { ...riku, online: false, roomId: null }],
    rooms: [room, { id: "10000000-0000-4000-8000-000000000002", title: "Voyages, cuisine et mots à partager", languages: ["ja", "es", "fr"], creator: riku, mode: "scheduled", state: "scheduled", startsAt: new Date(Date.now() + 2 * 86_400_000).toISOString(), capacity: 4, participants: [], rsvpCount: 1, myRsvp: false }],
    room: null, calls: [], blockedMembers: [], serverTime: new Date().toISOString(),
  };
  const messages: CafeChatMessage[] = [];
  const delivered = new Set<string>();
  const joined = new Set<string>();
  return {
    async snapshot(_token, roomId) {
      const selected = data.rooms.find((item) => item.id === roomId);
      return structuredClone({ ...data, me, serverTime: new Date().toISOString(), room: selected && joined.has(selected.id) ? { ...selected, messages: messages.filter((message) => message.roomId === selected.id) } : null });
    },
    async command(_token, command) {
      if (command.action === "profile.save") { me = { id: "00000000-0000-4000-8000-000000000001", displayName: command.displayName, nativeLanguages: command.nativeLanguages, learningLanguages: command.learningLanguages }; return { ok: true }; }
      if (command.action === "presence.heartbeat" || command.action === "presence.leave") return { ok: true };
      if (!me) return { ok: false, code: "profile_required" };
      if (command.action === "room.join") {
        const selected = data.rooms.find((item) => item.id === command.roomId);
        if (!selected) return { ok: false, code: "room_not_found" };
        if (!selected.participants.some((person) => person.id === me!.id)) selected.participants.push(me);
        selected.state = "live"; joined.clear(); joined.add(selected.id);
        return { ok: true, roomId: selected.id };
      }
      if (command.action === "room.create") {
        if (delivered.has(command.requestId)) return { ok: true, roomId: command.requestId };
        delivered.add(command.requestId);
        data.rooms.unshift({ id: command.requestId, title: command.title, languages: command.languages, creator: me, mode: command.mode, state: command.mode === "now" ? "waiting" : "scheduled", startsAt: command.startsAt ?? null, capacity: command.capacity, participants: command.mode === "now" ? [me] : [], rsvpCount: 0, myRsvp: false });
        if (command.mode === "now") { joined.clear(); joined.add(command.requestId); }
        return { ok: true, roomId: command.requestId };
      }
      if (command.action === "message.send") {
        if (!delivered.has(command.requestId)) { delivered.add(command.requestId); messages.push({ id: command.requestId, roomId: command.roomId, body: command.body, sender: me, createdAt: new Date().toISOString() }); }
        return { ok: true };
      }
      if (command.action === "room.leave" || command.action === "room.end") {
        joined.delete(command.roomId);
        data.rooms = data.rooms.filter((item) => !(item.id === command.roomId && item.creator.id === me!.id));
        const selected = data.rooms.find((item) => item.id === command.roomId);
        if (selected) { selected.participants = selected.participants.filter((person) => person.id !== me!.id); selected.state = selected.participants.length > 1 ? "live" : "waiting"; }
        return { ok: true };
      }
      if (command.action === "room.rsvp") { const selected = data.rooms.find((item) => item.id === command.roomId); if (selected) { selected.myRsvp = command.attending; selected.rsvpCount += command.attending ? 1 : -1; } return { ok: true }; }
      if (command.action === "member.block") {
        const target = data.people.find((person) => person.id === command.targetId);
        if (target && !data.blockedMembers.some((person) => person.id === target.id)) data.blockedMembers.push(target);
        data.people = data.people.filter((person) => person.id !== command.targetId);
        data.rooms = data.rooms.filter((item) => item.creator.id !== command.targetId);
        joined.clear(); return { ok: true };
      }
      if (command.action === "member.unblock") { data.blockedMembers = data.blockedMembers.filter((person) => person.id !== command.targetId); return { ok: true }; }
      if (command.action === "report.submit") return { ok: true, reportId: crypto.randomUUID() };
      if (command.action === "room.remove") { const selected = data.rooms.find((item) => item.id === command.roomId); if (selected) selected.participants = selected.participants.filter((person) => person.id !== command.targetId); return { ok: true }; }
      return { ok: false, code: "provider_disabled" };
    },
  };
}

export function CafeCommunityDemo({ initialLocale = "fr", initialOnboarding = false, onLocaleChange }: {
  initialLocale?: CommunityLocale;
  initialOnboarding?: boolean;
  onLocaleChange?: (locale: CommunityLocale) => void;
} = {}) {
  const [locale, setLocale] = useState<CommunityLocale>(initialLocale);
  const [revision, setRevision] = useState(0);
  const [onboarding, setOnboarding] = useState(initialOnboarding);
  const transport = useMemo(() => {
    // Reset creates a fresh fixture even when the onboarding choice has not changed.
    void revision;
    return createCommunityDemoTransport(onboarding);
  }, [revision, onboarding]);
  return <>
    <div style={{ background: "#ffedbf", color: "#473b22", padding: "14px 20px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
      <strong>DÉMONSTRATION · Personnes, présence, salons et messages fictifs. Aucun appel ni enregistrement réel.</strong>
      <label>Interface <select aria-label="Langue de la démonstration" value={locale} onChange={(event) => { const next = event.target.value as CommunityLocale; setLocale(next); onLocaleChange?.(next); }}><option value="fr">Français</option><option value="en">English</option><option value="es">Español</option></select></label>
      <button onClick={() => { setOnboarding(true); setRevision((value) => value + 1); }}>Tester l’entrée</button>
      <button onClick={() => { setOnboarding(false); setRevision((value) => value + 1); }}>Réinitialiser</button>
    </div>
    <CafeCommunityApp key={`${revision}:${onboarding}`} identity={{ userId: "00000000-0000-4000-8000-000000000001", accessToken: "explicit-preview-fixture" }} locale={locale} transport={transport} videoEnabled={false} heroVideoSrc={cafeHeroMedia.videoSrc} />
  </>;
}
