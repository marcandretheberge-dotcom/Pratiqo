# 09 — Affirmations marketing et commerciales à risque

> **Objet** : liste de révision pour avocat. Ce fichier ne remplace pas les pages en production. Il recense les affirmations qui peuvent avoir un impact juridique, commercial, fiscal, consommateur ou conformité.
>
> **À valider par l’avocat** : les formulations finales à conserver, limiter, déplacer vers conditions applicables, ou compléter avant lancement.

## 1. Commission, Membre Pro et ristourne

| Source | Claim / copie | Catégorie de risque | Question avocat |
|---|---|---|---|
| `app/tarifs`, `app/(app)/upgrade`, `lib/i18n/locales/*.json` | Commission dégressive : Gratuit / Standard de `15%` à `12%`; Membre Pro de `5%` à `3.5%`; paliers Bronze, Argent, Or, Platine. | Transparence commerciale; information précontractuelle professeur; exactitude des frais. | Le tableau doit-il être repris dans les Conditions professeurs, la page Membre Pro et le checkout d’abonnement avec la même granularité? |
| `lib/config/membrePro.ts`, `content/legal/membre-pro.fr.md`, pages de tarification | Membre Pro : `29,99 $CA/mois` (taxes applicables en sus), commission réduite, outils et avantages. | Abonnement; renouvellement; divulgation claire du prix; absence de promesse de résultat. | Faut-il ajouter une case d’acceptation spécifique pour l’abonnement Membre Pro avant paiement? |
| `content/legal/membre-pro.fr.md`, `05_membre_pro_commissions_ristourne.md` | Ristourne annuelle : rabais commercial rétroactif conditionnel sur volume, calculé selon le volume annuel admissible généré sur la marketplace Pratiqo; YoPratiqo et les produits autonomes sont exclus. | Risque d’interprétation comme revenu promis, avantage financier conditionnel ou communication assimilable à investissement si la formulation dérive. | Les seuils, plafonds, modalités de versement, reprises et exclusions doivent-ils être davantage détaillés dans les conditions? |
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
