/* ---------- rendering ---------- */
function render() {
  if (currentApp === "home") { renderHome(); return; }
  if (currentApp === "run") { renderRunApp(); return; }
  if (currentApp === "weight") { renderWeightApp(); return; }
  if (currentApp === "calendar") { renderSharedCalendarApp(); return; }
  if (currentApp === "swim") { renderSwimApp(); return; }
  if (currentApp === "bike") { renderBikeApp(); return; }
  if (currentApp === "settings") { renderSettingsApp(); return; }
  if (currentApp === "settings-gym") { renderGymSettingsApp(); return; }
  if (currentApp === "settings-appearance") { renderSettingsAppearanceApp(); return; }
  if (currentApp === "settings-sound") { renderSettingsSoundApp(); return; }
  if (currentApp === "settings-backup") { renderSettingsBackupApp(); return; }
  if (currentApp === "scanner") { renderScannerApp(); return; }
  if (currentApp === "performance") { renderPerformanceApp(); return; }
  if (currentApp === "performance-detail") { renderPerformanceDetailApp(); return; }
  if (currentApp === "live") { renderLiveApp(true); return; }
  renderGymApp();
}

function goHome() {
  currentApp = "home";
  render();
}

// Le premier écran affiché (connexion ou app) est décidé par
// firebase.auth().onAuthStateChanged(...), branché juste en dessous.
// On affiche un état de chargement le temps que Firebase réponde.
renderAuthLoadingScreen("Chargement...");
// On n'écoute la réponse de Firebase qu'une fois TOUS les fichiers de l'app
// exécutés, quel que soit leur ordre dans index.html : DOMContentLoaded
// n'arrive qu'après le dernier <script> de la page. Voir
// startAuthStateListener (04-auth.js).
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startAuthStateListener);
else startAuthStateListener();
