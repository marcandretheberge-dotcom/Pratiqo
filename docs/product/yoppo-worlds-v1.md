# YoPratiqo — Mondes, villes et missions (pilote italien)

## Contrat pédagogique

- **Univers = langue.** Le parcours italien réutilise les 12 unités A1 existantes.
- **Monde = quatre villes.** Trois mondes donnent une progression narrative. La ville est le module évalué (`u01` à `u12`); ses leçons sont les missions sur le chemin.
- **Compétence avant récompense.** Le tampon de ville dépend exclusivement d'un bilan réussi sans aide, avec le seuil propre à l'évaluation. Regarder une scène ou visiter une étape ne valide jamais une compétence.
- **Yoppo Pass du monde : dérivé, non monétaire.** Visuellement acquis lorsque les quatre villes du monde sont validées indépendamment. Il n'y a ni wallet, ni dépense, ni nouveau droit d'accès et aucun lien avec les crédits Pratiqo.
- **Navigation.** Les destinations réellement déverrouillées proviennent de `buildCourseJourney`. L'évaluation de placement peut autoriser la révision d'une ville antérieure, sans attribuer de récompense. Les données de progression et les identifiants pédagogiques existants restent intacts.
- **Culture.** Les noms des villes dessinent un itinéraire narratif; ils n'affirment pas que chaque unité couvre déjà cette ville en profondeur. La rédaction culturelle propre à chaque ville doit être validée avant des animations dédiées.

## Expérience livrée dans cette branche

1. Un navigateur de trois mondes montre les villes disponibles, validées et verrouillées dans le parcours italien guidé.
2. Chaque mission commence par une introduction de vocabulaire. Les missions du module d'accueil utilisent la préparation visuelle; les autres affichent une sélection de huit expressions maximum avant la scène. La liste complète reste dans le carnet imprimable.
3. Une préparation visuelle présente tous ses mots puis propose au maximum trois questions de rappel **uniques**. Les révisions espacées sont conservées dans le moteur d'apprentissage existant.
4. Le doublon « préparation visuelle puis longue liste des mêmes mots » est supprimé. Les brouillons d'interface v2, leurs index et leurs identifiants sont conservés. Le nouvel ordre d'affichage passe directement à la suite si un ancien brouillon était arrêté sur la page de vocabulaire redondante.
5. La fiche imprimable fournit le vocabulaire et les objectifs; le résultat du défi montre les compétences travaillées et encourage la révision. La fiche ne prétend pas certifier des résultats personnels.
6. Aucune modification à Stripe, aux paiements, aux comptes, aux récompenses financières, aux certifications ou à la base de données.

## Critères de validation manuelle

- Nouveau joueur, téléphone : trois écrans de visite de Yoppo (passables), puis une seule action principale pour commencer.
- Bologna : mots + audio, trois questions distinctes, puis scène, explication, sons et exercices; pas de deuxième longue liste des mêmes mots.
- Plus tard (u02, etc.) : huit expressions maximum avant la scène; accès au carnet complet.
- Reprendre un brouillon v2 : même activité ou étape suivante sans vocabulaire redondant, et aucun tampon/point dupliqué.
- Terminer une ville sans aide : tampon, résumé des acquis, fiche imprimable et ville suivante ouverte.
- Réussite avec indice : aucun nouveau tampon ni Pass.
- Terminer les quatre villes d'un monde : Pass visuel obtenu et monde suivant accessible via les règles normales du parcours.
- Parcours placé à un niveau avancé : accès à la ville autorisée sans inventer les succès des mondes précédents.
- FR / EN / ES : textes, liens, états verrouillés et navigation sur mobile/desktop.
- Tester navigation par clavier, lecteurs d'écran, réduction d'animation et audio inactif.

## Phase suivante — flûte des horizons (NON livrée)

Une flûte rare pourra ouvrir un portail vers un autre monde, dans l'esprit des passages secrets des jeux d'aventure, avec un design, des musiques et des animations **originaux**. Conditions avant activation :

1. Définir provenance, rareté, possibilité de replay et propriété d'un objet.
2. Un passage magique n'accorde pas automatiquement de maîtrise ou de tampons.
3. Pour sauter des prérequis pédagogiques, imposer un défi de placement adapté, sans demander de données personnelles supplémentaires.
4. Si l'objet devient consommable, conserver et contrôler ses usages côté serveur avec transactions et anti-rejeu; ne jamais se fonder sur `localStorage` pour des droits.
5. Ne pas rendre un cours déjà terminé inaccessible faute de Pass et ne pas mélanger Pass pédagogique, crédits payés ou commission marketplace.
6. Ajouter scènes de voyage, checkpoint trivia, boss et sons via progression versionnée et tests automatisés avant tout déploiement.

Une réalisation ultérieure pourra réutiliser ce modèle de monde dans les parcours japonais, français, espagnol, portugais, allemand et mandarin, sans remplacer les contenus linguistiques existants.
