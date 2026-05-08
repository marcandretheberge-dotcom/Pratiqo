"use client";

/**
 * LegalMarkdownBody — renders markdown legal content with Tailwind prose styles.
 * Uses react-markdown + remark-gfm (GFM tables, task lists, strikethrough).
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function LegalMarkdownBody({ content }: { content: string }) {
  return (
    <div className="prose prose-sm sm:prose max-w-none text-[var(--p-text)] [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:border-l-4 [&_h2]:border-teal-500 [&_h2]:pl-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_strong]:text-[var(--p-text)] [&_a]:text-teal-700 [&_a]:underline [&_blockquote]:rounded-xl [&_blockquote]:border [&_blockquote]:border-amber-200 [&_blockquote]:bg-amber-50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-amber-950 [&_blockquote]:not-italic [&_table]:text-sm [&_th]:font-semibold [&_th]:bg-slate-100 [&_th]:border [&_th]:border-slate-200 [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_hr]:border-slate-200 [&_hr]:my-8 [&_li]:text-[var(--p-text-muted)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
