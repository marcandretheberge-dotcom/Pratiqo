import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

/** Flatten React node tree to plain text (for heading pattern detection only). */
function textContent(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (typeof node === "object" && "props" in node) {
    const el = node as { props?: { children?: ReactNode } };
    if (el.props?.children != null) return textContent(el.props.children);
  }
  return "";
}

const NUMBERED_H3 = /^(\d+)\.\s+([\s\S]+)$/;

export function BlogArticleMarkdownBody({ markdown }: { markdown: string }) {
  const components: Partial<Components> = {
    h2: ({ children, ...props }) => (
      <h2
        {...props}
        className="scroll-mt-28 border-l-4 border-[#50BEB2] pl-4 text-balance text-2xl font-extrabold leading-tight tracking-tight text-[#2D7B72] md:pl-5 md:text-3xl mt-12 md:mt-14 mb-4 md:mb-5"
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => {
      const raw = textContent(children).replace(/\s+/g, " ").trim();
      const m = raw.match(NUMBERED_H3);
      if (m) {
        const num = m[1];
        const titlePart = m[2].trim();
        return (
          <h3
            {...props}
            className="scroll-mt-28 mt-10 md:mt-12 mb-4 rounded-2xl border border-[#C5E7DB]/70 bg-gradient-to-r from-white to-[#F3FAF8] px-4 py-3.5 shadow-sm sm:px-5 sm:py-4 md:px-6"
          >
            <span className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2D7B72] text-sm font-extrabold text-white shadow-sm ring-2 ring-[#50BEB2]/40"
                aria-hidden
              >
                {num}
              </span>
              <span className="min-w-0 flex-1 text-lg font-bold leading-snug text-[#2D7B72] md:text-xl md:leading-tight">
                {titlePart}
              </span>
            </span>
          </h3>
        );
      }
      return (
        <h3
          {...props}
          className="scroll-mt-28 text-xl font-bold leading-snug tracking-tight text-[#2D7B72] md:text-2xl mt-8 md:mt-10 mb-3 md:mb-4"
        >
          {children}
        </h3>
      );
    },
    p: ({ children, ...props }) => (
      <p
        {...props}
        className="mb-5 text-lg leading-8 text-neutral-800 md:mb-6 [&+ul]:mt-2 [&+ol]:mt-2"
      >
        {children}
      </p>
    ),
    strong: ({ children, ...props }) => (
      <strong {...props} className="font-bold text-[#2C2C2C]">
        {children}
      </strong>
    ),
    a: ({ children, href, ...props }) => (
      <a
        {...props}
        href={href}
        className="font-semibold text-[#0F6E56] underline-offset-2 transition-colors hover:text-[#2D7B72] hover:underline"
      >
        {children}
      </a>
    ),
    ul: ({ children, ...props }) => (
      <ul {...props} className="my-8 list-disc space-y-3 pl-6 marker:text-[#2D7B72] md:space-y-3.5 md:pl-7">
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol
        {...props}
        className="my-8 list-decimal space-y-3 pl-6 marker:font-semibold marker:text-[#2D7B72] md:space-y-3.5 md:pl-7"
      >
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li {...props} className="text-lg leading-8 text-neutral-800 [&>p]:mb-2 [&>p:last-child]:mb-0">
        {children}
      </li>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        {...props}
        className="my-8 border-l-4 border-[#2D7B72]/35 bg-[#FAFAF8] py-3 pl-4 pr-4 text-[#4A4845] not-italic md:pl-5"
      >
        {children}
      </blockquote>
    ),
    hr: (props) => <hr {...props} className="my-12 border-0 border-t border-[#E8E6DF]" />,
    table: ({ children, ...props }) => (
      <div className="my-8 w-full overflow-x-auto rounded-xl border border-[#E8E6DF] bg-white">
        <table {...props} className="w-full min-w-[280px] text-left text-[15px]">
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }) => (
      <th {...props} className="border-b border-[#E8E6DF] bg-[#EFF8F4] px-3 py-3 font-semibold text-[#2C2C2A] md:px-4">
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td {...props} className="border-b border-[#E8E6DF] px-3 py-3 text-neutral-800 md:px-4">
        {children}
      </td>
    ),
  };

  return (
    <div className="blog-article-markdown text-[#2C2C2C]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
