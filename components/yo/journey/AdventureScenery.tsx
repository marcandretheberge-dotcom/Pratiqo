import type { AdventureWorld, DestinationState } from "@/lib/yo/adventure";
import styles from "./adventureStyles";

const palettes: Record<AdventureWorld, [string, string, string]> = {
  italian: ["#eef6f4", "#b96051", "#e9ba49"], german: ["#eef4f8", "#466b87", "#eac05b"],
  portuguese: ["#edf8f3", "#268b7f", "#f2bb53"], japanese: ["#f8f0f4", "#a65368", "#e4b258"],
  mandarin: ["#f1f6ed", "#9f4748", "#e5b24d"], french: ["#edf5fa", "#527c8c", "#dca857"],
  english: ["#edf5f1", "#617a60", "#e3bb67"], spanish: ["#f8f4ec", "#a55957", "#ecc365"],
};

/** Original small game scenery: no borrowed game landmarks or sprites. */
export function AdventureScenery({ world, state, replay = 0 }: { world: AdventureWorld; state: DestinationState; replay?: number }) {
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
