# Diagnostic Gateway vocal avant activation

État au 25 novembre 2026 : le diagnostic réel de preview a authentifié le jeton OIDC du projet et lu les crédits. Le crédit disponible ne couvre pas une réservation de 0,20 USD. Il s'est donc arrêté avant toute connexion WebSocket et toute inférence. La compatibilité des paramètres Realtime reste **non vérifiée** et la pratique vocale des utilisateurs reste désactivée.

## Résultat observé et désactivation

Une seule exécution a été autorisée pour le commit `c6a4273bd699deeebb6cc951538d17d2221423b9`, sur le déploiement de preview `dpl_GADEL5vYs5oyEo2qmUQn2ozGZek4`. Le rapport a confirmé `eligiblePreview`, `oidcPresent`, `oidcScopeMatches`, `creditsAuthenticated` et `creditsParsed`. Il a retourné `hasReservationCredit: false`, `socketOpened: false`, `noInferenceRequested: true` et `passed: false`. Le build de diagnostic a échoué comme prévu dans ce cas ; ce résultat ne constitue pas une panne du site de production.

La valeur du flag limité à cette branche de preview a ensuite été vidée et cette désactivation a été vérifiée. Aucun budget, crédit, fournisseur de production ou flag d'activation vocale n'a été changé. Aucun achat, recharge ou nouvel essai n'a été effectué. Les accusés de configuration, la qualité des huit langues et la facturation d'un vrai tour vocal restent à vérifier après résolution du crédit disponible. Les booléens de paramètres restés faux signifient « non observé », pas « paramètre refusé par le fournisseur ».

## Question vérifiée

Vercel fournit `VERCEL_OIDC_TOKEN` pendant un build. AI Gateway accepte un jeton OIDC comme authentification serveur. Le diagnostic vérifie si ce projet peut lire ses crédits puis obtenir, pour `openai/gpt-realtime-2.1`, l'accusé natif des paramètres nécessaires à une future pratique vocale bornée. [Variables système](https://vercel.com/docs/environment-variables/system-environment-variables) · [Authentification OIDC](https://vercel.com/docs/ai-gateway/authentication-and-byok/oidc)

Le protocole Gateway utilise les événements normalisés de l'AI SDK. Le code publié de `@ai-sdk/gateway` 4.0.154 fournit l'URL serveur `/v4/ai/realtime-model`, ses en-têtes OIDC et des événements contenant `raw`. Le codec OpenAI fusionne `providerOptions` dans la session native, mais la conservation de ces paramètres par le service Gateway doit être observée. Le diagnostic ne considère jamais leur simple envoi comme une preuve. [Fournisseur Gateway](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway) · [Source du transport](https://github.com/vercel/ai/blob/main/packages/gateway/src/gateway-realtime-model.ts) · [Source du codec OpenAI](https://github.com/vercel/ai/blob/main/packages/openai/src/realtime/openai-realtime-event-mapper.ts)

## Activation exacte pour un build de preview

Le point d'entrée est `scripts/probe-yo-speech-gateway.ts`, appelé par `npm run prebuild` avant la construction habituelle des scénarios. Aucun paquet supplémentaire n'est nécessaire.

Toutes les conditions suivantes doivent être réunies :

| Contrôle | Valeur requise |
| --- | --- |
| `YO_SPEECH_GATEWAY_PROBE` | SHA Git complet, 40 caractères hexadécimaux minuscules, du commit relu |
| `VERCEL_GIT_COMMIT_SHA` | Exactement le même SHA |
| `VERCEL` | `1` |
| `VERCEL_ENV` et `VERCEL_TARGET_ENV` | `preview` pour les deux |
| `VERCEL_GIT_COMMIT_REF` | `feat/yo-speech-gateway-20261125` |
| Projet contenu dans le jeton OIDC | `prj_14E3Ld4IArR3RTdJQmXKlzo9sB93` |
| Équipe contenue dans le jeton OIDC | `team_uc6u8hEe6Ws19aexLUN6uL7a` |
| Environnement contenu dans le jeton OIDC | `preview` |
| Expiration du jeton | Après l'échéance maximale du diagnostic |

Configurer le flag uniquement pour le build de preview choisi, une fois le commit relu. Après cette exécution, retirer le flag ou vider sa valeur pour le désactiver. Un autre commit est automatiquement inéligible ; redéployer le même commit avec le flag encore présent relancerait le diagnostic. Cette commande ne contient aucun mécanisme de nouvelle tentative. Le flag de l'exécution décrite ci-dessus est désormais vide.

Hors de ces conditions, le script ne lit pas le jeton et ne fait aucun appel réseau. Le script ne charge aucun fichier d'environnement. Le décodage local des claims sert uniquement à vérifier le périmètre attendu ; Gateway réalise l'authentification du jeton. Les claims documentés comprennent le projet, l'équipe et l'environnement. [Référence OIDC](https://vercel.com/docs/oidc/reference)

## Séquence et limites

Une échéance globale de **10 secondes** couvre la lecture HTTP et la connexion WebSocket. La première requête lit `/v1/credits` pour l'équipe fixée dans le code. Le solde est analysé en microdollars entiers ; seul le booléen indiquant la disponibilité d'au moins **0,20 USD** est conservé dans le rapport. Une erreur, un document invalide ou un crédit insuffisant arrête la séquence avant la connexion.

La connexion suivante envoie une seule commande `session-update` fixe. Le serveur doit confirmer dans `session-updated.raw.session` :

- modèle exact `gpt-realtime-2.1` et instruction fixe de diagnostic ;
- sortie audio, voix `marin`, PCM à 24 000 Hz en entrée et sortie ;
- déclenchement automatique désactivé (`turn_detection: null`) ;
- plafond de sortie de 256 tokens et raisonnement `minimal` ;
- aucun outil, `tool_choice: none` ;
- transcription `gpt-transcribe` et tableau de langues exactement `["fr"]`.

Le socket est terminé immédiatement après l'accusé vérifié ou au premier échec. Aucune commande d'ajout d'audio, de création de message ou de création de réponse n'est envoyée. Aucun microphone, texte utilisateur, historique de conversation ou exercice n'est accessible à ce script. La langue française sert uniquement à vérifier la transmission du champ tableau ; ce test ne valide aucune prononciation ni les huit langues en situation réelle.

Les redirections sont refusées, les réponses HTTP et messages entrants sont limités à 32 Kio, et au plus 16 événements sont acceptés. Seules les notifications de création de session et de limites de débit sont tolérées avant l'accusé. Aucun fournisseur de remplacement, jeton client, achat de crédit ou reconnexion n'est prévu. Les limites générales de Gateway restent également applicables. [Protocole et limites Realtime](https://vercel.com/docs/ai-gateway/modalities/realtime)

## Rapport et résultat

Le préfixe `YO_SPEECH_GATEWAY_PREFLIGHT` est suivi d'un objet contenant uniquement des booléens. Il ne contient ni jeton, ni en-tête, ni montant de solde, ni corps de réponse, ni erreur ou trace fournisseur. Le script reste silencieux sans flag. Un build explicitement éligible échoue si `passed` n'est pas vrai.

`passed: true` prouverait l'authentification, la disponibilité de la réserve minimale et l'accusé des paramètres de cette session. Il resterait ensuite à développer et tester l'adaptateur des tours vocaux, la mesure des usages et le consentement décrivant le passage par Vercel. Ce diagnostic ne crée aucune réservation de pratique utilisateur et n'active aucune route vocale.

## Coût et confidentialité

Le catalogue public consulté le 25 novembre 2026 indique, pour ce modèle, **4 USD / 24 USD par million de tokens texte entrants / sortants** et **32 USD / 64 USD par million de tokens audio entrants / sortants**. Il ne publie pas de tarif à la durée pour `gpt-realtime-2.1`. Le modèle à facturation temporelle GPT-Live utilise un autre contrat et ne peut pas être substitué ici. L'exécution observée n'a ouvert aucun socket et n'a demandé aucune inférence. Aucune facturation d'un vrai tour vocal n'est encore observée. [Catalogue JSON](https://ai-gateway.vercel.sh/v1/models) · [Modèle](https://vercel.com/ai-gateway/models/openai/gpt-realtime-2.1) · [Tarification](https://vercel.com/docs/ai-gateway/pricing)

Le catalogue annonce `no_training: all` et `zdr: none` pour ce modèle. Une future activation ne devra donc pas promettre une rétention nulle de bout en bout. Les contrôles SQL existants du pilote — 50 réservations irréversibles de 0,20 USD, soit 10 USD — restent nécessaires. Le budget Gateway constitue un contrôle supplémentaire : sa limite peut être franchie par une requête déjà en cours. [Confidentialité](https://vercel.com/docs/ai-gateway/security-and-compliance/zdr) · [Budgets Gateway](https://vercel.com/docs/ai-gateway/observability-and-spend/budgets)

## Vérification locale

`npm run test:yo-speech-gateway-probe` utilise des réponses HTTP et sockets simulés. Les 27 vérifications couvrent notamment l'absence d'accès au jeton hors périmètre, les claims OIDC, la commande unique, chaque paramètre natif, les crédits invalides, la fermeture, les événements tardifs et l'échéance partagée. Aucun fournisseur réel n'est contacté par cette suite. Une réussite de cette suite ne constitue pas une réussite du diagnostic en preview.
