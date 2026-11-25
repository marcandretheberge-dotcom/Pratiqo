# Continuité locale des introductions

## Portée

Ce lot synchronise les sept introductions qui utilisent `SharedIntro` : anglais,
espagnol, français québécois, allemand, portugais brésilien, japonais et mandarin.
Il repose sur `bc54a7f56940ba0817f479f32bc044d85da633d6`, la version de PR #485
déployée en production. Il ne modifie pas le contrat des joueurs italiens.

Les données restent dans le navigateur. Les clés historiques
`yo.shared-intro.v1.<langue>` et les résultats valides sont conservés. Une section
`sync` versionnée ajoute les générations d’essai, la révision du contenu et les
marqueurs nécessaires pour fusionner les changements de plusieurs onglets.
Aucun service, microphone, transcription, paiement ou droit d’accès n’est ajouté.

## Comportements garantis par les tests

- Des activités distinctes modifiées dans deux onglets sont conservées. Un onglet
  déjà dans un exercice garde son écran ; il ne saute pas vers celui de l’autre.
- L’aide effectivement consultée, une erreur et un résultat déjà vérifié sont
  repris sans nouvelle notation ni nouvel événement de révision espacée. L’aide
  reste attachée à l’essai, même après changement d’écran ou de langue d’interface.
- Une vérification relit le stockage actuel. Si les mots ont changé dans l’autre
  onglet, l’écran reprend ces mots et demande une nouvelle vérification. Un même
  résultat déjà accepté ne peut pas être soumis une seconde fois par l’ancien écran.
- « Recommencer sans aide » ouvre volontairement un nouvel essai pour cet exercice.
  Ce choix ne retire pas les résultats historiques des exercices terminés.
- Un nouveau défi final invalide les callbacks de l’ancien essai. Une révision du
  contenu invalide ses réponses finales inachevées et ses brouillons ; le meilleur
  résultat historique reste conservé. Un ancien onglet ne peut pas réécrire le
  nouveau contenu après avoir observé sa révision. Un message distinct lui propose
  d’actualiser la leçon ; il ne présente pas ce cas comme une panne de sauvegarde.
- Une suppression réelle de la clé du cours crée un marqueur de remise à zéro.
  Les écrans précédents ne peuvent pas réintroduire le cours supprimé. Un événement
  `storage` retardé est traité d’après le stockage actuel ; un événement provenant
  de `sessionStorage` ne remet pas le cours à zéro.
- L’hydratation et les événements de stockage ne déclenchent ni récompense,
  notation, point d’apprentissage ou événement SRS. Si le stockage est indisponible,
  la session continue en mémoire et affiche que la sauvegarde est indisponible.

Le stockage local n’est pas une synchronisation de compte entre appareils. La
suppression de la clé d’introduction ne supprime pas le journal SRS indépendant.

## Vérifications

Les suites ciblées sont :

```sh
node --import tsx tests/yo/yopratiqoIntroSync.test.ts
node --import tsx tests/yo/yopratiqoIntroSyncPlayer.test.tsx
```

Elles couvrent respectivement 18 cas de stockage et 8 scénarios avec les véritables
composants. Les parcours historiques et les tests d’onboarding restent inchangés.

Le workflow `yo-onboarding-journal.yml` ajoute un scénario navigateur mobile de
320 px dans sa matrice Chromium sur Ubuntu et WebKit sur macOS :

```sh
node --import tsx scripts/prepare_yo_shared_review.ts
# Utiliser le serveur de revue existant sur http://127.0.0.1:3246.
python tests/yo/yopratiqoIntroSync.browser.py
```

Deux pages du même contexte ouvrent une introduction anglaise inachevée. La seule
fixture contient un profil et un curseur ; aucune réponse, visite, réussite, note
ou révision n’est préremplie. Les modifications, l’ouverture du carnet d’aide, les
vérifications et la continuation passent par les commandes réelles. Pour reproduire
un onglet suspendu de manière déterministe, le test retarde ses notifications
`storage` et `focus` ; le vrai `localStorage` reste partagé et le code du joueur
n’est pas remplacé. Les deux onglets sont ensuite rechargés après une suppression
réelle de la clé du cours.

Les requêtes d’API et hors origine sont bloquées et font échouer ce scénario. Aucun
microphone, synthèse vocale ou audio de leçon n’est demandé ; les cinématiques
locales se ferment par leur vrai bouton « Skip ». Le test produit des captures et
un résumé JSON dans les artefacts du workflow. Il vérifie la concurrence sur ce
scénario écrit ; il ne prétend pas rejouer toutes les activités des sept langues
ni valider l’audio. Une validation statique locale ne constitue pas une exécution
réussie des navigateurs : le résultat réel est celui des jobs CI de la révision publiée.
