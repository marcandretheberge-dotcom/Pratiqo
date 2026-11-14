# Café des langues — validation Daily réelle

Cette procédure valide le compte Daily de développement sans activer Café en production et sans exposer de jeton ou d’URL de salle. Le test REST n’applique aucune migration. L’option navigateur utilise exclusivement une base Supabase locale et jetable sur le runner.

## Ce que le workflow automatise

Le workflow manuel :

1. crée une salle Daily privée et temporaire avec la configuration sécurisée de PR3a;
2. appelle une seconde fois `ensureRoom` afin de récupérer la salle existante et de valider la configuration réellement retournée par Daily;
3. demande un jeton participant et un jeton hôte avec des identités opaques distinctes;
4. vérifie que les deux jetons sont émis avec l’expiration prévue;
5. détruit la salle dans un bloc `finally`, même si une assertion échoue.

Les journaux ne doivent contenir ni clé API, ni jeton, ni URL de salle, ni UUID de profil.

## Préparation GitHub

Créer l’environnement GitHub **`cafe-daily-development`** et y ajouter quatre secrets :

- `DAILY_API_KEY`
- `DAILY_DOMAIN` — par exemple `pratiqo.daily.co`, sans `https://`
- `CAFE_DAILY_ROOM_HMAC_SECRET`
- `CAFE_DAILY_PARTICIPANT_HMAC_SECRET`

Les deux secrets HMAC doivent être indépendants, aléatoires et contenir au moins 32 caractères. Ne jamais créer de variante `NEXT_PUBLIC_`.

L’environnement devrait exiger une approbation manuelle avant l’exécution afin qu’un workflow de pull request ne puisse jamais consommer les secrets Daily.

## Exécution

Dans GitHub Actions, lancer manuellement **Cafe Daily live validation** avec `Run workflow` sur le commit à valider.

Pour le parcours hôte + apprenant, cocher également **browser**. Cette option reste désactivée par défaut et consomme les quatre secrets uniquement dans l’environnement `cafe-daily-development`, après la réussite du test REST.

Le résultat attendu est :

```text
[cafe:daily-live] account lookup { httpStatus: 200, domainMatches: true }
[cafe:daily-live] PASS
[cafe:daily-live] temporary room deleted
```

En cas d’échec, le journal peut inclure un diagnostic expurgé (`operation`, `httpStatus`, `errorCode`, `rejectedField`, `requestId`) — jamais de secret, jeton, URL de salle ou corps brut Daily.

Ne pas copier dans une issue ou un rapport une valeur de secret, un jeton ou une URL de salle. Conserver seulement le lien du run, le commit, le domaine Daily testé et la date.

## Parcours navigateur automatisé (option browser)

Le job installe la version figée **Supabase CLI 3.1.0**, démarre une pile locale Auth/Postgres/PostgREST dans un dossier temporaire non lié à un projet hébergé, puis applique une table `profiles` de fixture et les quatre migrations Café existantes. Il n’accède pas à la base Pratiqo hébergée.

Deux comptes Auth temporaires sont créés par le véritable service Auth local. Leurs sessions obtenues par `signInWithPassword` alimentent les cookies attendus par l’application. Le compte hôte est affecté à la séance sans réservation apprenant; le second compte réserve via l’API Pratiqo. Les attestations adultes sont des fixtures SQL locales : ce test ne valide pas une interface de consentement.

Le script compile Next puis démarre le bundle de production localement avec les deux flags Café activés uniquement dans ces processus. `VERCEL_ENV=development` maintient la configuration de sandbox; le code de développement de Next, qui exige `unsafe-eval`, n’est pas utilisé. Les CSP et Permissions-Policy de l’application restent appliquées, avec l’origine Supabase loopback explicitement autorisée par le mécanisme de sandbox existant. Aucun `bypassCSP` ni JWT fabriqué n’est utilisé. Ce test ne valide pas le service Redis de limitation de débit de production.

La compilation est ciblée avec l’option Next `--debug-build-paths` sur `app/cafe/**/page.tsx`, `app/(app)/student/yopratiqo/page.tsx` et `app/api/**/route.ts`. Les layouts de ces pages et les API de réservation, de salle, de géolocalisation et du hub authentifié restent inclus. Les pages SEO étrangères au parcours dépendent d’un catalogue absent de la base jetable et ne sont pas compilées. Le rapport indique `buildScope: "targeted_routes"` : une réussite ne constitue pas une preuve de compilation du site complet, et ce bundle de validation ne doit pas être déployé.

Les assertions portent sur :

- la connexion réelle des deux navigateurs à la même salle Daily et leur présence réciproque;
- les contrôles caméra/micro, désactivés au départ, puis activés par clic;
- la réception audio et vidéo bidirectionnelle mesurée par les statistiques WebRTC;
- une nouvelle tentative après une coupure réseau volontaire du navigateur;
- la sortie, la suppression de l’iframe et une nouvelle connexion;
- la conservation de `yoReturn` et la navigation vers le cours;
- le nettoyage de la salle Daily, la révocation des sessions locales et la suppression des comptes temporaires.

Les périphériques caméra/micro sont **synthétiques**. Les deux tailles d’écran Chromium ne constituent pas une validation sur iPhone Safari ou Android Chrome. Ce test ne prouve pas le parcours OAuth de production ni la qualité des micros/caméras physiques.

L’artifact `cafe-room-browser-<sha>` contient uniquement le rapport expurgé et les deux captures de la conversation. Les logs bruts du serveur, les données Auth et la sortie CLI contenant les clés locales restent dans le dossier temporaire privé, supprimé à la fin. Un rapport `BLOCKED` ou `FAIL` ne doit jamais être présenté comme une séance réussie.

Les délais des requêtes, du build et des étapes navigateur sont bornés. Une annulation tente de fermer les navigateurs puis de nettoyer Daily, mais un runner tué brutalement peut interrompre ce nettoyage. Un run annulé ou expiré ne prouve donc ni le parcours ni la suppression de la salle; vérifier le compte Daily dans ce cas. La salle conserve également l’expiration limitée définie par le fournisseur Café.

Pour une exécution locale disposant de Docker, de Supabase CLI 3.1.0, de Chromium Playwright et des quatre variables Daily de développement :

```sh
bash scripts/run-cafe-room-browser-live.sh
```

Ne pas exécuter ce script dans un environnement de production. Il ne lit pas de fichier de secrets local et ne modifie aucun flag du projet hébergé.

## Vérifications manuelles encore obligatoires

Le workflow REST ne remplace pas les essais du navigateur. Avant PR3b activable, effectuer une séance de développement et confirmer :

- l’URL de salle seule, sans jeton valide, ne permet pas d’entrer;
- participant et hôte restent `is_owner:false` et sans administration Daily;
- caméra et microphone commencent désactivés;
- chat, partage d’écran, captions, enregistrement et transcription ne sont pas disponibles;
- le parcours Pratiqo **Retirer et bloquer** persiste d’abord le retrait, puis éjecte/bannit l’identité opaque;
- la même identité opaque ne peut pas rejoindre de nouveau après l’éjection;
- reconnexion après coupure réseau;
- iPhone Safari;
- Android Chrome;
- navigateur ordinateur;
- comportement lorsque Daily est temporairement indisponible.

Vérifier également dans le tableau de bord du domaine Daily que l’enregistrement, la transcription, le live streaming et le dial-out ne sont pas activés par défaut.

## Conditions de non-activation

Dans le projet hébergé, pendant toute cette validation :

```text
CAFE_V1_ENABLED=false
CAFE_ROOM_PROVIDER_ENABLED=false
```

Le test REST appelle directement l’adaptateur de développement. L’option navigateur ouvre les routes uniquement dans le processus Next local jetable; elle n’ouvre aucune route hébergée.

Ne pas activer une vraie salle tant que les éléments suivants ne sont pas terminés :

- rapport et modération Pratiqo visibles;
- règles adultes acceptables et interface d’attestation;
- revue du DPA Daily et des sous-traitants;
- évaluation Loi 25 des traitements hors Québec;
- mise à jour de l’avis de confidentialité;
- tests réels mobiles et ordinateur;
- approbation explicite de mise en production.
