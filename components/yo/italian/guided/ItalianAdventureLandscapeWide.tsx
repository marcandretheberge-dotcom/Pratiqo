import { ITALIAN_ADVENTURE_PALETTES } from "./ItalianAdventureLandscape";
import { ITALIAN_WIDE_ROAD_PATH } from "./ItalianAdventurePathGeometry";

/** A second, independently composed landscape for laptop and desktop.
 * This is not a scaled portrait SVG: road, trees, villages and castle are placed
 * for a true 960x640 widescreen artboard. The four stops use the same normalized
 * percentages as the portrait journey, so no game/unlock logic changes. */
export function ItalianAdventureLandscapeWide({ worldId, complete }: {
  worldId: string; complete: boolean;
}) {
  const p = ITALIAN_ADVENTURE_PALETTES[worldId] ?? ITALIAN_ADVENTURE_PALETTES.discover;
  const sky = `yo-wide-sky-${worldId}`, ground = `yo-wide-ground-${worldId}`;
  const glow = `yo-wide-glow-${worldId}`, shade = `yo-wide-shade-${worldId}`;
  const night = worldId === "independence";
  const coast = worldId === "daily-life";
  const road = ITALIAN_WIDE_ROAD_PATH;
  const pines = [
    [65,290,.9], [122,255,.67], [876,214,.82], [920,288,.73],
    [46,477,.91], [154,509,.68], [882,527,.92], [806,563,.64],
    [352,480,.54], [612,128,.62], [546,332,.5], [750,121,.61],
  ] as const;
  const flowers = [[64,367],[164,345],[818,335],[938,440],[106,581],[290,544],[623,573],[871,599]] as const;
  return <svg viewBox="0 0 960 640" preserveAspectRatio="xMidYMid meet"
    className="pointer-events-none absolute inset-0 h-full w-full select-none"
    data-atlas-landscape-wide={worldId} aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={sky} x1="0" y1="0" x2=".12" y2="1">
        <stop stopColor={p.sky}/><stop offset=".68" stopColor={p.horizon}/><stop offset="1" stopColor={p.hill}/>
      </linearGradient>
      <linearGradient id={ground} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor={p.grass}/><stop offset="1" stopColor={p.forest}/>
      </linearGradient>
      <radialGradient id={glow}><stop stopColor={p.sun} stopOpacity=".8"/><stop offset="1" stopColor={p.sun} stopOpacity="0"/></radialGradient>
      <filter id={shade} x="-30%" y="-50%" width="160%" height="200%">
        <feGaussianBlur stdDeviation="8"/>
      </filter>
    </defs>

    <rect width="960" height="640" fill={`url(#${sky})`}/>
    <circle cx={night ? 790 : 144} cy="62" r="102" fill={`url(#${glow})`}/>
    <circle cx={night ? 790 : 144} cy="62" r="30" fill={p.sun}/>
    {night ? <g fill={p.sun} opacity=".8">
      {[[34,50],[310,83],[420,37],[580,67],[724,132],[887,85],[912,164]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i%3+1.4}/>)}
    </g> : <g fill="#fffef3" opacity=".8" className="yo-wide-clouds">
      <path d="M300 65c15-19 36-21 53-8 18-20 49-12 56 7 21-6 46 9 46 23H289c-2-12 2-19 11-22Z"/>
      <path d="M669 48c16-16 41-16 55-3 29-11 62 7 63 25H655c-1-11 5-17 14-22Z"/>
      <path d="M26 127c11-20 32-22 46-10 23-13 50 2 51 20H15c-2-8 3-12 11-10Z"/>
    </g>}

    <path d="M0 208C147 115 280 183 405 169S748 138 960 212V640H0Z" fill={p.hill}/>
    <path d="M0 266C160 175 274 264 457 210S743 176 960 250V640H0Z" fill={p.forest} opacity=".43"/>
    <path d="M0 308C155 222 364 307 516 275S797 236 960 303V640H0Z" fill={`url(#${ground})`}/>
    <path d="M0 401C183 320 344 399 513 364S790 326 960 408V640H0Z" fill={p.grass}/>
    <path d="M0 515C178 449 326 515 496 471S794 435 960 492V640H0Z" fill={p.hill}/>
    <path d="M0 602C170 541 326 597 488 557S794 532 960 575V640H0Z" fill={p.grass}/>

    {coast ? <>
      <path d="M-10 415C165 380 310 456 464 426S760 380 970 426V504C764 473 589 526 423 492S142 480-10 505Z" fill={p.water} opacity=".82"/>
      <path d="M-10 441C163 406 307 470 464 444S770 411 970 446M-10 470C187 435 311 504 470 472S730 441 970 478" fill="none" stroke="#e4fff5" strokeWidth="5" opacity=".6"/>
    </> : <>
      <path d="M-10 455C176 426 315 487 471 461S780 426 970 472V515C764 477 585 527 430 506S147 484-10 515Z" fill={p.water} opacity=".9"/>
      <path d="M-10 472C185 446 300 501 470 475S775 446 970 491" fill="none" stroke="#d9fff5" strokeWidth="5" opacity=".64"/>
      <path d="M460 466L568 450L608 484L444 487Z" fill={p.stone} stroke={p.pathEdge} strokeWidth="5"/>
      {[469,501,533,567].map(x=><path key={x} d={`M${x} 462v22`} stroke={p.pathEdge} strokeWidth="2.5"/>)}
    </>}

    {/* Three small towns, not repeated full-size destination cards. */}
    <g transform="translate(390 232)" fill={p.stone} stroke={p.pathEdge} strokeWidth="3">
      <rect x="0" y="25" width="74" height="60" rx="4"/>
      <path d="M-10 28L38-8L87 28Z" fill={p.roof}/>
      <rect x="24" y="47" width="22" height="38" rx="10" fill="#fff1bd" strokeWidth="2"/>
    </g>
    <g transform="translate(100 410)" fill={p.stone} stroke={p.pathEdge} strokeWidth="3">
      <rect x="0" y="23" width="54" height="45"/>
      <path d="M-7 25L27-4L61 25Z" fill={p.roof}/>
      <rect x="20" y="42" width="15" height="26" rx="6" fill="#fff1bd" strokeWidth="2"/>
    </g>
    <g transform="translate(814 373)" fill={p.stone} stroke={p.pathEdge} strokeWidth="3">
      <rect x="0" y="25" width="65" height="55"/>
      <path d="M-8 27L33-7L73 27Z" fill={p.roof}/>
      <rect x="22" y="47" width="19" height="33" rx="7" fill="#fff1bd" strokeWidth="2"/>
    </g>

    {pines.map(([x,y,scale],i)=><g key={i} transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="24" rx="24" ry="7" fill={p.deep} opacity=".22"/>
      <path d="M0 19V-36" stroke="#956e47" strokeWidth="7" strokeLinecap="round"/>
      {coast ? <>
        <circle cx="-15" cy="-29" r="20" fill={p.forest}/>
        <circle cx="11" cy="-39" r="24" fill="#459a85"/>
        <circle cx="10" cy="-15" r="17" fill={p.deep}/>
      </> : <>
        <path d="M-27-13L0-69L29-13Z" fill={p.deep}/>
        <path d="M-37 6L0-50L37 6Z" fill={p.forest}/>
        <path d="M-31 23L0-26L31 23Z" fill={p.deep}/>
      </>}
      {i%4===0?<circle cx="12" cy="-27" r="4" fill={p.sun}/>:null}
    </g>)}

    {/* World road visits 25/21, 73/37, 27/57, 73/76 and ends at the castle. */}
    <path d={road} fill="none" stroke={p.deep} strokeWidth="61" opacity=".24" strokeLinecap="round" filter={`url(#${shade})`}/>
    <path d={road} fill="none" stroke={p.pathEdge} strokeWidth="48" strokeLinecap="round"/>
    <path d={road} fill="none" stroke={p.path} strokeWidth="37" strokeLinecap="round"/>
    <path d={road} fill="none" stroke="#fff9d2" strokeWidth="3.5" strokeDasharray="3 18"
      strokeLinecap="round" className="yo-adventure-dotted-road"/>
    {[[383,188],[538,219],[546,302],[386,320],[352,412],[539,433],[607,514]].map(([x,y],i)=>
      <g key={i} fill="#fff8d2" stroke={p.pathEdge} strokeWidth="2" opacity=".83">
        <circle cx={x} cy={y} r="6"/><path d={`M${x-3} ${y}h6`}/>
      </g>)}

    {flowers.map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}>
      <circle r="5" fill={i%2 ? p.sun:"#fff0ff"}/>
      <circle r="2" fill={p.deep}/>
      <path d="M0 5v7" stroke={p.deep} strokeWidth="2"/>
    </g>)}

    <g data-yoppo-world-castle transform="translate(427 541)">
      <ellipse cx="55" cy="79" rx="108" ry="14" fill={p.deep} opacity=".24"/>
      <path d="M0 69V26H108V69Z" fill={p.stone} stroke={p.pathEdge} strokeWidth="3"/>
      <path d="M-19 69V8H14V69M94 69V8H128V69" fill={p.stone} stroke={p.pathEdge} strokeWidth="3"/>
      <path d="M-24 10L-2-25L19 10M89 10L111-25L133 10" fill={p.roof} stroke={p.pathEdge} strokeWidth="3"/>
      <path d="M45 69V47a12 12 0 0 1 24 0V69Z" fill={complete?"#fff1a5":p.deep}/>
      {[[-18,0],[0,0],[14,0],[94,0],[113,0]].map(([x,y],i)=><rect key={i} x={x} y={y} width="13" height="13" fill={p.stone}/>)}
      <path d="M56-25v-23m0 0 20 6-20 7" fill={p.sun} stroke={p.deep} strokeWidth="3"/>
      {complete ? <circle cx="55" cy="49" r="45" fill={p.sun} opacity=".18"/> : null}
    </g>
    <style>{`
      @media(prefers-reduced-motion:no-preference) {
        .yo-wide-clouds{animation:yo-adventure-cloud-breathe 12s ease-in-out infinite alternate}
        .yo-adventure-dotted-road{animation:yo-adventure-road-drift 9s linear infinite}
      }
      @keyframes yo-adventure-cloud-breathe{from{transform:translateX(-6px)}to{transform:translateX(12px)}}
      @keyframes yo-adventure-road-drift{to{stroke-dashoffset:-190}}
    `}</style>
  </svg>;
}
