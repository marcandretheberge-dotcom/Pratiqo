import type { CSSProperties } from "react";
import type { AdventureWorld, DestinationState } from "@/lib/yo/adventure";
import styles from "./adventureStyles";

const palettes: Record<AdventureWorld, [string, string, string]> = {
  italian: ["#eef6f4", "#b96051", "#e9ba49"], german: ["#eef4f8", "#466b87", "#eac05b"],
  portuguese: ["#edf8f3", "#268b7f", "#f2bb53"], japanese: ["#f8f0f4", "#a65368", "#e4b258"],
  mandarin: ["#f1f6ed", "#9f4748", "#e5b24d"], french: ["#edf5fa", "#527c8c", "#dca857"],
  english: ["#edf5f1", "#617a60", "#e3bb67"], spanish: ["#f8f4ec", "#a55957", "#ecc365"],
};

const paperStones = [
  { x: 90, y: 68, width: 20, height: 22, dx: -39, dy: 112, turn: -20, delay: 0 },
  { x: 113, y: 68, width: 20, height: 22, dx: 35, dy: 120, turn: 24, delay: 0.04 },
  { x: 87, y: 93, width: 24, height: 25, dx: -23, dy: 92, turn: 12, delay: 0.08 },
  { x: 113, y: 93, width: 24, height: 25, dx: 20, dy: 101, turn: -18, delay: 0.12 },
  { x: 84, y: 122, width: 28, height: 25, dx: -14, dy: 72, turn: -8, delay: 0.16 },
  { x: 115, y: 122, width: 26, height: 25, dx: 31, dy: 63, turn: 17, delay: 0.2 },
  { x: 81, y: 150, width: 63, height: 22, dx: -5, dy: 30, turn: 4, delay: 0.24 },
];

/** A small original paper model, not a real landmark; its resting state already shows the clear path. */
function ItalianVictoryScenery({ replay, destinationNumber }: { replay: number; destinationNumber: number }) {
  return <svg key={replay} aria-hidden="true" focusable="false" viewBox="0 0 480 240" className={styles.victoryScene} data-world="italian" data-evolved="true" data-gate-open="true" data-victory-scene="italian-u01">
    <rect width="480" height="240" rx="18" fill="#FBF4E5" />
    <path d="M0 137 Q76 95 149 135 T298 126 T480 119 V240 H0Z" fill="#E0E8D3" />
    <path d="M0 179 Q87 149 180 177 T350 166 T480 157 V240 H0Z" fill="#C9DAC0" />
    <circle cx="415" cy="47" r="19" fill="#E7BD62" />
    <path d="M35 202 C117 174 157 218 211 190 S299 172 341 181 S399 153 414 131" fill="none" stroke="#A8BFA3" strokeWidth="12" strokeLinecap="round" />
    <path d="M35 202 C117 174 157 218 211 190 S299 172 341 181 S399 153 414 131" fill="none" stroke="#E4AC37" strokeWidth="7" strokeLinecap="round" pathLength="1" className={styles.victoryPath} data-victory-part="path" />
    <g data-victory-part="tower">
      {paperStones.map((piece, index) => <g key={index} className={styles.victoryStone} style={{ "--stone-x": `${piece.dx}px`, "--stone-y": `${piece.dy}px`, "--stone-turn": `${piece.turn}deg`, "--stone-delay": `${piece.delay}s` } as CSSProperties}>
        <rect x={piece.x} y={piece.y} width={piece.width} height={piece.height} rx="2" fill={index % 2 ? "#C7AE88" : "#DDC7A3"} stroke="#8F785A" strokeWidth="1.5" />
        <path d={`M${piece.x + 3} ${piece.y + 5} h${piece.width - 6}`} stroke="#F9EFDB" strokeWidth="2" strokeLinecap="round" />
      </g>)}
    </g>
    <g className={styles.victoryDust} fill="#F2E4CA" data-victory-part="dust"><circle cx="105" cy="184" r="17" /><circle cx="136" cy="183" r="13" /><circle cx="79" cy="189" r="10" /></g>
    {[{ x: 211, y: 190 }, { x: 275, y: 175 }, { x: 341, y: 181 }].map((lamp, index) => <g key={lamp.x} className={styles.victoryLight} style={{ "--light-delay": `${0.85 + index * 0.25}s` } as CSSProperties}>
      <circle cx={lamp.x} cy={lamp.y} r="11" fill="#FFF2C5" /><circle cx={lamp.x} cy={lamp.y} r="5" fill="#DCA132" />
    </g>)}
    <g className={styles.victoryDestination} data-victory-part="destination">
      <path d="M342 144 L343 87 L374 67 L406 88 L407 145Z" fill="#BE725B" stroke="#8C5446" strokeWidth="1.5" />
      <path d="M335 89 L374 61 L414 90" fill="none" stroke="#8C5446" strokeWidth="6" strokeLinejoin="round" />
      <rect x="399" y="100" width="40" height="45" rx="3" fill="#E5C189" stroke="#A78257" strokeWidth="1.5" />
      <path d="M353 144 V119 a10 10 0 0 1 20 0 V144 M382 144 V119 a10 10 0 0 1 20 0 V144" fill="#FFF0C0" />
      <rect x="365" y="88" width="16" height="16" rx="2" fill="#F8DF9A" />
      <path d="M423 105 V71 M423 73 l22 5 -22 9" fill="#377762" stroke="#377762" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="330" cy="77" r="17" fill="#FFF9EA" stroke="#377762" strokeWidth="2" />
      <text x="330" y="82" textAnchor="middle" fill="#285C4B" fontFamily="system-ui, sans-serif" fontSize="15" fontWeight="700">{destinationNumber}</text>
    </g>
    <g fill="#638365"><path d="M22 182 l7 -22 7 22Z" /><path d="M452 169 l9 -28 9 28Z" /></g>
    <path d="M190 140 l8 8 17 -20" fill="none" stroke="#377762" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

/** Original small game scenery: no borrowed game landmarks or sprites. */
export function AdventureScenery({ world, state, replay = 0, victory }: { world: AdventureWorld; state: DestinationState; replay?: number; victory?: { destinationNumber: number } }) {
  if (world === "italian" && state === "mastered" && victory) return <ItalianVictoryScenery replay={replay} destinationNumber={victory.destinationNumber} />;
  const [sky, building, light] = palettes[world];
  const alive = state === "mastered";
  const open = state !== "locked";
  return <svg key={replay} aria-hidden="true" focusable="false" viewBox="0 0 360 144" className={styles.scene} data-world={world} data-evolved={alive} data-gate-open={open}>
    <rect width="360" height="144" rx="8" fill={sky} />
    <circle cx="305" cy="28" r="13" fill={light} />
    <path d="M0 108 Q70 78 132 107 T265 101 T360 92 V144 H0Z" fill="#d5e7da" />
    <path d="M0 131 Q85 110 175 126 T360 122" fill="none" stroke="#a7c4b7" strokeWidth="8" />
    {world === "portuguese" ? <path d="M0 138 Q35 126 70 138 T140 138 T210 138 T280 138 T350 138" stroke="#479aaf" strokeWidth="6" fill="none" /> : null}
    {world === "french" || world === "english" || world === "german" ? <><rect x="113" y="57" width="128" height="61" rx="3" fill={building} /><path d="M104 59 L177 24 L250 59Z" fill={building} />{[128, 159, 190, 221].map(x => <rect key={x} x={x} y="70" width="12" height="20" rx="2" fill={alive ? light : sky} className={styles.window} />)}</> : null}
    {world === "italian" || world === "spanish" ? <><rect x="108" y="44" width="144" height="72" rx="4" fill={building} />{[121, 162, 203].map(x => <path key={x} d={`M${x} 115 V79 a14 14 0 0 1 28 0 V115Z`} fill={alive ? light : sky} className={styles.window} />)}<path d="M102 47 H258" stroke={building} strokeWidth="8" /></> : null}
    {world === "japanese" || world === "mandarin" || world === "portuguese" ? <><rect x="128" y="67" width="104" height="50" rx="3" fill={building} /><path d="M109 68 Q144 56 180 36 Q216 56 251 68Z" fill={building} /><path d="M145 110 V83 H215 V110" fill={alive ? light : sky} className={styles.window} /></> : null}
    <path d="M164 119 V96 a16 16 0 0 1 32 0 V119" fill={sky} stroke={building} strokeWidth="5" />
    <g className={open ? styles.openGate : styles.closedGate}><path d="M168 92 H192 M168 104 H192 M173 87 V117 M187 87 V117" stroke={building} strokeWidth="3" /></g>
    {[49, 294].map((x, i) => <g key={x} className={alive ? styles.bloom : undefined}>
      <path d={`M${x} 120 V88`} stroke="#527d62" strokeWidth="4" />
      <ellipse cx={x - 8} cy="98" rx="11" ry="6" fill="#82ad85" /><ellipse cx={x + 8} cy="107" rx="11" ry="6" fill="#82ad85" />
      {alive ? <><circle cx={x} cy="85" r="10" fill={i ? light : "#df818a"} /><circle cx={x} cy="85" r="3" fill="#fff" /></> : <circle cx={x} cy="85" r="5" fill="#82ad85" />}
    </g>)}
  </svg>;
}
