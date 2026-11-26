# Café des langues — intégration V2 (RFC technique, non activée)

**État : spécification pour revue; aucune réservation active, aucun schéma SQL appliqué, aucun déploiement.**  
**Suite de :** PR #449 / `feat/cafe-des-langues-pilot-kit-20261109`.  
**Garde-fou :** ne pas changer `group_sessions`, les réservations de professeurs, Stripe Connect, YoPratiqo Pass/crédits, ni les règles d'accès des mineurs ailleurs.

## But produit

Le Café est un échange entre pairs **gratuit**, animé et distinct d'un cours. Les participants découvrent d'abord un café; les éventuelles relations de pratique 1:1 n'apparaissent **qu'après** la preuve de demande et une revue de sûreté.

Pilote : FR↔ES, adultes 18+, 5 à 8 places, 30 minutes chaque semaine (option 45 minutes seulement après validation) pendant 8 semaines, animé, caméra facultative, audio non enregistré. Plateforme vidéo externe. Aucune date ni outil vidéo n'est confirmé à ce stade.

## Ordre d'implémentation (ne pas tout activer ensemble)

### P0 — prérequis humains (bloquants)

- [ ] Désigner animateur + suppléant, responsable des renseignements personnels.
- [ ] Choisir plateforme vidéo, vérifier salle d'attente, expulsion, désactivation d'enregistrement/transcription/IA, accès et région de traitement.
- [ ] Valider EFVP et avis spécifique, rétention, suppression, signalement et réponse aux incidents (Loi 25).
- [ ] Confirmer première date/heure **avec fuseau IANA**, capacité et moyen de contact.
- [ ] Revue FR/EN/ES des règles; revue de la page preview; autorisation explicite avant production.

### P1 — calendrier en lecture seule, derrière feature flag

- Montrer les cafés uniquement si leur statut est **published** ET l'autorisation de lancement est documentée.
- Afficher paire de langues, sujet, horaire local + fuseau, durée, nombre de places et mention « Gratuit · 18+ ».
- Afficher « À annoncer » si aucune séance confirmée, jamais des faux horaires ni des places fictives.
- Préserver la page `/cafe-des-langues` actuelle et la progression YoPratiqo; ajouter un CTA contextuel facultatif depuis les parcours FR/ES **seulement après la revue UX**.

### P2 — réservation gratuite (module isolé, pas le modèle de cours payant)

Entités envisagées, à ajuster à l'architecture réelle et à la migration existante :

- `language_cafe_sessions`: id, language_pair, theme, starts_at (UTC), timezone (IANA), duration_minutes=30, capacity (5..8), host_id, status (draft/published/cancelled/completed), external_meeting_secret_reference (jamais dans réponse publique), created_at.
- `language_cafe_reservations`: id, session_id, attendee_user_id, state (confirmed/waitlisted/cancelled/attended/no_show), accepted_rules_version, adult_attested_at, pilot_contact_consent_at, created_at, cancelled_at. Unicité de réservation active par personne/séance.
- Pas de champs date de naissance, téléphone, adresse, localisation exacte, genre, vidéo enregistrée ou coordonnées des autres participants.
- Prévoir purge/rétention configurables, séparation des autorisations hôte/admin et accès minimal. Éviter de surcharger les comptes/profils existants.

Contrats serveur :

1. Session publique = projection **allowlist** sans identifiants des participants ni lien visio.
2. Pour réserver : authentification requise, déclaration 18+, acceptation explicite des règles à version donnée et consentement distinct aux communications du pilote; jamais de marketing implicite.
3. Atomiser la réservation et le calcul des places en transaction pour éviter la surréservation; réponse sans fuite de données des autres participants.
4. Liste d'attente opt-in séparée quand la capacité est atteinte; pas de confirmation de place pour les waitlisted.
5. Lien visio uniquement à la personne confirmée après contrôle d'accès et fenêtre temporelle appropriée; ne pas le rendre public, indexable, cacheable ou accessible par ID deviné.
6. Annulation par participant; suivi d'absence limité; hôte peut annuler ou retirer avec journal de modération privé et minimal.
7. Aucune transaction Stripe, aucune réservation de professeur, aucun crédit ni privilège YoPratiqo Pass.
8. Défense en profondeur : RLS, contrôle d'accès côté serveur, validation d'entrée, anti-spam/rate limiting, CSRF selon mécanisme d'auth, audit ciblé, fuseaux/heure d'été.

### P3 — animation et notifications minimales

- Tableau hôte : séances, jauge, confirmations, présences, liste d'attente, annulation, signalements; accès seulement aux animateurs autorisés.
- Courriels transactionnels : réservation confirmée, rappel facultatif, annulation, remplacement de liste d'attente après consentement. Ne pas partager les adresses entre participants.
- Désactiver promotion automatique, moteurs de matching, DM, chat libre, vidéo native, transcription, points et paywall.

### P4 — après 4 puis 8 semaines

Mesurer seulement : cafés tenus, taux de présence, réassiduité à 21 jours, demandes de revenir, incidents résolus. Seuils pilotes et règles de décision dans `pilot-v1.md`. Décision explicite **GO / PIVOT / STOP** avant toute expansion linguistique.

## Tests d'acceptation requis

- Mineur non admissible; cases règles et consentement non précochées; aucun accès sans session autorisée.
- 8 places maximum, 20 réservations simultanées => aucune surréservation; annulation et éventuelle promotion correctes.
- Un utilisateur ne voit jamais le courriel, l'identité ou le lien privé d'un autre participant.
- Un non-confirmé n'obtient jamais le lien; identifiants et sessions expirées ne dévoilent rien.
- Gestion de DST `America/Toronto` et d'autres fuseaux; formats FR/EN/ES corrects.
- Expulsion, annulation par hôte, suppression de données et accès administrateur vérifiés.
- Pages sans sessions confirmées restent honnêtes et sans fausse disponibilité.
- Régressions : réservation professeur, Stripe, recherche et parcours YoPratiqo restent inchangés.
- CI, typecheck, lint, tests ciblés et preview validés avant demande de merge.

## UX cible (sans impacter la PR pilote)

Page Café → choisir une séance publiée → voir horaire local/règles → réserver gratuitement (vérifications) → confirmation → recevoir lien privé de visio → participer → revenir la semaine suivante.

**Important :** La PR #449 est actuellement un kit de pilote manuel basé sur `mailto:`; ce document n'implémente ni la base de données ni la réservation. Le passage au MVP réservable nécessite une PR distincte, l'examen de l'architecture d'auth/DB existante et la validation de la vie privée avant toute collecte.
