#!/usr/bin/env python3
"""Prépare une publication de GymLog : versionne les fichiers et vérifie la cohérence.

Usage :
    python3 tools/release.py           # applique le versionnage, puis vérifie
    python3 tools/release.py --check   # vérifie seulement (code retour 1 si un problème)

Pourquoi : chaque fichier JS/CSS est demandé avec "?v=<VERSION>" dans index.html.
Une adresse change donc à chaque version, ce qui rend le contenu d'une adresse
IMMUABLE : le service worker (sw.js) peut le garder pour toujours sans risque de
servir une vieille copie, et une page ne peut plus mélanger des fichiers de deux
versions. sw.js reçoit lui aussi la version (BUILD_VERSION) : ses octets changent à
chaque publication, ce qui déclenche son installation et le nettoyage de l'ancien cache.

La source de vérité reste le fichier VERSION. Ce script ne l'invente pas, il le propage.
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECK_ONLY = "--check" in sys.argv

# <script src="./js/x.js"> et <link href="./css/x.css"> (les icônes, le manifeste et
# les scripts d'autres domaines ne sont PAS versionnés)
ASSET_RE = re.compile(r'(<(?:script|link)\b[^>]*?\b(?:src|href)=")(\./(?:js|css)/[^"?]+)(\?v=[^"]*)?(")')
SW_RE = re.compile(r'const BUILD_VERSION = "[^"]*";')


def path(p):
    return os.path.join(ROOT, p)


def read(p):
    with open(path(p), encoding="utf-8") as f:
        return f.read()


def write(p, s):
    with open(path(p), "w", encoding="utf-8") as f:
        f.write(s)


version = read("VERSION").strip()
if not re.fullmatch(r"\d+\.\d+\.\d+", version):
    sys.exit(f"ERREUR : VERSION invalide : {version!r} (attendu : MAJEUR.MINEUR.CORRECTIF)")

html = read("index.html")
sw = read("sw.js")

if not CHECK_ONLY:
    html = ASSET_RE.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={version}{m.group(4)}", html)
    if not SW_RE.search(sw):
        sys.exit('ERREUR : sw.js ne contient pas la ligne `const BUILD_VERSION = "...";`')
    sw = SW_RE.sub(f'const BUILD_VERSION = "{version}";', sw)
    write("index.html", html)
    write("sw.js", sw)

problems = []

# 1) Tous les JS/CSS locaux de index.html : versionnés avec LA bonne version, et présents sur le disque
refs = ASSET_RE.findall(html)
if not refs:
    problems.append("index.html ne référence aucun fichier JS/CSS local (regex à revoir ?)")
for _, url, query, _ in refs:
    if query != f"?v={version}":
        problems.append(f"{url} : versionnage absent ou périmé ({query or 'aucun'} au lieu de ?v={version})")
    if not os.path.exists(path(url[2:])):
        problems.append(f"{url} : référencé par index.html mais introuvable sur le disque")

# 2) Aucun fichier JS du dossier js/ oublié dans index.html
referenced = {url for _, url, _, _ in refs}
for name in sorted(os.listdir(path("js"))):
    if name.endswith(".js") and f"./js/{name}" not in referenced:
        problems.append(f"js/{name} existe mais n'est pas chargé par index.html")

# 3) sw.js porte la même version
m = re.search(r'const BUILD_VERSION = "([^"]*)";', sw)
if not m or m.group(1) != version:
    problems.append(f"sw.js : BUILD_VERSION = {m.group(1) if m else 'absent'} au lieu de {version}")

# 4) Le changelog commence par cette version
heads = re.findall(r"^(\d+\.\d+\.\d+) - \d{4}-\d{2}-\d{2}$", read("changelogs.rst"), re.M)
if not heads or heads[0] != version:
    problems.append(f"changelogs.rst : l'entrée la plus récente est {heads[0] if heads else 'absente'}, pas {version}")

# 5) Fichiers tiers hébergés (vendor/) : l'empreinte enregistrée doit correspondre au contenu réel,
#    et le code doit pointer vers un fichier qui existe. Évite qu'une copie modifiée passe inaperçue.
import base64
import hashlib

sources = read("vendor/SOURCES.txt")
for fname, expected in re.findall(r"^(\S+\.min\.js)\n(?:.*\n)*?\s+(sha384-\S+)", sources, re.M):
    if not os.path.exists(path(f"vendor/{fname}")):
        problems.append(f"vendor/{fname} : listé dans SOURCES.txt mais absent")
        continue
    with open(path(f"vendor/{fname}"), "rb") as f:
        actual = "sha384-" + base64.b64encode(hashlib.sha384(f.read()).digest()).decode()
    if actual != expected:
        problems.append(f"vendor/{fname} : empreinte {actual[:24]}… différente de celle de SOURCES.txt ({expected[:24]}…) — fichier modifié ?")
    if f"./vendor/{fname}" not in read("js/15-scanner.js"):
        problems.append(f"js/15-scanner.js ne charge plus vendor/{fname}")
if not re.search(r"sha384-", sources):
    problems.append("vendor/SOURCES.txt : aucune empreinte trouvée")

# 6) Syntaxe JS (si node est disponible)
try:
    for name in sorted(os.listdir(path("js"))) + ["../sw.js"]:
        if name.endswith(".js"):
            r = subprocess.run(["node", "--check", path(os.path.join("js", name))], capture_output=True, text=True)
            if r.returncode != 0:
                problems.append(f"{name} : erreur de syntaxe -> {r.stderr.strip().splitlines()[0] if r.stderr else '?'}")
except FileNotFoundError:
    print("(node introuvable : vérification de syntaxe ignorée)")

if problems:
    print(f"ÉCHEC — {len(problems)} problème(s) pour la version {version} :")
    for p in problems:
        print("  -", p)
    sys.exit(1)
print(f"OK — version {version} : {len(refs)} fichiers versionnés dans index.html, sw.js à jour, changelog à jour.")
