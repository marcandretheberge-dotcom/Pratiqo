import React from "react";
import type { ImageProps } from "next/image";

// Static review adapters only. The product continues to use the real Next components.
export function Image({ src, alt, fill, priority, quality: _quality, sizes: _sizes, loading, ...props }: ImageProps) {
  const url = typeof src === "string" ? src : "src" in src ? src.src : src.default.src;
  return <img src={url} alt={alt} loading={priority ? "eager" : loading} {...props} style={fill ? {position:"absolute",inset:0,width:"100%",height:"100%",...props.style}:props.style}/>;
}
type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string }; prefetch?: boolean; replace?: boolean; scroll?: boolean;
};
export function Link({href, prefetch: _prefetch, replace: _replace, scroll: _scroll, ...props}: LinkProps) {
  return <a href={typeof href === "string" ? href : href.pathname} {...props}/>;
}
export function usePathname() { return location.pathname; }
export function useSearchParams() { return new URLSearchParams(location.search); }
export function useRouter() { return {push:(href:string)=>location.assign(href),replace:(href:string)=>location.replace(href),refresh:()=>location.reload()}; }
export function notFound(): never { throw new Error("Unknown review route"); }
