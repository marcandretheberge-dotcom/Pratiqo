import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pratiqo",
    short_name: "Pratiqo",
    description: "La plateforme québécoise pour apprendre, ici.",
    start_url: "/",
    display: "standalone",
    background_color: "#F1EFE8",
    theme_color: "#1D9E75",
    icons: [
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
  };
}
