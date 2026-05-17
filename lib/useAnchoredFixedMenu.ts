"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export type AnchoredMenuPosition = { top: number; right: number };

/** Positions a fixed popover below `anchorRef`, aligned to its right edge. */
export function useAnchoredFixedMenu(
  isOpen: boolean,
  anchorRef: RefObject<HTMLElement | null>,
): AnchoredMenuPosition | null {
  const [position, setPosition] = useState<AnchoredMenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const anchor = anchorRef.current;
    if (!anchor) return;

    const sync = () => {
      const rect = anchor.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    };

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [isOpen, anchorRef]);

  return isOpen ? position : null;
}
