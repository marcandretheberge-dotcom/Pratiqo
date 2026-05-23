import type { SupabaseClient } from "@supabase/supabase-js";

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

export type ConversationPreview = {
  conversationId: string;
  peerId: string;
  peerLabel: string;
  lastPreview: string;
  lastAt: string;
  unreadCount: number;
};

export function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort((a, b) => a.localeCompare(b)).join("_");
}

function peerIdFromConversation(conversationId: string, userId: string): string | null {
  const parts = conversationId.split("_");
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  if (a === userId) return b;
  if (b === userId) return a;
  return null;
}

export async function fetchMessagesForUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 2000,
): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, receiver_id, content, read, created_at")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

export function buildConversationPreviews(rows: MessageRow[], userId: string): Omit<ConversationPreview, "peerLabel">[] {
  const convMap = new Map<string, MessageRow[]>();
  for (const row of rows) {
    const list = convMap.get(row.conversation_id) ?? [];
    list.push(row);
    convMap.set(row.conversation_id, list);
  }

  const previews: Omit<ConversationPreview, "peerLabel">[] = [];
  for (const [conversationId, msgs] of convMap) {
    const peerId = peerIdFromConversation(conversationId, userId);
    if (!peerId) continue;
    const last = msgs.reduce((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? a : b));
    const unreadCount = msgs.filter((m) => m.receiver_id === userId && !m.read).length;
    previews.push({
      conversationId,
      peerId,
      lastPreview: last.content,
      lastAt: last.created_at,
      unreadCount,
    });
  }

  previews.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  return previews;
}

export async function resolvePeerLabels(
  supabase: SupabaseClient,
  currentUserId: string,
  peerIds: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(peerIds)].filter((id) => id && id !== currentUserId);
  const labels: Record<string, string> = {};

  if (!unique.length) return labels;

  const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", unique);
  for (const p of profiles ?? []) {
    const row = p as { id: string; name: string | null };
    if (row.name?.trim()) labels[row.id] = row.name.trim();
  }

  const missing = unique.filter((id) => !labels[id]);
  if (missing.length) {
    const { data: teachers } = await supabase.from("teachers").select("user_id, name").in("user_id", missing);
    for (const t of teachers ?? []) {
      const row = t as { user_id: string; name: string };
      if (row.user_id && row.name) labels[row.user_id] = row.name;
    }
  }

  for (const id of unique) {
    if (!labels[id]) labels[id] = "Utilisateur";
  }
  return labels;
}

export async function getConversations(supabase: SupabaseClient, userId: string): Promise<ConversationPreview[]> {
  const rows = await fetchMessagesForUser(supabase, userId);
  const partial = buildConversationPreviews(rows, userId);
  const labels = await resolvePeerLabels(
    supabase,
    userId,
    partial.map((p) => p.peerId),
  );
  return partial.map((p) => ({
    ...p,
    peerLabel: labels[p.peerId] ?? "Utilisateur",
  }));
}

export async function getMessages(supabase: SupabaseClient, conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, receiver_id, content, read, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

export type SendMessageResult = {
  message: MessageRow;
  safetyNotice: boolean;
  maskedReasons?: string[];
};

/**
 * Sends a user-composed message via the `/api/messages/send` route.
 *
 * Historically this function performed a direct `supabase.from("messages").insert(...)`
 * from the browser, which let users bypass the server-side
 * anti-circumvention sanitizer (`lib/messaging/sanitizeContactInfo.ts`).
 * To close that hole the function now POSTs to the API route with the
 * caller's Supabase session token; the route owns rate limiting, the
 * booking-relationship check, the contact-info gate, and the actual
 * insert. The `supabase` parameter is kept (1) to preserve the existing
 * call signature for `app/(app)/messages/page.tsx` and (2) to fetch the
 * session token without forcing the caller to plumb it through.
 */
export async function sendMessage(
  supabase: SupabaseClient,
  _senderId: string,
  receiverId: string,
  content: string,
): Promise<SendMessageResult> {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Message vide.");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("Session expirée. Reconnectez-vous pour envoyer un message.");
  }

  const res = await fetch("/api/messages/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ receiver_id: receiverId, content: trimmed }),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || `Send failed (${res.status})`);
  }

  const body = (await res.json()) as {
    ok: boolean;
    message: MessageRow;
    safetyNotice?: boolean;
    maskedReasons?: string[];
  };
  return {
    message: body.message,
    safetyNotice: Boolean(body.safetyNotice),
    maskedReasons: body.maskedReasons,
  };
}

export async function markAsRead(supabase: SupabaseClient, conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .eq("receiver_id", userId)
    .eq("read", false);

  if (error) throw error;
}

export async function fetchUnreadMessageCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .eq("read", false);

  if (error) {
    console.warn("[messaging] fetchUnreadMessageCount", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function fetchTeacherNameByUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase.from("teachers").select("name").eq("user_id", userId).maybeSingle();
  return (data as { name?: string } | null)?.name ?? null;
}
