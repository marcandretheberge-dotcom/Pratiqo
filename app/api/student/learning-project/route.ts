import { NextResponse } from "next/server";
import { getSupabaseForRequest } from "@/lib/auth/supabaseRouteClient";
import { rateLimitByIp, rateLimitGuardResponse } from "@/lib/rateLimit";
import {
  LEARNING_PROJECT_COLUMNS,
  learningProjectSearchHref,
  parseLearningProject,
  type LearningProject,
} from "@/lib/studentLearningProject";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const unavailable = () =>
  NextResponse.json(
    { error: "learning_project_unavailable" },
    { status: 503, headers },
  );

async function student(request: Request) {
  // Match the existing authenticated API contract; mutation cannot rely on a
  // cross-site cookie alone. getUser verifies the bearer token server-side.
  if (!/^Bearer \S+$/.test(request.headers.get("authorization") ?? "")) {
    return {
      response: NextResponse.json(
        { error: "unauthorized" },
        { status: 401, headers },
      ),
    };
  }
  const client = await getSupabaseForRequest(request);
  if (!client) return { response: unavailable() };
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user)
    return {
      response: NextResponse.json(
        { error: "unauthorized" },
        { status: 401, headers },
      ),
    };
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) return { response: unavailable() };
  if (profile?.role !== "student")
    return {
      response: NextResponse.json(
        { error: "forbidden" },
        { status: 403, headers },
      ),
    };
  return { client, user };
}

function response(project: LearningProject | null) {
  return NextResponse.json(
    {
      project,
      searchHref: project?.completed_at
        ? learningProjectSearchHref(project)
        : null,
    },
    { headers },
  );
}

export async function GET(request: Request) {
  try {
    const auth = await student(request);
    if (auth.response) return auth.response;
    const { data, error } = await auth
      .client!.from("student_learning_projects")
      .select(LEARNING_PROJECT_COLUMNS)
      .eq("user_id", auth.user!.id)
      .maybeSingle();
    if (error) return unavailable();
    return response(data as LearningProject | null);
  } catch {
    return unavailable();
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await student(request);
    if (auth.response) return auth.response;
    const limited = rateLimitGuardResponse(
      await rateLimitByIp(request, "student-learning-project", {
        limit: 30,
        windowSeconds: 60,
        identifier: auth.user!.id,
      }),
    );
    if (limited) return limited;
    if (
      !(request.headers.get("content-type") ?? "").includes("application/json")
    ) {
      return NextResponse.json(
        { error: "invalid_request" },
        { status: 400, headers },
      );
    }
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 4096)
      return NextResponse.json(
        { error: "invalid_request" },
        { status: 400, headers },
      );
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "invalid_request" },
        { status: 400, headers },
      );
    }
    const project = parseLearningProject(body);
    if (
      !body ||
      (body.action !== "dismiss" && (body.action !== "save" || !project))
    ) {
      return NextResponse.json(
        { error: "invalid_request" },
        { status: 400, headers },
      );
    }
    const { error } = await auth.client!.rpc("save_student_learning_project", {
      p_action: body.action,
      ...(body.action === "save" && project
        ? {
            p_subject: project.subject,
            p_audience: project.audience,
            p_format: project.format,
            p_city: project.city,
          }
        : {}),
    });
    if (error) return unavailable();
    const saved = await auth
      .client!.from("student_learning_projects")
      .select(LEARNING_PROJECT_COLUMNS)
      .eq("user_id", auth.user!.id)
      .single();
    if (saved.error) return unavailable();
    return response(saved.data as LearningProject);
  } catch {
    return unavailable();
  }
}
