import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { TeacherRecruitStrip } from "@/components/TeacherRecruitStrip";

const inter = localFont({
  src: "../public/fonts/inter.woff2",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pratiqo.ca"),
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
    url: "https://pratiqo.ca",
    siteName: "Pratiqo",
    locale: "fr_CA",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  // hreflang: all locales currently served at the same URL (locale is switched
  // client-side). Will be updated to subpath URLs once locale routing launches:
  //   pratiqo.ca/en/  →  en-CA
  //   pratiqo.ca/mx/  →  es (Mexico / LatAm)
  //   pratiqo.ca/uy/  →  es-UY (Uruguay)
  alternates: {
    canonical: "https://pratiqo.ca",
    languages: {
      fr: "https://pratiqo.ca",
      en: "https://pratiqo.ca",
      es:      "https://pratiqo.ca",
      "es-UY": "https://pratiqo.ca",
      "x-default": "https://pratiqo.ca",
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
