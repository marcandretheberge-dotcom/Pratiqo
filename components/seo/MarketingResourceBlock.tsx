import Link from "next/link";

export function MarketingResourceBlock({
  title,
  links,
  id,
  className = "",
}: {
  title: string;
  links: { href: string; label: string }[];
  id?: string;
  className?: string;
}) {
  if (!links.length) return null;
  const headingId = id ?? "marketing-resource-block";
  return (
    <section
      className={`rounded-2xl border border-[#E8E6DF] bg-[#FAFAF8] px-5 py-5 sm:px-6 ${className}`}
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="text-sm font-bold uppercase tracking-wide text-[#2D7B72]">
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-[15px] font-semibold text-[#0F6E56] hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
