import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import {
  mergeDemandGroups,
  classifyDemandGroup,
  type DemandGroup,
  type LearningProjectOverview,
} from "@/lib/admin/learningProjectDemand";
import { loadLearnerDemandSupply } from "@/lib/learnerDemandSupply";
import {
  TEACHERS_LIST_SELECT,
  TEACHERS_PUBLIC_TABLE,
} from "@/lib/supabase/queries";
import {
  isLaunchEligibleTeacherRow,
  teacherRowToTeacher,
  type TeacherRow,
} from "@/lib/teacherMapper";
import type { Teacher } from "@/types";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (auth.status === "error") return auth.response;
  try {
    const { data, error } = await auth.admin.rpc(
      "student_learning_project_overview",
    );
    if (error || !data || !Array.isArray(data.groups))
      throw new Error("overview_unavailable");
    const summary = data as Omit<LearningProjectOverview, "groups"> & {
      groups: DemandGroup[];
    };
    const groups = mergeDemandGroups(summary.groups);
    let teachers: Teacher[] | null = null;
    if (groups.length) {
      try {
        const supply = await auth.admin
          .from(TEACHERS_PUBLIC_TABLE)
          .select(TEACHERS_LIST_SELECT);
        if (supply.error) throw new Error("supply_unavailable");
        const mapped = (supply.data ?? [])
          .filter((row) => isLaunchEligibleTeacherRow(row as TeacherRow))
          .map((row) => teacherRowToTeacher(row as TeacherRow));
        teachers = await loadLearnerDemandSupply(auth.admin, mapped);
      } catch {
        /* Display unavailable; never invent zero matching teachers. */
      }
    }
    return NextResponse.json(
      {
        overview: {
          ...summary,
          groups: groups.map((row) => classifyDemandGroup(row, teachers)),
        },
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "learning_project_overview_unavailable" },
      { status: 503, headers },
    );
  }
}
