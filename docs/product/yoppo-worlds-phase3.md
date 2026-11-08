# YoPratiqo — Phase 3 : atlas immersifs, arrivée de Yoppo et portes de boss

## Parcours italien pilote

Cette phase apporte des scènes illustrées originales au parcours existant (trois mondes, douze villes). **Aucune nouvelle source de vérité pédagogique** n'est créée :

- Le monde est tiré de `projectItalianWorlds(buildCourseJourney(...))`.
- Les quatre villes affichées par atlas proviennent des identifiants `u01` à `u12`; une ville verrouillée reste non cliquable.
- Le passage entre mondes et la flûte restent régis par les évaluations indépendantes du parcours.
- Les cartes illustrent les destinations avec un chemin sinueux, un décor propre à chaque monde, des étapes ouvertes et fermées et Yoppo à l'étape actuelle.
- Chaque ville affiche une courte scène originale d'arrivée de Yoppo, **non bloquante** et sans audio automatique.
- Le défi final existant se présente comme une porte de château. La scène de victoire n'apparaît **qu'après le résultat indépendant du défi actuel**; elle n'attribue aucun point ni aucun tampon.
- Pendant les cinq questions du boss, une jauge de **pierres de savoir** s'allume uniquement selon les réponses réellement enregistrées dans la manche. L'écran rappelle le seuil de réussite et signale clairement si une aide a été utilisée. Aucun exercice supplémentaire ni point fictif.

## Choix de conception

- **Performance :** éléments SVG + CSS locaux, aucune API vidéo, image externe ou autre dépendance réseau introduite pour les scènes.
- **Accessibilité :** les quatre destinations conservent des liens HTML accessibles, des libellés FR/EN/ES, des zones tactiles larges et des états verrouillés descriptifs. La narration de l'arrivée et du boss reste accessible sans son.
- **Mouvement :** animations brèves à l'ouverture de la carte et après une réussite, sans attente imposée. `prefers-reduced-motion` désactive les effets.
- **Propriété intellectuelle :** illustration, silhouettes et animations originales; pas de sprite, château, audio ou carte provenant d'un jeu existant.
- **Pédagogie :** la porte de boss met en scène la mission finale déjà présente. Elle ne remplace ni le questionnaire, ni sa règle de validation sans aide.

## QA et critères d'acceptation

1. Contrôle des trois cartes en FR/EN/ES, sur téléphone (320, 375, 390, 430 px), tablette et ordinateur; aucun débordement horizontal de la page.
2. Joueur neuf : une seule ville réellement accessible; les trois suivantes restent verrouillées et impossibles à ouvrir.
3. Après quatre évaluations indépendantes réussies : quatre villes marquées maîtrisées, porte du monde ouverte; le monde suivant reste régi par ses vrais prérequis.
4. Yoppo apparaît au bon endroit dans chacune des douze villes, sans interrompre le bouton principal « Continuer ma mission ».
5. La porte de boss ne change aucune réponse, aucun score ni aucune disponibilité du défi. Un résultat échoué ou assisté ne déclenche pas la scène de victoire. La jauge reflète fidèlement les bonnes réponses sans récompenser un apprenant sur une simple animation.
6. Audio activé/désactivé, navigation clavier, lecteur d'écran et réduction des mouvements fonctionnels.
7. Tests : TypeScript, test de rendu des trois mondes/douze villes, suite italienne guidée, ESLint et `git diff --check`.

La première livraison reste une **prévisualisation non déployée en production**. Les éventuelles vidéos cinématiques de voyage plus longues, le système de flûte consommable et les cartes des autres langues restent des travaux séparés.
