import { t } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/types";

export function LandingSkipLink({ locale }: { locale: Locale }) {
  return (
    <a href="#main-content" className="skip-link">
      {t(locale, "skipToMainContent")}
    </a>
  );
}
