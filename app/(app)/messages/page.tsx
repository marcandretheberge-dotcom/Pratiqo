"use client";

import React from "react";
import Link from "next/link";

export default function MessagesPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold tracking-tight text-slate-900">Messages</h2>
      <p className="text-sm text-slate-500 font-medium">
        Page placeholder (tu peux brancher le chat Supabase ici ensuite).
      </p>
      <Link href="/dashboard" className="text-brand-primary text-sm font-bold hover:underline">
        Retour au tableau de bord
      </Link>
    </div>
  );
}

