"use client";
import { createContext, useContext, type ReactNode } from "react";
import {
  germanCourseHref,
  GERMAN_PROGRESS_KEY,
} from "@/lib/yo/german/courseLogic";
import {
  portugueseCourseHref,
  PORTUGUESE_PROGRESS_KEY,
} from "@/lib/yo/portuguese/courseLogic";
const languageContext = createContext<"de" | "pt-BR">("de");
export function CourseExperience({
  children,
  language,
}: {
  children: ReactNode;
  language: "de" | "pt-BR";
}) {
  return (
    <languageContext.Provider value={language}>
      {children}
    </languageContext.Provider>
  );
}
export function useCourseExperience() {
  const language = useContext(languageContext);
  return language === "pt-BR"
    ? {
        language,
        name: "Português do Brasil",
        progressKey: PORTUGUESE_PROGRESS_KEY,
        finalId: "ptbr1-final",
        draftPrefix: "portuguese-br",
        href: portugueseCourseHref,
        title: {
          fr: "Le Brésil, mot après mot.",
          en: "Brazil, one conversation at a time.",
          es: "Brasil, palabra a palabra.",
        },
        description: {
          fr: "Faire connaissance, commander, se repérer. Avec Yoppo, pratique le portugais du Brésil dans des scènes du quotidien.",
          en: "Meet people, order food, find your way. Practise Brazilian Portuguese with Yoppo through everyday scenes.",
          es: "Conocer gente, pedir comida, orientarse. Practica portugués de Brasil con Yoppo en escenas cotidianas.",
        },
      }
    : {
        language,
        name: "Deutsch",
        progressKey: GERMAN_PROGRESS_KEY,
        finalId: "de1-final",
        draftPrefix: "german",
        href: germanCourseHref,
        title: {
          fr: "L’allemand, dans la vraie vie.",
          en: "German, in real life.",
          es: "Alemán, en la vida real.",
        },
        description: {
          fr: "Une rencontre, un café, un train à prendre. Avec Yoppo, trouve les mots pour faire le prochain pas.",
          en: "A meeting, a coffee, a train to catch. With Yoppo, find the words for your next step.",
          es: "Un encuentro, un café, un tren por tomar. Con Yoppo, encuentra las palabras para dar el siguiente paso.",
        },
      };
}
