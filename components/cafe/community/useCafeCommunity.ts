"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cafeCommunityTransport, type CafeCommunityTransport, type CafeIdentity } from "@/lib/cafe/communityClient";
import type { CafeCommunityCommand, CafeCommunityCommandResult, CafeCommunitySnapshot, CafeMember } from "@/lib/cafe/communityTypes";

const LOST_ROOM = new Set(["room_access_denied", "not_room_member", "room_not_joined", "membership_expired", "room_not_found", "room_unavailable", "room_closed", "access_denied", "blocked", "member_blocked", "forbidden"]);
const LOST_AUTH = new Set(["unauthorized", "unauthenticated", "account_inactive", "account_unavailable", "permanent_account_required"]);
type State = { snapshot: CafeCommunitySnapshot | null; connection: "loading" | "ready" | "stale"; error: string | null; owner: string };

export function useCafeCommunity(identity: CafeIdentity, transport: CafeCommunityTransport = cafeCommunityTransport, initialRoomId: string | null = null) {
  const [state, setState] = useState<State>({ snapshot: null, connection: "loading", error: null, owner: identity.userId });
  const [busy, setBusy] = useState(false);
  const [blocking, setBlocking] = useState<string[]>([]);
  const roomId = useRef(initialRoomId);
  const auth = useRef(identity);
  useLayoutEffect(() => { auth.current = identity; }, [identity]);
  const epoch = useRef(0);
  const poll = useRef<AbortController | null>(null);
  const heartbeatRequest = useRef<AbortController | null>(null);
  const mutations = useRef(new Set<AbortController>());
  const snapshot = useRef<CafeCommunitySnapshot | null>(null);
  const suppressed = useRef(new Set<string>());
  const presenceId = useRef<string | null>(null);
  const mounted = useRef(false);
  const busyRef = useRef(false);

  const invalidate = useCallback(() => {
    epoch.current += 1;
    poll.current?.abort();
    poll.current = null;
  }, []);

  const refresh = useCallback(async () => {
    if (!mounted.current || poll.current) return;
    const controller = new AbortController();
    poll.current = controller;
    const revision = epoch.current;
    const token = identity.accessToken;
    const selected = roomId.current;
    const current = () => mounted.current && revision === epoch.current
      && auth.current.userId === identity.userId && auth.current.accessToken === token;
    try {
      let result = await transport.snapshot(token, selected, controller.signal);
      if (!current()) return;
      let roomLost = false;
      if (!result.ok && selected && LOST_ROOM.has(result.code)) {
        // Remove private messages immediately, then read the lobby in the same request generation.
        roomLost = true;
        roomId.current = null;
        if (snapshot.current) snapshot.current = { ...snapshot.current, room: null, calls: [] };
        setState({ snapshot: snapshot.current, owner: identity.userId, connection: "stale", error: result.code });
        result = await transport.snapshot(token, null, controller.signal);
        if (!current()) return;
      }
      if (!result.ok) {
        if (LOST_AUTH.has(result.code)) snapshot.current = null;
        setState({ snapshot: snapshot.current, owner: identity.userId, connection: "stale", error: result.code });
        return;
      }
      const hidden = suppressed.current;
      const safe: CafeCommunitySnapshot = {
        ...result,
        people: result.people.filter((person) => !hidden.has(person.id)),
        rooms: result.rooms.filter((room) => !hidden.has(room.creator.id)),
        calls: result.calls.filter((call) => !hidden.has(call.from.id) && !hidden.has(call.to.id)),
        room: result.room && !hidden.has(result.room.creator.id) ? {
          ...result.room,
          participants: result.room.participants.filter((member) => !hidden.has(member.id)),
          messages: result.room.messages.filter((message) => !hidden.has(message.sender.id)),
        } : null,
      };
      const lost = roomLost || (selected && !safe.room);
      if (lost) roomId.current = null;
      snapshot.current = safe;
      setState({ snapshot: safe, owner: identity.userId, connection: "ready", error: lost ? "not_room_member" : null });
    } catch {
      if (current() && !controller.signal.aborted) {
        setState({ snapshot: snapshot.current, owner: identity.userId, connection: "stale", error: "network_error" });
      }
    } finally {
      if (poll.current === controller) poll.current = null;
    }
  }, [identity.userId, identity.accessToken, transport]);

  const heartbeat = useCallback(async () => {
    if (!mounted.current || heartbeatRequest.current || !snapshot.current?.me || document.hidden || !presenceId.current) return;
    const token = identity.accessToken;
    const revision = epoch.current;
    const controller = new AbortController();
    heartbeatRequest.current = controller;
    try {
      const result = await transport.command(token, {
        action: "presence.heartbeat", presenceSessionId: presenceId.current, roomId: roomId.current,
      }, controller.signal);
      if (!mounted.current || revision !== epoch.current || auth.current.accessToken !== token) return;
      if (!result.ok && roomId.current && LOST_ROOM.has(result.code)) {
        roomId.current = null;
        invalidate();
        if (snapshot.current) snapshot.current = { ...snapshot.current, room: null, calls: [] };
        setState({ snapshot: snapshot.current, owner: identity.userId, connection: "stale", error: result.code });
        void refresh();
      }
    } catch { /* Read polling exposes connection failures without inventing presence. */ }
    finally { if (heartbeatRequest.current === controller) heartbeatRequest.current = null; }
  }, [identity.userId, identity.accessToken, transport, invalidate, refresh]);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    const activeMutations = mutations.current;
    presenceId.current ??= crypto.randomUUID();
    invalidate();
    if (snapshot.current?.me?.id !== identity.userId) {
      snapshot.current = null;
      suppressed.current.clear();
      setState({ snapshot: null, owner: identity.userId, connection: "loading", error: null });
    }
    void refresh().then(heartbeat);
    let nextPoll: ReturnType<typeof setTimeout>;
    const tick = () => {
      nextPoll = setTimeout(async () => {
        if (!document.hidden) await refresh();
        if (active) tick();
      }, roomId.current ? 2_000 : 8_000);
    };
    tick();
    const beat = setInterval(() => void heartbeat(), 25_000);
    const visibility = () => {
      if (document.hidden) { invalidate(); heartbeatRequest.current?.abort(); }
      else { void refresh(); void heartbeat(); }
    };
    const leave = () => {
      if (!presenceId.current) return;
      void transport.command(identity.accessToken, { action: "presence.leave", presenceSessionId: presenceId.current }, undefined, true).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", leave);
    return () => {
      mounted.current = false;
      active = false;
      invalidate();
      heartbeatRequest.current?.abort();
      heartbeatRequest.current = null;
      for (const controller of activeMutations) controller.abort();
      activeMutations.clear();
      clearTimeout(nextPoll);
      clearInterval(beat);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [identity.userId, identity.accessToken, transport, refresh, heartbeat, invalidate]);

  const execute = useCallback(async (command: CafeCommunityCommand): Promise<CafeCommunityCommandResult> => {
    // Safety controls remain independently available while an ordinary send is pending.
    const independent = command.action === "member.block" || command.action === "report.submit" || command.action === "call.end";
    if (busyRef.current && !independent) return { ok: false, code: "busy" };
    if (!independent) { busyRef.current = true; setBusy(true); }
    invalidate();
    const revision = epoch.current;
    const token = identity.accessToken;
    const controller = new AbortController();
    mutations.current.add(controller);
    const current = () => mounted.current && (independent || revision === epoch.current) && auth.current.accessToken === token && auth.current.userId === identity.userId;
    let result: CafeCommunityCommandResult;
    try {
      result = await transport.command(token, command, controller.signal);
      if (!current()) return { ok: false, code: "superseded" };
      if (result.ok) {
        if (command.action === "room.join" || (command.action === "room.create" && command.mode === "now")) {
          roomId.current = result.roomId ?? (command.action === "room.join" ? command.roomId : null);
        }
        if (command.action === "room.leave" || command.action === "room.end") roomId.current = null;
        if (command.action === "member.unblock") suppressed.current.delete(command.targetId);
        invalidate();
        await refresh();
        if (command.action === "profile.save" || command.action === "room.join" || command.action === "room.create") void heartbeat();
      } else {
        setState((previous) => ({ ...previous, error: result.ok ? null : result.code }));
        if (LOST_ROOM.has(result.code)) void refresh();
      }
      return result;
    } catch {
      if (!current()) return { ok: false, code: "superseded" };
      setState((previous) => ({ ...previous, connection: "stale", error: "network_error" }));
      return { ok: false, code: "network_error" };
    } finally {
      mutations.current.delete(controller);
      if (!independent) { busyRef.current = false; if (mounted.current) setBusy(false); }
    }
  }, [identity.accessToken, identity.userId, transport, invalidate, refresh, heartbeat]);

  const block = useCallback(async (target: CafeMember) => {
    suppressed.current.add(target.id);
    invalidate();
    setBlocking((items) => [...items, target.id]);
    const previous = snapshot.current;
    if (previous) {
      // Exit the shared view immediately; the server decides whether the creator keeps the room.
      const shared = previous.room?.participants.some((member) => member.id === target.id);
      if (shared && previous.room?.creator.id !== identity.userId) roomId.current = null;
      snapshot.current = {
        ...previous,
        people: previous.people.filter((member) => member.id !== target.id),
        rooms: previous.rooms.filter((room) => room.creator.id !== target.id),
        room: shared ? null : previous.room,
        calls: previous.calls.filter((call) => call.from.id !== target.id && call.to.id !== target.id),
      };
      setState((value) => ({ ...value, snapshot: snapshot.current }));
    }
    const result = await execute({ action: "member.block", targetId: target.id });
    if (mounted.current) setBlocking((items) => items.filter((id) => id !== target.id));
    // A failed block stays visually suppressed locally, but is never represented as persisted.
    return result;
  }, [identity.userId, execute, invalidate]);

  return {
    snapshot: state.owner === identity.userId ? state.snapshot : null,
    connection: state.connection, error: state.error, busy, blocking, execute, block, refresh,
    canWrite: state.connection === "ready" && !busy,
  };
}
