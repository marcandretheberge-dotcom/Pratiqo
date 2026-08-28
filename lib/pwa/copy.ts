import type { Locale } from "@/lib/i18n/types";

export const pwaCopy = {
  fr: {
    installTitle: "Installer Pratiqo",
    installHeading: "Utiliser Pratiqo comme une app",
    installBody: "Ajoutez Pratiqo à votre écran d’accueil pour l’utiliser comme une app.",
    installIos: "Sur iPhone : touchez Partager, puis “Ajouter à l’écran d’accueil”.",
    installAndroid: "Sur Android : touchez Installer ou Ajouter à l’écran d’accueil.",
    installCta: "Installer",
    installHelp: "Comment l’installer",
    installDismiss: "Pas maintenant",
    offlineTitle: "Vous êtes hors ligne.",
    offlineBody: "Certaines pages de Pratiqo nécessitent une connexion Internet.",
    offlineRetry: "Réessayez lorsque votre connexion sera rétablie.",
    benefitQuickAccess: "Accès rapide",
    benefitFullscreen: "Expérience plein écran",
    benefitNotificationsLater: "Notifications plus tard",
  },
  en: {
    installTitle: "Install Pratiqo",
    installHeading: "Use Pratiqo like an app",
    installBody: "Add Pratiqo to your home screen and use it like an app.",
    installIos: "On iPhone: tap Share, then “Add to Home Screen”.",
    installAndroid: "On Android: tap Install or Add to Home Screen.",
    installCta: "Install",
    installHelp: "How to install",
    installDismiss: "Not now",
    offlineTitle: "You are offline.",
    offlineBody: "Some Pratiqo pages require an internet connection.",
    offlineRetry: "Try again when your connection is restored.",
    benefitQuickAccess: "Quick access",
    benefitFullscreen: "Full-screen experience",
    benefitNotificationsLater: "Notifications later",
  },
  es: {
    installTitle: "Instalar Pratiqo",
    installHeading: "Usar Pratiqo como una app",
    installBody: "Agrega Pratiqo a tu pantalla de inicio y úsalo como una app.",
    installIos: "En iPhone: toca Compartir y luego “Agregar a pantalla de inicio”.",
    installAndroid: "En Android: toca Instalar o Agregar a pantalla de inicio.",
    installCta: "Instalar",
    installHelp: "Cómo instalar",
    installDismiss: "Ahora no",
    offlineTitle: "Estás sin conexión.",
    offlineBody: "Algunas páginas de Pratiqo requieren conexión a Internet.",
    offlineRetry: "Inténtalo de nuevo cuando vuelva tu conexión.",
    benefitQuickAccess: "Acceso rápido",
    benefitFullscreen: "Experiencia de pantalla completa",
    benefitNotificationsLater: "Notificaciones más tarde",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type PwaCopy = (typeof pwaCopy)[Locale];

export function getPwaCopy(locale: Locale): PwaCopy {
  return pwaCopy[locale] ?? pwaCopy.fr;
}
