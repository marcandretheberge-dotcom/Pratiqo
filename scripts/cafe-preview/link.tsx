import type { AnchorHTMLAttributes } from "react";

type PreviewLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  prefetch?: boolean | null;
};

/** The static review has no Next router. Keep real outbound navigation explicit. */
export default function PreviewLink({ href, prefetch: _prefetch, ...props }: PreviewLinkProps) {
  void _prefetch;
  const destination = href === "/" || href === "/yo" || href.startsWith("/yo/")
    ? `https://www.pratiqo.ca${href}` : href;
  return <a {...props} href={destination} />;
}
