import { getSupabaseClient } from "./supabase";

export function blurCoordinates(lat: number, lng: number) {
  const offset = 0.005;
  return {
    lat: lat + (Math.random() - 0.5) * offset,
    lng: lng + (Math.random() - 0.5) * offset,
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
