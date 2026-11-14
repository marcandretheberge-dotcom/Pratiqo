import { createRoot } from "react-dom/client";
import { CafeCommunityDemo } from "@/components/cafe/community/CafeCommunityDemo";
import { communityLocale, type CommunityLocale } from "@/components/cafe/community/copy";
import "./preview.css";

// This entry bundles the repository's actual UI with its existing explicit fixture
// transport. It never initializes Supabase, an authenticated identity or Daily.
function initialLocale(): CommunityLocale {
  const query = new URLSearchParams(window.location.search).get("lang");
  if (query === "fr" || query === "en" || query === "es") return query;
  try { return communityLocale(localStorage.getItem("pratiqo-locale") ?? "fr"); }
  catch { return "fr"; }
}

function rememberLocale(locale: CommunityLocale) {
  document.documentElement.lang = locale;
  try { localStorage.setItem("pratiqo-locale", locale); } catch { /* Optional preference only. */ }
}

const locale = initialLocale();
rememberLocale(locale);
const path = window.location.pathname.replace(/\/+$/, "");
const root = document.getElementById("cafe-preview-root");
if (!root) throw new Error("The Café review root is missing.");
createRoot(root).render(<CafeCommunityDemo
  initialLocale={locale}
  initialOnboarding={path !== "/cafe/preview/communaute"}
  onLocaleChange={rememberLocale}
/>);
