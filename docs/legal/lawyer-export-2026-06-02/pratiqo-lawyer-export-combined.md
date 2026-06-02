# Export avocat combiné — Cours Pratiqo Inc. / Pratiqo

**Date** : 2026-06-02  
**Objet** : export interne complet pour révision avocat.  
**Statut** : document de travail, non publié, non approuvé juridiquement.

Ce fichier combine les sections séparées du dossier `docs/legal/lawyer-export-2026-06-02/` afin de faciliter l’envoi à un avocat ou la génération d’un PDF de révision.

---

# Fichier : README.md

# Export avocat — Pratiqo / Cours Pratiqo Inc.

**Date de l'export** : 2026-06-02

## Objet

Ce dossier regroupe les textes juridiques et les contenus adjacents à portée juridique ou commerciale afin de faciliter une revue par avocat après la mise à jour du modèle de commission à 15 % de base.

## Entité et marque

- **Nom légal** : Cours Pratiqo Inc.
- **Marque publique** : Pratiqo
- **Domaine public** : https://www.pratiqo.ca

## Courriels officiels

- support@pratiqo.ca
- info@pratiqo.ca
- marc-andre.theberge@pratiqo.ca

## Statut de ce dossier

Ce dossier est un **export interne pour revue avocat**. Il ne constitue pas un avis juridique et ne doit pas être publié tel quel sans approbation. Les pages et fichiers de production demeurent la source de vérité jusqu'à l'approbation et l'intégration des révisions juridiques.

## Contenu du dossier

1. `00_resume_executif_avocat.md` — résumé exécutif en français.
2. `01_cgu_conditions_utilisation.md` — CGU actuelles.
3. `02_politique_confidentialite.md` — politique de confidentialité actuelle.
4. `03_annulation_remboursements.md` — politique d'annulation et garantie premier cours.
5. `04_conditions_professeurs.md` — conditions applicables aux professeurs.
6. `05_membre_pro_commissions_ristourne.md` — Membre Pro, commissions et ristourne annuelle.
7. `06_code_conduite_securite.md` — code de conduite et sécurité.
8. `07_paiements_stripe_taxes.md` — paiements, Stripe, taxes, remboursements, versements.
9. `08_yopratiqo_modules_numeriques.md` — YoPratiqo et modules numériques.
10. `09_marketing_claims_a_risque.md` — affirmations marketing à valider.
11. `10_questions_pour_l_avocat.md` — questions de revue juridique.
12. `11_changelog_depuis_version_avocat_precedente.md` — changements majeurs depuis la version avocat précédente.
13. `pratiqo-lawyer-export-combined.md` — export combiné pour génération PDF.

## Routes légales canoniques exportées

- `/legal/cgu`
- `/legal/confidentialite`
- `/legal/annulation`
- `/legal/conditions-professeurs`
- `/legal/paiements-remboursements`
- `/legal/code-de-conduite`
- `/legal/membre-pro`
- `/legal/yo-remboursement`

Les anciennes routes légales courtes redirigent vers `/legal/*` et ne sont pas exportées comme textes juridiques distincts.


---

# Fichier : 00_resume_executif_avocat.md

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


---

# Fichier : 01_cgu_conditions_utilisation.md

# 01 — CGU / Conditions générales d'utilisation

> **Source route** : /legal/cgu
> **Source file(s)** : content/legal/terms.fr.md, app/(app)/legal/cgu/page.tsx
> **Note d'export** : Export du markdown français courant.
# Conditions Générales d'Utilisation — Pratiqo

**Version :** 1.0 · **Dernière mise à jour :** avril 2026

> ⚠️ **Important** : Ce document est un modèle préliminaire préparé à titre informatif. Il ne constitue pas un avis juridique. Cours Pratiqo Inc. recommande de le faire réviser par un avocat qualifié au Québec avant tout lancement commercial.

---

## 1. Présentation de Pratiqo

Pratiqo est une plateforme de mise en relation entre professeurs indépendants et élèves dans les domaines de la musique, de la danse, des arts martiaux, des langues secondes et d'autres disciplines d'apprentissage. La plateforme est exploitée par **Cours Pratiqo Inc.** (« Pratiqo »), société constituée selon les lois du Québec, Canada.

En accédant à la plateforme Pratiqo (site web et application mobile), vous acceptez d'être lié par les présentes Conditions Générales d'Utilisation (ci-après « CGU »).

---

## 2. Définitions

- **Plateforme** : le site web pratiqo.ca et l'application mobile Pratiqo
- **Utilisateur** : toute personne qui accède à la plateforme
- **Élève** : utilisateur qui recherche et réserve des cours
- **Professeur** : utilisateur qui offre des cours via la plateforme
- **Cours** : prestation d'enseignement réservée via la plateforme
- **Transaction** : paiement effectué via la plateforme pour un cours

---

## 3. Inscription et compte utilisateur

### 3.1 Conditions d'admissibilité

Pour utiliser Pratiqo, vous devez :

- Avoir au moins 18 ans, ou être mineur avec le consentement d'un parent ou tuteur légal
- Fournir des informations exactes et complètes lors de l'inscription
- Maintenir la confidentialité de vos identifiants de connexion

### 3.2 Responsabilité du compte

Vous êtes responsable de toutes les activités effectuées sous votre compte. Pratiqo ne peut être tenu responsable de tout accès non autorisé résultant de votre négligence.

### 3.3 Résiliation du compte

Pratiqo se réserve le droit de suspendre ou de résilier tout compte qui viole les présentes CGU, sans préavis.

---

## 4. Services offerts

### 4.1 Pour les élèves

- Recherche de professeurs par discipline, localisation et disponibilité
- Réservation et paiement de cours en ligne, en personne ou à domicile
- Accès aux devoirs et notes de progression partagés par le professeur
- Évaluation des professeurs après chaque cours

### 4.2 Pour les professeurs

- Création d'un profil public géolocalisé
- Gestion des disponibilités et de l'agenda
- Réception des paiements via la plateforme
- Partage de devoirs et suivi de progression des élèves
- Options de cours en ligne, en studio ou à domicile (dans un rayon défini)

---

## 4bis. Statut des professeurs — Travailleur autonome

> ⚠️ Les professeurs inscrits sur Pratiqo sont des **TRAVAILLEURS AUTONOMES** et NON des employés de Pratiqo.

À ce titre :

- Pratiqo agit **UNIQUEMENT comme intermédiaire technologique** mettant en relation élèves et professeurs
- Chaque professeur est **seul responsable** de déclarer ses revenus et de respecter ses obligations fiscales (TPS, TVQ, impôts personnels)
- Il n'existe **AUCUNE relation d'emploi** entre Pratiqo et les professeurs
- Aucune exclusivité n'est exigée — les professeurs peuvent enseigner sur d'autres plateformes
- Les professeurs fixent leurs propres tarifs, horaires et méthodes pédagogiques

---

## 4ter. Aucune garantie d'emploi ou de revenu

Pratiqo **NE PROMET PAS** et **NE GARANTIT PAS** :

- Un revenu minimum
- Un nombre minimum d'élèves ou de cours
- Une fréquence de réservations
- Un emploi ou une relation d'employeur

Les revenus dépendent uniquement de l'activité du professeur, de la qualité de son profil, de la satisfaction de ses élèves et de la demande dans sa région.

---

## 4quater. Obligations fiscales du professeur

En s'inscrivant sur Pratiqo, le professeur s'engage à :

- Déclarer ses revenus aux autorités fiscales (**Revenu Québec** et **Agence du Revenu du Canada**)
- Facturer la TPS/TVQ si applicable selon son chiffre d'affaires (seuil 30 000 $/an)
- Respecter les lois sur le travail autonome applicables dans sa juridiction
- Souscrire ses propres assurances responsabilité civile professionnelle
- Maintenir son équipement et son lieu d'enseignement
- Respecter le code de conduite Pratiqo

*Pratiqo ne fournit aucun conseil fiscal. Nous recommandons de consulter un comptable ou un conseiller fiscal qualifié.*

---

## 5. Frais, commissions et adhésions

Pratiqo peut percevoir des frais selon le service utilisé. La **nature et le montant** de chaque frais — qu'il s'agisse d'un frais de service pour les élèves, d'une commission sur les transactions, d'un frais de transaction, d'un frais d'abonnement, ou d'un autre frais — sont **clairement indiqués avant la confirmation d'une réservation, d'une souscription ou d'un paiement**, et peuvent être consultés dans la plateforme, le tableau de bord, la caisse, la page d'abonnement ou les modalités du forfait applicable.

- L'accès à la plateforme est généralement **gratuit pour les élèves**. Un **frais de service** peut s'ajouter au prix du cours et est affiché avant le paiement.
- Pratiqo peut prélever une **commission** sur les transactions de cours marketplace, au taux affiché dans la plateforme et applicable au compte concerné.
- Pratiqo peut offrir une **adhésion payante** (par exemple **Membre Pro**) donnant accès, lorsqu'elle est offerte, à des avantages économiques tels qu'une **commission réduite** ou une **structure de ristourne, de récompense ou de cashback**. Les modalités complètes — admissibilité, taux, plafonds, conditions de reprise, facturation, renouvellement et annulation — figurent dans les **[Conditions Membre Pro](/legal/membre-pro)**.
- Pratiqo peut offrir un **programme de fidélité, de crédits ou de récompenses** pour les élèves, les professeurs ou les deux. Les conditions, plafonds, durées de validité et modalités de calcul sont indiqués par la plateforme et **peuvent évoluer prospectivement**.
- Pratiqo peut **modifier ses tarifs et commissions prospectivement**, en informant les utilisateurs concernés conformément à la loi applicable.

Aucune disposition des présentes ne limite les droits impératifs des consommateurs en vertu de la **Loi sur la protection du consommateur** du Québec ou d'une autre loi d'ordre public.

---

---

## 6. Paiements, remboursements et versements

Tous les paiements sont traités par un **prestataire de paiement** (par exemple Stripe). Pratiqo **ne stocke pas** les informations complètes de carte de paiement.

Les **règles détaillées** applicables aux paiements, aux versements aux professeurs, aux remboursements, aux retenues, aux retards de versement, aux contestations et aux rétrofacturations sont régies par la **[Politique des paiements, remboursements et versements](/legal/paiements-remboursements)** et, pour les annulations de cours, par la **[Politique d'annulation](/legal/annulation)**. Les **modalités, fréquences, retenues éventuelles et délais** de versement applicables sont indiqués dans la plateforme ou dans la documentation correspondante, et peuvent évoluer prospectivement sous réserve de la loi applicable.

Pour l'**adhésion Membre Pro**, la facturation, le renouvellement, les remboursements et les éventuelles retenues sont régis par les **[Conditions Membre Pro](/legal/membre-pro)**.

Pour les achats **YoPratiqo** (cours autonomes en paiement unique), les conditions de remboursement et l'« accès à vie » sont décrits dans la **[Politique YoPratiqo](/legal/yo-remboursement)**.

---

## 6bis. YoPratiqo — Cours autonomes (paiement unique)

YoPratiqo regroupe les **cours autonomes en paiement unique** de Pratiqo (langues, voyage, etc.). Ces cours sont distincts du marketplace de cours individuels couvert au §6 ci-dessus : il s'agit d'un achat ponctuel donnant un **accès immédiat** au contenu acheté, avec **accès à vie** tel que défini ci-dessous et **garantie satisfaction de 30 jours**.

Toutes les modalités complètes — accès à vie, garantie 30 jours, droit de rétractation UE et règles applicables aux mineurs — sont consolidées dans la **[politique YoPratiqo dédiée](/legal/yo-remboursement)**. Les sous-sections suivantes en sont un résumé contractuel.

### 6bis.1 Statut juridique

L'achat d'un module YoPratiqo donne une **licence personnelle non transférable** d'accès au contenu, **liée au compte Pratiqo** de l'acheteur. Cours Pratiqo Inc. conserve l'intégralité des droits de propriété intellectuelle sur le module. *Voir [politique YoPratiqo §1](/legal/yo-remboursement).*

### 6bis.2 Accès à vie

L'« accès à vie » signifie un accès actif aussi longtemps que Pratiqo exploite le service YoPratiqo. En cas de discontinuation, **un préavis de 90 jours** est donné par courriel et un **remboursement au prorata** est offert aux acheteurs ayant payé dans les 12 derniers mois. *Voir [politique YoPratiqo §2](/legal/yo-remboursement).*

### 6bis.3 Garantie satisfaction 30 jours

Une garantie de remboursement s'applique pendant **30 jours civils** à compter de la date d'achat, à condition d'avoir complété **25 % ou moins** des leçons du module. Le remboursement est émis via Stripe sur le moyen de paiement original, taxes incluses, dans la devise originale de l'achat. *Voir [politique YoPratiqo §3](/legal/yo-remboursement).*

### 6bis.4 Acheteurs de l'Union européenne

Les acheteurs résidant dans l'Union européenne disposent d'un **droit de rétractation de 14 jours** (Directive 2011/83/UE et Directive (UE) 2019/770). Pour les contenus numériques livrés immédiatement, ce droit ne peut être levé que par un **consentement exprès** au moment de l'achat. À défaut, le droit de rétractation de 14 jours est intégralement préservé. *Voir [politique YoPratiqo §4](/legal/yo-remboursement).*

### 6bis.5 Mineurs

Au Québec, un mineur de moins de 14 ans ne peut pas conclure seul un contrat de consommation (Code civil du Québec art. 157) — l'achat d'un module YoPratiqo requiert une **autorisation parentale**. Un parent peut demander la rescision d'un achat non autorisé (art. 163), avec remboursement complet hors des conditions du §6bis.3. *Voir [politique YoPratiqo §5](/legal/yo-remboursement).*

---

## 7. Cours à domicile et en personne

Pratiqo agit comme **intermédiaire technologique** mettant en relation élèves, parents et professeurs. La **sécurité** des cours dispensés en personne — au domicile de l'élève, dans un lieu désigné par le professeur, ou dans un lieu public — relève en premier lieu des participants.

Les **règles applicables** (lieux sécuritaires, présence ou disponibilité d'un parent ou tuteur lors d'un cours impliquant un mineur, droit du professeur de refuser un lieu non sécuritaire, signalement des incidents, communications sur la plateforme lorsque cela est raisonnablement possible) sont décrites dans les **[Conditions applicables aux professeurs](/legal/conditions-professeurs)** et dans le **[Code de conduite](/legal/code-de-conduite)**.

---

## 8. Contenu et conduite des utilisateurs

Il est interdit de publier sur Pratiqo tout contenu faux, trompeur, discriminatoire, harcelant, portant atteinte aux droits d'auteur, ou contenant des logiciels malveillants.

Il est strictement interdit d'inciter les élèves à effectuer des paiements en dehors de la plateforme. Toute violation peut entraîner la suspension définitive du compte.

---

## 9. Propriété intellectuelle

Tous les éléments de la plateforme sont la propriété exclusive de Cours Pratiqo Inc. et sont protégés par les lois sur le droit d'auteur.

---

## 10. Limitation de responsabilité

Pratiqo ne peut être tenu responsable de la qualité des cours, des incidents survenant lors des cours, des pertes de données ou des dommages indirects.

La responsabilité de Pratiqo est limitée au montant des frais de service perçus au cours des 3 derniers mois.

---

## 11. Protection des données personnelles (LPRPDE / Loi 25)

Pratiqo collecte et traite vos données conformément à la **LPRPDE** et à la **Loi 25** du Québec. Pour plus d'informations, consultez notre Politique de confidentialité.

---

## 12. Droit applicable et juridiction

Les présentes CGU sont régies par les lois de la **province de Québec** et les lois fédérales du **Canada**. Tout litige sera soumis à la compétence exclusive des tribunaux du district judiciaire de **Montréal, Québec**.

---

## 13. Modifications des CGU

Pratiqo se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle par courriel avec un préavis de **30 jours**.

---

## 14. Contact

**Cours Pratiqo Inc.** — Saint-Georges, Québec, Canada  
soutien : [`support@pratiqo.ca`](mailto:support@pratiqo.ca)  
général : [`info@pratiqo.ca`](mailto:info@pratiqo.ca)  
avis formels : [`marc-andre.theberge@pratiqo.ca`](mailto:marc-andre.theberge@pratiqo.ca)  
site web : [pratiqo.ca](https://pratiqo.ca)

---

*Ce document a été rédigé en français conformément à la Charte de la langue française du Québec.*


---

# Fichier : 02_politique_confidentialite.md

# 02 — Politique de confidentialité

> **Source route** : /legal/confidentialite
> **Source file(s)** : content/legal/confidentialite.fr.md, app/(app)/legal/confidentialite/page.tsx
> **Note d'export** : Export du markdown français courant.
# Politique de confidentialité — Pratiqo

**Version :** 2.0 · **Dernière mise à jour :** mai 2026

> ⚠️ **Important** : Le présent document est un modèle préliminaire à faire réviser par un avocat québécois en protection des renseignements personnels avant le lancement. Il complète les autres documents juridiques applicables et ne constitue pas un avis juridique. En cas de divergence avec une loi d'ordre public — notamment la *Loi sur la protection des renseignements personnels dans le secteur privé* (RLRQ, c. P-39.1, dite « Loi 25 ») et la *Loi sur la protection des renseignements personnels et les documents électroniques* (LPRPDE) — c'est la loi qui prévaut.

---

## 1. Objet et portée

La présente politique de confidentialité (la « **Politique** ») décrit comment **Cours Pratiqo Inc.** (« **Pratiqo** », « nous », « notre »), exploitant la plateforme **Pratiqo**, **recueille, utilise, communique, conserve, protège et détruit** les renseignements personnels.

Elle s'applique :

- aux **élèves**, **professeurs**, **parents et tuteurs légaux**, **visiteurs** et autres utilisateurs de Pratiqo;
- aux activités de la **marketplace** (profils des professeurs, recherche, mise en relation, réservations, cours en ligne ou en personne, messagerie, paiements, versements, avis, soutien, sécurité);
- au produit d'apprentissage autonome **YoPratiqo** lorsque l'utilisateur y accède.

La Politique **complète** les autres documents juridiques mentionnés à la section 22 et n'écarte aucun droit impératif d'un consommateur, d'un travailleur autonome ou d'un parent.

---

## 2. Personne responsable de la protection des renseignements personnels

Conformément à l'article 3.1 de la Loi 25, **Cours Pratiqo Inc.** désigne la personne suivante comme **responsable de la protection des renseignements personnels** :

> **Marc-André Théberge**
> *Cours Pratiqo Inc.*
> [`marc-andre.theberge@pratiqo.ca`](mailto:marc-andre.theberge@pratiqo.ca)

Vous pouvez contacter cette personne pour, **selon le cas et la loi applicable** :

- poser une question relative à la vie privée;
- demander l'**accès** à vos renseignements personnels;
- demander la **rectification** d'un renseignement inexact, incomplet ou équivoque;
- **retirer un consentement** lorsque cela est permis;
- déposer une **plainte** ou demander un examen interne.

Pour les questions générales, vous pouvez aussi écrire à [`info@pratiqo.ca`](mailto:info@pratiqo.ca). Pour les questions de soutien : [`support@pratiqo.ca`](mailto:support@pratiqo.ca).

---

## 3. Catégories de renseignements personnels recueillis

Selon votre interaction avec Pratiqo, nous pouvons recueillir, **directement de vous ou de manière automatique**, les catégories suivantes :

- **Compte** : nom, adresse courriel, numéro de téléphone, identifiants d'authentification, locale, fuseau horaire.
- **Profil** : pour les professeurs, biographie, disciplines, spécialités, langues, photo, expérience, et tout titre, certificat ou crédit volontairement fournis.
- **Élève / cours** : objectifs d'apprentissage, niveau, matières sélectionnées, préférences de cours, détails des réservations.
- **Parent ou tuteur légal** : nom, coordonnées et contexte de la relation, lorsque l'utilisateur est mineur ou que le parent réserve pour le mineur.
- **Localisation** : ville, zone approximative, zone de service, adresse utilisée pour les cours en personne, et lieu privé enregistré, le cas échéant.
- **Communications** : messages échangés sur la plateforme, demandes de soutien, **avis et évaluations**, signalements et pièces jointes connexes.
- **Paiements et transactions** : montants, références de réservation, statut du paiement, reçus, renseignements de versement et **métadonnées limitées de paiement** (par exemple les quatre derniers chiffres et la marque de la carte). Pratiqo **ne stocke pas** les numéros de carte complets, qui sont traités par le prestataire de paiement.
- **Identité et vérification** *(le cas échéant)* : **statut** d'une vérification, métadonnées et résultat fourni par un prestataire externe. Pratiqo **ne prétend pas** vérifier de manière universelle l'identité ou les diplômes de tous les utilisateurs.
- **Renseignements techniques** : adresse IP, identifiant et type d'appareil, données de navigateur, journaux, **témoins** (cookies), événements analytiques et de sécurité.
- **YoPratiqo / apprentissage autonome** *(le cas échéant)* : progression dans les modules, activité de quiz, complétion, préférences d'apprentissage.
- **Préférences et consentements** : préférences de communication, choix de témoins lorsqu'un mécanisme est offert, et **registres de consentement** lorsque cela est requis par la loi.

Nous ne recherchons pas activement de **renseignements sensibles** (par exemple, santé, origine, opinions politiques) et vous demandons de **ne pas en publier** dans des champs publics ou des messages.

---

## 4. Finalités de la collecte et de l'utilisation

Sous réserve de la loi applicable, nous utilisons vos renseignements personnels pour :

- **créer et gérer votre compte** et permettre l'authentification;
- **mettre en relation** élèves et professeurs et **afficher les profils** ainsi que les résultats de recherche;
- **gérer les réservations**, les cours, les annulations, les remboursements, les paiements, les versements, les reçus, le soutien et les ajustements;
- faciliter la **communication** entre utilisateurs (élèves, professeurs, parents/tuteurs, soutien);
- **personnaliser** l'expérience, la langue et la locale, la mise en correspondance, les recommandations et l'expérience d'apprentissage YoPratiqo;
- assurer la **sécurité**, l'**admissibilité**, la **prévention de la fraude et des abus**, et l'**intégrité de la plateforme**;
- **traiter les litiges**, les signalements, les rétrofacturations, les obligations légales et l'application des règles;
- **améliorer le produit**, l'analytique, le débogage, la sécurité et la fiabilité;
- envoyer des **messages transactionnels** et, **avec le consentement requis le cas échéant**, des **communications marketing**;
- respecter nos **obligations légales, fiscales, comptables, réglementaires et contractuelles**.

Les renseignements personnels ne sont pas utilisés à des fins incompatibles avec celles décrites ci-dessus, sauf consentement ou autorisation prévue par la loi.

---

## 5. Consentement et fondement légal

Nous recueillons, utilisons ou communiquons vos renseignements personnels **avec votre consentement** lorsque cela est requis ou **autrement permis par la loi applicable**.

- Le consentement peut être **exprès ou implicite** selon le contexte et la nature des renseignements.
- Pour les renseignements **sensibles**, nous cherchons un **consentement exprès** lorsque la loi l'exige.
- Vous pouvez **retirer votre consentement** dans la mesure permise par la loi. Le retrait peut **limiter** ou rendre impossibles certaines fonctionnalités (par exemple, exécution d'un cours déjà payé, obligations comptables ou fiscales en cours).
- D'autres **fondements** peuvent s'appliquer, dont l'exécution d'un contrat, le respect d'une obligation légale, la prévention de la fraude, la sécurité, l'intérêt légitime ou un autre fondement reconnu par la loi applicable.

---

## 6. Renseignements concernant les mineurs

Pratiqo peut être utilisée pour des cours impliquant des **mineurs** comme élèves.

- Selon l'âge, le contexte et la loi applicable, l'**implication d'un parent ou d'un tuteur légal** peut être requise pour la création du compte, la réservation, le paiement ou la communication.
- Nous **n'encourageons pas** les communications dissimulées entre adultes et mineurs sur la plateforme; voir le **[Code de conduite](/legal/code-de-conduite)**.
- Un parent ou tuteur légal peut **contacter** la personne responsable de la protection des renseignements personnels pour toute question, demande d'accès, de rectification ou de suppression concernant un mineur, dans la mesure permise par la loi.

Nous évitons d'invoquer des **seuils d'âge précis** dans la présente Politique, sauf lorsque cela est explicitement encadré ailleurs sur la plateforme. Tout seuil applicable est, le cas échéant, communiqué dans les outils de configuration appropriés.

---

## 7. Témoins, analytique et technologies similaires

Pratiqo utilise des **témoins** (cookies), du **stockage local** et des technologies similaires pour faire fonctionner et sécuriser la plateforme. Selon le cas, nous pouvons utiliser :

- des **témoins essentiels** (authentification, session, sécurité, équilibrage de charge);
- des **témoins de préférences et de localisation** (langue, fuseau horaire, devise affichée);
- des **témoins d'analytique et de performance** (mesure d'utilisation agrégée, dépannage);
- des **témoins de sécurité et de prévention de la fraude**;
- des **témoins marketing** **uniquement** lorsqu'ils sont utilisés et avec le **consentement requis** par la loi applicable.

Vous pouvez configurer votre **navigateur** pour bloquer ou supprimer certains témoins. Lorsque la plateforme propose des contrôles dédiés (par exemple, un panneau de préférences), ils sont mis à votre disposition à mesure qu'ils sont déployés. Désactiver certains témoins peut limiter ou empêcher l'usage de certaines fonctionnalités.

---

## 8. Prestataires tiers

Nous faisons appel à des **prestataires de services** qui, selon le cas, agissent pour notre compte ou sous leurs propres conditions. Catégories typiques :

- **Prestataires de paiement** (par exemple **Stripe**) pour la collecte des paiements, les versements et les fonctions associées.
- **Hébergement, base de données et stockage**.
- **Authentification** (par exemple connexion par identifiants externes lorsqu'elle est offerte).
- **Courriel et notifications** (transactionnels et opérationnels).
- **Analytique, surveillance et journalisation des erreurs**.
- **Cartographie, autocomplétion d'adresse et localisation** (par exemple services Google lorsqu'ils sont utilisés).
- **Vérification d'identité** (par exemple **Stripe Identity**) lorsqu'elle est utilisée.
- **Outils de soutien à la clientèle et outils opérationnels**.

Selon le service, le prestataire peut traiter vos renseignements **pour le compte de Pratiqo** ou **selon ses propres conditions**, notamment pour la conformité, la sécurité ou la lutte contre la fraude. Nous **sélectionnons** des prestataires offrant des garanties raisonnables et utilisons des engagements contractuels lorsque cela est requis.

---

## 9. Communication et divulgation des renseignements personnels

Nous pouvons communiquer vos renseignements personnels :

- **entre élèves et professeurs** dans la mesure nécessaire pour réserver, exécuter, ajuster ou annuler un cours;
- à un **parent ou tuteur légal**, lorsque cela est approprié et permis par la loi;
- à nos **prestataires de services** (voir section 8);
- aux **prestataires de paiement** et **institutions financières** dans la mesure requise pour traiter les paiements, versements, remboursements, contestations ou rétrofacturations;
- pour **examiner** un litige, un signalement de sécurité, une fraude, une violation de politique ou une enquête interne;
- pour **se conformer** à la loi, à une décision judiciaire, à une demande d'autorité compétente, à une obligation fiscale ou comptable ou à toute autre obligation légale applicable;
- dans le cadre d'une **opération d'entreprise** (financement, fusion, acquisition, réorganisation, vente d'actifs ou faillite), sous réserve de **garanties appropriées**;
- avec votre **consentement** ou autrement lorsque la loi le permet.

Nous **ne vendons pas** vos renseignements personnels à des tiers à des fins marketing.

---

## 10. Profils publics et avis

Les profils des **professeurs** sont conçus pour être consultables par d'autres utilisateurs et, le cas échéant, **publics**.

- L'information visible peut inclure, selon la configuration : nom d'affichage, photo, discipline, ville ou zone, biographie, expérience, langues, **note moyenne et avis**, plages de disponibilité et de tarif.
- Les **avis** publiés peuvent être visibles selon les règles de la plateforme et le **[Code de conduite](/legal/code-de-conduite)**.
- **N'écrivez pas** de renseignements sensibles, personnels d'un tiers ou identifiants permettant un contact privé (numéro de téléphone, adresse complète, courriel personnel) dans des champs **publics** (profil, avis, biographie).
- Pratiqo peut, à sa discrétion et conformément aux règles de la plateforme, **masquer** ou **abréger** publiquement certains champs (par exemple, n'afficher que le prénom ou un nom d'affichage) pour des raisons de sécurité.

---

## 11. Localisation et confidentialité des cours en personne

Les **cours en personne** peuvent nécessiter le partage d'une **adresse** ou d'un **lieu de rencontre**.

- Pratiqo peut afficher une **localisation approximative** ou une **zone de service** plutôt qu'une adresse exacte pour la **recherche** et la **mise en correspondance**.
- L'**adresse exacte** ne devrait être partagée qu'**au moment et dans la mesure nécessaires** pour la logistique du cours.
- **Ne publiez pas** d'adresse personnelle dans un champ public (profil, biographie, avis).
- Pour les cours impliquant un **mineur**, des règles supplémentaires de sécurité s'appliquent — voir le **[Code de conduite](/legal/code-de-conduite)**.

---

## 12. Conservation et destruction

Nous conservons vos renseignements personnels **uniquement aussi longtemps que raisonnablement nécessaire** aux finalités décrites à la section 4, ainsi que pour :

- respecter les **obligations légales, fiscales, comptables et contractuelles**;
- **résoudre** des litiges, des signalements ou des rétrofacturations;
- assurer la **sécurité**, prévenir la **fraude** et appliquer nos politiques;
- maintenir des **sauvegardes** et la continuité du service.

Les **durées de conservation** varient selon la nature des renseignements (par exemple, données de compte, journaux techniques, données de transaction, communications de soutien). Lorsque la conservation n'est plus nécessaire, les renseignements sont **détruits, supprimés, anonymisés ou dépersonnalisés**, sous réserve de contraintes légales ou techniques (par exemple, sauvegardes faisant l'objet d'une rotation ordonnée).

Nous évitons d'inscrire des **durées exactes** dans la présente Politique sauf lorsqu'elles sont fixées par la loi ou par une source de référence interne.

---

## 13. Mesures de sécurité

Nous mettons en œuvre des **mesures administratives, techniques et organisationnelles raisonnables** pour protéger les renseignements personnels, notamment :

- **contrôles d'accès** et **authentification**;
- **chiffrement en transit** lorsque cela s'applique;
- **rôles et privilèges restreints** (principe du moindre privilège);
- **surveillance et journalisation** des événements pertinents;
- **sélection** de prestataires offrant des garanties raisonnables;
- **mises à jour** régulières et gestion des vulnérabilités.

**Aucun système n'est totalement sûr.** Nous ne pouvons garantir une sécurité absolue. Vous nous aidez en :

- protégeant vos **identifiants** et mots de passe;
- utilisant l'**authentification à deux facteurs** lorsqu'elle est offerte;
- **signalant** rapidement toute activité suspecte à [`support@pratiqo.ca`](mailto:support@pratiqo.ca).

---

## 14. Incidents de confidentialité

Pratiqo a un **processus interne** pour la gestion des **incidents de confidentialité** mettant en cause des renseignements personnels.

Lorsqu'un incident est constaté, nous pouvons, **selon le cas et dans la mesure permise ou requise par la loi** :

- prendre des **mesures raisonnables** pour réduire le risque et limiter l'impact;
- **enquêter** sur la cause et la portée de l'incident;
- **tenir un registre** des incidents lorsque la loi l'exige;
- **aviser** les personnes concernées et la **Commission d'accès à l'information** lorsque cela est requis par la loi;
- prendre des **mesures correctives** pour prévenir une récurrence.

Si vous croyez qu'un incident vous concerne, **écrivez à** [`marc-andre.theberge@pratiqo.ca`](mailto:marc-andre.theberge@pratiqo.ca) avec un résumé factuel.

---

## 15. Évaluation des facteurs relatifs à la vie privée et gouvernance

Pratiqo peut réaliser des **évaluations des facteurs relatifs à la vie privée (ÉFVP)** pour certains projets, notamment lors de la **création** ou de la **modification substantielle** d'un système d'information ou d'une prestation électronique de services qui implique des renseignements personnels, lorsque cela est applicable.

Nous maintenons des **pratiques de gouvernance** **proportionnées à la taille et aux activités** de l'entreprise, qui peuvent comprendre :

- des **rôles et responsabilités** internes pour la protection des renseignements personnels;
- des règles de **conservation et de destruction**;
- un **processus de plainte** et un canal de communication interne;
- des **mesures de sécurité** et de gestion des incidents;
- des **engagements contractuels** avec les prestataires.

Le programme interne de gouvernance évolue à mesure que la plateforme se développe; les présentes ne constituent pas une attestation de conformité finale.

---

## 16. Vos droits

**Sous réserve de la loi applicable**, vous pouvez avoir, notamment, les droits suivants à l'égard de vos renseignements personnels :

- **Accès** : obtenir une copie des renseignements que nous détenons sur vous;
- **Rectification** : corriger les renseignements inexacts, incomplets ou équivoques;
- **Retrait du consentement** : lorsque le consentement constitue le fondement du traitement et où la loi le permet;
- **Suppression / désactivation** : dans la mesure permise par la loi et compte tenu des limites légales et opérationnelles;
- **Portabilité** : demander que certains renseignements vous soient communiqués dans un format technologique structuré et couramment utilisé, lorsque cela est exigé ou raisonnablement faisable;
- **Renseignements** sur les **fins**, les **destinataires** et les **délais de conservation**;
- **Plainte** : auprès de la personne responsable et, **au Québec**, auprès de la **Commission d'accès à l'information**.

**Comment exercer un droit** : écrivez à [`marc-andre.theberge@pratiqo.ca`](mailto:marc-andre.theberge@pratiqo.ca) en décrivant la nature de votre demande. Nous pouvons devoir **vérifier votre identité** avant d'y donner suite. Nous nous efforçons de répondre dans les **délais prévus par la loi applicable**.

---

## 17. Transferts hors Québec ou hors Canada

Certains de nos **prestataires** peuvent **stocker ou traiter** des renseignements personnels **à l'extérieur du Québec** ou **du Canada**, notamment aux États-Unis ou dans l'Union européenne.

- Avant un transfert hors Québec lorsqu'une évaluation est requise par la loi applicable, Pratiqo procède à une **évaluation des facteurs** et **met en place des mesures contractuelles ou organisationnelles** raisonnables.
- Les renseignements transférés peuvent être **soumis aux lois étrangères** et **accessibles aux autorités étrangères** dans la mesure permise par ces lois.
- Pratiqo ne promet pas que toutes les données restent en permanence au Québec ou au Canada.

Pour des précisions sur la **localisation** des principales catégories de traitement, vous pouvez écrire à la personne responsable.

---

## 18. Décisions automatisées, mise en correspondance, recommandations et IA

Pratiqo peut utiliser des **algorithmes**, des **filtres**, du **classement**, de la **recherche**, des **recommandations** ou des **outils assistés par intelligence artificielle** pour, notamment :

- **mettre en correspondance** élèves et professeurs;
- aider à la **rédaction** ou à la **classification** de profils, de descriptions ou de contenus;
- **personnaliser** l'expérience d'apprentissage YoPratiqo;
- **détecter** la fraude, les abus ou les violations de politique;
- soutenir les opérations internes.

À ce jour, ces outils **assistent** Pratiqo et ses utilisateurs et ne constituent **pas systématiquement des décisions exclusivement automatisées** ayant des effets juridiques importants. Lorsque la loi applicable encadre les décisions automatisées, vous pouvez **demander des renseignements** à la personne responsable et, **dans la mesure prévue par la loi**, demander la révision par un humain ou présenter des observations.

L'usage des outils d'IA disponibles sur la plateforme **ne doit pas** servir à soumettre des **diplômes, vérifications ou avis fictifs** ni à produire des contenus trompeurs — voir le **[Code de conduite](/legal/code-de-conduite)** et les **[Conditions applicables aux professeurs](/legal/conditions-professeurs)**.

---

## 19. Communications marketing

- Vous pouvez recevoir des **messages transactionnels et de service** liés à votre compte et à vos cours (confirmations, rappels, mises à jour de sécurité, factures, avis légaux); ces messages **ne nécessitent pas** de consentement marketing distinct.
- Les **messages promotionnels** (infolettre, offres, lancements) peuvent **requérir votre consentement** lorsque cela est exigé par la **Loi canadienne anti-pourriel (LCAP)** ou par toute autre loi applicable.
- Vous pouvez **vous désabonner** des messages promotionnels en suivant le lien fourni dans le message ou en écrivant à [`support@pratiqo.ca`](mailto:support@pratiqo.ca).
- Le **désabonnement marketing** **n'arrête pas** les messages transactionnels nécessaires à la prestation du service.

---

## 20. Mineurs, signalements de sécurité et divulgations légales

La protection de la vie privée peut **interagir** avec nos obligations en matière de sécurité, énoncées dans le **[Code de conduite](/legal/code-de-conduite)**.

Pratiqo peut, **dans la mesure permise ou requise par la loi**, **conserver, examiner ou divulguer** des renseignements personnels lorsque cela est nécessaire pour :

- **protéger un mineur** ou une personne vulnérable;
- **protéger la sécurité** des utilisateurs ou de la plateforme;
- **respecter** la loi, une décision judiciaire, une demande d'autorité compétente ou une obligation déclarative;
- **prévenir** un dommage grave imminent.

Nous traitons ces situations avec sérieux et **proportion**, sans alarmisme.

---

## 21. Modifications de la politique

Nous pouvons **modifier** la présente Politique de temps à autre.

- La date d'**entrée en vigueur** et de **dernière mise à jour** est indiquée en tête de document.
- Les **modifications importantes** peuvent être communiquées par les moyens prévus par la loi applicable, par exemple par courriel, par avis dans la plateforme ou sur la page de la Politique.
- L'**utilisation continue** de Pratiqo après une modification peut être traitée comme prévu par la loi applicable.

Les versions antérieures peuvent être conservées à titre d'archive interne.

---

## 22. Contact

**Cours Pratiqo Inc.** — Saint-Georges, Québec, Canada

- Personne responsable de la protection des renseignements personnels : **Marc-André Théberge** — [`marc-andre.theberge@pratiqo.ca`](mailto:marc-andre.theberge@pratiqo.ca)
- Soutien : [`support@pratiqo.ca`](mailto:support@pratiqo.ca)
- Général : [`info@pratiqo.ca`](mailto:info@pratiqo.ca)

**Lien avec les autres politiques.** La présente Politique doit être lue conjointement avec :

- les **[Conditions Générales d'Utilisation](/legal/cgu)** (« CGU »);
- les **[Conditions applicables aux professeurs](/legal/conditions-professeurs)**;
- la **[Politique d'annulation](/legal/annulation)**;
- le **[Code de conduite](/legal/code-de-conduite)**;
- la **[Politique des paiements, remboursements et versements](/legal/paiements-remboursements)**;
- les **[Conditions Membre Pro](/legal/membre-pro)**;
- la **[Politique de remboursement YoPratiqo](/legal/yo-remboursement)**.

En cas de divergence entre la présente Politique et un autre document Pratiqo sur une question administrative, contractuelle ou financière, le document **spécifique à cette question** s'applique, sous réserve du droit applicable d'ordre public. Aucune disposition des présentes ne limite les droits qui ne peuvent pas être valablement écartés par contrat (notamment ceux de la **Loi 25**, de la **LPRPDE** et de la **Loi sur la protection du consommateur** du Québec).

---

*Ce document a été rédigé en français conformément à la Charte de la langue française du Québec. Une version anglaise et une version espagnole sont disponibles à titre de traduction de courtoisie.*


---

# Fichier : 03_annulation_remboursements.md

# 03 — Annulation, remboursements et garantie premier cours

> **Source route** : /legal/annulation
> **Source file(s)** : app/(app)/legal/annulation/page.tsx
> **Note d'export** : Cette page est actuellement en TSX plutôt qu'en markdown. L'export ci-dessous reformate le contenu lisible de la page sans modifier la page de production.

# Politique d'annulation et de remboursement — Pratiqo

**Dernière mise à jour affichée** : avril 2026

## 1. Annulation par l'élève

| Délai avant le cours | Remboursement |
|---|---|
| Plus de 24 heures | 100 % — remboursement complet ou crédit Pratiqo complet |
| Moins de 24 heures | Crédit Pratiqo possible ; remboursement examiné selon la situation |
| No-show (absent sans annulation) | Aucun remboursement, sauf force majeure ou décision du support |

Cette politique s'applique sous réserve des lois applicables en matière de protection du consommateur.

### 1.1 Comment annuler

- Via l'application Pratiqo : Mon compte → Mes réservations → Annuler.
- Par courriel : support@pratiqo.ca, avec le numéro de réservation.

### 1.2 Circonstances exceptionnelles

En cas d'urgence médicale ou de force majeure (maladie grave, décès familial, catastrophe naturelle), Pratiqo peut accorder un remboursement à sa discrétion. Une preuve peut être demandée.

## 2. Annulation par le professeur

| Situation | Conséquence pour le professeur |
|---|---|
| Annulation plus de 24 h avant | Aucune pénalité |
| Annulation moins de 24 h avant | Avertissement — 3 avertissements = suspension |
| No-show sans annulation | Suspension immédiate possible |

Si le professeur annule, l'élève reçoit un remboursement complet ou un crédit Pratiqo complet.

## 3. Reprogrammer un cours

Reprogrammer un cours est différent de l'annuler. L'élève et le professeur s'entendent ensemble sur un nouveau créneau.

### 3.1 Plus de 24 h avant le cours

- Annuler ce cours (remboursement 100 %) puis réserver un nouveau créneau.
- Discuter via la messagerie pour convenir d'un nouveau créneau sans frais supplémentaire.

### 3.2 Moins de 24 h avant le cours

Reprogrammer reste possible uniquement si les deux parties sont d'accord. La procédure affichée demande d'écrire dans la messagerie Pratiqo, puis de contacter support@pratiqo.ca avec le numéro de réservation et la nouvelle date convenue. L'équipe mettra la réservation à jour sous 24 h.

Si aucun accord mutuel n'est trouvé, la politique d'annulation s'applique.

### 3.3 Cas particuliers

Pour les urgences ou cas de force majeure, contacter support@pratiqo.ca, peu importe le délai.

## 4. Cours à domicile

Les mêmes règles s'appliquent avec une condition supplémentaire :

- Si le professeur refuse le déplacement après avoir accepté la demande : remboursement complet à l'élève et avertissement au professeur.
- Si l'élève fournit une adresse incorrecte ou inaccessible : aucun remboursement.

## 5. Garantie satisfaction du premier cours

Pratiqo offre une garantie satisfaction sur le tout premier cours terminé d'un élève sur la plateforme. Cette garantie vise à faciliter le premier contact avec un professeur sans risque perçu.

### 5.1 Fonctionnement

- Garantie applicable uniquement au premier cours terminé sur le compte de l'élève.
- Demande à déposer dans les 24 heures suivant la fin du cours.
- Demande depuis Mes paiements et reçus, ou par courriel à support@pratiqo.ca.
- Une seule demande de garantie premier cours possible par compte.

### 5.2 Examen de la demande

La demande ouvre un dossier de résolution traité manuellement par l'équipe Pratiqo. Le versement au professeur peut être mis en attente durant l'examen. L'équipe peut contacter l'élève et le professeur avant toute décision. Aucune décision automatique : chaque dossier est examiné individuellement selon les faits.

### 5.3 Limites

- Garantie non applicable si le cours est marqué comme absence côté élève.
- Pratiqo peut refuser une demande manifestement abusive.
- La garantie porte sur la satisfaction de l'élève vis-à-vis de la prestation. Elle ne constitue pas une garantie de résultat pédagogique ni une évaluation de la qualité du professeur.

## 6. Délais de remboursement

- Remboursements traités dans les 5 à 10 jours ouvrables.
- Remboursement sur la carte de crédit originale.
- Les frais de service ou commissions Pratiqo applicables sont également remboursés en cas d'annulation éligible.

## 7. Litiges

Tout litige concernant un remboursement doit être signalé dans les 7 jours suivant le cours via support@pratiqo.ca ou https://www.pratiqo.ca/contact.

La page actuelle indique : « Pratiqo agit comme arbitre de bonne foi et sa décision est finale. »

**À valider par l'avocat** : opposabilité de cette formulation, surtout en contexte consommateur et Loi sur la protection du consommateur.

## 8. Contact

- support@pratiqo.ca
- https://www.pratiqo.ca/contact


---

# Fichier : 04_conditions_professeurs.md

# 04 — Conditions applicables aux professeurs

> **Source route** : /legal/conditions-professeurs
> **Source file(s)** : content/legal/conditions-professeurs.fr.md, app/(app)/legal/conditions-professeurs/page.tsx
> **Note d'export** : Export du markdown français courant.
# Conditions applicables aux professeurs — Pratiqo

**Version :** 1.0 · **Dernière mise à jour :** mai 2026

> ⚠️ **Important** : Ce document complète les Conditions Générales d'Utilisation de Pratiqo et s'applique aux professeurs, tuteurs, instructeurs, mentors et autres prestataires qui offrent des cours par l'intermédiaire de Pratiqo. Il ne constitue pas un avis juridique.

---

## 1. Identification de l'exploitant

**Cours Pratiqo Inc.** (« Pratiqo ») exploite la plateforme Pratiqo, un service de mise en relation entre élèves, parents et professeurs indépendants.

Les présentes conditions doivent être lues avec les **[Conditions Générales d'Utilisation](/legal/cgu)**, la **[Politique de confidentialité](/legal/confidentialite)**, la **[Politique d'annulation](/legal/annulation)** et le **[Code de conduite](/legal/code-de-conduite)**.

---

## 2. Portée des présentes conditions

Les présentes conditions s'appliquent à toute personne qui offre, annonce, organise ou livre des services d'enseignement, de tutorat, de mentorat, de coaching pédagogique ou de formation par l'intermédiaire de Pratiqo.

Dans ce document, le terme **« professeur »** désigne aussi les tuteurs, instructeurs, mentors et autres prestataires de services d'apprentissage qui utilisent Pratiqo.

---

## 3. Statut de travailleur autonome

Le professeur agit comme **prestataire indépendant**. Il n'est pas un employé, mandataire, associé, franchisé, agent ou coentrepreneur de Cours Pratiqo Inc.

- Pratiqo est une plateforme de marché et un intermédiaire technologique.
- Le professeur contrôle ses méthodes pédagogiques, ses disponibilités, ses tarifs lorsque la plateforme le permet, son organisation de travail et ses obligations fiscales.
- Aucune disposition des présentes conditions ne crée une relation d'emploi, de partenariat, d'agence, de franchise ou de coentreprise entre le professeur et Cours Pratiqo Inc.
- Le professeur demeure responsable de son matériel, de son environnement d'enseignement et de sa conformité légale.

---

## 4. Aucune garantie de revenu, d'élèves, de réservations, de classement ou de visibilité

Pratiqo ne garantit pas :

- un nombre d'élèves;
- un volume de réservations;
- un revenu minimum ou régulier;
- un rang dans les résultats de recherche;
- un nombre de vues du profil;
- un taux de conversion;
- un résultat commercial, pédagogique ou financier.

La visibilité d'un profil peut varier selon la demande, la localisation, les disponibilités, la pertinence, la qualité du profil, les évaluations, la réactivité, les politiques de sécurité et d'autres facteurs qui peuvent évoluer.

---

## 5. Exactitude du profil professeur

Le professeur doit fournir des renseignements exacts, actuels et non trompeurs.

Cela inclut notamment :

- son nom réel ou son identité professionnelle exacte;
- ses disciplines, niveaux, compétences, expérience et méthodes;
- ses prix, formats de cours, disponibilités et zones de service;
- ses lieux d'enseignement et options en ligne ou à domicile;
- ses diplômes, certifications, licences ou affiliations lorsqu'ils sont affichés.

Les diplômes, certifications et titres professionnels affichés doivent être réels. Pratiqo peut demander des documents justificatifs. Une expérience autodéclarée ne doit jamais être présentée comme vérifiée par Pratiqo, sauf si Pratiqo l'a expressément vérifiée.

---

## 6. Identifiants, vérifications et avertissement sur les signaux de confiance

Les signaux affichés sur Pratiqo ont des significations distinctes :

- **Identité vérifiée** : Pratiqo ou un prestataire de vérification a confirmé certains éléments d'identité.
- **Diplôme vérifié** : un diplôme ou justificatif précis a été examiné selon le processus applicable.
- **Expérience autodéclarée** : le professeur a fourni l'information, mais elle n'est pas nécessairement vérifiée.
- **Profil complet** : certaines informations de profil sont remplies.
- **Plan payant ou Membre Pro** : il s'agit d'un statut produit ou commercial (par exemple, l'adhésion Membre Pro), non d'une certification de qualité.

Ces signaux ne garantissent pas la qualité pédagogique, les résultats d'apprentissage, la sécurité absolue, la disponibilité future du professeur ni l'absence de plainte.

---

## 7. Obligations du professeur

Le professeur s'engage à :

- livrer les cours avec professionnalisme, préparation et ponctualité;
- respecter les horaires confirmés et communiquer rapidement en cas de problème;
- utiliser la messagerie Pratiqo lorsque la plateforme l'exige;
- protéger les renseignements personnels des élèves et parents;
- maintenir un environnement d'enseignement sûr, approprié et légal;
- respecter le **[Code de conduite](/legal/code-de-conduite)** et la **[Politique d'annulation](/legal/annulation)**;
- éviter toute conduite discriminatoire, harcelante, sexuelle, intimidante, abusive ou inappropriée;
- ne pas fournir de services dangereux, illégaux ou incompatibles avec le cadre éducatif de Pratiqo.

---

## 8. Mineurs et cours à domicile

Les professeurs doivent faire preuve d'une vigilance accrue lorsque l'élève est mineur.

- La participation ou l'autorisation d'un parent ou tuteur légal peut être requise.
- Pour les mineurs, un parent ou tuteur devrait être présent ou joignable pendant le cours, selon l'âge, le contexte et le lieu.
- Les communications privées inutiles, ambiguës ou inappropriées avec des mineurs sont interdites.
- Les cours doivent se dérouler dans des lieux sûrs, appropriés et conformes à la loi.
- Le professeur peut refuser un lieu ou une situation qu'il juge dangereux, inapproprié ou non conforme.
- Tout incident ou préoccupation concernant la sécurité d'un élève doit être signalé rapidement à [`support@pratiqo.ca`](mailto:support@pratiqo.ca). En cas d'urgence, contactez d'abord les services d'urgence.

---

## 9. Communication et conduite hors plateforme

Le professeur ne doit pas tenter de contourner Pratiqo.

Il est notamment interdit de :

- déplacer une réservation ou un paiement hors plateforme afin d'éviter les frais, commissions ou règles de Pratiqo;
- solliciter un paiement direct avant, pendant ou après une mise en relation créée par Pratiqo;
- partager inutilement des coordonnées personnelles avant une réservation confirmée;
- encourager un élève ou un parent à éviter les outils de paiement, de messagerie ou de réservation de Pratiqo.

Pratiqo peut suspendre, restreindre ou supprimer un compte en cas de contournement ou de tentative de contournement.

---

## 10. Annulations, absences et remboursements

Les annulations, absences, reprogrammations et demandes de remboursement sont régies par la **[Politique d'annulation](/legal/annulation)**.

Le comportement du professeur peut influencer l'admissibilité d'un élève à un remboursement, la retenue d'un versement ou l'ouverture d'un dossier de résolution. Les absences, retards répétés, annulations tardives, fausses déclarations ou problèmes de livraison du cours peuvent entraîner des mesures d'application.

---

## 11. Versements, retenues, reprises et rétrofacturations

Les versements au professeur peuvent être retardés, retenus, ajustés, repris ou compensés dans les cas suivants :

- remboursement ou demande de remboursement;
- litige, rétrofacturation ou contestation bancaire;
- soupçon de fraude, d'abus ou de contournement;
- problème d'identité, de conformité fiscale ou de conformité réglementaire;
- plainte de sécurité, plainte d'élève ou enquête interne;
- violation des présentes conditions, des CGU ou du Code de conduite;
- cours non livré, livré de façon substantiellement non conforme ou marqué comme absence du professeur.

Les délais de Stripe, des banques ou des autres prestataires de paiement peuvent affecter le moment où un versement ou un remboursement apparaît.

Lorsque la loi et les règles de la plateforme le permettent, Pratiqo peut récupérer sur des versements futurs les montants liés à une absence, une faute, une fausse déclaration, une fraude, une violation de politique, une rétrofacturation ou un défaut de livraison imputable au professeur.

---

## 12. Taxes et conformité légale

Le professeur est responsable de ses obligations fiscales, permis, licences, factures, déclarations et autres obligations légales applicables.

Pratiqo peut fournir certains reçus, rapports ou historiques de transaction, mais ne fournit pas de conseils fiscaux, comptables ou juridiques. Le professeur devrait consulter son propre conseiller professionnel.

---

## 13. Propriété intellectuelle et contenu téléversé

Le professeur doit détenir les droits nécessaires sur tout contenu qu'il téléverse, publie ou partage sur Pratiqo.

- Aucun contenu protégé par droit d'auteur ne peut être utilisé sans autorisation.
- Le professeur accorde à Pratiqo une licence limitée, mondiale, non exclusive et sans redevance pour afficher, héberger, reproduire et utiliser son profil et son contenu aux fins d'exploitation de la plateforme, de promotion de son profil et de livraison du service.
- Pratiqo peut retirer tout contenu contrefaisant, trompeur, inapproprié ou contraire aux politiques de la plateforme.

---

## 14. Confidentialité et vie privée

Le professeur doit protéger les renseignements personnels des élèves et parents.

Il est interdit de publier ou partager sans autorisation :

- captures d'écran de conversations;
- enregistrements audio ou vidéo;
- coordonnées personnelles;
- informations scolaires, familiales, médicales ou financières;
- tout renseignement permettant d'identifier un élève ou un parent hors du contexte nécessaire au cours.

La collecte et l'utilisation des renseignements personnels par Pratiqo sont décrites dans la **[Politique de confidentialité](/legal/confidentialite)**.

---

## 15. Avis, évaluations, badges et classement

Les avis et évaluations peuvent être modérés conformément au Code de conduite et aux règles de confiance de Pratiqo.

Les badges, vérifications, statuts de profil et statuts commerciaux ne constituent pas une garantie de qualité, de résultat, de sécurité absolue ou de positionnement.

Le classement et la visibilité peuvent dépendre de facteurs comme la pertinence, les disponibilités, la localisation, la qualité du profil, les évaluations, la réactivité, les signaux de sécurité, la conformité aux politiques et d'autres critères. Pratiqo peut modifier ses systèmes de classement, de recherche ou de recommandation sans garantir un placement particulier.

---

## 16. Suspension, retrait et application

Pratiqo peut, selon la gravité de la situation :

- envoyer un avertissement;
- restreindre certaines fonctionnalités;
- masquer ou retirer un profil public;
- suspendre ou fermer un compte;
- retenir un versement lorsque cela est approprié;
- refuser une nouvelle inscription;
- demander des documents ou informations supplémentaires.

Ces mesures peuvent notamment s'appliquer en cas de problème de sécurité, fraude, sollicitation de paiement hors plateforme, profil faux ou trompeur, harcèlement, discrimination, absences répétées, rétrofacturations, non-respect des politiques ou risque légal.

Pratiqo peut enquêter sur les signalements et demander la coopération du professeur.

---

## 17. Relation avec Membre Pro

**Membre Pro**, s'il est offert, est une **adhésion payante optionnelle** distincte qui peut être soumise à des conditions d'abonnement ou à des modalités additionnelles. Le statut Membre Pro peut donner accès à des avantages économiques tels qu'une **commission réduite** ou une **structure de ristourne**, lorsque Pratiqo les offre.

Membre Pro ne garantit pas un revenu, des élèves, des réservations, un classement, des vues de profil ou un résultat commercial. Les modalités détaillées de Membre Pro sont régies par les **[Conditions Membre Pro](/legal/membre-pro)**.

---

## 18. Contact

Pour le soutien courant : [`support@pratiqo.ca`](mailto:support@pratiqo.ca)

Pour les questions générales : [`info@pratiqo.ca`](mailto:info@pratiqo.ca)

Pour les avis formels : [`marc-andre.theberge@pratiqo.ca`](mailto:marc-andre.theberge@pratiqo.ca)

---

*Ce document a été rédigé en français conformément à la Charte de la langue française du Québec. Une version anglaise et une version espagnole sont disponibles à titre de traduction de courtoisie.*


---

# Fichier : 05_membre_pro_commissions_ristourne.md

# 05 — Membre Pro, commissions et ristourne

> **Source route** : /legal/membre-pro, /tarifs, /upgrade, /become-teacher, /devenir-enseignant
> **Source file(s)** : content/legal/membre-pro.fr.md, lib/config/membrePro.ts, lib/payments/commission.ts, lib/i18n/locales/fr.json, app/tarifs/page.tsx, app/(app)/upgrade/page.tsx, app/become-teacher/page.tsx
> **Note d'export** : Section dédiée créée pour revue avocat après mise à jour du modèle de commission.

## 1. Modèle de commission canonique

| Niveau | Volume annuel | Gratuit / Standard | Membre Pro |
|---|---:|---:|---:|
| Bronze | 0 $CA – 5 000 $CA | 15% | 5% |
| Argent | 5 000 $CA – 15 000 $CA | 14% | 4.5% |
| Or | 15 000 $CA – 30 000 $CA | 13% | 4% + 0.5% ristourne |
| Platine | 30 000 $CA+ | 12% | 3.5% + 1% ristourne |

## 2. Source de configuration actuelle

- `lib/payments/commission.ts` calcule les frais de plateforme : Gratuit/Standard 1500, 1400, 1300, 1200 bps ; Membre Pro 500, 450, 400, 350 bps.
- `lib/config/membrePro.ts` expose le prix mensuel affiché : **29,99 $CA / mois** (taxes applicables en sus), aligné sur la source de vérité Stripe `STRIPE_PRO_MONTHLY_PRICE_ID` (`unit_amount = 2999`).
- `lib/config/membrePro.ts` expose la plage Gratuit 15 % → 12 %, Membre Pro 5 % → 3,5 %, et les règles de ristourne.
- Stripe demeure la source autoritative du prix au paiement ; cette section décrit le modèle affiché et contractuel à valider.

## 3. Ristourne annuelle

La ristourne annuelle affichée est conditionnelle :

- 5 % des profits nets admissibles de la marketplace Pratiqo, à l'exclusion des profits générés par YoPratiqo et tout autre produit autonome distinct ;
- versement annuel en janvier ;
- bassin plafonné à 150 000 $CA ;
- activation seulement si au moins 10 professeurs Pro sont éligibles ;
- maximum 10 000 $CA par professeur ;
- répartition selon le volume relatif ;
- aucune garantie de revenu minimum.

Formulation juridique actuellement utilisée ou souhaitée : Pratiqo ne garantit aucun revenu minimum. Les professeurs agissent comme travailleurs autonomes. Leurs revenus dépendent notamment de leur activité, de leur disponibilité, de leur tarification, de la demande et du volume de réservations.

## 4. Questions juridiques spécifiques

À valider par l'avocat :

- Le modèle de commission dégressive doit-il être décrit dans les CGU, les Conditions professeurs, les Conditions Membre Pro et la page Paiements ?
- La différence entre commission transactionnelle et ristourne annuelle est-elle suffisamment claire ?
- Le terme « ristourne » est-il approprié ou faut-il employer un autre terme contractuel ?
- La ristourne conditionnelle risque-t-elle d'être perçue comme promesse de revenu, programme de placement, participation bénéficiaire, bonus garanti ou avantage assimilable à un titre financier ?
- Le seuil de 10 professeurs Pro éligibles et le plafond de 150 000 $CA doivent-ils figurer dans les conditions contractuelles ou seulement dans la page prix ?
- Le maximum de 10 000 $CA par professeur doit-il être accompagné d'exemples, d'exclusions ou de règles d'arrondissement ?
- Comment traiter les remboursements, rétrofacturations, cours annulés, taxes et litiges dans le volume annuel admissible ?
- La page `/become-teacher` contient un calculateur indicatif : faut-il ajouter une mention plus forte que les estimations ne sont pas contractuelles ?

## 5. Conditions Membre Pro actuelles — export intégral
# Conditions Membre Pro — Pratiqo

**Version :** 1.0 · **Dernière mise à jour :** mai 2026

> ⚠️ **Important** : Le présent document est un modèle préliminaire qui s'applique à l'**adhésion payante optionnelle Membre Pro** offerte aux professeurs admissibles sur la plateforme Pratiqo. Il complète les autres documents juridiques applicables et ne remplace pas un avis juridique. Les droits impératifs des consommateurs et des travailleurs autonomes prévus par la loi prévalent sur toute disposition contraire des présentes.

---

## 1. Identification de l'exploitant

**Cours Pratiqo Inc.** (« Pratiqo ») exploite la plateforme Pratiqo et peut offrir le statut **Membre Pro** aux professeurs admissibles.

L'adhésion Membre Pro est un service distinct de la mise en relation marketplace de base. La souscription à Membre Pro ne crée aucun lien d'emploi, de mandat, d'agence, de partenariat, de coentreprise ou de franchise entre le professeur et Cours Pratiqo Inc.

---

## 2. Portée des présentes conditions Membre Pro

Les présentes conditions s'appliquent à tout abonnement payant Membre Pro sur Pratiqo. Elles **complètent**, sans s'y substituer, les documents suivants :

- les **[Conditions Générales d'Utilisation](/legal/cgu)** (« CGU »);
- les **[Conditions applicables aux professeurs](/legal/conditions-professeurs)**;
- la **[Politique d'annulation](/legal/annulation)**;
- la **[Politique des paiements, remboursements et versements](/legal/paiements-remboursements)**;
- le **[Code de conduite](/legal/code-de-conduite)**;
- la **[Politique de confidentialité](/legal/confidentialite)**.

En cas de divergence entre les présentes conditions Membre Pro et un autre document Pratiqo, les présentes conditions prévalent **uniquement pour les questions propres à Membre Pro** (facturation de l'abonnement, avantages économiques rattachés au statut Membre Pro, renouvellement, annulation Membre Pro), sous réserve du droit applicable d'ordre public.

---

## 3. Nature de Membre Pro

Membre Pro est une **adhésion payante optionnelle** — un **statut de membre** offert aux professeurs admissibles sur Pratiqo.

Le statut Membre Pro peut donner accès à des **avantages économiques ou de plateforme**, notamment, **lorsqu'ils sont offerts** :

- une **commission réduite** sur les cours marketplace, selon les taux et conditions affichés par Pratiqo;
- une **structure de ristourne, de récompense ou de cashback** liée à l'activité du professeur, selon les conditions affichées;
- des **avantages d'abonnement** (par exemple, fonctionnalités payantes liées au compte) lorsqu'ils sont offerts;
- d'éventuels **avantages de visibilité ou de marketplace** lorsqu'ils sont offerts par la plateforme.

L'ensemble exact des avantages, leurs **modalités**, leur **disponibilité**, leurs **taux** et leurs **plafonds** peuvent **varier selon le forfait, la région, le moment et l'offre en cours**, et sont indiqués **dans la plateforme, le tableau de bord, la caisse, la page d'abonnement ou les modalités du forfait applicable**. Les avantages Membre Pro **peuvent évoluer** sans qu'une liste fixe d'avantages ne soit garantie à perpétuité.

Membre Pro **n'est pas** une suite d'outils ni un studio de production : c'est un statut d'adhésion. Toute fonctionnalité distincte qui pourrait être rattachée au statut, lorsqu'elle est offerte, est décrite séparément dans la plateforme.

---

## 4. Cycle de facturation

Membre Pro peut être facturé selon une période **mensuelle ou annuelle**, ou selon un autre cycle proposé par Pratiqo lors de la souscription.

- La période de facturation et la date du prochain renouvellement sont affichées avant la souscription, et peuvent être consultées dans la page d'abonnement du compte lorsque cette page est offerte.
- Le **prix applicable est celui affiché au moment de la souscription**, en plus des taxes applicables le cas échéant.
- Les prix sont indiqués avant le paiement.
- Le moyen de paiement enregistré est débité automatiquement à chaque renouvellement, **sauf annulation** dans les délais ou disposition contraire d'une loi d'ordre public.
- Pratiqo peut utiliser **Stripe** ou un autre prestataire de paiement pour la facturation et le traitement des transactions Membre Pro.

---

## 5. Renouvellement automatique

Sauf annulation, l'adhésion Membre Pro **se renouvelle automatiquement** pour une nouvelle période identique au cycle choisi.

- Les modalités de renouvellement (période, prix, date) sont divulguées avant l'achat.
- Le professeur est responsable d'**annuler avant la date de renouvellement** s'il ne souhaite pas poursuivre l'adhésion.
- Pratiqo peut transmettre des avis de renouvellement, de paiement ou d'expiration de carte lorsque la loi l'exige ou lorsque la plateforme est configurée pour le faire.
- Aucune disposition des présentes ne limite les droits impératifs prévus par la loi applicable, notamment au Québec en matière de protection du consommateur.

---

## 6. Annulation par le professeur

Le professeur peut annuler Membre Pro :

- depuis les paramètres d'abonnement du compte lorsque cette fonctionnalité est offerte; ou
- en écrivant à [`support@pratiqo.ca`](mailto:support@pratiqo.ca).

Sauf mention contraire affichée lors de l'annulation ou exigence d'une loi d'ordre public, **l'annulation prend effet à la fin de la période payée en cours**. Les avantages Membre Pro peuvent demeurer accessibles jusqu'à cette date, puis cesser.

L'annulation de Membre Pro :

- ne supprime pas automatiquement le compte professeur;
- ne soustrait pas le professeur aux **[Conditions applicables aux professeurs](/legal/conditions-professeurs)** ni aux autres règles de la plateforme;
- n'efface pas les obligations financières déjà nées (par exemple un paiement déjà débité, une ristourne déjà versée et soumise à reprise selon les conditions affichées, ou un litige en cours).

---

## 7. Remboursements

Sauf disposition d'une loi d'ordre public, dans la mesure où une promotion l'indique expressément, ou dans le cas d'une erreur technique ou de facturation, **les paiements Membre Pro ne sont généralement pas remboursables une fois la période de facturation entamée**.

- Aucun remboursement au prorata n'est offert, sauf si la loi l'exige ou si Pratiqo l'offre expressément.
- En cas d'erreur technique ou de facturation, le professeur doit écrire à [`support@pratiqo.ca`](mailto:support@pratiqo.ca) avec les détails utiles (identifiant de transaction, date, motif).
- Les présentes ne limitent pas les droits impératifs du professeur, notamment ceux issus de la **Loi sur la protection du consommateur** du Québec ou de toute autre législation d'ordre public.

---

## 8. Échec de paiement et rétrogradation du statut

Si un paiement Membre Pro échoue (carte expirée, fonds insuffisants, refus émetteur, etc.) :

- Pratiqo ou son prestataire de paiement peut **retenter le paiement** automatiquement, selon ses procédures de récupération.
- Le **statut Membre Pro et les avantages économiques rattachés** (par exemple commission réduite, ristourne) peuvent être **mis en pause, rétrogradés, suspendus ou annulés** après un échec de paiement ou un défaut de paiement.
- Le professeur peut être tenu responsable des sommes impayées dans la mesure permise par la loi applicable.
- La mise à jour du moyen de paiement peut être requise pour poursuivre l'adhésion.
- Les procédures automatisées de récupération de paiement peuvent être effectuées par le prestataire de paiement (par exemple Stripe), selon ses propres règles.

---

## 9. Taxes

Les taxes (TPS, TVQ, TVH, taxes provinciales, taxes étrangères) **peuvent s'ajouter** au prix de l'adhésion selon la résidence du professeur et la loi applicable.

- Le professeur doit fournir des renseignements de facturation et fiscaux **exacts et à jour**.
- Pratiqo peut percevoir et remettre les taxes lorsque la loi l'exige.
- Pratiqo **ne fournit pas de conseils fiscaux**. Le professeur devrait consulter son propre conseiller pour ses obligations fiscales personnelles ou professionnelles.

---

## 10. Modifications des avantages

Pratiqo peut **ajouter, retirer, tester, renommer, modifier ou cesser** des avantages Membre Pro, y compris la **commission réduite**, la **structure de ristourne** et tout autre avantage rattaché au statut.

- Les changements importants seront communiqués par les moyens prévus par la loi applicable, le cas échéant.
- Une modification d'avantage ne donne pas automatiquement droit à un remboursement, sauf disposition contraire d'une loi d'ordre public.
- Les avantages **bêta, expérimentaux ou en accès anticipé** peuvent être modifiés, restreints ou retirés sans préavis et ne sont pas garantis.
- Les **modifications de taux** (par exemple un ajustement de la commission réduite ou de la ristourne) s'appliquent **prospectivement**, à compter de la date d'entrée en vigueur indiquée par Pratiqo, sous réserve de la loi applicable.

---

## 11. Visibilité, classement, badges et recherche

> **Le statut Membre Pro peut améliorer certains signaux de visibilité, mais ne garantit ni positionnement, ni réservations, ni revenus.**

Lorsqu'elle est offerte par la plateforme, l'**appartenance au statut Membre Pro** peut figurer parmi les facteurs utilisés dans certaines fonctionnalités de classement, de recherche, de mise en avant ou d'affichage.

- Le classement et la recherche sur Pratiqo peuvent dépendre de plusieurs facteurs, notamment : la pertinence par rapport à la requête, la localisation, la discipline, les disponibilités, le prix, la qualité du profil, les évaluations, la réactivité, les signaux de sécurité et de confiance, et d'autres critères qui peuvent évoluer.
- Le statut Membre Pro peut être **considéré comme un facteur parmi d'autres** ou comme **critère de départage à pertinence égale**, lorsque la plateforme le prévoit.
- Pratiqo **ne garantit pas** une position particulière, un nombre d'impressions, un nombre de clics, des messages, des réservations, des élèves ou un revenu.
- Les **badges et libellés** Membre Pro **ne sont pas équivalents** à une vérification d'identité ou à une vérification de diplôme, sauf indication claire en ce sens.

---

## 12. Aucune garantie d'élèves, de réservations, de revenus ou de résultats

Membre Pro **n'est pas une promesse** :

- d'élèves;
- de réservations;
- de messages;
- de visites de profil;
- de revenu;
- de rang dans les résultats de recherche;
- de succès commercial sur la plateforme.

Aucun avantage Membre Pro — y compris la **commission réduite** ou la **ristourne** — ne convertit Pratiqo en agence de placement, en service de recrutement d'élèves, en garantie de revenu, ni en garantie de résultat commercial ou pédagogique.

---

## 13. Offres promotionnelles, bêta et fondateurs

Pratiqo peut proposer des offres **promotionnelles, bêta, « fondateurs », à prix réduit ou en essai gratuit** liées à Membre Pro.

- Ces offres peuvent être temporaires.
- L'admissibilité peut être limitée à certains segments, marchés ou périodes.
- Pratiqo peut **mettre fin ou modifier** ces offres conformément à leurs conditions affichées et à la loi applicable.
- Les conditions promotionnelles **ne deviennent pas permanentes** sauf si Pratiqo l'indique expressément par écrit.

---

## 14. État du compte et admissibilité

Membre Pro peut être réservé aux professeurs qui :

- maintiennent un compte professeur actif;
- respectent les **[Conditions applicables aux professeurs](/legal/conditions-professeurs)**;
- conservent un profil exact et à jour;
- n'ont pas de problème de sécurité ou de conformité non résolu;
- disposent d'un moyen de paiement valide;
- satisfont, le cas échéant, aux vérifications d'identité ou autres contrôles applicables.

Pratiqo peut **refuser, suspendre ou résilier** Membre Pro en cas notamment de :

- violation des politiques;
- risque de fraude;
- problème de sécurité;
- profil inexact ou trompeur;
- sollicitation de paiement hors plateforme;
- abus de rétrofacturations;
- abus du programme de ristourne ou de récompense;
- défaut de paiement;
- risque légal ou de conformité.

---

## 15. Relation avec les versements, les commissions et la ristourne

Les **frais d'adhésion Membre Pro** (le montant que Pratiqo facture pour le **statut de membre**) sont **distincts** des **commissions de marketplace** (le pourcentage que Pratiqo retient sur chaque cours), des frais de service et des autres frais de marketplace.

- Le paiement de Membre Pro **ne dispense pas** le professeur des règles de la marketplace, des commissions, des règles d'annulation, des règles de remboursement ou des obligations en matière de rétrofacturations.
- Lorsqu'une **commission réduite** est rattachée au statut Membre Pro, son taux, ses conditions, sa date d'entrée en vigueur et son champ d'application sont indiqués dans la plateforme, le tableau de bord, la caisse, la page d'abonnement ou les modalités du forfait applicable. Pratiqo peut ajuster ce taux **prospectivement**, sous réserve de la loi applicable.
- Lorsqu'une **structure de ristourne, de récompense ou de cashback** est rattachée au statut Membre Pro, ses **modalités de calcul, plafonds, fréquence de versement et conditions de reprise** sont indiqués de la même manière. Une ristourne déjà versée peut être **réajustée, reprise ou compensée** par Pratiqo, dans la mesure permise par la loi, en cas de remboursement, de rétrofacturation, d'erreur, d'inadmissibilité ou de violation des présentes.
- Les **frais Membre Pro** ne peuvent pas être compensés sur les versements marketplace, sauf si Pratiqo l'offre expressément ou si la loi applicable l'exige.
- Les retenues, reprises ou ajustements de versements demeurent régis par les **[Conditions applicables aux professeurs](/legal/conditions-professeurs)** et la **[Politique des paiements, remboursements et versements](/legal/paiements-remboursements)**.

---

## 16. Litiges de paiement et rétrofacturations

Avant d'ouvrir une contestation auprès de l'émetteur de carte, le professeur **devrait contacter** [`support@pratiqo.ca`](mailto:support@pratiqo.ca) lorsque cela est possible, afin de tenter une résolution rapide.

- Les contestations abusives ou injustifiées peuvent affecter l'état du compte et l'admissibilité à Membre Pro.
- Pratiqo peut enquêter sur tout litige de facturation et demander de la documentation.
- Aucune disposition des présentes ne limite les droits du professeur prévus par la loi applicable ni les droits issus des règles des réseaux de cartes de paiement.

---

## 17. Résiliation par Pratiqo

Pratiqo peut **suspendre ou résilier** une adhésion Membre Pro en cas notamment de :

- manquement aux présentes ou à un autre document juridique applicable;
- défaut de paiement;
- fraude ou abus (y compris l'abus du programme de ristourne ou de récompense);
- problème de sécurité;
- risque légal ou réglementaire;
- abandon ou cessation du service Membre Pro.

Si Pratiqo cesse Membre Pro, elle gère les abonnements en cours **conformément à la loi applicable** et aux modalités affichées au moment de la cessation. Aucune disposition des présentes ne garantit que Membre Pro existera indéfiniment, ni que tel ou tel taux de commission réduite ou de ristourne demeurera inchangé.

---

## 18. Données et confidentialité

Membre Pro peut impliquer le traitement :

- de données analytiques;
- de mesures de profil;
- de signaux de classement;
- de renseignements de facturation;
- de **données d'activité marketplace** nécessaires au calcul de la commission réduite ou de la ristourne;
- de données d'utilisation pertinentes au service.

Le traitement des renseignements personnels est décrit dans la **[Politique de confidentialité](/legal/confidentialite)**. Les présentes conditions Membre Pro **n'introduisent aucune nouvelle pratique de données** non décrite dans la politique de confidentialité applicable. Pratiqo **ne vend pas** les renseignements personnels des professeurs à des annonceurs.

---

## 19. Soutien et avis formels

Pour le soutien courant : [`support@pratiqo.ca`](mailto:support@pratiqo.ca)

Pour les questions générales : [`info@pratiqo.ca`](mailto:info@pratiqo.ca)

Pour les avis formels : [`marc-andre.theberge@pratiqo.ca`](mailto:marc-andre.theberge@pratiqo.ca)

---

## 20. Aucune renonciation aux droits impératifs

Aucune disposition des présentes conditions Membre Pro ne limite ni n'écarte les droits qui ne peuvent pas être valablement écartés en vertu du droit applicable, notamment :

- la **Loi sur la protection du consommateur** du Québec (notamment ses articles 37, 38 et 53);
- les règles fédérales canadiennes applicables en matière de pratiques commerciales;
- les autres lois d'ordre public applicables.

Si une clause des présentes est jugée invalide ou inapplicable, les autres clauses demeurent en vigueur.

---

*Ce document a été rédigé en français conformément à la Charte de la langue française du Québec. Une version anglaise et une version espagnole sont disponibles à titre de traduction de courtoisie.*


---

# Fichier : 06_code_conduite_securite.md

# 06 — Code de conduite, sécurité, obligations et signalements

> **Source route** : /legal/code-de-conduite, /standards-communaute, /charte-de-confiance
> **Source file(s)** : content/legal/code-de-conduite.fr.md, app/(app)/legal/code-de-conduite/page.tsx, app/standards-communaute/page.tsx, app/charte-de-confiance/page.tsx
> **Note d'export** : Export du code de conduite français courant, avec rappel des surfaces adjacentes de confiance/sécurité.

## 1. Surfaces adjacentes à valider

- `/standards-communaute` redirige ou coexiste avec le code de conduite selon la configuration actuelle.
- `/charte-de-confiance` contient des affirmations de confiance, confidentialité, sécurité et Loi 25 à valider séparément si elle est conservée comme page publique.
- Les badges publics distinguent actuellement identité vérifiée, diplôme vérifié, Membre Pro, Prof fondateur et Nouveau sur Pratiqo.

## 2. Code de conduite actuel — export intégral
# Code de conduite — Pratiqo

**Version :** 2.0 · **Dernière mise à jour :** mai 2026

> ⚠️ **Important** : Le présent code de conduite s'applique à toute personne qui utilise Pratiqo. Il complète les autres documents juridiques applicables (CGU, Conditions Professeurs, Politique d'annulation, Politique de confidentialité). En cas de divergence avec une loi d'ordre public, c'est la loi qui prévaut. Ce document n'est pas un avis juridique et est susceptible d'évoluer.

---

## 1. Objet et portée

Le présent code de conduite définit les règles de comportement et de sécurité applicables à l'ensemble des utilisateurs de Pratiqo : élèves, professeurs, parents, tutrices et tuteurs légaux, visiteurs, ainsi que toute personne qui communique par l'intermédiaire de la plateforme.

Il s'applique à :

- toutes les communications par messagerie Pratiqo, par courriel lié au compte, par appel ou par tout autre canal mis à disposition par Pratiqo;
- les **cours en ligne**, les **cours en personne** (à domicile, dans un studio, dans un lieu public ou autre);
- les **profils**, les **avis**, les commentaires, les ressources publiées et tout autre contenu visible sur Pratiqo;
- les **séances de groupe**, lorsqu'elles sont offertes;
- toute interaction connexe au service, avant, pendant ou après une réservation.

L'utilisation continue de Pratiqo vaut acceptation du présent code.

---

## 2. Conduite respectueuse

Toute interaction sur Pratiqo doit demeurer **respectueuse, professionnelle et conforme à un cadre d'apprentissage**.

Sont interdits, notamment :

- le harcèlement, l'intimidation, les menaces, les insultes, le dénigrement et le langage abusif;
- la **discrimination** fondée sur l'origine, la couleur, la religion, le sexe, le genre, l'orientation sexuelle, l'identité ou l'expression de genre, l'âge, le handicap, l'état civil ou tout autre motif protégé par la **Charte des droits et libertés de la personne du Québec** ou par toute autre loi applicable;
- les propos sexuels, violents, dégradants ou incitant à la haine;
- la pression, la manipulation, la coercition ou les ultimatums dans une relation d'apprentissage;
- les contenus illégaux selon le droit canadien et québécois ou le droit du lieu de résidence de l'utilisateur.

---

## 3. Limites professionnelles

La relation entre un professeur et un élève doit demeurer **strictement professionnelle**, centrée sur l'objectif pédagogique.

- Aucune conduite de nature **romantique, sexuelle, suggestive ou inappropriée** n'est permise entre un professeur et un élève dans le contexte du cours.
- Aucun **contact privé inutile** : les communications doivent rester sur la messagerie Pratiqo tant que la relation pédagogique n'est pas établie, sauf si un échange hors plateforme est strictement nécessaire à la livraison du cours (p. ex. coordonnées d'arrivée à un cours à domicile).
- Aucune demande de **renseignements personnels non nécessaires** au cours (p. ex. numéro d'assurance sociale, photos privées, vie sentimentale, situation familiale détaillée).
- Aucun **cadeau, faveur, arrangement personnel ou pression financière** susceptible de créer un conflit d'intérêts ou une dépendance.
- Le professeur ne doit pas tirer parti de son rôle pour influencer une décision personnelle de l'élève (carrière, finances, croyances, relations).

---

## 4. Mineurs et personnes vulnérables

Pratiqo accorde une **vigilance accrue** aux situations impliquant des personnes mineures ou vulnérables.

- Pour tout élève mineur, **un parent ou un tuteur légal** doit autoriser la prestation et est encouragé à être présent ou facilement joignable durant le cours.
- Les cours impliquant des mineurs doivent se dérouler dans des **lieux appropriés, observables et sécuritaires** : espace ouvert ou facilement accessible (salon, salle d'étude, bibliothèque, studio professionnel), jamais une chambre fermée ou un espace isolé sans supervision possible.
- Aucune **communication secrète** avec un mineur (canal privé non visible par le parent, application chiffrée non liée au cours, demande de cacher un échange).
- Aucune **relation privée** avec un mineur en dehors de l'objectif pédagogique.
- Toute préoccupation concernant la sécurité, la santé, l'intégrité ou le bien-être d'un mineur doit être signalée **rapidement** à [`support@pratiqo.ca`](mailto:support@pratiqo.ca). En situation d'urgence, communiquer d'abord avec les services d'urgence (911 au Canada).
- Pratiqo peut, dans la mesure permise par la loi, retirer un compte qui présente un risque pour des personnes mineures, même en l'absence de plainte formelle.

---

## 5. Cours en personne et à domicile sécuritaires

Les cours en personne doivent se dérouler dans un **environnement sain, respectueux et adapté à l'apprentissage**.

- Sont **incompatibles** avec un cours sur Pratiqo : la possession d'armes, la consommation de substances illégales, l'intoxication évidente, les comportements agressifs, la présence d'animaux dangereux ou non sécurisés et tout local manifestement insalubre ou dangereux.
- Le professeur **comme** l'élève peuvent **interrompre ou mettre fin** à un cours dont la sécurité est compromise; ils peuvent quitter les lieux sans préavis et signaler la situation à Pratiqo.
- Les **adresses domiciliaires** et les renseignements de localisation privés doivent être traités avec prudence : utilisés uniquement aux fins du cours, conservés de manière sécuritaire, et jamais publiés sur des profils, avis ou communications publiques.
- Le professeur doit s'assurer que ses propres lieux d'enseignement (studio, domicile professionnel) respectent les règles applicables (sécurité incendie, accessibilité, hygiène, occupation autorisée).

---

## 6. Sécurité en ligne

Les cours en ligne et les communications numériques doivent eux aussi respecter des règles claires.

- Aucun **enregistrement** d'un cours, d'un appel, d'une conversation par messagerie ou d'un appel vidéo sans le **consentement explicite** de toutes les personnes concernées.
- Aucun partage de **liens de cours, captures d'écran, enregistrements ou renseignements personnels** d'un autre utilisateur sans son consentement.
- Aucun **arrière-plan ou contenu inapproprié** durant un cours vidéo (nudité, contenu sexuel, propos haineux, contenu violent visible).
- Aucune **usurpation d'identité** : utiliser son vrai nom ou un nom professionnel exact, ne pas se faire passer pour une autre personne, ne pas créer de comptes secondaires destinés à contourner une suspension.
- Protéger ses propres identifiants Pratiqo et ne pas les partager.

---

## 7. Intégrité académique

Pratiqo soutient l'apprentissage, l'accompagnement, la pratique et la progression de l'élève. La plateforme **n'est pas** un service permettant d'effectuer un travail à la place de l'élève.

Sont **interdits**, notamment :

- compléter pour un élève un **examen, un test, un travail noté, un projet d'admission, une demande de bourse, un essai ou tout autre travail évalué**, en ligne ou à distance, lorsque cela serait considéré comme malhonnête par l'établissement concerné;
- la **tricherie**, le **plagiat**, la fabrication de résultats, la falsification de documents et la fausse représentation d'identité ou de qualifications;
- le partage de réponses, de questions d'examen confidentielles ou de matériel obtenu en violation des règles d'un établissement;
- les fausses attestations de présence, de progression ou de niveau.

L'aide à la compréhension, à la révision, à la pratique guidée, à la correction, à la traduction pédagogique et au coaching d'étude demeure encouragée.

---

## 8. Paiements et sollicitation hors plateforme

Toutes les transactions liées à un cours réservé via Pratiqo doivent passer par la plateforme.

- Il est **interdit** de demander à un utilisateur de contourner les systèmes de paiement, de réservation, de messagerie ou de versement de Pratiqo.
- Toute **sollicitation de paiement hors plateforme** pour une réservation découverte par l'intermédiaire de Pratiqo (Interac, espèces, virement, autre application, autre site) est interdite, qu'elle vienne d'un professeur ou d'un élève.
- Sont également interdits : l'évitement de frais, les **fausses réservations**, les **fausses annulations**, la **manipulation d'évaluations**, l'abus de codes promotionnels, l'abus de remboursements et le détournement d'offres réservées à un segment.
- Pratiqo peut, sous réserve du droit applicable, suspendre ou clore un compte impliqué dans une telle conduite et retenir les versements liés.

---

## 9. Avis, profils et contenus de la plateforme

Les profils, avis et contenus publiés sur Pratiqo doivent être **honnêtes et exacts**.

- Le profil doit refléter une **identité professionnelle réelle** et des **qualifications, expériences ou diplômes véridiques**. Aucun titre, diplôme, certification ou licence inventé.
- Les évaluations et avis doivent reposer sur une **expérience réelle** du service. Sont interdits : les **faux avis**, les avis échangés contre des avantages, les **avis de représailles**, la pression sur un utilisateur pour obtenir ou modifier un avis, et toute manipulation organisée des évaluations.
- Sont interdits sur la plateforme : les contenus **offensants, illégaux, contrefaits, trompeurs, diffamatoires, intimes non consentis, ou contraires à la propriété intellectuelle d'un tiers**.
- Aucun **diplôme, certification ou attestation falsifié**, **généré par IA de façon trompeuse**, ou autrement inauthentique. Les outils d'IA peuvent être utilisés pour préparer du matériel pédagogique, mais pas pour fabriquer une identité, des qualifications ou des avis.

---

## 10. Signalement

Tout manquement au présent code peut être signalé à Pratiqo.

- **Comment signaler** : par le bouton **« Signaler »** sur le profil ou la conversation concernée, ou par courriel à [`support@pratiqo.ca`](mailto:support@pratiqo.ca).
- **Renseignements utiles** : date du cours ou de l'incident, profil de la personne concernée, captures d'écran ou messages pertinents, et un **résumé factuel** de la situation.
- **Confidentialité** : l'identité de la personne qui signale est traitée de manière confidentielle, sauf obligation légale de divulgation.
- **Examen interne** : Pratiqo peut, dans la mesure permise par la loi, examiner les messages échangés sur la plateforme, l'historique des réservations, l'historique du compte et les autres renseignements pertinents pour évaluer un signalement.
- **Urgence** : en cas de danger immédiat, communiquer **d'abord** avec les services d'urgence (911 au Canada). Pratiqo n'est pas un service d'urgence et ne peut pas intervenir physiquement.

Pour les questions générales : [`info@pratiqo.ca`](mailto:info@pratiqo.ca). Pour les avis formels : [`marc-andre.theberge@pratiqo.ca`](mailto:marc-andre.theberge@pratiqo.ca).

---

## 11. Application et mesures

Lorsqu'un manquement est constaté, Pratiqo peut, selon la gravité, l'historique, le risque, la récurrence et les obligations légales applicables, prendre une ou plusieurs des mesures suivantes :

- avertissement écrit;
- retrait de contenu (avis, profil, message, photo, document);
- annulation d'une réservation;
- restriction temporaire de fonctionnalités;
- suspension du compte;
- résiliation définitive du compte;
- **retenue de versements ou de paiements** lorsque cela est permis par les politiques applicables et le droit;
- **signalement aux autorités** compétentes lorsque la loi l'exige ou lorsque cela est approprié pour protéger une personne.

Ces mesures sont prises sous réserve du droit applicable et des autres documents contractuels (CGU, Conditions Professeurs, Politique d'annulation).

---

## 12. Demande de révision

Une personne visée par une décision d'application peut demander un **réexamen** en écrivant à [`support@pratiqo.ca`](mailto:support@pratiqo.ca) et en fournissant :

- son identifiant de compte ou son courriel d'inscription;
- une description factuelle des circonstances;
- tout élément pertinent (captures d'écran, contexte, témoins éventuels).

Pratiqo peut **maintenir, ajuster ou lever** la mesure prise. Pratiqo peut maintenir une mesure lorsque la sécurité d'un utilisateur, la conformité légale, l'intégrité de la plateforme ou la protection d'une personne mineure le justifie. Aucune disposition du présent article ne limite les recours légaux disponibles.

---

## 13. Liens avec les autres politiques

Le présent code de conduite **complète** et doit être lu conjointement avec :

- les **[Conditions Générales d'Utilisation](/legal/cgu)** (« CGU »);
- les **[Conditions applicables aux professeurs](/legal/conditions-professeurs)**;
- la **[Politique d'annulation](/legal/annulation)**;
- la **[Politique de confidentialité](/legal/confidentialite)**.

En cas de divergence entre le présent code et l'un de ces documents pour une question administrative, financière ou contractuelle, le document spécifique à cette question s'applique, sous réserve du droit applicable d'ordre public.

---

**Cours Pratiqo Inc.** — Saint-Georges, Québec, Canada
support : [`support@pratiqo.ca`](mailto:support@pratiqo.ca)
général : [`info@pratiqo.ca`](mailto:info@pratiqo.ca)
direction : [`marc-andre.theberge@pratiqo.ca`](mailto:marc-andre.theberge@pratiqo.ca)

---

*Ce document a été rédigé en français conformément à la Charte de la langue française du Québec. Une version anglaise et une version espagnole sont disponibles à titre de traduction de courtoisie.*


---

# Fichier : 07_paiements_stripe_taxes.md

# 07 — Paiements, Stripe, taxes, remboursements et versements

> **Source route** : /legal/paiements-remboursements, /booking/success, /teacher/revenue, /teacher/settings
> **Source file(s)** : content/legal/paiements-remboursements.fr.md, app/(app)/legal/paiements-remboursements/page.tsx, app/(app)/booking/success/page.tsx, lib/i18n/locales/fr.json
> **Note d'export** : Export du markdown paiement français courant et synthèse des surfaces adjacentes. Aucun secret ou identifiant Stripe n'est inclus.

## 1. Surfaces de paiement adjacentes repérées

- `/booking/success` vérifie la session Stripe, finalise ou diffère certains états selon la taxe Stripe, et affiche des messages de confirmation ou d'erreur.
- Les libellés français indiquent : paiement sécurisé par Stripe, versement au professeur après cours terminé, reçus automatiques, gestion Stripe pour les paiements.
- `/teacher/revenue` et l'historique professeur affichent les montants en devise comptable réelle, actuellement CAD.
- `/teacher/settings` contient des actions Stripe Connect / portail Stripe selon le statut du compte.

## 2. Points à valider

- La responsabilité respective de Cours Pratiqo Inc., Stripe, Stripe Connect, élèves et professeurs est-elle suffisamment claire ?
- Les délais de remboursement et de versement sont-ils formulés comme délais indicatifs plutôt que garanties absolues ?
- Les taxes TPS/TVQ et la nature des reçus sont-elles suffisamment claires ?
- Les retenues, ajustements, inversions, litiges et rétrofacturations sont-ils suffisamment couverts côté professeur ?
- Les paiements hors plateforme et la sollicitation directe sont-ils couverts dans les conditions et dans le code de conduite ?

## 3. Politique paiements / remboursements / versements actuelle — export intégral
# Paiements, remboursements et versements — Pratiqo

**Version :** 1.0 · **Dernière mise à jour :** mai 2026

> ⚠️ **Important** : Le présent document explique le fonctionnement des paiements de la marketplace Pratiqo : prix, frais, remboursements, versements aux professeurs, retenues, rétrofacturations et taxes. Il complète les autres documents juridiques applicables et ne constitue pas un avis juridique, fiscal, comptable ou financier. Pratiqo n'est ni une banque, ni un service de séquestre, ni une institution financière, ni un conseiller fiscal. En cas de divergence avec une loi d'ordre public, c'est la loi qui prévaut.

---

## 1. Objet et portée

La présente politique s'applique aux **cours de la marketplace** réservés par l'intermédiaire de Pratiqo entre élèves et professeurs indépendants.

- Elle s'applique aux **élèves**, aux **professeurs**, aux **parents et tuteurs légaux** ainsi qu'à toute personne impliquée dans une réservation, un paiement ou un versement sur Pratiqo.
- Elle couvre les paiements en ligne, les paiements liés à une réservation, les remboursements, les versements aux professeurs, les ajustements et les questions de litige connexes.
- Le **traitement des paiements** est effectué par des fournisseurs tiers tels que **Stripe**, sous réserve de leurs propres conditions, frais et règles de réseau de cartes. Pratiqo ne traite pas elle-même les fonds comme une institution bancaire.
- Le présent document **complète** les autres documents juridiques mentionnés à l'article 16 et n'écarte aucun droit impératif d'un consommateur, d'un travailleur autonome ou d'un parent.

---

## 2. Affichage des prix et devises

Les prix d'un cours marketplace sont affichés **avant la réservation**.

- Selon le contexte, **les taxes, frais de service, frais de plateforme ou autres frais** applicables peuvent être affichés avant le paiement.
- Lorsqu'une **conversion de devises** est affichée, elle peut être **approximative** sauf indication contraire expresse. Le montant final débité peut différer légèrement en raison du taux de change appliqué par l'émetteur de carte ou par le prestataire de paiement.
- Le **montant final affiché à la caisse** au moment de la confirmation contrôle la transaction. C'est ce montant qui fait foi entre l'élève et Pratiqo, sous réserve d'erreurs manifestes ou de corrections requises par la loi.
- Pratiqo peut afficher une devise par défaut selon la région; l'élève peut être redirigé vers une autre devise selon la configuration de son compte ou de son moyen de paiement.

---

## 3. Paiements des élèves

Tous les paiements liés à une réservation découverte par l'intermédiaire de Pratiqo doivent passer par le **système de réservation et de paiement officiel** de Pratiqo.

- Pratiqo peut, selon les règles de la plateforme et le droit applicable, **pré-autoriser, débiter, confirmer, annuler, ajuster ou inverser** un paiement.
- Une réservation **n'est pas confirmée** tant que le paiement n'a pas été accepté, que la vérification anti-fraude éventuelle n'a pas été effectuée et que, le cas échéant, le professeur n'a pas accepté la demande.
- Pratiqo **ne garantit pas** une confirmation immédiate. Un délai peut s'appliquer pour la vérification, le contrôle d'identité, le contrôle anti-fraude, l'acceptation du professeur ou la disponibilité du moyen de paiement.
- L'élève doit fournir des **renseignements de paiement exacts et à jour**, et utiliser un moyen de paiement qu'il est autorisé à utiliser.

---

## 4. Versements aux professeurs

Les professeurs sont des **prestataires indépendants**. Pratiqo agit comme intermédiaire technologique de mise en relation et facilite l'encaissement et le versement des paiements liés aux cours.

- Pratiqo peut **encaisser** les paiements de l'élève et **verser au professeur** le montant admissible, **après déduction** des frais de plateforme, commissions, taxes applicables, remboursements, contestations, rétrofacturations, frais du prestataire de paiement et autres ajustements applicables.
- Le **moment d'un versement** peut dépendre de plusieurs facteurs : confirmation de la livraison du cours, règles de la plateforme, calendrier du prestataire de paiement (par exemple Stripe), délais bancaires, examen anti-fraude ou de risque, vérification du compte ou de l'identité, conformité fiscale, et droit applicable.
- Pratiqo **ne garantit pas** un versement immédiat. Les professeurs doivent prévoir des délais raisonnables et tenir leur profil et leurs renseignements de versement à jour.
- Le professeur reconnaît que Pratiqo n'est pas l'employeur, l'agent, le mandataire ou la banque du professeur, et que le versement reçu peut faire l'objet d'**ajustements ultérieurs** dans les cas prévus par les présentes ou les autres documents applicables.

---

## 5. Frais de plateforme et commissions

Pratiqo peut prélever, selon le service utilisé, **un frais de plateforme, un frais de service, une commission, un frais de transaction ou un frais d'abonnement** (par exemple l'adhésion Membre Pro).

- Les frais et commissions applicables peuvent être **affichés** dans le tableau de bord du professeur, dans la caisse de l'élève, dans les documents contractuels, dans la page d'abonnement ou dans une autre zone de la plateforme avant qu'une transaction ne soit confirmée.
- Les structures de frais peuvent **évoluer**. Sauf disposition contraire d'une loi d'ordre public, les modifications matérielles s'appliquent **prospectivement** et seront communiquées par les moyens prévus par la loi applicable, le cas échéant.
- Les **frais du prestataire de paiement** (par exemple les frais d'acquisition Stripe) peuvent s'ajouter ou être déduits des montants concernés selon les règles applicables. Les frais d'émetteur de carte ou frais de change appliqués par la banque de l'élève demeurent à la charge de l'élève.
- Les frais d'adhésion Membre Pro sont régis par les **[Conditions Membre Pro](/legal/membre-pro)** et sont distincts des paiements de cours et des versements de cours. Lorsqu'une **commission réduite** ou une **ristourne** est rattachée au statut Membre Pro, ses modalités sont décrites dans les Conditions Membre Pro et affichées dans la plateforme.

---

## 6. Annulations et remboursements

L'admissibilité à un remboursement ou à un crédit pour un cours marketplace est régie principalement par la **[Politique d'annulation](/legal/annulation)**.

L'admissibilité peut dépendre, selon le cas et sous réserve du droit applicable :

- du **moment** de l'annulation par rapport à l'heure du cours;
- d'une **annulation par le professeur**, d'une **annulation par l'élève**, d'une **absence**, d'un **retard significatif** ou d'un problème de livraison;
- d'un **enjeu technique** non imputable à l'élève (problème de plateforme, panne du fournisseur de visioconférence prévu, etc.);
- d'un **enjeu de sécurité** ou d'un manquement au **[Code de conduite](/legal/code-de-conduite)**;
- d'un **double paiement**, d'une **erreur de paiement** ou d'une fraude avérée;
- des **droits impératifs** prévus par la **Loi sur la protection du consommateur** du Québec ou par toute autre loi applicable.

Lorsqu'un remboursement est accordé :

- il est **normalement remis sur le moyen de paiement d'origine** lorsque cela est techniquement possible;
- les **délais de traitement** dépendent du prestataire de paiement et de l'institution financière de l'élève; un délai de quelques jours ouvrables à plusieurs semaines peut s'appliquer;
- le remboursement est traité dans la **devise** du paiement initial; les éventuelles différences de change ne sont pas garanties par Pratiqo.

---

## 7. Absences et retards

Les retards et absences sont traités sous réserve du droit applicable et de la Politique d'annulation.

- Une **absence d'élève** ou un **retard significatif d'élève** peut **réduire ou éliminer** l'admissibilité à un remboursement ou à un report.
- Une **absence de professeur** ou un retard significatif imputable au professeur peut donner lieu à un **remboursement, un crédit, une nouvelle réservation, un ajustement de versement** ou à des mesures d'application prévues aux **[Conditions applicables aux professeurs](/legal/conditions-professeurs)** et au **[Code de conduite](/legal/code-de-conduite)**.
- Les éléments tels que **horodatages de connexion**, **journaux de réservation**, messagerie sur la plateforme et autres preuves disponibles peuvent être utilisés pour évaluer une situation d'absence ou de retard.

---

## 8. Échecs de paiement et erreurs de paiement

Un paiement peut **échouer** pour de multiples raisons (carte refusée, fonds insuffisants, expiration, contrôle 3DS, contrôle anti-fraude, problème du prestataire de paiement, etc.).

- Un **échec de paiement** peut **empêcher la confirmation** d'une réservation et entraîner son annulation automatique.
- Pratiqo peut, sous réserve du droit applicable, **suspendre, restreindre ou retirer l'accès** à certaines fonctionnalités lorsque le paiement échoue ou demeure impayé.
- Les utilisateurs doivent fournir des **renseignements de paiement exacts et à jour**.
- Tout **double paiement, erreur de montant, erreur de devise** ou erreur de paiement manifeste devrait être signalé rapidement à [`support@pratiqo.ca`](mailto:support@pratiqo.ca) avec les pièces justificatives utiles (identifiant de transaction, date, montant, captures d'écran).

---

## 9. Litiges et rétrofacturations

Avant d'ouvrir une contestation auprès de l'émetteur de carte, l'utilisateur **devrait communiquer d'abord** avec [`support@pratiqo.ca`](mailto:support@pratiqo.ca) pour tenter une résolution interne.

À la suite d'une **rétrofacturation** ou d'une **contestation de paiement**, Pratiqo peut, dans la mesure permise par la loi :

- **mettre en pause** une réservation ou un cours en cours;
- examiner l'**activité du compte** et l'historique des transactions;
- **suspendre, retenir, inverser ou ajuster** un versement lié à la transaction contestée;
- demander des **éléments de preuve** (messages, pièces justificatives, journaux de présence, captures d'écran);
- restreindre temporairement le compte concerné.

Le professeur peut être tenu responsable des **inversions, frais ou ajustements** liés à une rétrofacturation lorsque celle-ci se rapporte à son cours, à sa conduite, à une annulation, à une absence ou à un manquement au **[Code de conduite](/legal/code-de-conduite)** ou aux **[Conditions applicables aux professeurs](/legal/conditions-professeurs)**, dans la mesure permise par la loi.

Pratiqo peut, lorsque cela est utile et permis, **fournir au prestataire de paiement** ou à l'émetteur de carte des éléments factuels au soutien d'une réponse à une contestation. Aucune disposition des présentes ne limite les droits prévus par les règles des réseaux de cartes ou par la loi applicable.

---

## 10. Retenues, ajustements et inversions de versements

Pratiqo peut, **dans la mesure permise par la loi** et selon les politiques applicables, **retarder, retenir, compenser, inverser ou ajuster** un versement à un professeur, notamment dans les cas suivants :

- soupçon ou constat de **fraude** ou d'abus;
- problème de **sécurité** ou plainte d'élève;
- violation présumée des CGU, des Conditions Professeurs ou du Code de conduite;
- **remboursement** demandé ou accordé à un élève;
- **rétrofacturation** ou contestation bancaire;
- **double paiement**, paiement erroné ou problème technique du prestataire de paiement;
- problème d'**identité, de vérification ou de conformité fiscale**;
- exigence légale, demande d'autorité compétente ou décision judiciaire;
- toute autre situation où le maintien du versement présente un risque réel pour Pratiqo, pour un élève ou pour la conformité de la plateforme.

Lorsque cela est requis par la loi, Pratiqo communique les motifs raisonnables d'une retenue ou d'un ajustement.

---

## 11. Fraude, abus et paiements hors plateforme

Sont **interdits** sur Pratiqo, sous réserve du droit applicable :

- la **sollicitation de paiement hors plateforme** pour une réservation découverte par l'intermédiaire de Pratiqo (Interac, espèces, virement bancaire, autres applications, autres sites);
- les **fausses réservations**, les fausses annulations et les **fausses absences**;
- la **manipulation d'évaluations**, la fabrication d'avis et l'échange d'avis contre un avantage;
- l'**abus de codes promotionnels**, de programmes de parrainage ou d'offres réservées à un segment;
- la **collusion** entre comptes liés (utilisation de comptes multiples pour contourner une règle ou détourner une promotion);
- l'utilisation de **moyens de paiement non autorisés** ou volés;
- toute conduite visant l'**évitement de frais** ou de commissions.

Une violation peut entraîner, selon les cas et la loi applicable : annulation de réservation, mesures d'application prévues au Code de conduite, retenue ou inversion de versement, suspension ou résiliation du compte et signalement aux autorités lorsque la loi l'exige ou le permet.

---

## 12. Taxes

Le traitement fiscal des cours marketplace dépend de la juridiction de l'élève, de la juridiction du professeur, de la nature du service et de la loi applicable.

- Les **taxes applicables** (TPS, TVQ, TVH, taxes provinciales, taxes étrangères) peuvent être **affichées à la caisse** lorsque cela est exigé.
- Les **professeurs** sont responsables de leurs propres obligations fiscales, déclarations, factures, permis et licences, sauf lorsque Pratiqo perçoit et remet expressément une taxe précise pour leur compte.
- Pratiqo peut **émettre des reçus, des sommaires de transactions ou des renseignements liés aux taxes** lorsque la loi l'exige ou que la plateforme le permet.
- Pratiqo **ne fournit pas de conseil fiscal**. Le professeur et l'élève doivent consulter leurs propres conseillers professionnels pour leurs obligations fiscales personnelles ou professionnelles.

---

## 13. Membre Pro et abonnements

L'**adhésion Membre Pro** est un service distinct des paiements et versements de cours marketplace.

- Les frais d'adhésion Membre Pro sont régis par les **[Conditions Membre Pro](/legal/membre-pro)**.
- Les **règles d'annulation et de remboursement** d'une adhésion Membre Pro peuvent **différer** des règles applicables à un cours marketplace; la cessation d'une adhésion n'entraîne pas automatiquement de remboursement de cours, et inversement.
- Les frais Membre Pro **ne peuvent pas être compensés** sur les versements de cours, sauf si Pratiqo l'offre expressément ou si la loi applicable l'exige.
- Lorsque le statut Membre Pro est lié à une **commission réduite** ou à une **ristourne** sur les cours marketplace, les modalités de calcul, de plafond et de reprise éventuelle sont décrites dans les **[Conditions Membre Pro](/legal/membre-pro)** et affichées dans la plateforme, le tableau de bord, la caisse, la page d'abonnement ou les modalités du forfait applicable.

---

## 14. YoPratiqo et produits autonomes

Les achats de **cours autonomes YoPratiqo** sont régis par les conditions et la **[Politique de remboursement YoPratiqo](/legal/yo-remboursement)**.

- Les règles d'**accès, de remboursement, de garantie de satisfaction, de droit de rétractation et de protection des mineurs** applicables à YoPratiqo peuvent différer de celles des cours marketplace.
- Un achat YoPratiqo et une réservation marketplace sont des **transactions distinctes**, même lorsqu'elles concernent le même utilisateur, et peuvent être facturées et remboursées séparément.

---

## 15. Signalement d'un problème de paiement

Tout problème de paiement, de remboursement, de versement ou de facturation peut être signalé à Pratiqo.

- **Comment signaler** : par courriel à [`support@pratiqo.ca`](mailto:support@pratiqo.ca).
- **Renseignements utiles** : identifiant de réservation, date du paiement, **montant**, devise, dernier moyen de paiement utilisé, captures d'écran ou reçus, et un **résumé factuel** de la situation.
- **Réponse** : Pratiqo peut, dans la mesure permise par la loi, examiner les transactions, les messages de la plateforme et l'historique du compte pour évaluer le signalement.
- **Sécurité** : tout problème de **sécurité** ou de **conduite** doit être traité conformément au **[Code de conduite](/legal/code-de-conduite)**. En situation d'urgence, communiquez **d'abord** avec les services d'urgence (911 au Canada) — Pratiqo n'est pas un service d'urgence et ne peut pas intervenir physiquement.

Pour les questions générales : [`info@pratiqo.ca`](mailto:info@pratiqo.ca). Pour les avis formels : [`marc-andre.theberge@pratiqo.ca`](mailto:marc-andre.theberge@pratiqo.ca).

---

## 16. Liens avec les autres politiques

La présente politique **complète** et doit être lue conjointement avec les documents suivants :

- les **[Conditions Générales d'Utilisation](/legal/cgu)** (« CGU »);
- les **[Conditions applicables aux professeurs](/legal/conditions-professeurs)**;
- la **[Politique d'annulation](/legal/annulation)**;
- les **[Conditions Membre Pro](/legal/membre-pro)**;
- la **[Politique de remboursement YoPratiqo](/legal/yo-remboursement)**;
- le **[Code de conduite](/legal/code-de-conduite)**;
- la **[Politique de confidentialité](/legal/confidentialite)**.

En cas de divergence entre la présente politique et un autre document Pratiqo pour une question administrative, contractuelle ou financière, le document **spécifique à cette question** s'applique, sous réserve du droit applicable d'ordre public. Aucune disposition des présentes ne limite les droits qui ne peuvent pas être valablement écartés par contrat (notamment ceux de la **Loi sur la protection du consommateur** du Québec).

---

**Cours Pratiqo Inc.** — Saint-Georges, Québec, Canada
support : [`support@pratiqo.ca`](mailto:support@pratiqo.ca)
général : [`info@pratiqo.ca`](mailto:info@pratiqo.ca)
direction : [`marc-andre.theberge@pratiqo.ca`](mailto:marc-andre.theberge@pratiqo.ca)

---

*Ce document a été rédigé en français conformément à la Charte de la langue française du Québec. Une version anglaise et une version espagnole sont disponibles à titre de traduction de courtoisie.*


---

# Fichier : 08_yopratiqo_modules_numeriques.md

# 08 — YoPratiqo et modules numériques

> **Source route** : /legal/yo-remboursement, /yo, /yo/langues/*
> **Source file(s)** : content/legal/yo-refund.fr.md, docs/legal/yopratiqo-legal-inventory.md, docs/legal/yopratiqo-lawyer-review.md
> **Note d'export** : Export du contenu légal YoPratiqo courant et des inventaires internes de revue avocat.

## 1. Positionnement actuel

YoPratiqo est un produit autonome d'apprentissage à l'intérieur de Pratiqo. Il existe actuellement comme intros gratuites et comme fondation pour de futurs modules premium.

## 2. Points essentiels à valider

- Politique de remboursement des contenus numériques.
- Accès à vie tel que défini : tant que Pratiqo exploite le service YoPratiqo, avec préavis minimal si interruption.
- Droit de rétractation UE de 14 jours et consentement à livraison immédiate.
- Mineurs au Québec et autorisation parentale.
- Absence de garantie de fluidité, examen, immigration, emploi, résultat pédagogique ou réservation avec professeur.
- Divulgation éventuelle de voix/audio générés ou traités avec IA.
- Données de progression, quiz, flashcards, interactions audio et consentement avant partage avec un professeur.

## 3. Politique YoPratiqo actuelle — export intégral
# YoPratiqo — Politique de remboursement et accès à vie

**Version :** 1.0 · **Dernière mise à jour :** mai 2026

> ⚠️ **Important** : Ce document complète les Conditions Générales d'Utilisation de Pratiqo et s'applique uniquement aux cours autonomes YoPratiqo (paiement unique). Il ne remplace pas les CGU. En cas de divergence avec une garantie légale d'ordre public, c'est la garantie légale qui prévaut.

---

## 1. Ce que tu achètes

L'achat d'un module YoPratiqo te donne une **licence personnelle non transférable** d'accès au contenu du module choisi. Il ne s'agit pas d'une vente du contenu lui-même.

- L'accès est **lié à ton compte** Pratiqo. Le partage de compte, la revente ou la rediffusion du contenu sont interdits.
- **Cours Pratiqo Inc.** conserve l'intégralité des droits de propriété intellectuelle sur le contenu, les visuels, l'audio, le code et la pédagogie du module.
- Aucun téléchargement permanent du contenu n'est garanti — la lecture se fait via la plateforme YoPratiqo.

---

## 2. « Accès à vie » — définition

L'expression **« accès à vie »** signifie que ton accès au module acheté reste actif aussi longtemps que **Cours Pratiqo Inc. exploite le service YoPratiqo**.

### 2.1 Exploitation continue

Tant que YoPratiqo est exploité par Pratiqo, tu conserves l'accès à tout module que tu as payé, sans frais récurrents.

### 2.2 Discontinuation d'un module ou du service

Si Pratiqo décidait de cesser l'exploitation d'un module précis, ou de la gamme YoPratiqo dans son ensemble :

- Pratiqo informera les acheteurs concernés par courriel **au moins 90 jours civils avant** la date d'arrêt effective.
- Les acheteurs ayant payé le module concerné **dans les 12 mois précédant l'annonce** ont droit à un **remboursement au prorata** de la période non utilisée, calculé linéairement sur 12 mois.
- Au-delà de 12 mois après l'achat, aucun remboursement n'est dû, mais durant la fenêtre de préavis tu peux **exporter tes données de progression** (cours complétés, scores, flashcards travaillées).
- Les remboursements au prorata sont émis dans la devise originale de l'achat, sur le moyen de paiement initial.

---

## 3. Garantie satisfaction 30 jours

### 3.1 Conditions

- **Fenêtre** : 30 **jours civils** à compter de la date d'achat indiquée sur le reçu Stripe. Si le 30ᵉ jour tombe un samedi, dimanche ou jour férié au Québec, l'échéance est reportée au prochain jour ouvrable.
- **Éligibilité** : tu dois avoir complété **25 % ou moins** des leçons du module acheté. La progression est mesurée par le ratio `leçons complétées / nombre total de leçons du module`. Le temps passé, les quiz tentés et les flashcards consultées **ne** sont **pas** pris en compte dans ce calcul.
- **Limite** : une seule demande de garantie satisfaction par acheteur **et** par module.

### 3.2 Comment demander un remboursement

- Depuis la plateforme : **Mon compte → Mes paiements et reçus → Demander un remboursement**.
- Ou par courriel à [`support@pratiqo.ca`](mailto:support@pratiqo.ca) avec ton `numéro de commande` et le motif.

### 3.3 Décision et délais

- Le remboursement est émis **via Stripe sur le moyen de paiement original**.
- Délai d'apparition sur le relevé : **5 à 10 jours ouvrables** après l'émission.
- Les **taxes (TPS, TVQ)** facturées sur l'achat sont incluses dans le montant remboursé.
- **Multi-devises** : le remboursement est émis dans la **devise originale de l'achat**, et non dans la devise d'affichage actuelle de ton compte. Les écarts de change ne donnent pas droit à un ajustement.

---

## 4. Droit de rétractation de l'Union européenne (14 jours)

Cette section s'applique aux acheteurs résidant dans **l'Union européenne**, peu importe la juridiction d'établissement de Pratiqo.

- Le contenu YoPratiqo est un **contenu numérique non fourni sur un support matériel**, livré immédiatement après le paiement.
- Au moment du paiement, l'acheteur de l'UE doit **expressément consentir** à la livraison immédiate **et reconnaître** que ce consentement entraîne la **renonciation au droit de rétractation de 14 jours** prévu par la **Directive 2011/83/UE (art. 16, m)** et la **Directive (UE) 2019/770 (art. 16)**.
- **Sans cette renonciation expresse**, l'acheteur de l'UE conserve **l'intégralité du droit de rétractation de 14 jours** et obtient un **remboursement complet** sur simple demande dans cette fenêtre, **même si plus de 25 % des leçons ont été complétées**.
- La garantie commerciale 30 jours décrite à la **section 3** s'applique **en parallèle** pour les acheteurs de l'UE qui ont renoncé à leur droit de rétractation.

---

## 5. Mineurs

### 5.1 Québec

- Conformément à l'**article 157 du Code civil du Québec**, un **mineur de moins de 14 ans** ne peut pas conclure seul un contrat de consommation. Tout achat d'un module YoPratiqo par un acheteur déclarant être âgé de moins de 14 ans **requiert l'autorisation préalable d'un parent ou d'un tuteur légal**.
- Conformément à l'**article 163 du Code civil du Québec**, **un parent ou tuteur légal peut demander la rescision** d'un achat effectué par leur enfant mineur sans autorisation. Le **remboursement est alors complet** et n'est pas soumis aux conditions de la section 3 (fenêtre de 30 jours, plafond de 25 %).
- Les mineurs **âgés de 14 à 17 ans** peuvent contracter pour les besoins **ordinaires et usuels de leur âge** (art. 157). Le parent ou tuteur peut néanmoins demander la rescision si le contrat cause un **préjudice** au mineur (art. 163).

### 5.2 Hors Québec

Pour les acheteurs résidant hors du Québec, **les règles locales de protection des mineurs s'appliquent** (Code civil du Canada anglais, droit de la consommation européen, etc.). Pratiqo coopère de bonne foi avec toute demande de rescision étayée par une preuve raisonnable de minorité et d'absence d'autorisation parentale.

---

## 6. Exclusions

La garantie satisfaction 30 jours **n'est pas accordée** dans les cas suivants :

- **Abus répété** de la garantie sur plusieurs comptes liés (mêmes informations de carte, même adresse IP, même appareil, même adresse de courriel principale).
- Comptes **fermés pour fraude**, violation des CGU ou abus de rétrofacturation (chargeback).
- Demande déposée **plus de 30 jours après l'achat**, sauf si la disposition UE de la section 4 ou la disposition mineurs de la section 5 s'applique.

---

## 7. Garanties légales préservées

La garantie commerciale décrite à la **section 3** s'ajoute à — et **ne remplace jamais** — les garanties légales d'ordre public, dont :

- **Loi sur la protection du consommateur (Québec)** : `art. 37` (garantie de qualité), `art. 38` (garanties commerciales conventionnelles), `art. 53` (garantie d'usage normal).
- **Loi fédérale sur la concurrence (Canada)** sur les indications fausses ou trompeuses.
- **Directive (UE) 2019/770** sur la conformité des contenus et services numériques.

Si une disposition de la présente politique entrait en conflit avec une garantie légale d'ordre public applicable à l'acheteur, c'est la garantie légale qui prévaut.

---

## 8. Contact

**Cours Pratiqo Inc.** — Saint-Georges, Québec, Canada  
courriel : [`support@pratiqo.ca`](mailto:support@pratiqo.ca)  
site web : [pratiqo.ca](https://pratiqo.ca)

---

*Ce document a été rédigé en français conformément à la Charte de la langue française du Québec. Une version anglaise et une version espagnole sont disponibles à titre de traduction de courtoisie.*


---

## 4. Inventaire légal YoPratiqo existant

# YoPratiqo Legal and Privacy Inventory

This is an internal launch-readiness inventory. It is not a legal policy and should be reviewed by counsel before paid YoPratiqo modules are sold.

## Self-Paced Digital Modules

YoPratiqo should be treated as a self-paced digital learning product distinct from live Pratiqo Marketplace bookings. Legal copy should explain what the buyer receives, what remains owned by Cours Pratiqo Inc., and how access differs from live lessons with teachers.

## Refund and Cancellation Policy

Paid YoPratiqo modules need a clear refund and cancellation policy before checkout is enabled. Topics for lawyer review:

- purchase date and refund request window;
- module completion thresholds;
- how digital delivery affects refund rights;
- tax-inclusive refunds;
- currency of refund versus display currency;
- interaction with European Union withdrawal rights;
- minors and parental authorization.

Do not implement or promise a strict no-refund policy without legal review.

## No Guarantees

Legal copy should state that YoPratiqo does not guarantee:

- fluency;
- exam success;
- immigration, school, or employment outcomes;
- acceptance into any program;
- a specific level result;
- successful live teacher booking.

## No Immigration or Legal Advice

Francisation and language modules may discuss practical language and cultural context. They must not be presented as immigration, legal, tax, or administrative advice.

## AI and Audio Disclosure

Some YoPratiqo audio may be generated or processed with AI tools such as OpenAI. Review whether disclosures should cover:

- generated voice audio;
- pronunciation models and accent profiles;
- limitations of synthetic audio;
- human review, if applicable;
- accessibility alternatives.

## Learning Progress and Privacy

YoPratiqo may process learning data. Privacy policy updates should disclose:

- module progress;
- lesson completion;
- quiz answers;
- flashcard progress;
- audio interactions;
- module purchases;
- teacher CTA clicks;
- learning difficulty signals.

No new tracking is added by this inventory.

## Tax Display and Checkout Disclosure

Before paid modules launch, checkout copy should explain:

- purchase currency;
- taxes shown and charged;
- receipt contents;
- refund treatment for taxes;
- whether prices are one-time purchases or subscriptions.

## Separation From Marketplace Bookings

YoPratiqo legal copy should clearly separate:

- self-paced digital modules;
- live teacher bookings;
- marketplace cancellation policy;
- teacher conduct and lesson delivery;
- payments, receipts, and refunds for live bookings.

The teacher bridge is a product CTA, not a guarantee that a teacher will be available or that a learner will achieve a specific result.


---

## 5. Document de revue avocat YoPratiqo existant

# YoPratiqo legal review inventory

**DRAFT — FOR LAWYER REVIEW ONLY.**

This document is an internal launch-readiness checklist for counsel. It is not live legal policy and should not be published as customer-facing terms without lawyer approval.

## 1. Product description

YoPratiqo is Pratiqo's self-paced learning product. It currently offers free introductory modules for English, Quebec French / Francisation, Spanish, Japanese, and Italian.

The intended product model is:

- free intro modules now;
- future premium modules later;
- a bridge from self-paced learning to the Pratiqo teacher marketplace;
- teacher marketplace bookings remain a separate live-service product governed by the marketplace terms.

## 2. Legal questions for counsel

Please review the following before paid YoPratiqo modules are enabled:

- digital module refund and cancellation policy;
- Quebec Consumer Protection Act requirements for digital educational content;
- treatment of started vs. not-started digital content;
- streamed audio, video, flashcard, quiz, and interactive content;
- future premium access model and whether it should be one-time purchase or subscription;
- relationship between YoPratiqo self-paced modules and Pratiqo teacher marketplace bookings;
- tax display and digital sales disclosures at checkout;
- privacy and Law 25 disclosures for learning analytics;
- whether AI-generated audio needs a public disclosure;
- no fluency guarantee, exam, immigration, legal, employment, and outcome disclaimers.

## 3. Draft disclaimer concepts for review

**DRAFT — FOR LAWYER REVIEW ONLY.**

Potential concepts to validate:

- YoPratiqo is educational preparation only.
- YoPratiqo does not guarantee fluency.
- YoPratiqo does not guarantee exam success.
- YoPratiqo does not provide immigration, legal, or administrative advice.
- YoPratiqo does not guarantee employment or professional outcomes.
- Pratiqo teacher marketplace bookings remain governed by separate marketplace terms.
- Module progress, quiz answers, flashcard activity, audio interactions, teacher CTA clicks, and learning difficulty signals may be processed to provide and improve the service.

## 4. Privacy inventory

YoPratiqo may process:

- module progress;
- quiz answers;
- flashcard progress;
- audio interactions;
- module purchases if paid modules are enabled later;
- teacher CTA clicks;
- learning difficulty signals.

Counsel should review whether explicit consent, notice wording, retention language, or teacher-sharing controls are required before any learning signals are shared with a teacher.

## 5. Open decisions

- Final refund policy for future paid digital modules.
- Whether premium modules are one-time purchases, subscriptions, bundles, or a mixed model.
- Whether premium modules require separate YoPratiqo terms.
- Whether module progress can be shared with a teacher only after explicit consent.
- Whether AI audio disclosure belongs in public UI, privacy policy, terms, checkout copy, or all of those places.
- Whether course schema and public SEO claims need additional legal review before indexing is enabled.


---

# Fichier : 09_marketing_claims_a_risque.md

# 09 — Affirmations marketing et commerciales à risque

> **Objet** : liste de révision pour avocat. Ce fichier ne remplace pas les pages en production. Il recense les affirmations qui peuvent avoir un impact juridique, commercial, fiscal, consommateur ou conformité.
>
> **À valider par l’avocat** : les formulations finales à conserver, limiter, déplacer vers conditions applicables, ou compléter avant lancement.

## 1. Commission, Membre Pro et ristourne

| Source | Claim / copie | Catégorie de risque | Question avocat |
|---|---|---|---|
| `app/tarifs`, `app/(app)/upgrade`, `lib/i18n/locales/*.json` | Commission dégressive : Gratuit / Standard de `15%` à `12%`; Membre Pro de `5%` à `3.5%`; paliers Bronze, Argent, Or, Platine. | Transparence commerciale; information précontractuelle professeur; exactitude des frais. | Le tableau doit-il être repris dans les Conditions professeurs, la page Membre Pro et le checkout d’abonnement avec la même granularité? |
| `lib/config/membrePro.ts`, `content/legal/membre-pro.fr.md`, pages de tarification | Membre Pro : `29,99 $CA/mois` (taxes applicables en sus), commission réduite, outils et avantages. | Abonnement; renouvellement; divulgation claire du prix; absence de promesse de résultat. | Faut-il ajouter une case d’acceptation spécifique pour l’abonnement Membre Pro avant paiement? |
| `content/legal/membre-pro.fr.md`, `05_membre_pro_commissions_ristourne.md` | Ristourne annuelle : `5%` des profits nets, pool plafonné à `150 000 $CA`, activé avec au moins `10` professeurs Pro éligibles, maximum `10 000 $CA` par professeur. | Risque d’interprétation comme revenu promis, avantage financier conditionnel ou communication assimilable à investissement. | La notion de « profits nets » doit-elle être définie contractuellement plus précisément? |
| Pages marketing Membre Pro | Économie de commission : écart de `10` points entre Standard Bronze et Pro Bronze. | Calcul commercial; risque de confusion si présenté comme gain net certain. | Peut-on présenter l’économie sous forme d’exemple uniquement, avec hypothèses visibles? |
| `lib/email/messages/welcome.ts`, tests email | Email d’accueil professeur mentionnant la commission et les avantages Pro. | Communication post-inscription; cohérence avec les conditions. | L’email doit-il renvoyer explicitement vers `/legal/membre-pro` et `/legal/conditions-professeurs`? |

## 2. Recrutement professeur et avantages fondateurs

| Source | Claim / copie | Catégorie de risque | Question avocat |
|---|---|---|---|
| `app/devenir-professeur/page.tsx` | « `100 % de tes revenus jusqu’à 5 élèves actifs` » et « `0 % de commission pendant 6 mois` ». | Promotion distincte du modèle de commission général; conditions d’admissibilité; durée; limite d’élèves actifs. | Cette offre fondateur doit-elle avoir des conditions séparées ou un encadré légal dédié? |
| `app/devenir-professeur/page.tsx` | « Profil mis en avant au lancement ». | Visibilité / classement; risque de promesse de placement prioritaire. | Faut-il préciser que la mise en avant est éditoriale, temporaire, non garantie et sujette aux règles de sécurité/qualité? |
| `app/(marketing)/devenir-enseignant/DevenirEnseignantContent.tsx` | Référence à « Québec, Canada & Uruguay ». | Expansion internationale; cohérence avec le market gating Canada seulement. | Faut-il retirer ou reformuler l’Uruguay avant ouverture officielle du marché? |
| `app/(marketing)/devenir-enseignant/DevenirEnseignantContent.tsx` | Paiements Stripe indiqués comme versés sous environ `7` jours ouvrables. | Délais de paiement; dépendance à Stripe/bancaire; réserves, holds, litiges. | La formulation devrait-elle dire « habituellement » et rappeler que les délais peuvent varier selon Stripe, banques, litiges ou vérifications? |
| `app/become-teacher/page.tsx` | Calculateur / messages de revenus potentiels. | Revenus hypothétiques; promesses de gains. | Les exemples de revenus doivent-ils être accompagnés d’une mention plus visible que Pratiqo ne garantit aucun revenu minimum? |

## 3. Vérification, badges, sécurité et confiance

| Source | Claim / copie | Catégorie de risque | Question avocat |
|---|---|---|---|
| `components/TeacherProfile.tsx`, pages profil public | Badges « Identité vérifiée », « Diplôme vérifié » si applicable, « Pro », « Prof fondateur ». | Exactitude des signaux; distinction entre vérification, plan payant et badge communautaire. | La description des badges doit-elle être centralisée dans les Conditions professeurs ou le Code de conduite? |
| Pages profil / confiance | « Paiement protégé », « Coordonnées protégées ». | Portée de la protection; absence de garantie absolue. | Faut-il préciser que la protection dépend de l’usage de la plateforme et des systèmes de paiement tiers? |
| `content/legal/code-de-conduite.fr.md`, profils, onboarding | Règles de conduite avec mineurs, communications, sécurité. | Protection des mineurs; supervision parentale; signalement. | Les exigences pour cours à domicile avec mineurs sont-elles assez détaillées pour le Québec? |
| Pages diplômes / vérification | Upload diplôme optionnel et distinction entre expérience déclarée et vérifiée. | Risque de fausse impression de certification globale. | Les pages publiques doivent-elles éviter toute expression de type « professeur certifié » sauf certification réelle? |

## 4. Francisation, travail, immigration, examens

| Source | Claim / copie | Catégorie de risque | Question avocat |
|---|---|---|---|
| `app/francisation/page.tsx` et pages liées | Francisation, intégration au Québec, mots de travail, démarches quotidiennes. | Immigration / emploi / apprentissage; éviter promesses de résultats officiels. | Faut-il ajouter un avertissement explicite : service éducatif, pas conseil juridique ou immigration, aucun résultat d’examen ou d’emploi garanti? |
| Pages YoPratiqo français québécois / francisation | Introduction à la culture, mots essentiels, repères de francisation. | Produit éducatif autonome; confidentialité des progrès; absence de reconnaissance gouvernementale. | Une mention visible doit-elle distinguer YoPratiqo des programmes officiels de francisation? |
| Pages marketing professeurs | Soutien scolaire, examens, préparation. | Succès scolaire / examens. | Faut-il une clause uniforme de non-garantie de résultats scolaires ou d’examens? |

## 5. Annulation, remboursements et garanties

| Source | Claim / copie | Catégorie de risque | Question avocat |
|---|---|---|---|
| `app/(app)/legal/annulation/page.tsx` | Garantie premier cours : remboursement intégral si le professeur ne se présente pas ou annule à la dernière minute. | Politique consommateur; preuve; délais; litiges. | La condition « annule à la dernière minute » doit-elle être définie plus précisément? |
| `content/legal/paiements-remboursements.fr.md` | Remboursements via Stripe, devise d’achat, taxes incluses. | Taxes TPS/TVQ, devise, délais bancaires. | Les délais et méthodes de remboursement sont-ils suffisants pour Québec/Canada/UE? |
| `content/legal/yo-refund.fr.md` | Garantie satisfaction YoPratiqo `30` jours, seuil de progression `25%`, droit UE `14` jours, mineurs. | Contenu numérique; droit de rétractation UE; mineurs Québec. | La case de renonciation UE au droit de rétractation doit-elle être implémentée avant toute vente de module numérique? |

## 6. Emails et notifications

| Source | Claim / copie | Catégorie de risque | Question avocat |
|---|---|---|---|
| `lib/email/messages/welcome.ts` | Mention du modèle de commission et de Membre Pro. | Cohérence FR/EN/ES; preuve de communication. | Les emails commerciaux aux professeurs doivent-ils inclure un lien vers les conditions applicables? |
| Emails avis / progression / récompenses | Notifications de crédits, avis ou progression. | Promotion, incitatifs, exactitude des montants. | Les crédits ou récompenses doivent-ils être encadrés dans les CGU ou une politique promotionnelle? |
| Emails de vérification identité | Confirmation ou échec de vérification. | Ton neutre; absence d’accusation; protection des données. | Les modèles actuels sont-ils suffisants pour éviter une qualification diffamatoire ou discriminatoire? |

## 7. Points de synthèse à trancher

- Centraliser la définition contractuelle du modèle Membre Pro, des commissions, de la ristourne et des promotions fondateurs.
- Harmoniser les disclaimers : pas de revenu minimum, pas de promesse d’étudiants, pas de classement garanti.
- Revoir toute mention d’Uruguay ou de marchés futurs avec le système de market gating.
- Ajouter une clause plus précise sur les délais Stripe/paiements si nécessaire.
- Déterminer si certaines affirmations doivent être déplacées vers une page de conditions promotionnelles distincte.


---

# Fichier : 10_questions_pour_l_avocat.md

# 10 — Questions pour l’avocat

> **Objet** : questions prioritaires à poser à l’avocat de Cours Pratiqo Inc. avant lancement public complet.
>
> **Important** : ces questions ne sont pas des conclusions juridiques. Elles servent à cadrer la révision.

## A. Modèle marketplace et relation professeur

1. Les Conditions professeurs définissent-elles suffisamment le statut de travailleur autonome et l’absence de relation d’emploi, agence, franchise, partenariat ou coentreprise?
2. La plateforme peut-elle présenter Pratiqo comme intermédiaire/marketplace tout en traitant les paiements via Stripe et en imposant des règles de conduite?
3. Les clauses de suspension, retrait de profil, enquête et demande de documents sont-elles assez larges sans être abusives?
4. Les obligations des professeurs envers les mineurs, parents et lieux de cours à domicile sont-elles suffisantes pour le Québec?
5. Les clauses de confidentialité des informations élèves/parents couvrent-elles les messages, captures d’écran, enregistrements, documents et coordonnées?

## B. Commission, Membre Pro et ristourne

6. Le modèle de commission `15%` à `12%` pour Gratuit / Standard doit-il être présenté avant chaque réservation, ou une page conditions + résumé checkout suffit-elle?
7. Le modèle Membre Pro `5%` à `3.5%` doit-il être encadré dans des conditions d’abonnement séparées ou la page Membre Pro actuelle suffit-elle temporairement?
8. La mention `29,99 $CA/mois` (prix Stripe canonique, `unit_amount = 2999`) doit-elle inclure des détails sur renouvellement automatique, annulation, taxes et date de facturation avant tout paiement?
9. La ristourne annuelle de `5%` des profits nets peut-elle être présentée comme « ristourne » au Québec sans risque de confusion avec une promesse de revenu, un placement financier ou une participation aux profits?
10. Faut-il définir « profits nets de Pratiqo » dans les conditions pour éviter une interprétation trop large?
11. Le pool plafonné à `150 000 $CA`, l’activation avec au moins `10` professeurs Pro éligibles et le maximum `10 000 $CA` par professeur doivent-ils figurer dans les CGU, Conditions professeurs et Membre Pro?
12. La formule « selon le volume relatif » doit-elle être détaillée davantage pour être opposable?
13. Les promotions fondateurs (`0%` commission pendant `6` mois, `100%` des revenus jusqu’à `5` élèves actifs) doivent-elles avoir des conditions promotionnelles distinctes?

## C. Paiements, Stripe Connect, taxes et litiges

14. Les responsabilités entre Pratiqo, Stripe, professeur et étudiant sont-elles suffisamment réparties dans les pages Paiements et Conditions professeurs?
15. Les clauses de hold, ajustement, compensation, reversal et chargeback sont-elles assez précises pour les professeurs?
16. Les pages doivent-elles préciser plus clairement que les délais Stripe et bancaires peuvent varier?
17. Les remboursements incluent-ils correctement TPS/TVQ lorsque requis?
18. Faut-il ajouter des mentions spécifiques sur les reçus, factures et obligations fiscales des professeurs?
19. La politique actuelle de garantie premier cours est-elle suffisamment définie pour éviter les abus?
20. Les conditions de no-show, annulation tardive et contestation doivent-elles être plus détaillées dans `/legal/annulation`?

## D. Protection du consommateur et contenu numérique YoPratiqo

21. La future vente de modules numériques YoPratiqo requiert-elle des conditions séparées des CGU générales?
22. Quelle politique de remboursement doit s’appliquer à un module numérique lorsque l’utilisateur a commencé le contenu?
23. Le seuil de `25%` de leçons complétées pour la garantie commerciale YoPratiqo est-il raisonnable et opposable?
24. L’accès à vie défini « tant que Pratiqo exploite le service YoPratiqo » doit-il être formulé autrement?
25. Le préavis minimal de `90` jours avant discontinuation de YoPratiqo et le remboursement pro-rata pour achats de moins de `12` mois sont-ils suffisants?
26. La case de consentement UE à la livraison immédiate et à la renonciation au droit de rétractation de `14` jours doit-elle être obligatoire avant toute vente à un acheteur UE?
27. Les règles sur mineurs au Québec, notamment moins de `14` ans, doivent-elles être affichées directement dans le checkout YoPratiqo?

## E. Vie privée, Loi 25 et données d’apprentissage

28. La Politique de confidentialité couvre-t-elle suffisamment les données de progression, quiz, flashcards, audio, clics CTA professeur et signaux de difficulté?
29. Faut-il un consentement explicite avant de partager les progrès YoPratiqo avec un professeur?
30. Les données de messages, avis et profil professeur sont-elles décrites avec assez de précision pour la Loi 25?
31. Le recours à de l’audio pré-généré par IA ou outils tiers exige-t-il une divulgation visible dans l’interface ou seulement dans la politique?
32. Les demandes d’accès, rectification et suppression sont-elles opérationnellement bien décrites?

## F. Claims marketing, examens, immigration, francisation

33. Les pages de francisation doivent-elles inclure une mention claire : pas de conseil juridique, immigration, emploi ou reconnaissance gouvernementale?
34. Les pages de préparation scolaire doivent-elles inclure une mention : aucun succès d’examen ou résultat scolaire garanti?
35. Les pages professeur doivent-elles éviter toutes les formulations pouvant promettre étudiants, visibilité, classement ou revenus?
36. Les badges « identité vérifiée », « diplôme vérifié », « Pro » et « Prof fondateur » sont-ils juridiquement assez distingués?
37. Les pages publiques doivent-elles expliquer que l’identité vérifiée ne signifie pas vérification judiciaire ou vérification d’antécédents?
38. Les avis, notes et badges doivent-ils être encadrés dans les CGU ou une politique de modération distincte?

## G. Expansion hors Canada

39. Le market gating Canada seulement suffit-il à limiter les risques avant ouverture d’autres pays?
40. Quels changements juridiques seraient nécessaires avant l’Uruguay : conditions locales, taxes, devises, paiements, protection consommateur, professeurs indépendants?
41. Les enseignants hors Canada qui visitent le site doivent-ils voir une mention d’indisponibilité pays avant de soumettre des données personnelles?
42. Les prix en devises affichées doivent-ils être plus clairement marqués comme approximatifs lorsque le paiement réel demeure en CAD?

## H. Priorités recommandées avant lancement

43. Valider la page Conditions professeurs.
44. Valider la page Membre Pro et la communication de la ristourne.
45. Valider la page Annulation / remboursements.
46. Valider la politique YoPratiqo remboursement / accès à vie / droit UE / mineurs avant tout checkout numérique.
47. Valider les disclaimers francisation, examens et absence de garanties.
48. Valider les obligations de Loi 25 pour données d’apprentissage et partage éventuel avec professeurs.
49. Valider les promotions fondateurs et leur compatibilité avec le modèle de commission général.
50. Valider les mécanismes de suspension, retenue de paiement et récupération de montants en cas de litige.


---

# Fichier : 11_changelog_depuis_version_avocat_precedente.md

# 11 — Changelog depuis la version avocat précédente

> **Objet** : résumé des changements majeurs à porter à l’attention de l’avocat depuis le dernier paquet / PDF légal.
>
> **Note** : ce fichier est un changelog. Certaines anciennes expressions peuvent être citées uniquement pour expliquer qu’elles ont été remplacées ou retirées.

## 1. Identité, marque et domaine

- Le nom légal de l’exploitant est maintenant harmonisé comme **Cours Pratiqo Inc.**
- La marque publique demeure **Pratiqo**.
- Le domaine canonique de production est **https://www.pratiqo.ca**.
- Les routes légales canoniques sont sous `/legal/*`.
- Les anciennes routes publiques courtes comme `/cgu`, `/confidentialite`, `/annulation` et `/code-de-conduite` sont traitées comme redirections lorsqu’elles existent.

## 2. Modèle professeur et Conditions professeurs

- Une page dédiée **Conditions applicables aux professeurs** existe maintenant sous `/legal/conditions-professeurs`.
- Elle précise notamment :
  - le statut de travailleur autonome / fournisseur indépendant;
  - l’absence de relation d’emploi, agence, franchise, partenariat ou coentreprise;
  - l’absence de garantie d’étudiants, revenus, réservations, classement ou visibilité;
  - les obligations de profil exact, conduite, confidentialité, sécurité, communications et cours avec mineurs;
  - les règles relatives aux paiements hors plateforme;
  - les possibilités de suspension, retrait, retenue ou ajustement dans certains cas.

## 3. Nom produit professeur payant

- L’ancien libellé **Teacher Pro** est remplacé dans le produit courant par **Membre Pro** en français.
- Les équivalents linguistiques attendus sont :
  - FR : **Membre Pro**;
  - EN : **Pro Member**;
  - ES : **Miembro Pro**.
- Le terme historique ne devrait rester que dans des notes de migration, tests patrimoniaux ou changelogs, pas comme nom marketing actuel.

## 4. Nouveau modèle de commission

Le modèle de commission canonique a été modifié.

| Niveau | Volume annuel | Gratuit / Standard | Membre Pro |
|---|---:|---:|---:|
| Bronze | 0 $CA – 5 000 $CA | 15% | 5% |
| Argent | 5 000 $CA – 15 000 $CA | 14% | 4.5% |
| Or | 15 000 $CA – 30 000 $CA | 13% | 4% + 0.5% ristourne |
| Platine | 30 000 $CA+ | 12% | 3.5% + 1% ristourne |

Points associés :

- Membre Pro est à **29,99 $CA/mois** (taxes applicables en sus) — source de vérité : Stripe `STRIPE_PRO_MONTHLY_PRICE_ID` (`unit_amount = 2999`); les libellés produit FR/EN/ES, les pages `/upgrade` et `/tarifs`, les conditions légales et la formule de seuil de rentabilité ont été réalignés sur cette valeur (voir branche `fix/membre-pro-price-source-of-truth`). Une révision antérieure avait indiqué `29 $CA/mois` à tort.
- Le modèle est présenté comme **commission dégressive** : plus le volume annuel cumulé est élevé, plus le taux baisse.
- Le calcul canonique est dans `lib/payments/commission.ts` et la configuration produit Membre Pro dans `lib/config/membrePro.ts`.
- Les textes doivent éviter toute promesse de revenu.

## 5. Ristourne annuelle Membre Pro

La ristourne annuelle est maintenant décrite ainsi :

- `5%` des profits nets de Pratiqo;
- versement prévu en janvier;
- bassin plafonné à `150 000 $CA`;
- activation seulement si au moins `10` professeurs Pro sont éligibles;
- maximum `10 000 $CA` par professeur;
- répartition selon le volume relatif;
- avantage conditionnel, non garanti.

**À valider par l’avocat** : la définition exacte des profits nets, l’expression « ristourne », les conditions d’éligibilité et les risques d’interprétation comme promesse financière.

## 6. Promotions professeurs fondateurs

Les pages de recrutement professeur incluent des promesses promotionnelles distinctes du modèle général :

- commission `0%` pendant `6` mois;
- `100%` des revenus jusqu’à `5` élèves actifs;
- profil mis en avant au lancement.

**À valider par l’avocat** : conditions détaillées, admissibilité, durée, limite des élèves actifs, compatibilité avec Membre Pro et libellé de « mise en avant ».

## 7. YoPratiqo devient un pilier produit

YoPratiqo est maintenant traité comme un produit autonome à l’intérieur de Pratiqo :

- intros gratuites actuelles pour anglais, français québécois / francisation, espagnol, japonais et italien;
- modules premium futurs non activés;
- pont vers le marketplace professeur;
- SEO préparé avec indexation contrôlée;
- schéma Course préparé mais publication contrôlée;
- documents internes de stratégie et inventaire légal.

Un document dédié existe : `docs/legal/yopratiqo-lawyer-review.md`.

## 8. Politique YoPratiqo remboursement et accès à vie

Une politique dédiée existe pour `/legal/yo-remboursement` et couvre :

- licence personnelle non transférable;
- accès à vie défini comme accès tant que Pratiqo exploite le service YoPratiqo;
- préavis minimal de `90` jours en cas de discontinuation;
- garantie satisfaction commerciale de `30` jours;
- seuil de progression de `25%` des leçons;
- droit UE de rétractation de `14` jours;
- règles relatives aux mineurs au Québec.

**À valider par l’avocat** avant tout checkout payant de modules numériques.

## 9. Pages `/trouver-un-prof` et marketplace

Le parcours de recherche professeur a été modernisé et relié aux CTAs YoPratiqo.

Points légalement pertinents :

- affichage de professeurs publics;
- badges de confiance;
- devise d’affichage approximative vs devise de paiement réelle;
- distances approximatives si localisation étudiant activée;
- masquage ou limitation d’informations personnelles avant réservation.

## 10. Marchés supportés et expansion internationale

Un système de market gating a été ajouté :

- Canada comme marché supporté au lancement pour professeurs, payouts, Membre Pro et activité monétisée;
- Uruguay et autres pays traités comme futurs / non ouverts;
- blocage ou message d’attente pour enseignants hors marché supporté.

**À valider par l’avocat** : cohérence des pages marketing qui mentionnent l’Uruguay ou expansion future.

## 11. SEO, indexation et Course schema

- Le domaine canonique SEO est `https://www.pratiqo.ca`.
- L’indexation YoPratiqo est contrôlée par configuration.
- Le Course schema est préparé mais activable seulement par configuration.
- Les pages légales demeurent sous les routes canoniques `/legal/*`.

## 12. Sécurité, conduite et badges

- Le Code de conduite a été consolidé.
- Le profil professeur distingue davantage :
  - identité vérifiée;
  - diplôme vérifié seulement si réellement vérifié;
  - badge Membre Pro comme produit/plan, non comme vérification;
  - badge Prof fondateur comme label communautaire, non garantie de qualité.

**À valider par l’avocat** : formulation exacte des badges et portée des vérifications.

## 13. Points à revoir en priorité

1. Conditions professeurs.
2. Membre Pro, commission et ristourne.
3. Promotions fondateurs.
4. Annulation / remboursements / garantie premier cours.
5. YoPratiqo : droit UE, mineurs, accès à vie et politique de remboursement.
6. Loi 25 : données d’apprentissage, messages, avis, profils et partage professeur.
7. Claims francisation, examens, emploi, immigration.
8. Expansion hors Canada.
