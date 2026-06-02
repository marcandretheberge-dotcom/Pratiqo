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
