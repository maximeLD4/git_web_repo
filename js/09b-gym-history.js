function setBarsHTML(ex, colorOverride) {
  const weights = ex.sets.map((s) => parseFloat(s.weight) || 0);
  const reps = ex.sets.map((s) => parseFloat(s.reps) || 0);
  const maxWeight = Math.max(...weights, 1);
  const maxReps = Math.max(...reps, 1);
  const barColorStyle = colorOverride ? `background:${colorOverride};` : "";
  const repsColorStyle = colorOverride ? `color:${colorOverride};` : "";
  const bars = ex.sets
    .map((s, i) => {
      const w = weights[i];
      const r = reps[i];
      const heightPx = w > 0 ? Math.round(20 + (w / maxWeight) * 70) : 8;
      const widthPx = r > 0 ? Math.round(18 + (r / maxReps) * 40) : 14;
      return `
      <div class="set-bar-col">
        <div class="set-bar-reps" style="${repsColorStyle}">${r ? `×${r}` : ""}</div>
        <div class="set-bar" style="height:${heightPx}px;width:${widthPx}px;${barColorStyle}"></div>
        <div class="set-bar-weight">${w ? `${w}kg` : ""}</div>
      </div>`;
    })
    .join("");
  return `<div class="set-bars-row">${bars}</div>`;
}

function sessionCardHTML(s) {
  const open = !!openHistoryIds[s.id];
  const upcoming = isUpcoming(s);
  const exHTML = s.exercises
    .map(
      (ex) => `
  <div>
    <div class="history-ex-name">${ex.name}</div>
    ${
      (ex.exType || "muscu") === "cardio"
        ? `<div class="history-sets">${ex.sets.map((set) => `<div class="history-set-chip">${formatSetChip(ex.exType, set)}</div>`).join("")}</div>`
        : setBarsHTML(ex)
    }
  </div>`
    )
    .join("");
  return `
  <div class="history-card ${upcoming ? "upcoming" : ""}">
    <div class="history-head" data-toggle="${s.id}">
      <div class="history-head-left">
        <div class="history-date">${formatDateFR(s.date)}${upcoming ? '<span class="upcoming-badge">À venir</span>' : ""}</div>
        ${s.label ? `<div class="history-label">${s.label}</div>` : ""}
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="history-meta">${s.exercises.length} exo${s.exercises.length !== 1 ? "s" : ""}</div>
        <span class="chev ${open ? "open" : ""}">${ICONS.chevron}</span>
      </div>
    </div>
    ${
      open
        ? `<div class="history-body">${exHTML}</div>
           <div class="delete-row">
             <button class="edit-link" data-edit-session="${s.id}">${ICONS.edit} Modifier</button>
             <button class="edit-link" data-duplicate-session="${s.id}">${ICONS.duplicate} Dupliquer</button>
             <button class="edit-link" data-share-session="${s.id}">${ICONS.up} Partager</button>
             ${upcoming ? `<button class="edit-link" data-mark-done-session="${s.id}">${ICONS.check} Marquer comme faite</button>` : ""}
             <button class="delete-link" data-delete-session="${s.id}">${ICONS.trash} Supprimer</button>
           </div>`
        : ""
    }
  </div>`;
}

function shiftCalendarMonth(delta) {
  const [y, m] = calendarMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  calendarMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function calendarViewHTML() {
  const [y, m] = calendarMonth.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const startDow = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthLabel = firstOfMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const showFuture = calendarTimeFilter === "future";
  const sessionDates = new Set(sessions.filter((s) => isUpcoming(s) === showFuture).map((s) => s.date));
  const today = todayISO();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push("<div class=\"cal-cell empty\"></div>");
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calendarMonth}-${String(d).padStart(2, "0")}`;
    const hasData = sessionDates.has(dateStr);
    const isSelected = selectedCalendarDate === dateStr;
    const isToday = dateStr === today;
    cells.push(`
      <button type="button" class="cal-cell ${hasData ? "has-data" : ""} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}" data-cal-date="${dateStr}">
        <span class="cal-day-num">${d}</span>
        ${hasData ? `<span class="${showFuture ? "cal-dot-hollow" : "cal-dot"}"></span>` : ""}
      </button>`);
  }

  let selectedHTML = "";
  if (selectedCalendarDate) {
    const daySessions = sessions.filter((s) => s.date === selectedCalendarDate && isUpcoming(s) === showFuture);
    selectedHTML =
      daySessions.length > 0
        ? `<div class="cal-selected-label">${formatDateFR(selectedCalendarDate)}</div>${daySessions.map(sessionCardHTML).join("")}`
        : `<div class="empty-state" style="padding: 30px 20px;">Aucune séance ${showFuture ? "prévue" : "effectuée"} ce jour-là.</div>`;
  }

  return `
    ${timeFilterToggleHTML(showFuture, "time-filter")}
    <div class="cal-header">
      <button type="button" class="cal-nav-btn" data-cal-prev>${ICONS.back}</button>
      <div class="cal-month-label">${monthLabel}</div>
      <button type="button" class="cal-nav-btn" data-cal-next>${ICONS.chevronRight}</button>
    </div>
    <div class="cal-weekdays"><div>Lu</div><div>Ma</div><div>Me</div><div>Je</div><div>Ve</div><div>Sa</div><div>Di</div></div>
    <div class="cal-grid">${cells.join("")}</div>
    ${selectedHTML}
  `;
}

function historyTabHTML() {
  const sorted = [...sessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const lastExport = loadJSON(KEYS.lastExport, null);
  const lastImport = loadJSON(KEYS.lastImport, null);
  const backup = `
    <div class="backup-row">
      <button class="backup-btn" id="export-btn">${ICONS.up} Exporter</button>
      <button class="backup-btn" id="import-btn">${ICONS.down} Importer</button>
      <input type="file" id="import-file" accept="application/json" style="display:none">
    </div>
    <div class="sync-status">Dernier export : ${formatRelativeTime(lastExport)} · Dernier import : ${formatRelativeTime(lastImport)}</div>
    <div class="backup-note">Cette sauvegarde inclut toutes tes activités (muscu, course, natation, vélo) — un seul fichier pour tout ton historique. Pour le retrouver sur un autre appareil : exporte ici, envoie-toi le fichier (AirDrop, mail, cloud…), puis importe-le là-bas.</div>
  `;
  const viewToggle = `
    <div class="ex-type-toggle" style="margin: 0 0 16px;">
      <button type="button" class="ex-type-btn ${historyViewMode === "list" ? "active" : ""}" data-history-view="list">${ICONS.history} Liste</button>
      <button type="button" class="ex-type-btn ${historyViewMode === "calendar" ? "active" : ""}" data-history-view="calendar">${ICONS.calendar} Calendrier</button>
    </div>`;

  if (historyViewMode === "calendar") {
    return backup + viewToggle + calendarViewHTML();
  }
  if (sorted.length === 0) {
    return backup + viewToggle + `<div class="empty-state"><div class="bar-icon">${ICONS.history}</div>Aucune séance enregistrée pour l'instant.<br>Va dans l'onglet "Créer" pour ajouter la première.</div>`;
  }
  const upcoming = sorted.filter((s) => isUpcoming(s)).sort((a, b) => (a.date > b.date ? 1 : -1));
  const past = sorted.filter((s) => !isUpcoming(s));
  const showHeadings = upcoming.length > 0 && past.length > 0;
  const upcomingHTML = upcoming.length > 0 ? (showHeadings ? `<div class="session-group-heading">À venir</div>` : "") + upcoming.map(sessionCardHTML).join("") : "";
  const pastHTML = past.length > 0 ? (showHeadings ? `<div class="session-group-heading">Effectuées</div>` : "") + past.map(sessionCardHTML).join("") : "";
  return backup + viewToggle + upcomingHTML + pastHTML;
}


function attachHistoryListeners() {
  document.querySelectorAll("[data-history-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      historyViewMode = btn.dataset.historyView;
      renderContent();
    });
  });
  document.querySelectorAll("[data-time-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      calendarTimeFilter = btn.dataset.timeFilter;
      selectedCalendarDate = null;
      renderContent();
    });
  });
  const calPrev = document.querySelector("[data-cal-prev]");
  const calNext = document.querySelector("[data-cal-next]");
  if (calPrev) calPrev.addEventListener("click", () => { shiftCalendarMonth(-1); renderContent(); });
  if (calNext) calNext.addEventListener("click", () => { shiftCalendarMonth(1); renderContent(); });
  document.querySelectorAll("[data-cal-date]").forEach((cell) => {
    cell.addEventListener("click", () => {
      const d = cell.dataset.calDate;
      selectedCalendarDate = selectedCalendarDate === d ? null : d;
      renderContent();
    });
  });
  document.querySelectorAll("[data-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.toggle;
      openHistoryIds[id] = !openHistoryIds[id];
      renderContent();
    });
  });
  document.querySelectorAll("[data-delete-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      showConfirm(
        "Supprimer définitivement cette séance ? Cette action est irréversible.",
        () => {
          sessions = sessions.filter((s) => s.id !== btn.dataset.deleteSession);
          saveJSON(KEYS.sessions, sessions);
          renderContent();
        },
        { confirmLabel: "Supprimer", danger: true }
      );
    });
  });
  document.querySelectorAll("[data-mark-done-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      markActivityDone("gym", btn.dataset.markDoneSession);
      renderContent();
    });
  });
  document.querySelectorAll("[data-share-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = sessions.find((s) => s.id === btn.dataset.shareSession);
      if (session) exportSingleSession("gym", session);
    });
  });
  document.querySelectorAll("[data-edit-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = sessions.find((s) => s.id === btn.dataset.editSession);
      if (session) startEditSession(session);
    });
  });
  document.querySelectorAll("[data-duplicate-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = sessions.find((s) => s.id === btn.dataset.duplicateSession);
      if (session) duplicateSession(session);
    });
  });

  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const importFile = document.getElementById("import-file");

  exportBtn.addEventListener("click", async () => {
    await exportBackup();
    renderContent();
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
      handleImportedFile(data, renderContent);
      importFile.value = "";
    };
    reader.readAsText(file);
  });
}
