# Projet d’apprentissage élève

## Correctif du 18 octobre 2026 — sauvegarde et liste admin

**135 est déjà appliquée et #407 déployée.** La nouvelle migration
`136_learning_project_save_and_directory.sql` est préparée, non appliquée.

### Incident confirmé

Le journal Vercel du **18 octobre 2026 à 12:55:12 America/Toronto** montre
`PUT /api/student/learning-project → 503` avec
`[rateLimit] Upstash Redis is not configured — denying requests (fail closed in production).`
L'appel SQL de sauvegarde n'est pas atteint. La lecture du projet fonctionne ;
la ville libre « St-Georges » n'est pas la cause. Le précontrôle Supabase en
lecture seule confirme la présence de 135, les droits/RLS attendus et l'absence
de projet enregistré pour le compte concerné. Aucun identifiant privé n'est
nécessaire à ce diagnostic.

### Correction

- Quota conservé : **30 sauvegardes ou reports par minute et par élève**, dans une table
  privée avec une seule ligne par compte. L'upsert verrouille le compteur ;
  aucune remise à zéro possible par le client. Pas de nouveau service payant.
- Trigger après écriture : une sauvegarde par upsert ne consomme qu'une unité.
  Le quota couvre aussi l'ancien RPC et les INSERT/UPDATE directs. Les DELETE
  restent soumis à la RLS existante et ne réinitialisent pas le compteur ;
  les suppressions de comptes en cascade restent possibles. L'échec annule
  la modification du projet ; compteur et projet sont transactionnels.
- RPC `save_student_learning_project_v2`, SECURITY INVOKER, conserve l'identité
  JWT et la RLS. Son nom impose la présence de 136 : pas de repli non limité
  si le code arrive avant la migration. L'API retourne 429 avec Retry-After
  et un message distinct conservant la saisie. Les autres limites Redis
  de l'application ne sont pas modifiées.
- `/admin/learning-project-demand` présente d'abord les **élèves individuellement** :
  nom/courriel, ville du profil, ville souhaitée pour les cours, matière,
  format, destinataire et statut de réponse. Tous les comptes élèves sont
  inclus, y compris les réponses reportées et manquantes ; comptes inactifs signalés.
  Recherche littérale par nom/courriel/ville/matière, filtre de réponse,
  pagination serveur de 25 comptes, lien vers le dossier admin existant.
- La ville souhaitée ne devient jamais une localisation résidentielle supposée.
  Une valeur absente est affichée « Non renseignée ». La synthèse de la demande
  et de l'offre reste disponible dans une section dépliable.
- Le nouveau RPC de liste est réservé au rôle serveur, derrière
  `requireAdminApi`. Réponses privées sans cache, aucun export ou envoi ajouté.

### Validation du correctif

`npm run test:learning-project` couvre désormais le vrai handler relié au SQL
PGlite avec identité synthétique, en mode production et **sans variables Redis** :
ancien limiteur → 503 ; RPC v2 absent → 503 ; après 136 → sauvegarde et relecture
réussies de « St-Georges ». Quota à 30, rejet de la 31e écriture, nouveau créneau,
RLS propriétaire, refus professeur/anonyme, ancien RPC/écriture directe,
rollback du compteur et projet, données existantes préservées.

La liste SQL est testée sur 29 comptes synthétiques : pagination sans doublon,
élèves sans réponse, recherche et filtres, villes distinctes, droits serveur.
Les vrais handlers refusent les accès non admin et les paramètres invalides.
Le DOM simulé teste recherche, pagination, filtrage, erreur/reprise et absence
de faux état vide. TypeScript ciblé et `git diff --check` passent.

Ces preuves ne sont pas un build complet, un test Safari physique, un test de
concurrence multisession ni une restauration complète du schéma de production.
Les contrôles hébergés et l'application ciblée restent des étapes distinctes.

### Activation contrôlée de 136

1. Confirmer le projet `jwlbwmxoradmbuvqfkhe`, une sauvegarde récente restaurable,
   135 présente, 136 absente, aucune collision avec les nouveaux objets et les
   colonnes de profils utilisées. Ne pas lancer de `db push` global.
2. Répéter 136 dans l'environnement isolé compatible avec le schéma restauré.
   Vérifier le rollback et, avec deux sessions, le plafond lors d'écritures
   concurrentes. Aucune fixture via une Preview partageant la production.
3. Après autorisation, appliquer **136 seule** en transaction avec délais
   de verrouillage adaptés ; vérifier historique, trigger, RLS/grants et RPC.
   Recharger le cache PostgREST. Ne pas rejouer 135 ni 128 originale.
4. Fusionner/déployer le correctif après validation des checks et autorisation.
   Avec une session élève, enregistrer un besoin réel puis recharger ; avec une
   session admin, vérifier sa ligne et la synthèse sans créer de fausse demande.

Retour arrière applicatif possible en conservant 135/136, réponses et protections.
Il réintroduirait le blocage Redis de l'ancien code tant que Redis n'est pas
configuré. Ne pas supprimer les réponses ni le compteur pour contourner un échec.

## Historique de la première version (135 / PR #407)

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
les recherches répétées, ni le nombre réel d’enfants. La première version
exposait seulement une synthèse ; le correctif 136 ajoute la liste nominative
décrite plus haut, sans outil de relance.

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

Au moment de cette revue initiale, 135 était préparée et non appliquée.
Elle a depuis été appliquée et #407 déployée. Le build complet et le rendu mobile
synthétique sont documentés ci-dessous pour la revue avant fusion. L’application de
135 est une opération distincte à autoriser ; ne pas lancer un `db push` global
ni rejouer 128 originale : le bootstrap contrôlé 128/134 demeure applicable.

Déployer le schéma approuvé avant d’activer cette version applicative. Si le
schéma est absent ou illisible, la carte affiche une indisponibilité sans
empêcher les cours, la recherche ou les messages. Le retour à la version
applicative précédente peut conserver les projets privés déjà enregistrés.

## Finalisation de revue — 18 octobre 2026

Worktree isolé `learner-learning-project`, branche `feat/learner-learning-project`,
base `936cf5c39214d4fb1699decb2e215ac10d6c14d7`. Aucun changement au worktree
learner-funnel, à la Preview, ni aux données de production.

### Correction démontrée

Un brouillon plus récent que le projet enregistré était chargé en mémoire, mais
la carte affichait encore le résumé ancien. Le test DOM ajouté échouait avant
correction. La reprise ouvre désormais le formulaire et sa bonne étape ; les
changements d'étape suivants sont aussi conservés. Un report enregistré conserve
son affichage compact et n'impose pas de formulaire au retour.

### QA navigateur reproductible

Après le build, lancer `node tests/students/learningProjectBrowser.mjs` et ouvrir
l'URL loopback affichée. Le serveur refuse les autres noms d'hôte, ne lit aucun
secret et n'appelle aucun service externe. Son CSP limite les connexions à lui-même.

Le banc monte les vrais `StudentDashboard`, `StudentLearningProject`,
`LearningProjectCard` et la page de synthèse admin, avec le CSS du build. Auth,
transport de données et navigation Next sont des adaptateurs synthétiques.
Les dialogues d'annulation/replanification et les crédits ne sont pas exercés.
Ce n'est pas un test de connexion ni une réservation réelle. Les vrais handlers
et le SQL/RLS sont vérifiés séparément par `test:learning-project`.

Scénarios exécutés dans le navigateur Codex, viewports 390×844 et 320×740 :

- Matière puis ville/format, passage entre les deux étapes : PASS.
- Rechargement à la deuxième étape : ville et format conservés, message de reprise : PASS.
- Erreur 503 synthétique, valeurs conservées, reprise puis nouvelle sauvegarde : PASS.
- Modification interrompue d'un projet déjà enregistré : formulaire récupéré : PASS.
- Report puis rechargement : carte compacte, sans nouvelle sollicitation : PASS.
- Cours confirmé fictif toujours visible avec ses actions et lien vers le prof : PASS.
- Aucun débordement horizontal : largeur document 375/305 px pour viewport 390/320 px.
- Synthèse admin : trois comptes, un projet, un report, une absence de réponse ;
  offre inconnue explicitement distinguée d'une offre absente : PASS.

La fixture admin reproduit les totaux vérifiés par le test PostgreSQL (trois
élèves et un professeur exclu du décompte). Aucun nom/contact d'élève n'est affiché.
Captures locales hors dépôt : `../pr407-qa/student-320.jpg` et `admin-320.jpg`.

### Limites de cette validation

Safari physique et connexion réelle de bout en bout ne sont pas revendiqués.
La migration 135 reste préparée uniquement : aucune application en production,
aucune modification de la pile Supabase existante. Le test PostgreSQL utilise
une base en mémoire synthétique, pas une répétition complète du catalogue de production.
Le banc navigateur ne doit jamais être déployé ni exposé hors loopback.

### Commandes de finalisation

- `npm ci --ignore-scripts --no-audit --no-fund` : PASS, installation isolée depuis le lockfile.
- `npm run test:learning-project` : PASS après correction (modèle, handlers, PostgreSQL/RLS, DOM).
- `npx tsx tests/student/studentRoleExperience.test.ts` : PASS.
- `node --import tsx scripts/validate_i18n.ts` : PASS, 3544 clés par langue.
- `next build` via le lanceur Node ci-dessous : PASS, Next 16.2.9, TypeScript et 332 pages.
- `npx tsc --noEmit --incremental false` : PASS sur l'arbre final complet. Une première exécution avait signalé deux gardes de nullité manquants dans la correction de reprise ; corrigés et contrôle entièrement relancé.
- `npx eslint components/student/LearningProjectCard.tsx tests/students/learningProjectBrowserFixture.tsx` : PASS, zéro erreur, un avertissement existant `set-state-in-effect` sur l'initialisation du chargement.
- `node --check tests/students/learningProjectBrowser.mjs` et `node --check tests/students/learningProjectDom.mjs` : PASS.
- `git diff --check` : PASS.

Commande exacte du build isolé (aucun fichier `.env` de production chargé) :

```powershell
node -e "const {spawnSync}=require('node:child_process');const env=require('../pr405-local-sandbox/local-env.cjs').getLocalEnv();const r=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build'],{env,stdio:'inherit'});process.exit(r.status??1)"
```

Le lanceur réutilise uniquement les identifiants synthétiques locaux existants,
une liste fermée de variables système et le garde réseau loopback. Les builds
signalent l'option existante `experimental.forceSwcTransforms` ignorée par
Turbopack ; cela n'empêche pas leur réussite.

Contrôle supplémentaire non vert : ESLint incluant les fichiers `.cjs` échoue
avant analyse sur `react-hooks/immutability` sans plugin pour ce format. La
configuration est identique à la base (`git diff 936cf5c3 -- eslint.config.mjs`
vide). Aucune règle n'a été désactivée. Ce résultat n'est pas présenté comme
une validation lint globale réussie ; les composants TSX et la syntaxe CJS ont
été contrôlés séparément.
