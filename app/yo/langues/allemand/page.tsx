import type { Metadata } from "next";
import { YoCourseOverview } from "@/components/yo/YoCourseOverview";
import { buildYoPratiqoMetadata, resolveYoPratiqoPageLocale } from "@/lib/yo/yopratiqoSeo";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ lang?: string | string[] }> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  return buildYoPratiqoMetadata("germanLanding", params.lang);
}
export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  return <YoCourseOverview slug="allemand" locale={resolveYoPratiqoPageLocale("germanLanding", params.lang)} />;
}
