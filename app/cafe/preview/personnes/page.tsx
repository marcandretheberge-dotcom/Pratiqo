import { notFound } from "next/navigation";
import { CafePeopleDemo } from "@/components/cafe/community/CafePeopleDemo";

export const metadata = { title: "PREVIEW · Café des langues", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function CafePeoplePreviewPage() {
  if (process.env.CAFE_COMMUNITY_PREVIEW_ENABLED !== "true" || process.env.VERCEL_ENV === "production") notFound();
  return <CafePeopleDemo />;
}
