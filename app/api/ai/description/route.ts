import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { validateJsonBody } from "@/lib/validation/api";
import { aiDescriptionPostSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

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
    const supabase = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    return supabase;
  }

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
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
}

export async function POST(request: Request) {
  const supabase = await getSupabaseForRequest(request);
  if (!supabase) {
    return NextResponse.json({ error: "Configuration Supabase manquante." }, { status: 500 });
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("teacher_onboarding_complete, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  const row = profile as { teacher_onboarding_complete?: boolean | null; role?: string | null } | null;
  if (row?.role !== "teacher") {
    return NextResponse.json({ error: "Réservé aux professeurs." }, { status: 403 });
  }

  if (row?.teacher_onboarding_complete === true) {
    return NextResponse.json(
      { error: "Génération IA disponible seulement pendant l'onboarding" },
      { status: 403 },
    );
  }

  const validated = await validateJsonBody(aiDescriptionPostSchema, request);
  if (!validated.ok) return validated.response;
  const { discipline, specialite } = validated.data;

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Clé Anthropic non configurée." }, { status: 500 });
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
          content: `Génère une description professionnelle courte (maximum 150 mots) pour un professeur de ${discipline}${
            specialite ? " spécialisé en " + specialite : ""
          }. Ton chaleureux et professionnel, en français. Parle à la première personne. Mentionne l'expérience, l'approche pédagogique et ce que l'élève va accomplir. Retourne SEULEMENT la description, rien d'autre.`,
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
    console.error("[ai/description] Anthropic error:", err);
    return NextResponse.json({ error: "Erreur lors de la génération" }, { status: 500 });
  }

  const data = (await response.json()) as unknown;
  const description = extractAnthropicText(data).trim();

  return NextResponse.json({ description });
}
