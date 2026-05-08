import Image from "next/image";
import { cn } from "@/lib/utils";

type PratiqoLogoVariant = "full" | "icon";
type PratiqoLogoSize = "sm" | "md" | "lg";

type PratiqoLogoProps = {
  variant?: PratiqoLogoVariant;
  size?: PratiqoLogoSize;
  className?: string;
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

export function PratiqoLogo({ variant = "full", size = "md", className }: PratiqoLogoProps) {
  if (variant === "icon") {
    const iconSize = iconSizes[size];
    return (
      <Image
        src="/branding/pratiqo-icon.png"
        alt="Pratiqo"
        width={320}
        height={320}
        className={cn("block h-auto shrink-0 object-contain", className)}
        style={{ width: iconSize, height: iconSize }}
        priority
      />
    );
  }

  const width = fullWidths[size];
  return (
    <Image
      src="/branding/pratiqo-logo.png"
      alt="Pratiqo"
      width={2048}
      height={512}
      className={cn("block h-auto shrink-0 object-contain", className)}
      style={{ width }}
      priority
    />
  );
}

export default PratiqoLogo;
