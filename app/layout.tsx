import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { TeacherRecruitStrip } from "@/components/TeacherRecruitStrip";
import { SITE_URL } from "@/lib/seo/site";

const inter = localFont({
  src: "../public/fonts/inter.woff2",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Pratiqo — Trouve ton prof idéal au Québec",
    template: "%s | Pratiqo",
  },
  description:
    "La marketplace québécoise pour trouver un professeur de musique, langue ou tuteur. D'ici, pour ici. Profs vérifiés, paiements sécurisés.",
  keywords: [
    "cours particuliers Québec",
    "professeur de piano",
    "tuteur Québec",
    "cours de musique",
    "cours de langue",
    "professeur particulier",
    "music teacher Canada",
    "language teacher Canada",
    "maestro de música México",
    "profesor de idiomas",
    "clases particulares Quebec",
    "online tutor",
  ],
  openGraph: {
    title: "Pratiqo — Trouve ton prof idéal",
    description: "La marketplace québécoise pour cours particuliers",
    url: SITE_URL,
    siteName: "Pratiqo",
    locale: "fr_CA",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  // Same URL for every locale today (cookie/client locale). Do not treat these as
  // distinct hreflang targets until real localized routes exist (see lib/seo/site.ts).
  alternates: {
    canonical: SITE_URL,
    languages: {
      fr: SITE_URL,
      en: SITE_URL,
      es: SITE_URL,
      "es-UY": SITE_URL,
      "x-default": SITE_URL,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  other: {
    copyright: "© 2026 Pratiqo inc.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <head>
        {/* next/font/local already loads Inter; avoid duplicate font preload competing with LCP. */}
        {/* Preconnect to Supabase to cut TTFB on first API call */}
        <link rel="preconnect" href="https://jwlbwmxoradmbuvqfkhe.supabase.co" />
        <link rel="dns-prefetch" href="https://jwlbwmxoradmbuvqfkhe.supabase.co" />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <TeacherRecruitStrip />
      </body>
    </html>
  );
}
