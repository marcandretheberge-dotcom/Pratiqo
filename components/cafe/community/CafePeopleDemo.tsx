"use client";

import { useMemo, useState } from "react";
import type { CafeCommunityTransport } from "@/lib/cafe/communityClient";
import type { CafeChatMessage, CafeFriend, CafeMember, CafePerson } from "@/lib/cafe/communityTypes";
import { createCommunityDemoTransport } from "./CafeCommunityDemo";
import { CafeCommunityApp } from "./CafeCommunityApp";
import type { CommunityLocale } from "./copy";

const ME = "00000000-0000-4000-8000-000000000001";
const MAYA = "00000000-0000-4000-8000-000000000002";
const INCOMING = "20000000-0000-4000-8000-000000000001";

/** Deliberate in-browser demo, never imported by /cafe or its server handlers. */
export function createPeopleDemoTransport() {
  const rooms = createCommunityDemoTransport();
  const friends: CafeFriend[] = [];
  const messages: CafeChatMessage[] = [];
  const photos = new Map<string, Blob>();
  let me: CafeMember | null = null;
  let seeded = false;
  let failNext = false;
  const basePeople: CafePerson[] = [
    { id: "00000000-0000-4000-8000-000000000004", displayName: "Lina · démo", nativeLanguages: ["es"], learningLanguages: ["fr", "en"], online: true, roomId: null },
    { id: "00000000-0000-4000-8000-000000000005", displayName: "Sam · démo", nativeLanguages: ["en"], learningLanguages: ["it"], online: false, roomId: null },
    { id: "00000000-0000-4000-8000-000000000006", displayName: "Inès · démo", nativeLanguages: ["fr"], learningLanguages: ["de", "es"], online: true, roomId: null },
  ];
  let people: CafePerson[] = [];
  const transport: CafeCommunityTransport = {
    async snapshot(token, roomId, signal) {
      const direct = friends.find(friend => friend.id === roomId);
      const snapshot = await rooms.snapshot(token, direct ? null : roomId, signal);
      if (!snapshot.ok) return snapshot;
      if (!me) me = { ...snapshot.me!, discoverable: false };
      people = [...snapshot.people, ...basePeople].filter(person => !snapshot.blockedMembers.some(blocked => blocked.id === person.id));
      if (!seeded) {
        seeded = true;
        const maya = people.find(person => person.id === MAYA)!;
        friends.push({ id: INCOMING, member: maya, direction: "incoming", status: "pending", introduction: "Bonjour Alex ! Je pratique le français. On fait connaissance ?", updatedAt: new Date().toISOString() });
      }
      if (direct && direct.status !== "accepted") return { ok: false, code: "room_access_denied" };
      return structuredClone({ ...snapshot, me, people, friends,
        room: direct ? {
          kind: "direct", id: direct.id, title: direct.member.displayName, languages: direct.member.learningLanguages,
          creator: me, mode: "now", state: "live", startsAt: null, capacity: 2, participants: [me, direct.member],
          rsvpCount: 0, myRsvp: false, messages: messages.filter(message => message.roomId === direct.id),
        } : snapshot.room,
      });
    },
    async command(token, command, signal, keepalive) {
      if (failNext && command.action !== "presence.heartbeat" && command.action !== "presence.leave") {
        failNext = false; throw new Error("Explicit demo network failure");
      }
      if (command.action === "friend.request") {
        const member = people.find(person => person.id === command.targetId);
        if (!member) return { ok: false, code: "member_not_found" };
        const existing = friends.find(friend => friend.member.id === member.id);
        if (existing) return { ok: true, friendshipId: existing.id };
        friends.push({ id: command.requestId, member, direction: "outgoing", status: "pending", introduction: command.introduction, updatedAt: new Date().toISOString() });
        return { ok: true, friendshipId: command.requestId };
      }
      if (command.action === "friend.respond" || command.action === "friend.remove") {
        const i = friends.findIndex(friend => friend.id === command.friendshipId);
        if (i < 0) return { ok: false, code: "friendship_not_found" };
        if (command.action === "friend.respond" && command.accept) friends[i].status = "accepted";
        else friends.splice(i, 1);
        return { ok: true };
      }
      if ("roomId" in command && friends.some(friend => friend.id === command.roomId)) {
        const direct = friends.find(friend => friend.id === command.roomId)!;
        if (direct.status !== "accepted") return { ok: false, code: "room_access_denied" };
        if (command.action === "room.join" || command.action === "room.leave") return { ok: true, roomId: direct.id };
        if (command.action === "presence.heartbeat") return { ok: true };
        if (command.action === "message.send" && me) {
          if (!messages.some(message => message.id === command.requestId)) messages.push({ id: command.requestId, roomId: direct.id, body: command.body, sender: me, createdAt: new Date().toISOString() });
          return { ok: true };
        }
        if (command.action === "report.submit") return { ok: true, reportId: crypto.randomUUID() };
        return { ok: false, code: "not_allowed" };
      }
      if (command.action === "profile.save" && me) me = { ...me, displayName: command.displayName, nativeLanguages: command.nativeLanguages, learningLanguages: command.learningLanguages, discoverable: command.discoverable ?? me.discoverable };
      if (command.action === "member.block") {
        for (let i = friends.length - 1; i >= 0; i--) if (friends[i].member.id === command.targetId) friends.splice(i, 1);
      }
      return rooms.command(token, command, signal, keepalive);
    },
    async photo(_token, id) { return photos.get(id) ?? null; },
    async savePhoto(_token, file) {
      if (!me) return { ok: false, code: "profile_required" };
      if (file) photos.set(ME, file); else photos.delete(ME);
      me = { ...me, avatarVersion: file ? crypto.randomUUID() : null };
      return { ok: true };
    },
  };
  return {
    transport,
    acceptDemoRequests: () => { for (const friend of friends) if (friend.direction === "outgoing") friend.status = "accepted"; },
    failNext: () => { failNext = true; },
  };
}

export function CafePeopleDemo() {
  const [locale, setLocale] = useState<CommunityLocale>("fr");
  const [revision, setRevision] = useState(0);
  const demo = useMemo(() => { void revision; return createPeopleDemoTransport(); }, [revision]);
  return <>
    <div style={{ background: "#fff0cd", color: "#513e0e", padding: "12px 20px", fontSize: 13, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <strong>PREVIEW · Personnes fictives, aucun envoi.</strong>
      <details>
        <summary style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center" }}>Scénarios de test</summary>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, paddingBottom: 12 }}>
          <span>Recharger efface la démo.</span>
          <label>Interface <select aria-label="Langue de la démonstration" value={locale} onChange={event => setLocale(event.target.value as CommunityLocale)}><option value="fr">FR</option><option value="en">EN</option><option value="es">ES</option></select></label>
          <button onClick={() => demo.acceptDemoRequests()}>Simuler l’acceptation du destinataire</button>
          <button onClick={() => demo.failNext()}>Simuler une erreur réseau</button>
          <button onClick={() => setRevision(value => value + 1)}>Réinitialiser</button>
        </div>
      </details>
    </div>
    <CafeCommunityApp key={revision} identity={{ userId: ME, accessToken: "explicit-people-preview-fixture" }} transport={demo.transport} locale={locale} peopleEnabled videoEnabled={false} />
  </>;
}
