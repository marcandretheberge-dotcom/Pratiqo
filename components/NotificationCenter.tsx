"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  MessageSquare,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { notificationService } from "../services/notificationService";
import type { PratiqoNotification } from "../types";
import { useAuth } from "./AuthProvider";
import { useLocale } from "../lib/locale-context";
import { cn } from "../lib/utils";

export function NotificationCenter() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [notifications, setNotifications] = useState<PratiqoNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) return;
    const unsubscribe = notificationService.subscribeToNotifications(user.id, setNotifications);
    return unsubscribe;
  }, [user]);

  const handleMarkAsRead = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    let rollback: PratiqoNotification[] = [];
    setNotifications((list) => {
      rollback = list;
      return list.map((n) => (n.id === id ? { ...n, read: true } : n));
    });
    try {
      await notificationService.markAsRead(id);
    } catch {
      setNotifications(rollback);
    }
  }, []);

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    let rollback: PratiqoNotification[] = [];
    setNotifications((list) => {
      rollback = list;
      return list.filter((n) => n.id !== id);
    });
    try {
      await notificationService.deleteNotification(id);
    } catch {
      setNotifications(rollback);
    }
  }, []);

  const getIcon = (type: PratiqoNotification["type"]) => {
    switch (type) {
      case "booking":
        return <Calendar size={16} className="text-brand-primary" />;
      case "message":
        return <MessageSquare size={16} className="text-indigo-500" />;
      case "assignment":
        return <BookOpen size={16} className="text-amber-500" />;
      default:
        return <AlertCircle size={16} className="text-slate-600" />;
    }
  };

  const actionBtnClass =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:scale-[0.98] min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] sm:h-9 sm:w-9";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all group"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={t("notificationsTitle")}
      >
        <Bell
          size={20}
          className={cn(
            "text-slate-600 group-hover:text-slate-600 transition-colors",
            unreadCount > 0 && "animate-tada",
          )}
        />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-white bg-rose-500 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {isOpen ? (
          <>
            <div className="fixed inset-0 z-40" aria-hidden onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              role="dialog"
              aria-label={t("notificationsTitle")}
              className="absolute right-0 z-50 mt-3 flex max-h-[min(480px,70dvh)] w-[min(100vw-1.5rem,20rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-80"
            >
              <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 p-4">
                <h4 className="font-bold text-slate-900">{t("notificationsTitle")}</h4>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                  aria-label={t("bannerDismiss")}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto py-2">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "border-b border-slate-50 px-3 py-3 last:border-0 sm:px-4",
                        !n.read && "bg-brand-primary/5",
                      )}
                    >
                      <div className="flex gap-2 sm:gap-3">
                        <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                        <div className="min-w-0 flex-1 space-y-1 pr-1">
                          <p className="text-sm font-bold leading-tight text-slate-900">{n.title}</p>
                          <p className="text-xs leading-relaxed text-slate-600">{n.message}</p>
                          <p className="text-[10px] font-medium text-slate-600">{t("justNow")}</p>
                        </div>
                        <div
                          className="flex shrink-0 flex-row items-start gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!n.read ? (
                            <button
                              type="button"
                              onClick={(e) => void handleMarkAsRead(e, n.id)}
                              className={cn(actionBtnClass, "text-brand-primary hover:border-brand-primary/40 hover:bg-brand-primary/5")}
                              title={t("markAsRead")}
                              aria-label={t("markAsRead")}
                            >
                              <CheckCircle2 size={18} strokeWidth={2} aria-hidden />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={(e) => void handleDelete(e, n.id)}
                            className={cn(actionBtnClass, "text-rose-500 hover:border-rose-200 hover:bg-rose-50")}
                            title={t("deleteNotification")}
                            aria-label={t("deleteNotification")}
                          >
                            <Trash2 size={18} strokeWidth={2} aria-hidden />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-3 px-6 py-10 text-center sm:py-12">
                    <Bell size={32} className="mx-auto text-slate-200" aria-hidden />
                    <p className="text-xs font-medium tracking-wide text-slate-600">{t("allCaughtUp")}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
