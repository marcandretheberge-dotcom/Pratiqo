import PratiqoLogo from "@/components/PratiqoLogo";

type LogoVariant = "dark" | "light";
type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
}

export default function Logo({ variant = "dark", size = "md", className }: LogoProps) {
  void variant;
  return <PratiqoLogo variant="full" size={size} className={className} />;
}
