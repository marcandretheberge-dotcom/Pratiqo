# Module 2 — arrivée, taxi et hôtel : revue de la leçon et de l'audio

## État de l'aperçu

Les deux dialogues du Module 2 suivent quatre étapes : **écouter, comprendre, lire, parler**. Les onze identifiants d'écran et la navigation du module sont conservés.

Les **14 enregistrements sont disponibles pour l'écoute dans le brouillon d'aperçu**. `audioReady: true` signifie que les fichiers sont présents et lisibles dans cette version de revue ; cela ne valide ni la prononciation, ni l'accent, ni la publication du cours. L'interface précise, dans les quatre étapes et les trois langues, que les voix de synthèse restent à valider à l'écoute.

L'écoute humaine n'a pas été effectuée : cette session ne peut pas recevoir d'entrée audio perceptuelle. Les contrôles effectués portent sur le décodage, les coupures, les mesures du signal et une transcription automatique indépendante. **La revue humaine reste ouverte et obligatoire avant toute mise en production.**

Cette distinction remplace l'ancien état « audio en préparation » : on rend les candidats accessibles pour leur revue, sans déclarer terminés les critères d'écoute qui figuraient avant l'activation dans la première version de cette note.

## Contenu pédagogique

| Scène | Dialogue | Compréhension | Mise en situation |
| --- | --- | --- | --- |
| Aéroport | 5 répliques, trouver un taxi | Localiser les taxis : dehors, à droite | Saluer et demander un taxi ; remercier et montrer son hôtel ; prendre congé |
| Hôtel | 8 répliques, réception | Identifier le passeport et la chambre 204 | Confirmer la réservation ; donner un nom ; présenter le passeport ; demander de répéter ; remercier et demander le wifi |

La réplique « ¿Me puede repetir, por favor? » appartient seulement à la pratique. Alex Martín est un nom fictif que la personne peut remplacer dans le jeu de rôle. Les scènes sont fictives et ne décrivent pas le plan réel d'un aéroport.

Les consignes, titres, retours et traductions de cette activité existent en français, anglais et espagnol. Les options des questions restent en espagnol ou en chiffres avant le retour. La transcription demeure accessible à la demande. Le jeu de rôle attend une action explicite avant d'afficher le modèle ; il n'enregistre pas la voix et n'évalue pas la prononciation.

## Génération autorisée et provenance

Après le refus initial de Starfish (HTTP 400 : le compte exige Orca pour les voix publiques), l'utilisateur a autorisé le 30 octobre 2026 les **deux prises** proposées. Ces deux appels ont réussi avec `engine: "heygen_voice"` ; le fournisseur retourne l'identifiant de compatibilité `orca`.

| Prise | Voix | Répliques | Durée source décodée | Identifiant de la demande |
| --- | --- | --- | --- | --- |
| Personnel | Lucía Sabia | 6 | 23,693 s | `2bfe5c6c6d3f41f5bef71a011fa8410a` |
| Voyageur | Scholarly Sergio | 8 | 30,694 s | `4721ce13a88d4464afd3f85e58e4541a` |

Paramètres : espagnol (`es`), vitesse 1, un script SSML par rôle avec pauses de deux secondes. Aucune prise lente distincte n'est nécessaire : le lecteur gère le débit 0,8.

Les URL du fournisseur se terminent par `.wav`, mais l'inspection révèle du **MP3 mono, 44,1 kHz**. Les deux fichiers sources sont conservés **sans modification des octets**, sous des noms `.mp3` conformes à leur format réel :

- [Prise originale du personnel](audio/arrival-v1/masters/staff-original.mp3)
- [Prise originale du voyageur](audio/arrival-v1/masters/traveler-original.mp3)

Le catalogue n'a confirmé aucune voix de locale dominicaine. Ces voix espagnoles de synthèse ne sont donc pas présentées comme des modèles d'accent dominicain validés.

## Script et fichiers de lecture

Les fichiers destinés au lecteur sont sous `public/audio/yo/es/do/module-2/arrival-v1/`.

| Fichier | Rôle | Texte exact approuvé |
| --- | --- | --- |
| `airport-01.mp3` | Voyageur | Hola, buenos días. ¿Dónde puedo tomar un taxi? |
| `airport-02.mp3` | Personnel | Los taxis están afuera, a la derecha. |
| `airport-03.mp3` | Voyageur | Perfecto, gracias. Voy a este hotel. |
| `airport-04.mp3` | Personnel | Muy bien. Puede salir por esa puerta. |
| `airport-05.mp3` | Voyageur | Gracias, muy amable. |
| `hotel-01.mp3` | Personnel | Buenas tardes. |
| `hotel-02.mp3` | Voyageur | Buenas tardes. Tengo una reservación. |
| `hotel-03.mp3` | Personnel | ¿A nombre de quién? |
| `hotel-04.mp3` | Voyageur | A nombre de Alex Martín. |
| `hotel-05.mp3` | Personnel | Perfecto. ¿Tiene su pasaporte? |
| `hotel-06.mp3` | Voyageur | Sí, aquí está. |
| `hotel-07.mp3` | Personnel | Su habitación es la doscientos cuatro. |
| `hotel-08.mp3` | Voyageur | Gracias. ¿Cuál es la contraseña del wifi? |
| `hotel-repeat.mp3` | Voyageur | ¿Me puede repetir, por favor? |

L'écran affiche « 204 » ; la synthèse reçoit le nombre en toutes lettres.

## Préparation et contrôles techniques

Les repères temporels du fournisseur ont été recoupés avec l'activité réelle du signal et les estimations d'une transcription indépendante. Certains repères ne coïncident pas avec les silences : ils n'ont pas servi seuls à déterminer les coupures.

Les 14 extraits sont encodés en MP3 mono 44,1 kHz, avec une réduction uniforme de 1,5 dB, des marges conservatrices autour de la parole et de courts fondus limités aux marges. Les originaux ne sont pas modifiés.

- **488 820 octets** pour les 14 fichiers de lecture.
- **36,117 s** au total après décodage, dont environ **12,800 s** pour l'aéroport, **21,053 s** pour le dialogue d'hôtel et **2,264 s** pour la demande de répétition.
- **Aucun échantillon écrêté** après décodage des extraits.
- Pics mesurés entre **−4,17 et −1,43 dBFS**.
- Les 14 empreintes SHA-256 concordent entre les fichiers, la provenance et les résultats de transcription.

Ces mesures ne prouvent pas que le timbre, les respirations ou la prononciation sont agréables ou adaptés.

## Vérification du texte et passages à écouter

La vérification utilise `faster-whisper 1.2.1` sur CPU/int8, sans script de référence, sans prompt initial, sans mots-guides et sans repères du fournisseur transmis au moteur de reconnaissance. Le texte attendu est comparé seulement après la transcription.

Whisper base a vérifié la prise voyageur. Un contrôle ciblé avec Whisper small a clarifié les erreurs initiales du modèle base sur la prise du personnel. Les **14 extraits finaux** ont ensuite été reconnus séparément : **13 correspondent exactement après normalisation** de la ponctuation, des accents, du nombre et de « Wi-Fi ». Aucun mot initial ou final manquant n'a été détecté par cette méthode.

La chambre **204** est reconnue dans la prise complète avec small et dans l'extrait final. L'hypothèse initiale « 104 » du modèle base n'a pas été reproduite par ce contrôle.

Deux passages restent signalés pour l'écoute humaine :

1. **`airport-04.mp3` — « Puede salir ».** Le modèle small reconnaît le singulier approuvé dans la prise complète, mais « puedes salir » dans l'extrait. La variation se situe devant le « s » de `salir` et change avec le contexte de reconnaissance. Ce résultat ne suffit pas à conclure à une erreur audible, mais il interdit de déclarer 14/14 correspondances exactes.
2. **`hotel-07.mp3` — début de la phrase sur la chambre.** Un signal bref non classé, vers 18,56–19,12 s dans la source (environ 0,16–0,72 s dans l'extrait), a été conservé. Aucun mot supplémentaire n'est reconnu ; son acceptabilité sonore reste à écouter.

Une ambiguïté comparable « tiene su / tienes su » apparaît dans la prise complète, mais l'extrait final `hotel-05.mp3` est reconnu avec le texte approuvé. Les deux hypothèses sont conservées dans les preuves, sans réécriture des résultats.

## Lecture et tests

Le lecteur déclenche les enregistrements sur action de l'élève, dans l'ordre du dialogue, au débit normal ou 0,8. Il interrompt la lecture sur changement d'étape, d'écran ou d'onglet, au lancement de l'autre scène et au démontage. Les erreurs proposent de réessayer ou de lire la transcription.

Les tests rendus conservent des cas sans audio en fixant explicitement cet état dans leurs données de test, même lorsque les enregistrements réels sont disponibles. Ils restaurent les valeurs d'origine après la suite. Les gardes de périmètre autorisent seulement les 14 chemins publics et les deux prises sources nommées ci-dessus.

La description du brouillon GitHub consigne les commandes effectivement exécutées, les résultats des tests et les vérifications HTTP/navigateur de l'aperçu. Les simulations du lecteur ne remplacent ni les essais avec les fichiers réels ni l'écoute humaine.

## Critères encore ouverts avant publication

- [ ] Écouter les deux dialogues et la demande de répétition, au débit normal et ralenti.
- [ ] Examiner les deux passages signalés ci-dessus et décider si une nouvelle prise est nécessaire.
- [ ] Valider la clarté, la prononciation, le naturel et la cohérence des rôles.
- [ ] Effectuer la revue régionale avant toute revendication d'accent dominicain.
- [ ] Vérifier le comportement réel sur téléphone, dont les interruptions et les erreurs de lecture.
- [ ] Faire approuver l'aperçu avant fusion et mise en production.

Une nouvelle synthèse éventuelle nécessite l'autorisation correspondante ; les deux prises autorisées sont conservées.

## Dossier de preuves

- [Scripts soumis, paramètres et réponses originales du fournisseur](audio/arrival-v1/generation.json)
- [Coupures exactes, empreintes, mesures et remarques](audio/arrival-v1/clip-provenance.json)
- [Transcriptions indépendantes complètes et par extrait](audio/arrival-v1/asr-verification.json)
