"use client";

import { useEffect, useState } from "react";
import type { Teacher } from "@/types";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchPublicMarketplaceTeachers } from "@/features/marketplace/publicTeachers";

export function usePublicTeachers(logContext: string) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const supabase = getSupabaseClient();
        const marketplaceTeachers = await fetchPublicMarketplaceTeachers(supabase, logContext);
        if (!cancelled) {
          setTeachers(marketplaceTeachers);
          setError(null);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[${logContext}] Failed to load marketplace teachers`, err);
        }
        if (!cancelled) {
          setTeachers([]);
          setError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [logContext]);

  return { teachers, loading, error };
}
