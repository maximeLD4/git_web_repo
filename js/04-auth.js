/* ---------- Authentification Firebase (remplace l'ancien mot de passe unique) ---------- */
/* Chaque profil = un compte email/mot de passe créé dans la console Firebase.
   Se connecter revient à choisir son profil. La session reste active sur cet
   appareil tant qu'on ne se déconnecte pas explicitement (voir 00-firebase-init.js). */

/* ---------- Synchro Firebase : un "tiroir" par domaine, pas un seul bloc ----------
   Chaque domaine (séances par sport, library par sport, exercices configurés,
   poids) vit sous son propre chemin Firebase et se synchronise indépendamment
   des autres — modifier une pesée sur un appareil n'écrase plus les séances
   pas encore synchronisées d'un autre appareil, et inversement. */

const FIREBASE_SYNC_MAP = {
  [KEYS.sessions]: { path: "sessions/gym", getValue: () => sessions },
  [KEYS.runSessions]: { path: "sessions/run", getValue: () => runSessions },
  [KEYS.swimSessions]: { path: "sessions/swim", getValue: () => swimSessions },
  [KEYS.bikeSessions]: { path: "sessions/bike", getValue: () => bikeSessions },
  [KEYS.library]: { path: "library/gym", getValue: () => library },
  [KEYS.runLibrary]: { path: "library/run", getValue: () => runLibrary },
  [KEYS.swimLibrary]: { path: "library/swim", getValue: () => swimLibrary },
  [KEYS.bikeLibrary]: { path: "library/bike", getValue: () => bikeLibrary },
  [KEYS.gymExerciseConfigs]: { path: "gymExerciseConfigs", getValue: () => gymExerciseConfigs },
  [KEYS.gainageExerciseConfigs]: { path: "gainageExerciseConfigs", getValue: () => gainageExerciseConfigs },
  [KEYS.sessionPlans]: { path: "sessionPlans", getValue: () => sessionPlans },
  [KEYS.weights]: { path: "weights", getValue: () => weights },
};

let firebaseSyncTimer = null;
// Persisté (pas seulement en mémoire) : si l'app se ferme ou se fait tuer
// pendant qu'on est hors-ligne, la mémoire vive est perdue, mais cette liste
// doit survivre pour qu'on sache, à la prochaine ouverture, qu'il reste des
// données à envoyer au cloud — sans ça, une séance enregistrée hors-ligne
// puis jamais rouverte en étant en ligne resterait silencieusement absente
// du cloud (toujours en sécurité en local, mais jamais synchronisée).
let firebaseDirtyKeys = new Set(loadJSON(KEYS.firebaseDirtyKeys, []));
// Compteur par clé, incrémenté à chaque modification (voir scheduleFirebaseSync)
// — permet à un envoi de savoir si la donnée a de nouveau changé PENDANT
// qu'il était lui-même en vol, auquel cas il ne doit surtout pas retirer
// cette clé des clés "à synchroniser" (voir pushToFirebase) : sans ce
// suivi, une modification faite pendant l'envoi précédent pourrait se
// retrouver marquée "synchronisée" alors qu'elle n'a jamais réellement
// été envoyée.
let firebaseKeyVersions = {};

function persistFirebaseDirtyKeys() {
  saveJSON(KEYS.firebaseDirtyKeys, Array.from(firebaseDirtyKeys));
}

function scheduleFirebaseSync(key) {
  if (!currentUser) return;
  if (key && FIREBASE_SYNC_MAP[key]) {
    firebaseDirtyKeys.add(key);
    firebaseKeyVersions[key] = (firebaseKeyVersions[key] || 0) + 1;
    persistFirebaseDirtyKeys();
  }
  refreshCloudSyncBadge();
  clearTimeout(firebaseSyncTimer);
  firebaseSyncTimer = setTimeout(requestFirebasePush, 1500);
}

// Jamais deux envois en vol en même temps : sur une connexion lente, un
// envoi démarré tôt pourrait sinon arriver au serveur APRÈS un envoi
// démarré plus tard (contenant des données plus fraîches), et l'écraser
// silencieusement avec une version plus ancienne. On sérialise donc : si un
// envoi est déjà en cours, celui-ci se contente de redéclencher un nouveau
// cycle juste après, plutôt que de partir en parallèle.
let firebasePushInFlight = null;
function requestFirebasePush() {
  if (firebasePushInFlight) {
    firebasePushInFlight.then(() => {
      if (firebaseDirtyKeys.size > 0) requestFirebasePush();
    });
    return firebasePushInFlight;
  }
  firebasePushInFlight = pushToFirebase().finally(() => {
    firebasePushInFlight = null;
  });
  return firebasePushInFlight;
}

function pushToFirebase() {
  if (!currentUser) return Promise.resolve();
  // On ne pousse que les domaines réellement modifiés depuis la dernière
  // synchro confirmée — c'est précisément ce qui évite d'écraser à tort un
  // domaine non concerné par la modification en cours. Un domaine n'est
  // retiré de cette liste (et de son enregistrement persistant) qu'une fois
  // son envoi RÉELLEMENT confirmé par Firebase — jamais par avance : hors
  // ligne, l'envoi peut échouer (ou rester en attente) et le domaine doit
  // rester marqué à synchroniser pour qu'on retente plus tard, y compris
  // après une fermeture complète de l'app entre-temps.
  // Renvoie une promesse qui se résout une fois TOUTES les tentatives
  // retombées (réussies ou non) — utilisée pour s'assurer qu'un envoi resté
  // en attente parte bien AVANT un rapatriement depuis le cloud (voir
  // onAuthStateChanged) : sans cet ordre, le rapatriement pourrait écraser
  // localement des données pas encore renvoyées, les faisant disparaître.
  const keysToSync = Array.from(firebaseDirtyKeys);
  // Capture la version de chaque clé AU MOMENT où on part avec elle — pas
  // après coup, sinon une modification survenue pile pendant l'envoi
  // pourrait être confondue avec celle qu'on est justement en train d'envoyer.
  const versionsAtStart = {};
  keysToSync.forEach((k) => {
    versionsAtStart[k] = firebaseKeyVersions[k] || 0;
  });
  return Promise.all(
    keysToSync.map((key) => {
      const mapping = FIREBASE_SYNC_MAP[key];
      if (!mapping) return Promise.resolve();
      return firebase
        .database()
        .ref("users/" + currentUser.uid + "/" + mapping.path)
        .set(mapping.getValue())
        .then(() => {
          // Ne retire cette clé des "à synchroniser" que si rien de plus
          // récent n'est arrivé entre-temps — sinon on laisse volontairement
          // la trace, pour qu'un prochain cycle la reprenne et l'envoie à
          // son tour (voir requestFirebasePush, qui redéclenche justement
          // tant qu'il reste des clés marquées).
          if ((firebaseKeyVersions[key] || 0) === versionsAtStart[key]) {
            firebaseDirtyKeys.delete(key);
            persistFirebaseDirtyKeys();
          }
          refreshCloudSyncBadge();
        })
        .catch((err) => {
          console.error("Synchronisation cloud impossible pour " + mapping.path + " (les données restent sauvegardées localement, on retentera plus tard) :", err);
        });
    })
  );
}

// Retente les synchros restées en attente (voir pushToFirebase) — à chaque
// ouverture de l'app une fois connecté, et dès que la connexion réseau
// revient, pour ne pas attendre une prochaine modification quelconque avant
// de rattraper ce qui n'avait pas pu partir hors-ligne.
window.addEventListener("online", () => {
  if (currentUser && firebaseDirtyKeys.size > 0) requestFirebasePush();
});

// Délai limite volontaire : contrairement à une requête réseau classique
// (fetch), un appel .once("value") de Firebase Realtime Database peut
// rester en attente indéfiniment quand l'appareil est hors-ligne, sans
// jamais échouer ni réussir — sans ce filet, l'écran "Récupération de tes
// données..." resterait affiché pour toujours au lieu de basculer sur les
// données locales déjà présentes sur l'appareil.
function withTimeout(promise, ms, onTimeout) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (onTimeout) onTimeout();
      resolve();
    }, ms);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        // pullFromFirebase() gère déjà ses propres erreurs via son .catch
        // interne (voir plus bas) — ici, on se contente de ne pas rester
        // bloqué en attendant indéfiniment un rejet qui, en pratique, ne
        // vient pas toujours.
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      }
    );
  });
}

// Domaines rapatriés depuis le cloud : chemin, normalisation, affectation.
const FIREBASE_PULL_DOMAINS = [
  { key: KEYS.sessions, path: "sessions/gym", apply: (v) => (sessions = shapeGymSessions(v)), get: () => sessions },
  { key: KEYS.runSessions, path: "sessions/run", apply: (v) => (runSessions = shapeBlockSessions(v)), get: () => runSessions },
  { key: KEYS.swimSessions, path: "sessions/swim", apply: (v) => (swimSessions = shapeBlockSessions(v)), get: () => swimSessions },
  { key: KEYS.bikeSessions, path: "sessions/bike", apply: (v) => (bikeSessions = shapeBlockSessions(v)), get: () => bikeSessions },
  { key: KEYS.library, path: "library/gym", apply: (v) => (library = shapeNameList(v)), get: () => library },
  { key: KEYS.runLibrary, path: "library/run", apply: (v) => (runLibrary = shapeNameList(v)), get: () => runLibrary },
  { key: KEYS.swimLibrary, path: "library/swim", apply: (v) => (swimLibrary = shapeNameList(v)), get: () => swimLibrary },
  { key: KEYS.bikeLibrary, path: "library/bike", apply: (v) => (bikeLibrary = shapeNameList(v)), get: () => bikeLibrary },
  { key: KEYS.gymExerciseConfigs, path: "gymExerciseConfigs", apply: (v) => (gymExerciseConfigs = shapeConfigs(v)), get: () => gymExerciseConfigs },
  { key: KEYS.gainageExerciseConfigs, path: "gainageExerciseConfigs", apply: (v) => (gainageExerciseConfigs = shapeNamedObjects(v)), get: () => gainageExerciseConfigs },
  { key: KEYS.sessionPlans, path: "sessionPlans", apply: (v) => (sessionPlans = shapeGymPlans(v)), get: () => sessionPlans },
  { key: KEYS.weights, path: "weights", apply: (v) => (weights = shapeWeights(v)), get: () => weights },
];

/* Rapatriement depuis le cloud — SANS JAMAIS écraser une modification locale
   (3.3.0). Une lecture du cloud peut arriver très tard : hors ligne, elle
   reste en attente et n'aboutit qu'au retour du réseau ; sur une connexion
   lente, plusieurs secondes après l'ouverture. Avant, elle remplaçait alors
   tout ce qu'on avait fait entre-temps : une séance enregistrée hors ligne (ou
   pendant une synchro lente) disparaissait de l'appareil quand la lecture
   arrivait — puis du cloud au prochain envoi. Désormais, un domaine n'est
   repris du cloud QUE s'il n'a ni modification locale en attente d'envoi
   (firebaseDirtyKeys), ni modification faite pendant cette lecture
   (firebaseKeyVersions). Sinon on garde le local, qui part vers le cloud.
   Renvoie la liste des domaines effectivement repris. */
function pullFromFirebase() {
  if (!currentUser) return Promise.resolve([]);
  const uid = currentUser.uid;
  const base = firebase.database().ref("users/" + uid);
  const versionsAtStart = {};
  FIREBASE_PULL_DOMAINS.forEach((d) => (versionsAtStart[d.key] = firebaseKeyVersions[d.key] || 0));
  return Promise.all([...FIREBASE_PULL_DOMAINS.map((d) => base.child(d.path).once("value")), base.child("backup").once("value")])
    .then((snaps) => {
      // Réponse d'un autre compte (déconnexion / changement entre-temps) : ignorée.
      if (!currentUser || currentUser.uid !== uid) return [];
      const oldBackupSnap = snaps[snaps.length - 1];
      const domainSnaps = snaps.slice(0, -1);
      const hasAnyNewData = domainSnaps.some((s) => s.val() !== null);
      const oldBackup = oldBackupSnap.val();
      if (!hasAnyNewData && oldBackup) {
        // Ce profil a des données dans l'ancien format (avant ce découpage)
        // mais rien encore dans la nouvelle structure : on migre une bonne
        // fois pour toutes (restoreFromBackupData marque chaque domaine « à
        // synchroniser », la synchro normale le réécrira au nouveau format).
        restoreFromBackupData(oldBackup);
        migrateGymExerciseConfigNames();
        return FIREBASE_PULL_DOMAINS.map((d) => d.key);
      }
      const applied = [];
      FIREBASE_PULL_DOMAINS.forEach((d, i) => {
        const touchedLocally = firebaseDirtyKeys.has(d.key) || (firebaseKeyVersions[d.key] || 0) !== versionsAtStart[d.key];
        if (touchedLocally) return; // le local est plus récent : on le garde (il part vers le cloud)
        // Tout ce qui vient du cloud est normalisé avant usage (voir
        // sanitizeExternalValue) : un champ piégé ou une forme inattendue ne
        // doit ni s'exécuter ni faire planter l'affichage.
        d.apply(sanitizeExternalValue(domainSnaps[i].val()));
        // Écrit aussi sur l'appareil : disponible dès la prochaine ouverture,
        // réseau ou pas.
        saveJSONLocalOnly(d.key, d.get());
        applied.push(d.key);
      });
      // Correction de casse des noms d'exercice, réappliquée après un
      // rapatriement (une ancienne valeur du cloud ne doit pas l'annuler).
      if (applied.includes(KEYS.gymExerciseConfigs)) migrateGymExerciseConfigNames();
      return applied;
    })
    .catch((err) => {
      console.error("Impossible de récupérer les données du profil, on continue avec les données locales de cet appareil :", err);
      return [];
    });
}

/* État de la connexion au cloud, pour l'accueil (3.3.0) : « Hors ligne » ou
   « Envoi en attente » — pour voir que rien n'est perdu. */
let firebaseConnected = null; // null = pas encore su
function cloudSyncStatus() {
  if (!currentUser) return null;
  const offline = navigator.onLine === false || firebaseConnected === false;
  if (offline) return { kind: "offline", text: firebaseDirtyKeys.size ? "Hors ligne · tes données sont gardées sur ce téléphone et partiront au retour du réseau" : "Hors ligne · tout est sur ce téléphone" };
  if (firebaseDirtyKeys.size) return { kind: "pending", text: "Envoi en cours vers le cloud…" };
  return null;
}
function refreshCloudSyncBadge() {
  const el = document.getElementById("cloud-sync-badge");
  if (!el) return;
  const st = cloudSyncStatus();
  el.hidden = !st;
  el.className = "cloud-sync-badge" + (st ? " " + st.kind : "");
  el.textContent = st ? st.text : "";
}
window.addEventListener("offline", refreshCloudSyncBadge);
window.addEventListener("online", refreshCloudSyncBadge);
// Firebase dit lui-même quand il est (re)connecté : on renvoie alors aussitôt
// ce qui attend, sans dépendre de l'événement « online » du navigateur (qui
// ne voit pas une 4G « connectée » mais inutilisable).
let firebaseConnectionWatched = false;
function watchFirebaseConnection() {
  if (firebaseConnectionWatched) return;
  firebaseConnectionWatched = true;
  try {
    firebase
      .database()
      .ref(".info/connected")
      .on("value", (snap) => {
        firebaseConnected = !!snap.val();
        if (firebaseConnected && currentUser && firebaseDirtyKeys.size > 0) requestFirebasePush();
        refreshCloudSyncBadge();
      });
  } catch (e) {
    /* sans conséquence : l'événement « online » reste là */
  }
}

// Reconstruire tout le markup à chaque appel recréerait l'icône à chaque
// fois (ex. une fois au tout premier chargement du script, puis une
// seconde fois dès que Firebase confirme la connexion) — et donc rejouerait
// son animation d'entrée à chaque étape. Si l'écran de chargement est déjà
// affiché, on se contente de mettre à jour le message : l'icône reste le
// même élément DOM, son animation ("1" occurrence, voir styles.css) ne
// rejoue donc qu'une seule fois du tout début à l'affichage de l'app.
function renderAuthLoadingScreen(message) {
  const existingLabel = app.querySelector(".auth-loading .auth-loading-label");
  if (existingLabel) {
    existingLabel.textContent = message || "Chargement...";
    return;
  }
  app.className = "theme-auth";
  app.innerHTML = `
    <div class="auth-loading">
      <div class="auth-mark">${ICONS.dumbbell}</div>
      <div class="auth-loading-label">${message || "Chargement..."}</div>
    </div>
  `;
}

function renderLoginScreen() {
  app.className = "theme-auth";
  app.innerHTML = `
    <div class="auth-screen">
      <div class="auth-brand">
        <div class="auth-mark">${ICONS.dumbbell}</div>
        <div>
          <div class="auth-wordmark">GymLog</div>
          <div class="auth-tagline">Connecte-toi à ton profil</div>
        </div>
      </div>
      <form id="login-form" class="auth-form">
        <div class="auth-field-card">
          <label for="login-email" class="auth-field-row">
            <span>E-mail</span>
            <input type="email" id="login-email" placeholder="toi@exemple.com" autocomplete="username">
          </label>
          <label for="login-password" class="auth-field-row">
            <span>Mot de passe</span>
            <input type="password" id="login-password" placeholder="Requis" autocomplete="current-password">
          </label>
        </div>
        <button type="submit" class="auth-submit">Se connecter</button>
        <div id="login-error" class="auth-error"></div>
        <button type="button" class="auth-forgot" id="login-forgot-btn">Mot de passe oublié ?</button>
        <div id="login-info" class="auth-info" role="status" aria-live="polite"></div>
      </form>
      <div id="app-version-label" class="auth-version">${appVersion ? "v" + appVersion : ""}</div>
    </div>
  `;
  const form = document.getElementById("login-form");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const errorEl = document.getElementById("login-error");
  emailInput.focus();
  // « Mot de passe oublié ? » : Firebase envoie à l'adresse saisie un e-mail
  // avec un lien pour choisir un nouveau mot de passe. L'e-mail n'arrive QUE
  // si un compte existe pour cette adresse — mais l'écran ne dit jamais si
  // c'est le cas (même message dans tous les cas) : sinon n'importe qui
  // pourrait s'en servir pour tester quelles adresses ont un compte.
  // (Firebase lui-même, avec sa « protection contre l'énumération des
  // e-mails », répond de toute façon pareil que le compte existe ou non.)
  const forgotBtn = document.getElementById("login-forgot-btn");
  const infoEl = document.getElementById("login-info");
  forgotBtn.addEventListener("click", () => {
    errorEl.textContent = "";
    infoEl.textContent = "";
    const email = emailInput.value.trim();
    if (!email || !emailInput.checkValidity()) {
      errorEl.textContent = "Saisis d'abord ton e-mail ci-dessus.";
      emailInput.focus();
      return;
    }
    forgotBtn.disabled = true;
    infoEl.textContent = "Envoi en cours...";
    const neutral = `Si un compte existe pour ${email}, un e-mail pour choisir un nouveau mot de passe vient d'y être envoyé. Pense à regarder dans les indésirables.`;
    const auth = firebase.auth();
    try {
      auth.languageCode = "fr";
    } catch (err) {
      /* sans conséquence : l'e-mail partira dans la langue du projet */
    }
    Promise.resolve()
      .then(() => auth.sendPasswordResetEmail(email))
      .then(
        () => {
          infoEl.textContent = neutral;
        },
        (err) => {
          const code = (err && err.code) || "";
          infoEl.textContent = "";
          if (code === "auth/user-not-found") infoEl.textContent = neutral; // ne rien révéler
          else if (code === "auth/invalid-email") errorEl.textContent = "Adresse e-mail invalide.";
          else if (code === "auth/too-many-requests") errorEl.textContent = "Trop de demandes. Réessaie dans quelques minutes.";
          else if (code === "auth/network-request-failed") errorEl.textContent = "Pas de connexion internet.";
          else errorEl.textContent = "Envoi impossible pour le moment.";
        }
      )
      .finally(() => {
        // Petit délai avant de pouvoir redemander, pour éviter les envois
        // en rafale (Firebase en limite le nombre).
        setTimeout(() => {
          forgotBtn.disabled = false;
        }, 30000);
      });
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    infoEl.textContent = "";
    errorEl.textContent = "Connexion en cours...";
    firebase
      .auth()
      .signInWithEmailAndPassword(emailInput.value.trim(), passwordInput.value)
      .catch(() => {
        errorEl.textContent = "Identifiants incorrects ou connexion impossible.";
        passwordInput.value = "";
        passwordInput.focus();
      });
    // La suite (récupération des données puis affichage de l'app) est gérée
    // par onAuthStateChanged, déclenché automatiquement par Firebase dès que
    // la connexion réussit — pas besoin de la gérer ici.
  });
}

function logoutUser() {
  firebase.auth().signOut();
}

// Vide tous les "tiroirs" de données personnelles (en mémoire ET en local)
// avant de faire confiance au cloud pour un compte qu'on n'a encore jamais
// vu sur CET appareil précis — voir onAuthStateChanged ci-dessus. N'efface
// jamais rien côté Firebase : uniquement le cache local de l'appareil, qui
// pourrait appartenir à quelqu'un d'autre.
function resetLocalDomainDataForNewAccount() {
  sessions = [];
  runSessions = [];
  swimSessions = [];
  bikeSessions = [];
  library = [];
  runLibrary = [];
  swimLibrary = [];
  bikeLibrary = [];
  gymExerciseConfigs = [];
  gainageExerciseConfigs = [];
  sessionPlans = [];
  weights = [];
  // Ces "tiroirs" ne sont jamais synchronisés vers le cloud (voir
  // FIREBASE_SYNC_MAP) mais restent des données personnelles en cours —
  // un brouillon ou une séance en direct de la personne précédente n'ont
  // pas plus leur place ici qu'un historique déjà enregistré.
  draft = { date: todayISO(), label: "", exercises: [], kind: "session" };
  runDraft = { date: todayISO(), label: "", blocks: [emptyBlock()] };
  swimDraft = { date: todayISO(), label: "", blocks: [emptySwimBlock()] };
  bikeDraft = { date: todayISO(), label: "", blocks: [emptyBikeBlock()] };
  liveSession = null;
  firebaseDirtyKeys = new Set();
  persistFirebaseDirtyKeys();
  saveJSONLocalOnly(KEYS.sessions, sessions);
  saveJSONLocalOnly(KEYS.runSessions, runSessions);
  saveJSONLocalOnly(KEYS.swimSessions, swimSessions);
  saveJSONLocalOnly(KEYS.bikeSessions, bikeSessions);
  saveJSONLocalOnly(KEYS.library, library);
  saveJSONLocalOnly(KEYS.runLibrary, runLibrary);
  saveJSONLocalOnly(KEYS.swimLibrary, swimLibrary);
  saveJSONLocalOnly(KEYS.bikeLibrary, bikeLibrary);
  saveJSONLocalOnly(KEYS.gymExerciseConfigs, gymExerciseConfigs);
  saveJSONLocalOnly(KEYS.gainageExerciseConfigs, gainageExerciseConfigs);
  saveJSONLocalOnly(KEYS.sessionPlans, sessionPlans);
  saveJSONLocalOnly(KEYS.weights, weights);
  saveJSONLocalOnly(KEYS.draft, draft);
  saveJSONLocalOnly(KEYS.runDraft, runDraft);
  saveJSONLocalOnly(KEYS.swimDraft, swimDraft);
  saveJSONLocalOnly(KEYS.bikeDraft, bikeDraft);
  saveJSONLocalOnly(KEYS.liveSession, liveSession);
}

// Branché par startAuthStateListener(), appelée (depuis 17-main.js) au
// DOMContentLoaded, donc une fois TOUS les fichiers de l'app exécutés —
// jamais directement ici. Firebase peut en
// effet répondre (« personne n'est connecté ») pendant que le navigateur
// télécharge encore les fichiers suivants : l'écran de connexion s'affichait
// alors, puis 17-main.js le recouvrait de « Chargement... », qui ne partait
// plus jamais (chargement infini avant l'écran de connexion, plus fréquent
// juste après une mise à jour, quand les fichiers viennent du réseau). Un
// utilisateur connecté pouvait de même tomber sur des fonctions pas encore
// chargées.
let authStateKnown = false;
// Premier lancement sur un appareil (rien en local) : attente maximale du
// cloud avant d'ouvrir quand même (les données arrivent ensuite).
const FIRST_PULL_WAIT_MS = 5000;
function handleAuthStateChanged(user) {
  authStateKnown = true;
  if (user) {
    currentUser = user;
    // Les clés locales (gymlog:sessions, gymlog:weights...) ne sont pas
    // propres à un compte — un appareil partagé entre deux profils (ex.
    // un couple) pourrait donc afficher, ou pire renvoyer vers le cloud,
    // les données de l'autre personne si la récupération ci-dessous
    // n'aboutit pas à temps (hors-ligne). On ne repart à vide QUE si
    // l'identifiant du compte a changé depuis la dernière connexion sur
    // cet appareil — pour ne surtout pas priver le MÊME utilisateur de
    // son propre cache hors-ligne à chaque réouverture.
    const lastUid = loadJSON(KEYS.lastUid, null);
    if (lastUid !== user.uid) {
      resetLocalDomainDataForNewAccount();
      saveJSONLocalOnly(KEYS.lastUid, user.uid);
    }
    watchFirebaseConnection();
    // Ouverture SANS attendre le réseau (3.3.0) : si cet appareil a déjà les
    // données de ce compte, on affiche tout de suite l'accueil avec elles, et
    // la synchro se fait en arrière-plan — envoi de ce qui attend, PUIS
    // lecture du cloud, qui ne reprend que les domaines sans modification
    // locale (voir pullFromFirebase). Hors ligne ou sur une connexion lente,
    // l'app s'ouvre donc aussi vite qu'en ligne. Seul un tout premier
    // lancement sur un appareil (rien en local) attend le cloud, au plus
    // FIRST_PULL_WAIT_MS (et pas du tout si l'appareil se sait hors ligne).
    const hasLocalCache = lastUid === user.uid;
    const flushPending = () => (firebaseDirtyKeys.size > 0 ? withTimeout(requestFirebasePush(), 4000) : Promise.resolve());
    const backgroundSync = () =>
      flushPending()
        .then(() => pullFromFirebase())
        .then((applied) => {
          // Données arrivées après l'ouverture : on rafraîchit l'accueil s'il
          // est affiché (ailleurs, elles s'afficheront au prochain écran —
          // on ne redessine pas sous les doigts de quelqu'un qui saisit).
          if (applied && applied.length && currentApp === "home") render();
          refreshCloudSyncBadge();
        });
    const openHome = () => {
      currentApp = "home";
      render();
      // Guide de première utilisation (20-onboarding.js) : une seule fois,
      // pour un compte neuf.
      onboardingMaybeStart();
    };
    if (hasLocalCache) {
      openHome();
      backgroundSync();
    } else if (navigator.onLine === false) {
      openHome();
      backgroundSync();
    } else {
      renderAuthLoadingScreen("Récupération de tes données...");
      let opened = false;
      const openOnce = () => {
        if (opened) return;
        opened = true;
        openHome();
      };
      setTimeout(openOnce, FIRST_PULL_WAIT_MS);
      backgroundSync().then(() => {
        if (!opened) openOnce();
        else if (currentApp === "home") render();
      });
    }
  } else {
    currentUser = null;
    renderLoginScreen();
  }
}

// Filet de sécurité : si Firebase ne répond pas du tout (pas de réseau au tout
// premier lancement, service de connexion injoignable, script Firebase
// bloqué), on ne laisse pas « Chargement... » indéfiniment : au bout de
// AUTH_WATCHDOG_MS, un message explique et propose de réessayer. Si la
// réponse arrive ensuite malgré tout, elle remplace ce message normalement.
const AUTH_WATCHDOG_MS = 12000;
function renderAuthStuckScreen(reason) {
  app.className = "theme-auth";
  app.innerHTML = `
    <div class="auth-loading">
      <div class="auth-mark">${ICONS.dumbbell}</div>
      <div class="auth-loading-label">${reason}</div>
      <button type="button" class="auth-retry" id="auth-retry-btn">Réessayer</button>
    </div>
  `;
  document.getElementById("auth-retry-btn").addEventListener("click", () => location.reload());
}
function startAuthStateListener() {
  if (typeof firebase === "undefined" || !firebase.auth) {
    renderAuthStuckScreen("Impossible de joindre le service de connexion. Vérifie ta connexion internet.");
    return;
  }
  setTimeout(() => {
    // Seulement si on est toujours sur l'écran de chargement : rien n'est
    // remplacé si quoi que ce soit d'autre s'est affiché entre-temps.
    if (authStateKnown || !app.querySelector(".auth-loading")) return;
    renderAuthStuckScreen(navigator.onLine === false ? "Pas de connexion internet." : "La connexion prend plus de temps que prévu.");
  }, AUTH_WATCHDOG_MS);
  try {
    firebase.auth().onAuthStateChanged(handleAuthStateChanged);
  } catch (err) {
    console.error(err);
    renderAuthStuckScreen("Impossible de démarrer la connexion.");
  }
}
