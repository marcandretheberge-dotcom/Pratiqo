# Module 2 — arrivée, taxi et hôtel : revue de la leçon

## État de cette version

Les deux dialogues existants du Module 2 accueillent une activité en quatre étapes : écouter, comprendre, lire, parler. Les identifiants des écrans et la navigation du module sont conservés.

Cette version est une **prévisualisation avec audio en préparation**. Les deux scènes ont `audioReady: false`. Aucun fichier audio n'a été généré et l'interface ne demande aucun des fichiers prévus. Le texte, les questions et la pratique orale autonome sont utilisables. La compréhension *orale* réelle reste à vérifier après production et écoute des enregistrements.

## Contenu pédagogique

| Scène | Dialogue | Compréhension | Mise en situation |
| --- | --- | --- | --- |
| Aéroport | 5 répliques, trouver un taxi | Localiser les taxis : dehors, à droite | Saluer et demander un taxi ; remercier et montrer son hôtel ; prendre congé |
| Hôtel | 8 répliques, réception | Identifier le document demandé et la chambre 204 | Confirmer la réservation ; donner un nom ; présenter le passeport ; demander de répéter ; remercier et demander le wifi |

La réplique supplémentaire « ¿Me puede repetir, por favor? » appartient seulement à la pratique. Le dialogue source reste inchangé sur ce point. Le nom Alex Martín est fictif ; la personne peut le remplacer par le nom de son choix dans la pratique. Les scènes sont fictives et ne décrivent pas le plan réel d'un aéroport.

Les consignes, retours, titres et traductions de cette activité existent en français, anglais et espagnol. Avant de choisir une réponse, les options sont en espagnol ou en chiffres ; la traduction explicative apparaît dans le retour. La transcription reste accessible à la demande, y compris lorsque l'audio est absent.

## Comportement de l'interface

- Les quatre étapes restent accessibles : aucun blocage ne dépend du son ou d'un microphone.
- La lecture du dialogue et des répliques se déclenche uniquement par une action de l'élève.
- Une seule instance audio par scène joue les extraits dans l'ordre. Les vitesses prévues sont 1 et 0,8, avec conservation de la hauteur de voix.
- Changer d'étape, masquer l'écran du carrousel, masquer l'onglet, lancer l'autre scène ou démonter le composant arrête la lecture.
- Une lecture refusée ou un fichier absent affiche une possibilité de réessayer et d'ouvrir le texte.
- Le jeu de rôle attend une confirmation explicite avant de montrer la réponse modèle. Il n'enregistre pas la voix et n'évalue pas la prononciation.
- Les réponses à ces exercices sont locales au composant ; elles ne créent pas de validation de niveau ou de certification.

## Production audio à autoriser

La première demande, adressée au moteur Starfish pour la voix publique Lucía Sabia, a été refusée par le fournisseur :

> This workspace requires Orca for public voices. Select Orca or choose another voice.

Résultat : HTTP 400, `INVALID_ARGUMENT`, sans audio produit. Aucune relance n'a été effectuée. L'outil HeyGen et la compétence Narrator exigent une nouvelle autorisation après une erreur, y compris pour changer de moteur.

La relance proposée comprend **deux prises**, l'une par rôle, avec le moteur **Orca / HeyGen Voice** (`engine: "heygen_voice"`). Chaque prise réunit les répliques ci-dessous, séparées par une pause de deux secondes, puis est découpée en extraits. Il n'est pas nécessaire de générer une seconde version lente.

| Rôle | Voix proposée | Identifiant |
| --- | --- | --- |
| Personnel | Lucía Sabia | `3a991e0f1c824228bba932cdf8b0768e` |
| Voyageur | Scholarly Sergio | `da30cca4a70f437aa89a3f1fbe9332be` |

Le catalogue n'a confirmé aucune voix de locale dominicaine. Ces voix sont des voix espagnoles de synthèse destinées à la pratique. Leur pertinence régionale et leur prononciation doivent être écoutées et revues avant toute présentation comme modèle dominicain.

### Prise 1 — personnel

| Extrait | Texte exact à prononcer |
| --- | --- |
| `airport-02.mp3` | Los taxis están afuera, a la derecha. |
| `airport-04.mp3` | Muy bien. Puede salir por esa puerta. |
| `hotel-01.mp3` | Buenas tardes. |
| `hotel-03.mp3` | ¿A nombre de quién? |
| `hotel-05.mp3` | Perfecto. ¿Tiene su pasaporte? |
| `hotel-07.mp3` | Su habitación es la doscientos cuatro. |

### Prise 2 — voyageur

| Extrait | Texte exact à prononcer |
| --- | --- |
| `airport-01.mp3` | Hola, buenos días. ¿Dónde puedo tomar un taxi? |
| `airport-03.mp3` | Perfecto, gracias. Voy a este hotel. |
| `airport-05.mp3` | Gracias, muy amable. |
| `hotel-02.mp3` | Buenas tardes. Tengo una reservación. |
| `hotel-04.mp3` | A nombre de Alex Martín. |
| `hotel-06.mp3` | Sí, aquí está. |
| `hotel-08.mp3` | Gracias. ¿Cuál es la contraseña del wifi? |
| `hotel-repeat.mp3` | ¿Me puede repetir, por favor? |

Les 14 fichiers seront servis sous `public/audio/yo/es/do/module-2/arrival-v1/`. La chambre reste affichée « 204 », mais le texte de synthèse écrit le nombre en toutes lettres pour éviter une lecture chiffre par chiffre.

## Critères avant activation du son

1. Obtenir l'autorisation de relancer les deux prises avec Orca / HeyGen Voice.
2. Conserver les prises sources et la provenance de génération, puis découper les 14 extraits.
3. Écouter chaque extrait : texte complet, voix cohérente avec le rôle, nombre 204 correctement prononcé, absence de coupure ou de silence excessif.
4. Reconstituer les deux dialogues et les huit échanges de pratique ; vérifier leur enchaînement au débit normal et ralenti.
5. Vérifier la disponibilité de chaque fichier sur l'aperçu, puis le comportement réel sur téléphone, y compris lecture bloquée et interruption de navigation.
6. Passer `audioReady` à `true` uniquement pour les scènes dont tous les fichiers ont été vérifiés.
7. Garder explicite le statut de voix de synthèse et terminer la revue de l'espagnol dominicain avant une revendication régionale.
8. Faire revoir l'aperçu avant toute mise en production.

## Vérification automatisée ciblée

`npm run test:yo-arrival-listening` lance les contrôles des données et les interactions rendues.

Les contrôles de données valident les références des répliques, les traductions des consignes, les réponses des questions, les 14 chemins distincts et la séparation entre dialogue et phrase de pratique. Dès qu'une scène devient prête, le test exige l'existence de ses fichiers audio non vides.

Les tests d'interaction couvrent l'état sans audio, les révélations de texte, les questions, la pratique, les deux vitesses, les erreurs de lecture, les interruptions et l'invalidation des demandes de réessai. Les cas de lecture utilisent une scène prête simulée et un lecteur simulé : ils ne remplacent pas l'écoute des futurs fichiers ni les essais sur appareil.

Cette note décrit le périmètre de validation. La description de la demande de fusion consigne les commandes effectivement exécutées et leurs résultats.

