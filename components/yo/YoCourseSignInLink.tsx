"use client";

import { Suspense, type ComponentProps } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { productLoginHref } from "@/lib/auth/productReturn";
import { useLocale } from "@/lib/locale-context";

type LinkProps = Omit<ComponentProps<"a">, "href">;

function CurrentLessonLink(props: LinkProps) {
  const path = usePathname() ?? "/yo";
  const query = useSearchParams()?.toString();
  const href = productLoginHref(path + (query ? "?" + query : ""));
  return <a {...props} href={href} onClick={event => {
    const { pathname, search, hash } = window.location;
    event.currentTarget.href = productLoginHref(pathname + search + hash);
    props.onClick?.(event);
  }} />;
}

export function YoCourseSignInLink(props: LinkProps) {
  const path = usePathname() ?? "/yo";
  return <Suspense fallback={<a {...props} href={productLoginHref(path)} />}>
    <CurrentLessonLink {...props} />
  </Suspense>;
}

export function YoCourseAccountEntry() {
  const { user, loading } = useAuth();
  const { locale } = useLocale();
  if (user || loading) return null;
  return <footer className="px-4 py-3 text-center">
    <YoCourseSignInLink data-testid="yo-lesson-sign-in" className="text-sm font-semibold text-teal-800 underline">
      {locale === "en" ? "Sign in to YoPratiqo" : locale === "es" ? "Entrar a YoPratiqo" : "Me connecter à YoPratiqo"}
    </YoCourseSignInLink>
  </footer>;
}
