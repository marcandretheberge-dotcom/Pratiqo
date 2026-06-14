"use client";

import { Printer } from "lucide-react";

export function YoPrintButton({ label }: { label: string }) {
  return (
    <button
      data-yo-print-action="true"
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(15,110,86,0.18)] transition hover:bg-[#0b5b47] print:hidden"
    >
      <Printer className="size-4" aria-hidden />
      {label}
    </button>
  );
}
