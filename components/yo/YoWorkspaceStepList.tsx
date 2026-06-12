"use client";

/**
 * YoWorkspaceStepList
 *
 * Persistent left-rail "table of contents" for a desktop workspace.
 * Renders one row per step, with:
 *
 *   • a numeric step counter ("1 / N", "2 / N", …),
 *   • the step label,
 *   • optional Yoppo companion-state styling (the active step is
 *     emphasized like a current chapter),
 *   • a click-to-jump handler that scrolls to the matching anchor
 *     in the centre pane (or invokes a custom `onStepSelected`
 *     callback for routes that drive their own state).
 *
 * Why this exists
 * ---------------
 * On mobile, `<YoStepNavigator>` already gives the learner an
 * explicit Back / Next chrome + clickable dot indicator. On
 * desktop the workspace lays everything out at once, so a learner
 * who scrolls down can lose track of *where* they are in the
 * sequence and what's coming next. The Phase 3 polish target is
 * for every learner workspace to expose a persistent step list in
 * the left rail so:
 *
 *   - the learner always sees the sequence of steps,
 *   - the active step is highlighted (so "you are here" is
 *     unambiguous on a 1920px monitor too),
 *   - clicking any step jumps to its anchor in the centre pane.
 *
 * Anchors
 * -------
 * Each step is matched to a centre-pane section by `step.id` →
 * `[data-yo-workspace-step-anchor="<id>"]`. Callers are expected
 * to mark their centre-pane sections with that attribute (or
 * `id="yo-workspace-step-<id>"` as a fallback). When the
 * attribute is missing, the click is a no-op — the rail still
 * renders so the visual contract holds.
 *
 * Privacy / safety profile
 * ------------------------
 *   • Client component, state-only-in-memory. No API calls, no
 *     persistence, no payment library, no Supabase write, no
 *     quiz storage, no AI summary, no analytics.
 */

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type YoWorkspaceStepListItem = {
  /** Stable per-route slug. Must match the centre-pane anchor. */
  id: string;
  /** Localized label shown in the rail. */
  label: string;
  /** Optional short helper line (one sentence max). */
  hint?: string;
};

export type YoWorkspaceStepListProps = {
  /** Stable per-surface slug for tests + analytics. */
  surfaceId: string;
  /** Ordered, non-empty list of steps. */
  steps: ReadonlyArray<YoWorkspaceStepListItem>;
  /**
   * Optional initial active step index. Defaults to 0. Ignored
   * when the rail auto-detects the active step from scroll
   * position.
   */
  initialActiveIndex?: number;
  /**
   * If true (default), the rail listens to the nearest scrolling
   * ancestor and highlights the step whose anchor is currently in
   * view. Set to false to drive the active state entirely from
   * the caller via `activeIndex` + `onStepSelected`.
   */
  trackScroll?: boolean;
  /** Caller-controlled active step (used when `trackScroll === false`). */
  activeIndex?: number;
  /**
   * Optional callback fired when the learner clicks a step. The
   * default behaviour (scroll to anchor) still runs.
   */
  onStepSelected?: (step: YoWorkspaceStepListItem, index: number) => void;
  /** Optional localized header for the rail itself. */
  heading?: string;
  className?: string;
};

const ANCHOR_ATTR = "data-yo-workspace-step-anchor";

function findAnchorNode(stepId: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const byAttr = document.querySelector<HTMLElement>(
    `[${ANCHOR_ATTR}="${CSS.escape(stepId)}"]`,
  );
  if (byAttr) return byAttr;
  return document.getElementById(`yo-workspace-step-${stepId}`);
}

export function YoWorkspaceStepList({
  surfaceId,
  steps,
  initialActiveIndex = 0,
  trackScroll = true,
  activeIndex: controlledActiveIndex,
  onStepSelected,
  heading,
  className,
}: YoWorkspaceStepListProps): React.JSX.Element {
  const total = steps.length;
  if (total === 0) {
    throw new Error("YoWorkspaceStepList requires at least one step");
  }

  const [internalActive, setInternalActive] = useState(() => {
    if (initialActiveIndex < 0) return 0;
    if (initialActiveIndex >= total) return total - 1;
    return initialActiveIndex;
  });

  const activeIndex =
    typeof controlledActiveIndex === "number"
      ? Math.max(0, Math.min(total - 1, controlledActiveIndex))
      : internalActive;

  // Auto-track which step's anchor is currently in view. Uses an
  // IntersectionObserver scoped to the centre pane's scroll
  // container so the rail stays in sync as the learner scrolls.
  useEffect(() => {
    if (!trackScroll) return;
    if (typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") return;

    const nodes = steps
      .map((step, idx) => {
        const node = findAnchorNode(step.id);
        return node ? { node, idx } : null;
      })
      .filter((x): x is { node: HTMLElement; idx: number } => Boolean(x));

    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length === 0) return;
        const top = visible[0]?.target as HTMLElement | undefined;
        if (!top) return;
        const idx = nodes.findIndex((n) => n.node === top);
        if (idx >= 0) setInternalActive(idx);
      },
      {
        // Treat a step as "active" when at least 35% of its anchor
        // is in the centre pane viewport. Threshold balances
        // accuracy with cheap re-evaluation.
        threshold: [0.35, 0.6, 0.9],
        rootMargin: "-10% 0px -40% 0px",
      },
    );

    for (const n of nodes) observer.observe(n.node);
    return () => observer.disconnect();
  }, [steps, trackScroll]);

  const onClickStep = useCallback(
    (step: YoWorkspaceStepListItem, idx: number) => {
      // Always run the optional callback first so the caller can
      // override or extend the default behaviour.
      onStepSelected?.(step, idx);
      setInternalActive(idx);
      const anchor = findAnchorNode(step.id);
      if (!anchor) return;
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      try {
        anchor.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
      } catch {
        anchor.scrollIntoView();
      }
    },
    [onStepSelected],
  );

  return (
    <nav
      data-testid="yo-workspace-step-list"
      data-yo-workspace-step-list="true"
      data-yo-workspace-step-list-surface={surfaceId}
      data-yo-workspace-step-list-total={String(total)}
      data-yo-workspace-step-list-active={String(activeIndex)}
      aria-label={heading}
      className={cn(
        "flex flex-col gap-2 rounded-2xl border border-[#E7DFCF] bg-white/85 p-3 backdrop-blur-md",
        className,
      )}
    >
      {heading ? (
        <p
          data-testid="yo-workspace-step-list-heading"
          className="px-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#0F6E56]/70"
        >
          {heading}
        </p>
      ) : null}
      <ol className="flex flex-col gap-1">
        {steps.map((step, idx) => {
          const isActive = idx === activeIndex;
          const isPast = idx < activeIndex;
          return (
            <li key={step.id}>
              <button
                type="button"
                data-testid="yo-workspace-step-list-item"
                data-yo-workspace-step-list-item-id={step.id}
                data-yo-workspace-step-list-item-index={String(idx)}
                data-yo-workspace-step-list-item-active={
                  isActive ? "true" : "false"
                }
                aria-current={isActive ? "step" : undefined}
                onClick={() => onClickStep(step, idx)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition",
                  isActive
                    ? "border-[#0F6E56]/40 bg-[#FFF4D6]/70 shadow-[0_4px_14px_rgba(15,110,86,0.06)]"
                    : "border-transparent hover:border-[#E7DFCF] hover:bg-white",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition",
                    isActive
                      ? "border-[#0F6E56] bg-[#0F6E56] text-white"
                      : isPast
                        ? "border-[#0F6E56]/70 bg-[#0F6E56]/15 text-[#0F6E56]"
                        : "border-[#E7DFCF] bg-white text-[#0F6E56]/70",
                  )}
                  aria-hidden
                >
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-semibold leading-snug",
                      isActive
                        ? "text-[#0F6E56]"
                        : "text-[#172642] group-hover:text-[#0F6E56]",
                    )}
                  >
                    {step.label}
                  </span>
                  {step.hint ? (
                    <span className="mt-0.5 block text-xs leading-snug text-[#0F6E56]/70">
                      {step.hint}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default YoWorkspaceStepList;
