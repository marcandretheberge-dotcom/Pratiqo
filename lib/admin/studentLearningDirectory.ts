import type { LearningAudience, LearningFormat } from "@/lib/studentLearningProject";

export type StudentProjectStatus = "declared" | "deferred" | "unanswered";
export type StudentDirectoryFilter = StudentProjectStatus | "all";
export type StudentDirectoryRow = {
  id: string;
  name: string | null;
  email: string | null;
  profile_city: string | null;
  project_city: string | null;
  subject: string | null;
  audience: LearningAudience | null;
  format: LearningFormat | null;
  status: StudentProjectStatus;
  inactive: boolean;
  created_at: string | null;
  project_updated_at: string | null;
};
export type StudentDirectory = {
  total: number;
  page: number;
  pageSize: number;
  students: StudentDirectoryRow[];
};

export function parseStudentDirectoryQuery(params: URLSearchParams) {
  const query = (params.get("q") ?? "").trim();
  const status = params.get("status") ?? "all";
  const rawPage = params.get("page") ?? "1";
  const page = Number(rawPage);
  if (query.length > 120 || !["all", "declared", "deferred", "unanswered"].includes(status) ||
      !/^\d+$/.test(rawPage) || !Number.isSafeInteger(page) || page < 1 || page > 100000) return null;
  return { query, status: status as StudentDirectoryFilter, page };
}
