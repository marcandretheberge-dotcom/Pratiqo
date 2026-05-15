"use client";

import { CalendarCheck, MapPin, ShieldCheck } from "lucide-react";
import { ProductMotionHero } from "@/components/marketing/ProductMotionHero";

export function TrouverUnProfMotionHero() {
  return (
    <ProductMotionHero
      className="border-b border-[#E8E6DF]"
      eyebrow="Cours particuliers - Quebec"
      title="Trouvez le bon prof, sans perdre des semaines a comparer."
      subtitle="Comparez des professeurs verifies, voyez les avis, le format de cours et les signaux de confiance avant de reserver votre premier cours."
      primaryCta="Chercher un professeur"
      secondaryCta="Voir les tarifs"
      primaryHref="/login?next=/student/search"
      secondaryHref="/tarifs"
      featuredProfile={{
        eyebrow: "Profil recommande",
        name: "Maya R.",
        initials: "MR",
        description: "Tutorat en mathematiques - Montreal - En ligne ou pres de chez vous",
        trustSignals: ["Identite verifiee", "Diplome en verification", "Reponse rapide"],
        stats: [
          { value: "42 $", label: "par heure" },
          { value: "4.9", label: "note" },
          { value: "18", label: "avis" },
        ],
      }}
      cards={[
        {
          title: "Professeurs verifies",
          detail: "Identite, diplomes, avis et disponibilites reunis dans un profil clair.",
          icon: ShieldCheck,
          toneClassName: "bg-[#E6F4EE] text-[#00694c]",
          metric: "4.9",
          meta: "note moyenne",
        },
        {
          title: "Reservation simple",
          detail: "Choisissez un creneau, confirmez le format du cours et commencez avec confiance.",
          icon: CalendarCheck,
          toneClassName: "bg-[#FFF2D9] text-amber-700",
          metric: "45m",
          meta: "cours intro",
        },
        {
          title: "Pres de vous ou en ligne",
          detail: "Filtrez par ville, matiere, format et signaux de confiance.",
          icon: MapPin,
          toneClassName: "bg-[#EAF0FF] text-indigo-700",
          metric: "2 km",
          meta: "profil proche",
        },
      ]}
    />
  );
}
