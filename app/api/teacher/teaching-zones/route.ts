import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mapTeacherTeachingZoneRow, TEACHING_ZONE_KINDS, type TeacherTeachingZonePublicRow } from "@/lib/teacherTeachingZones";

export const runtime = "nodejs";

const zoneSchema = z
  .object({
    id: z.string().uuid().optional(),
    labelPublic: z.string().trim().min(2).max(120),
    city: z.string().trim().min(2).max(120),
    region: z.string().trim().max(80).optional().nullable(),
    countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
    lat: z.coerce.number().finite().min(-90).max(90).optional().nullable(),
    lng: z.coerce.number().finite().min(-180).max(180).optional().nullable(),
    radiusKm: z.coerce.number().int().min(1).max(100).optional().default(10),
    zoneKind: z.enum(TEACHING_ZONE_KINDS).optional().default("service_area"),
    isPrimary: z.coerce.boolean().optional().default(false),
    isActive: z.coerce.boolean().optional().default(true),
    sortOrder: z.coerce.number().int().min(0).max(100).optional().default(0),
    availabilityNotePublic: z.string().trim().max(160).optional().nullable(),
    supportsAtTeacherPlace: z.coerce.boolean().optional().default(false),
    supportsAtStudentPlace: z.coerce.boolean().optional().default(true),
    supportsPublicPlace: z.coerce.boolean().optional().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasLat = typeof value.lat === "number";
    const hasLng = typeof value.lng === "number";
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lat"],
        message: "lat and lng must be provided together.",
      });
    }
  });

const bodySchema = z
  .object({
    zones: z.array(zoneSchema).max(3),
  })
  .strict();

async function getAuthenticatedTeacher(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return {
      error: NextResponse.json({ error: "Missing Authorization bearer token.", code: "unauthorized" }, { status: 401 }),
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return {
      error: NextResponse.json({ error: "Missing Supabase env.", code: "server_error" }, { status: 500 }),
    };
  }

  const supabaseUser = createClient(url, anonKey);
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser(token);
  if (userErr || !user) {
    return {
      error: NextResponse.json({ error: "Invalid or expired session.", code: "unauthorized" }, { status: 401 }),
    };
  }

  const admin = getSupabaseAdmin();
  const { data: teacher, error: teacherErr } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (teacherErr || !teacher?.id) {
    return {
      error: NextResponse.json({ error: "Teacher profile not found.", code: "teacher_not_found" }, { status: 404 }),
    };
  }

  return { teacherId: String(teacher.id), admin };
}

function normalizeZones(zones: z.infer<typeof zoneSchema>[]) {
  const activeZones = zones.filter((zone) => zone.isActive !== false);
  if (activeZones.length > 3) {
    return { error: "too_many_active_zones" as const, zones: [] };
  }
  const primaryCount = activeZones.filter((zone) => zone.isPrimary).length;
  if (primaryCount > 1) {
    return { error: "multiple_primary_zones" as const, zones: [] };
  }
  const firstActiveIndex = zones.findIndex((zone) => zone.isActive !== false);
  const normalized = zones.map((zone, index) => ({
    label_public: zone.labelPublic,
    city: zone.city,
    region: zone.region?.trim() || null,
    country_code: zone.countryCode,
    lat_public: zone.lat ?? null,
    lng_public: zone.lng ?? null,
    radius_km: zone.radiusKm,
    zone_kind: zone.zoneKind,
    is_primary: zone.isActive !== false && (zone.isPrimary || (primaryCount === 0 && index === firstActiveIndex)),
    is_active: zone.isActive !== false,
    sort_order: zone.sortOrder ?? index,
    availability_note_public: zone.availabilityNotePublic?.trim() || null,
    supports_at_teacher_place: zone.supportsAtTeacherPlace,
    supports_at_student_place: zone.supportsAtStudentPlace,
    supports_public_place: zone.supportsPublicPlace,
  }));
  return { error: null, zones: normalized };
}

export async function GET(req: Request) {
  const auth = await getAuthenticatedTeacher(req);
  if ("error" in auth && auth.error) return auth.error;
  const { teacherId, admin } = auth;

  const { data, error } = await admin
    .from("teacher_teaching_zones")
    .select(
      "id, teacher_id, label_public, city, region, country_code, lat_public, lng_public, radius_km, zone_kind, is_primary, sort_order, availability_note_public, supports_at_teacher_place, supports_at_student_place, supports_public_place",
    )
    .eq("teacher_id", teacherId)
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Unable to load teaching zones.", code: "server_error" }, { status: 500 });
  }

  return NextResponse.json({
    zones: ((data ?? []) as TeacherTeachingZonePublicRow[]).map(mapTeacherTeachingZoneRow),
  });
}

export async function PUT(req: Request) {
  const auth = await getAuthenticatedTeacher(req);
  if ("error" in auth && auth.error) return auth.error;
  const { teacherId, admin } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "invalid_payload" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten(), code: "validation_error" }, { status: 400 });
  }

  const normalized = normalizeZones(parsed.data.zones);
  if (normalized.error) {
    return NextResponse.json({ error: normalized.error, code: normalized.error }, { status: 400 });
  }

  const { data, error } = await admin.rpc("replace_teacher_teaching_zones", {
    p_teacher_id: teacherId,
    p_zones: normalized.zones,
  });

  if (error) {
    return NextResponse.json({ error: "Unable to save teaching zones.", code: "server_error" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    zones: ((data ?? []) as TeacherTeachingZonePublicRow[]).map(mapTeacherTeachingZoneRow),
  });
}
