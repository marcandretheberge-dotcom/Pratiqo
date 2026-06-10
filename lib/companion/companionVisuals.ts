/**
 * Companion visual domain model.
 *
 * What this file provides
 * -----------------------
 *   • `CompanionVisualId` — stable id for a visual variant (currently the
 *     "travel" companion from the YoPratiqo marketing image; future
 *     variants reuse the same shape).
 *   • `CompanionVisualState` — the eight production states defined in
 *     `docs/COMPANION_BRIDGE_ASSET_PLAN.md`.
 *   • `CompanionVisualAsset` — a single state's rendered metadata.
 *   • `CompanionVisualManifest` — the per-id collection consumed by the
 *     UI layer and (later) by React Native.
 *
 * Privacy / safety contract
 * -------------------------
 *   • Visual ids do NOT encode any per-user data (no quiz answers, no
 *     payment data, no learning telemetry). They are pure cosmetic ids.
 *   • Asset src strings are intentionally allowed to be missing (or
 *     placeholder) — the `CompanionAvatar` component MUST render a safe
 *     fallback when no real asset exists, so we never ship a broken
 *     image to production.
 *   • The manifest must NOT import any browser-only API. It is shared
 *     between web and (future) React Native, so it stays pure data.
 *
 * What this file does NOT do
 * --------------------------
 *   • It does not bundle any image. Images, if any, are referenced by
 *     `src` only and live under `public/companion/` once exported.
 *   • It does not implement growth/XP logic — that lives in
 *     `lib/companion/companionGrowth.ts`.
 *   • It does not import any payment library, any Supabase client, or
 *     any restricted system.
 */

/**
 * Visual identity ids. Today we ship one — the YoPratiqo "travel"
 * companion from the marketing image. Future identities reuse the same
 * naming convention (`companion-<id>-<state>.png`).
 */
export type CompanionVisualId = "travel";

export const COMPANION_VISUAL_IDS: readonly CompanionVisualId[] = [
  "travel",
] as const;

/**
 * The eight production states from the asset plan. Order matches the
 * plan — DO NOT reorder without updating `docs/COMPANION_BRIDGE_ASSET_PLAN.md`
 * and the renderer fallback table.
 */
export type CompanionVisualState =
  | "idle"
  | "map"
  | "confused"
  | "celebrating"
  | "teacher_ready"
  | "level_up"
  | "inactive"
  | "badge_unlocked";

export const COMPANION_VISUAL_STATES: readonly CompanionVisualState[] = [
  "idle",
  "map",
  "confused",
  "celebrating",
  "teacher_ready",
  "level_up",
  "inactive",
  "badge_unlocked",
] as const;

/** Asset file format. */
export type CompanionVisualFormat = "png" | "webp" | "lottie" | "rive";

/**
 * A single state's rendered metadata. Every field is plain JSON so the
 * manifest can be serialized for React Native or a JSON API later.
 */
export type CompanionVisualAsset = {
  /** Stable composite id: `<visualId>-<state>`. */
  id: string;
  /** Visual identity (e.g. "travel"). */
  visualId: CompanionVisualId;
  /** Pose / mood state. */
  state: CompanionVisualState;
  /**
   * Absolute web path under `public/`. May be `null` when no production
   * asset has shipped yet — renderers MUST treat null as "use fallback".
   */
  src: string | null;
  /**
   * Locale-neutral alt token. The UI layer composes the localized alt
   * via the `companionVisualAltKey()` helper.
   */
  alt: string;
  /** Source canvas dimensions (square). */
  width: number;
  height: number;
  /** File format. Defaults to "png" until Rive/Lottie ships. */
  format: CompanionVisualFormat;
  /** Whether the source asset has a transparent background. */
  transparentBackground: boolean;
  /**
   * Whether the asset is shipped in a form that React Native can consume
   * directly (PNG/WebP). Lottie/Rive will set this true once we wire the
   * RN renderers.
   */
  reactNativeReady: boolean;
  /** Emoji shown by the fallback renderer when `src` is null. */
  fallbackEmoji: string;
  /**
   * Optional `lucide-react` icon name shown beside the fallback emoji
   * (e.g. "Map" for the `map` state). Renderer-resolved.
   */
  fallbackIcon: string | null;
};

/** Manifest collection: one entry per `<visualId, state>` pair. */
export type CompanionVisualManifest = Record<
  CompanionVisualState,
  CompanionVisualAsset
>;

/**
 * Stable mapping from state → fallback emoji + icon name. Keep this
 * accessible to both web and future RN renderers; emoji glyphs are
 * universal Unicode so they render everywhere.
 */
const FALLBACK_TABLE: Record<
  CompanionVisualState,
  { emoji: string; icon: string | null; alt: string }
> = {
  idle: { emoji: "🦔", icon: "Sparkles", alt: "companion.state.idle" },
  map: { emoji: "🦔", icon: "Map", alt: "companion.state.map" },
  confused: { emoji: "🦔", icon: "HelpCircle", alt: "companion.state.confused" },
  celebrating: { emoji: "🦔", icon: "PartyPopper", alt: "companion.state.celebrating" },
  teacher_ready: {
    emoji: "🦔",
    icon: "GraduationCap",
    alt: "companion.state.teacher_ready",
  },
  level_up: { emoji: "🦔", icon: "Star", alt: "companion.state.level_up" },
  inactive: { emoji: "🦔", icon: "Moon", alt: "companion.state.inactive" },
  badge_unlocked: {
    emoji: "🦔",
    icon: "Award",
    alt: "companion.state.badge_unlocked",
  },
};

/** Convert internal underscore state to the kebab-case asset filename. */
function stateFileSlug(state: CompanionVisualState): string {
  return state.replace(/_/g, "-");
}

/**
 * Build the full asset filename a content team would export. We do NOT
 * promise the file exists — see `assetSrc()` below for the null-aware
 * production check.
 */
export function companionVisualFilename(
  visualId: CompanionVisualId,
  state: CompanionVisualState,
): string {
  return `companion-${visualId}-${stateFileSlug(state)}.png`;
}

/**
 * Set of state filenames that have already been exported and reviewed
 * by the design team. Entries are added here ONLY when the actual PNG
 * (matching the asset plan: transparent, 1024×1024, no text, no logo)
 * has landed in `public/companion/<visualId>/`. Anything not in this
 * set returns `src: null` and the renderer falls back to the universal
 * emoji+icon variant.
 *
 * This explicit allow-list is the difference between "asset planned"
 * and "asset shippable in production". It also stops a typo from
 * pointing the UI at a non-existent file.
 */
const SHIPPED_ASSETS: ReadonlySet<string> = new Set<string>([
  // No production exports yet — the design team needs to deliver the 8
  // PNGs first (do not crop from poster; see
  // docs/COMPANION_BRIDGE_ASSET_PLAN.md). Add the filename here once it
  // lands in public/companion/<visualId>/.
]);

function assetSrc(
  visualId: CompanionVisualId,
  state: CompanionVisualState,
): string | null {
  const filename = companionVisualFilename(visualId, state);
  if (!SHIPPED_ASSETS.has(filename)) return null;
  return `/companion/${visualId}/${filename}`;
}

function buildAsset(
  visualId: CompanionVisualId,
  state: CompanionVisualState,
): CompanionVisualAsset {
  const fallback = FALLBACK_TABLE[state];
  const src = assetSrc(visualId, state);
  return {
    id: `${visualId}-${state}`,
    visualId,
    state,
    src,
    alt: fallback.alt,
    width: 1024,
    height: 1024,
    format: "png",
    transparentBackground: true,
    reactNativeReady: src != null,
    fallbackEmoji: fallback.emoji,
    fallbackIcon: fallback.icon,
  };
}

function buildManifest(visualId: CompanionVisualId): CompanionVisualManifest {
  return COMPANION_VISUAL_STATES.reduce<CompanionVisualManifest>(
    (acc, state) => {
      acc[state] = buildAsset(visualId, state);
      return acc;
    },
    {} as CompanionVisualManifest,
  );
}

/**
 * Stable manifest of every (visualId × state) the app knows about.
 * Renderers read from this — never from raw filenames.
 */
export const COMPANION_VISUAL_MANIFESTS: Record<
  CompanionVisualId,
  CompanionVisualManifest
> = {
  travel: buildManifest("travel"),
};

/**
 * Lookup helper: pick a (visualId, state) pair. Always returns a usable
 * asset (with `src: null` when no real file exists), so renderers can
 * safely fall back without a try/catch.
 */
export function getCompanionVisualAsset(
  visualId: CompanionVisualId,
  state: CompanionVisualState,
): CompanionVisualAsset {
  return COMPANION_VISUAL_MANIFESTS[visualId][state];
}

/**
 * Whether a real production image exists for the (visualId, state) pair.
 * Used by tests and renderers to assert fallback behavior.
 */
export function hasProductionCompanionAsset(
  visualId: CompanionVisualId,
  state: CompanionVisualState,
): boolean {
  return getCompanionVisualAsset(visualId, state).src != null;
}

/** Locale-neutral alt-text token a UI layer can localize. */
export function companionVisualAltKey(state: CompanionVisualState): string {
  return FALLBACK_TABLE[state].alt;
}
