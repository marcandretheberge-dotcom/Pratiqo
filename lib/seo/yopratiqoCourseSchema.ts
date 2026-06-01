import { SITE_URL } from "@/lib/seo/site";

export type YopratiqoCourseSchemaInput = {
  name: string;
  description: string;
  url: string;
  inLanguage: string;
  educationalLevel: string;
  isAccessibleForFree: boolean;
  teaches?: readonly string[];
  about?: readonly string[];
};

export type YopratiqoCourseSchema = {
  "@context": "https://schema.org";
  "@type": "Course";
  name: string;
  description: string;
  provider: {
    "@type": "Organization";
    name: "Pratiqo";
    legalName: "Cours Pratiqo Inc.";
    url: typeof SITE_URL;
  };
  url: string;
  inLanguage: string;
  educationalLevel: string;
  isAccessibleForFree: boolean;
  teaches?: readonly string[];
  about?: readonly string[];
};

function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  return `${SITE_URL}${normalizedPath}`;
}

export function buildYopratiqoCourseSchema(
  input: YopratiqoCourseSchemaInput,
): YopratiqoCourseSchema {
  const schema: YopratiqoCourseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: input.name,
    description: input.description,
    provider: {
      "@type": "Organization",
      name: "Pratiqo",
      legalName: "Cours Pratiqo Inc.",
      url: SITE_URL,
    },
    url: absoluteUrl(input.url),
    inLanguage: input.inLanguage,
    educationalLevel: input.educationalLevel,
    isAccessibleForFree: input.isAccessibleForFree,
  };

  if (input.teaches?.length) {
    schema.teaches = input.teaches;
  }

  if (input.about?.length) {
    schema.about = input.about;
  }

  return schema;
}
