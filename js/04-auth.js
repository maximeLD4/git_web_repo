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

function pullFromFirebase() {
  if (!currentUser) return Promise.resolve();
  const base = firebase.database().ref("users/" + currentUser.uid);
  return Promise.all([
    base.child("sessions/gym").once("value"),
    base.child("sessions/run").once("value"),
    base.child("sessions/swim").once("value"),
    base.child("sessions/bike").once("value"),
    base.child("library/gym").once("value"),
    base.child("library/run").once("value"),
    base.child("library/swim").once("value"),
    base.child("library/bike").once("value"),
    base.child("gymExerciseConfigs").once("value"),
    base.child("gainageExerciseConfigs").once("value"),
    base.child("sessionPlans").once("value"),
    base.child("weights").once("value"),
    base.child("backup").once("value"), // ancien format "tout en un bloc", pour migration ponctuelle
  ])
    .then(([gymSnap, runSnap, swimSnap, bikeSnap, gymLibSnap, runLibSnap, swimLibSnap, bikeLibSnap, configsSnap, gainageConfigsSnap, plansSnap, weightsSnap, oldBackupSnap]) => {
      const newSnaps = [gymSnap, runSnap, swimSnap, bikeSnap, gymLibSnap, runLibSnap, swimLibSnap, bikeLibSnap, configsSnap, gainageConfigsSnap, plansSnap, weightsSnap];
      const hasAnyNewData = newSnaps.some((s) => s.val() !== null);
      const oldBackup = oldBackupSnap.val();

      if (!hasAnyNewData && oldBackup) {
        // Ce profil a des données dans l'ancien format (avant ce découpage)
        // mais rien encore dans la nouvelle structure : on migre une bonne
        // fois pour toutes. restoreFromBackupData() appelle saveJSON() pour
        // chaque domaine, ce qui les marque automatiquement "à synchroniser"
        // — la synchro normale (debounced) les réécrira ensuite dans la
        // nouvelle structure séparée, sans action supplémentaire ici.
        restoreFromBackupData(oldBackup);
        migrateGymExerciseConfigNames();
        return;
      }

      sessions = gymSnap.val() || [];
      runSessions = runSnap.val() || [];
      swimSessions = swimSnap.val() || [];
      bikeSessions = bikeSnap.val() || [];
      library = gymLibSnap.val() || [];
      runLibrary = runLibSnap.val() || [];
      swimLibrary = swimLibSnap.val() || [];
      bikeLibrary = bikeLibSnap.val() || [];
      gymExerciseConfigs = configsSnap.val() || [];
      gainageExerciseConfigs = gainageConfigsSnap.val() || [];
      sessionPlans = plansSnap.val() || [];
      weights = weightsSnap.val() || [];
      // Essentiel pour l'usage hors-ligne : jusqu'ici, ce qui venait d'être
      // récupéré n'était mis à jour qu'en mémoire, jamais réellement écrit
      // dans le stockage local de l'appareil. Résultat observé en pratique :
      // tout fonctionnait tant qu'on restait en ligne (les données vivaient
      // en mémoire), mais au prochain lancement hors-ligne (ou si Firebase
      // ne répondait pas à temps), l'app repartait sur d'anciennes données
      // locales potentiellement vides — par exemple des exercices de Salle
      // de sport à reconfigurer entièrement. On sauvegarde donc explicitement
      // chaque domaine dès qu'il vient d'être récupéré, pour qu'il soit
      // disponible localement dès la prochaine ouverture, réseau ou pas.
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
      // On réapplique la correction de casse des noms d'exercice ici : sans
      // ça, une éventuelle ancienne valeur non capitalisée encore présente
      // dans le cloud (pas encore synchronisée avec la correction locale)
      // écraserait silencieusement la correction, comme observé en pratique.
      migrateGymExerciseConfigNames();
    })
    .catch((err) => {
      console.error("Impossible de récupérer les données du profil, on continue avec les données locales de cet appareil :", err);
    });
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
          <div class="auth-wordmark">GYMLOG</div>
          <div class="auth-tagline">Connecte-toi à ton profil</div>
        </div>
      </div>
      <div class="auth-rule"></div>
      <form id="login-form" class="auth-form">
        <div class="auth-field">
          <label for="login-email">Email</label>
          <input type="email" id="login-email" placeholder="toi@exemple.com" autocomplete="username">
        </div>
        <div class="auth-field">
          <label for="login-password">Mot de passe</label>
          <input type="password" id="login-password" placeholder="••••••••••" autocomplete="current-password">
        </div>
        <button type="submit" class="auth-submit">Se connecter</button>
        <div id="login-error" class="auth-error"></div>
      </form>
      <div id="app-version-label" class="auth-version">${appVersion ? "v" + appVersion : ""}</div>
    </div>
  `;
  const form = document.getElementById("login-form");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const errorEl = document.getElementById("login-error");
  emailInput.focus();
  form.addEventListener("submit", (e) => {
    e.preventDefault();
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

firebase.auth().onAuthStateChanged((user) => {
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
    renderAuthLoadingScreen("Récupération de tes données...");
    // Ordre volontaire et important : on pousse D'ABORD tout ce qui serait
    // resté en attente d'une session précédente (voir persistFirebaseDirtyKeys
    // — par exemple une séance enregistrée hors-ligne puis l'app fermée
    // avant le retour du réseau), et seulement ENSUITE on rapatrie depuis le
    // cloud. Dans l'autre sens, le rapatriement aurait écrasé localement
    // cette séance pas encore renvoyée avec une version plus ancienne du
    // cloud — elle aurait alors disparu, comme observé en pratique.
    const flushPending = firebaseDirtyKeys.size > 0
      ? withTimeout(requestFirebasePush(), 3000, () => {
          console.warn("Envoi des données en attente trop long (probablement hors-ligne) — le rapatriement se fait quand même, on retentera l'envoi plus tard.");
        })
      : Promise.resolve();
    flushPending
      .then(() =>
        withTimeout(pullFromFirebase(), 3000, () => {
          console.warn("Récupération des données Firebase trop longue (probablement hors-ligne) — on continue avec les données locales de cet appareil.");
        })
      )
      .finally(() => {
        currentApp = "home";
        render();
      });
  } else {
    currentUser = null;
    renderLoginScreen();
  }
});
