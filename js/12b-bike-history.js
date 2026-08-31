function bikeSessionCardHTML(s) {
  const open = !!openBikeHistoryIds[s.id];
  const upcoming = isUpcoming(s);
  const blocksSummary = s.blocks
    .map(
      (b) => `
  <div>
    <div class="history-ex-name">${b.label}</div>
    <div class="history-sets"><div class="history-set-chip">${formatBikeBlockSummary(b)}</div></div>
  </div>`
    )
    .join("");
  return `
  <div class="history-card ${upcoming ? "upcoming" : ""}">
    <div class="history-head" data-bike-toggle="${s.id}">
      <div class="history-head-left">
        <div class="history-date">${formatDateFR(s.date)}${upcoming ? '<span class="upcoming-badge">À venir</span>' : ""}</div>
        ${s.label ? `<div class="history-label">${s.label}</div>` : ""}
        <div class="history-run-stats">${formatBikeSessionTotalsLine(s.blocks)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="history-meta">${s.blocks.length} bloc${s.blocks.length !== 1 ? "s" : ""}</div>
        <span class="chev ${open ? "open" : ""}">${ICONS.chevron}</span>
      </div>
    </div>
    ${
      open
        ? `<div class="history-body">${blocksSummary}</div>
           <div class="delete-row">
             <button class="edit-link" data-bike-edit-session="${s.id}">${ICONS.edit} Modifier</button>
             <button class="edit-link" data-bike-duplicate-session="${s.id}">${ICONS.duplicate} Dupliquer</button>
             <button class="edit-link" data-bike-share-session="${s.id}">${ICONS.up} Partager</button>
             ${upcoming ? `<button class="edit-link" data-bike-mark-done-session="${s.id}">${ICONS.check} Marquer comme faite</button>` : ""}
             <button class="delete-link" data-bike-delete-session="${s.id}">${ICONS.trash} Supprimer</button>
           </div>`
        : ""
    }
  </div>`;
}

function shiftBikeCalendarMonth(delta) {
  const [y, m] = bikeCalendarMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  bikeCalendarMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function bikeCalendarViewHTML() {
  const [y, m] = bikeCalendarMonth.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const startDow = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthLabel = firstOfMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const showFuture = bikeCalendarTimeFilter === "future";
  const sessionDates = new Set(bikeSessions.filter((s) => isUpcoming(s) === showFuture).map((s) => s.date));
  const today = todayISO();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push("<div class=\"cal-cell empty\"></div>");
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${bikeCalendarMonth}-${String(d).padStart(2, "0")}`;
    const hasData = sessionDates.has(dateStr);
    const isSelected = bikeSelectedCalendarDate === dateStr;
    const isToday = dateStr === today;
    cells.push(`
      <button type="button" class="cal-cell ${hasData ? "has-data" : ""} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}" data-bike-cal-date="${dateStr}">
        <span class="cal-day-num">${d}</span>
        ${hasData ? `<span class="${showFuture ? "cal-dot-hollow" : "cal-dot"}"></span>` : ""}
      </button>`);
  }

  let selectedHTML = "";
  if (bikeSelectedCalendarDate) {
    const daySessions = bikeSessions.filter((s) => s.date === bikeSelectedCalendarDate && isUpcoming(s) === showFuture);
    selectedHTML =
      daySessions.length > 0
        ? `<div class="cal-selected-label">${formatDateFR(bikeSelectedCalendarDate)}</div>${daySessions.map(bikeSessionCardHTML).join("")}`
        : `<div class="empty-state" style="padding: 30px 20px;">Aucune séance ${showFuture ? "prévue" : "effectuée"} ce jour-là.</div>`;
  }

  return `
    ${timeFilterToggleHTML(showFuture, "bike-time-filter")}
    <div class="cal-header">
      <button type="button" class="cal-nav-btn" data-bike-cal-prev>${ICONS.back}</button>
      <div class="cal-month-label">${monthLabel}</div>
      <button type="button" class="cal-nav-btn" data-bike-cal-next>${ICONS.chevronRight}</button>
    </div>
    <div class="cal-weekdays"><div>Lu</div><div>Ma</div><div>Me</div><div>Je</div><div>Ve</div><div>Sa</div><div>Di</div></div>
    <div class="cal-grid">${cells.join("")}</div>
    ${selectedHTML}
  `;
}

function bikeHistoryTabHTML() {
  const sorted = [...bikeSessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const lastExport = loadJSON(KEYS.lastExport, null);
  const lastImport = loadJSON(KEYS.lastImport, null);
  const backup = `
    <div class="backup-row">
      <button class="backup-btn" id="bike-export-btn">${ICONS.up} Exporter</button>
      <button class="backup-btn" id="bike-import-btn">${ICONS.down} Importer</button>
      <input type="file" id="bike-import-file" accept="application/json" style="display:none">
    </div>
    <div class="sync-status">Dernier export : ${formatRelativeTime(lastExport)} · Dernier import : ${formatRelativeTime(lastImport)}</div>
    <div class="backup-note">Cette sauvegarde inclut toutes tes activités (muscu, course, natation, vélo) — un seul fichier pour tout ton historique.</div>
  `;
  const viewToggle = `
    <div class="ex-type-toggle" style="margin: 0 0 16px;">
      <button type="button" class="ex-type-btn ${bikeHistoryViewMode === "list" ? "active" : ""}" data-bike-history-view="list">${ICONS.history} Liste</button>
      <button type="button" class="ex-type-btn ${bikeHistoryViewMode === "calendar" ? "active" : ""}" data-bike-history-view="calendar">${ICONS.calendar} Calendrier</button>
    </div>`;

  if (bikeHistoryViewMode === "calendar") {
    return backup + viewToggle + bikeCalendarViewHTML();
  }
  if (sorted.length === 0) {
    return backup + viewToggle + `<div class="empty-state"><div class="bar-icon">${ICONS.history}</div>Aucune séance enregistrée pour l'instant.<br>Va dans l'onglet "Créer" pour ajouter la première.</div>`;
  }
  const upcoming = sorted.filter((s) => isUpcoming(s)).sort((a, b) => (a.date > b.date ? 1 : -1));
  const past = sorted.filter((s) => !isUpcoming(s));
  const showHeadings = upcoming.length > 0 && past.length > 0;
  const upcomingHTML = upcoming.length > 0 ? (showHeadings ? `<div class="session-group-heading">À venir</div>` : "") + upcoming.map(bikeSessionCardHTML).join("") : "";
  const pastHTML = past.length > 0 ? (showHeadings ? `<div class="session-group-heading">Effectuées</div>` : "") + past.map(bikeSessionCardHTML).join("") : "";
  return backup + viewToggle + upcomingHTML + pastHTML;
}


function attachBikeHistoryListeners() {
  document.querySelectorAll("[data-bike-history-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      bikeHistoryViewMode = btn.dataset.bikeHistoryView;
      renderBikeContent();
    });
  });
  document.querySelectorAll("[data-bike-time-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      bikeCalendarTimeFilter = btn.dataset.bikeTimeFilter;
      bikeSelectedCalendarDate = null;
      renderBikeContent();
    });
  });
  const calPrev = document.querySelector("[data-bike-cal-prev]");
  const calNext = document.querySelector("[data-bike-cal-next]");
  if (calPrev) calPrev.addEventListener("click", () => { shiftBikeCalendarMonth(-1); renderBikeContent(); });
  if (calNext) calNext.addEventListener("click", () => { shiftBikeCalendarMonth(1); renderBikeContent(); });
  document.querySelectorAll("[data-bike-cal-date]").forEach((cell) => {
    cell.addEventListener("click", () => {
      const d = cell.dataset.bikeCalDate;
      bikeSelectedCalendarDate = bikeSelectedCalendarDate === d ? null : d;
      renderBikeContent();
    });
  });
  document.querySelectorAll("[data-bike-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.bikeToggle;
      openBikeHistoryIds[id] = !openBikeHistoryIds[id];
      renderBikeContent();
    });
  });
  document.querySelectorAll("[data-bike-delete-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      showConfirm(
        "Supprimer définitivement cette séance ? Cette action est irréversible.",
        () => {
          bikeSessions = bikeSessions.filter((s) => s.id !== btn.dataset.bikeDeleteSession);
          saveJSON(KEYS.bikeSessions, bikeSessions);
          renderBikeContent();
        },
        { confirmLabel: "Supprimer", danger: true }
      );
    });
  });
  document.querySelectorAll("[data-bike-mark-done-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      markActivityDone("bike", btn.dataset.bikeMarkDoneSession);
      renderBikeContent();
    });
  });
  document.querySelectorAll("[data-bike-share-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = bikeSessions.find((s) => s.id === btn.dataset.bikeShareSession);
      if (session) exportSingleSession("bike", session);
    });
  });
  document.querySelectorAll("[data-bike-edit-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = bikeSessions.find((s) => s.id === btn.dataset.bikeEditSession);
      if (session) startEditBikeSession(session);
    });
  });
  document.querySelectorAll("[data-bike-duplicate-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = bikeSessions.find((s) => s.id === btn.dataset.bikeDuplicateSession);
      if (session) duplicateBikeSession(session);
    });
  });

  const exportBtn = document.getElementById("bike-export-btn");
  const importBtn = document.getElementById("bike-import-btn");
  const importFile = document.getElementById("bike-import-file");

  exportBtn.addEventListener("click", async () => {
    await exportBackup();
    renderBikeContent();
  });

  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", () => {
    const file = importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
        if (!isValidImportPayload(data)) throw new Error("format invalide");
      } catch (e) {
        showAlert("Ce fichier ne semble pas être une sauvegarde ou une séance GymLog valide.");
        importFile.value = "";
        return;
      }
      handleImportedFile(data, renderBikeContent);
      importFile.value = "";
    };
    reader.readAsText(file);
  });
}
