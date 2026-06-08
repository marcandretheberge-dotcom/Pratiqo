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
  // No `alternates` at the root layout. Pratiqo currently serves the same URL
  // for every locale (cookie-driven), and Next.js shallow-merges `alternates`
  // across layouts/pages. Setting either `canonical` or `languages` here would
  // either (a) silently canonicalize every child page that forgets its own
  // canonical to the homepage, or (b) emit hreflang alternates that all point
  // to the homepage on every public page. Each public page is responsible for
  // its own `alternates.canonical` (see app/page.tsx, app/tarifs/layout.tsx,
  // app/(app)/legal/**, app/cours/.../page.tsx, app/tuteurs-prive/.../page.tsx,
  // and lib/seo/yopratiqoSpanishSeoPages.ts). Locale-specific URLs only exist
  // for the YoPratiqo Spanish acquisition pages under /fr/* and /en/*, which
  // declare reciprocal hreflang via `buildYoSpanishSeoMetadata`.
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  other: {
    copyright: "© 2026 Cours Pratiqo Inc.",
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
        <meta name="theme-color" content="#1D9E75" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Pratiqo" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
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
