
// Sépare le grand chiffre et son unité en deux éléments distincts (plutôt
// qu'une seule chaîne concaténée) pour que le CSS puisse les hiérarchiser
// indépendamment — chiffre grand format, unité en petit libellé capitales.
function tileStatHTML(n, word, suffix) {
  return `<span class="tile-count">${n}</span> <span class="tile-unit">${word}${n !== 1 ? "s" : ""}${suffix || ""}</span>`;
}

function renderHome() {
  app.className = "theme-home";
  const totalSessions = sessions.length + runSessions.length + swimSessions.length + bikeSessions.length;
  app.innerHTML = `
    <div class="header" style="text-align:center;">
      <button type="button" class="logout-btn" data-logout aria-label="Se déconnecter">${ICONS.logout}</button>
      <div class="home-wordmark">GYMLOG</div>
    </div>
    <div class="content" id="content">
      <div class="home-fluid-block">
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

      <div class="home-section-label">Sports</div>
      <div class="home-fluid-block">
        <div class="home-hscroll">
          <div class="home-tile home-tile-hscroll" data-open-app="gym">
            <div class="home-tile-icon" style="background: rgba(143,160,107,0.14); color: #8FA06B;">${ICONS.dumbbell}</div>
            <div class="home-tile-title">Salle de sport</div>
            <div class="home-tile-sub">${tileStatHTML(sessions.length, "séance")}</div>
          </div>
          <div class="home-tile home-tile-hscroll" data-open-app="run">
            <div class="home-tile-icon" style="background: rgba(208,138,98,0.14); color: #D08A62;">${ICONS.stopwatch}</div>
            <div class="home-tile-title">Course à pied</div>
            <div class="home-tile-sub">${tileStatHTML(runSessions.length, "séance")}</div>
          </div>
          <div class="home-tile home-tile-hscroll" data-open-app="swim">
            <div class="home-tile-icon" style="background: rgba(111,163,160,0.14); color: #6FA3A0;">${ICONS.swim}</div>
            <div class="home-tile-title">Natation</div>
            <div class="home-tile-sub">${tileStatHTML(swimSessions.length, "séance")}</div>
          </div>
          <div class="home-tile home-tile-hscroll" data-open-app="bike">
            <div class="home-tile-icon" style="background: rgba(217,173,93,0.14); color: #D9AD5D;">${ICONS.bike}</div>
            <div class="home-tile-title">Vélo</div>
            <div class="home-tile-sub">${tileStatHTML(bikeSessions.length, "séance")}</div>
          </div>
        </div>
      </div>

      <div class="home-section-label">Suivi</div>
      <div class="home-fluid-block">
        <div class="home-hscroll">
          <div class="home-tile home-tile-hscroll" data-open-app="performance">
            <div class="home-tile-icon" style="background: rgba(201,122,108,0.14); color: #C97A6C;">${ICONS.trending}</div>
            <div class="home-tile-title">Performance</div>
            <div class="home-tile-sub">Tes progrès</div>
          </div>
          <div class="home-tile home-tile-hscroll" data-open-app="weight">
            <div class="home-tile-icon" style="background: rgba(160,138,158,0.14); color: #A08A9E;">${ICONS.scale}</div>
            <div class="home-tile-title">Poids</div>
            <div class="home-tile-sub">${tileStatHTML(weights.length, "pesée")}</div>
          </div>
        </div>
      </div>

      <div class="home-fluid-block">
        <div class="home-tile home-tile-wide" data-open-app="calendar">
          <div class="home-tile-icon home-tile-icon-wide" style="background: rgba(122,106,92,0.18); color: #7A6A5C;">${ICONS.calendarBig}</div>
          <div class="home-tile-wide-text">
            <div class="home-tile-title">Calendrier</div>
            <div class="home-tile-sub">${tileStatHTML(totalSessions, "séance", " au total")}</div>
          </div>
        </div>
      </div>

      <div class="home-fluid-block home-fluid-block-fixed">
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
    showConfirm("Te déconnecter ?", logoutUser, { confirmLabel: "Se déconnecter", danger: true });
  });
}
