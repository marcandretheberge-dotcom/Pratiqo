import type { MetadataRoute } from "next";

export const PRATIQO_PWA_THEME_COLOR = "#1D9E75";
export const PRATIQO_PWA_BACKGROUND_COLOR = "#ffffff";

export const PRATIQO_WEB_MANIFEST: MetadataRoute.Manifest = {
  name: "Pratiqo",
  short_name: "Pratiqo",
  description: "Trouvez et réservez des professeurs indépendants près de chez vous.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  lang: "fr-CA",
  background_color: PRATIQO_PWA_BACKGROUND_COLOR,
  theme_color: PRATIQO_PWA_THEME_COLOR,
  categories: ["education", "lifestyle", "productivity"],
  icons: [
    {
      src: "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      src: "/icons/icon-512.png",
      sizes: "512x512",
      type: "image/png",
    },
    {
      src: "/icons/icon-192-maskable.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "/icons/icon-512-maskable.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
};
