import type { Metadata } from "next";

import { YoPrintCard, YoPrintPageShell } from "@/components/yo/YoPrintPageShell";
import { getYoLocale, t } from "@/lib/yo/localize";
import { getPrintableResourceById } from "@/lib/yo/printableResources";

export const metadata: Metadata = {
  title: "Kit de survie Pratiqo - Poser une question sans bloquer",
  description:
    "Kit imprimable YoPratiqo pour pratiquer les amorces, mots-questions, reformulations et rythme au travail.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

export default async function FrenchQuebecLesson3SurvivalKitPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const locale = getYoLocale(params.lang);
  const suffix = locale === "fr" ? "" : `?lang=${locale}`;
  const resource = getPrintableResourceById("fr-qc-m1-l3-survival-kit");

  return (
    <YoPrintPageShell
      locale={locale}
      title={
        resource
          ? t(resource.title, locale)
          : "Kit de survie Pratiqo - Poser une question sans bloquer"
      }
      description={
        resource
          ? t(resource.description, locale)
          : "Une fiche imprimable pour pratiquer avant une vraie conversation au travail."
      }
      moduleLabel="YoPratiqo - Francais quebecois au travail"
      lessonLabel="Lecon 3"
      backHref={`/yo/langues/francais-quebec/module-1/lecon-3${suffix}`}
      backLabel={locale === "en" ? "Back to lesson" : locale === "es" ? "Volver a la leccion" : "Retour a la lecon"}
    >
      <YoPrintCard title="3 amorces sures">
        <ul className="grid gap-2">
          <li>Excuse-moi, j&apos;aurais une petite question.</li>
          <li>Aurais-tu deux minutes?</li>
          <li>Je veux pas te deranger, mais...</li>
        </ul>
      </YoPrintCard>

      <YoPrintCard title="4 mots-questions essentiels">
        <div className="grid grid-cols-1 gap-2 font-black sm:grid-cols-2">
          <p>Ou?</p>
          <p>A quelle heure?</p>
          <p>Qui?</p>
          <p>Comment?</p>
        </div>
      </YoPrintCard>

      <YoPrintCard title="3 facons de reformuler">
        <ul className="grid gap-2">
          <li>La reunion, c&apos;est quand?</li>
          <li>Je veux scanner. Comment je fais?</li>
          <li>La salle de pause, je la cherche. C&apos;est ou?</li>
        </ul>
      </YoPrintCard>

      <YoPrintCard title="Mini-script de travail">
        <p className="rounded-2xl bg-white p-4 print:border print:border-[#D8ECE6]">
          Excuse-moi... j&apos;aurais une petite question. C&apos;est ou, la salle de pause?
          <br />
          Si la personne repond &quot;Hein?&quot; : La salle de pause, je la cherche. C&apos;est ou?
        </p>
      </YoPrintCard>

      <YoPrintCard title="Rythme">
        <p>amorce + pause + question courte</p>
      </YoPrintCard>

      <YoPrintCard title="Pratique avec un prof">
        <p>
          Demandez a votre prof Pratiqo de simuler une question simple, une
          reformulation apres &quot;hein?&quot;, puis un ajustement de rythme et d&apos;intonation.
        </p>
      </YoPrintCard>
    </YoPrintPageShell>
  );
}
