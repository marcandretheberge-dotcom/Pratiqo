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
  // Pre-migration: serve a single non-prefixed URL per route. We deliberately
  // do NOT emit hreflang `languages` alternates here — Google's docs flag a
  // languages map where every alternate resolves to the same URL as an
  // anti-pattern. Step 1.3/1.4 of Phase 1 migrates routes to /{locale}/... at
  // which point the per-page `buildAlternates({ routeKey })` helper
  // (lib/seo/alternates.ts) emits the correct languages map.
  alternates: {
    canonical: SITE_URL,
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
