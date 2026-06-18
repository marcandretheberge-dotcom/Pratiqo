"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabase";
import { seedStudentProgress } from "../lib/seed";
import { authAvatarUrl, authDisplayName } from "../lib/authDisplay";
import type { StudentSavedLocation } from "@/lib/studentLocation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: AuthProfile | null;
}

type AuthProfile = Record<string, unknown> & {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  photo_url?: string | null;
  plan?: string | null;
  teacher_onboarding_complete?: boolean | null;
  companion_type?: string | null;
  companion_chosen?: boolean | null;
  country_code?: string | null;
  timezone?: string | null;
  currency?: string | null;
  city?: string | null;
  region?: string | null;
  preferred_learning_format?: string | null;
  student_location?: StudentSavedLocation | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profile: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const loadProfileRow = async (userId: string, attempt = 0): Promise<Record<string, unknown> | null> => {
      const { data: existing, error: readErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (readErr) {
        console.error(readErr);
        return null;
      }

      if (existing) return existing as Record<string, unknown>;

      // OAuth callback upserts the profile server-side; a brief retry avoids
      // treating a just-created row as missing and inserting role=student.
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
        return loadProfileRow(userId, attempt + 1);
      }

      return null;
    };

    const syncProfile = async (u: User | null) => {
      if (!u) {
        setProfile(null);
        return;
      }

      await seedStudentProgress(u.id);

      const existing = await loadProfileRow(u.id);

      if (existing) {
        const dash =
          typeof existing.dashboard === "object" && existing.dashboard !== null
            ? (existing.dashboard as Record<string, unknown>)
            : {};
        const ext = existing as Record<string, unknown>;
        const stringOrNull = (value: unknown) => (typeof value === "string" ? value : null);

        // Saved location lives in a dedicated owner-only table (migration 073);
        // teacher-peer RLS on profiles cannot reach it. A failed read here is
        // non-fatal — the feature is optional.
        const { data: locRow } = await supabase
          .from("student_private_locations")
          .select("location")
          .eq("user_id", u.id)
          .maybeSingle();
        const savedLocation =
          locRow?.location && typeof locRow.location === "object"
            ? (locRow.location as StudentSavedLocation)
            : null;

        setProfile({
          id: existing.id as string,
          name: existing.name as string | null | undefined,
          email: existing.email as string | null | undefined,
          role: existing.role as string | null | undefined,
          photo_url: existing.photo_url as string | null | undefined,
          ...dash,
          companion_type: stringOrNull(ext.companion_type),
          companion_chosen: typeof ext.companion_chosen === "boolean" ? ext.companion_chosen : false,
          country_code: stringOrNull(ext.country_code),
          timezone: stringOrNull(ext.timezone),
          currency: stringOrNull(ext.currency),
          city: stringOrNull(ext.city),
          region: stringOrNull(ext.region),
          preferred_learning_format: stringOrNull(ext.preferred_learning_format),
          student_location: savedLocation,
        });
      } else {
        // Never insert a default student row here — OAuth callback and
        // /api/onboarding/select-role are the only profile creators.
        if (process.env.NODE_ENV !== "production") {
          console.warn("[AuthProvider] profile row missing after OAuth; waiting for server upsert");
        }
        setProfile({
          id: u.id,
          name: authDisplayName(u),
          email: u.email || "",
          role: null,
          photo_url: authAvatarUrl(u),
          companion_chosen: false,
        });
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
