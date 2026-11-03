import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getYoLocale } from "@/lib/yo/localize";
import { getMandarinUnit } from "@/lib/yo/mandarin/course";
import { MandarinCoursePlayer } from "@/components/yo/mandarin/MandarinCoursePlayer";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ unit: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const unit = getMandarinUnit((await params).unit);
  return {
    title:
      (unit?.title[getYoLocale((await searchParams).lang)] ?? "中文") +
      " | YoPratiqo",
    robots: { index: false, follow: true },
  };
}
export default async function Page({ params, searchParams }: Props) {
  const unit = getMandarinUnit((await params).unit);
  if (!unit) notFound();
  return (
    <MandarinCoursePlayer
      key={unit.id}
      unit={unit}
      locale={getYoLocale((await searchParams).lang)}
    />
  );
}
