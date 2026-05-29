import type { Metadata } from "next";

import { YopratiqoSeoLandingPage } from "@/components/seo/YopratiqoSeoLandingPage";
import {
  buildYoSpanishSeoMetadata,
  YO_SPANISH_SEO_PAGES,
} from "@/lib/seo/yopratiqoSpanishSeoPages";

const PAGE = YO_SPANISH_SEO_PAGES["apprendre-espagnol"];

export const metadata: Metadata = buildYoSpanishSeoMetadata("apprendre-espagnol");

export default function Page() {
  return <YopratiqoSeoLandingPage page={PAGE} />;
}
