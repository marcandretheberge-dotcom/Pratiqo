"use client";

/**
 * LegalMarkdownBody — renders markdown legal content with Tailwind prose styles.
 * Uses react-markdown + remark-gfm (GFM tables, task lists, strikethrough).
 */

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { createLegalHeadingIdRegistry } from "@/lib/legal/headingIds";

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (typeof node === "object" && "props" in node) {
    return nodeText((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

export function LegalMarkdownBody({
  content,
  headingIds,
}: {
  content: string;
  /**
   * Optional ids for top-level legal markdown sections. LegalLayout injects
   * its TOC ids here so sidebar links and rendered H2 anchors stay identical.
   */
  headingIds?: readonly string[];
}) {
  let h2Index = 0;
  const nextHeadingId = createLegalHeadingIdRegistry();

  const components: Components = {
    h1({ children, node: _node, ...props }) {
      void _node;
      const id = nextHeadingId(nodeText(children));
      return (
        <h1 id={id} className="scroll-mt-24" {...props}>
          {children}
        </h1>
      );
    },
    h2({ children, node: _node, ...props }) {
      void _node;
      const id = nextHeadingId(nodeText(children), headingIds?.[h2Index++]);
      return (
        <h2 id={id} className="scroll-mt-24" {...props}>
          {children}
        </h2>
      );
    },
    h3({ children, node: _node, ...props }) {
      void _node;
      const id = nextHeadingId(nodeText(children));
      return (
        <h3 id={id} className="scroll-mt-24" {...props}>
          {children}
        </h3>
      );
    },
    h4({ children, node: _node, ...props }) {
      void _node;
      const id = nextHeadingId(nodeText(children));
      return (
        <h4 id={id} className="scroll-mt-24" {...props}>
          {children}
        </h4>
      );
    },
    h5({ children, node: _node, ...props }) {
      void _node;
      const id = nextHeadingId(nodeText(children));
      return (
        <h5 id={id} className="scroll-mt-24" {...props}>
          {children}
        </h5>
      );
    },
    h6({ children, node: _node, ...props }) {
      void _node;
      const id = nextHeadingId(nodeText(children));
      return (
        <h6 id={id} className="scroll-mt-24" {...props}>
          {children}
        </h6>
      );
    },
  };

  return (
    <div className="prose prose-sm sm:prose max-w-none text-[var(--p-text)] [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:border-l-4 [&_h2]:border-teal-500 [&_h2]:pl-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_strong]:text-[var(--p-text)] [&_a]:text-teal-700 [&_a]:underline [&_blockquote]:rounded-xl [&_blockquote]:border [&_blockquote]:border-amber-200 [&_blockquote]:bg-amber-50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-amber-950 [&_blockquote]:not-italic [&_table]:text-sm [&_th]:font-semibold [&_th]:bg-slate-100 [&_th]:border [&_th]:border-slate-200 [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_hr]:border-slate-200 [&_hr]:my-8 [&_li]:text-[var(--p-text-muted)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
