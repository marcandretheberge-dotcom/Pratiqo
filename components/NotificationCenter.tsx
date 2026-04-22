"use client";

import React, { useEffect, useState } from "react";
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
import { cn } from "../lib/utils";

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<PratiqoNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) return;
    const unsubscribe = notificationService.subscribeToNotifications(user.id, setNotifications);
    return unsubscribe;
  }, [user]);

  const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    notificationService.markAsRead(id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    notificationService.deleteNotification(id);
  };

  const getIcon = (type: PratiqoNotification["type"]) => {
    switch (type) {
      case "booking":
        return <Calendar size={16} className="text-brand-primary" />;
      case "message":
        return <MessageSquare size={16} className="text-indigo-500" />;
      case "assignment":
        return <BookOpen size={16} className="text-amber-500" />;
      default:
        return <AlertCircle size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all group"
      >
        <Bell
          size={20}
          className={cn(
            "text-slate-400 group-hover:text-slate-600 transition-colors",
            unreadCount > 0 && "animate-tada",
          )}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[480px]"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-bold text-slate-900">Notifications</h4>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-300 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors relative group",
                        !n.read && "bg-brand-primary/5",
                      )}
                    >
                      <div className="flex gap-3">
                        <div className="mt-1">{getIcon(n.type)}</div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-bold text-slate-900 leading-tight">
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Il y a un instant</p>
                        </div>
                      </div>

                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(e, n.id)}
                            className="p-1 bg-white border border-slate-200 rounded-lg text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                            title="Marquer comme lu"
                          >
                            <CheckCircle2 size={12} />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(e, n.id)}
                          className="p-1 bg-white border border-slate-200 rounded-lg text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          title="Supprimer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center space-y-3">
                    <Bell size={32} className="mx-auto text-slate-100" />
                    <p className="text-xs text-slate-400 font-medium tracking-wide">
                      Vous êtes à jour !
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

