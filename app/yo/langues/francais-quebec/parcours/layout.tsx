import type { ReactNode } from "react";
import { CourseExperience } from "@/components/yo/german/CourseExperience";
export default function FoundationLayout({ children }: { children: ReactNode }) {
  return <CourseExperience language="fr-CA">{children}</CourseExperience>;
}
