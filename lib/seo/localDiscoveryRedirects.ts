import { QC_CITIES } from "../constants/cities";
import { DISCIPLINES } from "./disciplines";
import { SITE_URL } from "./config";

// Restrict the legacy families to actual registry entries, never arbitrary slugs.
export function localDiscoveryRedirects() {
  const city = `:citySlug(${QC_CITIES.map((entry) => entry.slug).join("|")})`;
  const discipline = `:disciplineSlug(${DISCIPLINES.map((entry) => entry.slug).join("|")})`;
  return [
    {
      source: `/:locale(fr|en|es)/cours/${discipline}/${city}`,
      destination: `${SITE_URL}/cours/:disciplineSlug/:citySlug`,
      permanent: true,
    },
    ...["", "/:locale(fr|en|es)"].map((prefix) => ({
      source: `${prefix}/tuteurs-prive/${city}`,
      destination: `${SITE_URL}/tuteurs/:citySlug`,
      permanent: true,
    })),
  ];
}
