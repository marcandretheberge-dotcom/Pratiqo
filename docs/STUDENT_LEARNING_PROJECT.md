# Projet d’apprentissage élève — première version

## Besoin et périmètre

Une connexion ou une recherche ne permettait pas de conserver ce qu’un élève
souhaite apprendre. « Trouver mon prof » ne sauvegarde que les demandes d’alerte
consenties ; « Mes apprenants » reste un dossier pédagogique plus détaillé.

Cette version ajoute un projet principal par compte élève : matière libre ou
suggestion du catalogue, pour soi/un enfant, format et ville pour le présentiel.
Elle ne crée pas un nouveau profil d’apprenant et ne modifie pas les profils
pédagogiques existants. Plusieurs projets/enfants par compte restent hors périmètre.

## Expérience

- Carte intégrée au tableau de bord, à la recherche et au profil.
- Affichage après résolution du profil, choix du compagnon et consentements
  existants. Aucun changement des callbacks, gardes, rôles ou redirections.
- Deux étapes, ville non requise en ligne ; aucune géolocalisation demandée.
- « Je découvre d’abord » enregistre le report sans bloquer les autres pages.
  La carte reste accessible sans rouvrir le formulaire à chaque connexion.
- Un lien direct vers un professeur et une réservation déjà ouverte masquent
  la carte sur la recherche. Les filtres et la navigation existants sont conservés.
- Brouillon dans le stockage de session, séparé par compte, expirant après
  24 heures. Reprise de l’étape et des réponses après interruption dans cet
  onglet ; les projets enregistrés sont retrouvés depuis le serveur sur un
  autre appareil. Si le navigateur refuse ce stockage, la saisie reste en mémoire.
- Une sauvegarde échouée conserve la saisie. Une erreur de lecture affiche un
  état indisponible, jamais un faux « aucun projet ».
- Les recherches préparées utilisent uniquement une matière et une ville
  reconnues. Le texte libre reste privé et n’est pas copié dans les URL.
  Un besoin non classé reste enregistré et visible à l’administrateur.
- « Les deux » propose deux liens explicites : local et en ligne.
- Textes élève FR/EN/ES ; navigation actuelle inchangée.

## Suivi administratif

`/admin/learning-project-demand`, accessible depuis le centre de contrôle :

- comptes élèves inscrits, avec besoin enregistré, réponse reportée et sans réponse ;
- groupes par matière, ville, format et destinataire, fusion des synonymes connus ;
- nombre de comptes distincts par groupe et date de dernière déclaration ;
- offre actuelle évaluée avec le moteur existant, y compris les professeurs
  acceptant une demande. Ces résultats ne promettent ni paiement ni créneau ;
- distinction entre aucune offre trouvée, besoin à préciser et lecture impossible.

Les chiffres concernent un projet principal par **compte**, pas les visites,
les recherches répétées, ni le nombre réel d’enfants. Cette version expose une
synthèse, pas une nouvelle liste nominative ni un outil de relance.

## Données et autorisations

Migration additive `135_student_learning_projects.sql` :

- table privée liée à `profiles.id`, suppression en cascade avec le compte ;
- RLS : accès limité au compte propriétaire ayant le rôle élève ;
- RPC de sauvegarde avec l’identité JWT, sans identifiant de propriétaire fourni
  par le client. Une réponse « plus tard » retardée préserve un projet terminé ;
- synthèse SQL exécutable par le rôle serveur uniquement ; API protégée par
  `requireAdminApi`, réponses privées non mises en cache ;
- aucune adresse précise, aucun courriel, nom d’enfant ou consentement marketing
  demandé. Enregistrer un projet n’inscrit pas aux alertes ;
- aucune écriture dans réservations, paiements, consentements ou profils existants.

## Vérification

`npm ci`, puis `npm run test:learning-project` :

- modèle : validation, URL sans texte libre, brouillons, regroupement, états
  inconnus et couverture FR/EN/ES ;
- vrais handlers exécutés avec clients synthétiques : authentification/rôles,
  rattachement au propriétaire, GET sans écriture, erreurs et limitation de débit ;
- PostgreSQL en mémoire (PGlite) : RLS, permissions, sauvegarde/report, synthèse,
  rollback et préservation de fixtures de réservation/paiement ;
- DOM simulé : deux étapes, ville facultative en ligne, interruption/reprise,
  échec puis réussite de sauvegarde, modification non enregistrée, report persistant.

Cette suite est ajoutée à `validate:launch`. Ces vérifications n’utilisent ni
comptes réels, ni Supabase/Stripe de production. Elles ne constituent pas une
répétition sur le schéma complet de production ou un essai Safari physique.

## Revue et activation

La migration est préparée, **pas appliquée**. Faire vérifier le build complet et
le rendu mobile dans l’environnement de revue avant fusion. L’application de
135 est une opération distincte à autoriser ; ne pas lancer un `db push` global
ni rejouer 128 originale : le bootstrap contrôlé 128/134 demeure applicable.

Déployer le schéma approuvé avant d’activer cette version applicative. Si le
schéma est absent ou illisible, la carte affiche une indisponibilité sans
empêcher les cours, la recherche ou les messages. Le retour à la version
applicative précédente peut conserver les projets privés déjà enregistrés.
