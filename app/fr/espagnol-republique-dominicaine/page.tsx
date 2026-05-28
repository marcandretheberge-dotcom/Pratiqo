import type { Metadata } from "next";

import { YopratiqoSeoLandingPage } from "@/components/seo/YopratiqoSeoLandingPage";
import {
  buildYoSpanishSeoMetadata,
  YO_SPANISH_SEO_PAGES,
} from "@/lib/seo/yopratiqoSpanishSeoPages";

const PAGE = YO_SPANISH_SEO_PAGES["espagnol-republique-dominicaine"];

export const metadata: Metadata = buildYoSpanishSeoMetadata("espagnol-republique-dominicaine");

export default function Page() {
  return <YopratiqoSeoLandingPage page={PAGE} />;
}
