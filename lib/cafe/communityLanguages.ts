/** Language exchange is independent of the course catalogue. ISO 639-1 plus searchable BCP47 additions. */
export const CAFE_LANGUAGE_CODES = (
  "aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu"
).split(" ");

/** Full-ICU display names keep the catalogue readable in browsers with smaller locale data. */
const LANGUAGE_NAME_FALLBACKS: Record<string, readonly [string, string, string]> = {
  "aa": ["afar","Afar","afar"],
  "ab": ["abkhaze","Abkhazian","abjasio"],
  "ae": ["avestique","Avestan","avéstico"],
  "af": ["afrikaans","Afrikaans","afrikáans"],
  "ak": ["akan","Akan","akan"],
  "am": ["amharique","Amharic","amárico"],
  "an": ["aragonais","Aragonese","aragonés"],
  "ar": ["arabe","Arabic","árabe"],
  "as": ["assamais","Assamese","asamés"],
  "av": ["avar","Avaric","avar"],
  "ay": ["aymara","Aymara","aimara"],
  "az": ["azerbaïdjanais","Azerbaijani","azerbaiyano"],
  "ba": ["bachkir","Bashkir","baskir"],
  "be": ["biélorusse","Belarusian","bielorruso"],
  "bg": ["bulgare","Bulgarian","búlgaro"],
  "bh": ["bhodjpouri","Bhojpuri","bhoyapurí"],
  "bi": ["bichelamar","Bislama","bislama"],
  "bm": ["bambara","Bambara","bambara"],
  "bn": ["bengali","Bangla","bengalí"],
  "bo": ["tibétain","Tibetan","tibetano"],
  "br": ["breton","Breton","bretón"],
  "bs": ["bosniaque","Bosnian","bosnio"],
  "ca": ["catalan","Catalan","catalán"],
  "ce": ["tchétchène","Chechen","checheno"],
  "ch": ["chamorro","Chamorro","chamorro"],
  "co": ["corse","Corsican","corso"],
  "cr": ["cree","Cree","cree"],
  "cs": ["tchèque","Czech","checo"],
  "cu": ["slavon d’église","Church Slavic","eslavo eclesiástico"],
  "cv": ["tchouvache","Chuvash","chuvasio"],
  "cy": ["gallois","Welsh","galés"],
  "da": ["danois","Danish","danés"],
  "de": ["allemand","German","alemán"],
  "dv": ["maldivien","Divehi","divehi"],
  "dz": ["dzongkha","Dzongkha","dzongkha"],
  "ee": ["éwé","Ewe","ewé"],
  "el": ["grec","Greek","griego"],
  "en": ["anglais","English","inglés"],
  "eo": ["espéranto","Esperanto","esperanto"],
  "es": ["espagnol","Spanish","español"],
  "et": ["estonien","Estonian","estonio"],
  "eu": ["basque","Basque","euskera"],
  "fa": ["persan","Persian","persa"],
  "ff": ["peul","Fula","fula"],
  "fi": ["finnois","Finnish","finés"],
  "fj": ["fidjien","Fijian","fiyiano"],
  "fo": ["féroïen","Faroese","feroés"],
  "fr": ["français","French","francés"],
  "fy": ["frison occidental","Western Frisian","frisón occidental"],
  "ga": ["irlandais","Irish","irlandés"],
  "gd": ["gaélique écossais","Scottish Gaelic","gaélico escocés"],
  "gl": ["galicien","Galician","gallego"],
  "gn": ["guarani","Guarani","guaraní"],
  "gu": ["goudjarati","Gujarati","guyaratí"],
  "gv": ["mannois","Manx","manés"],
  "ha": ["haoussa","Hausa","hausa"],
  "he": ["hébreu","Hebrew","hebreo"],
  "hi": ["hindi","Hindi","hindi"],
  "ho": ["hiri motu","Hiri Motu","hiri motu"],
  "hr": ["croate","Croatian","croata"],
  "ht": ["créole haïtien","Haitian Creole","criollo haitiano"],
  "hu": ["hongrois","Hungarian","húngaro"],
  "hy": ["arménien","Armenian","armenio"],
  "hz": ["héréro","Herero","herero"],
  "ia": ["interlingua","Interlingua","interlingua"],
  "id": ["indonésien","Indonesian","indonesio"],
  "ie": ["interlingue","Interlingue","interlingue"],
  "ig": ["igbo","Igbo","igbo"],
  "ii": ["yi du Sichuan","Sichuan Yi","yi de Sichuán"],
  "ik": ["inupiaq","Inupiaq","inupiaq"],
  "io": ["ido","Ido","ido"],
  "is": ["islandais","Icelandic","islandés"],
  "it": ["italien","Italian","italiano"],
  "iu": ["inuktitut","Inuktitut","inuktitut"],
  "ja": ["japonais","Japanese","japonés"],
  "jv": ["javanais","Javanese","javanés"],
  "ka": ["géorgien","Georgian","georgiano"],
  "kg": ["kikongo","Kongo","kongo"],
  "ki": ["kikuyu","Kikuyu","kikuyu"],
  "kj": ["kuanyama","Kuanyama","kuanyama"],
  "kk": ["kazakh","Kazakh","kazajo"],
  "kl": ["groenlandais","Kalaallisut","groenlandés"],
  "km": ["khmer","Khmer","jemer"],
  "kn": ["kannada","Kannada","canarés"],
  "ko": ["coréen","Korean","coreano"],
  "kr": ["kanouri","Kanuri","kanuri"],
  "ks": ["cachemiri","Kashmiri","cachemir"],
  "ku": ["kurde","Kurdish","kurdo"],
  "kv": ["komi","Komi","komi"],
  "kw": ["cornique","Cornish","córnico"],
  "ky": ["kirghize","Kyrgyz","kirguís"],
  "la": ["latin","Latin","latín"],
  "lb": ["luxembourgeois","Luxembourgish","luxemburgués"],
  "lg": ["ganda","Ganda","ganda"],
  "li": ["limbourgeois","Limburgish","limburgués"],
  "ln": ["lingala","Lingala","lingala"],
  "lo": ["lao","Lao","lao"],
  "lt": ["lituanien","Lithuanian","lituano"],
  "lu": ["luba-katanga (kiluba)","Luba-Katanga","luba-katanga"],
  "lv": ["letton","Latvian","letón"],
  "mg": ["malgache","Malagasy","malgache"],
  "mh": ["marshallais","Marshallese","marshalés"],
  "mi": ["maori","Māori","maorí"],
  "mk": ["macédonien","Macedonian","macedonio"],
  "ml": ["malayalam","Malayalam","malayálam"],
  "mn": ["mongol","Mongolian","mongol"],
  "mr": ["marathi","Marathi","maratí"],
  "ms": ["malais","Malay","malayo"],
  "mt": ["maltais","Maltese","maltés"],
  "my": ["birman","Burmese","birmano"],
  "na": ["nauruan","Nauru","nauruano"],
  "nb": ["norvégien bokmål","Norwegian Bokmål","noruego bokmal"],
  "nd": ["ndébélé du Nord","North Ndebele","ndebele septentrional"],
  "ne": ["népalais","Nepali","nepalí"],
  "ng": ["ndonga","Ndonga","ndonga"],
  "nl": ["néerlandais","Dutch","neerlandés"],
  "nn": ["norvégien nynorsk","Norwegian Nynorsk","noruego nynorsk"],
  "no": ["norvégien","Norwegian","noruego"],
  "nr": ["ndébélé du Sud","South Ndebele","ndebele meridional"],
  "nv": ["navajo","Navajo","navajo"],
  "ny": ["chewa","Nyanja","nyanja"],
  "oc": ["occitan","Occitan","occitano"],
  "oj": ["ojibwa","Ojibwa","ojibwa"],
  "om": ["oromo","Oromo","oromo"],
  "or": ["odia","Odia","oriya"],
  "os": ["ossète","Ossetic","osético"],
  "pa": ["pendjabi","Punjabi","punyabí"],
  "pi": ["pali","Pali","pali"],
  "pl": ["polonais","Polish","polaco"],
  "ps": ["pachto","Pashto","pastún"],
  "pt": ["portugais","Portuguese","portugués"],
  "qu": ["quechua","Quechua","quechua"],
  "rm": ["romanche","Romansh","romanche"],
  "rn": ["roundi","Rundi","kirundi"],
  "ro": ["roumain","Romanian","rumano"],
  "ru": ["russe","Russian","ruso"],
  "rw": ["kinyarwanda","Kinyarwanda","kinyarwanda"],
  "sa": ["sanskrit","Sanskrit","sánscrito"],
  "sc": ["sarde","Sardinian","sardo"],
  "sd": ["sindhi","Sindhi","sindi"],
  "se": ["same du Nord","Northern Sami","sami septentrional"],
  "sg": ["sango","Sango","sango"],
  "si": ["cingalais","Sinhala","cingalés"],
  "sk": ["slovaque","Slovak","eslovaco"],
  "sl": ["slovène","Slovenian","esloveno"],
  "sm": ["samoan","Samoan","samoano"],
  "sn": ["shona","Shona","shona"],
  "so": ["somali","Somali","somalí"],
  "sq": ["albanais","Albanian","albanés"],
  "sr": ["serbe","Serbian","serbio"],
  "ss": ["swati","Swati","suazi"],
  "st": ["sotho du Sud","Southern Sotho","sotho meridional"],
  "su": ["soundanais","Sundanese","sundanés"],
  "sv": ["suédois","Swedish","sueco"],
  "sw": ["swahili","Swahili","suajili"],
  "ta": ["tamoul","Tamil","tamil"],
  "te": ["télougou","Telugu","telugu"],
  "tg": ["tadjik","Tajik","tayiko"],
  "th": ["thaï","Thai","tailandés"],
  "ti": ["tigrigna","Tigrinya","tigriña"],
  "tk": ["turkmène","Turkmen","turcomano"],
  "tl": ["filipino","Filipino","filipino"],
  "tn": ["tswana","Tswana","setsuana"],
  "to": ["tongien","Tongan","tongano"],
  "tr": ["turc","Turkish","turco"],
  "ts": ["tsonga","Tsonga","tsonga"],
  "tt": ["tatar","Tatar","tártaro"],
  "tw": ["akan","Akan","akan"],
  "ty": ["tahitien","Tahitian","tahitiano"],
  "ug": ["ouïghour","Uyghur","uigur"],
  "uk": ["ukrainien","Ukrainian","ucraniano"],
  "ur": ["ourdou","Urdu","urdu"],
  "uz": ["ouzbek","Uzbek","uzbeko"],
  "ve": ["venda","Venda","venda"],
  "vi": ["vietnamien","Vietnamese","vietnamita"],
  "vo": ["volapük","Volapük","volapük"],
  "wa": ["wallon","Walloon","valón"],
  "wo": ["wolof","Wolof","wólof"],
  "xh": ["xhosa","Xhosa","xhosa"],
  "yi": ["yiddish","Yiddish","yidis"],
  "yo": ["yoruba","Yoruba","yoruba"],
  "za": ["zhuang","Zhuang","zhuang"],
  "zh": ["chinois","Chinese","chino"],
  "zu": ["zoulou","Zulu","zulú"],
};

const COURSE_ALIASES: Record<string, string> = {
  french: "fr", francais: "fr", français: "fr", english: "en", anglais: "en",
  spanish: "es", espagnol: "es", espanol: "es", español: "es", italian: "it", italien: "it",
  portuguese: "pt", portugais: "pt", german: "de", allemand: "de", arabic: "ar", arabe: "ar",
  japanese: "ja", japonais: "ja", chinese: "zh", mandarin: "cmn", korean: "ko", coreen: "ko",
};

export function canonicalCafeLanguage(value: string | null | undefined): string | null {
  const raw = value?.trim().toLowerCase();
  if (!raw) return null;
  const code = COURSE_ALIASES[raw] ?? raw;
  return code.length <= 35 && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(code) ? code : null;
}

export function cafeLanguageLabel(code: string, locale: string): string {
  const localeIndex = locale.startsWith("en") ? 1 : locale.startsWith("es") ? 2 : 0;
  const fallback = LANGUAGE_NAME_FALLBACKS[code]?.[localeIndex] ?? code;
  try {
    const label = new Intl.DisplayNames([locale], { type: "language", fallback: "none" }).of(code);
    return label && label.toLowerCase() !== code.toLowerCase() ? label : fallback;
  } catch {
    return fallback;
  }
}

export function cafeLanguageOptions(locale: string, extra: string[] = []) {
  return [...new Set([...CAFE_LANGUAGE_CODES, ...extra])]
    .map((code) => ({ code, label: cafeLanguageLabel(code, locale) }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}

/** Parse a local wall-clock input in the viewer's time zone, rejecting DST gaps/invalid dates. */
export function cafeScheduledIso(localValue: string, now = Date.now()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localValue)) return null;
  const value = new Date(localValue);
  if (!Number.isFinite(value.getTime()) || value.getTime() <= now || value.getTime() > now + 90 * 86_400_000) return null;
  const [date, time] = localValue.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (value.getFullYear() !== year || value.getMonth() + 1 !== month || value.getDate() !== day
    || value.getHours() !== hour || value.getMinutes() !== minute) return null;
  return value.toISOString();
}

export function cafeViewerTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function cafeLocalDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
