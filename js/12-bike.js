function computeBikeTriangle(durationVal, distanceVal, speedVal) {
  const d = parseFloat(durationVal), dist = parseFloat(distanceVal), sp = parseFloat(speedVal);
  const dOk = durationVal !== "" && !isNaN(d);
  const distOk = distanceVal !== "" && !isNaN(dist) && dist > 0;
  const spOk = speedVal !== "" && !isNaN(sp) && sp > 0;
  const result = { duration: durationVal, distance: distanceVal, speed: speedVal };
  if (dOk && distOk && !spOk) result.speed = String(round2((dist * 60) / d));
  else if (dOk && spOk && !distOk) result.distance = String(round2((sp * d) / 60));
  else if (distOk && spOk && !dOk) result.duration = String(round2((dist / sp) * 60));
  return result;
}
function bikeBlockHasData(b) {
  return !!(b.duration || b.distance || b.speed);
}
function formatBikeBlockSummary(b) {
  const parts = [];
  if (b.duration) parts.push(`${b.duration}min`);
  if (b.distance) parts.push(`${b.distance}km`);
  if (b.speed) parts.push(`${b.speed}km/h`);
  return parts.length ? parts.join(" · ") : "—";
}
function bikeBlockDistanceKm(b) {
  if (b.distance) return parseFloat(b.distance);
  if (b.duration && b.speed) return (parseFloat(b.speed) * parseFloat(b.duration)) / 60;
  return 0;
}
function bikeBlockDurationMin(b) {
  if (b.duration) return parseFloat(b.duration);
  if (b.distance && b.speed) return (parseFloat(b.distance) / parseFloat(b.speed)) * 60;
  return 0;
}
function computeBikeSessionTotals(blocks) {
  let km = 0, min = 0;
  blocks.forEach((b) => {
    km += bikeBlockDistanceKm(b);
    min += bikeBlockDurationMin(b);
  });
  const speed = min > 0 ? km / (min / 60) : null;
  return { km, min, speed };
}
function formatBikeSessionTotalsLine(blocks) {
  const t = computeBikeSessionTotals(blocks);
  const kmPart = t.km > 0 ? `${Math.round(t.km * 10) / 10} km` : "0 km";
  const minPart = formatDurationMin(t.min);
  const speedPart = t.speed ? `${Math.round(t.speed * 10) / 10} km/h` : "—";
  return `${kmPart} · ${minPart} · ${speedPart}`;
}

/* ---------- bike: draft helpers ---------- */
function serializeBikeBlocksFromDOM() {
  const cards = document.querySelectorAll("#bike-blocks-container .exercise-card");
  const result = [];
  cards.forEach((card) => {
    const id = card.dataset.id;
    const mode = card.dataset.mode || "duration";
    const label = card.querySelector(".ex-name-input").value;
    const block = {
      id,
      label,
      mode,
      duration: card.querySelector(".bike-block-duration").value,
      distance: card.querySelector(".bike-block-distance").value,
      speed: card.querySelector(".bike-block-speed").value,
    };
    result.push(block);
  });
  return result;
}

function scheduleBikeDraftSave() {
  clearTimeout(bikeDraftSaveTimer);
  bikeDraftSaveTimer = setTimeout(() => {
    const dateEl = document.getElementById("bike-date");
    const labelEl = document.getElementById("bike-label");
    bikeDraft = {
      date: dateEl ? dateEl.value : bikeDraft.date,
      label: labelEl ? labelEl.value : bikeDraft.label,
      blocks: serializeBikeBlocksFromDOM(),
      editingSessionId: bikeEditingSessionId,
    };
    saveJSON(KEYS.bikeDraft, bikeDraft);
  }, 350);
}

function clearBikeDraft() {
  bikeDraft = { date: todayISO(), label: "", blocks: [emptyBikeBlock()] };
  bikeEditingSessionId = null;
  saveJSON(KEYS.bikeDraft, bikeDraft);
}

function startEditBikeSession(session) {
  bikeEditingSessionId = session.id;
  bikeDraft = {
    date: session.date,
    label: session.label || "",
    blocks: JSON.parse(JSON.stringify(session.blocks)),
    editingSessionId: bikeEditingSessionId,
  };
  saveJSON(KEYS.bikeDraft, bikeDraft);
  bikeTab = "log";
  renderBikeApp();
}

function duplicateBikeSession(session) {
  const clonedBlocks = JSON.parse(JSON.stringify(session.blocks)).map((b) => ({ ...b, id: uid() }));
  bikeEditingSessionId = null;
  bikeDraft = { date: todayISO(), label: session.label || "", blocks: clonedBlocks, editingSessionId: null };
  saveJSON(KEYS.bikeDraft, bikeDraft);
  bikeTab = "log";
  renderBikeApp();
}

function renderBikeApp() {
  app.className = "theme-bike";
  app.innerHTML = `
    <div class="header">
      <div class="header-title"><button type="button" class="back-btn" data-go-home>${ICONS.back}</button><span class="bar"></span>Vélo</div>
      <div class="header-sub">${bikeSessions.length} séance${bikeSessions.length !== 1 ? "s" : ""} enregistrée${bikeSessions.length !== 1 ? "s" : ""}</div>
    </div>
    <div class="content" id="content"></div>
    <div class="tabbar">
      <button class="tab-btn ${bikeTab === "log" ? "active" : ""}" data-bike-tab="log">${ICONS.bike}Créer</button>
      <button class="tab-btn ${bikeTab === "history" ? "active" : ""}" data-bike-tab="history">${ICONS.history}Séances</button>
    </div>
  `;
  document.querySelector("[data-go-home]").addEventListener("click", goHome);
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      bikeTab = btn.dataset.bikeTab;
      renderBikeApp();
    });
  });
  renderBikeContent();
}

function renderBikeContent() {
  const content = document.getElementById("content");
  if (bikeTab === "log") content.innerHTML = bikeLogTabHTML();
  else content.innerHTML = bikeHistoryTabHTML();
  attachBikeContentListeners();
}

function bikeBlockCardHTML(b) {
  return `
  <div class="exercise-card" data-id="${b.id}" data-mode="both">
    <div class="exercise-head">
      <button type="button" class="drag-handle" data-drag-handle aria-label="Réordonner">${ICONS.grip}</button>
      <input class="ex-name-input" type="text" placeholder="Nom du bloc (optionnel)" list="bike-block-suggestions" value="${b.label.replace(/"/g, "&quot;")}">
      <button type="button" class="icon-btn" data-duplicate-block="${b.id}" aria-label="Dupliquer le bloc">${ICONS.duplicate}</button>
      <button class="icon-btn" data-remove-block="${b.id}">${ICONS.x}</button>
    </div>
    <div class="block-fields-row">
      <div class="field"><label>Durée (min)</label><input class="bike-block-duration" type="number" inputmode="decimal" placeholder="ex. 60" value="${b.duration}"></div>
      <div class="field"><label>Distance (km)</label><input class="bike-block-distance" type="number" inputmode="decimal" placeholder="ex. 25" value="${b.distance}"></div>
      <div class="field"><label>Vitesse (km/h)</label><input class="bike-block-speed" type="number" inputmode="decimal" placeholder="ex. 25" value="${b.speed}" disabled></div>
    </div>
    <div class="block-mode-hint">Vitesse calculée automatiquement à partir de la durée et de la distance.</div>
  </div>`;
}

function bikeLogTabHTML() {
  const blocksHTML = bikeDraft.blocks.map(bikeBlockCardHTML).join("");
  const libOptions = bikeLibrary.map((n) => `<option value="${n.replace(/"/g, "&quot;")}">`).join("");
  const editBanner = bikeEditingSessionId
    ? `<div class="edit-banner">Modification d'une séance existante<button type="button" id="bike-cancel-edit-btn">Annuler</button></div>`
    : "";
  return `
    <div class="backup-row">
      <button class="backup-btn" id="bike-import-draft-btn">${ICONS.down} Importer une séance</button>
      <button class="backup-btn" id="bike-reset-draft-btn">${ICONS.reset} Réinitialiser</button>
      <input type="file" id="bike-import-draft-file" accept="application/json" style="display:none">
    </div>
    ${editBanner}
    <div class="field-row">
      <div class="field"><label>Date</label><input type="date" id="bike-date" value="${bikeDraft.date}"></div>
      <div class="field"><label>Séance</label><input type="text" id="bike-label" placeholder="Sortie route, home trainer… (optionnel)" value="${(bikeDraft.label || "").replace(/"/g, "&quot;")}"></div>
    </div>
    <div class="run-summary-bar" id="bike-summary-bar">${formatBikeSessionTotalsLine(bikeDraft.blocks)}</div>
    <div id="bike-blocks-container">${blocksHTML}</div>
    <datalist id="bike-block-suggestions"><option value="Échauffement"><option value="Sortie route"><option value="Home trainer"><option value="Récupération">${libOptions}</datalist>
    <button class="add-exercise-btn" id="add-bike-block-btn">${ICONS.plus} Ajouter un bloc</button>
    <div id="bike-error-slot"></div>
    <button class="save-btn" id="save-bike-session-btn">${ICONS.check} ${bikeEditingSessionId ? "Enregistrer les modifications" : "Enregistrer la séance"}</button>
    <div id="bike-flash-slot"></div>
  `;
}

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

function startDragBikeBlock(e, card) {
  startDragItem(e, card, document.getElementById("bike-blocks-container"), () => {
    bikeDraft.blocks = serializeBikeBlocksFromDOM();
    saveJSON(KEYS.bikeDraft, bikeDraft);
  });
}

/* ---------- bike app: listeners ---------- */
function attachBikeContentListeners() {
  if (bikeTab === "log") attachBikeLogListeners();
  else attachBikeHistoryListeners();
}


function updateBikeSummaryBar() {
  const bar = document.getElementById("bike-summary-bar");
  if (!bar) return;
  bar.innerHTML = formatBikeSessionTotalsLine(serializeBikeBlocksFromDOM());
}

function attachBikeLogListeners() {
  const dateEl = document.getElementById("bike-date");
  const labelEl = document.getElementById("bike-label");
  dateEl.addEventListener("input", scheduleBikeDraftSave);
  labelEl.addEventListener("input", scheduleBikeDraftSave);

  const importDraftBtn = document.getElementById("bike-import-draft-btn");
  const importDraftFile = document.getElementById("bike-import-draft-file");
  importDraftBtn.addEventListener("click", () => importDraftFile.click());

  attachArmedConfirmButton(
    document.getElementById("bike-reset-draft-btn"),
    `${ICONS.reset} Réinitialiser`,
    `${ICONS.reset} Confirmer ?`,
    () => {
      clearBikeDraft();
      renderBikeContent();
    }
  );
  importDraftFile.addEventListener("change", () => {
    const file = importDraftFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch (e) {
        showAlert("Ce fichier ne semble pas être une séance GymLog valide.");
        importDraftFile.value = "";
        return;
      }
      const result = validateSingleSessionForSection(data, "bike");
      if (!result.ok) {
        showAlert(result.message);
        importDraftFile.value = "";
        return;
      }
      showConfirm(
        `Charger cette séance (${formatDateFR(result.session.date)}) dans le formulaire ? Cela remplacera ce que tu es en train de saisir.`,
        () => {
          const s = result.session;
          bikeDraft = {
            date: s.date,
            label: s.label || "",
            blocks: JSON.parse(JSON.stringify(s.blocks)).map((b) => ({ ...b, id: uid() })),
            editingSessionId: null,
          };
          bikeEditingSessionId = null;
          saveJSON(KEYS.bikeDraft, bikeDraft);
          renderBikeContent();
        },
        { confirmLabel: "Charger" }
      );
      importDraftFile.value = "";
    };
    reader.readAsText(file);
  });

  const cancelEditBtn = document.getElementById("bike-cancel-edit-btn");
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      clearBikeDraft();
      renderBikeContent();
    });
  }

  document.querySelectorAll("#bike-blocks-container .exercise-card").forEach((card) => {
    const labelInput = card.querySelector(".ex-name-input");
    labelInput.addEventListener("input", scheduleBikeDraftSave);

    const durEl = card.querySelector(".bike-block-duration");
    const distEl = card.querySelector(".bike-block-distance");
    const speedEl = card.querySelector(".bike-block-speed");
    const recomputeSpeed = () => {
      const d = parseFloat(durEl.value);
      const dist = parseFloat(distEl.value);
      speedEl.value = !isNaN(d) && !isNaN(dist) && d > 0 ? String(round2((dist * 60) / d)) : "";
    };
    [durEl, distEl].forEach((el) => {
      el.addEventListener("input", () => {
        recomputeSpeed();
        updateBikeSummaryBar();
        scheduleBikeDraftSave();
      });
    });

    card.querySelector("[data-duplicate-block]").addEventListener("click", () => {
      const blocks = serializeBikeBlocksFromDOM();
      const index = blocks.findIndex((b) => b.id === card.dataset.id);
      if (index === -1) return;
      const clone = { ...blocks[index], id: uid() };
      blocks.splice(index + 1, 0, clone);
      bikeDraft.blocks = blocks;
      saveJSON(KEYS.bikeDraft, bikeDraft);
      renderBikeContent();
    });

    card.querySelector("[data-remove-block]").addEventListener("click", () => {
      const blocks = serializeBikeBlocksFromDOM();
      if (blocks.length <= 1) {
        const target = blocks.find((b) => b.id === card.dataset.id);
        target.label = "";
        target.duration = "";
        target.distance = "";
        target.speed = "";
        bikeDraft.blocks = blocks;
        saveJSON(KEYS.bikeDraft, bikeDraft);
        renderBikeContent();
        return;
      }
      bikeDraft.blocks = blocks.filter((b) => b.id !== card.dataset.id);
      saveJSON(KEYS.bikeDraft, bikeDraft);
      renderBikeContent();
    });

    card.querySelector("[data-drag-handle]").addEventListener("pointerdown", (e) => startDragBikeBlock(e, card));
  });

  document.getElementById("add-bike-block-btn").addEventListener("click", () => {
    const blocks = serializeBikeBlocksFromDOM();
    blocks.push(emptyBikeBlock());
    bikeDraft.blocks = blocks;
    saveJSON(KEYS.bikeDraft, bikeDraft);
    renderBikeContent();
  });

  document.getElementById("save-bike-session-btn").addEventListener("click", () => {
    const withData = serializeBikeBlocksFromDOM()
      .map((b) => ({ ...b, label: b.label.trim() }))
      .filter((b) => b.label || bikeBlockHasData(b));
    const blocks = withData.map((b, idx) => ({ ...b, label: b.label || `Bloc ${idx + 1}` }));

    const errorSlot = document.getElementById("bike-error-slot");
    if (blocks.length === 0) {
      errorSlot.innerHTML = `<div class="error-msg">Ajoute au moins un bloc avec des données avant d'enregistrer.</div>`;
      return;
    }
    errorSlot.innerHTML = "";

    const wasEditing = !!bikeEditingSessionId;
    const existingSession = wasEditing ? bikeSessions.find((s) => s.id === bikeEditingSessionId) : null;
    const planned = existingSession ? isUpcoming(existingSession) : dateEl.value > todayISO();
    const otherCount = bikeSessions.filter((s) => s.id !== bikeEditingSessionId).length;
    const sessionLabel = labelEl.value.trim() || `Séance ${otherCount + 1}`;
    const session = { id: bikeEditingSessionId || uid(), date: dateEl.value, label: sessionLabel, blocks, planned };
    if (wasEditing) {
      bikeSessions = bikeSessions.map((s) => (s.id === bikeEditingSessionId ? session : s));
    } else {
      bikeSessions = [session, ...bikeSessions];
    }
    bikeLibrary = Array.from(new Set([...bikeLibrary, ...blocks.map((b) => b.label)])).sort((a, b) => a.localeCompare(b));
    saveJSON(KEYS.bikeSessions, bikeSessions);
    saveJSON(KEYS.bikeLibrary, bikeLibrary);
    clearBikeDraft();

    renderBikeApp();
    document.getElementById("bike-flash-slot").innerHTML = `<div class="flash">${ICONS.check} ${wasEditing ? "Séance modifiée" : "Séance enregistrée"}</div>`;
    setTimeout(() => {
      const f = document.getElementById("bike-flash-slot");
      if (f) f.innerHTML = "";
    }, 1800);
  });
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
