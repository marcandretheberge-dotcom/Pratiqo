/**
 * Build-safe font contract for YoPratiqo app-like landing surfaces.
 *
 * The global marketplace font still comes from `app/layout.tsx` via
 * `next/font/local` and `public/fonts/inter.woff2`. These YoPratiqo
 * display/script tokens intentionally do not use `next/font/google`.
 * Vercel production builds were failing while resolving generated
 * `[next]/internal/font/google/*` modules for Newsreader/Caveat, so
 * this file exposes the same `.variable` / `.className` shape with
 * stable CSS classes defined in `app/globals.css`.
 *
 * Font choices echo the YoPratiqo prototype theme:
 * - display: editorial serif fallback for app-like onboarding headlines.
 * - script: warm handwritten fallback for small teal accent ribbons.
 */

type YoAppFontToken = Readonly<{
  className: string;
  variable: string;
}>;

export const appDisplayFont: YoAppFontToken = {
  className: "font-yo-app-display",
  variable: "yo-app-display-font-variable",
};

export const appScriptFont: YoAppFontToken = {
  className: "font-yo-app-script",
  variable: "yo-app-script-font-variable",
};
