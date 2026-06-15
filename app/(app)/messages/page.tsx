"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Send, ChevronLeft } from "lucide-react";
import { useAuth } from "../../../components/AuthProvider";
import { getSupabaseClient } from "../../../lib/supabase";
import {
  fetchTeacherNameByUserId,
  getConversationId,
  getConversations,
  getMessages,
  markAsRead,
  resolvePeerLabels,
  sendMessage,
  type ConversationPreview,
  type MessageRow,
} from "../../../lib/messaging";
import { cn } from "../../../lib/utils";
import { useLocale } from "../../../lib/locale-context";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleString("fr", { dateStyle: "short", timeStyle: "short" });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesScrollerRef = useRef<HTMLDivElement>(null);
  // Tracks whether the user is reading the latest part of the thread.
  // Initial open + sending always force-scroll to bottom regardless;
  // realtime arrivals only auto-scroll when this is true so a user
  // who deliberately scrolled up to read older history isn't yanked
  // back to the bottom every time a new message lands. Default true
  // because a freshly loaded thread is rendered scrolled to bottom.
  const isNearBottomRef = useRef(true);
  // Marks the conversationId that has had its initial "open at the
  // latest message" scroll applied. Reset whenever the active
  // conversation changes so re-entering the same thread re-scrolls
  // to the latest message after the next load finishes.
  const hasScrolledForActiveRef = useRef<string | null>(null);

  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPeer, setPendingPeer] = useState<{ peerId: string; label: string; conversationId: string } | null>(
    null,
  );
  const [draftHint, setDraftHint] = useState(false);
  const draftAppliedKeyRef = useRef<string | null>(null);
  const [contactGateNotice, setContactGateNotice] = useState(false);

  // Defer the scroll to the next animation frame so the freshly
  // appended message has been laid out by the browser before
  // scrollIntoView measures positions. Without this rAF, calls fired
  // synchronously inside a state-update effect can resolve against
  // the pre-update layout and stop one message short on mobile
  // Safari and slower Android Chrome.
  const scrollToLatest = useCallback((behavior: ScrollBehavior = "auto") => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: "end", behavior });
    });
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesScrollerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // ~80px = roughly one to two message bubbles + their timestamps.
    // Generous enough that incidental nudges still count as "near
    // the bottom"; strict enough to detect a deliberate scroll up
    // to read older history.
    isNearBottomRef.current = distanceFromBottom < 80;
  }, []);

  const supabase = useMemo(() => getSupabaseClient(), []);

  const refreshConversations = useCallback(async () => {
    if (!user?.id) return;
    setLoadingList(true);
    setError(null);
    try {
      const list = await getConversations(supabase, user.id);
      setConversations(list);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : t("cannotLoadConversations"));
    } finally {
      setLoadingList(false);
    }
  }, [supabase, user?.id, t]);

  const loadThread = useCallback(
    async (conversationId: string) => {
      if (!user?.id) return;
      setLoadingThread(true);
      setError(null);
      let rows: MessageRow[];
      try {
        rows = await getMessages(supabase, conversationId);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : t("cannotLoadMessages"));
        setLoadingThread(false);
        return;
      }
      // Render the messages AND drop the loading flag in the same
      // commit so the message list (and the bottom sentinel inside
      // it) becomes the visible layout before the scroll-to-latest
      // effect runs. The previous order — `setMessages` then two
      // awaits for markAsRead + refreshConversations, then
      // `setLoadingThread(false)` in `finally` — meant the scroll
      // effect fired while the loader was still on screen, so it
      // resolved against the loader's tiny scrollHeight and the
      // user opened on the OLDEST message instead of the newest.
      setMessages(rows);
      setLoadingThread(false);
      // markAsRead and refreshConversations are best-effort
      // side-effects: they update the read-state badge and the
      // conversation list, but they MUST NOT delay the visible
      // thread render. Failures are logged but do not surface as
      // a thread-level error.
      try {
        await markAsRead(supabase, conversationId, user.id);
        await refreshConversations();
      } catch (e) {
        console.warn("[messages] post-load read-state refresh failed", e);
      }
    },
    [supabase, user?.id, refreshConversations, t],
  );

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  const peerFromQuery = searchParams.get("peer");
  const draftFromQuery = searchParams.get("draft");

  useEffect(() => {
    if (!user?.id || !peerFromQuery || !UUID_RE.test(peerFromQuery)) return;

    const cid = getConversationId(user.id, peerFromQuery);
    setActiveConversationId(cid);

    const draftKey = `${peerFromQuery}|${draftFromQuery ?? ""}`;
    if (draftFromQuery && draftAppliedKeyRef.current !== draftKey) {
      try {
        const text = decodeURIComponent(draftFromQuery.replace(/\+/g, " "));
        setInput(text);
        setDraftHint(true);
      } catch {
        /* ignore malformed draft */
      }
      draftAppliedKeyRef.current = draftKey;
    }

    void (async () => {
      const labels = await resolvePeerLabels(supabase, user.id, [peerFromQuery]);
      let label = labels[peerFromQuery];
      if (!label || label === "Utilisateur") {
        const tn = await fetchTeacherNameByUserId(supabase, peerFromQuery);
        if (tn) label = tn;
      }
      setPendingPeer({ peerId: peerFromQuery, label: label || "Contact", conversationId: cid });
    })();

    router.replace("/messages", { scroll: false });
  }, [user?.id, peerFromQuery, draftFromQuery, supabase, router]);

  useEffect(() => {
    if (!pendingPeer) return;
    if (conversations.some((c) => c.conversationId === pendingPeer.conversationId)) {
      setPendingPeer(null);
    }
  }, [conversations, pendingPeer]);

  useEffect(() => {
    if (!activeConversationId || !user?.id) return;
    void loadThread(activeConversationId);
    // Dismiss any leftover gate notice when switching conversations; the
    // next masked send for this peer will re-surface it (gated by the
    // per-peer sessionStorage key).
    setContactGateNotice(false);
  }, [activeConversationId, user?.id, loadThread]);

  // Reset the "has-already-scrolled-on-open" marker whenever the
  // active conversation changes so re-entering the SAME thread
  // (e.g. mobile back-then-tap-again) still pins the scroll to the
  // latest message after the next load completes.
  useEffect(() => {
    hasScrolledForActiveRef.current = null;
    isNearBottomRef.current = true;
  }, [activeConversationId]);

  // Single source of truth for scroll-to-latest behavior. Runs after
  // every (conversationId, loadingThread, messages) commit and
  // distinguishes three cases:
  //   1. Conversation just finished loading -> instant jump to the
  //      newest message regardless of how many messages there are.
  //   2. Current user just sent a message -> smooth scroll to that
  //      message (the optimistic append is what triggers this).
  //   3. New realtime message arrived from the peer -> smooth
  //      scroll only if the user is already near the bottom; if the
  //      user scrolled up to read older history, do NOT yank them
  //      back to the bottom.
  useEffect(() => {
    if (!activeConversationId) return;
    if (loadingThread) return;

    if (hasScrolledForActiveRef.current !== activeConversationId) {
      hasScrolledForActiveRef.current = activeConversationId;
      isNearBottomRef.current = true;
      scrollToLatest("auto");
      return;
    }

    const last = messages[messages.length - 1];
    if (!last) return;
    const sentByMe = last.sender_id === user?.id;
    if (sentByMe || isNearBottomRef.current) {
      scrollToLatest("smooth");
    }
  }, [activeConversationId, loadingThread, messages, user?.id, scrollToLatest]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as MessageRow;

          // Always refresh conversation list
          void refreshConversations();

          // If conversation is open, append message
          if (newMsg.conversation_id === activeConversationId) {
            setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
            void markAsRead(supabase, newMsg.conversation_id, user.id);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, activeConversationId, refreshConversations]);

  const displayConversations = useMemo(() => {
    if (!pendingPeer || !user?.id) return conversations;
    const exists = conversations.some((c) => c.conversationId === pendingPeer.conversationId);
    if (exists) return conversations;
    const synthetic: ConversationPreview = {
      conversationId: pendingPeer.conversationId,
      peerId: pendingPeer.peerId,
      peerLabel: pendingPeer.label,
      lastPreview: t("newConversation"),
      lastAt: new Date().toISOString(),
      unreadCount: 0,
    };
    return [synthetic, ...conversations];
  }, [conversations, pendingPeer, user?.id]);

  const activePeerId = useMemo(() => {
    if (!activeConversationId || !user?.id) return null;
    const parts = activeConversationId.split("_");
    if (parts.length !== 2) return null;
    return parts[0] === user.id ? parts[1] : parts[0];
  }, [activeConversationId, user?.id]);

  const handleSend = async () => {
    if (!user?.id || !activePeerId || !input.trim()) return;
    setSending(true);
    setError(null);
    const optimisticId = `temp-${Date.now()}`;
    const optimistic: MessageRow = {
      id: optimisticId,
      conversation_id: getConversationId(user.id, activePeerId),
      sender_id: user.id,
      receiver_id: activePeerId,
      content: input.trim(),
      read: false,
      created_at: new Date().toISOString(),
    };
    const contentToSend = input.trim();
    setInput("");
    setMessages((prev) => [...prev, optimistic]);
    try {
      const result = await sendMessage(supabase, user.id, activePeerId, contentToSend);
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? result.message : m)));
      setPendingPeer(null);
      await refreshConversations();
      setDraftHint(false);
      draftAppliedKeyRef.current = null;
      router.replace("/messages", { scroll: false });

      // Anti-circumvention notice: show once per peer per browser session.
      // `sessionStorage` (not `localStorage`) means a fresh sign-in or new
      // tab re-shows it, which is the intended reminder cadence.
      if (result.safetyNotice && activePeerId) {
        const sessionKey = `contactGateNoticeShown:${activePeerId}`;
        if (typeof window !== "undefined" && !window.sessionStorage.getItem(sessionKey)) {
          window.sessionStorage.setItem(sessionKey, "1");
          setContactGateNotice(true);
        }
      }
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInput(contentToSend);
      setError(e instanceof Error ? e.message : t("cannotSendMessage"));
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto rounded-3xl border border-[var(--p-border-light)] bg-white p-8 text-center">
        <p className="text-sm text-[var(--p-text-muted)]">{t("loginForMessages")}</p>
        <Link href="/" className="mt-4 inline-block text-sm font-semibold text-teal-700 hover:underline">
          Accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 -mx-2 sm:mx-0">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t("messages")}</h1>
        <p className="text-sm text-slate-600 mt-1">{t("messagesSubtitle")}</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">{error}</div>
      ) : null}

      <div className="flex rounded-2xl border border-[var(--p-border-light)] bg-white overflow-hidden min-h-[520px] max-h-[calc(100dvh-220px)] shadow-sm">
        <aside
          className={cn(
            "shrink-0 border-r border-[var(--p-border-light)] flex flex-col bg-[#fafaf8]",
            activeConversationId ? "hidden lg:flex lg:w-[320px]" : "flex w-full lg:w-[320px] lg:max-w-[320px]",
          )}
        >
          <div className="p-3 border-b border-[var(--p-border-light)] text-[11px] font-bold uppercase tracking-widest text-slate-700">
            {t("conversationsLabel")}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList && !displayConversations.length ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-teal-700" size={28} />
              </div>
            ) : displayConversations.length === 0 ? (
              <p className="p-4 text-sm text-slate-700">{t("noMessages")}</p>
            ) : (
              displayConversations.map((c) => {
                const active = c.conversationId === activeConversationId;
                return (
                  <button
                    key={c.conversationId}
                    type="button"
                    onClick={() => {
                      setActiveConversationId(c.conversationId);
                      if (pendingPeer?.conversationId === c.conversationId) setPendingPeer(null);
                      setDraftHint(false);
                      router.replace("/messages", { scroll: false });
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-[var(--p-border-light)]/60 transition-colors hover:bg-white/90",
                      active ? "bg-teal-50" : "bg-transparent",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--p-light-teal-bg)] text-[var(--p-dark-teal)] flex items-center justify-center text-xs font-bold shrink-0">
                        {initials(c.peerLabel)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900 truncate">{c.peerLabel}</span>
                          {c.unreadCount > 0 ? (
                            <span className="flex h-2 w-2 rounded-full bg-teal-600 shrink-0" title={`${c.unreadCount} ${t("unreadCountLabel")}`} />
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-600 truncate mt-0.5">{c.lastPreview}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section
          className={cn(
            "min-w-0 bg-white flex-1 flex flex-col",
            !activeConversationId ? "hidden lg:flex" : "flex",
          )}
        >
          {!activeConversationId ? (
            <div className="flex-1 flex items-center justify-center p-8 text-sm text-slate-600">
              {t("selectConversation")}
            </div>
          ) : (
            <>
              <header className="px-4 py-3 border-b border-[var(--p-border-light)] flex items-center gap-2 bg-white">
                <button
                  type="button"
                  className="lg:hidden shrink-0 flex items-center gap-0.5 text-sm font-semibold text-slate-800 -ml-1 px-2 py-1.5 rounded-lg hover:bg-slate-100"
                  onClick={() => {
                    setDraftHint(false);
                    setActiveConversationId(null);
                  }}
                >
                  <ChevronLeft size={20} strokeWidth={2.25} aria-hidden />
                  {t("mobileChatBack")}
                </button>
                <div className="w-9 h-9 rounded-full bg-[var(--p-light-teal-bg)] text-[var(--p-dark-teal)] flex items-center justify-center text-[11px] font-bold">
                  {initials(displayConversations.find((x) => x.conversationId === activeConversationId)?.peerLabel ?? "?")}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {displayConversations.find((x) => x.conversationId === activeConversationId)?.peerLabel ??
                      t("conversationsLabel")}
                  </p>
                </div>
              </header>

              <div
                ref={messagesScrollerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
              >
                {loadingThread ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-teal-700" size={28} />
                  </div>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === user.id;
                    return (
                      <div key={m.id} className={cn("flex flex-col gap-1 max-w-[85%]", mine ? "ml-auto items-end" : "mr-auto items-start")}>
                        <div
                          className={cn(
                            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                            // Important: explicit colors for readability across dark-mode/mobile webviews.
                            mine
                              ? "bg-teal-600 text-white/95 rounded-br-md"
                              : "bg-white text-slate-800 rounded-bl-md border border-slate-100",
                          )}
                        >
                          {m.content}
                        </div>
                        <span className="text-[10px] text-slate-500 px-1">{formatMsgTime(m.created_at)}</span>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t border-[var(--p-border-light)] bg-[#fafaf8]">
                {contactGateNotice ? (
                  <div
                    role="status"
                    className="mb-2 flex items-start justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-900"
                  >
                    <span>{t("messagingContactGateNotice")}</span>
                    <button
                      type="button"
                      onClick={() => setContactGateNotice(false)}
                      className="shrink-0 text-amber-900/70 hover:text-amber-900"
                      aria-label="close"
                    >
                      ×
                    </button>
                  </div>
                ) : null}
                {draftHint ? (
                  <p className="mb-2 rounded-xl border border-teal-500/25 bg-teal-50/80 px-3 py-2 text-[11px] font-medium text-slate-800">
                    Brouillon pré-rempli — modifiez et envoyez quand vous êtes prêt(e).
                  </p>
                ) : null}
                <div className="flex items-end gap-2 rounded-[22px] border border-[var(--p-border-light)] bg-white pl-4 pr-2 py-2 focus-within:ring-2 focus-within:ring-teal-500/25">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    rows={1}
                    placeholder={t("messagePlaceholder")}
                    className="flex-1 min-h-[40px] max-h-32 resize-none bg-transparent text-sm outline-none text-slate-800 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    disabled={sending || !input.trim() || !activePeerId}
                    onClick={() => void handleSend()}
                    className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition hover:brightness-95"
                    style={{ backgroundColor: "var(--palette-teal-500)" }}
                    title={t("sendButtonTitle")}
                  >
                    {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
