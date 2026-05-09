import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tarifs Pratiqo | Prix simples pour élèves et professeurs",
  description:
    "Découvrez les tarifs Pratiqo : aucun abonnement obligatoire pour les élèves, plan gratuit pour les professeurs, Plan Pro à 29,99 $ CAD/mois et commission dégressive.",
};

export default function TarifsLayout({ children }: { children: ReactNode }) {
  return children;
}
