export function LandingHeadline({ title, accent }: { title: string; accent: string }) {
  const hasAccent = Boolean(accent) && title.endsWith(accent);
  return (
    <h1 className="text-[28px] font-semibold leading-tight tracking-normal text-[#1a1f1d] sm:text-4xl lg:text-[44px]">
      {hasAccent ? (
        <>{title.slice(0, -accent.length)}<span className="font-normal italic text-teal-700" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{accent}</span></>
      ) : title}
    </h1>
  );
}
