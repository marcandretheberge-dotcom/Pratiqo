import React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-10 px-4 text-center", className)}>
      <div className="mb-4 text-teal-200">
        {icon || (
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="40" cy="40" r="40" fill="currentColor" opacity="0.2" />
            <path
              d="M40 25C31.7157 25 25 31.7157 25 40C25 48.2843 31.7157 55 40 55C48.2843 55 55 48.2843 55 40C55 31.7157 48.2843 25 40 25ZM40 51C33.9249 51 29 46.0751 29 40C29 33.9249 33.9249 29 40 29C46.0751 29 51 33.9249 51 40C51 46.0751 46.0751 51 40 51Z"
              fill="currentColor"
            />
            <path
              d="M43 37L37 43M37 37L43 43"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <h4 className="text-sm font-bold text-slate-800 mb-1">{title}</h4>
      {description && <p className="text-xs text-slate-500 max-w-[250px] mb-4 leading-relaxed">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
