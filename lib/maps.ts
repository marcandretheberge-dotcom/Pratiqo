import { getSupabaseClient } from "./supabase";

export function blurCoordinates(lat: number, lng: number, radiusKm = 0.5) {
  // Convert km radius to approximate degrees. 1° latitude ≈ 111 km.
  // Longitude compression at given latitude is accounted for with cosine.
  // Full offset range is ±radiusKm so the maximum displacement equals radiusKm.
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    lat: lat + (Math.random() - 0.5) * 2 * latDelta,
    lng: lng + (Math.random() - 0.5) * 2 * lngDelta,
  };
}

export async function hasConfirmedBooking(studentId: string, teacherId: string): Promise<boolean> {
  const { data } = await getSupabaseClient()
    .from("bookings")
    .select("id")
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .eq("status", "confirmed")
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function hasConfirmedGroupRegistration(studentId: string, sessionId: string): Promise<boolean> {
  const { data } = await getSupabaseClient()
    .from("group_registrations")
    .select("id")
    .eq("student_id", studentId)
    .eq("session_id", sessionId)
    .eq("status", "confirmed")
    .limit(1);
  return (data?.length ?? 0) > 0;
}
