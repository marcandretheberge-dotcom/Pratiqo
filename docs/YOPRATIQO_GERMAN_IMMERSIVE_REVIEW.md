# Allemand : parcours immersif debutant

Date : 2026-11-01. Branche : `feat/yopratiqo-german-immersive-practice`.
Base : `357258ec037af72645c301967a454925a663cf01`.
Phase de construction isolee dans `german-immersive`. Aucun commit, push, deploiement,
changement de donnees serveur ou modification des autres worktrees pendant ce lot.

## Perimetre

- 8 unites, 24 lecons originales, 96 entrees de vocabulaire.
- 148 activites : association, phrase a reconstruire, lecture, ecoute,
  rappel ecrit, dictee, dialogues, commande avec budget fictif et directions.
- 8 bilans de 6 questions, un bilan cumulatif de 16 questions et une finale
  culturelle de 8 questions (72 questions de bilan au total).
- 24 missions orales autoevaluees et 8 productions personnelles.
- Interface FR/EN/ES, allemand cible `lang=de`, trémas et ß non neutralises.
- Yoppo reutilise les commandes, aides, minimisation et deplacement existants.
  Une aide avant reussite est distinguee d'un rappel sans aide.
- Progression locale independante de l'italien, reprise, revisions espacees,
  remise a zero inter-onglets et brouillon local effacable. Aucun envoi du texte.

Ce sont des fondations pour debutants, pas un cours certifiant un niveau CECRL
complet. La production orale n'est pas automatiquement notee. Aucune vie,
aucun chronometre ni achat n'est impose.

## Photos et culture

Quatre photographies reelles, redimensionnees sans recadrage, avec auteur,
source et licence visibles :

| Lieu | Auteur | Licence | Source des faits |
| --- | --- | --- | --- |
| Porte de Brandebourg, Berlin | Pierre-Selim Huard | CC BY 4.0 | Berlin.de |
| Cathedrale de Cologne | Velvet | CC BY-SA 4.0 | UNESCO 292 |
| Bacharach, Rhin | Joerg Braukmann | CC BY-SA 4.0 | UNESCO 1066 |
| Speicherstadt, Hambourg | Dietmar Rabich | CC BY-SA 4.0 | UNESCO 1467 |

Les URL exactes et les traductions sont dans `lib/yo/german/courseCulture.ts`.
Chaque question finale renvoie a l'unite ayant enseigne son contenu.
Les legendes identifiant le lieu restent cachees avant verification.
Ouvrir la source d'une photo marque le bilan comme assiste.

## Audio et cout

215 MP3 generes avec l'API OpenAI existante, modele `tts-1-hd`, voix `alloy`.
Autorisation : maximum 3 USD pour ce lot allemand.
Tarif officiel consulte : 30 USD / million de caracteres :
https://developers.openai.com/api/docs/models/tts-1-hd

Le compteur conservateur utilise les octets UTF-8, reserve le cout avant
chaque requete et compte aussi les echecs eventuels. Aucun retry automatique.
Reservation cumulee : **0,16377 USD**, hors conversion/taxes eventuelles.
Ce compteur n'est pas une facture fournisseur.

- 215 fichiers verifies, 5,57 minutes, 0 upload.
- Validation de toutes les trames MP3 et comparaison avec le cache SHA-256.
- Reprise sans nouvelle generation et sans ecrasement.
- Aucune cle dans le client, les MP3, le manifeste ou ce rapport.
- Lecteur existant, lecture explicite uniquement, vitesse lente et transcription.
- Les fichiers sont livres dans `public/audio/yo/de/`. Aucun backend audio
  de production n'est necessaire. Cela ne constitue pas encore un paquet
  applicatif integralement telechargeable hors connexion.

## Architecture et fichiers

- `app/yo/langues/allemand/` : entree, parcours, unites et bilans.
- `components/yo/german/` : navigation, ateliers, evaluation et reprise.
- `lib/yo/german/` : contenu, culture, normalisation et audio de chaque unite.
- `lib/yo/audio/germanCourseAudio.ts` : plan serveur, deduplication des phrases.
- `public/images/yo/german/` et `public/audio/yo/de/` : vrais medias locaux.
- `scripts/generate-german-course-local-audio.ts` : adaptateur local utilisant
  les helpers existants de requete, cache et validation, sans Supabase Storage.
- `scripts/prepare-german-course-photos.mjs` : sources photographiques epinglees.
- Moteurs italiens : parametre de langue facultatif, italien par defaut;
  cle de progression facultative; controle des trémas; aucun ancien audio modifie.
- `YoLanguageQuickStart.tsx` : entree allemande depuis les espaces de langues.
- `lib/yo/types.ts`, `accentProfiles.ts` : langue et profil audio allemand.
- `package.json` : suite `test:yo-german`; aucune dependance changee.
- `.gitignore` : cache de generation allemand exclu.
- Trois nouvelles suites allemandes et extension du test de navigation FR/EN/ES.
- `InstallAppPrompt.tsx` : invitation d'installation masquee uniquement sur le
  nouveau parcours allemand. La QA mobile a reproduit son chevauchement avec
  les exercices et le bouton Yoppo. Le comportement de la page d'accueil reste
  couvert par un vrai rendu JSDOM.
- `yopratiqoAudioPronunciationOverrides.test.ts` : l'ancien garde interdisait
  tout nouveau MP3. Il accepte seulement les ajouts du manifeste allemand,
  effectivement publies et valides MP3. Toute modification d'un enregistrement
  present dans HEAD et tout fichier hors manifeste restent interdits.

## Validation

Commandes executees dans le seul worktree allemand :

| Commande | Resultat |
| --- | --- |
| `npm ci --no-audit --no-fund` | PASS, dependances du lockfile installees localement |
| `npm run test:yo-german` | PASS : 8 contenu, 13 interactions, 4 audio/photos; suite interactions relancee ensuite avec 14 cas |
| `npm run test:yo-italian-course` | PASS |
| `npm run test:yo-japanese-foundations` | PASS |
| `node --import tsx scripts/generate-german-course-local-audio.ts --verify` | PASS : 215 MP3, zero generation/upload |
| `node --import tsx scripts/validate_i18n.ts` | PASS : 3562 cles par langue |
| `npm run lint` | PASS : 0 erreur, 259 avertissements |
| `node --import tsx tests/app/pwaInstallableMobileShell.test.ts` | PASS, invitation masquee sur le parcours allemand |
| `node --import tsx tests/yo/yopratiqoAudioPronunciationOverrides.test.ts` | PASS : 11 assertions, nouveaux MP3 autorises et anciens proteges |
| `npx --yes prettier@3.6.2 --check ...` | PASS sur les nouveaux composants, routes, contenu, scripts et tests allemands; aucun changement de dependances |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | PASS initial; verification TypeScript complete aussi reussie dans le build final |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS final, code de sortie 0 |
| `node ../german-preview-local/app.cjs build` | PASS final, compilation 72 s, TypeScript 4,3 min, 353 pages statiques |
| `npm run test:launch-critical` | PASS final, code de sortie 0; premier essai bloque par l'ancien garde interdisant les nouveaux MP3 |
| `git diff --check` | PASS |

La suite d'interactions finale a ete executee par
`node --import tsx tests/yo/yopratiqoGermanCoursePlayer.test.ts` : 14/14 PASS.
Le controle Prettier cible exactement :

```powershell
npx --yes prettier@3.6.2 --check "app/yo/langues/allemand/**/*.tsx" "components/yo/german/*.tsx" "lib/yo/german/*.ts" lib/yo/audio/germanCourseAudio.ts scripts/generate-german-course-local-audio.ts scripts/prepare-german-course-photos.mjs "tests/yo/yopratiqoGerman*.test.ts"
```

Les journaux locaux sont conserves hors Git dans `german-preview-local` :
`build-verified.log`, `typecheck-final.log`, `lint-final.log`,
`launch-critical-final.log`, `german-final.log`, `german-mobile-final.log`.

Les premiers essais de build ont detecte une jonction node_modules hors
racine Turbopack, puis une passerelle locale arretee. Ils ne sont pas
presentes comme reussis. Les dependances sont desormais propres au worktree.
La passerelle locale et les lectures Supabase synthetiques repondent HTTP 200.
Le lanceur de build n'utilise pas de fichier .env de production et bloque
les requetes serveur externes. Les configurations sandbox restent hors Git.

Le nouvel avertissement de lint concerne l'hydratation du brouillon depuis
localStorage dans un effet; aucun controle ou regle n'a ete desactive.
Next signale egalement l'option existante `experimental.forceSwcTransforms`
ignoree par Turbopack; elle n'a pas ete modifiee dans ce lot.

## QA navigateur locale

URL : http://127.0.0.1:55620/yo/langues/allemand/parcours?lang=fr

Essais dans le navigateur sur le build de production local, sans compte ni
ecriture serveur :

- Ecran 390 x 844 : parcours, premiere unite, exercice d'association termine,
  compteur passe a 1/19 et retour explicite "Sans aide".
- Lecture de "Ich heisse Nora" (texte allemand avec eszett dans l'interface) :
  bouton passe a Arreter, sans erreur console. Aucun autoplay.
- Brouillon synthetique conserve apres rechargement; compteur d'activites aussi.
- Finale culturelle : photo reelle chargee, lieu cache avant reponse, correction
  apres une mauvaise reponse et lien vers la lecon source.
- 320 x 740 : photo et choix de reponse sans debordement horizontal.
- Le double paragraphe explicatif de la finale a ete retire et teste.
- Build final : FR/EN/ES verifies par navigation reelle, progression conservee
  au changement de langue; un seul H1; images chargees; aucune erreur console.
- 1440 x 900 : parcours a deux colonnes, photo et Yoppo charges, largeur document
  1425 pour une fenetre de 1440. Sur mobile 390 : document 375; sur 320 : 305.
- Huit unites, parcours et deux finales : HTTP 200 avec un H1. Identifiant
  d'unite invalide : HTTP 404. Verification HTTP locale uniquement.
- Aide progressive Yoppo testee : indice, explication et minimisation; aucune
  invitation d'installation superposee. Le montage JSDOM neuf confirme aussi
  l'absence de cette invitation sans preference de fermeture preenregistree.
- Captures locales hors Git : `german-preview-local/german-desktop.jpg` et
  `german-preview-local/german-mobile.jpg`.

La premiere session de QA a rencontre l'invitation PWA superposee; ce constat
est corrige, et n'est pas presente comme une validation initiale sans defaut.

## Limites et suite

- Relecture finale par un germanophone et ecoute humaine de tous les MP3
  restent conseillees avant une publication pedagogique definitive.
- Safari physique et reprise entre appareils ne sont pas attestes.
- La progression et les brouillons restent sur l'appareil; pas de cloud sync.
- Pas de paiement, migration, offre payante, exposition de donnees ou TTS runtime.
- Portugais du Bresil : prochain lot distinct, pas une copie rebaptisee
  et pas d'audio portugais genere avec cette autorisation allemande.
- Aucune publication en production dans ce lot.

## Verdict

PRET POUR ESSAI LOCAL ET REVUE : build, TypeScript, lancement critique,
non-regression italien/japonais, i18n, mise en forme et tests allemands passes.
Le lint conserve 259 avertissements, dont celui d'hydratation du brouillon
documente ci-dessus; ce n'est donc pas un depot sans avertissement.
Aucune CI distante n'a ete lancee : branche non poussee, aucun commit ni PR.
La relecture linguistique, l'ecoute humaine exhaustive et Safari physique ne
sont pas presentes comme realises pendant cette phase.

## Livraison autorisee

Le 2026-11-01, autorisation de pousser, fusionner en squash et deployer
l'allemand lorsque les controles distants sont verts. Livraison via GitHub
et reconstruction Vercel avec ses variables de production existantes, jamais
par promotion du build local. Aucune migration ni generation vocale au runtime.
Les limites pedagogiques et Safari ci-dessus restent explicites. L'etat final
du deploiement et son SHA sont a confirmer apres fusion.
