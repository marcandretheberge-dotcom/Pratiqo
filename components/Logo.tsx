"use client";

import PratiqoLogo from "@/components/PratiqoLogo";

interface LogoProps {
  variant?: "light" | "dark";
  showTagline?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({
  variant = "dark",
  showTagline = true,
  className = "",
  size = "md",
}: LogoProps) {
  void variant;
  void showTagline;
  return <PratiqoLogo variant="full" size={size} className={className} />;
}

