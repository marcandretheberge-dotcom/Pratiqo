# Audit d’indexation — Pratiqo — 26 octobre 2026 (UTC)

## Conclusion

Les deux notifications du 22 octobre concernent des situations différentes. L’unique exemple « Autre page avec balise canonique correcte » est une variante de recrutement avec paramètre, dont l’exclusion est cohérente. Les 61 exemples « Explorée, actuellement non indexée » mélangent d’anciennes URL, des pages sans offre locale, des ressources techniques et des pages éditoriales encore non retenues par Google.

Les **9 profils présents dans le sitemap servi sont indexés dans Search Console**. Parmi les **10 pages locales du sitemap avec offre réelle**, 6 sont indexées et 4 sont seulement détectées, sans exploration indiquée. Leur réponse actuelle ne révèle pas de blocage technique d’indexation.

Un défaut indépendant est corrigé dans cette branche : les anciens détails publics `/teacher/profile/[id]` sont bloqués par `robots.txt`, ce qui empêche Google de lire leurs signaux canoniques. Leur redirection vers `/professeurs/[slug]` est également temporaire dans le code. La correction rend ces détails explorables et utilise `permanentRedirect` pour les profils admissibles.

Un autre écart demeure **non résolu** : le profil public de Simon est indexable et publié avec consentement, mais absent du sitemap servi. L’inspection Google indique une URL inconnue. Les éléments disponibles ne permettent pas d’attribuer cet écart à une cause précise de cache ou de déploiement ; aucune modification spéculative du sitemap n’est incluse.

## Périmètre et méthode

- Code `main` : `5eda153cfe982470cf6f16ca363227e08e0c9074`.
- Production : GET anonymes du sitemap, des 72 URL qu’il contient, de `robots.txt`, de 9 anciennes URL de profils, de variantes de protocole/hôte/langue/paramètres et de pages sans offre. Analyse du HTML reçu du serveur, sans dépendre de l’exécution JavaScript.
- Lecture des tableaux Search Console : 61 explorées non indexées, 1 autre canonique, 83 indexées, 25 détectées non indexées. Le rapport affichait « Dernière mise à jour : 18/10/2026 » ; ses exemples et les inspections individuelles ne doivent pas être assimilés à l’état HTTP instantané.
- Inspections individuelles : profil de Francis, cours de français à Saint-Georges, cours de piano à Saint-Georges, répertoire de Montréal et profil de Simon.
- Lecture Supabase ciblée, sans mutation : critères de publication de Simon et liste des slugs publiés avec consentement. Aucun changement de consentement, de compte, de publication ou de données.
- L’agent HTTP ressemblant à Googlebot ne prouve pas une visite réelle de Google. Les observations Google proviennent séparément de Search Console.

Les fichiers joints conservent les URL et les observations structurées :

- [Inventaire des 20 profils et pages locales prioritaires](indexation-2026-10-26-priorites.csv)
- [Classification actuelle des 61 exemples explorés non indexés](indexation-2026-10-26-explorees-non-indexees.csv)

## Notification « Autre page avec balise canonique correcte »

URL exacte : `https://www.pratiqo.ca/devenir-professeur?vertical=general`.

La page répond 200 et déclare `https://www.pratiqo.ca/devenir-professeur` comme canonique. L’URL sans paramètre figure dans les exemples indexés. La variante est destinée à rejoindre la même page canonique : ne pas lui donner une canonique autonome et ne pas l’ajouter au sitemap. Google considère ce motif comme normal lorsque la canonique est la page à indexer.

## Profils publics et pages locales

Les 9 profils du sitemap et les 10 pages locales répondent 200, sans redirection, avec une canonique unique vers leur propre URL HTTPS `www`, une directive `index, follow`, sans en-tête `X-Robots-Tag` bloquant. Le HTML serveur contient les titres, les informations publiques des professeurs, les liens utiles et les données structurées. Les profils ne sont pas de simples coquilles JavaScript.

Pour Francis et `/cours/francais/saint-georges`, l’inspection individuelle confirme que la canonique choisie par Google correspond à la canonique déclarée. Cela n’est pas extrapolé aux 18 autres URL : leur canonique HTML a été vérifiée, mais la canonique Google n’a pas été inspectée individuellement.

| Pages locales du sitemap | État Search Console observé |
| --- | --- |
| `/tuteurs/saint-georges` | Indexée |
| `/tuteurs/varennes` | Indexée |
| `/cours/espagnol/saint-georges` | Indexée |
| `/cours/francais/saint-georges` | Indexée |
| `/cours/guitare/saint-georges` | Indexée |
| `/cours/musique/saint-georges` | Indexée |
| `/tuteurs/montreal` | Détectée, actuellement non indexée ; aucune exploration indiquée |
| `/cours/francais/montreal` | Détectée, actuellement non indexée ; aucune exploration indiquée |
| `/cours/mathematiques/varennes` | Détectée, actuellement non indexée ; aucune exploration indiquée |
| `/cours/piano/saint-georges` | Détectée, actuellement non indexée ; aucune exploration indiquée |

Les quatre dernières pages ont une offre réelle et sont déjà découvertes via le sitemap. Montréal est également référencé depuis `/trouver-un-prof?lang=en` selon l’inspection. Leur délai d’exploration ne justifie pas de changer les canoniques ou les règles robots. Suivi ciblé : nouvelle inspection après une exploration Google, comparaison du HTML exploré et, si utile, demande ponctuelle d’indexation après un test d’URL active. Aucune demande ni validation globale n’a été soumise pendant cet audit.

Les alternatives en ligne sont affichées séparément ; elles ne sont pas utilisées comme preuve d’offre locale. Une page sans offre, par exemple `/cours/piano/quebec`, reste `noindex, follow` et hors sitemap. Un chemin non reconnu renvoie 404. Les anciennes variantes locales `/fr/`, `/en/`, `/es/` et `/tuteurs-prive/` reconnues redirigent en 308 vers la route canonique ; les paramètres vérifiés sont conservés.

Le HTML anonyme utilise les libellés anglais par défaut ; un cookie de langue française produit les libellés français avec la même canonique. Ce comportement correspond à la configuration linguistique actuelle. Il n’a pas été modifié ni présenté comme la cause des exclusions.

## Les 61 URL « Explorée, actuellement non indexée »

La validation a commencé le 22 septembre et échoué le 17 octobre, avant les notifications du 22 octobre. Plusieurs dates d’exploration sont anciennes. Le libellé du rapport ne décrit donc pas nécessairement le comportement HTTP actuel.

| Comportement actuel | Nombre | Interprétation et suite |
| --- | ---: | --- |
| Ancienne variante redirigée en 308 vers une page sans offre, en `noindex` | 22 | Exclusion de la variante et de la cible vide cohérente ; ne pas forcer l’indexation |
| URL historique ou non prise en charge, en 404 | 21 | Ne pas recréer des pages vides ; revoir une redirection seulement si un équivalent pertinent est démontré |
| Ancienne variante redirigée en 308 vers une cible indexable | 3 | `/es/cours/piano/saint-georges`, `/fr/cours/mathematiques/varennes`, `/fr` ; conserver la consolidation, suivre les cibles |
| Page éditoriale ou d’acquisition en 200, canonique propre, sans blocage robots détecté | 12 | Pas de correction technique démontrée ; l’indexabilité ne garantit pas la sélection par Google |
| Ressource technique (`favicon.ico`, `sitemap.xml`, `fonts/inter.woff2`) | 3 | Pas d’objectif d’indexation comme page de contenu |

Les 12 pages encore techniquement indexables sont 5 articles `/ressources/`, le hub `/yo/langues` et ses 5 pages de langues, ainsi que `/en/learn-spanish`. Le CSV donne chaque URL. Aucune des 19 URL canoniques prioritaires du sitemap n’apparaît dans ce groupe de 61.

Les 21 réponses 404 ne sont pas toutes déclarées « intentionnelles » par cet audit. Par exemple, une ancienne URL de blog en `/es/` pourrait éventuellement bénéficier d’une redirection vers un contenu équivalent. Ce n’est ni une raison de rendre indexable une page vide ni une cause démontrée du retard d’exploration des profils et pages locales actuels.

## Correction incluse dans la branche

### Anciens détails de profils

En production, `Disallow: /teacher` et `Disallow: /teacher/` englobent les anciens détails publics. Leur canonique correcte dans le HTML ne suffit pas si Google ne peut pas explorer la réponse. Les 9 anciennes URL testées émettent la redirection Next dans une réponse HTML diffusée en streaming : réponse 200 et balise de rafraîchissement à 1 seconde vers le slug canonique. Il ne faut donc pas les décrire comme des réponses HTTP 308 actuelles.

Changements :

1. Dans `lib/seo/robots.ts`, ajout de `Allow: /teacher/profile/`. Le préfixe plus précis autorise les détails ; `/teacher/profile` sans slash final, les réglages, les espaces privés et les API restent bloqués.
2. Dans `app/teacher/profile/[id]/page.tsx`, remplacement de `redirect` par `permanentRedirect` uniquement pour la promotion d’un profil admissible vers son slug canonique. Le mécanisme Next représente un statut 308 ; si la réponse est déjà en streaming, Next utilise un rafraîchissement immédiat. La vérification HTTP du déploiement corrigé reste à faire.
3. Tests de la sérialisation réelle du robots, de la redirection réelle Next, de l’accès par identifiant de professeur ou de propriétaire, des refus de promotion sans consentement/publication/onboarding, et des profils absents ou inactifs.

Les critères d’admissibilité, le sitemap, les pages sans offre et les URL canoniques ne sont pas modifiés. Les anciens détails non admissibles restent `noindex` ou 404. Permettre leur exploration permet aussi à Google de lire cette exclusion. Ce correctif améliore la consolidation ; il n’est pas présenté comme la cause prouvée des notifications, puisque les 9 profils canoniques sont déjà indexés.

### Validation

- 77 vérifications ciblées réussies : nouveaux tests de consolidation (9), profils publics (14), découverte locale (16), fondations SEO (15), erreurs de données du sitemap (2), redirections périphériques (21).
- Contre-épreuve avant correction : 3 nouveaux tests échouent avec les deux fichiers de production de la base ; les 9 passent avec la correction.
- ESLint ciblé sur les fichiers TypeScript modifiés : réussi.
- TypeScript ciblé sur le nouveau test, les directives robots et leurs dépendances : réussi. Ce n’est pas une compilation TypeScript complète de l’application.
- `git diff --check` : réussi.
- Installation depuis le lockfile ; aucune dépendance modifiée.
- Pas de build complet local : le clone Git privé n’était pas authentifié ; les fichiers nécessaires aux contrôles ciblés ont été récupérés à leur SHA exact. Le commit distant est construit sur l’arbre complet de `main`, sans remplacer les autres fichiers du dépôt.

## Écart restant : profil de Simon absent du sitemap

URL : `https://www.pratiqo.ca/professeurs/simon-chimie-riviere-du-loup`.

- Découverte par un lien HTML sur `/tuteurs/saint-georges`, dans les alternatives en ligne.
- GET public : 200, canonique propre, `index, follow`, contenu serveur réel et données structurées `ProfilePage`.
- Lecture Supabase : publication SEO le `2026-10-22 02:27:10.897+00`, profil activé, consentement accordé, visibilité publique, onboarding terminé, propriétaire actif, aucun marqueur de retrait observé. La liste des slugs publiés avec consentement contient 10 lignes, dont Simon.
- Deux lectures du sitemap pendant l’audit contiennent toujours 72 URL, dont 9 profils, sans Simon. La dernière réponse porte `x-vercel-cache: HIT`, `Age: 995` et `Last-Modified: Mon, 26 Oct 2026 00:09:48 GMT`. Cela établit un écart de contenu ; cela ne prouve pas à lui seul la cause du cache.
- Inspection Search Console : « Google ne reconnaît pas cette URL », aucun sitemap référent, aucune exploration. Cette inspection n’est pas une preuve qu’une page correctement publiée depuis quelques jours devrait déjà être indexée.

La logique de `main` utilise la même admissibilité pour la page et les profils du sitemap, avec des caches et invalidations de publication partagés. Ajouter Simon en dur, retirer les filtres ou supprimer le cache sans diagnostic ne serait pas justifié.

Pour résoudre cet écart, il reste à vérifier le SHA effectivement servi, la génération/régénération du sitemap, les erreurs de données et l’invalidation du tag `teacher-public-seo` lors de la publication du 22 octobre. Le connecteur Vercel a refusé l’accès à l’équipe du projet (403 de portée), donc ces preuves de déploiement et journaux n’ont pas pu être obtenues. Aucun cache de production n’a été purgé et aucun déploiement n’a été lancé.

## Données encore nécessaires et limites

**Aucun export d’exemples Search Console supplémentaire n’est nécessaire pour distinguer les deux notifications : les 61 URL et l’unique variante canonique ont été consultées.** Le point ouvert concerne le diagnostic de déploiement/cache pour Simon, pas l’absence d’exemples GSC.

Après intégration et déploiement de la correction, contrôler le robots servi et les anciennes URL de profils, puis vérifier que Google peut lire leur destination. Suivre les quatre pages locales détectées sans exploration. Si une cible passe à « explorée non indexée », recueillir pour cette URL la date d’exploration, le HTML exploré et la canonique choisie par Google avant de conclure à un défaut.

Le rapport global affichait aussi 22 erreurs serveur, 15 exclusions `noindex`, 137 réponses 404 et 4 redirections. Leur totalité n’a pas fait l’objet d’un audit séparé : ces totaux ne doivent pas être assimilés aux résultats du crawl présent. Les GET ponctuels ne remplacent pas les journaux Googlebot et ne permettent pas d’exclure une panne intermittente.

## Sources

- [Notification de validation échouée](https://mail.google.com/mail/u/?authuser=marcandre.theberge%40gmail.com#all/1a16289ff6978969)
- [Notification canonique](https://mail.google.com/mail/u/?authuser=marcandre.theberge%40gmail.com#all/1a16289d74547cd3)
- [GSC — explorées non indexées](https://search.google.com/search-console/index/drilldown?resource_id=sc-domain%3Apratiqo.ca&item_key=CAMYFyAC)
- [GSC — autre canonique](https://search.google.com/search-console/index/drilldown?resource_id=sc-domain%3Apratiqo.ca&item_key=CAMYGCAC)
- [GSC — indexées](https://search.google.com/search-console/index/drilldown?resource_id=sc-domain%3Apratiqo.ca&item_key=CAMYASAB)
- [GSC — détectées non indexées](https://search.google.com/search-console/index/drilldown?resource_id=sc-domain%3Apratiqo.ca&item_key=CAMYFiAC)
- [Sitemap de production](https://www.pratiqo.ca/sitemap.xml), [robots de production](https://www.pratiqo.ca/robots.txt)
- [Code du sitemap audité](https://github.com/marcandretheberge-dotcom/Pratiqo/blob/5eda153cfe982470cf6f16ca363227e08e0c9074/app/sitemap.ts)
- [Google — consolidation des doublons](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google — redirections](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
- [Google — rapport d’indexation](https://support.google.com/webmasters/answer/7440203)
- Documentation installée de Next.js 16.2.9 : `permanentRedirect`, convention de métadonnées `robots`, sérialisation des métadonnées.
