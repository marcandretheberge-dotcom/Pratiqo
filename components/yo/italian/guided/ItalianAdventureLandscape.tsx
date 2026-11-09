type AdventurePalette = {
  sky: string; horizon: string; hill: string; forest: string;
  grass: string; deep: string; path: string; pathEdge: string;
  water: string; roof: string; stone: string; sun: string;
};
export const ITALIAN_ADVENTURE_PALETTES: Record<string, AdventurePalette> = {
  discover: {
    sky: "#64cdd2", horizon: "#d5f4c2", hill: "#7fc8a5",
    forest: "#267c67", grass: "#acd78b", deep: "#216a5c",
    path: "#f9d982", pathEdge: "#aa7648", water: "#5abfc8",
    roof: "#c96754", stone: "#ffe4aa", sun: "#fff3b0",
  },
  "daily-life": {
    sky: "#6bbfe4", horizon: "#f4e5b6", hill: "#83bacb",
    forest: "#397b88", grass: "#c6d99b", deep: "#316e79",
    path: "#f5dda0", pathEdge: "#bc8a63", water: "#3fa8c3",
    roof: "#ec9278", stone: "#f2d6b0", sun: "#fff0a3",
  },
  independence: {
    sky: "#7966b7", horizon: "#f3bcb8", hill: "#b78caf",
    forest: "#495580", grass: "#c6b1a8", deep: "#3b416d",
    path: "#ffdda3", pathEdge: "#a67c79", water: "#688ac2",
    roof: "#9b5473", stone: "#e9c7c1", sun: "#ffdb9b",
  },
};

const treeSpots = [
  [32, 255, .8], [83, 311, 1], [410, 247, 1.12], [465, 320, .72],
  [38, 440, .9], [444, 472, 1.1], [69, 615, .7], [411, 640, 1],
  [22, 765, 1.16], [446, 771, .8], [145, 771, .6], [376, 119, .8],
] as const;
const flowerSpots = [
  [53, 175], [428, 193], [35, 385], [450, 389], [80, 511],
  [396, 549], [62, 706], [418, 704], [208, 727], [375, 817],
] as const;

/** Original painterly game-board layers. The path is visual only and cannot
 * change unlocks, assessment evidence or destination permission. */
export function ItalianAdventureLandscape({ worldId, complete }: {
  worldId: string; complete: boolean;
}) {
  const p = ITALIAN_ADVENTURE_PALETTES[worldId] ?? ITALIAN_ADVENTURE_PALETTES.discover;
  const skyId = "yo-sky-" + worldId;
  const glowId = "yo-glow-" + worldId;
  const fieldId = "yo-field-" + worldId;
  const isCoast = worldId === "daily-life";
  const isNight = worldId === "independence";
  const windyPath = "M119 133 C119 213 376 204 347 295 C321 366 135 325 131 444 C125 521 382 490 350 601 C325 681 219 657 244 748";
  return <svg viewBox="0 0 480 840" preserveAspectRatio="xMidYMid meet"
    className="pointer-events-none absolute inset-0 h-full w-full select-none"
    data-atlas-landscape={worldId} aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={skyId} x1="0" y1="0" x2="0.16" y2="1">
        <stop offset="0" stopColor={p.sky}/><stop offset=".58" stopColor={p.horizon}/>
        <stop offset="1" stopColor={p.grass}/>
      </linearGradient>
      <linearGradient id={fieldId} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor={p.grass}/><stop offset="1" stopColor={p.forest}/>
      </linearGradient>
      <radialGradient id={glowId}>
        <stop stopColor={p.sun} stopOpacity=".88"/><stop offset=".5" stopColor={p.sun} stopOpacity=".3"/>
        <stop offset="1" stopColor={p.sun} stopOpacity="0"/>
      </radialGradient>
      <filter id={"yo-map-shadow-" + worldId} x="-30%" y="-30%" width="160%" height="180%">
        <feGaussianBlur stdDeviation="7"/>
      </filter>
      <pattern id={"yo-grain-" + worldId} width="30" height="30" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="12" r="1.2" fill="#ffffff" opacity=".20"/>
        <circle cx="23" cy="25" r="1.2" fill="#164e46" opacity=".1"/>
      </pattern>
    </defs>

    <rect width="480" height="840" fill={"url(#" + skyId + ")"}/>
    <circle cx={isNight ? 360 : 105} cy="75" r="91" fill={"url(#" + glowId + ")"}/>
    <circle cx={isNight ? 360 : 105} cy="75" r="28" fill={p.sun}/>
    {isNight ? <>
      {[[41,73],[194,55],[248,113],[419,133],[454,40],[62,194]].map(([x,y],index)=>
        <path key={index} d={"M" + x + " " + (y-6) + "v12 m-6 -6 h12"} stroke="#fff3d9" strokeWidth="2.5" strokeLinecap="round" opacity=".75"/>)}
    </> : <>
      <g className="yo-adventure-cloud" fill="#fffdf1" opacity=".83">
        <path d="M240 63c10-22 30-22 45-6 22-17 51-1 48 20H231c-2-11 2-16 9-14Z"/>
        <path d="M367 159c10-16 28-14 39-4 22-10 39 3 39 18h-90c0-8 4-14 12-14Z"/>
        <path d="M22 106c12-16 31-11 40-2 19-8 28 5 29 15H11c0-8 4-11 11-13Z"/>
      </g>
    </>}

    <path d="M0 195Q70 108 136 181T288 182T480 169V840H0Z" fill={p.hill}/>
    <path d="M0 248Q75 169 151 240T330 221T480 237V840H0Z" fill={p.forest} opacity=".36"/>
    <path d="M0 319Q93 257 157 294T335 285T480 305V840H0Z" fill={"url(#" + fieldId + ")"}/>
    <path d="M0 436Q102 374 212 427T480 390V840H0Z" fill={p.grass}/>
    <path d="M0 567Q126 506 227 556T480 521V840H0Z" fill={p.hill}/>
    <path d="M0 699Q124 637 239 690T480 658V840H0Z" fill={p.grass}/>

    {isCoast ? <>
      <path d="M0 350Q91 321 172 361T334 343T480 351V451Q310 438 210 460T0 431Z"
        fill={p.water} opacity=".83"/>
      <path d="M0 375Q112 348 211 383T480 372M0 407Q147 392 235 422T480 402"
        fill="none" stroke="#e8f9ef" strokeWidth="5" opacity=".55"/>
      <g fill={p.stone} stroke="#ddc4a6" strokeWidth="3">
        {[0,1,2,3].map(i=><rect key={i} x={24+i*43} y={261-i*6} width="35" height="43" rx="4"/>)}
      </g>
    </> : <>
      <path d="M-15 554Q105 533 183 571T360 565T498 586L500 639Q367 609 239 619T-15 600Z"
        fill={p.water} opacity=".8"/>
      <path d="M-10 568Q101 550 178 584T361 578T490 596"
        stroke="#e6fff4" strokeWidth="5" fill="none" opacity=".5"/>
      <path d="M218 557L330 555L358 587L194 587Z" fill={p.stone} stroke={p.pathEdge} strokeWidth="6"/>
      {[220,254,288,322].map(x=><path key={x} d={"M"+x+" 555v33"} stroke={p.pathEdge} strokeWidth="3"/>)}
    </>}

    {/* Small market towns and woodland appear alongside the road, not behind a block grid. */}
    <g transform="translate(348 350)">
      <rect x="0" y="22" width="57" height="47" rx="3" fill={p.stone}/>
      <path d="M-8 25L28 0L65 25Z" fill={p.roof}/>
      <rect x="14" y="36" width="12" height="20" rx="5" fill="#ffeab7"/>
      <rect x="34" y="36" width="12" height="20" rx="5" fill="#ffeab7"/>
      <path d="M28 1V-15m0 0 18 5-18 6" fill={p.sun} stroke={p.deep} strokeWidth="2"/>
    </g>
    <g transform="translate(52 694)">
      <rect x="0" y="20" width="52" height="45" fill={p.stone}/>
      <path d="M-7 24L26 1L59 24Z" fill={p.roof}/>
      <rect x="15" y="40" width="19" height="25" rx="9" fill="#fff0c4"/>
      <path d="M58 64V22h18v42" fill={p.stone}/>
      <path d="M52 26l15-20 16 20" fill={p.roof}/>
    </g>

    {treeSpots.map(([x,y,scale],i)=><g key={i} transform={"translate("+x+" "+y+") scale("+scale+")"}>
      <ellipse cx="0" cy="29" rx="24" ry="8" fill={p.deep} opacity=".22"/>
      <path d="M-2 16V-23" stroke="#855d3c" strokeWidth="7" strokeLinecap="round"/>
      {isCoast ? <>
        <circle cx="-15" cy="-30" r="18" fill={p.forest}/>
        <circle cx="12" cy="-39" r="23" fill="#3d937c"/>
        <circle cx="16" cy="-16" r="18" fill={p.forest}/>
      </> : <>
        <path d="M-29-13L0-64L30-13Z" fill={p.deep}/>
        <path d="M-34 3L0-44L36 3Z" fill={p.forest}/>
        <path d="M-29 19L0-20L29 19Z" fill={p.deep}/>
      </>}
      {i%3===0?<circle cx="11" cy="-26" r="4" fill={p.sun}/>:null}
    </g>)}

    {/* Road stays completely visible between four floating milestones. */}
    <path d={windyPath} stroke={p.deep} strokeWidth="53" opacity=".23" fill="none"
      strokeLinecap="round" filter={"url(#yo-map-shadow-"+worldId+")"}/>
    <path d={windyPath} stroke={p.pathEdge} strokeWidth="48" fill="none" strokeLinecap="round"/>
    <path d={windyPath} stroke={p.path} strokeWidth="36" fill="none" strokeLinecap="round"/>
    <path d={windyPath} stroke="#fff5ce" strokeWidth="2.6" fill="none" strokeDasharray="2 17"
      strokeLinecap="round" opacity=".88" className="yo-adventure-dotted-road"/>
    {[[188,192],[303,225],[278,349],[211,390],[215,488],[344,542],[322,647],[251,702]]
      .map(([x,y],i)=><g key={i} fill="#fff9d7" stroke={p.pathEdge} strokeWidth="2" opacity=".9">
        <circle cx={x} cy={y} r="5"/><path d={"M"+(x-2)+" "+y+"h4"}/>
      </g>)}
    {flowerSpots.map(([x,y],i)=><g key={i} transform={"translate("+x+" "+y+")"}>
      <circle r="5" fill={i%2?p.sun:"#fae2fa"}/>
      <circle r="2" fill={p.deep}/>
      <path d="M0 5v7" stroke={p.deep} strokeWidth="2"/>
    </g>)}

    {/* Castle: the destination, not another card beneath the map. */}
    <g transform="translate(196 736)" data-yoppo-world-castle>
      <ellipse cx="46" cy="74" rx="82" ry="14" fill={p.deep} opacity=".25"/>
      <path d="M0 70V19H93V70Z" fill={p.stone} stroke={p.pathEdge} strokeWidth="3"/>
      <path d="M-14 70V6H15V70M78 70V6H108V70" fill={p.stone} stroke={p.pathEdge} strokeWidth="3"/>
      {[[-17,2],[-1,2],[14,2],[78,2],[94,2],[110,2]].map(([x,y],i)=>
        <rect key={i} x={x} y={y} width="14" height="13" rx="1" fill={p.stone}/>)}
      <path d="M-19 7L0-24L19 7M74 7L94-24L113 7" fill={p.roof} stroke={p.pathEdge} strokeWidth="3"/>
      <path d="M34 70V42a13 13 0 0 1 26 0V70Z" fill={complete?"#fff4a0":p.deep}/>
      {complete?<circle cx="47" cy="40" r="40" fill={p.sun} opacity=".23"/>:null}
      <path d="M46-30v-20m0 0 20 6-20 7" stroke={p.deep} strokeWidth="3" fill={p.sun}/>
    </g>
    <rect width="480" height="840" fill={"url(#yo-grain-"+worldId+")"} opacity=".25"/>
    <style>{`
      @media(prefers-reduced-motion:no-preference){
        .yo-adventure-cloud{animation:yo-adventure-cloud-breathe 10s ease-in-out infinite alternate}
        .yo-adventure-dotted-road{animation:yo-adventure-road-drift 9s linear infinite}
      }
      @keyframes yo-adventure-cloud-breathe{from{transform:translateX(-5px)}to{transform:translateX(8px)}}
      @keyframes yo-adventure-road-drift{to{stroke-dashoffset:-190}}
    `}</style>
  </svg>;
}
