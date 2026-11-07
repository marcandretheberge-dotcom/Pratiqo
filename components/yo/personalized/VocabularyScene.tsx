import type { VocabularyPicture } from "@/lib/yo/personalized/types";
import type { YoLocale } from "@/lib/yo/types";

/** Original inline illustrations, not emoji or inferred demographic identities. */
export function VocabularyScene({picture:p,locale}:{picture:VocabularyPicture;locale:YoLocale}) {
 const label=p.detail==="NATIONALITY"?{fr:"Nationalité",en:"Nationality",es:"Nacionalidad"}[locale]:p.detail==="CITY"?{fr:"Ville d’origine",en:"City of origin",es:"Ciudad de origen"}[locale]:"";
 return <svg viewBox="0 0 200 150" role="img" aria-label={p.alt[locale]} className="block w-full rounded-xl" focusable="false">
  <rect width="200" height="150" rx="16" fill={p.time==="night"?"#29374d":"#edf4f0"}/><path d="M0 120Q55 100 105 120T200 112V150H0" fill="#d8e8dc"/>
  {p.kind==="greeting"&&p.time==="night"?<><path d="M159 23a20 20 0 1 0 12 32 18 18 0 0 1-12-32" fill="#f4d58c"/><rect x="26" y="92" width="130" height="24" rx="9" fill="#638e98"/><circle cx="52" cy="86" r="20" fill="#c98f68"/><path d="M40 86h8m7 0h8" stroke="#263b35" strokeWidth="3"/></>:<>
  <path d="M38 130V111c0-30 17-42 39-42s39 12 39 42v19" fill="#3c796b"/>
  <circle cx="77" cy="51" r="29" fill="#d8a17a"/><path d="M48 48c-5-34 54-43 58 0-10-12-17-17-33-14-13 2-15 8-25 14" fill="#39463f"/>
  <circle cx="67" cy="51" r="2.3" fill="#263b35"/><circle cx="87" cy="51" r="2.3" fill="#263b35"/>
  <path d={p.mood==="sad"?"M66 67Q77 56 88 67":p.mood==="neutral"?"M66 64h22":"M66 60Q77 74 88 60"} fill="none" stroke="#75412f" strokeWidth="3" strokeLinecap="round"/>
  {p.kind==="feeling"?<>
    {p.mood==="happy"?<><path d="M111 97l15-20v-16q8-6 11 3v13h14q8 0 6 10l-6 18h-29" fill="#d8a17a"/><path d="m149 37 6 6 13-16" fill="none" stroke="#3c796b" strokeWidth="5"/></>:null}
    {p.mood==="neutral"?<><path d="m108 99 30-7 24 5-20 5-30 14" fill="#d8a17a"/><text x="148" y="61" fontSize="32" fill="#71684a" textAnchor="middle">~</text></>:null}
    {p.mood==="sad"?<><rect x="50" y="32" width="53" height="11" rx="5" fill="#fffdf8"/><path d="m106 98 36-9 16 9-18 6-31 12" fill="#d8a17a"/><path d="M140 39q-10 14 0 18 10-4 0-18" fill="#6896b0"/></>:null}
  </>:null}
  </>}
  {p.kind==="age"?<><rect x="110" y="84" width="65" height="39" rx="7" fill="#d29a72"/><path d="M109 91h67" stroke="#fffdf8" strokeWidth="7"/><path d="M142 70v15" stroke="#bc6b48" strokeWidth="4"/><path d="M142 59q-7 11 0 11 7 0 0-11" fill="#e3a145"/><rect x="115" y="14" width="64" height="42" rx="12" fill="white"/><text x="147" y="43" fontSize="29" fontWeight="700" fill="#254b42" textAnchor="middle">{p.label}</text></>:null}
  {p.kind==="question"?<>
   <path d="M111 16h70v66h-32l-15 13v-13h-23z" fill="white" stroke="#82a195" strokeWidth="2"/>
   {p.detail==="MAP"?<><path d="m119 36 16-7 18 7 18-7v38l-18 7-18-7-16 7z" fill="#d4e3db"/><path d="M151 38c-12 0-12 13 0 23 12-10 12-23 0-23" fill="#b46945"/><circle cx="151" cy="44" r="3" fill="white"/></>:p.detail==="AGE"?<><rect x="121" y="47" width="48" height="21" rx="4" fill="#d29a72"/><path d="M144 37v11" stroke="#bc6b48" strokeWidth="3"/><text x="144" y="33" textAnchor="middle" fontSize="19" fill="#254b42">?</text></>:p.detail==="FEELING"?<><circle cx="130" cy="52" r="13" fill="#efce9e"/><circle cx="162" cy="52" r="13" fill="#efce9e"/><path d="M124 54q6 9 12 0m20 5q6-9 12 0" fill="none" stroke="#75412f" strokeWidth="2"/></>:<><rect x="120" y="35" width="52" height="31" rx="5" fill="#d8e8dc"/><text x="146" y="57" textAnchor="middle" fontSize="22" fill="#254b42">?</text></>}
  </>:null}
  {p.kind==="profile"?<>
   <rect x="103" y="12" width="88" height="99" rx="9" fill="white" stroke="#bdd2c5" strokeWidth="2"/>
   {p.country?<><rect x="120" y="28" width="55" height="29" fill="white"/>{p.country==="CA"?<><path d="M120 28h12v29h-12m43-29h12v29h-12" fill="#b84848"/><path d="m147 30 4 9 6-3-3 9 7 2-11 5v4h-5v-4l-10-5 7-2-3-9 5 3z" fill="#b84848"/></>:<><path d="M120 28h18v29h-18" fill={p.country==="IT"?"#3b8262":"#41659b"}/><path d="M157 28h18v29h-18" fill="#b84848"/></>}</>:p.detail==="CITY"?<><path d="m115 28 18-5 17 5 26-5v31l-26 5-17-5-18 5z" fill="#d8e8dc"/><path d="M148 27c-13 0-13 15 0 25 13-10 13-25 0-25" fill="#ad6542"/><circle cx="148" cy="34" r="4" fill="white"/></>:<><circle cx="146" cy="35" r="10" fill="#94b8a6"/><path d="M130 58q16-27 32 0" fill="#94b8a6"/></>}
   {label?<text x="147" y="76" textAnchor="middle" fontSize="9" fill="#51645c">{label}</text>:null}
   <text x="147" y={label?"94":"82"} textAnchor="middle" fontSize={p.label.length>7?"13":"16"} fontWeight="700" fill="#254b42">{p.label}</text>
  </>:null}
 </svg>;
}
