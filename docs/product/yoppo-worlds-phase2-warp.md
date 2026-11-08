# YoPratiqo — Phase 2.1 : Flûte des horizons (passage de placement)

## Pourquoi cette étape

La phase 2 publiée sur `main` offre déjà une flûte cosmétique après la maîtrise
des quatre villes d'un monde. Elle ne permet pas à une personne connaissant déjà
la langue de rejoindre rapidement un monde avancé sans avoir refait toutes les
missions. Ce complément ouvre un **passage secret facultatif fondé sur des réponses
indépendantes**, sans toucher aux tampons ni aux droits économiques.

## Règles

1. Chaque frontière entre les trois mondes italiens possède une épreuve de cinq
   questions **distinctes**, choisies parmi les évaluations existantes des
   **quatre** villes du monde à quitter.
2. **Quatre réponses correctes sur cinq sans aide** sont nécessaires. Les
   réponses avec indices ou transcription ne donnent pas le passage. La première
   réponse est prise en compte; aucune écriture libre obligatoire.
3. Une réussite permet seulement de changer le **point de départ pédagogique**
   de l'apprenant : `u01…u04 → u05`, puis `u05…u08 → u09`.
   Un passage du monde 1 directement au monde 3 est refusé.
4. Les évaluations finales des villes sautées ne sont **pas** réputées réussies.
   Il n'y a aucun nouveau tampon, aucun Yoppo Pass gagné par saut, aucune
   certification et aucun crédit.
5. La progression de chaque ville, les questions déjà répondues, les anciens
   brouillons, les données de facturation, les produits payés, les profils des
   professeurs et le registre des crédits restent inchangés.
6. L'élève peut revenir réviser ses villes précédentes. Le nouveau point de
   départ utilise le profil local existant et le mécanisme d'accès pédagogique
   déjà employé par le test de classement.
7. L'épreuve ne conserve pas ses réponses : seule une préférence de départ est
   enregistrée après confirmation explicite du voyage. En cas d'échec de
   sauvegarde, le passage n'a pas lieu.

## Portée et sécurité honnête

Le profil d'apprentissage YoPratiqo est enregistré **sur l'appareil**, pas dans
une base de données sécurisée. La fonction de placement n'est donc pas une
preuve serveur de maîtrise et **ne doit jamais servir à autoriser des contenus
payants, des crédits, des objets monétaires, un avantage transférable ou une
certification**. Les protections Stripe, Supabase et les catalogues d'accès
restent autonomes. Si l'on souhaite offrir des flûtes échangeables ou
consommables, il faudra créer plus tard une attribution et des validations
transactionnelles côté serveur, distinctes de ce prototype pédagogique.

## Révision requise

- Essais FR/EN/ES et petits écrans; cinq questions différentes; aucun clavier.
- Au moins un scénario d'écoute avec MP3 public réellement disponible et
  vérification iOS Safari/Android du fallback audio.
- Parcours 3/5, 4/5, 5/5, 5/5 avec transcription, et nouvelle tentative.
- Passage vers `u05`, retour au monde 1 en révision, puis épreuve `u05→u09`.
- Vérifier que les 4 villes précédentes restent sans tampon si elles étaient
  incomplètes et que le Pass original n'a pas été créé artificiellement.
- Vérifier que l'ancienne flûte cosmétique fonctionne toujours lorsque les
  quatre villes sont réellement terminées.
- Vérifier aucune modification du moteur de progression protégé, des
  paramètres de paiement et des journaux canoniques.

Aucune production ni aucun changement de base n'est prévu par cette branche.
