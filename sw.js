// ---------- Service Worker GymLog : fonctionnement hors-ligne ----------
// Met en cache l'app shell (HTML/CSS/JS/icônes) pour que l'app se lance et
// fonctionne même sans réseau — ce qui manquait jusqu'ici pour l'usage via
// "Sur l'écran d'accueil" (Safari) ou un raccourci équivalent. Les données
// (séances, poids, réglages...) continuent, elles, de vivre dans le
// stockage local du navigateur (voir KEYS dans 01-config.js) et sont donc
// déjà disponibles hors-ligne indépendamment de ce fichier — Firebase
// (compte, synchro) échoue déjà proprement sans réseau et retombe sur ces
// données locales (voir 04-auth.js), ce Service Worker ne fait que
// permettre à l'app elle-même (le code) de démarrer sans réseau.
//
// Le nom du cache est basé sur le contenu réel du fichier /VERSION (lu à
// l'installation) plutôt que sur un numéro recopié à la main ici — sans ça,
// il aurait fallu penser à mettre à jour ce fichier à CHAQUE publication en
// plus de VERSION/changelogs.rst, et un oubli aurait laissé un appareil
// bloqué sur d'anciens fichiers même en étant en ligne.
const CACHE_PREFIX = "gymlog-shell-v";

// Cœur de l'app : si un seul de ces fichiers manque à l'installation, on
// veut que ça échoue franchement plutôt que de laisser un cache à moitié
// rempli qui donnerait une fausse impression de fonctionner hors-ligne.
const APP_SHELL_CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./VERSION",
  "./css/styles.css",
  "./js/00-firebase-init.js",
  "./js/01-config.js",
  "./js/02-utils.js",
  "./js/03-state.js",
  "./js/04-auth.js",
  "./js/05-scriptable-bridge.js",
  "./js/06-export-import.js",
  "./js/07-home.js",
  "./js/08-settings.js",
  "./js/09a-gym-create.js",
  "./js/09b-gym-history.js",
  "./js/10a-run-create.js",
  "./js/10b-run-history.js",
  "./js/11a-swim-create.js",
  "./js/11b-swim-history.js",
  "./js/12a-bike-create.js",
  "./js/12b-bike-history.js",
  "./js/13-weight.js",
  "./js/14-shared-calendar.js",
  "./js/15-scanner.js",
  "./js/16-performance.js",
  "./js/17-main.js",
  "./js/18-live.js",
  "./icons/apple-touch-icon.png",
  "./icons/apple-touch-icon-120.png",
  "./icons/apple-touch-icon-152.png",
  "./icons/apple-touch-icon-167.png",
  "./icons/favicon-32.png",
];

// SDK Firebase : sur un autre domaine (gstatic.com), une requête peut
// échouer sans réseau au moment de l'installation du Service Worker lui-même
// — on les met en cache "en bonus", sans faire échouer l'installation du
// cœur de l'app si ça ne passe pas (l'app démarre et fonctionne hors-ligne
// avec les données locales même sans Firebase, voir 04-auth.js).
const FIREBASE_SCRIPTS = [
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-database-compat.js",
];

async function readCurrentVersion() {
  return fetch("./VERSION", { cache: "no-store" })
    .then((res) => res.text())
    .then((t) => t.trim())
    .catch(() => "dev");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Le fichier VERSION lui-même doit être lu depuis le réseau (pas de
      // cache existant à ce stade) — s'il est injoignable (toute première
      // installation sans réseau, cas très improbable), on retombe sur
      // "dev" plutôt que de faire échouer l'installation.
      const cacheName = CACHE_PREFIX + (await readCurrentVersion());
      const cache = await caches.open(cacheName);
      await cache.addAll(APP_SHELL_CORE);
      await Promise.all(
        FIREBASE_SCRIPTS.map((url) =>
          fetch(url, { mode: "no-cors" })
            .then((res) => cache.put(url, res))
            .catch(() => {
              // Pas grave : Firebase échoue déjà proprement sans réseau
              // ailleurs dans l'app (données locales en secours).
            })
        )
      );
      // Prend effet immédiatement, sans attendre la fermeture de tous les
      // onglets déjà ouverts — sinon la toute première installation ne
      // servirait le cache qu'au second lancement de l'app.
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Même lecture qu'à l'installation (à quelques secondes d'intervalle,
      // donc la même valeur en pratique) — on évite ainsi de dépendre d'une
      // variable partagée entre les deux évènements, qui ne serait pas
      // fiable à 100 % si le navigateur redémarrait le Service Worker
      // entre-temps.
      const currentCacheName = CACHE_PREFIX + (await readCurrentVersion());
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== currentCacheName).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Retrouve le cache actif (celui dont le nom porte la version courante)
// sans repasser par le réseau — une simple lecture locale de l'API Cache
// Storage, rapide et fiable même hors-ligne (contrairement à un nouveau
// fetch("./VERSION") à chaque requête, qui serait à la fois lent et
// redondant avec ce qui a déjà été résolu à l'installation/l'activation).
async function getActiveCacheName() {
  const keys = await caches.keys();
  return keys.find((k) => k.startsWith(CACHE_PREFIX)) || null;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // On ne s'occupe que des requêtes GET classiques — jamais des échanges
  // avec Firebase (auth, base temps réel), qui doivent toujours passer par
  // le réseau tels quels (l'app gère déjà elle-même leur échec hors-ligne).
  if (req.method !== "GET") return;
  const url = req.url;
  if (url.includes("firebaseio.com") || url.includes("googleapis.com") || url.includes("identitytoolkit")) return;

  event.respondWith(
    (async () => {
      // "Stale-while-revalidate" : on répond tout de suite avec la version
      // en cache si elle existe (rapide, fonctionne hors-ligne, recherche
      // dans tous les caches sans avoir besoin de connaître son nom), tout
      // en rafraîchissant discrètement le cache actif en arrière-plan si le
      // réseau répond — pour ne jamais rester bloqué sur une version
      // périmée plus longtemps que nécessaire une fois de retour en ligne.
      const cached = await caches.match(req);
      const networkFetch = fetch(req)
        .then(async (res) => {
          if (res && res.ok) {
            const cacheName = (await getActiveCacheName()) || CACHE_PREFIX + "dev";
            const cache = await caches.open(cacheName);
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => null);
      return cached || (await networkFetch) || Response.error();
    })()
  );
});
