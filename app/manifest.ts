import type { MetadataRoute } from "next";
import { PRATIQO_WEB_MANIFEST } from "@/lib/pwa/manifest";

export default function manifest(): MetadataRoute.Manifest {
  return PRATIQO_WEB_MANIFEST;
}
