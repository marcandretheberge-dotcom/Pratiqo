import { redirect } from "next/navigation";
import { getYoLocale } from "@/lib/yo/localize";
import { germanCourseHref } from "@/lib/yo/german/courseLogic";
export default async function GermanEntry({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  redirect(germanCourseHref(getYoLocale((await searchParams).lang)));
}
