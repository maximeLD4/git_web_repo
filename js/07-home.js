
function renderHome() {
  app.className = "theme-home";
  app.innerHTML = `
    <div class="header" style="text-align:center;">
      <div class="home-wordmark">GYMLOG</div>
      <div class="header-sub" style="padding-left:0;">Choisis ton activité</div>
    </div>
    <div class="content" id="content" style="padding-bottom: 24px;">
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
        <div class="home-tile" data-open-app="weight">
          <div class="home-tile-icon" style="background: rgba(167,139,250,0.14); color: #A78BFA;">${ICONS.scale}</div>
          <div class="home-tile-title">Poids</div>
          <div class="home-tile-sub">${weights.length} pesée${weights.length !== 1 ? "s" : ""}</div>
        </div>
        <div class="home-tile" data-open-app="calendar">
          <div class="home-tile-icon" style="background: rgba(184,196,217,0.14); color: #B8C4D9;">${ICONS.calendarBig}</div>
          <div class="home-tile-title">Calendrier</div>
          <div class="home-tile-sub">${sessions.length + runSessions.length + swimSessions.length + bikeSessions.length} séance${sessions.length + runSessions.length + swimSessions.length + bikeSessions.length !== 1 ? "s" : ""} au total</div>
        </div>
        <div class="home-tile" data-open-app="settings">
          <div class="home-tile-icon" style="background: rgba(142,142,147,0.14); color: #8E8E93;">${ICONS.gear}</div>
          <div class="home-tile-title">Paramètres</div>
          <div class="home-tile-sub">Exercices préconfigurés</div>
        </div>
        <div class="home-tile" data-open-app="scanner">
          <div class="home-tile-icon" style="background: rgba(255,149,0,0.14); color: #FF9500;">${ICONS.camera}</div>
          <div class="home-tile-title">Scanner</div>
          <div class="home-tile-sub">Prototype — photo de machine</div>
        </div>
      </div>
    </div>
  `;
  document.querySelectorAll("[data-open-app]").forEach((el) => {
    el.addEventListener("click", () => {
      currentApp = el.dataset.openApp;
      render();
    });
  });
}
