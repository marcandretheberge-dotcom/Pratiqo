import React from "react";
import { SupabaseCoursesCrud } from "../../../components/SupabaseCoursesCrud";

export default function SupabaseDemoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Supabase</h2>
        <p className="text-sm text-slate-500 font-medium">
          Démo CRUD simple avec `@supabase/supabase-js`.
        </p>
      </div>
      <SupabaseCoursesCrud />
    </div>
  );
}

