/**
 * Renders sanitized profile bio as paragraphs and lists.
 * Plain-text children only — never inject HTML.
 */

import type { TeacherProfileBioBlock } from "@/lib/teachers/profileBio";

export function TeacherProfileBio({
  blocks,
  fallback,
}: {
  blocks: TeacherProfileBioBlock[];
  fallback: string;
}) {
  if (blocks.length === 0) {
    return <p className="mb-4 last:mb-0 leading-7 text-slate-600">{fallback}</p>;
  }

  return (
    <div data-testid="teacher-profile-bio" className="max-w-prose text-slate-600 leading-7">
      {blocks.map((block, index) => {
        if (block.type === "list") {
          return (
            <ul
              key={`bio-list-${index}`}
              className="mb-4 list-disc space-y-2 pl-5 marker:text-slate-400 last:mb-0"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`bio-li-${index}-${itemIndex}`} className="leading-7 text-slate-600">
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`bio-p-${index}`} className="mb-4 last:mb-0 leading-7 text-slate-600">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
