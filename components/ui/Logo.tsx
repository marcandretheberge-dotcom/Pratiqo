import React from "react";
import { cn } from "../../lib/utils";

type LogoVariant = "dark" | "light";
type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
}

const sizes = {
  sm: { box: 28, text: 15 },
  md: { box: 36, text: 18 },
  lg: { box: 48, text: 24 },
};

export default function Logo({ variant = "dark", size = "md", className }: LogoProps) {
  const s = sizes[size];
  const iconColor = variant === "light" ? "white" : "#1D9E75";
  const textColor = variant === "light" ? "white" : "#2C2C2A";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg width={s.box} height={s.box} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="10" fill={iconColor}/>
        <rect x="8" y="8" width="3.5" height="20" rx="1.75" fill="white"/>
        <path d="M11.5 8 Q23 8 23 16 Q23 24 11.5 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="28" cy="21" r="1.8" fill="white" opacity="0.5"/>
        <circle cx="28" cy="16" r="1.8" fill="white" opacity="0.75"/>
        <circle cx="28" cy="11" r="1.8" fill="white"/>
      </svg>
      <span style={{ fontSize: s.text, fontWeight: 500, color: textColor, letterSpacing: "-0.3px" }}>
        Pratiqo
      </span>
    </div>
  );
}
