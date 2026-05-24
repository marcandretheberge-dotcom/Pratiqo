import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/lib/seo/site";

type Search = Record<string, string | string[] | undefined>;

const PRESERVED_KEYS = ["source", "utm_source", "utm_medium", "utm_campaign"] as const;

export const metadata: Metadata = {
  title: "Devenir tuteur sur Pratiqo",
  description: "Rejoignez Pratiqo comme tuteur fondateur.",
  alternates: {
    canonical: `${SITE_URL}/devenir-professeur?vertical=academique`,
  },
};

function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export default async function DevenirTuteurPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  query.set("vertical", "academique");
  for (const key of PRESERVED_KEYS) {
    const value = firstParam(params[key]);
    if (value) query.set(key, value.slice(0, 160));
  }
  redirect(`/devenir-professeur?${query.toString()}`);
}
