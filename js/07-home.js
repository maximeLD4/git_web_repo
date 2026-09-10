
// Sépare le grand chiffre et son unité en deux éléments distincts (plutôt
// qu'une seule chaîne concaténée) pour que le CSS puisse les hiérarchiser
// indépendamment — chiffre grand format, unité en petit libellé capitales.
function tileStatHTML(n, word, suffix) {
  return `<span class="tile-count">${n}</span> <span class="tile-unit">${word}${n !== 1 ? "s" : ""}${suffix || ""}</span>`;
}

function renderHome() {
  app.className = "theme-home";
  const totalSessions = sessions.length + runSessions.length + swimSessions.length + bikeSessions.length;
  // Seule la Muscu exige un exercice configuré au préalable pour être
  // utilisable (choix dans une liste préconfigurée, contrairement à
  // Rameur/Vélo/Course qui n'ont jamais eu besoin de configuration, et au
  // Gainage qui se lance toujours via sa boucle générique — voir
  // liveCategoryStepHTML/exerciseCardHTML). La bannière ci-dessous et le
  // grisage des deux tuiles concernées (voir .home-tile-needs-setup) ne
  // sont qu'un signal, jamais un blocage : les deux restent cliquables.
  const needsGymOnboarding = gymExerciseConfigs.length === 0;
  app.innerHTML = `
    <div class="header" style="text-align:center;">
      <button type="button" class="logout-btn" data-logout aria-label="Se déconnecter">${ICONS.logout}</button>
      <div class="home-wordmark">GYMLOG</div>
    </div>
    <div class="content" id="content">
      ${
        needsGymOnboarding
          ? `<div class="home-fluid-block">
        <div class="home-onboarding-hint" data-open-settings-gym>
          <div class="home-onboarding-hint-icon">${ICONS.dumbbell}</div>
          <div>
            <div class="home-onboarding-hint-title">Configure tes premiers exercices</div>
            <div class="home-onboarding-hint-sub">Pour pouvoir suivre tes exercices de musculation</div>
          </div>
          <div class="home-onboarding-hint-arrow">${ICONS.chevronRight}</div>
        </div>
      </div>`
          : ""
      }
      <div class="home-fluid-block">
        <div class="home-tile home-tile-wide ${liveSession ? "live-recording" : ""} ${needsGymOnboarding ? "home-tile-needs-setup" : ""}" data-open-app="live">
          ${liveSession ? `<div class="live-rec-dot"></div>` : ""}
          <div class="home-tile-icon home-tile-icon-wide" style="background: ${liveSession ? "rgba(255,59,48,0.18)" : "rgba(var(--yellow-rgb), 0.14)"}; color: ${liveSession ? "#FF3B30" : "var(--yellow)"}; position: relative;">
            ${ICONS.dumbbell}
            <span class="home-tile-icon-live-badge" style="background: ${liveSession ? "#FF3B30" : "var(--yellow)"};"></span>
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
          <div class="home-tile home-tile-hscroll ${needsGymOnboarding ? "home-tile-needs-setup" : ""}" data-open-app="gym">
            <div class="home-tile-icon" style="background: rgba(var(--rgb-gym), 0.14); color: rgb(var(--rgb-gym));">${ICONS.dumbbell}</div>
            <div class="home-tile-title">Salle de sport</div>
            <div class="home-tile-sub">${tileStatHTML(sessions.length, "séance")}</div>
          </div>
          <div class="home-tile home-tile-hscroll" data-open-app="run">
            <div class="home-tile-icon" style="background: rgba(var(--rgb-run), 0.14); color: rgb(var(--rgb-run));">${ICONS.stopwatch}</div>
            <div class="home-tile-title">Course à pied</div>
            <div class="home-tile-sub">${tileStatHTML(runSessions.length, "séance")}</div>
          </div>
          <div class="home-tile home-tile-hscroll" data-open-app="swim">
            <div class="home-tile-icon" style="background: rgba(var(--rgb-swim), 0.14); color: rgb(var(--rgb-swim));">${ICONS.swim}</div>
            <div class="home-tile-title">Natation</div>
            <div class="home-tile-sub">${tileStatHTML(swimSessions.length, "séance")}</div>
          </div>
          <div class="home-tile home-tile-hscroll" data-open-app="bike">
            <div class="home-tile-icon" style="background: rgba(var(--rgb-bike), 0.14); color: rgb(var(--rgb-bike));">${ICONS.bike}</div>
            <div class="home-tile-title">Vélo</div>
            <div class="home-tile-sub">${tileStatHTML(bikeSessions.length, "séance")}</div>
          </div>
        </div>
      </div>

      <div class="home-section-label">Suivi</div>
      <div class="home-fluid-block">
        <div class="home-hscroll">
          <div class="home-tile home-tile-hscroll" data-open-app="performance">
            <div class="home-tile-icon" style="background: rgba(var(--rgb-performance), 0.14); color: rgb(var(--rgb-performance));">${ICONS.trending}</div>
            <div class="home-tile-title">Performance</div>
            <div class="home-tile-sub">Tes progrès</div>
          </div>
          <div class="home-tile home-tile-hscroll" data-open-app="weight">
            <div class="home-tile-icon" style="background: rgba(var(--rgb-weight), 0.14); color: rgb(var(--rgb-weight));">${ICONS.scale}</div>
            <div class="home-tile-title">Poids</div>
            <div class="home-tile-sub">${tileStatHTML(weights.length, "pesée")}</div>
          </div>
        </div>
      </div>

      <div class="home-fluid-block">
        <div class="home-tile home-tile-wide" data-open-app="calendar">
          <div class="home-tile-icon home-tile-icon-wide" style="background: rgba(var(--rgb-calendar), 0.18); color: rgb(var(--rgb-calendar));">${ICONS.calendarBig}</div>
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
  const onboardingHint = document.querySelector("[data-open-settings-gym]");
  if (onboardingHint) {
    onboardingHint.addEventListener("click", () => {
      currentApp = "settings-gym";
      render();
    });
  }
  document.querySelector("[data-logout]").addEventListener("click", () => {
    showConfirm("Te déconnecter ?", logoutUser, { confirmLabel: "Se déconnecter", danger: true });
  });
}
