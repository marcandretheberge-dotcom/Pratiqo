# Roadmap d'intégration — Le Café des langues (2026-11-09)

**Statut : plan de travail, non autorisation de déploiement.**  
**PR de départ :** #449 (`feat/cafe-des-langues-pilot-kit-20261109`), actuellement en brouillon.  
**Produit :** expérience intégrée à Pratiqo, avec vidéoconférence fournie par un service tiers, sans créer un second système d'identité.  
**Pilote :** FR–ES, 18+, 30 min, 5 à 8 participants, hebdomadaire, gratuit. Une paire et une séance confirmée à la fois au lancement.  
**Objectif primaire :** acquisition et activation Pratiqo; objectif secondaire : pratique linguistique et rétention, sans démarchage dans la salle.

## Responsabilités et collaboration

- **Cursor / backend :** audit Supabase + auth existants, schéma/migrations, RLS, contrats API, réservation concurrente, visio token/room admission, modération backend, événements, parrainage et crédits. Aucun SQL en prod sans revue.
- **Claude / frontend :** réutilisation design system Pratiqo, page Café, calendrier, état connecté/déconnecté, panneau d'inscription, page de salle embarquée, état d'erreur et accessibilité; responsive mobile/tablette/desktop. Pas de modifications de migration, Stripe, auth ou API par Claude sans accord.
- **GPT-6 / intégration et revue :** rédige critères d'acceptation et contrat initial, relit PR Cursor et Claude, compare backend/frontend, contrôle sécurité, cohérence juridique/produit et absence de régression.
- **Fondateur :** valide le prestataire de visio, coûts, rôle d'animateur, premières dates, documents de confidentialité et autorise explicitement chaque mise en prod.

## Discipline d'exécution

1. **Une branche par lot / une PR par responsabilité**; branches basées sur `main` ou branche d'intégration explicitement validée. La PR #449 reste un pilote de page `mailto:`, pas une application de réservation.
2. **Backend contract-first** : méthodes, payloads/types, codes d'erreur, auth, permissions et états écrits avant de produire les écrans. Claude peut commencer sur fixtures stables, jamais en inventant de nouveaux contrats.
3. Tous les changements sensibles derrière des **feature flags** fermés par défaut; pas de données de démonstration présentées comme des séances réelles.
4. **Pas de merge ni de déploiement en production sans revue humaine explicite**. Ne pas réutiliser `group_sessions` (cours payants), ne pas modifier Stripe Connect/Pass/crédits sans audit du système existant.
5. Tester chaque lot : typecheck, lint, tests backend et UI ciblés, RLS/permissions, WCAG de base, FR/EN/ES, appareils, sécurité, migration réversible. Publier les résultats et les limitations dans la PR.

## Étape 00 — Audit et architecture (START HERE)

**Livrables Cursor :**
- Cartographier l'authentification Pratiqo, la forme du compte apprenant et son onboarding.
- Localiser schémas des cours de groupe, réservation et notifications; expliquer pourquoi le Café est isolé.
- Inspecter les tables/flows YoPratiqo Pass/credits (durée, valeur, conditions de rédemption, expirations); ne rien créditer.
- Identifier RLS et conventions migrations/tests, génération de types et routes API.
- Proposer un contrat API versionné + schéma minimal, basé sur ces découvertes. Signaler toute information manquante; ne pas deviner.

**Livrables Claude :** wireframe 3 vues (liste, détail/réservation, salle), états loading/empty/error/auth, mobile first, design tokens Pratiqo. Utiliser fixtures déterministes.
**Critère de sortie :** revue architecture/contrats approuvée, aucun changement de données.

## Étape 01 — Découverte native

- Page `/cafe-des-langues` FR/EN/ES : séances confirmées, date/heure locale + fuseau, paire, capacité/places, âge minimum et règles; aucun horaire fictif.
- CTA « Réserver » ouvre connexion/compte Pratiqo existant, puis revient au café.
- Les pages sans sessions montrent « Dates à annoncer ». Données de séances publiées via endpoint read-only allowlist.
- Tests visuels, SEO (conserver noindex avant lancement), navigation et responsive.

## Étape 02 — Réservation gratuite

- Module Cafe distinct des offres de professeurs/Stripe, avec états `draft/published/cancelled/completed` des séances, `confirmed/waitlisted/cancelled/attended/no_show` des participants.
- Réservation atomique (8 demandes simultanées maximum capacité configurée), déduplication, annulation, liste d'attente et éventuelle promotion transactionnelle.
- Compte gratuit existant et consentements distincts : déclaration 18+, règles versionnées, avis de confidentialité, communications nécessaires à la séance. Consentement marketing séparé et facultatif.
- Identités, autres participants, lien de réunion et détails de signalement jamais exposés via API publique; contrôle propriétaire/hôte.
- Vérifications : RLS, auth, rate limiting, CSRF selon stack, sessions expirées, race conditions, fuseaux/heure d'été.

## Étape 03 — Salle vidéo intégrée

- Choix fournisseur après vérification **tarifs, limites, origine/traitement des données, iframe/SDK, compatibilité mobile, protection de salle, salle d'attente, suppression/enregistrement/transcription IA et outils d'expulsion**. Ne pas promettre une visio privée avec un simple iframe non authentifié.
- Page `/cafe-des-langues/[id]/salle` native Pratiqo; intégration embeddée, micro/caméra facultatifs, texte d'aide, signalement.
- Backend délivre droit temporaire d'accès uniquement à un participant confirmé dans la fenêtre admissible; hôte contrôle l'accès et les exclusions.
- Tests sur Chrome/Edge/Safari/mobile, permissions navigateur et scénarios de départ/retour et d'expulsion.
- **Point de lancement pilote** après validation de la confidentialité, EFVP appropriée à l'architecture et des règles de modération; étape 03 complète sans déploiement automatique.

## Étape 04 — Parrainage + Yoppo Pass

- URL de référence attachée au parrain authentifié; attribution au nouveau compte; pas d'auto-parrainage, multi-comptes artificiels, doubles crédits ou réservations fantômes.
- Récompense **uniquement après première présence vérifiée d'un nouvel invité**, confirmée par hôte et/ou événement fiable de visio; événements idempotents.
- Plafond de lancement proposé : **3 Passes maximum par parrain** durant le pilote; à ajuster après audit de la valeur/du coût réel des Passes.
- **Ne pas récompenser les avis Google**. Demande d'avis indépendante, neutre et facultative; aucune association entre Pass et avis.
- Afficher les conditions de récompense et l'historique du compte, permettre support et annulation anti-fraude.

## Étape 05 — Activation YoPratiqo et découverte des enseignants

- Après participation : remerciement, invitation prochaine séance, lien de parrainage, options « Continuer avec YoPratiqo » et « Trouver un professeur ».
- Pas de promotion commerciale forcée dans le café. Respect des consentements électroniques; communications transactionnelles vs marketing distinguées.
- CTA contextuel sur parcours d'espagnol/français, non intrusif et sans perturber les parcours Yoppo.

## Étape 06 — Pilote 6–8 séances et décision

**KPI** : inscription, nouveaux comptes attribués au café, taux de confirmation→présence, retours sous 21 jours, referrals valides, clics YoPratiqo/profs, usage/achats attribuables, coût du fournisseur et charge d'animation, incidents résolus.

À la séance 4 : corriger recrutement, horaire, UX et équilibre. Après 6–8 séances : GO/PIVOT/STOP selon acquisition utile, participation, sécurité et coût. Aucune expansion de langues ni DM/matching avant cela.

## Contrat API candidat — à confirmer après audit de l'existant

- `GET /api/cafes/sessions` : liste publique de sessions *published* (projection filtrée; jamais de lien visio ou liste participants).
- `GET /api/cafes/sessions/:id` : détail public vérifié.
- `POST /api/cafes/sessions/:id/reservations` : auth + attestation âge + règles/consentement; idempotency key; retourne statut confirmed/waitlisted.
- `DELETE /api/cafes/reservations/:id` : annulation autorisée; waitlist promotion contrôlée.
- `POST /api/cafes/sessions/:id/join` : accès éphémère, avec check d'identité et horaire.
- `POST /api/cafes/sessions/:id/report` : signalement privé limité et contrôlé.
- `GET /api/cafes/referral` + événement serveur d'attribution : uniquement à l'étape 04.
Ce sont des **propositions**, pas des routes existantes ou vérifiées.

## Non-objectifs du MVP

Pas d'application vidéo développée maison, pas de DM, matching, profils publics communautaires, IA transcription, replay, ventes de cours dans la salle, notes/XP liées aux avis Google, ni remaniement du parcours Pratiqo/Stripe existant.

## Premier checkpoint

**Cursor** livre un rapport d'audit, la proposition de schéma et les types de contrats; **Claude** livre maquettes branchées sur fixtures. **GPT-6** relit les deux avant l'implémentation des endpoints. Aucune migration/collecte/déploiement à ce checkpoint.
