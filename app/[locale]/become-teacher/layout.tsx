import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/seo/site";
import { buildAlternates } from "@/lib/seo/alternates";

export const metadata: Metadata = {
  title: "Become a Tutor or Teacher on Pratiqo",
  description:
    "Join Pratiqo to teach music, languages, or academic subjects online or in person. Set your rates, manage your schedule, and reach students in Québec and beyond.",
  ...buildAlternates({ routeKey: "become-teacher" }),
  openGraph: {
    title: "Become a Tutor or Teacher | Pratiqo",
    description:
      "Share what you teach. Pratiqo handles visibility and secure payouts while you focus on your students.",
    url: `${SITE_URL}/become-teacher`,
    siteName: "Pratiqo",
    locale: "en_CA",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Become a Tutor or Teacher | Pratiqo",
    description: "Join Pratiqo as an independent educator — flexible schedule, verified marketplace.",
    images: ["/og-image.png"],
  },
};

export default function BecomeTeacherLayout({ children }: { children: ReactNode }) {
  return children;
}
