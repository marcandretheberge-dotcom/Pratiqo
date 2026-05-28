/**
 * YoVisuals — Phase 1 code-based visual placeholders for the Yo Pratiqo
 * Voyage MVP page. Pure server components (no client state, no Supabase,
 * no Stripe, no image files). Every visual here is intentionally light-
 * weight inline SVG + CSS gradients so the page does not depend on any
 * external asset until real artwork lands in Phase 2.
 *
 * Phase 2 swap plan — when real artwork is added under:
 *   /public/images/yo/voyage/do/
 * each placeholder below can be swapped for a `next/image` source without
 * touching the data layer (YoLessonCard.visualHint / YoFlashcard.visualHint
 * stay stable). Suggested future filenames are noted on each component.
 *
 * Design guardrails:
 *   - No real photo was extracted from any prior mockup. Every shape here
 *     is hand-written SVG / CSS.
 *   - Premium-travel tone (warm Dominican Republic feel): teal, mint,
 *     sand, soft blue, warm sun. Never childish, never garish.
 *   - The Dominican flag only appears as a discreet small accent
 *     (`DominicanFlagPin`), never large.
 *   - All decorative SVGs use `aria-hidden`.
 */

import { MapPin, Sparkles, VolumeX } from "lucide-react";
import type { YoLocale, YoVisualHint } from "@/lib/yo/types";
import { t } from "@/lib/yo/localize";
import { YO_COPY } from "@/lib/yo/copy";

/* ─────────────────────────────────────────────────────────────────────
 * Shared accent: subtle Dominican Republic flag pin
 * ──────────────────────────────────────────────────────────────────── */

const DR_BLUE = "#0a4a99";
const DR_RED = "#d12a3a";

/**
 * Tiny Dominican Republic flag chip used as a discreet brand-of-place
 * accent. Reproduces the 4-quadrant flag (blue / red top, red / blue
 * bottom) with the white cross. Kept intentionally small so it never
 * dominates the composition.
 */
export function DominicanFlagPin({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 30 20"
      className={className ?? "h-3 w-[18px]"}
    >
      <rect width="30" height="20" rx="2" fill={DR_BLUE} />
      <rect x="15" width="15" height="10" fill={DR_RED} />
      <rect y="10" width="15" height="10" fill={DR_RED} />
      <rect x="15" y="10" width="15" height="10" fill={DR_BLUE} />
      <rect x="12" width="6" height="20" fill="#ffffff" />
      <rect y="7" width="30" height="6" fill="#ffffff" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Hero — full-bleed tropical visual that sits beside the hero copy.
 * Future swap target:
 *   /public/images/yo/voyage/do/hero-dominican-republic.webp
 * ──────────────────────────────────────────────────────────────────── */

export function YoHeroTropicalArt() {
  return (
    <div
      aria-hidden
      className="relative h-44 w-full overflow-hidden rounded-2xl shadow-[0_8px_24px_rgba(15,58,52,0.10)] ring-1 ring-teal-100/70 sm:h-56 lg:h-full lg:min-h-[280px]"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #bfe4f5 0%, #d1f4e7 38%, #f3e8d0 72%, #ead9b0 100%)",
        }}
      />

      {/* Warm sun */}
      <div
        className="absolute right-8 top-6 size-14 rounded-full sm:right-12 sm:size-16"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #fde68a 0%, #fbbf24 60%, rgba(251,191,36,0) 75%)",
        }}
      />

      <svg
        viewBox="0 0 400 240"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        {/* Soft clouds */}
        <ellipse cx="80" cy="40" rx="34" ry="6" fill="#ffffff" opacity="0.55" />
        <ellipse
          cx="210"
          cy="58"
          rx="46"
          ry="7"
          fill="#ffffff"
          opacity="0.45"
        />

        {/* Distant island silhouette */}
        <path
          d="M0 152 Q60 132 130 144 T260 142 T400 150 L400 170 L0 170 Z"
          fill="#1f6a45"
          opacity="0.18"
        />

        {/* Sea waves */}
        <path
          d="M0 178 Q40 170 80 178 T160 178 T240 178 T320 178 T400 178 V190 H0 Z"
          fill="#5ec7b3"
          opacity="0.55"
        />
        <path
          d="M0 196 Q40 188 80 196 T160 196 T240 196 T320 196 T400 196 V210 H0 Z"
          fill="#14b8a6"
          opacity="0.7"
        />

        {/* Sand band */}
        <rect x="0" y="210" width="400" height="30" fill="#ead9b0" />

        {/* Foreground palm */}
        <g transform="translate(330,110)">
          <rect x="-3" y="0" width="6" height="100" rx="3" fill="#1f4a3d" />
          <path d="M0 0 Q-40 -20 -70 -10 Q-40 0 0 4 Z" fill="#0f766e" />
          <path d="M0 0 Q40 -20 70 -10 Q40 0 0 4 Z" fill="#0f766e" />
          <path d="M0 0 Q-30 -45 -50 -55 Q-20 -25 0 0 Z" fill="#0d5e57" />
          <path d="M0 0 Q30 -45 50 -55 Q20 -25 0 0 Z" fill="#0d5e57" />
          <path d="M0 0 Q-10 -50 -10 -68 Q0 -36 6 -10 Z" fill="#115e51" />
        </g>

        {/* Background palm */}
        <g transform="translate(70,140)">
          <rect
            x="-2"
            y="0"
            width="4"
            height="70"
            rx="2"
            fill="#1f4a3d"
            opacity="0.85"
          />
          <path
            d="M0 0 Q-25 -10 -45 -2 Q-20 4 0 6 Z"
            fill="#0f766e"
            opacity="0.75"
          />
          <path
            d="M0 0 Q25 -10 45 -2 Q20 4 0 6 Z"
            fill="#0f766e"
            opacity="0.75"
          />
          <path
            d="M0 0 Q-15 -28 -28 -36 Q-10 -16 0 0 Z"
            fill="#0d5e57"
            opacity="0.75"
          />
          <path
            d="M0 0 Q15 -28 28 -36 Q10 -16 0 0 Z"
            fill="#0d5e57"
            opacity="0.75"
          />
        </g>
      </svg>

      {/* Discreet Dominican Republic accent — small flag pinned bottom-left */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-1 text-[10px] font-medium text-[#1a3a32] shadow-sm backdrop-blur-sm">
        <DominicanFlagPin className="h-[10px] w-4" />
        <span>República Dominicana</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Card visual strip — top-of-card decorative band used inside
 * YoLessonCard. Each hint maps to a small inline SVG illustration.
 *
 * Future swap target per hint:
 *   dominican-map        → /public/images/yo/voyage/do/map-dominican-republic.svg
 *   history-colonial     → /public/images/yo/voyage/do/history-zona-colonial.webp
 *   food-bandera         → /public/images/yo/voyage/do/food-bandera-dominicana.webp
 *   conversation-bubbles → /public/images/yo/voyage/do/conversation-hotel-checkin.webp
 * ──────────────────────────────────────────────────────────────────── */

export interface YoCardVisualProps {
  hint: YoVisualHint;
  locale: YoLocale;
}

export function YoCardVisual({ hint, locale }: YoCardVisualProps) {
  switch (hint) {
    case "dominican-map":
      return <DominicanMapVisual />;
    case "history-colonial":
      return <HistoryColonialVisual locale={locale} />;
    case "food-bandera":
      return <FoodBanderaVisual />;
    case "conversation-bubbles":
      return <ConversationBubblesVisual />;
    case "tropical-flashcard":
    case "hero-tropical":
    case "unlock-stamp":
      // These hints belong to other surfaces; render nothing inside a card.
      return null;
    default:
      return null;
  }
}

/* ─────────────────────────────────────────────────────────────────────
 * Mini Dominican Republic map (used in the "Où on s’en va ?" card)
 * Phase 2 swap → /public/images/yo/voyage/do/map-dominican-republic.svg
 * ──────────────────────────────────────────────────────────────────── */

function DominicanMapVisual() {
  return (
    <div
      aria-hidden
      className="relative h-32 w-full overflow-hidden sm:h-36"
      style={{
        background:
          "linear-gradient(160deg, #e7f6f3 0%, #d1ecff 55%, #f3e8d0 100%)",
      }}
    >
      <svg
        viewBox="0 0 420 160"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        {/* Faint sea ripples */}
        <path
          d="M0 130 Q40 124 80 130 T160 130 T240 130 T320 130 T420 130"
          stroke="#7dd3c0"
          strokeWidth="1.2"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M0 144 Q40 138 80 144 T160 144 T240 144 T320 144 T420 144"
          stroke="#5ec7b3"
          strokeWidth="1.2"
          fill="none"
          opacity="0.45"
        />

        {/* Stylized Hispaniola island silhouette (DR side emphasized).
            Not geographically exact — a friendly travel-map shape. */}
        <path
          d="M40 86
             Q70 56 120 60
             Q150 50 200 60
             Q260 52 320 64
             Q370 72 388 92
             Q380 110 340 112
             Q300 118 250 110
             Q210 116 170 110
             Q120 116 80 108
             Q50 102 40 86 Z"
          fill="#ead9b0"
          stroke="#c8a972"
          strokeWidth="1.5"
        />

        {/* DR / Haiti soft divider hint (left side) */}
        <path
          d="M82 70 Q92 88 84 108"
          stroke="#c8a972"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.55"
          fill="none"
        />

        {/* Inland texture (gentle mountains) */}
        <path
          d="M120 92 L140 78 L160 92 L180 82 L210 96 L240 80 L270 92 L300 84 L330 94"
          stroke="#a8c8a0"
          strokeWidth="1.2"
          fill="none"
          opacity="0.7"
        />

        {/* North-arrow */}
        <g transform="translate(370,30)">
          <circle r="11" fill="#ffffff" opacity="0.9" />
          <path d="M0 -7 L4 4 L0 1 L-4 4 Z" fill="#0f766e" />
          <text
            x="0"
            y="-12"
            textAnchor="middle"
            fontSize="8"
            fill="#0f766e"
            fontWeight="600"
          >
            N
          </text>
        </g>
      </svg>

      {/* City pins (HTML so labels stay crisp) */}
      <CityPin label="Puerto Plata" left="29%" top="38%" />
      <CityPin label="Santo Domingo" left="38%" top="71%" />
      <CityPin label="Punta Cana" left="78%" top="60%" />
    </div>
  );
}

function CityPin({
  label,
  left,
  top,
}: {
  label: string;
  left: string;
  top: string;
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left, top }}
    >
      <div className="flex flex-col items-center gap-0.5">
        <span
          aria-hidden
          className="flex size-4 items-center justify-center rounded-full bg-white shadow-[0_2px_4px_rgba(15,58,52,0.25)] ring-2 ring-teal-600"
        >
          <span className="size-1.5 rounded-full bg-teal-700" />
        </span>
        <span className="whitespace-nowrap rounded-full bg-white/85 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-[#1a3a32] shadow-sm backdrop-blur-sm sm:text-[10px]">
          {label}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * History / Zona Colonial inspired visual.
 * Phase 2 swap → /public/images/yo/voyage/do/history-zona-colonial.webp
 *
 * Includes an "Audio bientôt disponible" badge — there is NO audio file
 * yet and we never want to imply there is.
 * ──────────────────────────────────────────────────────────────────── */

function HistoryColonialVisual({ locale }: { locale: YoLocale }) {
  return (
    <div
      aria-hidden
      className="relative h-32 w-full overflow-hidden sm:h-36"
      style={{
        background:
          "linear-gradient(180deg, #ffe8c2 0%, #f3d9a3 55%, #e7c587 100%)",
      }}
    >
      <svg
        viewBox="0 0 420 160"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        {/* Distant sea hint behind the fort */}
        <rect x="0" y="0" width="420" height="60" fill="#cfe6ee" opacity="0.5" />
        <path
          d="M0 60 Q40 56 80 60 T160 60 T240 60 T320 60 T420 60 V70 H0 Z"
          fill="#a7d6c4"
          opacity="0.55"
        />

        {/* Colonial street ground */}
        <rect x="0" y="118" width="420" height="42" fill="#caa57a" />
        <path
          d="M0 124 L420 124"
          stroke="#a98564"
          strokeWidth="1"
          opacity="0.6"
        />

        {/* Fort wall block (Zona Colonial inspiration) */}
        <g transform="translate(70,38)">
          {/* Main wall body */}
          <rect x="0" y="22" width="160" height="80" fill="#a87b54" />
          {/* Crenellations */}
          <g fill="#a87b54">
            <rect x="0" y="14" width="14" height="10" />
            <rect x="22" y="14" width="14" height="10" />
            <rect x="44" y="14" width="14" height="10" />
            <rect x="66" y="14" width="14" height="10" />
            <rect x="88" y="14" width="14" height="10" />
            <rect x="110" y="14" width="14" height="10" />
            <rect x="132" y="14" width="14" height="10" />
          </g>
          {/* Big arched gate */}
          <path
            d="M62 102 L62 70 Q62 56 80 56 Q98 56 98 70 L98 102 Z"
            fill="#5a3d28"
          />
          {/* Side windows */}
          <rect x="20" y="60" width="14" height="22" fill="#5a3d28" rx="2" />
          <rect x="126" y="60" width="14" height="22" fill="#5a3d28" rx="2" />
          {/* Texture lines (brick hint) */}
          <g stroke="#8c6644" strokeWidth="0.8" opacity="0.6">
            <line x1="0" y1="40" x2="160" y2="40" />
            <line x1="0" y1="56" x2="160" y2="56" />
            <line x1="0" y1="74" x2="160" y2="74" />
            <line x1="0" y1="90" x2="160" y2="90" />
          </g>
        </g>

        {/* Bell tower right */}
        <g transform="translate(260,18)">
          <rect x="0" y="22" width="60" height="100" fill="#b8865d" />
          <rect x="-4" y="14" width="68" height="10" fill="#9c6f4a" />
          {/* Bell arch */}
          <path
            d="M18 70 L18 50 Q18 38 30 38 Q42 38 42 50 L42 70 Z"
            fill="#5a3d28"
          />
          {/* Spire */}
          <polygon points="-4,14 30,-4 64,14" fill="#9c6f4a" />
          <polygon points="26,-4 30,-12 34,-4" fill="#5a3d28" />
          {/* Cross hint on top */}
          <rect x="29" y="-20" width="2" height="10" fill="#3b2515" />
          <rect x="26" y="-16" width="8" height="2" fill="#3b2515" />
        </g>

        {/* Foreground palm */}
        <g transform="translate(384,90)">
          <rect x="-2" y="0" width="4" height="40" rx="2" fill="#1f4a3d" />
          <path d="M0 0 Q-20 -8 -34 -2 Q-15 3 0 4 Z" fill="#0f766e" />
          <path d="M0 0 Q20 -8 34 -2 Q15 3 0 4 Z" fill="#0f766e" />
          <path d="M0 0 Q-10 -22 -16 -28 Q-6 -12 0 0 Z" fill="#0d5e57" />
          <path d="M0 0 Q10 -22 16 -28 Q6 -12 0 0 Z" fill="#0d5e57" />
        </g>
      </svg>

      {/* Audio status badge — clearly says NOT YET available. */}
      <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2 py-1 text-[10px] font-medium text-[#1a3a32] shadow-sm ring-1 ring-white/60 backdrop-blur-sm">
        <VolumeX aria-hidden className="size-3 text-[#a23a3a]" />
        <span>{t(YO_COPY.visuals.audioComingSoon, locale)}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Food / La Bandera Dominicana visual.
 * Phase 2 swap → /public/images/yo/voyage/do/food-bandera-dominicana.webp
 *
 * Plate divided into 4 stylized portions:
 *   arroz · habichuelas · pollo/carne · plátano frito
 * ──────────────────────────────────────────────────────────────────── */

function FoodBanderaVisual() {
  return (
    <div
      aria-hidden
      className="relative h-32 w-full overflow-hidden sm:h-36"
      style={{
        background:
          "linear-gradient(135deg, #fff4e2 0%, #ffe6c2 100%)",
      }}
    >
      <svg
        viewBox="0 0 420 160"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 size-full"
      >
        {/* Steam wisps */}
        <g stroke="#cfa86b" strokeWidth="1.2" fill="none" opacity="0.6">
          <path d="M188 28 Q196 18 188 8" />
          <path d="M210 24 Q218 14 210 4" />
          <path d="M232 28 Q240 18 232 8" />
        </g>

        {/* Plate outer ring */}
        <circle cx="210" cy="92" r="62" fill="#ffffff" stroke="#e6d3aa" strokeWidth="2" />
        <circle cx="210" cy="92" r="54" fill="#fffaf0" stroke="#e6d3aa" strokeWidth="1" />

        {/* Four food quadrants (rotated 45° so portions sit top/right/bottom/left) */}
        <g transform="translate(210,92)">
          {/* Arroz (white rice) — top */}
          <path d="M0 0 L-50 -10 A52 52 0 0 1 50 -10 Z" fill="#fbf6e6" />
          {/* Rice grain dots */}
          <g fill="#ddd0a3">
            <ellipse cx="-30" cy="-18" rx="3.5" ry="1.4" />
            <ellipse cx="-14" cy="-26" rx="3.5" ry="1.4" transform="rotate(15 -14 -26)" />
            <ellipse cx="2" cy="-22" rx="3.5" ry="1.4" transform="rotate(-10 2 -22)" />
            <ellipse cx="18" cy="-28" rx="3.5" ry="1.4" transform="rotate(20 18 -28)" />
            <ellipse cx="32" cy="-20" rx="3.5" ry="1.4" transform="rotate(-15 32 -20)" />
            <ellipse cx="-22" cy="-10" rx="3.5" ry="1.4" />
            <ellipse cx="-2" cy="-12" rx="3.5" ry="1.4" />
            <ellipse cx="22" cy="-12" rx="3.5" ry="1.4" />
          </g>

          {/* Habichuelas (red beans) — right */}
          <path d="M0 0 L50 -10 A52 52 0 0 1 50 10 Z" fill="#a14a2a" />
          <g fill="#7f3a1f">
            <ellipse cx="34" cy="-4" rx="4" ry="2.2" transform="rotate(20 34 -4)" />
            <ellipse cx="38" cy="4" rx="4" ry="2.2" transform="rotate(-15 38 4)" />
            <ellipse cx="28" cy="6" rx="4" ry="2.2" transform="rotate(30 28 6)" />
            <ellipse cx="44" cy="-2" rx="4" ry="2.2" />
          </g>

          {/* Pollo / Carne (golden brown chicken) — bottom */}
          <path d="M0 0 L50 10 A52 52 0 0 1 -50 10 Z" fill="#c98a4b" />
          <ellipse cx="-12" cy="22" rx="22" ry="12" fill="#a86730" opacity="0.85" />
          <ellipse cx="14" cy="26" rx="18" ry="10" fill="#a86730" opacity="0.85" />
          <path
            d="M-22 30 Q0 18 22 30"
            stroke="#5a3514"
            strokeWidth="1.2"
            fill="none"
            opacity="0.7"
          />

          {/* Plátano frito (yellow plantain slices) — left */}
          <path d="M0 0 L-50 10 A52 52 0 0 1 -50 -10 Z" fill="#f3c460" />
          <g fill="#e0a132">
            <ellipse cx="-32" cy="-2" rx="8" ry="5" />
            <ellipse cx="-40" cy="4" rx="8" ry="5" />
            <ellipse cx="-26" cy="6" rx="8" ry="5" />
          </g>
          <g fill="#f6d889">
            <circle cx="-32" cy="-2" r="2" />
            <circle cx="-40" cy="4" r="2" />
            <circle cx="-26" cy="6" r="2" />
          </g>

          {/* Plate divisions */}
          <line x1="-52" y1="0" x2="52" y2="0" stroke="#e6d3aa" strokeWidth="0.8" opacity="0.6" />
          <line x1="0" y1="-52" x2="0" y2="52" stroke="#e6d3aa" strokeWidth="0.8" opacity="0.6" />
        </g>
      </svg>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#1a3a32] shadow-sm ring-1 ring-[#e6d3aa]">
        La Bandera Dominicana
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Conversation bubbles visual.
 * Phase 2 swap → /public/images/yo/voyage/do/conversation-hotel-checkin.webp
 * ──────────────────────────────────────────────────────────────────── */

function ConversationBubblesVisual() {
  return (
    <div
      aria-hidden
      className="relative h-32 w-full overflow-hidden sm:h-36"
      style={{
        background:
          "linear-gradient(160deg, #e0f6ef 0%, #d5ecff 60%, #fff4e2 100%)",
      }}
    >
      {/* Background highlights */}
      <div className="pointer-events-none absolute -left-6 top-2 size-16 rounded-full bg-white/40 blur-2xl" />
      <div className="pointer-events-none absolute -right-6 bottom-2 size-20 rounded-full bg-[#fde68a]/35 blur-2xl" />

      <div className="relative flex h-full items-center justify-center px-4 sm:px-6">
        <div className="flex w-full items-end justify-between gap-2 sm:gap-3">
          <SpeechBubble
            text="Buenos días"
            tone="teal"
            tailSide="left"
            className="self-start"
          />
          <SpeechBubble
            text="Mucho gusto"
            tone="cream"
            tailSide="left"
            className="translate-y-2"
          />
          <SpeechBubble
            text="Hasta luego"
            tone="mint"
            tailSide="right"
            className="self-end"
          />
        </div>
      </div>
    </div>
  );
}

function SpeechBubble({
  text,
  tone,
  tailSide,
  className,
}: {
  text: string;
  tone: "teal" | "cream" | "mint";
  tailSide: "left" | "right";
  className?: string;
}) {
  const palette: Record<typeof tone, { bg: string; ring: string; text: string }> = {
    teal: { bg: "bg-teal-600", ring: "ring-teal-700/30", text: "text-white" },
    cream: {
      bg: "bg-[#fff4e2]",
      ring: "ring-[#e6d3aa]",
      text: "text-[#7a4f1d]",
    },
    mint: {
      bg: "bg-[#d1f4e7]",
      ring: "ring-[#9fd9c1]",
      text: "text-[#1f6a45]",
    },
  };
  const tone_ = palette[tone];
  return (
    <div
      className={`relative inline-flex max-w-[35%] flex-col rounded-2xl px-2.5 py-1.5 text-[11px] font-semibold shadow-[0_3px_8px_rgba(15,58,52,0.10)] ring-1 sm:max-w-[32%] sm:px-3 sm:py-2 sm:text-[12px] ${tone_.bg} ${tone_.text} ${tone_.ring} ${className ?? ""}`}
    >
      <span lang="es" className="leading-tight">
        {text}
      </span>
      <span
        aria-hidden
        className={`absolute -bottom-1 size-3 rotate-45 ${tone_.bg} ${tailSide === "left" ? "left-3" : "right-3"}`}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Tropical flashcard background — subtle palm/wave/sun motif that lives
 * BEHIND the flashcard front so text stays crisp and readable.
 * Phase 2 swap → /public/images/yo/voyage/do/flashcard-tropical-bg.webp
 * ──────────────────────────────────────────────────────────────────── */

export function YoFlashcardTropicalBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 100% 0%, rgba(254,243,199,0.65) 0%, rgba(254,243,199,0) 55%), radial-gradient(120% 90% at 0% 100%, rgba(209,244,231,0.55) 0%, rgba(209,244,231,0) 60%)",
        }}
      />
      <svg
        viewBox="0 0 600 360"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full opacity-[0.55]"
      >
        {/* Soft sun rays in the top-right corner */}
        <g
          transform="translate(540,40)"
          stroke="#fbbf24"
          strokeWidth="1.2"
          fill="none"
          opacity="0.55"
        >
          <line x1="0" y1="0" x2="-40" y2="-10" />
          <line x1="0" y1="0" x2="-44" y2="6" />
          <line x1="0" y1="0" x2="-40" y2="22" />
          <line x1="0" y1="0" x2="-30" y2="36" />
          <line x1="0" y1="0" x2="-16" y2="46" />
        </g>
        <circle cx="540" cy="40" r="14" fill="#fde68a" opacity="0.7" />

        {/* Palm fronds top-left */}
        <g transform="translate(28,60)" fill="#0f766e" opacity="0.18">
          <path d="M0 0 Q-30 -22 -52 -14 Q-26 -2 0 4 Z" />
          <path d="M0 0 Q30 -22 52 -14 Q26 -2 0 4 Z" />
          <path d="M0 0 Q-12 -38 -22 -54 Q-6 -22 0 0 Z" />
          <path d="M0 0 Q12 -38 22 -54 Q6 -22 0 0 Z" />
        </g>

        {/* Wave at the bottom */}
        <path
          d="M0 320 Q60 304 120 320 T240 320 T360 320 T480 320 T600 320 V360 H0 Z"
          fill="#5ec7b3"
          opacity="0.18"
        />
        <path
          d="M0 340 Q60 326 120 340 T240 340 T360 340 T480 340 T600 340 V360 H0 Z"
          fill="#14b8a6"
          opacity="0.22"
        />
      </svg>
    </div>
  );
}

/**
 * Small "Expression locale" / "Local expression" badge rendered on top of
 * the flashcard front. Visually paired with `YoFlashcardTropicalBg` and is
 * a tiny premium accent — it never overlaps the card's main text.
 */
export function YoExpressionLocaleBadge({ locale }: { locale: YoLocale }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4e2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a5a17] ring-1 ring-[#f3dcb4]">
      <Sparkles aria-hidden className="size-3" />
      {locale === "fr" ? "Expression locale" : "Local expression"}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Unlock card mini travel illustration (passport + DR stamp + palm).
 * Phase 2 swap → optional /public/images/yo/voyage/do/unlock-travel-stamp.webp
 * ──────────────────────────────────────────────────────────────────── */

export function YoUnlockTravelStamp({ locale }: { locale: YoLocale }) {
  return (
    <div
      aria-hidden
      className="relative mx-auto flex h-24 w-full max-w-[260px] items-center justify-center"
    >
      {/* Background warm halo */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background:
            "radial-gradient(70% 80% at 50% 40%, rgba(253,230,138,0.45) 0%, rgba(253,230,138,0) 70%)",
        }}
      />

      <svg
        viewBox="0 0 260 100"
        preserveAspectRatio="xMidYMid meet"
        className="relative size-full"
      >
        {/* Passport */}
        <g transform="translate(60,18)">
          <rect
            x="0"
            y="0"
            width="80"
            height="64"
            rx="6"
            fill="#1a3a32"
            stroke="#0f2622"
            strokeWidth="1.2"
          />
          {/* Gold emblem */}
          <circle cx="40" cy="22" r="9" fill="none" stroke="#fbbf24" strokeWidth="1.4" />
          <path
            d="M40 13 L43 22 L40 31 L37 22 Z"
            fill="#fbbf24"
            opacity="0.9"
          />
          <text
            x="40"
            y="46"
            textAnchor="middle"
            fontSize="6"
            fill="#fbbf24"
            fontWeight="700"
            letterSpacing="1"
          >
            PASSPORT
          </text>
          <text
            x="40"
            y="55"
            textAnchor="middle"
            fontSize="5"
            fill="#fbbf24"
            opacity="0.85"
          >
            YO PRATIQO
          </text>
        </g>

        {/* DR stamp on top of passport */}
        <g transform="translate(148,16) rotate(-12)">
          <circle
            cx="0"
            cy="0"
            r="22"
            fill="none"
            stroke="#d12a3a"
            strokeWidth="1.8"
          />
          <circle
            cx="0"
            cy="0"
            r="17"
            fill="none"
            stroke="#d12a3a"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <text
            x="0"
            y="-6"
            textAnchor="middle"
            fontSize="6"
            fill="#d12a3a"
            fontWeight="700"
            letterSpacing="0.5"
          >
            REPÚBLICA
          </text>
          <text
            x="0"
            y="2"
            textAnchor="middle"
            fontSize="6"
            fill="#d12a3a"
            fontWeight="700"
            letterSpacing="0.5"
          >
            DOMINICANA
          </text>
          <text
            x="0"
            y="12"
            textAnchor="middle"
            fontSize="5"
            fill="#d12a3a"
            opacity="0.85"
          >
            ★ A1 ★
          </text>
        </g>

        {/* Tiny palm to the left */}
        <g transform="translate(28,62)">
          <rect x="-1.5" y="0" width="3" height="22" rx="1.5" fill="#1f4a3d" />
          <path d="M0 0 Q-12 -6 -22 -2 Q-10 2 0 4 Z" fill="#0f766e" />
          <path d="M0 0 Q12 -6 22 -2 Q10 2 0 4 Z" fill="#0f766e" />
          <path d="M0 0 Q-6 -14 -10 -18 Q-4 -8 0 0 Z" fill="#0d5e57" />
          <path d="M0 0 Q6 -14 10 -18 Q4 -8 0 0 Z" fill="#0d5e57" />
        </g>

        {/* Tiny plane mark to the right */}
        <g transform="translate(220,62) rotate(-15)" fill="#0f766e">
          <path d="M0 0 L18 -3 L20 -1 L8 4 L4 12 L1 11 L3 4 L-2 5 L-3 2 Z" />
        </g>
      </svg>

      {/* Small flag pin chip */}
      <div className="absolute -bottom-1 right-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-medium text-[#1a3a32] shadow-sm ring-1 ring-teal-100">
        <DominicanFlagPin className="h-[8px] w-[12px]" />
        <span>{t(YO_COPY.visuals.visaReady, locale)}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Map pin badge — exported in case the page wants to drop a city pin
 * outside the map (e.g. on the hero). Currently unused; kept here so
 * the component family stays consolidated.
 * ──────────────────────────────────────────────────────────────────── */

export function YoMapPinChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-[#1a3a32] shadow-sm ring-1 ring-teal-100">
      <MapPin aria-hidden className="size-3 text-teal-700" />
      {label}
    </span>
  );
}
