const particles = [
  [12,18,0,7],[31,29,1.1,8.4],[55,15,.4,7.8],[79,27,1.8,9.1],
  [18,62,2.2,8.7],[43,71,.8,7.5],[69,57,1.5,8.2],[87,68,.2,9.4],
] as const;

/** Restrained, decorative world atmosphere. Eight DOM nodes, no canvas loop. */
export function ItalianAtlasAtmosphere({ worldId }: { worldId: string }) {
  const kind = worldId === "daily-life" ? "glint" : worldId === "independence" ? "star" : "mote";
  return <div
    aria-hidden="true"
    data-yoppo-atmosphere={kind}
    className="pointer-events-none absolute inset-0 z-[7] overflow-hidden"
  >
    {particles.map(([left, top, delay, duration], index) =>
      <span key={index}
        className={`yo-atmosphere-particle yo-atmosphere-${kind}`}
        style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
      />
    )}
    <style>{`
      .yo-atmosphere-particle{position:absolute;display:block;opacity:.3}
      .yo-atmosphere-mote{width:5px;height:5px;border-radius:999px;background:rgba(255,245,190,.86);box-shadow:0 0 10px rgba(255,236,155,.48)}
      .yo-atmosphere-glint{width:7px;height:2px;border-radius:999px;background:rgba(242,255,244,.84);box-shadow:0 0 8px rgba(223,255,245,.45)}
      .yo-atmosphere-star{width:4px;height:4px;border-radius:999px;background:rgba(255,245,219,.9);box-shadow:0 0 8px rgba(255,235,196,.5)}
      @media(prefers-reduced-motion:no-preference){
        .yo-atmosphere-mote{animation:yo-atmosphere-drift 8s ease-in-out infinite alternate}
        .yo-atmosphere-glint{animation:yo-atmosphere-glint 4.8s ease-in-out infinite}
        .yo-atmosphere-star{animation:yo-atmosphere-star 5.5s ease-in-out infinite}
      }
      @keyframes yo-atmosphere-drift{from{transform:translate3d(0,5px,0);opacity:.16}to{transform:translate3d(9px,-11px,0);opacity:.45}}
      @keyframes yo-atmosphere-glint{0%,100%{transform:scaleX(.65);opacity:.12}45%,60%{transform:scaleX(1.55);opacity:.48}}
      @keyframes yo-atmosphere-star{0%,100%{transform:scale(.8);opacity:.16}50%{transform:scale(1.35);opacity:.52}}
      @media(prefers-reduced-motion:reduce){.yo-atmosphere-particle{animation:none!important;opacity:.18}}
    `}</style>
  </div>;
}
