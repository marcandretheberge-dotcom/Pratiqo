# YoPratiqo — Phase 4 : douze identités de villes italiennes

## Intention

La phase 3 introduisait trois mondes et douze villes, mais réutilisait un décor de ville très similaire à chaque escale. La phase 4 transforme les villes en destinations visuelles reconnaissables, sans prétendre remplacer les cours ou ajouter des objectifs de maîtrise.

### Identité artistique de chaque ville

| Module | Ville | Motif illustré |
|---|---|---|
| u01 | Bologna | Portiques |
| u02 | Parma | Baptistère |
| u03 | Modena | Clocher |
| u04 | Verona | Arènes |
| u05 | Napoli | Vésuve et baie |
| u06 | Firenze | Dôme |
| u07 | Siena | Piazza del Campo |
| u08 | Venezia | Canal et embarcation |
| u09 | Genova | Lanterne (phare) |
| u10 | Torino | Mole Antonelliana |
| u11 | Roma | Colisée |
| u12 | Palermo | Palais arabo-normands |

Chaque ville possède une palette propre (ciel, édifices, toits, accent, eau, terrain), une silhouette SVG originale et un court libellé culturel FR/EN/ES. Le libellé constitue **l'inspiration de l'illustration**, pas une affirmation que la leçon du module couvre déjà ce monument.

La même scène est réutilisée sans téléchargement additionnel dans l'atlas (vignette décorative) et dans le panneau d'arrivée de Yoppo (illustration avec description accessible). La grille conserve ses liens et ses états verrouillés : aucune ville cachée ne devient cliquable.

La même illustration devient aussi la **carte postale de ville sur le bilan imprimable**. Le visuel reste décoratif : le tampon et les compétences affichés proviennent exclusivement des résultats évalués.

## Contraintes non négociables

- Les modules conservent les identifiants `u01` à `u12`. Le parcours, le score, la médaille Trivia, le tampon de ville et le Yoppo Pass ne changent pas.
- Les 12 silhouettes ne chargent aucune image externe, vidéo, police ou API supplémentaire. Tout est statique, original et intégré aux composants React.
- Les vignettes répétées dans l'atlas sont `aria-hidden`; l'illustration d'arrivée est décrite dans la langue choisie.
- Les textes doivent tenir sur 320 à 430 px; les boutons « Continuer ma mission » restent prioritaires.
- Pas de son automatique, pas d'animation d'attente obligatoire. L'animation existante respecte `prefers-reduced-motion`.
- Ne pas confondre ces paysages inspirés de villes réelles avec des reproductions de monuments sous licence.
- Aucun changement à Stripe, Supabase, wallets, achats, crédits ou certificats.

## Critères de QA

1. Douze identités distinctes et reliées à exactement douze villes; aucun doublon de silhouette ou de nom.
2. Chaque illustration possède un libellé culturel FR, EN, ES non vide.
3. Tout atlas conserve exactement quatre escales; un nouveau joueur n'a toujours accès qu'à Bologna.
4. Après quatre défis finaux indépendants réussis, les quatre villes du premier monde sont accessibles et sa porte reste ouverte.
5. Les scènes d'arrivée des douze villes sont visibles sans erreurs d'image; les vignettes SVG ne dupliquent pas les annonces pour lecteur d'écran.
6. Aucune régression de la phase 3 : arrivée, boss, jauge de pierres, victoire de boss et réduction du mouvement.
7. Contrôles automatisés : `npx tsc --noEmit`, 12 villes en 3 langues, tests phase 3, régressions italiennes, ESLint ciblé et diff.

Cette branche est empilée sur la phase 3. Elle reste en **PR brouillon sans déploiement production**, notamment pendant le blocage de quota de construction Vercel.

## Refonte de l'atlas après revue visuelle mobile

Le retour utilisateur sur la prévisualisation montrait un **tableau de quatre grandes cartes opaque**, presque entièrement superposé au paysage. Les décorations n'offraient ni chemin perceptible, ni sentiment de progression. Cette composition n'est pas acceptable comme expérience de jeu.

### Contrat d'expérience modifié

- **Une vraie route verticale qui serpente** à travers chaque monde, entièrement visible entre les escales; la progression se lit naturellement du haut vers le bas sur mobile.
- **Quatre petits jetons de destination illustrés**, décalés le long de la route, remplacent les grandes cartes 2×2. Les silhouettes culturelles uniques de chaque ville sont réutilisées, en miniature.
- **Yoppo suit la prochaine ville réellement accessible et non maîtrisée**, même si l'élève revoit une ancienne unité. Le jeton de destination à jouer porte une lueur et une animation douce; les deux effets s'arrêtent en réduction des animations.
- **Château du monde dessiné dans le paysage** : ses portes ne s'ouvrent visuellement qu'avec quatre évaluations indépendantes réussies. Les droits restent ceux du moteur de progression d'origine.
- **Trois ambiances** : premiers pas en forêt lumineuse, vie italienne en bord de mer, indépendance dans un crépuscule montagneux. Ciels, végétation, rivière, marché, pont, route et château sont dessinés en SVG originaux.
- **Une seule action claire par ville accessible** : toucher son jeton pour accéder aux missions existantes. Une ville verrouillée reste visible, mais ne devient jamais un lien. Le bouton principal « Continuer ma mission » de la page reste au-dessus de cette carte.
- **Navigateur allégé** : trois petits onglets de mondes, le titre de monde et la progression au sein du paysage. Les panneaux de texte répétitifs sont supprimés.

### Vérifications supplémentaires

- Contrôler le placement à 320, 375, 390 et 430 px : la première destination ne doit pas recouvrir la bannière, les escales ne doivent pas se toucher, le chemin et le château doivent rester lisibles.
- `data-yoppo-map-token` : exactement quatre escales; `data-yoppo-world-cities` : monde actif; aucun lien vers les villes verrouillées, aucune création de maîtrise, de Pass, de crédit ou de droit.
- Ambiance et mouvement : gradients et ombres sobres dans la page mais **carte lumineuse et ludique**; aucune animation bloquante, aucune musique auto-jouée, réduction du mouvement respectée.
- FR/EN/ES, navigation clavier, lecteur d'écran, état « prochaine mission », maîtrise des 4 villes, flûte et bouton de reprise.

Cette refonte reste sur la PR #446 et attend la validation visuelle de sa nouvelle prévisualisation. Elle ne peut être fusionnée en production par les tests seuls.
