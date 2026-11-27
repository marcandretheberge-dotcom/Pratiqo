"use client";

import { useCallback, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { RankingAttempt, RankingAward } from "./contract";

type Account = { owner: string; token: string };
type Dependencies = { fetch: typeof fetch; award: (award: RankingAward) => void; error?: () => void };
type RankingSession = { access_token: string; user: { id: string; is_anonymous?: boolean } } | null;
type RankingAuth = {
  onAuthStateChange: (callback: (event: string, session: RankingSession) => void) => { data: { subscription: { unsubscribe: () => void } } };
  getSession: () => Promise<{ data: { session: RankingSession } }>;
};

function parseAward(value: unknown): RankingAward | null {
  if (!value || typeof value !== "object") return null;
  const award = value as RankingAward;
  return (award.awarded === 0 || award.awarded === 10) && Number.isSafeInteger(award.totalXp)
    && Number.isSafeInteger(award.weekXp) && award.totalXp >= award.awarded
    && award.weekXp >= award.awarded && award.weekXp <= award.totalXp ? award : null;
}

/** In-memory, account-bound delivery. There is no anonymous import or persisted answer queue. */
export function createRankingAttemptClient(deps: Dependencies) {
  let account: Account | null = null, epoch = 0;
  const pending = new Set<AbortController>();
  function setAccount(next: Account | null) {
    if (account?.owner !== next?.owner) {
      epoch++;
      for (const controller of pending) controller.abort();
      pending.clear();
    }
    account = next;
  }
  async function submit(attempt: RankingAttempt): Promise<RankingAward | null> {
    // Capture this action's account and actual answer before the first await.
    const captured = account, generation = epoch;
    if (!captured) return null;
    const controller = new AbortController();
    let expired = false;
    const timeout = setTimeout(() => { expired = true; controller.abort(); }, 12_000);
    pending.add(controller);
    const current = () => generation === epoch && account?.owner === captured.owner;
    const failed = () => { if (current() && (!controller.signal.aborted || expired)) deps.error?.(); return null; };
    try {
      const body = JSON.stringify(attempt);
      for (let retry = 0; retry < 2; retry++) {
        if (!current() || controller.signal.aborted) return failed();
        try {
          const response = await deps.fetch("/api/yo/rankings/attempt", {
            method: "POST", credentials: "omit", cache: "no-store", signal: controller.signal,
            headers: { Authorization: `Bearer ${captured.token}`, "Content-Type": "application/json" }, body,
          });
          if (!current() || controller.signal.aborted) return failed();
          if (!response.ok) {
            if (response.status >= 500 && retry === 0) continue;
            return failed();
          }
          const award = parseAward(await response.json());
          if (!current() || controller.signal.aborted) return failed();
          if (!award) return failed();
          if (award.awarded > 0) deps.award(award);
          return award;
        } catch {
          if (retry === 1 || controller.signal.aborted || !current()) return failed();
        }
      }
      return failed();
    } catch { return failed(); }
    finally { clearTimeout(timeout); pending.delete(controller); }
  }
  return { setAccount, submit, hasAccount: () => Boolean(account), dispose: () => { setAccount(null); } };
}

/** One auth subscription and delivery lifetime shared by all mounted course consumers. */
export function createRankingAttemptScope(deps: Dependencies & { getAuth: () => RankingAuth }) {
  const sender = createRankingAttemptClient(deps);
  let started = false, lifetime = 0, unsubscribe: (() => void) | null = null;
  function start() {
    if (started) return;
    const generation = ++lifetime;
    let revision = 0;
    started = true;
    try {
      const auth = deps.getAuth();
      const bind = (session: RankingSession) => {
        if (!started || generation !== lifetime) return;
        sender.setAccount(session?.access_token && session.user.id && !session.user.is_anonymous
          ? { owner: session.user.id, token: session.access_token } : null);
      };
      const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
        revision++; bind(session);
      });
      unsubscribe = () => subscription.unsubscribe();
      const initialRevision = revision;
      void auth.getSession().then(({ data: { session } }) => {
        if (revision === initialRevision) bind(session);
      }).catch(() => {});
    } catch {
      unsubscribe?.(); unsubscribe = null; started = false; sender.dispose();
    }
  }
  return { start, submit: sender.submit, hasAccount: sender.hasAccount, dispose: () => {
    lifetime++; started = false; unsubscribe?.(); unsubscribe = null; sender.dispose();
  } };
}

// Normal lesson navigation must not cancel a completed exercise's pending award.
// This browser-memory scope ends on page teardown; auth changes abort immediately.
const browserScope = createRankingAttemptScope({
  getAuth: () => getSupabaseClient().auth,
  fetch: (...args) => fetch(...args),
  award: award => window.dispatchEvent(new CustomEvent<RankingAward>("yo:ranking-award", { detail: award })),
  error: () => window.dispatchEvent(new Event("yo:ranking-sync-error")),
});

/** Unresolved/signed-out sessions simply practise without a server award. */
export function useRankingAttempt(scope = browserScope) {
  useEffect(() => { scope.start(); }, [scope]);
  return useCallback((attempt: RankingAttempt) => { void scope.submit(attempt); }, [scope]);
}

/** Old lesson drafts may lack full submitted evidence; progress remains saved. */
export function notifyRankingReplayNeeded() {
  if (browserScope.hasAccount()) window.dispatchEvent(new Event("yo:ranking-replay-needed"));
}
