import { createRequire } from "node:module";
const load = createRequire(import.meta.url);
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
load("tsx/cjs");
const { NextResponse } = load("next/server");

function loadRoute(file, dependencies) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("require", "module", "exports", output)(
    (name) => {
      if (name === "next/server") return { NextResponse };
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected route dependency: ${name}`);
    },
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}

(async () => {
  let role = "student",
    authenticated = true,
    readError = false,
    writeError = false,
    limited = false;
  let saved = null,
    calls = [],
    filters = [];
  const userId = "00000000-0000-4000-8000-000000000001";
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: authenticated ? { id: userId } : null },
        error: null,
      }),
    },
    from(table) {
      const query = {
        select() {
          return query;
        },
        eq(column, value) {
          filters.push([table, column, value]);
          return query;
        },
        async maybeSingle() {
          return {
            data: table === "profiles" ? { role } : saved,
            error:
              readError && table !== "profiles"
                ? { code: "unavailable" }
                : null,
          };
        },
        async single() {
          return query.maybeSingle();
        },
      };
      return query;
    },
    async rpc(name, args) {
      calls.push({ name, args });
      if (writeError) return { error: { code: "unavailable" } };
      if (limited) return { error: { code: "PT429" } };
      saved =
        args.p_action === "dismiss"
          ? {
              subject: "",
              city: "",
              format: "in_person",
              audience: "self",
              completed_at: null,
              dismissed_at: "2026-10-18T12:00:00Z",
              updated_at: "2026-10-18T12:00:00Z",
            }
          : {
              subject: args.p_subject,
              city: args.p_city,
              audience: args.p_audience,
              format: args.p_format,
              completed_at: "2026-10-18T12:00:00Z",
              dismissed_at: null,
              updated_at: "2026-10-18T12:00:00Z",
            };
      return { error: null };
    },
  };
  const route = loadRoute("app/api/student/learning-project/route.ts", {
    "@/lib/auth/supabaseRouteClient": {
      getSupabaseForRequest: async () => client,
    },
    "@/lib/studentLearningProject": load(
      path.resolve("lib/studentLearningProject.ts"),
    ),
  });
  const request = (body, token = "Bearer fixture") =>
    new Request("https://example.test/api/student/learning-project", {
      method: body === undefined ? "GET" : "PUT",
      headers: {
        ...(token ? { Authorization: token } : {}),
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  assert.equal((await route.GET(request(undefined, ""))).status, 401);
  assert.equal(
    (await route.PUT(request({ action: "dismiss" }, "bearer fixture"))).status,
    401,
  );
  authenticated = false;
  assert.equal((await route.GET(request())).status, 401);
  authenticated = true;
  role = "teacher";
  assert.equal((await route.GET(request())).status, 403);
  role = "student";
  const empty = await route.GET(request());
  assert.equal(empty.status, 200);
  assert.equal((await empty.json()).project, null);
  assert.match(empty.headers.get("cache-control"), /no-store/);
  assert.equal(calls.length, 0, "GET never writes");
  readError = true;
  assert.equal((await route.GET(request())).status, 503);
  readError = false;
  assert.equal(
    (await route.PUT(request({ action: "save", subject: "Piano" }))).status,
    400,
  );
  assert.equal((await route.PUT(request(null))).status, 400);
  const body = {
    action: "save",
    subject: "Espagnol",
    audience: "self",
    format: "online",
    city: "ignored",
    user_id: "another-user",
    alertConsent: true,
  };
  const savedResponse = await route.PUT(request(body));
  assert.equal(savedResponse.status, 200);
  assert.equal((await savedResponse.json()).project.city, "");
  assert.deepEqual(calls.at(-1), {
    name: "save_student_learning_project_v2",
    args: {
      p_action: "save",
      p_subject: "Espagnol",
      p_audience: "self",
      p_format: "online",
      p_city: "",
    },
  });
  assert.ok(
    filters
      .filter(([table]) => table === "student_learning_projects")
      .every(([, column, value]) => column === "user_id" && value === userId),
  );
  writeError = true;
  assert.equal((await route.PUT(request(body))).status, 503);
  writeError = false;
  limited = true;
  const count = calls.length;
  const limitedResponse = await route.PUT(request(body));
  assert.equal(limitedResponse.status, 429);
  assert.equal(limitedResponse.headers.get("Retry-After"), "60");
  assert.match(limitedResponse.headers.get("Cache-Control"), /no-store/);
  assert.equal(calls.length, count + 1, "quota enforced by the database RPC");
  limited = false;
  assert.equal((await route.PUT(request({ action: "dismiss" }))).status, 200);

  let adminAllowed = false,
    rpcCalls = 0;
  const adminRoute = loadRoute(
    "app/api/admin/learning-project-demand/route.ts",
    {
      "@/lib/auth/admin": {
        requireAdminApi: async () =>
          adminAllowed
            ? {
                status: "ok",
                admin: {
                  rpc: async () => {
                    rpcCalls++;
                    return {
                      data: {
                        totalAccounts: 1,
                        declaredAccounts: 1,
                        deferredAccounts: 0,
                        unansweredAccounts: 0,
                        groups: [
                          {
                            subject: "Espagnol",
                            city: "",
                            format: "online",
                            audience: "self",
                            account_count: 1,
                            updated_at: "2026-10-18T12:00:00Z",
                          },
                        ],
                      },
                      error: null,
                    };
                  },
                  from: () => ({
                    select: async () => ({
                      data: null,
                      error: { code: "unavailable" },
                    }),
                  }),
                },
              }
            : {
                status: "error",
                response: NextResponse.json(
                  { error: "forbidden" },
                  { status: 403 },
                ),
              },
      },
      "@/lib/admin/learningProjectDemand": load(
        path.resolve("lib/admin/learningProjectDemand.ts"),
      ),
      "@/lib/learnerDemandSupply": {
        loadLearnerDemandSupply: async () => {
          throw new Error("must not load failed supply");
        },
      },
      "@/lib/supabase/queries": {
        TEACHERS_LIST_SELECT: "id",
        TEACHERS_PUBLIC_TABLE: "teachers_public",
      },
      "@/lib/teacherMapper": {
        isLaunchEligibleTeacherRow: () => true,
        teacherRowToTeacher: (row) => row,
      },
    },
  );
  assert.equal((await adminRoute.GET(request())).status, 403);
  assert.equal(rpcCalls, 0);
  adminAllowed = true;
  const adminResponse = await adminRoute.GET(request());
  assert.equal(adminResponse.status, 200);
  const overview = (await adminResponse.json()).overview;
  assert.equal(overview.declaredAccounts, 1);
  assert.equal(overview.groups[0].supply, "unavailable");
  assert.equal(overview.groups[0].matchingTeachers, null);
  let access = "student", directoryCalls = [], directoryFails = false;
  const directoryRoute = loadRoute("app/api/admin/learning-project-students/route.ts", {
    "@/lib/auth/admin": { requireAdminApi: async () => access === "admin" ? {
      status: "ok", admin: { rpc: async (name, args) => {
        directoryCalls.push({ name, args });
        return directoryFails ? { error: { code: "unavailable" } } :
          { data: { students: [], page: args.p_page, pageSize: 25, total: 0 }, error: null };
      } },
    } : { status: "error", response: NextResponse.json({ error: "denied" }, { status: access === "anonymous" ? 401 : 403 }) } },
    "@/lib/admin/studentLearningDirectory": load(path.resolve("lib/admin/studentLearningDirectory.ts")),
  });
  for (const deniedRole of ["anonymous", "student", "teacher"]) {
    access = deniedRole;
    const denied = await directoryRoute.GET(request());
    assert.equal(denied.status, deniedRole === "anonymous" ? 401 : 403);
    assert.match(denied.headers.get("Cache-Control"), /private, no-store/);
  }
  assert.equal(directoryCalls.length, 0, "no private data query before admin authorization");
  access = "admin";
  const directoryRequest = search => new Request(`https://example.test/api/admin/learning-project-students?${search}`);
  for (const invalid of ["page=0", "page=-1", "page=1.5", "page=100001", "status=teacher", `q=${"a".repeat(121)}`]) {
    assert.equal((await directoryRoute.GET(directoryRequest(invalid))).status, 400);
  }
  const listing = await directoryRoute.GET(directoryRequest("q=St-Georges&status=unanswered&page=2"));
  assert.equal(listing.status, 200);
  assert.match(listing.headers.get("Cache-Control"), /private, no-store/);
  assert.deepEqual(directoryCalls.at(-1), { name: "admin_student_learning_project_directory", args: {
    p_query: "St-Georges", p_status: "unanswered", p_page: 2,
  } });
  directoryFails = true;
  const failedList = await directoryRoute.GET(directoryRequest(""));
  assert.equal(failedList.status, 503);
  assert.equal((await failedList.json()).directory, undefined, "failure cannot impersonate an empty list");
  console.log(
    "PASS actual route handlers: auth/role checks, owner binding, read-only GET, invalid input, save failure, rate limit, private admin aggregation, unknown supply",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
