import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { parseStudentDirectoryQuery } from "@/lib/admin/studentLearningDirectory";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApi(request);
    if (auth.status === "error") {
      auth.response.headers.set("Cache-Control", headers["Cache-Control"]);
      return auth.response;
    }
    const query = parseStudentDirectoryQuery(new URL(request.url).searchParams);
    if (!query) return NextResponse.json({ error: "invalid_query" }, { status: 400, headers });
    const { data, error } = await auth.admin.rpc("admin_student_learning_project_directory", {
      p_query: query.query, p_status: query.status, p_page: query.page,
    });
    if (error || !data || !Array.isArray(data.students) || !Number.isInteger(data.total))
      throw new Error("directory_unavailable");
    return NextResponse.json({ directory: data }, { headers });
  } catch {
    return NextResponse.json({ error: "student_directory_unavailable" }, { status: 503, headers });
  }
}
