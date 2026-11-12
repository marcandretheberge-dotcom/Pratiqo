import { useId } from "react";
import type { AdventureWorld } from "@/lib/yo/adventure";

const palette: Record<AdventureWorld, [string, string, string]> = {
  italian: ["#e3f0e4", "#7ea37e", "#accfb0"],
  german: ["#e4f0ee", "#6e9276", "#b9c899"],
  portuguese: ["#daf1f1", "#66a586", "#afd095"],
  japanese: ["#f5eaf0", "#81a28b", "#c6d6bb"],
  mandarin: ["#eaf2e3", "#7f9b8f", "#b9cfaa"],
  french: ["#e3eff5", "#719995", "#c8d9bf"],
  english: ["#e8f2f4", "#7e9e8b", "#b8d0b3"],
  spanish: ["#f6edda", "#9dab79", "#d8d7a6"],
};

function Tree({ x, y, pink = false, palm = false }: { x: number; y: number; pink?: boolean; palm?: boolean }) {
  return <g transform={`translate(${x} ${y})`}>
    <ellipse cy="7" rx="17" ry="5" fill="#244e3820"/>
    <path d="M0 7 Q3 -13 0 -36" fill="none" stroke="#795b43" strokeWidth={palm ? 4 : 6}/>
    {palm ? <g fill="none" stroke="#377f64" strokeWidth="6" strokeLinecap="round">
      <path d="M0 -34 Q-20 -52 -30 -30 M0 -34 Q20 -51 31 -34 M0 -34 Q-22 -35 -20 -16 M0 -34 Q20 -32 23 -17 M0 -34 Q1 -57 10 -53"/>
    </g> : <><path d="M0 -35 L-13 -17 M0 -28 L15 -20" stroke="#795b43" strokeWidth="3"/><g fill={pink ? "#e6a3af" : "#4a896e"}><circle cy="-42" r="16"/><circle cx="-14" cy="-28" r="15"/><circle cx="14" cy="-28" r="16"/></g><g fill={pink ? "#f7ccd1" : "#72aa80"}><circle cx="-6" cy="-45" r="10"/><circle cx="14" cy="-32" r="10"/></g></>}
  </g>;
}
function House({ x, y, color = "#efd5ae", kind = "gable", scale = 1 }: { x: number; y: number; color?: string; kind?: "gable" | "tile" | "flat"; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} stroke="#394b482b" strokeWidth="1">
    <ellipse cx="32" cy="7" rx="42" ry="10" fill="#294f3820"/>
    <path d="M0 -48 L65 -48 L65 0 L0 0Z" fill={color}/><path d="M65 -48 L82 -57 L82 -8 L65 0Z" fill="#b7aa87"/>
    {kind === "gable" ? <path d="M-7 -47 L31 -82 L72 -47 M31 -82 L48 -90 L87 -57 L72 -47Z" fill="#a45d50"/> : kind === "tile" ? <path d="M-10 -49 Q2 -51 9 -66 L58 -66 Q67 -52 77 -49 L72 -44 L-7 -44Z" fill="#596a70"/> : <path d="M-3 -53 L65 -53 L83 -61 L16 -61Z" fill="#f5e6bf"/>}
    <rect x="29" y="-26" width="13" height="26" rx="2" fill="#5c7269"/>
    {[9,48].map(xx => <g key={xx}><rect x={xx} y="-36" width="10" height="13" rx="1" fill="#6c969c"/><path d={`M${xx + 5} -36 V-23 M${xx} -30 H${xx + 10}`} stroke="#fff1d6" strokeWidth="1.5"/></g>)}
    <path d="M-2 0 H67" stroke="#ede1bf" strokeWidth="4"/>
  </g>;
}
function Bridge({ x, y, red = false }: { x: number; y: number; red?: boolean }) {
  return <g transform={`translate(${x} ${y})`} fill="none" stroke={red ? "#b6554b" : "#b1a07f"}>
    <path d="M-56 6 Q0 -29 56 6" strokeWidth="17"/><path d="M-55 -3 Q0 -40 55 -3" strokeWidth="4"/>
    {[-48,-24,0,24,48].map(xx=><path key={xx} d={`M${xx} ${Math.abs(xx) / 2 - 32} v19`} strokeWidth="4"/>)}
  </g>;
}

/** Original stylized scenery, not a geographic or curricular claim. The course supplies every destination. */
export function WorldScenery({ world, chapter = 0 }: { world: AdventureWorld; chapter?: number }) {
  const id = useId().replaceAll(":", ""), [sky, hills, ground] = palette[world];
  return <svg viewBox="0 0 480 600" aria-hidden="true" focusable="false" className="yo-shared-scenery" data-scenery={world}>
    <defs><linearGradient id={id} x2="0" y2="1"><stop stopColor={sky}/><stop offset="1" stopColor="#fffef6"/></linearGradient></defs>
    <rect width="480" height="600" fill={`url(#${id})`}/>
    <circle cx="390" cy="57" r="25" fill="#f4d68b"/>
    <g fill="#fff" opacity=".8"><ellipse cx="78" cy="42" rx="38" ry="11"/><ellipse cx="110" cy="45" rx="31" ry="9"/><ellipse cx="300" cy="91" rx="40" ry="8"/></g>
    <path d="M0 153 Q70 73 152 131 Q253 53 338 124 Q412 85 480 140 V600 H0Z" fill={hills}/>
    <path d="M0 206 Q93 122 190 196 Q295 133 480 183 V600 H0Z" fill={ground}/>
    <path d="M0 358 Q96 285 207 350 Q343 281 480 330 V600 H0Z" fill="#dce4bd"/>
    <path d="M0 510 Q102 454 240 512 Q379 446 480 484 V600 H0Z" fill="#c9d8ad"/>
    {world === "german" && <>
      <path d="M0 112 L60 52 L105 98 L173 39 L224 117" fill="#b6c8c6"/><path d="M147 66 L173 39 L196 72 L171 60Z" fill="#f6f8ef"/>
      <path d="M400 180 C300 226 435 320 360 366 S415 460 480 480" stroke="#86bdc7" strokeWidth="39" fill="none"/>
      <House x={34} y={239} color="#ead5b1"/><House x={290} y={215} color="#eadbc7" scale={.8}/>
      <g stroke="#6d5545" strokeWidth="4" fill="none"><path d="M37 192 H97 M65 161 V239 M39 201 L92 230 M92 201 L39 230"/></g>
      <g transform="translate(370 375)"><path d="M-50 0 V-67 H-30 V-81 H-7 V-67 H20 V0Z" fill="#aaa58f"/><path d="M-27 0 V-35 Q-13 -55 1 -35 V0" fill="#5b7064"/><path d="M-53 -68 H24" stroke="#e5d9b5" strokeWidth="5"/></g>
      <Bridge x={380} y={300}/><Tree x={48} y={355}/><Tree x={76} y={393}/><House x={205} y={480} color="#e2b290" scale={.75}/>
    </>}
    {world === "portuguese" && <>
      <path d="M359 100 Q399 132 383 223 Q349 342 390 403 Q432 481 399 600 H480 V100Z" fill="#83c9c8"/>
      <path d="M365 167 Q328 283 375 383 T390 600" stroke="#f9e3ae" strokeWidth="25" fill="none"/>
      <path d="M231 135 Q247 32 278 133 Q310 60 335 151Z" fill="#588b75"/>
      <House x={38} y={229} color="#efa5a0" kind="flat"/><House x={105} y={221} color="#e9bf65" kind="flat" scale={.75}/><House x={276} y={389} color="#81b9c3" kind="flat"/>
      <g transform="translate(42 473)" fill="none" strokeWidth="6"><path d="M0 0 Q15 -17 30 0 T60 0 T90 0" stroke="#526d69"/><path d="M0 13 Q15 -4 30 13 T60 13 T90 13" stroke="#fff8e2"/></g>
      <Tree x={419} y={289} palm/><Tree x={60} y={347} palm/><Tree x={438} y={494} palm/><Tree x={238} y={565} palm/>
    </>}
    {world === "japanese" && <>
      <path d="M0 338 Q163 281 235 355 T480 361" stroke="#90c4c5" strokeWidth="37" fill="none"/>
      <Bridge x={249} y={345} red/>
      <House x={40} y={237} kind="tile" color="#f0ddc3"/><House x={300} y={214} kind="tile" color="#e4c7ab"/>
      <g transform="translate(312 424)"><rect x="0" y="-65" width="93" height="62" fill="#ddd5bd"/><path d="M-12 -65 Q44 -85 105 -65 L92 -58 H0Z" fill="#596c6d"/><g fill="#568d93">{[10,32,54,76].map(x=><rect key={x} x={x} y="-46" width="12" height="25"/>)}</g><path d="M-15 4 H110 M-15 12 H110" stroke="#747b71" strokeWidth="3"/></g>
      <Tree x={40} y={313} pink/><Tree x={432} y={272} pink/><Tree x={62} y={490} pink/><Tree x={202} y={564} pink/>
      <g transform="translate(190 244)"><path d="M0 -28 V24 M56 -28 V24 M-9 -26 H65 M-4 -16 H60" fill="none" stroke="#b85f52" strokeWidth="6"/></g>
    </>}
    {world === "mandarin" && <>
      <path d="M362 118 C321 200 435 249 388 343 S401 449 456 600" stroke="#87b9b1" strokeWidth="42" fill="none"/>
      <Bridge x={392} y={354}/>
      <House x={34} y={235} kind="tile" color="#dfc8ad"/><House x={278} y={208} kind="tile" color="#e4c5ab"/>
      <g transform="translate(323 416)"><path d="M-50 0 H48 V-45 H-50Z" fill="#b65647"/><path d="M-62 -45 Q-42 -45 -31 -64 H29 Q44 -48 62 -45 L50 -38 H-50Z" fill="#687878"/><path d="M-32 -3 V-34 H30 V-3" fill="#f1d9a1"/><path d="M-18 -3 V-34 M1 -3 V-34 M18 -3 V-34" stroke="#aa5c4b" strokeWidth="3"/></g>
      <g fill="#d9855d" stroke="#a2563c" strokeWidth="2">{[235,264,293].map(x=><g key={x}><path d={`M${x} 181 V198`} stroke="#746953"/><ellipse cx={x} cy="208" rx="9" ry="13"/><path d={`M${x} 220 v9`}/></g>)}</g>
      <g stroke="#68825b" strokeWidth="4">{[30,44,59].map(x=><path key={x} d={`M${x} 540 V405 M${x} 435 l14 -8 M${x} 480 l-13 -9`}/>)}</g>
      <Tree x={431} y={287}/><Tree x={228} y={553}/>
    </>}
    {world === "french" && <>
      <path d="M0 430 Q144 360 259 430 T480 447 V600 H0Z" fill="#a3cdd4"/>
      <path d="M0 490 Q140 421 260 490 T480 507" stroke="#d9e9df" strokeWidth="5" fill="none"/>
      <House x={38} y={243} color="#b76f55"/><House x={111} y={224} color="#c4b58d" scale={.75}/>
      <g stroke="#3b5655" fill="none" strokeWidth="3"><path d="M68 241 Q85 218 80 197 M77 240 Q94 217 89 198 M76 219 H89 M80 211 H92"/></g>
      <g transform="translate(308 200)"><path d="M-33 0 V-45 H22 V0Z" fill="#e3d1ad"/><path d="M-38 -45 L-5 -73 L27 -45Z" fill="#668683"/><path d="M-8 -73 V-103 L4 -91 L-8 -91" stroke="#6a8984" strokeWidth="3" fill="#d8e9ef"/></g>
      <House x={287} y={383} color="#e3b75d" kind="flat"/><Tree x={47} y={368}/><Tree x={434} y={348}/><Tree x={230} y={569}/>
      <g transform="translate(65 510)"><path d="M-38 0 H39 L25 12 H-20Z" fill="#bc6a4e"/><path d="M4 -53 V3 M4 -50 L33 -9 H4Z" stroke="#6b827a" strokeWidth="2" fill="#fff8e5"/></g>
    </>}
    {world === "english" && <>
      <path d="M0 424 Q132 393 270 438 T480 440 V600 H0Z" fill="#83bbcc"/>
      <g transform="translate(355 190)" fill="#79989c"><path d="M-9 0 L-4 -132 H0 L7 0Z"/><ellipse cy="-94" rx="22" ry="8"/><path d="M-2 -132 V-162" stroke="#79989c" strokeWidth="3"/></g>
      <g fill="#bed0cb" stroke="#eff1dc" strokeWidth="3"><path d="M252 185 V105 H277 V185 M283 185 V82 H308 V185 M394 196 V125 H426 V196"/></g>
      <House x={40} y={238} color="#c28a70"/><House x={287} y={383} color="#dac8a4" kind="flat"/>
      <g transform="translate(80 332)"><rect width="99" height="32" rx="7" fill="#bc584b"/><path d="M9 7 H89 V20 H9Z" fill="#c0e3e1"/><circle cx="18" cy="34" r="6" fill="#546666"/><circle cx="81" cy="34" r="6" fill="#546666"/></g>
      <Tree x={34} y={406}/><Tree x={431} y={315}/><Tree x={231} y={563}/><path d="M420 498 l-7 38 h23Z" fill="#fff7de"/>
    </>}
    {world === "spanish" && chapter === 0 && <>
      <path d="M0 440 Q119 383 228 452 T480 429 V600 H0Z" fill="#97c5ca"/>
      <path d="M0 425 Q119 368 228 437 T480 414" stroke="#eddbb1" strokeWidth="24" fill="none"/>
      <House x={32} y={240} color="#e6b59b" kind="flat"/><House x={105} y={218} color="#e2c56f" kind="flat" scale={.8}/>
      <g transform="translate(312 190)"><path d="M-27 0 V-57 H26 V0Z M-16 -57 V-78 H15 V-57" fill="#dec9ac"/><path d="M-8 -78 V-96 H8 V-78 M-3 -96 V-110" stroke="#9d9d89" strokeWidth="6"/><g fill="#819f9a"><path d="M-17 -36 h10 v15 h-10Z M7 -36 h10 v15 H7Z"/></g></g>
      <g transform="translate(310 383)" fill="#d5b48d"><path d="M-50 0 V-52 H52 V0Z"/>{[-36,-7,22].map(x=><path key={x} d={`M${x} 0 V-27 a10 10 0 0 1 20 0 V0Z`} fill="#799e9a"/>)}</g>
      <Tree x={50} y={365} palm/><Tree x={422} y={329} palm/><Tree x={250} y={573} palm/>
    </>}
    {world === "spanish" && chapter === 1 && <>
      <path d="M0 166 L70 73 L141 166 L190 105 L246 175" fill="#888f79"/><path d="M57 90 L70 73 L86 94 L70 88Z" fill="#e7e6cd"/>
      <path d="M350 312 Q390 365 361 446 T375 600 H480 V312Z" fill="#82c8c8"/>
      <House x={40} y={240} color="#f4d4a0"/><House x={278} y={234} color="#db8b6b" kind="flat"/>
      <g transform="translate(262 359)"><path d="M-28 0 V-49 H57 V0Z" fill="#e4b76d"/><path d="M-19 -3 V-25 a11 11 0 0 1 22 0 V-3 M20 -3 V-25 a11 11 0 0 1 22 0 V-3" fill="#7e9d88"/><path d="M-35 -50 H64" stroke="#ac6650" strokeWidth="7"/></g>
      <Tree x={427} y={315} palm/><Tree x={363} y={451} palm/><Tree x={44} y={543} palm/>
      <House x={44} y={395} color="#93bdb6" kind="flat"/><House x={226} y={568} color="#efae82" kind="flat" scale={.75}/>
    </>}
    {world === "spanish" && chapter >= 2 && <>
      <path d="M0 160 L67 38 L130 142 L184 64 L254 166" fill="#8f9c96"/><path d="M45 78 L67 38 L92 81 L66 67Z M166 92 L184 64 L204 98 L185 90Z" fill="#fff6e5"/>
      <House x={39} y={242} color="#e6b39a"/><House x={293} y={208} color="#ddd9b9"/>
      <path d="M0 411 Q120 348 251 427 T480 412 V600 H0Z" fill="#a5c9c6"/>
      <path d="M0 404 Q120 341 251 420 T480 405" stroke="#ebd5ae" strokeWidth="19" fill="none"/>
      <g transform="translate(300 350)"><rect width="105" height="36" rx="8" fill="#699ca5"/><path d="M8 8 H97 V23 H8Z" fill="#d7e7dc"/><circle cx="20" cy="38" r="6" fill="#526968"/><circle cx="84" cy="38" r="6" fill="#526968"/></g>
      <Tree x={47} y={337}/><Tree x={431} y={266}/><House x={218} y={575} color="#e1b58c" kind="flat" scale={.7}/>
    </>}
    <g fill="#fff5cf" opacity=".9">{[[18,290],[239,187],[450,401],[180,471],[38,564],[410,566]].map(([x,y])=><g key={x}><circle cx={x} cy={y} r="2"/><circle cx={x+7} cy={y+3} r="2"/><circle cx={x+3} cy={y-6} r="2"/></g>)}</g>
  </svg>;
}
