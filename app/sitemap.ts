import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://pratiqo.ca",                        lastModified: new Date(), priority: 1.0 },
    { url: "https://pratiqo.ca/become-teacher",         lastModified: new Date(), priority: 0.9 },
    { url: "https://pratiqo.ca/student/search",         lastModified: new Date(), priority: 0.9 },
    { url: "https://pratiqo.ca/legal/cgu",              lastModified: new Date(), priority: 0.5 },
    { url: "https://pratiqo.ca/legal/confidentialite",  lastModified: new Date(), priority: 0.5 },
    { url: "https://pratiqo.ca/legal/annulation",       lastModified: new Date(), priority: 0.5 },
  ];
}
