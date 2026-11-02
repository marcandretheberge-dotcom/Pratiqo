import { redirect } from "next/navigation";
import { getYoLocale } from "@/lib/yo/localize";
import { portugueseCourseHref } from "@/lib/yo/portuguese/courseLogic";
export default async function GermanEntry({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  redirect(portugueseCourseHref(getYoLocale((await searchParams).lang)));
}
