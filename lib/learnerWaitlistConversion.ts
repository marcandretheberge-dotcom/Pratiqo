import type { SupabaseClient } from "@supabase/supabase-js";
import { TEACHERS_LIST_SELECT, TEACHERS_PUBLIC_TABLE } from "@/lib/supabase/queries";
import { teacherRowToTeacher, type TeacherRow } from "@/lib/teacherMapper";
import { fetchTeacherDisciplinesMap, mergeTeachersWithDisciplines } from "@/lib/teacherDisciplines";
import { attachTeachingZonesToTeachers, fetchTeacherTeachingZonesForTeachers } from "@/lib/teacherTeachingZones";
import { matchLearnerDemand } from "@/lib/learnerDemand";
import { matchesLearnerAvailability, parseLearnerAvailability } from "@/lib/learnerAvailability";
import { slotStartMinutes } from "@/lib/slots";

/** Idempotent server reconciliation; also usable to retry a failed measurement
 * write. Identity, slot and teacher come from durable records, never URL input. */
export async function reconcileLearnerWaitlistBooking(admin: SupabaseClient, bookingId: string): Promise<void> {
  const booking = await admin.from("bookings").select("id,student_id,teacher_id,created_at,slot_date,time_slot,duration_minutes,teaching_mode").eq("id",bookingId).maybeSingle();
  if (booking.error) throw Error("conversion_booking_lookup_failed");
  const b=booking.data; if (!b) return;
  const identity=await admin.auth.admin.getUserById(b.student_id);
  if (identity.error) throw Error("conversion_identity_lookup_failed");
  const user=identity.data.user;
  if (!user?.email || !user.email_confirmed_at) return;
  const leads=await admin.from("learner_demand_leads")
    .select("id,subject,city,requested_format,availability_preference")
    .eq("email_normalized",user.email.trim().toLowerCase()).not("alert_consent_at","is",null)
    .eq("adult_contact_confirmed",true).neq("status","closed").lte("created_at",b.created_at);
  if(leads.error) throw Error("conversion_lead_lookup_failed");
  if(!leads.data?.length) return;
  const row=await admin.from(TEACHERS_PUBLIC_TABLE).select(TEACHERS_LIST_SELECT).eq("id",b.teacher_id).maybeSingle();
  if(row.error) throw Error("conversion_teacher_lookup_failed");
  if(!row.data) return;
  const ids=[b.teacher_id];
  const disciplines=await fetchTeacherDisciplinesMap(admin,ids,{strict:true});
  const zones=await fetchTeacherTeachingZonesForTeachers(admin,ids,{strict:true});
  const [teacher]=attachTeachingZonesToTeachers(mergeTeachersWithDisciplines([teacherRowToTeacher(row.data as TeacherRow)],disciplines),zones);
  // The persisted booking proves entry; this is not an availability projection.
  const actual={...teacher,bookingAction:"book" as const};
  const format=b.teaching_mode==='online' ? 'online' : 'in_person';
  const links=leads.data.filter(lead=>lead.requested_format===format &&
    matchesLearnerAvailability(parseLearnerAvailability(lead.availability_preference),b.slot_date,slotStartMinutes(b.time_slot),b.duration_minutes) &&
    matchLearnerDemand([actual],{subject:lead.subject,city:lead.city,requestedFormat:format,acceptsOnline:false}).outcome!=="waitlist")
    .map(lead=>({lead_id:lead.id,booking_id:b.id}));
  if(!links.length) return;
  const saved=await admin.from("learner_waitlist_booking_links").upsert(links,{onConflict:"lead_id,booking_id",ignoreDuplicates:true});
  if(saved.error) throw Error("conversion_link_save_failed");
}

/** Bounded recovery for an authorized operator, including package-created
 * bookings. UUID cursor avoids unstable offsets; repeat a pass for newer rows. */
export async function reconcileLearnerWaitlistBatch(admin: SupabaseClient, afterId?: string): Promise<string | null> {
  let query=admin.from("bookings").select("id").order("id").limit(100);
  if(afterId) query=query.gt("id",afterId);
  const result=await query;
  if(result.error) throw Error("conversion_batch_lookup_failed");
  for(const row of result.data??[]) await reconcileLearnerWaitlistBooking(admin,row.id);
  return result.data?.length===100 ? result.data[99].id : null;
}
