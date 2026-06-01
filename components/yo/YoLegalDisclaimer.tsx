import { AlertCircle } from "lucide-react";

import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";

const TITLE = lstr("À garder en tête", "Good to know", "Para tener en cuenta");

const BODY = lstr(
  "YoPratiqo est une préparation éducative autonome. Il n’y a pas de garantie de maîtrise d’une langue, de réussite à un examen, de résultat d’immigration ou d’emploi. Les contenus ne sont pas des conseils juridiques ou d’immigration, et les réservations avec professeurs restent séparées sur la marketplace Pratiqo.",
  "YoPratiqo is self-paced educational preparation. There is no guarantee of language fluency, exam success, immigration outcomes, or employment. Content is not legal or immigration advice, and teacher marketplace bookings remain separate on Pratiqo.",
  "YoPratiqo es una preparación educativa autónoma. No se garantiza el dominio de un idioma, la aprobación de un examen, ningún resultado de inmigración ni de empleo. El contenido no constituye asesoramiento legal ni de inmigración, y las reservas con profesores se gestionan por separado en el marketplace Pratiqo.",
);

export function YoLegalDisclaimer({ locale }: { locale: YoLocale }) {
  return (
    <aside className="rounded-2xl border border-[#0F6E56]/12 bg-white/88 p-4 text-sm leading-relaxed text-[#0F6E56]/78 shadow-[0_8px_24px_rgba(15,58,52,0.05)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#DDF4F1] text-[#0F6E56]">
          <AlertCircle className="size-4" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-[#0F6E56]">{t(TITLE, locale)}</p>
          <p className="mt-1">{t(BODY, locale)}</p>
        </div>
      </div>
    </aside>
  );
}
