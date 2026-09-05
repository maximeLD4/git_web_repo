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
  [KEYS.weights]: { path: "weights", getValue: () => weights },
};

let firebaseSyncTimer = null;
let firebaseDirtyKeys = new Set();

function scheduleFirebaseSync(key) {
  if (!currentUser) return;
  if (key && FIREBASE_SYNC_MAP[key]) firebaseDirtyKeys.add(key);
  clearTimeout(firebaseSyncTimer);
  firebaseSyncTimer = setTimeout(pushToFirebase, 1500);
}

function pushToFirebase() {
  if (!currentUser) return;
  // On ne pousse que les domaines réellement modifiés depuis la dernière
  // synchro — c'est précisément ce qui évite d'écraser à tort un domaine
  // non concerné par la modification en cours.
  const keysToSync = Array.from(firebaseDirtyKeys);
  firebaseDirtyKeys.clear();
  keysToSync.forEach((key) => {
    const mapping = FIREBASE_SYNC_MAP[key];
    if (!mapping) return;
    firebase
      .database()
      .ref("users/" + currentUser.uid + "/" + mapping.path)
      .set(mapping.getValue())
      .catch((err) => {
        console.error("Synchronisation cloud impossible pour " + mapping.path + " (les données restent sauvegardées localement) :", err);
      });
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
    base.child("weights").once("value"),
    base.child("backup").once("value"), // ancien format "tout en un bloc", pour migration ponctuelle
  ])
    .then(([gymSnap, runSnap, swimSnap, bikeSnap, gymLibSnap, runLibSnap, swimLibSnap, bikeLibSnap, configsSnap, weightsSnap, oldBackupSnap]) => {
      const newSnaps = [gymSnap, runSnap, swimSnap, bikeSnap, gymLibSnap, runLibSnap, swimLibSnap, bikeLibSnap, configsSnap, weightsSnap];
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
      weights = weightsSnap.val() || [];
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

function renderAuthLoadingScreen(message) {
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

firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    renderAuthLoadingScreen("Récupération de tes données...");
    pullFromFirebase().finally(() => {
      currentApp = "home";
      render();
    });
  } else {
    currentUser = null;
    renderLoginScreen();
  }
});
