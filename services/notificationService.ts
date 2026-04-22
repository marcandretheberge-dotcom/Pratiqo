import { getSupabaseClient } from "../lib/supabase";
import type { PratiqoNotification } from "../types";

function mapRow(row: Record<string, unknown>): PratiqoNotification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    message: row.message as string,
    type: row.type as PratiqoNotification["type"],
    read: Boolean(row.read),
    createdAt: row.created_at as string,
    link: (row.link as string) || undefined,
  };
}

export const notificationService = {
  async sendNotification(
    notification: Omit<PratiqoNotification, "id" | "createdAt" | "read">,
  ) {
    const supabase = getSupabaseClient();
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        link: notification.link ?? null,
      });
      if (error) console.error("Error sending notification:", error);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  },

  subscribeToNotifications(
    userId: string,
    callback: (notifications: PratiqoNotification[]) => void,
  ) {
    const supabase = getSupabaseClient();

    const load = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("notifications load", error);
        callback([]);
        return;
      }
      callback((data || []).map((r) => mapRow(r as Record<string, unknown>)));
    };

    void load();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },

  async markAsRead(notificationId: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId);
    if (error) console.error("Error marking notification as read:", error);
  },

  async deleteNotification(notificationId: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
    if (error) console.error("Error deleting notification:", error);
  },
};
