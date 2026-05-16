import { redirect } from "next/navigation";
import { withLocale } from "@/lib/i18n/routing";
import { normalizeLocale } from "@/lib/i18n/types";

export default async function CommunityStandardsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: loc } = await params;
  const locale = normalizeLocale(loc);
  redirect(withLocale("/charte-de-confiance", locale));
}
