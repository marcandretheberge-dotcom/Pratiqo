import { AlertCircle } from "lucide-react";

import { lstr, t } from "@/lib/yo/localize";
import type { YoLocale } from "@/lib/yo/types";

const TITLE = lstr("Cadre éducatif", "Educational scope");

const BODY = lstr(
  "YoPratiqo est une préparation éducative autonome. Le module ne garantit pas la maîtrise d’une langue, la réussite d’un examen, un résultat d’immigration ou un emploi. Les contenus ne constituent pas un conseil juridique, administratif ou d’immigration.",
  "YoPratiqo is self-paced educational preparation. The module does not guarantee language fluency, exam success, immigration outcomes, or employment. Content is not legal, administrative, or immigration advice.",
);

export function YoLegalDisclaimer({ locale }: { locale: YoLocale }) {
  return (
    <aside className="rounded-2xl border border-[#0F6E56]/12 bg-white/80 p-4 text-sm leading-relaxed text-[#0F6E56]/78">
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
