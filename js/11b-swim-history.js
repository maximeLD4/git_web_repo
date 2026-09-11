function swimSessionCardHTML(s) {
  const open = !!openSwimHistoryIds[s.id];
  const blocksSummary = s.blocks
    .map(
      (b) => `
  <div>
    <div class="history-ex-name">${b.label}</div>
    <div class="history-sets"><div class="history-set-chip">${formatSwimBlockSummary(b)}</div></div>
  </div>`
    )
    .join("");
  return `
  <div class="history-card">
    <div class="history-head" data-swim-toggle="${s.id}">
      <div class="history-head-left">
        <div class="history-date">${formatDateFR(s.date)}</div>
        ${s.label ? `<div class="history-label">${s.label}</div>` : ""}
        <div class="history-run-stats">${formatSwimSessionTotalsLine(s.blocks)}</div>
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
             <button class="edit-link" data-swim-edit-session="${s.id}">${ICONS.edit} Modifier</button>
             <button class="edit-link" data-swim-duplicate-session="${s.id}">${ICONS.duplicate} Dupliquer</button>
             <button class="edit-link" data-swim-share-session="${s.id}">${ICONS.up} Partager</button>
             <button class="delete-link" data-swim-delete-session="${s.id}">${ICONS.trash} Supprimer</button>
           </div>`
        : ""
    }
  </div>`;
}

function shiftSwimCalendarMonth(delta) {
  const [y, m] = swimCalendarMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  swimCalendarMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function swimCalendarViewHTML() {
  const [y, m] = swimCalendarMonth.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const startDow = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthLabel = firstOfMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const sessionDates = new Set(swimSessions.map((s) => s.date));
  const today = todayISO();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push("<div class=\"cal-cell empty\"></div>");
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${swimCalendarMonth}-${String(d).padStart(2, "0")}`;
    const hasData = sessionDates.has(dateStr);
    const isSelected = swimSelectedCalendarDate === dateStr;
    const isToday = dateStr === today;
    cells.push(`
      <button type="button" class="cal-cell ${hasData ? "has-data" : ""} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}" data-swim-cal-date="${dateStr}">
        <span class="cal-day-num">${d}</span>
        ${hasData ? `<span class="cal-dot"></span>` : ""}
      </button>`);
  }

  let selectedHTML = "";
  if (swimSelectedCalendarDate) {
    const daySessions = swimSessions.filter((s) => s.date === swimSelectedCalendarDate);
    selectedHTML =
      daySessions.length > 0
        ? `<div class="cal-selected-label">${formatDateFR(swimSelectedCalendarDate)}</div>${daySessions.map(swimSessionCardHTML).join("")}`
        : `<div class="empty-state" style="padding: 30px 20px;">Aucune séance effectuée ce jour-là.</div>`;
  }

  return `
    <div class="cal-header">
      <button type="button" class="cal-nav-btn" data-swim-cal-prev>${ICONS.back}</button>
      <div class="cal-month-label">${monthLabel}</div>
      <button type="button" class="cal-nav-btn" data-swim-cal-next>${ICONS.chevronRight}</button>
    </div>
    <div class="cal-weekdays"><div>Lu</div><div>Ma</div><div>Me</div><div>Je</div><div>Ve</div><div>Sa</div><div>Di</div></div>
    <div class="cal-grid">${cells.join("")}</div>
    ${selectedHTML}
  `;
}

function swimHistoryTabHTML() {
  const sorted = [...swimSessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const lastExport = loadJSON(KEYS.lastExport, null);
  const lastImport = loadJSON(KEYS.lastImport, null);
  const backup = `
    <div class="backup-row">
      <button class="backup-btn" id="swim-export-btn">${ICONS.up} Exporter</button>
      <button class="backup-btn" id="swim-import-btn">${ICONS.down} Importer</button>
      <input type="file" id="swim-import-file" accept="application/json" style="display:none">
    </div>
    <div class="sync-status">Dernier export : ${formatRelativeTime(lastExport)} · Dernier import : ${formatRelativeTime(lastImport)}</div>
    <div class="backup-note">Cette sauvegarde inclut toutes tes activités (muscu, course, natation, vélo) — un seul fichier pour tout ton historique.</div>
  `;
  const viewToggle = `
    <div class="ex-type-toggle" style="margin: 0 0 16px;">
      <button type="button" class="ex-type-btn ${swimHistoryViewMode === "list" ? "active" : ""}" data-swim-history-view="list">${ICONS.history} Liste</button>
      <button type="button" class="ex-type-btn ${swimHistoryViewMode === "calendar" ? "active" : ""}" data-swim-history-view="calendar">${ICONS.calendar} Calendrier</button>
    </div>`;

  if (swimHistoryViewMode === "calendar") {
    return backup + viewToggle + swimCalendarViewHTML();
  }
  if (sorted.length === 0) {
    return backup + viewToggle + `<div class="empty-state"><div class="bar-icon">${ICONS.history}</div>Aucune séance enregistrée pour l'instant.<br>Va dans l'onglet "Créer" pour ajouter la première.</div>`;
  }
  return backup + viewToggle + sorted.map(swimSessionCardHTML).join("");
}


function attachSwimHistoryListeners() {
  document.querySelectorAll("[data-swim-history-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      swimHistoryViewMode = btn.dataset.swimHistoryView;
      renderSwimContent();
    });
  });
  const calPrev = document.querySelector("[data-swim-cal-prev]");
  const calNext = document.querySelector("[data-swim-cal-next]");
  if (calPrev) calPrev.addEventListener("click", () => animateCalendarMonthChange(-1, () => { shiftSwimCalendarMonth(-1); renderSwimContent(); }));
  if (calNext) calNext.addEventListener("click", () => animateCalendarMonthChange(1, () => { shiftSwimCalendarMonth(1); renderSwimContent(); }));
  document.querySelectorAll("[data-swim-cal-date]").forEach((cell) => {
    cell.addEventListener("click", () => {
      const d = cell.dataset.swimCalDate;
      swimSelectedCalendarDate = swimSelectedCalendarDate === d ? null : d;
      renderSwimContent();
    });
  });
  document.querySelectorAll("[data-swim-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.swimToggle;
      openSwimHistoryIds[id] = !openSwimHistoryIds[id];
      renderSwimContent();
    });
  });
  document.querySelectorAll("[data-swim-delete-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      showConfirm(
        "Supprimer définitivement cette séance ? Cette action est irréversible.",
        () => {
          swimSessions = swimSessions.filter((s) => s.id !== btn.dataset.swimDeleteSession);
          saveJSON(KEYS.swimSessions, swimSessions);
          renderSwimContent();
        },
        { confirmLabel: "Supprimer", danger: true }
      );
    });
  });
  document.querySelectorAll("[data-swim-share-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = swimSessions.find((s) => s.id === btn.dataset.swimShareSession);
      if (session) exportSingleSession("swim", session);
    });
  });
  document.querySelectorAll("[data-swim-edit-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = swimSessions.find((s) => s.id === btn.dataset.swimEditSession);
      if (session) startEditSwimSession(session);
    });
  });
  document.querySelectorAll("[data-swim-duplicate-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = swimSessions.find((s) => s.id === btn.dataset.swimDuplicateSession);
      if (session) duplicateSwimSession(session);
    });
  });

  const exportBtn = document.getElementById("swim-export-btn");
  const importBtn = document.getElementById("swim-import-btn");
  const importFile = document.getElementById("swim-import-file");

  exportBtn.addEventListener("click", async () => {
    await exportBackup();
    renderSwimContent();
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
      handleImportedFile(data, renderSwimContent);
      importFile.value = "";
    };
    reader.readAsText(file);
  });
}
