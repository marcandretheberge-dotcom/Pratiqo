import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pratiqo",
    short_name: "Pratiqo",
    description: "La plateforme québécoise pour apprendre, ici.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F1EFE8",
    theme_color: "#1D9E75",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/branding/pratiqo-icon.png",
        sizes: "320x320",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Future: add a read-only schedule cache after reviewing authenticated data privacy.
  };
}
