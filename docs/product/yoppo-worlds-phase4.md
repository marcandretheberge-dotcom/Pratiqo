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
