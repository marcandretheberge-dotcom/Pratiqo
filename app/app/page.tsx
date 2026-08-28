import type { Metadata } from "next";
import { AppInstallHelpContent } from "@/components/app/AppInstallHelpContent";

export const metadata: Metadata = {
  title: "Utiliser Pratiqo comme une app",
  description: "Ajoutez Pratiqo à votre écran d’accueil pour l’utiliser comme une app.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function AppInstallHelpPage() {
  return <AppInstallHelpContent />;
}
