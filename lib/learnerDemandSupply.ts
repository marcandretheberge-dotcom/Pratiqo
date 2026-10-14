import type { SupabaseClient } from "@supabase/supabase-js";
import type { Teacher } from "@/types";
import { fetchTeacherDisciplinesMap, mergeTeachersWithDisciplines } from "@/lib/teacherDisciplines";
import { attachTeachingZonesToTeachers, fetchTeacherTeachingZonesForTeachers } from "@/lib/teacherTeachingZones";
import { getTeacherListingCapabilities } from "@/lib/teachers/listingBookability";
import type { LearnerAvailability } from "@/lib/learnerAvailability";

/** Server-only enrichment, shared by immediate matching and existing alert processing. */
export async function loadLearnerDemandSupply(admin: SupabaseClient, publicTeachers: Teacher[], availability: LearnerAvailability = "any"): Promise<Teacher[]> {
  const ids = publicTeachers.map((teacher) => teacher.id);
  const disciplines = await fetchTeacherDisciplinesMap(admin, ids, { strict: true });
  const zones = await fetchTeacherTeachingZonesForTeachers(admin, ids, { strict: true });
  const readiness = await getTeacherListingCapabilities(admin, ids, new Date(), availability);
  if (ids.some((id) => readiness[id] == null)) throw new Error("learner_demand_availability_unavailable");
  return attachTeachingZonesToTeachers(mergeTeachersWithDisciplines(publicTeachers, disciplines), zones)
    .map((teacher) => ({ ...teacher, bookingReady: readiness[teacher.id]?.action === "book", bookingAction: readiness[teacher.id]?.action }));
}
