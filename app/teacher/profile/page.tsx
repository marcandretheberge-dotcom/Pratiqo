import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/site";
import TeacherProfileIndexClient from "./TeacherProfileIndexClient";

export const metadata: Metadata = {
  title: "Professeurs | Pratiqo",
  description: "Index technique des profils professeurs Pratiqo.",
  alternates: {
    canonical: `${SITE_URL}/trouver-un-prof`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function TeacherProfileIndexPage() {
  return <TeacherProfileIndexClient />;
}
