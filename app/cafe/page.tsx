import type { Metadata } from "next";
import { CafeFrontDoor } from "./CafeFrontDoor";

export const metadata: Metadata = {
  title: "Café des langues",
  description: "Un espace calme pour pratiquer une langue en groupe avec Pratiqo.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function CafePage() {
  return <CafeFrontDoor />;
}
