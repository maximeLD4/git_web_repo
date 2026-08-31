function isUpcoming(session) {
  // Compat : quelques appels historiques passent une simple date (string) au
  // lieu de l'objet séance complet.
  if (typeof session === "string") return session > todayISO();
  if (!session) return false;
  // Le statut "prévue" ne bascule plus automatiquement en "effectuée" quand
  // la date est dépassée : une fois créée à l'avance, une séance reste dans
  // "à venir" tant qu'on ne l'a pas explicitement marquée comme faite (ou
  // que ce champ n'existe pas encore, auquel cas on retombe sur l'ancienne
  // règle basée sur la date, pour les séances déjà enregistrées avant cette
  // évolution).
  if (session.planned !== undefined) return session.planned;
  return session.date > todayISO();
}
function timeFilterToggleHTML(isFuture, dataAttrName) {
  return `
    <div class="time-filter-toggle">
      <button type="button" class="time-filter-btn ${!isFuture ? "active" : ""}" data-${dataAttrName}="past">${ICONS.check} Effectuées</button>
      <button type="button" class="time-filter-btn ${isFuture ? "active" : ""}" data-${dataAttrName}="future">${ICONS.calendar} À venir</button>
    </div>`;
}

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
