import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/types";
import { LocaleHtmlSync } from "./LocaleHtmlSync";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fr" }, { locale: "es" }];
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <>
      <LocaleHtmlSync locale={locale} />
      {children}
    </>
  );
}
