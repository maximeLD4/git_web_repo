
function renderHome() {
  app.className = "theme-home";
  app.innerHTML = `
    <div class="header" style="text-align:center;">
      <button type="button" class="logout-btn" data-logout aria-label="Se déconnecter">${ICONS.logout}</button>
      <div class="home-wordmark">GYMLOG</div>
      <div class="header-sub" style="padding-left:0;">Choisis ton activité</div>
    </div>
    <div class="content" id="content" style="padding-bottom: 24px;">
      <div class="home-grid">
        <div class="home-tile home-tile-wide ${liveSession ? "live-recording" : ""}" data-open-app="live">
          ${liveSession ? `<div class="live-rec-dot"></div>` : ""}
          <div class="home-tile-icon home-tile-icon-wide" style="background: ${liveSession ? "rgba(255,59,48,0.18)" : "rgba(255,159,10,0.14)"}; color: ${liveSession ? "#FF3B30" : "#FF9F0A"}; position: relative;">
            ${ICONS.dumbbell}
            <span class="home-tile-icon-live-badge" style="background: ${liveSession ? "#FF3B30" : "#FF9F0A"};"></span>
          </div>
          <div class="home-tile-wide-text">
            <div class="home-tile-title">Séance en direct</div>
            <div class="home-tile-sub">${liveSession ? "Séance en cours..." : "Lance ta séance"}</div>
          </div>
        </div>
      </div>

      <div class="home-section-label">Tes sports</div>
      <div class="home-grid">
        <div class="home-tile" data-open-app="gym">
          <div class="home-tile-icon" style="background: rgba(95,191,160,0.14); color: #5FBFA0;">${ICONS.dumbbell}</div>
          <div class="home-tile-title">Salle de sport</div>
          <div class="home-tile-sub">${sessions.length} séance${sessions.length !== 1 ? "s" : ""}</div>
        </div>
        <div class="home-tile" data-open-app="run">
          <div class="home-tile-icon" style="background: rgba(108,123,255,0.14); color: #6C7BFF;">${ICONS.stopwatch}</div>
          <div class="home-tile-title">Course à pied</div>
          <div class="home-tile-sub">${runSessions.length} séance${runSessions.length !== 1 ? "s" : ""}</div>
        </div>
        <div class="home-tile" data-open-app="swim">
          <div class="home-tile-icon" style="background: rgba(79,195,217,0.14); color: #4FC3D9;">${ICONS.swim}</div>
          <div class="home-tile-title">Natation</div>
          <div class="home-tile-sub">${swimSessions.length} séance${swimSessions.length !== 1 ? "s" : ""}</div>
        </div>
        <div class="home-tile" data-open-app="bike">
          <div class="home-tile-icon" style="background: rgba(196,143,224,0.14); color: #C48FE0;">${ICONS.bike}</div>
          <div class="home-tile-title">Vélo</div>
          <div class="home-tile-sub">${bikeSessions.length} séance${bikeSessions.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      <div class="home-section-label">Suivi</div>
      <div class="home-grid">
        <div class="home-tile" data-open-app="performance">
          <div class="home-tile-icon" style="background: rgba(255,45,85,0.14); color: #FF2D55;">${ICONS.trending}</div>
          <div class="home-tile-title">Performance</div>
          <div class="home-tile-sub">Suivi de tes progrès</div>
        </div>
        <div class="home-tile" data-open-app="weight">
          <div class="home-tile-icon" style="background: rgba(167,139,250,0.14); color: #A78BFA;">${ICONS.scale}</div>
          <div class="home-tile-title">Poids</div>
          <div class="home-tile-sub">${weights.length} pesée${weights.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      <button type="button" class="home-row" data-open-app="calendar">
        <div class="home-row-icon" style="background: rgba(184,196,217,0.18); color: #8296B8;">${ICONS.calendarBig}</div>
        <div class="home-row-title">Calendrier</div>
        <span class="home-row-chevron">${ICONS.chevronRight}</span>
      </button>

      <div style="display:flex; justify-content:center;">
        <button type="button" class="home-settings-link" data-open-app="settings">${ICONS.gear} Paramètres</button>
      </div>
    </div>
  `;
  document.querySelectorAll("[data-open-app]").forEach((el) => {
    el.addEventListener("click", () => {
      currentApp = el.dataset.openApp;
      render();
    });
  });
  document.querySelector("[data-logout]").addEventListener("click", () => {
    showConfirm("Te déconnecter ? Tu devras ressaisir tes identifiants pour retrouver ce profil.", logoutUser, { confirmLabel: "Se déconnecter", danger: true });
  });
}
