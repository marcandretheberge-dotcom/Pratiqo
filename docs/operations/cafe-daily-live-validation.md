# Café des langues — validation Daily réelle

Cette procédure valide le compte Daily de développement sans activer Café, sans appliquer de migration à Supabase et sans exposer de jeton ou d’URL de salle.

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

Le résultat attendu est :

```text
[cafe:daily-live] account lookup { httpStatus: 200, domainMatches: true }
[cafe:daily-live] PASS
[cafe:daily-live] temporary room deleted
```

En cas d’échec, le journal peut inclure un diagnostic expurgé (`operation`, `httpStatus`, `errorCode`, `rejectedField`, `requestId`) — jamais de secret, jeton, URL de salle ou corps brut Daily.

Ne pas copier dans une issue ou un rapport une valeur de secret, un jeton ou une URL de salle. Conserver seulement le lien du run, le commit, le domaine Daily testé et la date.

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

Pendant toute cette validation :

```text
CAFE_V1_ENABLED=false
CAFE_ROOM_PROVIDER_ENABLED=false
```

Le workflow appelle directement l’adaptateur de développement; il ne nécessite pas d’ouvrir les routes publiques ou de réservation.

Ne pas activer une vraie salle tant que les éléments suivants ne sont pas terminés :

- rapport et modération Pratiqo visibles;
- règles adultes acceptables et interface d’attestation;
- revue du DPA Daily et des sous-traitants;
- évaluation Loi 25 des traitements hors Québec;
- mise à jour de l’avis de confidentialité;
- tests réels mobiles et ordinateur;
- approbation explicite de mise en production.
