import { redirect } from "next/navigation";
import { buildCityHubPath } from "@/lib/seo/localTeacherDiscoveryPages";

/** Legacy Gemini city hub path → canonical /tuteurs/[citySlug]. */
export default async function LegacyCityTutorsRedirect({
  params,
}: {
  params: Promise<{ citySlug: string }>;
}) {
  const { citySlug } = await params;
  redirect(buildCityHubPath(citySlug));
}
