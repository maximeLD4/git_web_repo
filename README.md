# git_web_repo
## Publier une version

1. Mettre à jour `VERSION` (source de vérité) et ajouter l'entrée correspondante **en haut** de `changelogs.rst`.
2. Lancer `python3 tools/release.py`.

Le script versionne les fichiers (`?v=<VERSION>` dans `index.html`, `BUILD_VERSION` dans `sw.js`) puis **vérifie** que tout est cohérent (versions, fichiers présents, aucun JS oublié, changelog à jour, syntaxe). Il échoue avec un message clair au moindre écart : ne pas publier tant qu'il n'affiche pas `OK`. `python3 tools/release.py --check` vérifie sans rien modifier.

Pourquoi : chaque fichier est demandé avec sa version, donc le contenu d'une adresse ne change jamais et le cache hors-ligne (`sw.js`) peut la garder sans risque de mélanger deux versions.


## Sécurité

**Modèle.** App personnelle, données dans le stockage local de l'appareil et synchronisées dans une base Firebase par compte (`users/<uid>/...`). Les données **extérieures** entrent par trois chemins : le cloud (`pullFromFirebase`), l'import d'une séance partagée et l'import d'une sauvegarde (le pont Scriptable passe par ce dernier). Leurs valeurs finissent dans des gabarits HTML, dont ~100 attributs (`data-edit-session="${s.id}"`…).

**Ce qui est en place**
- *Normalisation à l'entrée* (`sanitizeExternalValue`, `shape*` dans `js/02-utils.js`) sur les trois chemins : identifiants limités à `[A-Za-z0-9_-]`, dates validées, `<` `>` remplacés par `＜` `＞`, formes (listes/objets) garanties, profondeur bornée, clés `__proto__`/`constructor` ignorées. La forme est aussi garantie **au démarrage** : une donnée abîmée ne peut plus empêcher l'app de se lancer.
- *Filet central* (`domGuard`) : retire tout attribut `on*=`, balise exécutable et URL `javascript:` apparus dans l'interface. Il n'arrête **pas** un `<svg onload>` (exécuté pendant l'affichage) : la normalisation reste la protection principale.
- Anti-*clickjacking* (l'app se cache si elle est affichée dans un cadre), connexion sans fuite d'information (message générique), service worker qui ne touche jamais aux échanges Firebase.
- Tesseract (script exécuté avec accès complet à la page) est **hébergé** dans `vendor/` à version figée, avec contrôle d'empreinte dans `tools/release.py`. Son worker et son moteur WASM (isolés, sans accès à la page) restent chargés depuis le CDN.

**Tester** : `sh tools/security/run.sh` (Node + Playwright). À rejouer avant chaque publication qui touche aux données, à l'import/export ou à l'affichage de nouveaux champs. Quand on ajoute un champ de texte, vérifier qu'il traverse bien la normalisation.

**À vérifier côté Firebase (non vérifiable depuis le code)**
1. *Règles de la base* : comparer avec `docs/firebase-database.rules.example.json` (lecture/écriture limitées à `auth.uid === $uid`, rien à la racine, clés inconnues refusées). **C'est la protection qui empêche un tiers d'écrire dans tes données**, donc la plus importante.
2. *Authentification* → réglages : désactiver la création de compte (l'app n'a pas de formulaire d'inscription, mais la clé publique permet d'en créer via l'API), activer la protection contre l'énumération d'e-mails, exiger un mot de passe robuste.
3. *Clé API* (Google Cloud → Identifiants) : la restreindre aux domaines qui hébergent l'app. La clé est publique par conception ; la restriction limite son usage détourné.

**Recommandé, non appliqué.** Une politique `Content-Security-Policy` (la seule protection qui arrête aussi un `<svg onload>`). Elle n'est pas posée car elle ne peut pas être validée sans accès à ton vrai Firebase : un `connect-src` incomplet casserait la connexion ou la synchro. Piste : `default-src 'self'; script-src 'self' https://www.gstatic.com 'wasm-unsafe-eval'; connect-src 'self' https://*.firebasedatabase.app wss://*.firebasedatabase.app https://*.googleapis.com https://cdn.jsdelivr.net https://tessdata.projectnaptha.com; worker-src blob: ; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; object-src 'none'; base-uri 'self'` — à tester sur un exemplaire de l'app (connexion, synchro, scanner) avant toute mise en ligne. Il faudrait aussi sortir le petit script en ligne de `index.html` (enregistrement du service worker). Autre piste : héberger aussi les trois fichiers du SDK Firebase (aujourd'hui chargés depuis `gstatic.com`, version 10.13.0 alors que la dernière stable est bien plus récente).

**Limites connues.** Données en clair dans le stockage local (le blocage d'un appareil volé repose sur le verrouillage du téléphone) ; « Se déconnecter » conserve le cache local pour l'usage hors-ligne (il est vidé automatiquement si un *autre* compte se connecte) ; zoom interdit (`user-scalable=no`), choix assumé.
