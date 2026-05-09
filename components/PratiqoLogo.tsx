import Image from "next/image";
import { cn } from "@/lib/utils";

type PratiqoLogoVariant = "full" | "icon";
type PratiqoLogoSize = "sm" | "md" | "lg";

type PratiqoLogoProps = {
  variant?: PratiqoLogoVariant;
  size?: PratiqoLogoSize;
  className?: string;
  /** When false, avoids competing with hero LCP (e.g. landing h1). Defaults true for backward compatibility. */
  priority?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  /** Use `lazy` for non-LCP marks (e.g. desktop-only full logo while mobile shows icon). */
  loading?: "eager" | "lazy";
};

const fullWidths: Record<PratiqoLogoSize, number> = {
  sm: 120,
  md: 160,
  lg: 220,
};

const iconSizes: Record<PratiqoLogoSize, number> = {
  sm: 36,
  md: 44,
  lg: 56,
};

/** Display width in CSS px — used for `sizes` so the browser picks an appropriate src. */
const fullSizesAttr: Record<PratiqoLogoSize, string> = {
  sm: "120px",
  md: "160px",
  lg: "220px",
};

const iconSizesAttr: Record<PratiqoLogoSize, string> = {
  sm: "36px",
  md: "44px",
  lg: "56px",
};

export function PratiqoLogo({
  variant = "full",
  size = "md",
  className,
  priority = true,
  fetchPriority,
  loading,
}: PratiqoLogoProps) {
  if (variant === "icon") {
    const iconSize = iconSizes[size];
    return (
      <Image
        src="/branding/pratiqo-icon.png"
        alt="Pratiqo"
        width={80}
        height={80}
        sizes={iconSizesAttr[size]}
        className={cn("block h-auto shrink-0 object-contain", className)}
        style={{ width: iconSize, height: iconSize }}
        priority={priority}
        fetchPriority={fetchPriority}
        loading={loading}
      />
    );
  }

  const width = fullWidths[size];
  return (
    <Image
      src="/branding/pratiqo-logo.png"
      alt="Pratiqo"
      width={480}
      height={120}
      sizes={fullSizesAttr[size]}
      className={cn("block h-auto shrink-0 object-contain", className)}
      style={{ width }}
      priority={priority}
      fetchPriority={fetchPriority}
      loading={loading}
    />
  );
}

export default PratiqoLogo;
