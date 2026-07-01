import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { logError } from "@/lib/log";
import { rateLimitByIp, rateLimitGuardResponse } from "@/lib/rateLimit";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { validateJsonBody } from "@/lib/validation/api";
import { aiDescriptionPostSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

type PromptInput = {
  discipline: string;
  specialite: string;
  notes: string;
  tone: "neutral" | "warm" | "professional" | "shorter";
  locale: "fr" | "en" | "es";
};

function buildPrompt({ discipline, specialite, notes, tone, locale }: PromptInput): string {
  // Per-locale subject/objective copy so the response comes back in the teacher's UI language.
  const intro =
    locale === "en"
      ? `Write a short, public profile bio for a private tutor of ${discipline}${
          specialite ? `, specialty: ${specialite}` : ""
        }. Maximum 150 words. First person. Mention experience, teaching approach, and what the student will achieve. Plain text only, no markdown, no greeting, no signature.`
      : locale === "es"
        ? `Escribe una biografía pública corta para un profesor particular de ${discipline}${
            specialite ? `, especialidad: ${specialite}` : ""
          }. Máximo 150 palabras. En primera persona. Menciona la experiencia, el enfoque pedagógico y lo que el estudiante logrará. Solo texto plano, sin markdown, sin saludo, sin firma.`
        : `Génère une description publique courte pour un professeur particulier de ${discipline}${
            specialite ? `, spécialité : ${specialite}` : ""
          }. Maximum 150 mots. À la première personne. Mentionne l'expérience, l'approche pédagogique et ce que l'élève va accomplir. Texte brut uniquement, sans markdown, sans salutation, sans signature.`;

  const toneInstruction = (() => {
    if (tone === "warm") {
      return locale === "en"
        ? " Tone: warm, welcoming, encouraging."
        : locale === "es"
          ? " Tono: cálido, acogedor, alentador."
          : " Ton : chaleureux, accueillant, encourageant.";
    }
    if (tone === "professional") {
      return locale === "en"
        ? " Tone: professional, precise, confident."
        : locale === "es"
          ? " Tono: profesional, preciso, seguro."
          : " Ton : professionnel, précis, assuré.";
    }
    if (tone === "shorter") {
      return locale === "en"
        ? " Make it noticeably shorter than the input. Aim for 60–80 words."
        : locale === "es"
          ? " Hazlo notablemente más corto que la entrada. Apunta a 60–80 palabras."
          : " Rends-le nettement plus court que l'entrée. Vise 60–80 mots.";
    }
    return "";
  })();

  const notesInstruction = notes.trim().length === 0
    ? ""
    : locale === "en"
      ? `\n\nThe teacher provided these rough notes. IMPROVE them into a polished bio without inventing facts:\n"""${notes.trim()}"""`
      : locale === "es"
        ? `\n\nEl profesor proporcionó estas notas. MEJÓRALAS para crear una biografía pulida sin inventar datos:\n"""${notes.trim()}"""`
        : `\n\nLe professeur a fourni ces notes. AMÉLIORE-les en une bio soignée sans inventer de faits :\n"""${notes.trim()}"""`;

  return `${intro}${toneInstruction}${notesInstruction}`;
}

function extractAnthropicText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const content = (data as { content?: unknown[] }).content;
  if (!Array.isArray(content)) return "";
  for (const block of content) {
    if (block && typeof block === "object" && "text" in block && typeof (block as { text: string }).text === "string") {
      return (block as { text: string }).text;
    }
  }
  return "";
}

async function getSupabaseForRequest(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    return { supabase: createClient(url, anonKey), token };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const c of cookiesToSet) {
          cookieStore.set(c.name, c.value, c.options);
        }
      },
    },
  });
  return { supabase, token: null };
}

export async function POST(request: Request) {
  const auth = await getSupabaseForRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
  }

  const { supabase, token } = auth;
  const {
    data: { user },
    error: userErr,
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Teacher access must be verified server-side. Bearer-authenticated requests
  // previously queried `profiles` with an anon client (no JWT on PostgREST), so
  // RLS returned null and every teacher was rejected with 403.
  const admin = getSupabaseAdmin();
  const [{ data: profile, error: profErr }, { data: teacherRow, error: teacherErr }] =
    await Promise.all([
      admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      admin.from("teachers").select("id").eq("user_id", user.id).maybeSingle(),
    ]);

  if (profErr || teacherErr) {
    return NextResponse.json(
      { error: profErr?.message ?? teacherErr?.message ?? "Erreur serveur." },
      { status: 500 },
    );
  }

  const profileRole = (profile as { role?: string | null } | null)?.role;
  const isTeacher = profileRole === "teacher" || Boolean(teacherRow?.id);
  if (!isTeacher) {
    return NextResponse.json({ error: "Réservé aux professeurs." }, { status: 403 });
  }

  // NOTE: AI profile help is intentionally available BOTH during first onboarding
  // (Teacher Launch Center) AND afterwards (account edit, Trust & Visibility
  // bio helpers). The previous gate that returned 403 once
  // `teacher_onboarding_complete === true` was removed for that reason.
  // Rate limiting + auth + teacher-role check still apply.

  const validated = await validateJsonBody(aiDescriptionPostSchema, request);
  if (!validated.ok) return validated.response;
  const { discipline, specialite, notes, tone, locale } = validated.data;

  const rl = await rateLimitByIp(request, "ai-description", {
    limit: 10,
    windowSeconds: 3600,
    identifier: user.id,
  });
  const rateLimited = rateLimitGuardResponse(rl);
  if (rateLimited) return rateLimited;

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Clé Anthropic non configurée.", code: "anthropic_key_missing" },
      { status: 503 },
    );
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: buildPrompt({ discipline, specialite, notes, tone, locale }),
        },
      ],
    }),
  });

  if (!response.ok) {
    let err: unknown;
    try {
      err = await response.json();
    } catch {
      err = await response.text();
    }
    logError("[ai/description] Anthropic error", {
      status: response.status,
      body: err,
    });
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }

  const data = (await response.json()) as unknown;
  const description = extractAnthropicText(data).trim();

  return NextResponse.json({ description });
}
