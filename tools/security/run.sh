#!/bin/sh
# Batterie de tests de sécurité de GymLog. Nécessite : Node.js, Playwright (avec Chromium), python3.
# Usage : sh tools/security/run.sh        (PORT=8808 par défaut)
# Ces tests font entrer des données PIÉGÉES par chacun des chemins d'entrée de l'app (cloud simulé,
# import d'une séance, import d'une sauvegarde), affichent tous les écrans et détectent toute
# exécution de code / balise injectée ; ils vérifient aussi qu'un fichier malformé ne peut pas
# empêcher l'app de démarrer, et que des données LÉGITIMES ressortent à l'identique.
# Tout se passe en local, sur une copie servie par python : aucun vrai serveur n'est contacté.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
PROJ_DIR="$(cd "$HERE/../.." && pwd)"
PARENT="$(dirname "$PROJ_DIR")"
NAME="$(basename "$PROJ_DIR")"
PORT="${PORT:-8808}"
(cd "$PARENT" && python3 -m http.server "$PORT" >/dev/null 2>&1) &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1
cd "$HERE"
echo; echo "=== 1/3  Injection : 3 chemins d'entrée x 5 charges x (texte | texte+nombres) — attendu : 0 partout ==="
node xss_matrix.js "$NAME" "$PORT"
echo; echo "=== 2/3  Robustesse : fichiers malformés / malveillants — attendu : app démarre, aucune erreur ==="
node robust.js "$NAME" "$PORT"
echo; echo "=== 3/3  Données légitimes — attendu : identiques sur les 5 chemins ==="
node legit.js "$NAME" "$PORT"
echo; echo "(Test détaillé champ par champ, plus long : node tools/security/xss_leaf.js $NAME $PORT)"
