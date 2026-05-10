import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Parse JSON from a Request body. Returns `null` on empty/invalid JSON (not an object/array/primitive from valid JSON).
 */
export async function parseJsonBody(request: Request): Promise<unknown | null> {
  try {
    const text = await request.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function formatZodIssues(err: z.ZodError): { error: string; fields: Record<string, string[]> } {
  const fields: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_root";
    if (!fields[key]) fields[key] = [];
    fields[key].push(issue.message);
  }
  const first = err.issues[0]?.message ?? "Invalid request.";
  return { error: first, fields };
}

/**
 * Parse JSON and validate with a Zod schema. Returns 400 for invalid JSON or failed validation (no stack traces).
 */
export async function validateJsonBody<S extends z.ZodType>(
  schema: S,
  request: Request,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: NextResponse }> {
  const raw = await parseJsonBody(request);
  if (raw === null) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const { error, fields } = formatZodIssues(parsed.error);
    const payload: { error: string; fields?: Record<string, string[]> } = { error };
    if (Object.keys(fields).length > 0) payload.fields = fields;
    return {
      ok: false,
      response: NextResponse.json(payload, { status: 400 }),
    };
  }
  return { ok: true, data: parsed.data };
}
