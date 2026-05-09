import { getLocale } from "@/lib/i18n/server";
import { LandingOrgJsonLd } from "@/components/marketing/LandingOrgJsonLd";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { LandingSkipLink } from "@/components/marketing/LandingSkipLink";
import { LandingFooter } from "@/components/marketing/LandingFooter";
import { LandingHeroStatic } from "@/components/marketing/LandingHeroStatic";
import { LandingAuthGate } from "@/components/marketing/LandingAuthGate";
import { LandingPageClient } from "./LandingPageClient";

export default async function LandingPage() {
  const locale = await getLocale();
  return (
    <LandingAuthGate>
      <div className="relative flex min-h-[100dvh] flex-col bg-[#FAFCFB]">
        <LandingOrgJsonLd />
        <LandingHeader />
        <LandingSkipLink locale={locale} />
        <main id="main-content">
          <LandingPageClient>
            <LandingHeroStatic locale={locale} />
          </LandingPageClient>
        </main>
        <LandingFooter />
      </div>
    </LandingAuthGate>
  );
}
