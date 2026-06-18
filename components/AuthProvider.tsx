"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabase";
import { seedStudentProgress } from "../lib/seed";
import { authAvatarUrl, authDisplayName } from "../lib/authDisplay";
import type { StudentSavedLocation } from "@/lib/studentLocation";
import { logAuthFlowDecision } from "@/lib/auth/authFlowDiagnostics";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: AuthProfile | null;
  /** True once the profile row was loaded from the database (not a session fallback). */
  profileHydrated: boolean;
  profileSyncError: boolean;
  retryProfileSync: () => void;
  refreshProfile: () => Promise<boolean>;
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
  profileHydrated: false,
  profileSyncError: false,
  retryProfileSync: () => {},
  refreshProfile: async () => false,
});

export function useAuth() {
  return useContext(AuthContext);
}

async function loadProfileRow(
  supabase: SupabaseClient,
  userId: string,
  attempt = 0,
): Promise<{ row: Record<string, unknown> | null; errorCode: string | null }> {
  const { data: existing, error: readErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (readErr) {
    logAuthFlowDecision("auth-provider", {
      guard: "profile-read",
      profileRowPresent: false,
      queryError: readErr.code ?? "unknown",
    });
    return { row: null, errorCode: readErr.code ?? "unknown" };
  }

  if (existing) return { row: existing as Record<string, unknown>, errorCode: null };

  if (attempt < 7) {
    await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    return loadProfileRow(supabase, userId, attempt + 1);
  }

  return { row: null, errorCode: null };
}

async function loadSavedLocation(
  supabase: SupabaseClient,
  userId: string,
): Promise<StudentSavedLocation | null> {
  const { data: locRow } = await supabase
    .from("student_private_locations")
    .select("location")
    .eq("user_id", userId)
    .maybeSingle();
  return locRow?.location && typeof locRow.location === "object"
    ? (locRow.location as StudentSavedLocation)
    : null;
}

function profileFromRow(existing: Record<string, unknown>, savedLocation: StudentSavedLocation | null): AuthProfile {
  const dash =
    typeof existing.dashboard === "object" && existing.dashboard !== null
      ? (existing.dashboard as Record<string, unknown>)
      : {};
  const ext = existing;
  const stringOrNull = (value: unknown) => (typeof value === "string" ? value : null);

  return {
    id: existing.id as string,
    name: existing.name as string | null | undefined,
    email: existing.email as string | null | undefined,
    role: existing.role as string | null | undefined,
    photo_url: existing.photo_url as string | null | undefined,
    ...dash,
    companion_type: stringOrNull(ext.companion_type),
    companion_chosen: typeof ext.companion_chosen === "boolean" ? ext.companion_chosen : null,
    country_code: stringOrNull(ext.country_code),
    timezone: stringOrNull(ext.timezone),
    currency: stringOrNull(ext.currency),
    city: stringOrNull(ext.city),
    region: stringOrNull(ext.region),
    preferred_learning_format: stringOrNull(ext.preferred_learning_format),
    student_location: savedLocation,
  };
}

function fallbackProfile(u: User): AuthProfile {
  return {
    id: u.id,
    name: authDisplayName(u),
    email: u.email || "",
    role: null,
    photo_url: authAvatarUrl(u),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [profileHydrated, setProfileHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileSyncError, setProfileSyncError] = useState(false);
  const backgroundSyncRef = useRef(0);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  useEffect(() => {
    const supabase = getSupabaseClient();

    const refreshProfileInBackground = async (u: User, syncId: number) => {
      for (let attempt = 0; attempt < 8; attempt++) {
        if (backgroundSyncRef.current !== syncId) return;
        await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
        const { row, errorCode } = await loadProfileRow(supabase, u.id, 0);
        if (backgroundSyncRef.current !== syncId) return;
        if (row) {
          const savedLocation = await loadSavedLocation(supabase, u.id);
          setProfile(profileFromRow(row, savedLocation));
          setProfileHydrated(true);
          setProfileSyncError(false);
          logAuthFlowDecision("auth-provider", {
            guard: "profile-background-sync",
            profileRowPresent: true,
            profileRole: String(row.role ?? "null"),
          });
          return;
        }
        if (errorCode) {
          setProfileSyncError(true);
          return;
        }
      }
      setProfileSyncError(true);
      logAuthFlowDecision("auth-provider", {
        guard: "profile-background-sync",
        profileRowPresent: false,
        profileSyncError: true,
      });
    };

    const syncProfile = async (u: User | null) => {
      if (!u) {
        setProfile(null);
        setProfileHydrated(false);
        setProfileSyncError(false);
        backgroundSyncRef.current += 1;
        return;
      }

      await seedStudentProgress(u.id);

      const { row: existing, errorCode } = await loadProfileRow(supabase, u.id);

      if (existing) {
        const savedLocation = await loadSavedLocation(supabase, u.id);
        setProfile(profileFromRow(existing, savedLocation));
        setProfileHydrated(true);
        setProfileSyncError(false);
        backgroundSyncRef.current += 1;
        logAuthFlowDecision("auth-provider", {
          guard: "profile-sync",
          profileRowPresent: true,
          profileRole: String(existing.role ?? "null"),
        });
        return;
      }

      setProfile(fallbackProfile(u));
      setProfileHydrated(false);
      setProfileSyncError(Boolean(errorCode));
      const syncId = backgroundSyncRef.current + 1;
      backgroundSyncRef.current = syncId;
      if (!errorCode) {
        void refreshProfileInBackground(u, syncId);
      }
      logAuthFlowDecision("auth-provider", {
        guard: "profile-sync",
        profileRowPresent: false,
        profileRole: "null",
        queryError: errorCode ?? "none",
      });
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

  const retryProfileSync = () => {
    if (!user) return;
    setProfileSyncError(false);
    setLoading(true);
    void (async () => {
      const supabase = getSupabaseClient();
      const { row, errorCode } = await loadProfileRow(supabase, user.id);
      if (row) {
        const savedLocation = await loadSavedLocation(supabase, user.id);
        setProfile(profileFromRow(row, savedLocation));
        setProfileHydrated(true);
        setProfileSyncError(false);
      } else {
        setProfileHydrated(false);
        setProfileSyncError(Boolean(errorCode) || true);
      }
      setLoading(false);
    })();
  };

  const refreshProfile = useCallback(async (): Promise<boolean> => {
    const u = userRef.current;
    if (!u) return false;
    const supabase = getSupabaseClient();
    const { row, errorCode } = await loadProfileRow(supabase, u.id);
    if (row) {
      const savedLocation = await loadSavedLocation(supabase, u.id);
      setProfile(profileFromRow(row, savedLocation));
      setProfileHydrated(true);
      setProfileSyncError(false);
      return true;
    }
    setProfileSyncError(Boolean(errorCode) || true);
    return false;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, profile, profileHydrated, profileSyncError, retryProfileSync, refreshProfile }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}
