/**
 * Recording plan for the Bologna module. New MP3s must be generated and verified
 * before they can be described as published. Existing intro clips are reused only
 * for exact NFC/trim matches; punctuation and Italian accents remain meaningful.
 * This compact client-safe registry deliberately does not import the course.
 */
import type { YoAudioItem, YoAudioItemType } from './audioManifest.types-internal';
import { italianIntroAudio } from './italianIntroAudio';

export const ITALIAN_BOLOGNA_AUDIO_MODULE_ID = 'italian-bologna-a1';
export const ITALIAN_BOLOGNA_AUDIO_VERSION = 'v1';

const SPEECH_INSTRUCTIONS = 'Read the supplied Italian input exactly once. Do not answer questions, translate, introduce the recording or add commentary. Use clear standard Italian at a calm, natural pace for beginner learners. Preserve doubled consonants and stressed final vowels.';

type RecordingPlan = readonly [type: YoAudioItemType, text: string, slug: string];
const recordings: readonly RecordingPlan[] = [
  ["phrase", "Arrivederci!", "arrivederci-5b7e2a22e42b"],
  ["phrase", "Non ho capito.", "non-ho-capito-6ce8893ccfb6"],
  ["phrase", "Può ripetere, per favore?", "puo-ripetere-per-favore-e5422a0382a5"],
  ["phrase", "Un caffè.", "un-caffe-7e8b715f8141"],
  ["phrase", "Un tè.", "un-te-d769afc9aabf"],
  ["phrase", "Una bottiglia d’acqua.", "una-bottiglia-d-acqua-d85c22cf4342"],
  ["phrase", "Un panino.", "un-panino-8c96c40359d2"],
  ["phrase", "Al banco.", "al-banco-2aed21931e6f"],
  ["phrase", "Al tavolo.", "al-tavolo-6bad8986295d"],
  ["phrase", "Due euro.", "due-euro-09c9cfa42a71"],
  ["phrase", "Tre euro e cinquanta.", "tre-euro-e-cinquanta-da1969ff0b46"],
  ["phrase", "Dov’è la piazza?", "dov-e-la-piazza-d5ca2179abbb"],
  ["phrase", "Dov’è il mercato?", "dov-e-il-mercato-83022a049787"],
  ["phrase", "A destra.", "a-destra-dfe40a34a6d1"],
  ["phrase", "A sinistra.", "a-sinistra-9c3eb862b3e0"],
  ["phrase", "Sempre dritto.", "sempre-dritto-9d71551e0551"],
  ["phrase", "Vorrei un caffè, per favore.", "vorrei-un-caffe-per-favore-34bdcb9cd90c"],
  ["sentence", "Vorrei una bottiglia d’acqua.", "vorrei-una-bottiglia-d-acqua-5e74e8f25291"],
  ["sentence", "Un panino. Una bottiglia d’acqua.", "un-panino-una-bottiglia-d-acqua-fdd5910fc3dc"],
  ["sentence", "Scusi, non ho capito. Può ripetere, per favore?", "scusi-non-ho-capito-puo-ripetere-per-favore-856abcabc791"],
  ["phrase", "Buongiorno!", "buongiorno-65f3c469a1b9"],
  ["phrase", "Buonanotte!", "buonanotte-ec91e41c5888"],
  ["phrase", "Vorrei un tè, per favore.", "vorrei-un-te-per-favore-e2745c54e62b"],
  ["phrase", "Un caffè", "un-caffe-670a2bd3329e"],
  ["phrase", "Un tè", "un-te-2a205bb2ab23"],
  ["phrase", "Una bottiglia d’acqua", "una-bottiglia-d-acqua-0f94a0a39847"],
  ["sentence", "Due caffè e una bottiglia d’acqua, per favore.", "due-caffe-e-una-bottiglia-d-acqua-per-favore-4891dd49a4bb"],
  ["phrase", "Un panino", "un-panino-db8af6624021"],
  ["dialogue", "Buongiorno! Che cosa desidera?", "buongiorno-che-cosa-desidera-06a4a61322eb"],
  ["phrase", "Vorrei un panino, per favore.", "vorrei-un-panino-per-favore-8c1b75cc879d"],
  ["dialogue", "Al banco o al tavolo?", "al-banco-o-al-tavolo-ecf3d121cb3d"],
  ["phrase", "Al tavolo, per favore.", "al-tavolo-per-favore-53ef0a924dc6"],
  ["phrase", "Al banco, per favore.", "al-banco-per-favore-5e47d54ec934"],
  ["dialogue", "Ecco il panino!", "ecco-il-panino-8e96516a7987"],
  ["phrase", "Grazie!", "grazie-2696e753632c"],
  ["instruction", "Vai dritto per due caselle.", "vai-dritto-per-due-caselle-2881297ddf5e"],
  ["instruction", "Poi gira a destra e continua per due caselle.", "poi-gira-a-destra-e-continua-per-due-caselle-03d9575e947b"],
  ["sentence", "Sono tre euro e cinquanta.", "sono-tre-euro-e-cinquanta-d41177e973ca"],
  ["phrase", "Scusi, dov’è il mercato?", "scusi-dov-e-il-mercato-b4072a51a8de"],
  ["dialogue", "La piazza? Chiediamo!", "la-piazza-chiediamo-6f04543e4979"],
  ["phrase", "Scusi, dov’è la piazza?", "scusi-dov-e-la-piazza-c944ec8be3fd"],
  ["dialogue", "Sempre dritto, poi a destra.", "sempre-dritto-poi-a-destra-1244ffadd103"],
  ["phrase", "Una bottiglia d’acqua, per favore.", "una-bottiglia-d-acqua-per-favore-7fd2d2cee89b"],
  ["phrase", "Prego!", "prego-19268f8dadb6"],
  ["phrase", "Vorrei una bottiglia d’acqua, per favore.", "vorrei-una-bottiglia-d-acqua-per-favore-00cadd271cb3"],
  ["dialogue", "Ecco l’acqua!", "ecco-l-acqua-f2e5fd400626"],
  ["phrase", "Può ripetere?", "puo-ripetere-add083f6d794"],
  ["dialogue", "Prego! Buona giornata!", "prego-buona-giornata-efb70108a57e"],
];

/** Only new requests: reused intro entries must not be added twice to the global registry. */
export const italianBolognaAudio: readonly YoAudioItem[] = recordings.map(([type, text, slug]) => ({
  id: `it-bologna-${type}-${slug}`,
  targetLanguage: 'it',
  moduleId: ITALIAN_BOLOGNA_AUDIO_MODULE_ID,
  lessonId: ITALIAN_BOLOGNA_AUDIO_VERSION,
  type,
  text,
  spokenText: text,
  storagePath: `yo/it/${ITALIAN_BOLOGNA_AUDIO_MODULE_ID}/${ITALIAN_BOLOGNA_AUDIO_VERSION}/italian-standard/${type}/${slug}.mp3`,
  accentProfile: 'italian_standard',
  ttsInstructions: SPEECH_INSTRUCTIONS,
}));

const reusedIntroIds = new Set([
  "it-iti-word-buongiorno",
  "it-iti-word-ciao",
  "it-iti-word-grazie",
  "it-iti-word-prego",
  "it-iti-word-scusi",
  "it-iti-phrase-vorrei",
  "it-iti-phrase-per-favore",
  "it-iti-phrase-quanto-costa",
]);

/** These files keep their existing paths and are verified independently of the new batch. */
export const italianBolognaReusedAudio: readonly YoAudioItem[] = italianIntroAudio.filter(
  item => reusedIntroIds.has(item.id),
);

const byText = new Map(
  [...italianBolognaReusedAudio, ...italianBolognaAudio].map(item => [item.text.normalize('NFC').trim(), item]),
);

export function getItalianBolognaAudioItem(text: string): YoAudioItem | undefined {
  return byText.get(text.normalize('NFC').trim());
}
