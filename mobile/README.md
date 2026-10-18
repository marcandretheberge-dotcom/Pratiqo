# Pratiqo — prototype mobile privé

Expo SDK 58 / React Native / Expo Router / WebView. Le site Next.js continue de servir
les pages et API : aucun export statique du site, aucune copie du backend, aucune migration.
Ce lot prépare une bêta privée ; ce n’est pas une publication App Store ou Google Play.

## Installation

Depuis `mobile/`, avec Node 24 :

```sh
npm ci
npm run typecheck
npm run lint
npm test
EXPO_PUBLIC_WEB_ORIGIN=https://mobile-test.example.com npm run export:beta
```

La dernière commande compile les bundles avec une origine fictive, sans connexion à un service.
Elle ne produit ni APK, ni archive iOS signée, ni preuve de fonctionnement sur téléphone.
Les dépendances natives sont isolées du projet Web. Le `tsconfig.json` Web exclut `mobile/`.
Les images viennent des icônes Pratiqo existantes dans `public/`.

## Environnement à raccorder

L’application refuse de démarrer le site sans configuration explicite et réponse valide de
`/api/mobile/config`. Aucun repli silencieux vers la production.

| Emplacement | Variable | Valeur attendue |
| --- | --- | --- |
| Mobile / environnement EAS | `EXPO_PUBLIC_WEB_ORIGIN` | Une origine HTTPS exacte, sans chemin |
| Mobile / environnement EAS | `EAS_PROJECT_ID` | Identifiant du véritable projet Expo |
| Serveur Web de test | `ENABLE_NATIVE_WRAPPER_BETA` | `true` après vérification de l’isolation |
| Serveur Web de test | `NATIVE_WRAPPER_WEB_ORIGIN` | La même origine HTTPS |
| Serveur Web de test | `NEXT_PUBLIC_SUPABASE_URL` | Projet de test, avec configuration Auth existante |
| Serveur Web de test | `ENABLE_NATIVE_WRAPPER_CHECKOUT` | `true` seulement pour le parcours sandbox |
| Serveur Web de test | `STRIPE_SECRET_KEY` | Clé sandbox ; une clé live ferme le parcours mobile |

La présence d’un domaine Preview ne prouve pas son isolation : vérifier Supabase, Stripe,
webhooks, courriels et workers avant toute création de compte ou réservation.
Ne pas changer les clés de production pour activer ce prototype. Les secrets restent côté serveur.
Les deux variables mobiles sont publiques et doivent aussi être définies dans l’environnement
EAS choisi ; un fichier `.env` local ignoré par Git ne configure pas le service distant.

Supabase doit autoriser le callback HTTPS `/auth/callback` avec ses paramètres `intent`, `next`,
`native=1` et `native_state` sur cette origine précise. Ne pas autoriser globalement tous les
domaines Preview. Google conserve son callback Supabase existant.

## Comportements préparés

- Interface Web actuelle dans une seule vue, marges système, retour Android et geste retour iOS.
- Cookies conservés dans la WebView ; mise en arrière-plan sans rechargement forcé.
- Erreur de réseau avec reprise explicite, sans promesse de consultation hors ligne.
- Liens HTTPS externes et téléphone/courriel ouverts après confirmation. Autres schémas refusés.
- Google s’ouvre dans le navigateur système. Le code temporaire revient à la WebView qui possède
  le vérificateur PKCE ; le callback Web existant échange ce code et applique les règles actuelles.
  Aucun jeton de session ni vérificateur PKCE ne traverse le lien natif.
- Une seule connexion Google en cours ; annulation, mauvais état, expiration et rejeu refusés.
  Une application arrêtée pendant le parcours demande de recommencer.
- Checkout individuel **sandbox seulement**, navigateur système et retour corrélé.
  Le lien de retour ne confirme aucun paiement : `/booking/success` et le traitement serveur
  existant restent les références. Une fermeture du navigateur renvoie à « Mes paiements »
  pour relire le statut, sans inviter à recréer une réservation ni l’annuler automatiquement.
- Achats Pro, groupes, forfaits et démarrage Connect/Identity bloqués pour le client natif.
  Le marqueur natif est un indicateur fonctionnel, jamais une autorisation de sécurité.

Les routes Web existantes gardent leur fonctionnement quand le marqueur natif est absent.
Tous les nouveaux drapeaux serveur sont fermés par défaut. Le callback de paiement est public
pour fonctionner sans cookie du navigateur externe, mais il ne lit ni ne modifie de donnée.

`originWhitelist=['*']` est délibéré : React Native WebView ouvre automatiquement dans le système
les URL hors de sa whitelist. Ici, chaque navigation passe par notre politique stricte,
y compris `javascript:`, `file:`, les nouvelles fenêtres et les redirections.

## Génération des versions privées

Après connexion à Expo, rattacher le projet réel et renseigner les deux variables publiques :

```sh
npx eas-cli@latest login
npm run config:check
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile beta
```

- `preview` Android : APK installable ; iOS : simulateur, pas un iPhone physique.
- `beta` : Android AAB / archive iOS pour distribution de test via les consoles.
- L’iPhone exige l’accès Apple Developer et la signature. TestFlight nécessite ensuite un envoi
  explicite dans App Store Connect. Aucune soumission automatique n’est configurée.
- Identifiants provisoires : `ca.pratiqo.app.beta`. Le propriétaire Expo et les identifiants finaux
  doivent être confirmés avant distribution. Les mises à jour EAS OTA sont désactivées.

## Preuves et suite ciblée

Au 18 octobre 2026 : tests de protocole et de handlers, régressions OAuth Web, TypeScript,
lint mobile et exports des bundles sont exécutés dans ce lot. Les résultats hébergés sont
à lire dans la PR. Aucune session Expo connectée dans l’environnement de préparation.

Avant de distribuer la bêta : tester sur un iPhone et un Android la connexion Google,
annulation/reprise, fermeture/réouverture, clavier, retour Android, réseau interrompu,
enregistrement du projet élève et checkout sandbox avec retour au statut confirmé par le serveur.
Les tests de ce dépôt ne remplacent pas ces essais.

Avant publication publique : finaliser la connexion Apple ou équivalente conforme aux règles
de la boutique, vérifier suppression de compte dans l’app, permissions réellement requises,
confidentialité, modération des messages, captures réelles et valeur d’usage native.
Notifications push, liens universels, enregistrement audio/caméra et signature/distribution
ne sont pas implémentés ou validés par ce lot. Il ne garantit pas l’acceptation en boutique.

Références : [Expo 58](https://docs.expo.dev/versions/v58.0.0/),
[WebBrowser](https://docs.expo.dev/versions/v58.0.0/sdk/webbrowser/),
[PKCE Supabase](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
[règles Apple](https://developer.apple.com/app-store/review/guidelines/),
[paiements Google Play](https://support.google.com/googleplay/android-developer/answer/10281818).
