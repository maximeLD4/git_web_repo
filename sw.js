// ---------- Service Worker GymLog : fonctionnement hors-ligne ----------
// Met en cache l'app (HTML/CSS/JS/icônes) pour qu'elle se lance et fonctionne
// même sans réseau. Les données (séances, poids, réglages...) vivent, elles,
// dans le stockage local (voir KEYS dans 01-config.js) : ce fichier ne s'occupe
// que du CODE de l'app.
//
// Principe : des adresses IMMUABLES.
//   index.html demande ses fichiers avec "?v=<VERSION>" (posé par
//   tools/release.py). Le contenu d'une adresse donnée ne change donc jamais :
//   on peut le garder dans le cache indéfiniment sans risque de servir une
//   vieille copie, et une page ne peut pas mélanger des fichiers de deux
//   versions — elle reçoit TOUS ses fichiers de la version que son index.html
//   désigne. Seules les "portes d'entrée" (index.html, manifest, VERSION)
//   peuvent changer : celles-là passent par le réseau d'abord.
//
// BUILD_VERSION est posée par tools/release.py : les octets de ce fichier
// changent à chaque publication, ce qui déclenche l'installation d'un nouveau
// Service Worker (donc d'un nouveau cache complet) et la suppression des anciens.
const BUILD_VERSION = "2.79.2";
const CACHE_PREFIX = "gymlog-shell-";
const CACHE_NAME = CACHE_PREFIX + BUILD_VERSION;

// Réseau trop lent ou "connecté au wifi sans internet" : on ne bloque pas l'app,
// on retombe sur le cache après ce délai (portes d'entrée seulement).
const ENTRY_TIMEOUT_MS = 3000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

// Une porte d'entrée est une adresse dont le contenu peut changer sans que son
// adresse change : la page elle-même, le manifeste, VERSION, et — par prudence —
// tout JS/CSS NON versionné (si le versionnage a été oublié, on retombe sur un
// comportement sûr plutôt que de figer une vieille copie).
function isEntry(req, url) {
  if (req.mode === "navigate") return true;
  if (url.searchParams.has("v")) return false;
  return /\/(?:index\.html|manifest\.json|VERSION)$/.test(url.pathname) || /\.(?:js|css)$/.test(url.pathname) || url.pathname.endsWith("/");
}

function freshRequest(req) {
  // "no-cache" : revalider auprès du serveur (sinon l'hébergeur peut resservir
  // une copie vieille de plusieurs minutes).
  try {
    return new Request(req, { cache: "no-cache" });
  } catch (e) {
    return req;
  }
}

// ---------- Installation : on précharge TOUT ce que l'index.html désigne ----------
// La liste des fichiers n'est plus tenue à la main (un oubli cassait le hors-ligne
// sans prévenir) : on lit l'index.html de CETTE version et on en déduit les
// adresses exactes, versionnées comprises.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const htmlRes = await fetch(new Request("./index.html", { cache: "reload" }));
      if (!htmlRes.ok) throw new Error("index.html introuvable à l'installation");
      const html = await htmlRes.clone().text();

      const local = new Set(["./manifest.json", "./VERSION"]);
      const external = new Set();
      for (const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
        const u = m[1];
        if (u.startsWith("./")) local.add(u);
        else if (/^https:\/\/www\.gstatic\.com\/firebasejs\//.test(u)) external.add(u);
      }

      // Cœur de l'app : un seul fichier manquant doit faire ÉCHOUER l'installation
      // plutôt que laisser un cache à moitié rempli qui fait croire au hors-ligne.
      await Promise.all([...local].map((u) => fetch(new Request(u, { cache: "reload" })).then((r) => {
        if (!r.ok) throw new Error(u + " : HTTP " + r.status);
        return cache.put(u, r);
      })));
      await cache.put("./index.html", htmlRes.clone());
      await cache.put("./", htmlRes);

      // SDK Firebase (autre domaine) : "en bonus", sans faire échouer l'installation
      // — l'app démarre et fonctionne hors-ligne avec les données locales sans lui.
      await Promise.all([...external].map((u) => fetch(u, { mode: "no-cors" }).then((r) => cache.put(u, r)).catch(() => {})));

      // Prend effet immédiatement, sans attendre la fermeture des onglets ouverts.
      self.skipWaiting();
    })()
  );
});

// ---------- Activation : on ne garde que le cache de CETTE version ----------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// ---------- Service des requêtes ----------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Seulement les GET : jamais les échanges Firebase (auth, base temps réel),
  // qui doivent passer par le réseau tels quels (l'app gère déjà leur échec
  // hors-ligne en retombant sur les données locales).
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // (domaines de la base temps réel — firebaseio.com ET firebasedatabase.app, utilisé par
  // les bases créées en Europe — et de l'authentification)
  if (/firebaseio\.com|firebasedatabase\.app|firebaseapp\.com|googleapis\.com|identitytoolkit/.test(url.hostname + url.pathname)) return;
  // waitUntil doit être appelé de façon SYNCHRONE (pendant l'évènement) : on
  // collecte donc les tâches d'arrière-plan (mise à jour du cache) dans une
  // liste, et on promet au navigateur de rester en vie jusqu'à leur fin.
  const background = [];
  const answer = handle(req, url, background);
  event.respondWith(answer);
  event.waitUntil(answer.catch(() => {}).then(() => Promise.allSettled(background)));
});

async function handle(req, url, background) {
  const cached = await caches.match(req);

  // Autres domaines (SDK Firebase...) : cache d'abord — ces fichiers ne changent
  // pas avec l'app.
  if (url.origin !== self.location.origin) {
    return cached || (await fetch(req).catch(() => null)) || Response.error();
  }

  // Fichier versionné (adresse immuable) : le cache fait foi, pour toujours.
  // Absent (premier chargement de cette version avant la fin de l'installation) :
  // réseau, puis mémorisation.
  if (url.searchParams.has("v") && !isEntry(req, url)) {
    if (cached) return cached;
    const res = await fetch(req).catch(() => null);
    if (res && res.ok) background.push(caches.open(CACHE_NAME).then((c) => c.put(req, res.clone())).catch(() => {}));
    return res || Response.error();
  }

  // Autres fichiers de l'app non versionnés mais qui n'ont pas de raison de
  // changer vite (icônes) : cache d'abord, rafraîchi en arrière-plan.
  if (!isEntry(req, url)) {
    const refresh = fetch(freshRequest(req))
      .then(async (res) => {
        if (res && res.ok) await (await caches.open(CACHE_NAME)).put(req, res.clone()).catch(() => {});
        return res;
      })
      .catch(() => null);
    background.push(refresh);
    return cached || (await refresh) || Response.error();
  }

  // Portes d'entrée : réseau d'abord (c'est ELLES qui désignent la version à
  // utiliser), cache en secours si le réseau échoue ou dépasse le délai.
  const network = fetch(freshRequest(req))
    .then(async (res) => {
      if (res && res.ok) {
        const copy = res.clone(); // avant tout await : le corps n'est pas encore consommé
        try {
          await (await caches.open(CACHE_NAME)).put(req, copy);
        } catch (e) {
          // Cache indisponible (stockage plein...) : la réponse réseau reste valable.
        }
      }
      return res;
    })
    .catch(() => null);
  background.push(network);
  if (!cached) return (await network) || Response.error();
  const res = await Promise.race([network, delay(ENTRY_TIMEOUT_MS)]);
  return res && res.ok ? res : cached;
}
