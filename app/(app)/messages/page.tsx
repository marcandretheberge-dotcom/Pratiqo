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
      try {
        const rows = await getMessages(supabase, conversationId);
        setMessages(rows);
        await markAsRead(supabase, conversationId, user.id);
        await refreshConversations();
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : t("cannotLoadMessages"));
      } finally {
        setLoadingThread(false);
      }
    },
    [supabase, user?.id, refreshConversations],
  );

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  const peerFromQuery = searchParams.get("peer");

  useEffect(() => {
    if (!user?.id || !peerFromQuery || !UUID_RE.test(peerFromQuery)) return;

    const cid = getConversationId(user.id, peerFromQuery);
    setActiveConversationId(cid);

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
  }, [user?.id, peerFromQuery, supabase, router]);

  useEffect(() => {
    if (!pendingPeer) return;
    if (conversations.some((c) => c.conversationId === pendingPeer.conversationId)) {
      setPendingPeer(null);
    }
  }, [conversations, pendingPeer]);

  useEffect(() => {
    if (!activeConversationId || !user?.id) return;
    void loadThread(activeConversationId);
  }, [activeConversationId, user?.id, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const row = await sendMessage(supabase, user.id, activePeerId, contentToSend);
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? row : m)));
      setPendingPeer(null);
      await refreshConversations();
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
        <Link href="/" className="mt-4 inline-block text-sm font-semibold text-[#1D9E75] hover:underline">
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
                <Loader2 className="animate-spin text-[#1D9E75]" size={28} />
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
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-[var(--p-border-light)]/60 transition-colors hover:bg-white/90",
                      active ? "bg-[#E1F5EE]" : "bg-transparent",
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
                            <span className="flex h-2 w-2 rounded-full bg-[#1D9E75] shrink-0" title={`${c.unreadCount} ${t("unreadCountLabel")}`} />
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
                  onClick={() => setActiveConversationId(null)}
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

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {loadingThread ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-[#1D9E75]" size={28} />
                  </div>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === user.id;
                    return (
                      <div key={m.id} className={cn("flex flex-col gap-1 max-w-[85%]", mine ? "ml-auto items-end" : "mr-auto items-start")}>
                        <div
                          className={cn(
                            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                            mine ? "text-white rounded-br-md" : "text-slate-800 rounded-bl-md border border-slate-100",
                          )}
                          style={
                            mine
                              ? { backgroundColor: "#1D9E75" }
                              : { background: "var(--color-background-secondary)" }
                          }
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
                <div className="flex items-end gap-2 rounded-[22px] border border-[var(--p-border-light)] bg-white pl-4 pr-2 py-2 focus-within:ring-2 focus-within:ring-[#1D9E75]/25">
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
                    style={{ backgroundColor: "#1D9E75" }}
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
