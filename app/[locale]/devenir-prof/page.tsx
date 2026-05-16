import { redirect } from "next/navigation";
import { withLocale } from "@/lib/i18n/routing";
import { normalizeLocale } from "@/lib/i18n/types";

// Canonical teacher recruitment page is /devenir-enseignant.
// This URL supports ad campaigns and alternate search intents.
export default async function DevenirProfPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: loc } = await params;
  redirect(withLocale("/devenir-enseignant", normalizeLocale(loc)));
}
