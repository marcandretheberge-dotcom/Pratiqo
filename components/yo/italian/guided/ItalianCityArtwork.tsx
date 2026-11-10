import type { ReactNode } from "react";
import type { YoLocale } from "@/lib/yo/types";
import { italianCityIdentity, type ItalianCityIdentity } from "@/lib/yo/italian/cityIdentity";

type Props = { unitId: string; locale: YoLocale; compact?: boolean; className?: string; decorative?: boolean };

function Landmark({ city }: { city: ItalianCityIdentity }): ReactNode {
  const { motif, palette: c } = city;
  switch (motif) {
    case "porticoes":
      return <g data-italian-landmark="porticoes">
        <rect x="174" y="71" width="292" height="114" rx="4" fill={c.building}/>
        <path d="M166 73H474" stroke={c.roof} strokeWidth="14"/>
        {[189,251,313,375].map(x=><g key={x}><path d={`M${x} 184V123a23 23 0 0 1 46 0v61Z`} fill="#FCEDD0"/><path d={`M${x} 184V123a23 23 0 0 1 46 0v61`} fill="none" stroke="#9A6455" strokeWidth="5"/></g>)}
        <path d="M186 91H457" stroke={c.accent} strokeWidth="5" strokeDasharray="9 8"/>
      </g>;
    case "baptistery":
      return <g data-italian-landmark="baptistery">
        <path d="M220 185V78L252 58H388L420 78V185Z" fill={c.building} stroke="#AC7865" strokeWidth="4"/>
        <path d="M220 78L268 25H372L420 78Z" fill={c.roof}/>
        <path d="M247 87V185M393 87V185M266 67L296 33M374 33L396 67" stroke="#F5E2C7" strokeWidth="6"/>
        <path d="M286 185V121a34 34 0 0 1 68 0v64Z" fill="#F9E9CE" stroke="#967161" strokeWidth="4"/>
        <circle cx="320" cy="90" r="12" fill={c.accent}/>
      </g>;
    case "tower":
      return <g data-italian-landmark="tower">
        <rect x="277" y="35" width="85" height="151" fill={c.building} stroke="#897868" strokeWidth="4"/>
        {[49,78,108,137].map(y=><g key={y}><path d={`M285 ${y}H353`} stroke="#F5E9D5" strokeWidth="4"/><rect x="309" y={y+5} width="20" height="14" rx="5" fill="#FCF0D5"/></g>)}
        <rect x="300" y="16" width="40" height="24" fill={c.building}/>
        <path d="M293 19L320 -12L346 19Z" fill={c.roof}/>
        <circle cx="320" cy="10" r="4" fill={c.accent}/>
        <path d="M231 185V134h48v51M361 185v-62h50v62" fill={c.roof}/>
      </g>;
    case "arena":
      return <g data-italian-landmark="arena">
        <path d="M156 175Q170 91 320 90T484 175V188H156Z" fill={c.building} stroke="#A76F5F" strokeWidth="4"/>
        <path d="M171 153Q202 103 320 106T470 153" fill="none" stroke="#F8E4CB" strokeWidth="8"/>
        {[178,214,250,286,322,358,394,430].map(x=><path key={x} d={`M${x} 175v-30a11 11 0 0 1 22 0v30Z`} fill="#F8E3CC" stroke="#A46B5A" strokeWidth="2"/>)}
        <ellipse cx="320" cy="184" rx="141" ry="16" fill="#E6C7AC" opacity=".75"/>
      </g>;
    case "volcano":
      return <g data-italian-landmark="volcano">
        <path d="M134 169L260 74L295 99L351 32L492 169Z" fill="#8DA8A0"/>
        <path d="M288 91L351 32L411 91L380 88L350 57L324 101Z" fill="#C5B5A9"/>
        <path d="M326 30Q317 13 332 -1M351 19Q341 4 356 -8M370 27Q382 4 369 -9" stroke="#EDE1D3" strokeWidth="7" fill="none" strokeLinecap="round" opacity=".82"/>
        <path d="M0 173Q148 143 267 170T640 160V220H0Z" fill={c.water}/>
        {[200,270,404].map(x=><path key={x} d={`M${x} 163v-25h37v25Z`} fill={c.building}/>)}
      </g>;
    case "dome":
      return <g data-italian-landmark="dome">
        <rect x="167" y="121" width="290" height="68" fill={c.building}/>
        <path d="M225 121Q230 33 320 33Q410 33 416 121Z" fill={c.roof} stroke="#925B50" strokeWidth="4"/>
        <path d="M319 34V120M278 47Q300 80 296 120M361 47Q338 80 343 120" stroke="#E6A37D" strokeWidth="7" fill="none"/>
        <rect x="308" y="14" width="24" height="27" fill={c.building}/><path d="M307 14L320 1L334 14Z" fill={c.roof}/>
        {[182,236,382,424].map(x=><rect key={x} x={x} y="141" width="20" height="32" rx="8" fill="#F9EBD2"/>)}
      </g>;
    case "piazza":
      return <g data-italian-landmark="piazza">
        <path d="M100 188L320 116L546 188Z" fill="#D2A27D"/>
        {[155,213,273,337,397,455].map(x=><path key={x} d={`M320 118L${x} 188`} stroke="#F2C7A4" strokeWidth="3"/>)}
        <path d="M206 121V85H429V121" stroke={c.building} strokeWidth="30" fill="none"/>
        <rect x="360" y="15" width="43" height="111" fill={c.building}/><path d="M353 15L381 -7L408 15Z" fill={c.roof}/>
        <circle cx="381" cy="46" r="10" fill={c.accent}/><rect x="374" y="77" width="14" height="24" fill="#F3D7B9"/>
      </g>;
    case "canal":
      return <g data-italian-landmark="canal">
        <path d="M0 158Q160 148 320 161T640 151V220H0Z" fill={c.water}/>
        <rect x="176" y="44" width="130" height="113" fill={c.building}/><rect x="324" y="56" width="144" height="101" fill="#DBBEA1"/>
        <path d="M167 50L240 20L316 50M319 62L398 29L474 62" stroke={c.roof} strokeWidth="9" fill="none"/>
        {[193,228,263,340,376,412,448].map(x=><path key={x} d={`M${x} 137v-25a9 9 0 0 1 18 0v25Z`} fill="#F8EACA"/>)}
        <path d="M231 186Q324 207 433 185Q405 207 307 208Z" fill="#5B655E"/>
        <path d="M314 196V153" stroke="#5B655E" strokeWidth="4"/>
        <path d="M315 158Q352 167 339 187L315 184Z" fill={c.accent}/>
      </g>;
    case "lighthouse":
      return <g data-italian-landmark="lighthouse">
        <path d="M0 177Q150 167 320 180T640 168V220H0Z" fill={c.water}/>
        <path d="M240 186L289 72H352L398 186Z" fill={c.building} stroke="#907868" strokeWidth="4"/>
        <rect x="293" y="42" width="56" height="30" rx="4" fill="#F9E4C2"/><path d="M287 41L322 14L355 41Z" fill={c.roof}/>
        <circle cx="322" cy="57" r="8" fill={c.accent}/>
        <path d="M286 57L185 30L182 69Z" fill="#FFF5C8" opacity=".62"/>
        {[101,448,500].map(x=><path key={x} d={`M${x} 175v-34h32v34Z`} fill={c.building}/>)}
      </g>;
    case "spire":
      return <g data-italian-landmark="spire">
        <path d="M0 186L151 102L216 145L305 93L378 142L472 79L640 185Z" fill="#A3BAC3" opacity=".62"/>
        <rect x="250" y="117" width="141" height="75" fill={c.building}/>
        <path d="M275 117L320 68L365 117Z" fill={c.roof}/><rect x="298" y="57" width="44" height="60" fill={c.building}/>
        <path d="M291 62L320 20L349 62Z" fill={c.roof}/>
        <path d="M314 20L320 -23L326 20Z" fill={c.accent}/><path d="M320 -23V-34" stroke="#695E66" strokeWidth="3"/>
        {[270,313,355].map(x=><path key={x} d={`M${x} 180v-25a10 10 0 0 1 20 0v25Z`} fill="#FAEAD1"/>)}
      </g>;
    case "amphitheatre":
      return <g data-italian-landmark="amphitheatre">
        <path d="M154 185V89Q255 37 480 76V185Z" fill={c.building} stroke="#967A66" strokeWidth="4"/>
        {[105,145].map(y=><g key={y}>{[178,219,260,301,342,383,424].map(x=><path key={x} d={`M${x} ${y+24}v-12a12 12 0 0 1 24 0v12Z`} fill="#F6E6CF" stroke="#A98A73" strokeWidth="2"/>)}</g>)}
        <path d="M155 188L478 188" stroke="#9B7865" strokeWidth="6"/>
        <path d="M161 90Q287 40 479 75" stroke="#E8C6A6" strokeWidth="8" fill="none"/>
      </g>;
    case "palace":
      return <g data-italian-landmark="palace">
        <rect x="183" y="100" width="282" height="87" fill={c.building} stroke="#A57D60" strokeWidth="3"/>
        <path d="M195 102Q199 41 254 41Q308 41 311 102Z" fill={c.roof}/>
        <path d="M335 102Q338 41 392 41Q446 41 453 102Z" fill={c.roof}/>
        <circle cx="254" cy="35" r="7" fill={c.accent}/><circle cx="393" cy="35" r="7" fill={c.accent}/>
        {[212,264,315,369,419].map(x=><path key={x} d={`M${x} 184v-29a12 12 0 0 1 24 0v29Z`} fill="#FFF0D6" stroke="#9D7960" strokeWidth="3"/>)}
        <path d="M183 113H465" stroke="#F6DCB9" strokeWidth="8"/>
      </g>;
  }
}

/** Presentational SVG used by both world selection and city arrival.
 * No network, account, score, entitlement or tracking dependencies. */
export function ItalianCityArtwork({ unitId, locale, compact = false, className, decorative = false }: Props) {
  const city = italianCityIdentity(unitId);
  if (!city) return null;
  const c = city.palette;
  return <svg viewBox="0 0 640 220" preserveAspectRatio="xMidYMid slice"
    role={decorative ? undefined : "img"} aria-hidden={decorative ? true : undefined}
    aria-label={decorative ? undefined : city.inspiration[locale]}
    className={className ?? "block h-auto w-full"}
    data-yoppo-city-art={unitId} data-city-motif={city.motif} data-city-size={compact ? "compact" : "wide"}>
    <rect width="640" height="220" fill={c.sky}/>
    <circle cx="510" cy="37" r="24" fill={c.accent} opacity=".86"/>
    <path d="M0 145Q143 91 260 143T487 143T640 132V220H0Z" fill={c.earth}/>
    <path d="M0 196Q160 180 300 196T640 184V220H0Z" fill={c.water} opacity={["canal","volcano","lighthouse"].includes(city.motif) ? 1 : .3}/>
    <Landmark city={city}/>
    {!compact ? <g fill="#608B68" opacity=".8">
      <path d="M55 178l17-47 19 47ZM97 181l17-35 19 35ZM532 177l14-40 17 40ZM561 183l12-33 12 33Z"/>
    </g> : null}
  </svg>;
}
