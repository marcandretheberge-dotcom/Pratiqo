import { publishedPremiumAudioPath } from "../audio/premiumPublished";
// Exact existing Italian recordings; no new text or accent is assigned to these files.
const existingItalian: Record<string, string> = {
  "Scusi, dov’è il mercato?": "yo/it/italian-bologna-a1/v1/italian-standard/phrase/scusi-dov-e-il-mercato-b4072a51a8de.mp3",
  "Può ripetere, per favore?": "yo/it/italian-bologna-a1/v1/italian-standard/phrase/puo-ripetere-per-favore-e5422a0382a5.mp3",
};
export function interestAudioPath(locale: string, text: string): string | undefined {
  return publishedPremiumAudioPath(locale, text) ?? (locale === "it-IT" ? existingItalian[text] : undefined);
}
