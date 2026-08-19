/**
 * Card-only bio block. Secondary to the discipline row.
 * Uses line-clamp (never whitespace-pre-*) plus a short bottom fade.
 */

export function TeacherCardBioSnippet({ text }: { text: string }) {
  const snippet = String(text ?? "").trim();
  if (!snippet) return null;

  return (
    <div data-testid="teacher-card-bio-snippet" className="relative mt-1 max-h-[2.75rem] overflow-hidden">
      <p className="line-clamp-2 text-[13px] leading-relaxed text-slate-500">{snippet}</p>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2.5 bg-gradient-to-t from-white to-transparent"
      />
    </div>
  );
}
