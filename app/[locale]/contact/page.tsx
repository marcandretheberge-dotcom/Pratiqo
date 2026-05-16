import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPublicLayout } from "@/components/marketing/MarketingPublicLayout";
import { withLocaleHref } from "@/lib/i18n/marketingPaths";
import { normalizeLocale } from "@/lib/i18n/types";

export const metadata: Metadata = {
  title: "Contact | Pratiqo",
  description: "Contactez Pratiqo — support utilisateur, questions générales et partenariats.",
};

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: loc } = await params;
  const locale = normalizeLocale(loc);
  const homeHref = withLocaleHref("/", locale);

  return (
    <MarketingPublicLayout className="bg-[#FAFCFB]">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold text-[#2C2C2A]">Contact</h1>
        <p className="mb-8 text-[#6B6A65]">On est là pour toi. Choisis le bon canal selon ta question.</p>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6">
            <h2 className="mb-2 text-lg font-bold text-[#2C2C2A]">🛟 Besoin d&apos;aide ?</h2>
            <p className="mb-3 text-sm text-[#555550]">
              Question sur ton compte, problème technique, ou aide pour réserver un cours ?
            </p>
            <a
              href="mailto:support@pratiqo.ca"
              className="inline-flex items-center font-semibold text-teal-700 hover:underline"
            >
              support@pratiqo.ca →
            </a>
          </div>

          <div className="rounded-2xl border border-[#E8E6DF] bg-white p-6">
            <h2 className="mb-2 text-lg font-bold text-[#2C2C2A]">📩 Questions générales</h2>
            <p className="mb-3 text-sm text-[#555550]">
              Partenariats, presse, opportunités d&apos;affaires, ou simplement nous dire bonjour.
            </p>
            <a
              href="mailto:info@pratiqo.ca"
              className="inline-flex items-center font-semibold text-teal-700 hover:underline"
            >
              info@pratiqo.ca →
            </a>
          </div>

          <div className="rounded-2xl border border-[#E8E6DF] bg-[#F1EFE8] p-6">
            <h2 className="mb-2 text-lg font-bold text-[#2C2C2A]">🌍 Pratiqo</h2>
            <p className="text-sm text-[#555550]">
              La plateforme québécoise pour apprendre, ici.
              <br />
              D&apos;ici, pour ici.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--p-border-light)] pt-6">
          <Link
            href={homeHref}
            className="text-sm text-[var(--p-text-muted)] transition-colors hover:text-teal-700"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </MarketingPublicLayout>
  );
}
