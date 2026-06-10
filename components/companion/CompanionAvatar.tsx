/**
 * CompanionAvatar
 *
 * Single rendered visual of the YoPratiqo companion in one of the eight
 * production states (`idle`, `map`, `confused`, `celebrating`,
 * `teacher_ready`, `level_up`, `inactive`, `badge_unlocked`).
 *
 * Rendering contract
 * ------------------
 *   • If a real production asset exists (the manifest's `src` is not
 *     null), render it via Next/Image. Otherwise render a safe,
 *     emoji + lucide-icon fallback that never breaks (no broken `img`
 *     tag, no transparent square, no console error).
 *   • The fallback honors the same alt text, the same accent palette,
 *     and the same square framing as the production variant, so the
 *     layout never shifts when assets ship.
 *   • Locale-aware alt text is composed in this component — the
 *     manifest stays locale-neutral so it can be reused by React Native.
 *   • The component is a pure render (no hooks, no browser APIs) so it
 *     is safe to import from server components.
 *
 * Privacy / safety
 * ----------------
 *   • The component never accepts learning telemetry, quiz data, or
 *     payment data. The only inputs are cosmetic state + sizing props.
 *   • No image bytes are embedded; the manifest is consulted via the
 *     pure helper `getCompanionVisualAsset`.
 */

import Image from "next/image";
import {
  Award,
  GraduationCap,
  HelpCircle,
  Map as MapIcon,
  Moon,
  PartyPopper,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type CompanionVisualId,
  type CompanionVisualState,
  getCompanionVisualAsset,
} from "@/lib/companion/companionVisuals";

type AvatarSize = "xs" | "sm" | "md" | "lg";

const SIZE_PX: Record<AvatarSize, number> = {
  xs: 40,
  sm: 56,
  md: 88,
  lg: 128,
};

const SIZE_CLASSES: Record<AvatarSize, { shell: string; emoji: string; icon: string }> = {
  xs: { shell: "h-10 w-10 rounded-2xl", emoji: "text-2xl", icon: "size-3" },
  sm: { shell: "h-14 w-14 rounded-2xl", emoji: "text-3xl", icon: "size-3.5" },
  md: { shell: "h-[88px] w-[88px] rounded-3xl", emoji: "text-5xl", icon: "size-4" },
  lg: { shell: "h-32 w-32 rounded-[2rem]", emoji: "text-6xl", icon: "size-5" },
};

const FALLBACK_ICONS: Record<string, LucideIcon> = {
  Award,
  GraduationCap,
  HelpCircle,
  Map: MapIcon,
  Moon,
  PartyPopper,
  Sparkles,
  Star,
};

const STATE_LOCALIZED_ALT: Record<
  "fr" | "en" | "es",
  Record<CompanionVisualState, string>
> = {
  fr: {
    idle: "Compagnon YoPratiqo, état : présent",
    map: "Compagnon YoPratiqo, état : exploration de carte",
    confused: "Compagnon YoPratiqo, état : intrigué",
    celebrating: "Compagnon YoPratiqo, état : célébration",
    teacher_ready: "Compagnon YoPratiqo, état : prêt pour le professeur",
    level_up: "Compagnon YoPratiqo, état : montée de niveau",
    inactive: "Compagnon YoPratiqo, état : inactif",
    badge_unlocked: "Compagnon YoPratiqo, état : badge débloqué",
  },
  en: {
    idle: "YoPratiqo companion, state: idle",
    map: "YoPratiqo companion, state: exploring the map",
    confused: "YoPratiqo companion, state: curious",
    celebrating: "YoPratiqo companion, state: celebrating",
    teacher_ready: "YoPratiqo companion, state: teacher ready",
    level_up: "YoPratiqo companion, state: level up",
    inactive: "YoPratiqo companion, state: inactive",
    badge_unlocked: "YoPratiqo companion, state: badge unlocked",
  },
  es: {
    idle: "Compañero YoPratiqo, estado: presente",
    map: "Compañero YoPratiqo, estado: explorando el mapa",
    confused: "Compañero YoPratiqo, estado: intrigado",
    celebrating: "Compañero YoPratiqo, estado: celebrando",
    teacher_ready: "Compañero YoPratiqo, estado: listo para el profesor",
    level_up: "Compañero YoPratiqo, estado: subiendo de nivel",
    inactive: "Compañero YoPratiqo, estado: inactivo",
    badge_unlocked: "Compañero YoPratiqo, estado: insignia desbloqueada",
  },
};

export type CompanionAvatarProps = {
  /** Visual identity. Defaults to the YoPratiqo travel companion. */
  visualId?: CompanionVisualId;
  /** Pose / mood state. */
  state: CompanionVisualState;
  /** Locale used for alt text. Defaults to "fr". */
  locale?: "fr" | "en" | "es";
  /** Avatar size. Defaults to "md". */
  size?: AvatarSize;
  /**
   * Compact mode: removes the rounded shell + gradient so the avatar
   * can sit inline inside a tighter card row.
   */
  compact?: boolean;
  /**
   * Override the localized alt text. Use sparingly — the default alt
   * already follows the asset plan's accessibility recommendation.
   */
  label?: string;
  className?: string;
};

function safeLocale(locale: CompanionAvatarProps["locale"]): "fr" | "en" | "es" {
  if (locale === "en" || locale === "es") return locale;
  return "fr";
}

export function CompanionAvatar({
  visualId = "travel",
  state,
  locale,
  size = "md",
  compact = false,
  label,
  className,
}: CompanionAvatarProps): React.JSX.Element {
  const l = safeLocale(locale);
  const asset = getCompanionVisualAsset(visualId, state);
  const altText = label ?? STATE_LOCALIZED_ALT[l][state];
  const sizeClass = SIZE_CLASSES[size];
  const px = SIZE_PX[size];

  const FallbackIcon = asset.fallbackIcon
    ? FALLBACK_ICONS[asset.fallbackIcon]
    : undefined;

  const hasProductionAsset = asset.src != null;

  return (
    <div
      data-testid="companion-avatar"
      data-companion-visual-id={asset.visualId}
      data-companion-visual-state={asset.state}
      data-companion-asset-available={hasProductionAsset ? "true" : "false"}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        !compact && [
          "overflow-hidden border border-white/60 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_34px_rgba(15,23,42,0.10)]",
          sizeClass.shell,
        ],
        compact && "p-0",
        className,
      )}
    >
      {!compact ? (
        <>
          <span
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.92),rgba(255,255,255,0.30)_32%,transparent_33%),linear-gradient(135deg,#5ECDB5,#FFE9AC)]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-2 bottom-2 h-1/5 rounded-full bg-white/25 blur-md"
          />
        </>
      ) : null}

      {hasProductionAsset && asset.src ? (
        <Image
          src={asset.src}
          alt={altText}
          width={px}
          height={px}
          className="relative z-10 object-contain drop-shadow-[0_8px_14px_rgba(15,23,42,0.18)]"
          data-testid="companion-avatar-production-image"
          priority={false}
        />
      ) : (
        <span
          role="img"
          aria-label={altText}
          data-testid="companion-avatar-fallback"
          className={cn(
            "relative z-10 inline-flex items-center justify-center gap-1 leading-none drop-shadow-[0_8px_14px_rgba(15,23,42,0.16)]",
            sizeClass.emoji,
          )}
        >
          <span aria-hidden>{asset.fallbackEmoji}</span>
          {FallbackIcon ? (
            <FallbackIcon
              aria-hidden
              className={cn("text-[#0F6E56]", sizeClass.icon)}
            />
          ) : null}
        </span>
      )}
    </div>
  );
}
