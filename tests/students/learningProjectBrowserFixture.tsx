// Browser QA only: real components, synthetic boundaries, no external services.
import React from "react";
import { createRoot } from "react-dom/client";
import { StudentDashboard } from "@/components/StudentDashboard";
import AdminDemand from "@/app/(app)/admin/learning-project-demand/page";

createRoot(document.getElementById("root")!).render(
  location.pathname.startsWith("/admin") ? <AdminDemand /> : <StudentDashboard />,
);
