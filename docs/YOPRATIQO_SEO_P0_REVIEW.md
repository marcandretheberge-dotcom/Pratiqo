# YoPratiqo SEO P0

**Verdict : READY FOR REVIEW pour le lot SEO. Contrôles de livraison locaux réussis le 4 novembre 2026 ; fusion conditionnée aux checks GitHub/Vercel du commit final.**

La préparation précédente a validé build, TypeScript, lint, i18n, tests modifiés et QA HTTP/mobile/desktop. La passe exhaustive supplémentaire n'est pas entièrement verte : 129 fichiers réussis sur 157 après reprises, 28 échecs classés ci-dessous. Elle ne doit pas être présentée comme entièrement verte. La livraison utilise les contrôles réellement configurés du dépôt et Vercel, complétés par les tests SEO et HTTP du lot ; leur résultat est consigné séparément.

## Périmètre et références

- Branche isolée : `feat/yopratiqo-seo-p0`, worktree `yopratiqo-seo-p0`.
- Base contrôlée : `bffa6d6277d32f03aa3ef6d34997248c26e1da05` (origin/main lors de la préparation).
- Les autres worktrees sont préservés. La préparation initiale n'avait effectué aucun commit, push, PR ou déploiement. La nouvelle autorisation permet une livraison Git/Vercel, sans migration, paiement ni envoi.
- Next.js 16.2.9, React 19.2.4, Node 24.15.0. Instructions CLAUDE/AGENTS et documentation Next locale lues.
- Les parcours, enregistrements, jeux, consentements, achats, droits et mécanismes de progression sont inchangés.

## Inventaire avant modification

Les introductions historiques et les parcours récents ne constituent pas le même produit. Les cinq configurations `currentFreeIntroModules` restent les configurations des cinq introductions, pas la liste exhaustive des langues publiées.

Préfixe des routes ci-dessous : `/yo/langues/`.

| Langue | Présentation sur la base | Introduction | Parcours réellement présent sur main | Accès observé/configuré | Interface de présentation |
|---|---|---|---|---|---|
| Anglais | `anglais`, indexable | `anglais/intro` | Introduction, pas de parcours complet annoncé | Intro gratuite | FR/EN |
| Français québécois / Francisation | `francais-quebec`, indexable | `francais-quebec/intro` | Introduction; module professionnel futur distinct | Intro gratuite; premium non lancé | FR/EN |
| Espagnol | `espagnol`, indexable | `espagnol/intro` | Parcours République dominicaine et ses modules existants | Intro gratuite; droits et drapeaux premium RD conservés | FR/EN/ES |
| Japonais | `japonais`, indexable | `japonais/intro` | `japonais/parcours`, huit modules | Parcours public gratuit | FR/EN/ES |
| Italien | `italien`, indexable, texte trop centré sur l'intro | `italien/intro` | `italien/parcours`, douze unités, 36 leçons | Parcours public gratuit | FR/EN; le parcours dispose aussi d'une interface ES |
| Allemand | `allemand`, redirection temporaire vers le parcours | Pas de route intro séparée | `allemand/parcours`, huit étapes | Parcours public gratuit | Nouvelle présentation FR/EN/ES |
| Portugais du Brésil | `portugais-bresil`, redirection temporaire vers le parcours | Pas de route intro séparée | `portugais-bresil/parcours`, huit étapes | Parcours public gratuit | Nouvelle présentation FR/EN/ES |
| Mandarin | Pas de présentation dédiée | Pas de route intro séparée | `mandarin/parcours`, huit modules et mission finale | Parcours public gratuit | Nouvelle présentation FR/EN/ES |

Les cinq anciennes introductions ont des contenus pédagogiques FR/EN : parcours récursif des objets localisés de leurs sources, respectivement 339, 177, 151, 246 et 286 objets FR/EN, aucun avec une valeur ES. Un sélecteur ES ou une langue enseignée espagnole ne constitue donc pas une preuve de traduction de l'interface. Aucun hreflang ES n'est ajouté à ces introductions. Leur fonctionnement existant et leur repli FR ne sont pas modifiés.

Les parcours italien, japonais, allemand, portugais et mandarin ont des interfaces FR/EN/ES déjà présentes. Cela ne traduit pas rétroactivement les anciennes pages de présentation : les pages anglais/français/italien restent explicitement FR/EN.

### Main, local et production avant livraison

- Le Mandarin est bien sur la base main : commit `0399b29f`, puis correction du drapeau `bffa6d62`; PR #424 constatée fusionnée.
- Contrôle HTTP public en lecture seule pendant cette étape : `/yo/langues/mandarin/parcours` répond 200 avec `noindex, follow`. Sa présence publique n'est donc pas supposée.
- En production avant ce lot : allemand et portugais redirigent en 307 vers leur parcours; `/yo` et `/yo/langues` conservent le texte ancien; italien répond 200 mais produit deux H1 dans les deux sous-arbres adaptatifs.
- Vercel vérifié le 4 novembre : production courante Ready, commit `bffa6d6277d32f03aa3ef6d34997248c26e1da05`, déploiement `2Nmyda4cn4S4Eet6dH1YyoYgzaWt`, domaine www.pratiqo.ca. Cette référence est conservée pour un retour arrière.
- Musique, soutien scolaire et modules premium futurs ne sont pas présentés comme des cours achetables ou disponibles. Aucun nouveau checkout.

## Corrections

1. `lib/yo/publicCatalog.ts` centralise la découverte des huit langues, leurs liens directs, badges, descriptions et traductions de présentation. Il ne remplace pas les contrôles d'accès des introductions/premium.
2. Le même catalogue alimente le sélecteur et la liste des routes publiques. Les entrées SEO des nouveaux cours en dérivent leurs textes. Plus de liste parallèle de trois cartes codées directement dans le composant.
3. Les cartes gardent leur lien principal vers l'activité. Un lien secondaire vers le programme est optionnel, sans étape supplémentaire obligatoire.
4. `/yo` utilise la fabrique de métadonnées existante, retire « cinq parcours », « Audio à venir » et les promesses de voix natives. Le prix et les garanties du produit premium non lancé ne sont plus affichés sur ce hub; aucune règle de prix/droit n'est changée.
5. Allemand, portugais du Brésil et mandarin disposent de présentations SSR. Leurs objectifs viennent directement des unités existantes; leurs photos et crédits sont réutilisés. Aucun exercice nouveau, niveau garanti, avis, prix inventé ou faux locuteur natif.
6. L'italien décrit les douze unités déjà disponibles. Le japonais garde ses huit modules. Un seul H1 est émis par les présentations adaptatives, sans dupliquer le titre pour les moteurs et lecteurs d'écran.
7. Course JSON-LD décrit les objectifs et textes effectivement visibles. ItemList décrit les huit liens du catalogue. Les drapeaux d'indexabilité et de Course schema sont respectés; aucun AggregateRating, Review ou Offer fabriqué.

## Politique SEO

- Public indexable : `/yo`, `/yo/langues`, huit présentations.
- Activités et exercices : robots existants préservés, aucun ajout automatique au sitemap. Les huit entrées d'apprentissage contrôlées répondent 200 avec noindex.
- Premium futur, espaces élèves/professeurs/admin, checkout et données privées : protections inchangées.
- Canonical FR sans paramètre; EN avec `?lang=en`; ES avec `?lang=es` uniquement lorsqu'une vraie présentation ES existe. Paramètres de suivi exclus.
- Hreflang réciproques `fr-CA`, `en-CA`, et `es` si traduit. Pas de x-default ajouté. Aucune variante noindex ou redirigée annoncée.
- Les liens de présentation indisponibles en ES portent explicitement « (FR) ». `/yo` reste FR/EN car son contenu secondaire n'est pas traduit en ES.
- Limite de l'architecture existante : le layout racine statique émet encore `html lang=fr`. Chaque sous-arbre Yo public porte son vrai `lang` dès le HTML serveur; `YoDocumentLanguage` met aussi à jour la racine dans le navigateur. Pas de refonte globale du layout, ni de dépendance aux cookies pour les canonicals. Ne pas présenter la langue de la racine HTML initiale comme entièrement localisée.

### Sitemap

Comparaison reproductible avec la même fixture `emptySupplySitemap()`, sur la base isolée et l'arbre actuel :

- URL Yo canoniques : 6 avant, 10 après.
- Ajouts : `/yo`, `/yo/langues/allemand`, `/yo/langues/portugais-bresil`, `/yo/langues/mandarin`.
- Les cinq présentations historiques et le catalogue sont conservés.
- Total fixture : 43 avant, 47 après. Les autres groupes ne changent pas.
- Le sitemap HTTP du backend local synthétique contient 57 URL, dont les mêmes 10 URL Yo. Ce total ne doit pas être comparé au total de production, qui dépend d'autres données.
- Les variantes linguistiques figurent dans les alternates XML; aucune nouvelle URL d'exercice, aucune fausse date lastmod.
- `app/sitemap.ts` et `app/robots.ts` restent les conventions App Router. Robots n'est pas modifié.

## Preuves HTTP et navigateur

Serveur de production local uniquement : `http://127.0.0.1:55650`, application 55651, Supabase local 55421. Aucun fichier .env de production copié. Le lanceur extérieur au dépôt refuse les fichiers .env et les hôtes Supabase non locaux; paiements/envois neutralisés par la pile locale existante.

`tests/yo/yopratiqoSeoHttp.mjs` réalise de vrais GET anonymes, sans mocks et sans JavaScript :

- 26 variantes de présentation : 200, H1 unique, texte utile et langue du contenu dans le HTML initial, description, Open Graph, canonical, alternates réciproques, liens directs.
- Course JSON-LD : description et objectifs retrouvés dans le contenu; aucun avis ni prix inventé.
- Huit entrées d'apprentissage : 200, noindex, absentes du sitemap.
- Route langue inexistante : 404; paramètres UTM exclus du canonical.
- Sitemap et robots : 200; routes privées absentes.

QA navigateur : 390×844 et 1440×900 sur les hubs, italien, japonais, allemand EN, portugais ES et mandarin (14 combinaisons). Aucun débordement horizontal ni image cassée détecté. Captures locales dans `../yo-seo-preview-local/`.

Parcours exercé : catalogue → présentation Mandarin → changement EN → cours → unité 1 → dialogue → bouton audio → Yoppo → mini-jeu. Aucun paiement/compte/envoi. Pas d'erreur console observée pendant ce parcours. Ce contrôle confirme l'accès aux commandes et ressources, pas la qualité phonétique de chaque enregistrement ni la réussite de tous les jeux.

## Validation de préparation (historique)

Résultats finaux vérifiés sur le diff actuel, sans configuration de production.

Commandes effectivement exécutées :

- `npm ci --no-audit --no-fund` : succès, lockfile inchangé.
- `npm run test:yo-seo` : succès, neuf assertions metadata et cohérence des huit langues.
- `node --import tsx tests/yo/yopratiqoSeoHttp.mjs` : succès sur le premier build et sur le build final; 26 présentations localisées, huit entrées d'apprentissage, sitemap/robots et 404.
- `npx tsx scripts/validate_i18n.ts` : succès, 3562 clés par locale.
- `npx tsc --noEmit --incremental false` : succès, y compris le dernier passage.
- `npm run lint -- --quiet` : succès, y compris le dernier passage, aucune erreur ESLint. Cette option n'affiche pas les avertissements.
- `node ../yo-seo-preview-local/app.cjs build` : succès final (code de sortie 0), compilation, vérification TypeScript et génération de toutes les routes. Lanceur exécutant exactement `next build`, commande du script npm build, avec uniquement l'environnement local.
- `git diff --check` : succès.
- `node ../yo-seo-preview-local/suites.cjs` : exécution séquentielle des 157 fichiers Yo/SEO via `node --import tsx <fichier>`; 121 succès et 36 échecs initiaux.
- `node ../yo-seo-preview-local/recheck.cjs` : reprise des 36 échecs après adaptation des tests affectés par l'extraction du catalogue.
- `node ../yo-seo-preview-local/recheck.cjs --base` : mêmes 36 fichiers, même Node et mêmes dépendances, sur copie isolée propre `bffa6d62`.
- LanguageSelection (22 cas) et WorldclassLearningShellVisual (5 cas) relancés individuellement après leur correction : succès.

Tous les fichiers de test modifiés sont verts. Les fichiers SEO metadata/catalogue, sitemap, indexation, Course schema, landing pages ainsi que les suites contenu/jeux/audio italien, japonais, allemand, portugais et mandarin ont réellement été exécutés dans la passe complète. Les tests d'audio ne génèrent rien et n'appellent pas une API vocale payante.

Avertissements de build existants : option `experimental.forceSwcTransforms` ignorée par Turbopack, base caniuse-lite ancienne. Aucun contrôle TypeScript/build désactivé. Aucun script de formatage dédié n'existe dans package.json.

Les journaux de contrôle sont conservés localement dans `../yo-seo-preview-local/` : `build-final.log`, `http-final.log`, `suites.log`, `suites-summary.log`, `recheck.log`, `base-failures.log`, `base-summary.log`, `browser-qa.json`. Ils ne sont pas nécessaires à l'application et ne font pas partie de la livraison.

### Échecs étendus : ne pas les cacher

La passe exhaustive ne doit pas être présentée comme entièrement verte. Après corrections du lot, les échecs restants se répartissent ainsi :

1. **20 anciens gardes de périmètre** passent sur la base propre et rejettent `app/sitemap.ts` dans l'arbre SEO : AppLikeLanding, CountryCourseAppHome, DeckVisualConsistency, DominicanPedagogicalQuality, LearningEventLedger, LogoIntegration, Module3/4/5LessonDeck, ModuleLessonDeck, PratiqoBridgeConsistency, ProductShellConsistency, ProgressSnapshots, PublicBridgeUx, RdModuleProgressCompletion, StudentCompanionCard, TeacherBridgeBookingConsent, TeacherBridgeConsentCard, TeacherBridgeE2eSmoke, TeacherBridgeFoundation. Ils inspectent le diff de la tâche courante avec les interdits d'une ancienne PR. Leurs gardes n'ont pas été désactivés ni assouplis pour autoriser artificiellement le sitemap.
2. **Six échecs reproduits sur la base propre** : DominicanModule2Premium et DominicanModule3Premium comparent encore un historique qui inclut d'anciennes modifications booking/audio; LayoutOverflowContract détecte des grilles préexistantes; LessonDeckNoScrollSwipe attend une ancienne forme source du bouton audio; MobileNoScrollContract attend l'ancien shell adaptatif du catalogue; SpanishHubFlagsAndLayout attend l'ancienne union de badges sans les langues ajoutées depuis. Les modules concernés ne sont pas modifiés par ce lot.
3. **Deux tests runtime locaux hors Yo non exécutables avec leurs paramètres par défaut** : LocalDiscoveryRuntime et LocalSeoP0Runtime tentent d'atteindre leurs serveurs de fixture historiques (dont 127.0.0.1:3190), pas le serveur SEO Yo de cette tâche. Échec identique sur base/arbre actuel. Ce sont des limites de l'environnement, pas une preuve de régression ni une preuve de succès.

Les tests affectés par notre déplacement de données ont été adaptés sans retirer leurs exigences : liens réels, badges, libellés de francisation, nombre dynamique de cartes, dimensions responsive, voies d'apprentissage et absence de checkout.

## Reprise de livraison du 4 novembre 2026

- `git fetch origin` : main toujours sur la base bffa6d62 ; aucun commit distant à intégrer.
- Première reprise `npm run test:launch-critical` : échec de la frontière d'import du sélecteur. Correction : ItemList déplacé dans les deux pages serveur, via `buildYoCatalogItemList`; le sélecteur partagé reste sans dépendance SEO ni accès privilégié.
- Deuxième reprise : les gardes des anciennes PR juridiques refusaient les nouvelles présentations autorisées. Ajout d'une frontière commune `yoPublicSeoScope`, limitée à 13 fichiers explicitement revus et à une liste exacte d'imports publics. Les imports d'auth/paiements/Supabase, appels réseau, actions serveur, imports dynamiques et secrets sont refusés. Des tests négatifs vérifient ces interdictions. Aucun contrôle juridique, de paiement ou d'accès supprimé.
- `npx tsx tests/legal/safeDisclosures.test.ts` : 9 tests réussis.
- `npx tsx tests/legal/founderDecisionsAlignment.test.ts` : 11 tests réussis.
- `npx tsx tests/legal/legalLiveSyncLayout.test.ts` : 6 tests réussis.
- `npm run test:yo-seo` : réussi après le déplacement du JSON-LD, avec vérification supplémentaire des ItemList FR/EN/ES.
- `npx tsc --noEmit --incremental false` : réussi.
- `npx tsx scripts/validate_i18n.ts` : réussi, 3562 clés par locale.
- Le premier lancement du rebuild a échoué sur l'accès Docker local du bac à sable d'exécution, avant compilation. Relance avec accès à Docker local autorisé, sans utiliser de backend de production.
- Revue du diff : aucun changement API, migrations, paiements, authentification, audio, mobile ou package-lock. Aucun fichier de configuration locale livré.
- `npm run lint -- --quiet` : réussi, code de sortie 0.
- `node ../yo-seo-preview-local/app.cjs build` : réussi, code de sortie 0, compilation Next 16.2.9, TypeScript complet et génération des routes.
- `npm run test:launch-critical` : reprise complète réussie, code de sortie 0, jusqu'aux 11 assertions finales d'architecture YoPratiqo. Aucun test retiré de la commande.
- `node --import tsx tests/yo/yopratiqoSeoHttp.mjs` : réussi sur le build final redémarré; 26 variantes de présentation, huit entrées d'apprentissage, sitemap/robots 200 et route invalide 404.
- `git diff --check` : réussi.
- Journaux de cette reprise : `launch-critical-release.log`, `lint-release.log`, `build-release.log`, `http-release.log` dans le dossier local externe `../yo-seo-preview-local/`.

La livraison prévue est une reconstruction Git/Vercel de main avec les variables Production existantes, jamais la promotion de l'artefact local. Aucun secret ni variable partagée modifié. Vercel et la fusion sans conflit doivent être vérifiés sur le SHA final.

## Fichiers

- Catalogue/SEO : `lib/yo/publicCatalog.ts`, `lib/yo/yopratiqoSeo.ts`, `lib/yo/yopratiqoLandingContent.ts`, `lib/seo/config.ts`, `app/sitemap.ts`.
- Présentations : `app/yo/page.tsx`, `app/yo/langues/page.tsx`, les pages allemand, anglais, espagnol, français-québec, italien, japonais, mandarin et portugais-brésil.
- Composants : `YoLanguageQuickStart`, `YoLanguageLandingPage`, nouveaux `YoCourseOverview` et `YoDocumentLanguage`.
- Tests : nouveaux SeoCatalog/SeoHttp; adaptations SeoMetadata, AllLanguageIntrosConsistency, DesktopWorkspaceContract, FrenchQuebecIntro, InformationArchitecture, LanguageCatalogAppShell, LanguageSelection, PortugueseCourse, WorldclassLearningShellVisual.
- `package.json` : ajoute SeoCatalog à la commande test:yo-seo; aucune dépendance nouvelle.
- Gardes de livraison : `tests/helpers/yoPublicSeoScope.ts`, `tests/legal/safeDisclosures.test.ts`, `tests/legal/founderDecisionsAlignment.test.ts`.
- Ce rapport. Les lanceurs/logs/captures locaux restent hors du dépôt.

## Limites et rollback

- Pas de vérification Search Console, d'indexation effective, de classement ou de citation par un moteur de réponse. Aucun de ces résultats n'est garanti.
- Pas de vraie traduction ES des anciens contenus FR/EN. Aucune traduction fictive annoncée dans hreflang.
- Racine HTML SSR encore FR, langues de sous-arbres correctes; voir politique ci-dessus.
- Les anciens gardes de PR nécessitent un nettoyage de périmètre indépendant avant de réclamer une passe exhaustive verte; aucune règle supprimée ici.
- Les ressources Stripe, les données utilisateurs, les enregistrements vocaux et les cours ne nécessitent aucune migration ni régénération.
- Rollback applicatif : revenir au commit de base ou retirer uniquement ce diff. Aucun retour arrière de données, aucune suppression de progression. Allemand/PT retrouvent alors leurs redirections, Mandarin perd sa nouvelle présentation mais conserve son parcours.
- Autorisation de livraison obtenue le 4 novembre : vérifier la Preview, puis les GET publics après déploiement. Soumettre les pages canoniques dans Search Console reste une action externe distincte.
