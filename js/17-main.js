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
// firebase.auth().onAuthStateChanged(...), enregistré dans 04-auth.js.
// On affiche un état de chargement le temps que Firebase réponde.
renderAuthLoadingScreen("Chargement...");
