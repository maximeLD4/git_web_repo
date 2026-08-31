function runSessionCardHTML(s) {
  const open = !!openRunHistoryIds[s.id];
  const upcoming = isUpcoming(s);
  const blocksSummary = s.blocks
    .map(
      (b) => `
  <div>
    <div class="history-ex-name">${b.label}</div>
    <div class="history-sets"><div class="history-set-chip">${formatBlockSummary(b)}</div></div>
  </div>`
    )
    .join("");
  return `
  <div class="history-card ${upcoming ? "upcoming" : ""}">
    <div class="history-head" data-run-toggle="${s.id}">
      <div class="history-head-left">
        <div class="history-date">${formatDateFR(s.date)}${upcoming ? '<span class="upcoming-badge">À venir</span>' : ""}</div>
        ${s.label ? `<div class="history-label">${s.label}</div>` : ""}
        <div class="history-run-stats">${formatSessionTotalsLine(s.blocks)}</div>
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
             <button class="edit-link" data-run-edit-session="${s.id}">${ICONS.edit} Modifier</button>
             <button class="edit-link" data-run-duplicate-session="${s.id}">${ICONS.duplicate} Dupliquer</button>
             <button class="edit-link" data-run-share-session="${s.id}">${ICONS.up} Partager</button>
             ${upcoming ? `<button class="edit-link" data-run-mark-done-session="${s.id}">${ICONS.check} Marquer comme faite</button>` : ""}
             <button class="delete-link" data-run-delete-session="${s.id}">${ICONS.trash} Supprimer</button>
           </div>`
        : ""
    }
  </div>`;
}

function shiftRunCalendarMonth(delta) {
  const [y, m] = runCalendarMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  runCalendarMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function runCalendarViewHTML() {
  const [y, m] = runCalendarMonth.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const startDow = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthLabel = firstOfMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const showFuture = runCalendarTimeFilter === "future";
  const sessionDates = new Set(runSessions.filter((s) => isUpcoming(s) === showFuture).map((s) => s.date));
  const today = todayISO();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push("<div class=\"cal-cell empty\"></div>");
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${runCalendarMonth}-${String(d).padStart(2, "0")}`;
    const hasData = sessionDates.has(dateStr);
    const isSelected = runSelectedCalendarDate === dateStr;
    const isToday = dateStr === today;
    cells.push(`
      <button type="button" class="cal-cell ${hasData ? "has-data" : ""} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}" data-run-cal-date="${dateStr}">
        <span class="cal-day-num">${d}</span>
        ${hasData ? `<span class="${showFuture ? "cal-dot-hollow" : "cal-dot"}"></span>` : ""}
      </button>`);
  }

  let selectedHTML = "";
  if (runSelectedCalendarDate) {
    const daySessions = runSessions.filter((s) => s.date === runSelectedCalendarDate && isUpcoming(s) === showFuture);
    selectedHTML =
      daySessions.length > 0
        ? `<div class="cal-selected-label">${formatDateFR(runSelectedCalendarDate)}</div>${daySessions.map(runSessionCardHTML).join("")}`
        : `<div class="empty-state" style="padding: 30px 20px;">Aucune séance ${showFuture ? "prévue" : "effectuée"} ce jour-là.</div>`;
  }

  return `
    ${timeFilterToggleHTML(showFuture, "run-time-filter")}
    <div class="cal-header">
      <button type="button" class="cal-nav-btn" data-run-cal-prev>${ICONS.back}</button>
      <div class="cal-month-label">${monthLabel}</div>
      <button type="button" class="cal-nav-btn" data-run-cal-next>${ICONS.chevronRight}</button>
    </div>
    <div class="cal-weekdays"><div>Lu</div><div>Ma</div><div>Me</div><div>Je</div><div>Ve</div><div>Sa</div><div>Di</div></div>
    <div class="cal-grid">${cells.join("")}</div>
    ${selectedHTML}
  `;
}

function runHistoryTabHTML() {
  const sorted = [...runSessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const lastExport = loadJSON(KEYS.lastExport, null);
  const lastImport = loadJSON(KEYS.lastImport, null);
  const backup = `
    <div class="backup-row">
      <button class="backup-btn" id="run-export-btn">${ICONS.up} Exporter</button>
      <button class="backup-btn" id="run-import-btn">${ICONS.down} Importer</button>
      <input type="file" id="run-import-file" accept="application/json" style="display:none">
    </div>
    <div class="sync-status">Dernier export : ${formatRelativeTime(lastExport)} · Dernier import : ${formatRelativeTime(lastImport)}</div>
    <div class="backup-note">Cette sauvegarde inclut toutes tes activités (muscu, course, natation, vélo) — un seul fichier pour tout ton historique.</div>
  `;
  const viewToggle = `
    <div class="ex-type-toggle" style="margin: 0 0 16px;">
      <button type="button" class="ex-type-btn ${runHistoryViewMode === "list" ? "active" : ""}" data-run-history-view="list">${ICONS.history} Liste</button>
      <button type="button" class="ex-type-btn ${runHistoryViewMode === "calendar" ? "active" : ""}" data-run-history-view="calendar">${ICONS.calendar} Calendrier</button>
    </div>`;

  if (runHistoryViewMode === "calendar") {
    return backup + viewToggle + runCalendarViewHTML();
  }
  if (sorted.length === 0) {
    return backup + viewToggle + `<div class="empty-state"><div class="bar-icon">${ICONS.history}</div>Aucune séance enregistrée pour l'instant.<br>Va dans l'onglet "Créer" pour ajouter la première.</div>`;
  }

  const upcoming = sorted.filter((s) => isUpcoming(s)).sort((a, b) => (a.date > b.date ? 1 : -1));
  const past = sorted.filter((s) => !isUpcoming(s));
  const upcomingHTML = upcoming.length > 0 ? `<div class="session-group-heading">À venir</div>${upcoming.map(runSessionCardHTML).join("")}` : "";

  const weeks = groupRunSessionsByWeek(past);
  const weeksHTML = weeks
    .map((week) => {
      let totalKm = 0;
      let totalMin = 0;
      week.sessions.forEach((s) => {
        s.blocks.forEach((b) => {
          totalKm += blockDistanceKm(b);
          totalMin += blockDurationMin(b);
        });
      });
      const sessionsHTML = week.sessions.map(runSessionCardHTML).join("");
      return `
      <div class="week-group">
        <div class="week-header">
          <div class="week-range">Semaine du ${formatDateShortFR(week.weekStart)} au ${formatDateShortFR(week.weekEnd)}</div>
          <div class="week-stats">${totalKm > 0 ? `${Math.round(totalKm * 10) / 10} km` : "—"} · ${formatDurationMin(totalMin)}</div>
        </div>
        ${sessionsHTML}
      </div>`;
    })
    .join("");

  return backup + viewToggle + upcomingHTML + weeksHTML;
}


function attachRunHistoryListeners() {
  document.querySelectorAll("[data-run-history-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      runHistoryViewMode = btn.dataset.runHistoryView;
      renderRunContent();
    });
  });
  document.querySelectorAll("[data-run-time-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      runCalendarTimeFilter = btn.dataset.runTimeFilter;
      runSelectedCalendarDate = null;
      renderRunContent();
    });
  });
  const calPrev = document.querySelector("[data-run-cal-prev]");
  const calNext = document.querySelector("[data-run-cal-next]");
  if (calPrev) calPrev.addEventListener("click", () => { shiftRunCalendarMonth(-1); renderRunContent(); });
  if (calNext) calNext.addEventListener("click", () => { shiftRunCalendarMonth(1); renderRunContent(); });
  document.querySelectorAll("[data-run-cal-date]").forEach((cell) => {
    cell.addEventListener("click", () => {
      const d = cell.dataset.runCalDate;
      runSelectedCalendarDate = runSelectedCalendarDate === d ? null : d;
      renderRunContent();
    });
  });
  document.querySelectorAll("[data-run-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.runToggle;
      openRunHistoryIds[id] = !openRunHistoryIds[id];
      renderRunContent();
    });
  });
  document.querySelectorAll("[data-run-delete-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      showConfirm(
        "Supprimer définitivement cette séance ? Cette action est irréversible.",
        () => {
          runSessions = runSessions.filter((s) => s.id !== btn.dataset.runDeleteSession);
          saveJSON(KEYS.runSessions, runSessions);
          renderRunContent();
        },
        { confirmLabel: "Supprimer", danger: true }
      );
    });
  });
  document.querySelectorAll("[data-run-mark-done-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      markActivityDone("run", btn.dataset.runMarkDoneSession);
      renderRunContent();
    });
  });
  document.querySelectorAll("[data-run-share-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = runSessions.find((s) => s.id === btn.dataset.runShareSession);
      if (session) exportSingleSession("run", session);
    });
  });
  document.querySelectorAll("[data-run-edit-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = runSessions.find((s) => s.id === btn.dataset.runEditSession);
      if (session) startEditRunSession(session);
    });
  });
  document.querySelectorAll("[data-run-duplicate-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = runSessions.find((s) => s.id === btn.dataset.runDuplicateSession);
      if (session) duplicateRunSession(session);
    });
  });

  const exportBtn = document.getElementById("run-export-btn");
  const importBtn = document.getElementById("run-import-btn");
  const importFile = document.getElementById("run-import-file");

  exportBtn.addEventListener("click", async () => {
    await exportBackup();
    renderRunContent();
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
      handleImportedFile(data, renderRunContent);
      importFile.value = "";
    };
    reader.readAsText(file);
  });
}
