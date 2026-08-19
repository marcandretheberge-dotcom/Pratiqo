import { getSupabaseClient } from "@/lib/supabase";
import {
  filterPublishedPublicTeacherOffers,
  TEACHER_OFFER_PUBLIC_SELECT_COLUMNS,
  type PublicTeacherOfferDto,
} from "./publicTeacherOfferDto";

/**
 * RLS-safe public read of published offers for one teacher profile.
 * Fail closed: any query error returns an empty list (section hides).
 * Does not use the service role.
 */
export async function fetchPublishedTeacherOffers(teacherId: string): Promise<PublicTeacherOfferDto[]> {
  const id = teacherId.trim();
  if (!id) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from("teacher_offers")
      .select(TEACHER_OFFER_PUBLIC_SELECT_COLUMNS)
      .eq("teacher_id", id)
      .eq("status", "published")
      .not("published_at", "is", null);

    if (error || !Array.isArray(data)) return [];
    return filterPublishedPublicTeacherOffers(data, id);
  } catch {
    return [];
  }
}
