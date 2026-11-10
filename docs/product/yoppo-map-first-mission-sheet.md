# YoPratiqo — expérience « carte d'abord » et mission en fenêtre

## Retour utilisateur (captures iPhone, 9 novembre 2026)

L'entrée italienne montrait auparavant un tutoriel en grand panneau, un bilan en
colonne, une illustration d'arrivée, une liste verticale de missions avec
checkpoint et défi final, un second bouton principal et **la carte sous tout ce
contenu**. Le monde semblait être une section secondaire au lieu d'être le jeu.

## Contrat d'expérience

1. **La carte illustrée est l'écran principal.** Les trois mondes se choisissent
   avec de petits repères intégrés au décor; chaque monde contient toujours ses
   quatre villes et son château. La carte conserve ses données de réussite
   canoniques; les villes verrouillées ne deviennent jamais cliquables.
2. **Yoppo guide** le joueur jusqu'au prochain arrêt réellement accessible.
   L'arrivée visuelle est courte, originale et désactivée pour les utilisateurs
   préférant réduire le mouvement. L'indication initiale est une petite bulle
   sur la carte, dismissible, et non un tutoriel en plusieurs panneaux.
3. **Une action principale par ville :** toucher la destination active
   pour commencer ou reprendre les missions. Le libellé accessible de l'action
   est localisé en FR/EN/ES. Les autres villes accessibles restent navigables.
4. **Une mission = une fenêtre / feuille mobile.** Le fond conserve exactement
   la carte montée, visible au travers d'un voile. L'ouverture présente les
   objectifs de la mission et une seule action pour commencer. Les exercices,
   l'épreuve finale et le résultat restent dans la même feuille; la carte ne
   disparaît jamais. Sur écran large, la feuille se centre.
5. Le bouton de fermeture, l'échappement et le retour à la carte conservent
   les brouillons et le cours déjà enregistré. Une mission reprise ne réaffiche
   pas inutilement le briefing.
6. Le carnet de mots est disponible depuis la fenêtre, sans laisser l'élève
   quitter le jeu. Le checkpoint Trivia reste facultatif et s'ouvre lui aussi
   dans une fenêtre, seulement après le vrai seuil de missions.
7. Le vieux bloc de « Prochaine mission », la liste verticale complète, les
   explications sur les tampons répétées, le second bouton mobile et le grand
   tutoriel sont **retirés de la page principale**. Les règles et récompenses
   restent consultables dans les outils.

## Préservation des règles

- Pas de changement des IDs de villes, leçons, étapes, quiz, points ou Passes.
- Les fonctions de progression, de validation, de reprises de brouillon et
  d'attribution des tampons restent les fonctions existantes.
- La nouvelle animation, les panneaux et la sélection du monde ne valident
  aucune étape à la place de l'élève.
- Pas de changement de production, Stripe, Supabase ou données payantes.

## Révision avant fusion

- iPhone Safari, Android et desktop : ouverture, navigation dans un cours
  entier, fermeture, reprise, formulaire de retour, rotation et safe area.
- FR/EN/ES, lecteur d'écran (nom des boutons, titre des dialogues et focus),
  contraste, tailles de police, réduction de mouvement.
- Déblocage réel après le défi final, retour au monde depuis le résultat,
  checkpoint Trivia après la moitié des missions, flûte après quatre villes.
- Vérifier que l'ancienne prévisualisation Vercel ne soit pas confondue
  avec le nouvel exact commit. Une limite Vercel peut bloquer l'aperçu.
- Les tests GitHub attestent le comportement simulé, pas un test visuel réel.

Cette révision appartient à la PR #446 basée sur #445 et doit rester en
brouillon jusqu'à sa revue esthétique et fonctionnelle.


## Correctif du 9 novembre — ordinateur et fiches imprimables

### Carte sans déformation sur ordinateur

Le rendu initial étirait le dessin vertical de `480 × 840` dans un conteneur
horizontal. Cela déformait les arbres, les bâtiments, le chemin et l'échelle des
villes; il n'était pas satisfaisant sur ordinateur.

- Téléphone/tablette : décor portrait original **480 × 840**, `aspect-[4/7]`.
- Ordinateur (≥ 1024 px) : **nouvelle composition dessinée séparément**
  **960 × 640**, `lg:aspect-[3/2]`, avec chemin et quatre arrêts correspondants.
- SVG `preserveAspectRatio="xMidYMid meet"` sur les deux compositions :
  aucun écrasement/étirement non uniforme.
- Le plateau se centre et s'ajuste en largeur selon la hauteur du navigateur;
  les repères, le château et les villes restent sur le plateau, sans modifier
  les permissions.
- Contrôler en vrai sur 375 × 812, 390 × 844, 430 × 932, 1024 × 768,
  1440 × 760 et 1920 × 1080. Les tests statiques assurent la géométrie, mais
  ne remplacent pas une validation visuelle sur Safari/Chrome.

### « Mes fiches » retrouvées

- Un seul bouton **Mes fiches** dans la barre supérieure ouvre, depuis la carte
  ou une mission, deux **vraies pages imprimables**, en FR/EN/ES :
  1. **Fiche de vocabulaire** : `/yo/langues/italien/parcours/[unitId]/vocabulaire`,
     accessible dès l'arrivée;
  2. **Bilan de voyage** : `/yo/langues/italien/parcours/[unitId]/bilan`,
     consultable à tout moment et affichant uniquement les acquis réels,
     sans prétendre qu'un tampon a été gagné avant la réussite.
- La fiche de vocabulaire est aussi proposée dans le briefing d'une nouvelle
  mission; les deux liens restent présents après réussite du défi final.
- Imprimer / enregistrer en PDF se fait **sur la page de destination**,
  pas au moyen de faux fichiers à télécharger.
- **Sécurité pédagogique :** ouvrir les supports durant un exercice inachevé
  marque cet exercice comme aidé; le bouton est désactivé pendant le défi final.
- Aucun changement de crédit, de Pass, de tampons ou de progression financière.
