"use client";
import NextLink from "next/link";
import type { ComponentProps } from "react";

/** Learning screens fetch a destination when chosen, not during a lesson or a reload.
 * This prevents speculative RSC request cancellation from surfacing as WebKit errors.
 * Normal Next navigation, hrefs, new-tab printing and locale parameters are preserved.
 */
export default function LessonLink(props: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} prefetch={false} />;
}
