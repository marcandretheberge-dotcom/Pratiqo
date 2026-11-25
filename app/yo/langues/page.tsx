import type { Metadata } from "next";
import { YoAppHeader } from "@/components/yo/YoAppHeader";
import { YoAppShell, YoAppShellScroller } from "@/components/yo/YoAppShell";
import { YoDesktopAppWorkspace } from "@/components/yo/YoDesktopAppWorkspace";
import { YoLanguageQuickStart } from "@/components/yo/YoLanguageQuickStart";
import { YoDocumentLanguage } from "@/components/yo/YoDocumentLanguage";
import { getYoLocale, lstr, t } from "@/lib/yo/localize";
import { buildYoCatalogItemList, buildYoPratiqoMetadata } from "@/lib/yo/yopratiqoSeo";
import { serializeJsonLd } from "@/lib/seo/jsonLd";

export const dynamic = "force-dynamic";
interface PageProps { searchParams: Promise<{ lang?: string | string[] }> }
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  return buildYoPratiqoMetadata("languageHub", params.lang);
}

export default async function YoLanguesPage({ searchParams }: PageProps) {
  const locale = getYoLocale((await searchParams).lang);
  const langSuffix = locale === "fr" ? "" : `?lang=${locale}`;
  const title = t(lstr("Langues", "Languages", "Idiomas"), locale);
  return <div data-testid="yo-langues-catalog" data-yo-langues-catalog="true" lang={locale}>
    <YoDocumentLanguage locale={locale} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildYoCatalogItemList(locale)) }} />
    <YoAppShell surfaceId="langues" background="bg-[#FAFCFB]" header={
      <div data-testid="yo-langues-catalog-header"><YoAppHeader locale={locale}
        backHref={`/yo${langSuffix}`}
        backLabel={t(lstr("Retour à YoPratiqo", "Back to YoPratiqo", "Volver a YoPratiqo"), locale)}
        title={title} selectorPath="/yo/langues" surfaceId="langues" /></div>
    }>
      <YoAppShellScroller>
        <YoDesktopAppWorkspace surfaceId="langues" centerMaxWidth="none" center={
          <div className="mx-auto w-full max-w-5xl py-3">
            <h1 className="mb-5 text-sm font-semibold text-emerald-900">{title}</h1>
            <YoLanguageQuickStart locale={locale} />
          </div>
        } />
      </YoAppShellScroller>
    </YoAppShell>
  </div>;
}
