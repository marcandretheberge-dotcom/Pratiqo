"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabase";
import { seedStudentProgress } from "../lib/seed";
import { authAvatarUrl, authDisplayName } from "../lib/authDisplay";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: any | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profile: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

function defaultDashboard() {
  return {
    activeSubscriptions: [] as { teacherId: string; startDate: string; remainingLessons: number; price: number }[],
    progress: {} as Record<string, { date: string; score: number; milestone?: string }[]>,
    badges: [{ id: "1", icon: "🔥", name: "Première Pratique", date: new Date().toISOString() }],
    streak: 1,
    milestones: [
      { id: "1", title: "Première session", completed: true },
      { id: "2", title: "5 leçons complétées", completed: false },
      { id: "3", title: "Maître de discipline", completed: false },
      { id: "4", title: "Série de 30 jours", completed: false },
    ],
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const syncProfile = async (u: User | null) => {
      if (!u) {
        setProfile(null);
        return;
      }

      await seedStudentProgress(u.id);

      const { data: existing, error: readErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .maybeSingle();

      if (readErr) {
        console.error(readErr);
        setProfile(null);
        return;
      }

      if (existing) {
        const dash =
          typeof existing.dashboard === "object" && existing.dashboard !== null
            ? (existing.dashboard as Record<string, unknown>)
            : {};
        const ext = existing as Record<string, unknown>;
        setProfile({
          id: existing.id,
          name: existing.name,
          email: existing.email,
          role: existing.role,
          photo_url: existing.photo_url,
          ...dash,
          country_code: ext.country_code ?? null,
          timezone: ext.timezone ?? null,
          currency: ext.currency ?? null,
          city: ext.city ?? null,
          region: ext.region ?? null,
          preferred_learning_format: ext.preferred_learning_format ?? null,
        });
      } else {
        const dash = defaultDashboard();
        const row = {
          id: u.id,
          name: authDisplayName(u),
          email: u.email || "",
          role: "student",
          photo_url: authAvatarUrl(u),
          dashboard: dash,
        };
        const { error: insErr } = await supabase.from("profiles").insert(row);
        if (insErr) {
          console.error(insErr);
        }
        setProfile({ ...row, ...dash });
      }
    };

    const applySession = async (u: User | null) => {
      setUser(u);
      await syncProfile(u);
      setLoading(false);
    };

    let unsubAuth = () => {};

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await applySession(session?.user ?? null);

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        void applySession(session?.user ?? null);
      });
      unsubAuth = () => listener.subscription.unsubscribe();
    })();

    return () => unsubAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
