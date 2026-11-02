import type { ReactNode } from "react";
import { CourseExperience } from "@/components/yo/german/CourseExperience";
export default function PortugueseCourseLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <CourseExperience language="pt-BR">{children}</CourseExperience>;
}
