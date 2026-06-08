"use client";

/**
 * LegalMarkdownBody renders markdown legal content with stable heading anchors
 * and a restrained document style tuned for long policies on desktop and mobile.
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
        <h1 id={id} className="scroll-mt-28 text-3xl font-semibold leading-tight text-[#163D35]" {...props}>
          {children}
        </h1>
      );
    },
    h2({ children, node: _node, ...props }) {
      void _node;
      const id = nextHeadingId(nodeText(children), headingIds?.[h2Index++]);
      return (
        <h2
          id={id}
          className="scroll-mt-28 border-l-4 border-[#1D9E75] pl-4 text-xl font-semibold leading-tight text-[#163D35]"
          {...props}
        >
          {children}
        </h2>
      );
    },
    h3({ children, node: _node, ...props }) {
      void _node;
      const id = nextHeadingId(nodeText(children));
      return (
        <h3 id={id} className="scroll-mt-28 text-lg font-semibold leading-snug text-slate-950" {...props}>
          {children}
        </h3>
      );
    },
    h4({ children, node: _node, ...props }) {
      void _node;
      const id = nextHeadingId(nodeText(children));
      return (
        <h4 id={id} className="scroll-mt-28 text-base font-semibold leading-snug text-slate-950" {...props}>
          {children}
        </h4>
      );
    },
    h5({ children, node: _node, ...props }) {
      void _node;
      const id = nextHeadingId(nodeText(children));
      return (
        <h5 id={id} className="scroll-mt-28 text-sm font-bold uppercase tracking-wide text-slate-700" {...props}>
          {children}
        </h5>
      );
    },
    h6({ children, node: _node, ...props }) {
      void _node;
      const id = nextHeadingId(nodeText(children));
      return (
        <h6 id={id} className="scroll-mt-28 text-sm font-bold text-slate-700" {...props}>
          {children}
        </h6>
      );
    },
    p({ children, node: _node, ...props }) {
      void _node;
      return (
        <p className="my-4 text-[15px] leading-7 text-slate-700" {...props}>
          {children}
        </p>
      );
    },
    a({ children, node: _node, ...props }) {
      void _node;
      return (
        <a
          className="font-medium text-[#0F6E56] underline decoration-emerald-300 decoration-2 underline-offset-4 hover:text-[#0A5744]"
          {...props}
        >
          {children}
        </a>
      );
    },
    ul({ children, node: _node, ...props }) {
      void _node;
      return (
        <ul className="my-4 list-disc space-y-2 pl-6 text-[15px] leading-7 text-slate-700 marker:text-[#1D9E75]" {...props}>
          {children}
        </ul>
      );
    },
    ol({ children, node: _node, ...props }) {
      void _node;
      return (
        <ol className="my-4 list-decimal space-y-2 pl-6 text-[15px] leading-7 text-slate-700 marker:font-semibold marker:text-[#0F6E56]" {...props}>
          {children}
        </ol>
      );
    },
    li({ children, node: _node, ...props }) {
      void _node;
      return (
        <li className="pl-1" {...props}>
          {children}
        </li>
      );
    },
    blockquote({ children, node: _node, ...props }) {
      void _node;
      return (
        <blockquote
          className="my-6 rounded-2xl border border-amber-200 bg-[#FFF8E6] px-4 py-4 text-[15px] leading-7 text-amber-950 shadow-sm [&_p]:my-0 [&_p]:text-amber-950"
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    hr({ node: _node, ...props }) {
      void _node;
      return <hr className="my-8 border-slate-200" {...props} />;
    },
    table({ children, node: _node, ...props }) {
      void _node;
      return (
        <div className="my-6 overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="min-w-full border-collapse bg-white text-sm" {...props}>
            {children}
          </table>
        </div>
      );
    },
    th({ children, node: _node, ...props }) {
      void _node;
      return (
        <th className="border-b border-slate-200 bg-[#F3FAF6] px-4 py-3 text-left font-semibold text-[#163D35]" {...props}>
          {children}
        </th>
      );
    },
    td({ children, node: _node, ...props }) {
      void _node;
      return (
        <td className="border-t border-slate-100 px-4 py-3 align-top text-slate-700" {...props}>
          {children}
        </td>
      );
    },
    strong({ children, node: _node, ...props }) {
      void _node;
      return (
        <strong className="font-semibold text-slate-950" {...props}>
          {children}
        </strong>
      );
    },
    code({ children, node: _node, ...props }) {
      void _node;
      return (
        <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.92em] font-semibold text-slate-800" {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="max-w-none text-slate-700 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1+*]:mt-4 [&_h2]:mb-4 [&_h2]:mt-10 [&_h3]:mb-3 [&_h3]:mt-7 [&_h4]:mb-2 [&_h4]:mt-5">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
