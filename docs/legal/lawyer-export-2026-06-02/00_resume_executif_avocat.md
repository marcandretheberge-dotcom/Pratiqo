# Résumé exécutif pour avocat

> **Source route** : N/A — document de synthèse interne
> **Source file(s)** : docs/legal/lawyer-export-2026-06-02/*

## 1. Activité de Pratiqo

Cours Pratiqo Inc. exploite Pratiqo, une plateforme d'apprentissage qui combine :

- une **place de marché** mettant en relation élèves, parents et professeurs indépendants ;
- des pages de découverte et de recherche pour trouver des professeurs ;
- des réservations et paiements sécurisés ;
- des profils professeurs avec informations publiques, disponibilités, tarifs et signaux de confiance ;
- un produit autonome d'apprentissage, **YoPratiqo**, conçu comme une introduction interactive avant une pratique avec un professeur.

## 2. Modèle professeurs / élèves

Les professeurs offrent des cours privés en ligne, à domicile ou chez l'élève, selon leur profil et leurs paramètres. Les documents juridiques actuels positionnent les professeurs comme **travailleurs autonomes**, non employés de Cours Pratiqo Inc. Pratiqo agit comme intermédiaire technologique et marketplace.

**À valider par l'avocat** : la formulation actuelle est-elle suffisante pour réduire les risques de qualification d'emploi, d'agence, de franchise, de société de personnes ou de coentreprise ?

## 3. YoPratiqo

YoPratiqo est présenté comme un produit d'apprentissage autonome à l'intérieur de Pratiqo. L'état actuel mentionne :

- intros gratuites maintenant ;
- modules premium futurs ;
- pont vers des professeurs réels ;
- absence de garantie de fluidité, examen, immigration, emploi ou résultat pédagogique.

Les politiques YoPratiqo incluent déjà une politique de remboursement et d'accès à vie pour les modules autonomes, mais l'ensemble demeure à valider avant toute vente payante à grande échelle.

## 4. Membre Pro

Membre Pro est une option payante pour professeurs. Elle ne doit pas être présentée comme une vérification de qualité ni comme une garantie de visibilité, réservation, classement ou revenu.

Le prix affiché actuellement est **29,99 $CA / mois + taxes applicables** (source de vérité : Stripe `STRIPE_PRO_MONTHLY_PRICE_ID`, `unit_amount = 2999`).

## 5. Nouveau modèle de commission

Commission dégressive : plus le professeur enseigne, moins la commission est élevée selon son volume annuel cumulé.

| Niveau | Volume annuel | Gratuit / Standard | Membre Pro |
|---|---:|---:|---:|
| Bronze | 0 $CA – 5 000 $CA | 15% | 5% |
| Argent | 5 000 $CA – 15 000 $CA | 14% | 4.5% |
| Or | 15 000 $CA – 30 000 $CA | 13% | 4% + 0.5% ristourne |
| Platine | 30 000 $CA+ | 12% | 3.5% + 1% ristourne |

## 6. Ristourne annuelle

La ristourne annuelle est décrite comme conditionnelle :

- 5 % des profits nets admissibles de la marketplace Pratiqo, à l'exclusion des profits générés par YoPratiqo et tout autre produit autonome distinct ;
- versée en janvier ;
- bassin plafonné à 150 000 $CA ;
- activée seulement si au moins 10 professeurs Pro sont éligibles ;
- maximum 10 000 $CA par professeur ;
- calcul selon le volume relatif ;
- aucune garantie de revenu minimum.

## 7. Points juridiques prioritaires

À valider par l'avocat :

- Loi sur la protection du consommateur du Québec : clarté des prix, remboursements, garanties commerciales, cours numériques.
- Loi 25 : profils, messages, avis, données d'apprentissage YoPratiqo, mineurs, partage éventuel des progrès avec professeurs.
- Statut de travailleur autonome des professeurs.
- Politique d'annulation et garantie satisfaction du premier cours.
- Politique de remboursement des modules YoPratiqo numériques.
- Flux Stripe / Stripe Connect : allocation des responsabilités, délais, retenues, rétrofacturations.
- Vérification d'identité et badges : éviter les allégations de sécurité ou de qualité non prouvées.
- Absence de garantie de revenus, élèves, réservations, classement, examens, immigration, emploi ou résultats.
- Protection des mineurs et cours à domicile.
- Expansion hors Canada, notamment Uruguay : conformité, paiements, fiscalité, marché non ouvert.
