import { notFound, permanentRedirect } from "next/navigation";
import { findCityBySlug } from "@/lib/constants/cities";
import { buildCityHubPath } from "@/lib/seo/localTeacherDiscoveryPages";

/** Legacy Gemini city hub path → canonical /tuteurs/[citySlug]. */
export default async function LegacyCityTutorsRedirect({
  params,
}: {
  params: Promise<{ citySlug: string }>;
}) {
  const { citySlug } = await params;
  if (!findCityBySlug(citySlug)) notFound();
  permanentRedirect(buildCityHubPath(citySlug));
}
