# YoPratiqo — pratique vocale avec Yoppo

État de préparation : **24 novembre 2026**. L’implémentation et ses tests locaux sont prêts. **Aucune migration de cette fonctionnalité n’a été appliquée en production par l’agent d’implémentation. Aucun appel vocal OpenAI réel n’a été effectué : la clé `OPENAI_API_KEY` était absente.** Le responsable de la mise en production doit consigner ci-dessous l’application effective de la migration et la QA en ligne; ces étapes ne sont pas réputées réussies par les tests simulés.

## Expérience proposée

Le panneau « Parle avec Yoppo » ouvre une conversation courte, liée à une scène de cours. L’apprenant parle pendant quinze secondes maximum. Yoppo répond avec une voix générée par IA, puis propose, quand cela est fiable, un conseil sur les mots, la grammaire ou le sens. La scène reste dans son contexte : présentation, café, directions, hôtel ou travail. La voix ne valide pas un examen final, ne complète pas une leçon et n’attribue ni XP ni Pass.

Les huit cibles sont explicites dans le catalogue : italien d’Italie, japonais poli, espagnol latino-américain neutre (`es-419`), français québécois, anglais canadien, allemand standard, portugais du Brésil et mandarin avec caractères simplifiés. L’espagnol suit le contexte de la scène sans imposer de pays ni d’argot régional, ce qui convient à l’introduction à Montevideo comme aux exercices dominicains. Ces consignes ne garantissent pas un accent natif ou un dialecte particulier. L’interface et les explications existent en français, anglais et espagnol.

La transcription est présentée comme approximative. Le retour ne prétend pas mesurer les phonèmes, les tons, l’accent ou la prononciation. **Aucun score phonétique ou de prononciation n’est inventé.** Une correction doit reprendre un extrait normalisé non vide réellement présent dans la transcription; un extrait absent ou constitué uniquement de ponctuation est refusé. Si une réponse de conseil dépasse son plafond ou ne respecte pas le format, la conversation peut être fournie sans conseil inventé.

## Consentement, données et arrêt

Ouvrir le panneau ne lance pas le microphone. Le navigateur doit obtenir séparément une case de consentement cochée puis un clic sur « À toi de parler ». Le texte précise que la voix est envoyée à OpenAI et que Pratiqo ne conserve pas l’enregistrement. La voix de Yoppo est identifiée comme générée par IA. Les règles de conservation du fournisseur ne sont pas présentées comme celles de Pratiqo.

Une deuxième case, décochée par défaut, permet de sauvegarder les courtes phrases corrigées. Pratiqo conserve alors seulement la phrase corrigée, un court indice, les langues et l’état de révision. Les enregistrements, la transcription complète et l’historique de conversation ne sont pas écrits en base. La conversation récente reste en mémoire du panneau, sans sauvegarde locale persistante.

Fermer le panneau, quitter l’étape, changer de compte, masquer la page, cacher un ancêtre de cours avec `hidden`, `inert` ou `aria-hidden`, ouvrir le cinéma ou émettre l’événement d’arrêt coupe la capture, les requêtes vocales du client et la lecture. Un résultat tardif du compte précédent est ignoré. Un ancien `getSession()` qui se résout après un changement de compte ne peut pas restaurer l’ancien propriétaire. Les lectures de leçon et de cinéma sont coordonnées par les événements média existants.

Le navigateur n’obtient aucune clé OpenAI et aucun jeton de session Realtime ouvert. Le serveur contrôle une connexion WebSocket neuve par échange et la ferme à la fin ou à l’expiration. La reconnaissance vocale du navigateur n’est pas utilisée comme substitut.

## Budget strict du pilote : 50 × 0,20 USD

Le budget est indépendant de la mémoire d’une fonction serveur et de toute valeur envoyée par le client. La migration crée une ligne de budget verrouillée pendant les réservations. Les montants sont des entiers en microdollars USD.

| Règle | Valeur imposée |
| --- | --- |
| Plafond global du pilote vocal | 10 000 000 microUSD = **10 USD** |
| Réservation par tentative fournisseur | 200 000 microUSD = **0,20 USD** |
| Nombre maximal de réservations | **50**, tous comptes et instances serveur confondus |
| Réservation par compte | 30 secondes par échange, maximum 300 secondes, soit 10 échanges |
| Concurrence par compte | Un échange en cours |
| Départs par compte | Trois au maximum sur une minute |
| Audio entrant | PCM16 mono, 24 kHz, quinze secondes maximum |
| Réponses du fournisseur | Une réponse vocale + un conseil texte séparé |
| Plafond par réponse | 256 jetons, raisonnement `minimal`, aucun outil |
| Expiration du fournisseur | 42 secondes |

**Les réservations ne sont jamais remboursées automatiquement**, y compris après une erreur, un abandon, une expiration, une fin de traitement incertaine ou la suppression d’un compte. Le compteur global ne dépend pas de la conservation des lignes de l’utilisateur. Une répétition du même identifiant de requête ne relance pas OpenAI. Une base indisponible, une migration absente ou un refus de réservation empêche l’appel fournisseur.

Aux tarifs officiels vérifiés le 24 novembre 2026, la borne conservatrice d’un échange est **155 173 microUSD**, inférieure aux 200 000 réservés. Elle inclut deux prompts de 12 000 octets UTF-8, 2 048 jetons supplémentaires de contexte chacun, 150 jetons audio entrants plus 128 de marge, les deux sorties de 256 jetons facturées intégralement au tarif audio le plus élevé, et quinze secondes de transcription. Le détail du calcul et les hypothèses sont dans [le document technique du module](../../lib/yo/speech/README.md).

L’usage déclaré par OpenAI est également vérifié. Une sortie supplémentaire, un volume ou un compte de jetons hors limites ou un coût dépassant la réservation bloque durablement le pilote en base. Il n’y a pas de remise à zéro automatique ni de variable d’environnement pour dépasser les 10 USD. Cette enveloppe concerne la pratique vocale interactive. La fabrication hors ligne des enregistrements de cours a son propre budget explicite et ne doit pas être présentée comme couverte par ce registre.

## Base de données et révisions

Migration à appliquer : `supabase/migrations/20261125013336_yo_speech_bounded_practice.sql`, nom généré par `supabase migration new`.

Elle ajoute `yo_speech_budget`, `yo_speech_usage`, `yo_error_events` et `yo_speech_review_receipts`, avec RLS activée et aucun accès direct pour `anon` ou `authenticated`. Les RPC de réservation, finalisation et révision sont `SECURITY INVOKER`, avec `search_path` vide et exécution réservée à `service_role`.

Le précontrôle en lecture seule de la production a confirmé que ces quatre tables n’existent pas encore et que les colonnes d’éligibilité de `profiles` et `auth.users` existent. Il a aussi confirmé que `service_role` peut lire `profiles` mais pas `auth.users`. Pour cette raison précise, **seul** `yo_speech_account_available(uuid)` est `SECURITY DEFINER`. Il retourne uniquement un booléen, lit des tables qualifiées, n’écrit rien, n’utilise aucun SQL dynamique et reste appelable seulement par `service_role`. La migration n’accorde pas un accès général à `auth.users`.

L’identité provient toujours de `auth.getUser()` côté serveur; aucun identifiant utilisateur fourni dans le corps ne fait autorité. Les comptes anonymes, supprimés, en suppression, inactifs ou bannis ne sont pas éligibles. Les requêtes ne sont pas mises en cache publiquement.

Les phrases sauvegardées utilisent le moteur SRS pur déjà présent (`recordAttempt`) dans un adaptateur séparé. Les identifiants de phrases générées ne sont pas injectés dans le catalogue italien. Une révision utilise un numéro de version et un reçu d’essai pour empêcher une écriture périmée ou rejouée. L’apprenant peut oublier une phrase. Aucun indicateur quotidien ou SRS de cours n’est activé par cette fonctionnalité.

## Activation exacte

1. Déployer le code avec la pratique vocale fermée et appliquer la migration examinée via le processus habituel de migrations Supabase. Contrôler les permissions, le budget initial à zéro et le plafond à 10 000 000; ne pas réinitialiser un budget déjà utilisé.
2. Vérifier le runtime Node et la dépendance de production `ws`, ainsi que la connectivité serveur vers `wss://api.openai.com/v1/realtime`.
3. Configurer **uniquement côté serveur** `OPENAI_API_KEY` et conserver `SUPABASE_SERVICE_ROLE_KEY` côté serveur. Les valeurs ne vont ni dans Git, ni dans une variable `NEXT_PUBLIC_*`, ni dans un journal. Les variables Supabase publiques déjà utilisées par l’application restent `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Vérifier les en-têtes du déploiement : le microphone même origine est autorisé seulement sur les pages de pratique, via `lib/security/yoSpeechHeaders.ts`; caméra et capture d’écran restent bloquées sur ces pages. Utiliser HTTPS et un navigateur compatible AudioWorklet.
5. Pour l’environnement contrôlé de vérification, définir `YO_SPEECH_ENABLED=true`, redéployer et effectuer la QA en ligne ci-dessous. Conserver le pilote fermé pour les utilisateurs tant que la QA n’est pas documentée.
6. Après validation, activer le même indicateur dans l’environnement de production retenu et redéployer. Vérifier `/api/yo/speech/status` avec un compte de test actif, la création d’une réservation et le maintien du plafond. Aucun drapeau de cours quotidien/SRS supplémentaire n’est nécessaire.

`YO_SPEECH_ENABLED` absent ou différent de `true` ferme les nouveaux échanges. Même avec cet indicateur à `true`, **une clé manquante, une configuration incomplète ou une base indisponible laisse la pratique indisponible et n’envoie aucun audio au fournisseur**. L’interface affiche cette indisponibilité et permet de continuer le cours. Les révisions déjà sauvegardées restent accessibles indépendamment de la clé et de l’épuisement du pilote.

Pour fermer le pilote, retirer l’activation et redéployer. Ne pas supprimer ou remettre à zéro les réservations pour rouvrir artificiellement une enveloppe épuisée. Un blocage du budget demande un examen des métriques de coût avant toute décision explicite de nouvel essai.

## Validation réalisée et QA en ligne restante

Les vérifications locales couvrent les transactions PostgreSQL via PGlite, les permissions réelles reproduites dans le fixture, la double application de la migration, les réservations concurrentes, le plafond exact, les échecs sans remboursement, la suppression de compte, le consentement de sauvegarde et l’isolation SRS. Les tests du protocole simulent les événements Realtime, leur ordre variable, la limite de deux réponses, l’annulation et l’usage. Les tests HTTP exécutent l’authentification simulée, l’origine, le consentement, la validation PCM et l’arrêt sur base indisponible. Cinq tests DOM indépendants vérifient consentement, annulation/reprise, changement de compte, lecture initiale tardive et arrêt sur cinéma/masquage/démontage.

Commandes de reproduction :

```sh
node --import tsx tests/yo/yopratiqoSpeechDatabase.test.ts
node --import tsx tests/yo/yopratiqoSpeechProvider.test.ts
node --import tsx tests/yo/yopratiqoSpeechApi.test.ts
node --import tsx tests/yo/yopratiqoSpeechClientLifecycle.test.tsx
```

La QA en ligne doit confirmer **les huit langues**. Aucun résultat local ne remplace l’écoute des voix et la vérification de vrais événements/mesures fournisseur.

| Cible | Variante attendue | Scène suggérée | État avant clé et activation |
| --- | --- | --- | --- |
| `it` | Italien d’Italie | Café | À vérifier en ligne |
| `ja` | Japonais poli | Hôtel | À vérifier en ligne |
| `es` | Espagnol latino-américain neutre (`es-419`), sans pays imposé | Directions | À vérifier en ligne |
| `fr` | Français québécois | Travail | À vérifier en ligne |
| `en` | Anglais canadien | Présentation | À vérifier en ligne |
| `de` | Allemand standard, politesse appropriée | Café | À vérifier en ligne |
| `pt` | Portugais du Brésil | Hôtel | À vérifier en ligne |
| `zh` | Mandarin standard, transcription simplifiée | Directions | À vérifier en ligne |

Pour chaque cible, faire au moins un échange naturel, écouter la réponse, vérifier le rattachement au scénario, la transcription, l’explication de correction ou son absence raisonnable et l’usage enregistré sous la bonne réservation. Répartir les interfaces FR/EN/ES sur ces essais. Huit essais consomment huit réservations, soit **1,60 USD d’enveloppe réservée**, même si leur coût fournisseur est inférieur. Garder le budget de la QA dans les cinquante réservations; ne pas remettre le compteur à zéro après la vérification.

Vérifier également sur Chrome et Safari mobile : permission refusée, micro annulé, limite de quinze secondes, lecture audio avec contrôles manuels si le navigateur bloque l’automatique, passage à une autre étape, cinéma, navigation et changement de compte pendant un échange. Avec l’option de sauvegarde activée, contrôler une phrase puis sa suppression; sans cette option, vérifier qu’aucune phrase n’est écrite. La qualité de variante régionale doit être jugée à l’écoute, sans prétendre qu’un prompt la garantit.

Journal de mise en service à remplir par le responsable de déploiement : migration appliquée (date/identifiant), environnement de QA, huit résultats linguistiques, navigateur mobile, usage maximal observé, nombre de réservations restantes et décision d’activation.

## Références officielles vérifiées

- [Tarifs OpenAI](https://developers.openai.com/api/docs/pricing) et [GPT-Realtime-2.1](https://developers.openai.com/api/docs/models/gpt-realtime-2.1) : texte entrée/sortie 4/24 USD par million; audio 32/64 USD par million.
- [Coût et latence vocale](https://developers.openai.com/api/docs/guides/voice-latency-cost?voice-api=realtime) : dix jetons audio entrants par seconde, vingt sortants, contexte facturé par réponse.
- [GPT-Transcribe](https://developers.openai.com/api/docs/models/gpt-transcribe?site_locale=en) : 0,0045 USD/minute, soit 75 microUSD/seconde.
- [Conversations Realtime](https://developers.openai.com/api/docs/guides/realtime-conversations), [événements clients](https://developers.openai.com/api/reference/resources/realtime/client-events) et [transcription Realtime](https://developers.openai.com/api/docs/guides/realtime-transcription) : PCM 24 kHz, tours manuels, plafonds de sortie, `languages` et corrélation des transcriptions.
- [Génération vocale historique](https://developers.openai.com/api/reference/resources/audio/subresources/speech/methods/create) : retrait annoncé des anciens modèles Speech le 6 janvier 2027. La nouvelle pratique utilise Realtime.
