import { SITE_NAME, SITE_URL } from "@/lib/seo/config";
import { serializeJsonLd } from "@/lib/seo/jsonLd";

export const ALLOWED_SEO_SCHEMA_TYPES = [
  "Article",
  "BreadcrumbList",
  "CollectionPage",
  "FAQPage",
  "ItemList",
  "ListItem",
  "Organization",
  "Person",
  "ProfilePage",
  "Service",
  "WebSite",
] as const;

export const FORBIDDEN_UNSUPPORTED_SCHEMA_CLAIMS = [
  "AggregateRating",
  "Review",
  "Offer",
  "offers",
  "priceRange",
  "availability",
  "streetAddress",
  "latitude",
  "longitude",
  "guarantee",
  "certification",
] as const;

function collectValues(value: unknown, out: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectValues(item, out);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out.push(key);
    if (typeof nested === "string") out.push(nested);
    collectValues(nested, out);
  }
}

export function findUnsupportedStructuredDataClaims(schema: unknown): string[] {
  const values: string[] = [];
  collectValues(schema, values);
  const serialized = values.join("\n");
  return FORBIDDEN_UNSUPPORTED_SCHEMA_CLAIMS.filter((claim) => serialized.includes(claim));
}

export function hasUnsupportedStructuredDataClaims(schema: unknown): boolean {
  return findUnsupportedStructuredDataClaims(schema).length > 0;
}

export function buildBreadcrumbListJsonLd(items: Array<{ name: string; href: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href.startsWith("http") ? item.href : `${SITE_URL}${item.href}`,
    })),
  };
}

export function buildWebsiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export function serializeSafeJsonLd(schema: unknown): string {
  const unsupported = findUnsupportedStructuredDataClaims(schema);
  if (unsupported.length > 0) {
    throw new Error(`Unsupported SEO structured-data claim: ${unsupported.join(", ")}`);
  }
  return serializeJsonLd(schema);
}
