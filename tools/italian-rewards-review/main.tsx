import { createRoot } from "react-dom/client";
import { ItalianRewardsPreview } from "../../components/yo/rewards/ItalianRewardsPreview";
import { personalizedItalianUnits as units, personalizedItalianCatalog as catalog, moduleBank } from "../../lib/yo/personalized/courseData";
import { courseAudioPaths } from "../../lib/yo/italian/course/courseAudio.server";
import { unitSpeech } from "../../lib/yo/italian/course/courseSpeech";
import { FLORENCE_DISCOVERY_PHRASES } from "../../lib/yo/italian/travel/journey";
import { getYoLocale } from "../../lib/yo/localize";

if (!["127.0.0.1", "localhost"].includes(location.hostname)) throw new Error("Local review only");
const locale = getYoLocale(new URLSearchParams(location.search).get("lang") ?? undefined);
document.documentElement.lang = locale;
createRoot(document.getElementById("root")!).render(<ItalianRewardsPreview units={units} catalog={catalog} locale={locale}
  banks={Object.fromEntries(units.map(u => [u.id, moduleBank(u)]))}
  audioPaths={courseAudioPaths([...units.flatMap(unitSpeech), ...units.flatMap(u => moduleBank(u).map(p => p.it)), ...FLORENCE_DISCOVERY_PHRASES])}/>);
