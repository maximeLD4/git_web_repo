/* ---------- Authentification Firebase (remplace l'ancien mot de passe unique) ---------- */
/* Chaque profil = un compte email/mot de passe créé dans la console Firebase.
   Se connecter revient à choisir son profil. La session reste active sur cet
   appareil tant qu'on ne se déconnecte pas explicitement (voir 00-firebase-init.js). */

let firebaseSyncTimer = null;

function scheduleFirebaseSync() {
  if (!currentUser) return;
  clearTimeout(firebaseSyncTimer);
  firebaseSyncTimer = setTimeout(pushToFirebase, 1500);
}

function pushToFirebase() {
  if (!currentUser) return;
  let data;
  try {
    data = JSON.parse(window.__scriptableExport());
  } catch (e) {
    return;
  }
  firebase
    .database()
    .ref("users/" + currentUser.uid + "/backup")
    .set(data)
    .catch((err) => {
      console.error("Synchronisation cloud impossible pour le moment (les données restent sauvegardées localement) :", err);
    });
}

function pullFromFirebase() {
  if (!currentUser) return Promise.resolve();
  return firebase
    .database()
    .ref("users/" + currentUser.uid + "/backup")
    .once("value")
    .then((snapshot) => {
      const data = snapshot.val();
      if (data) restoreFromBackupData(data);
    })
    .catch((err) => {
      console.error("Impossible de récupérer les données du profil, on continue avec les données locales de cet appareil :", err);
    });
}

function renderAuthLoadingScreen(message) {
  app.className = "";
  app.innerHTML = `
    <div style="position:fixed; inset:0; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#F7F1E3; color:#8A7F6C; font-family:-apple-system,system-ui,sans-serif; font-size:14px; text-align:center; padding:24px;">
      ${message || "Chargement..."}
    </div>
  `;
}

function renderLoginScreen() {
  app.className = "";
  app.innerHTML = `
    <div style="position:fixed; inset:0; overflow:hidden; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; gap:22px; background:#F7F1E3;">
      <div style="width:64px; height:64px; border-radius:20px; background:#00B899; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 8px 20px rgba(0,184,153,0.25);">${ICONS.dumbbell}</div>
      <div style="text-align:center;">
        <div style="font-family:-apple-system,system-ui,sans-serif; font-weight:800; font-size:24px; letter-spacing:-0.3px; color:#3A3229;">GymLog</div>
        <div style="font-family:-apple-system,system-ui,sans-serif; font-size:13px; color:#8A7F6C; margin-top:2px;">Connecte-toi à ton profil</div>
      </div>
      <form id="login-form" style="display:flex; flex-direction:column; gap:10px; width:100%; max-width:280px;">
        <input type="email" id="login-email" placeholder="Email" autocomplete="username"
          style="padding:14px 16px; border-radius:12px; border:1px solid #E7DCC3; background:#FFFDF8; color:#3A3229; font-size:16px; width:100%; box-sizing:border-box;">
        <input type="password" id="login-password" placeholder="Mot de passe" autocomplete="current-password"
          style="padding:14px 16px; border-radius:12px; border:1px solid #E7DCC3; background:#FFFDF8; color:#3A3229; font-size:16px; width:100%; box-sizing:border-box;">
        <button type="submit" style="width:100%; background:#00B899; color:#fff; border:none; border-radius:999px; padding:15px; font-size:15.5px; font-weight:700; font-family:-apple-system,system-ui,sans-serif; cursor:pointer; box-shadow:0 4px 14px rgba(0,184,153,0.3);">Se connecter</button>
        <div id="login-error" style="color:#C1443C; font-size:13px; text-align:center; min-height:16px; font-family:-apple-system,system-ui,sans-serif;"></div>
      </form>
      <div style="position:absolute; right:14px; bottom:calc(10px + env(safe-area-inset-bottom)); font-size:11px; color:#B5AA97; font-family:-apple-system,system-ui,sans-serif;">v${APP_VERSION}</div>
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
    // par onAuthStateChanged ci-dessous, déclenché automatiquement par
    // Firebase dès que la connexion réussit — pas besoin de la gérer ici.
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
