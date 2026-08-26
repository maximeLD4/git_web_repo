function getBlockMode(b) {
  if (b.mode) return b.mode;
  return b.isInterval ? "interval" : "duration";
}
function blockHasData(b) {
  if (getBlockMode(b) === "interval") return !!(b.reps || b.repDistance || b.repDuration || b.pace || b.recovery);
  return !!(b.duration || b.distance || b.pace);
}
function formatBlockSummary(b) {
  if (getBlockMode(b) === "interval") {
    const reps = b.reps || "?";
    const distPart = b.repDistance ? `${b.repDistance}km` : b.repDuration ? `${b.repDuration}min` : "?";
    const pacePart = b.pace ? ` à ${formatPaceDisplay(b.pace)}` : "";
    const recoveryPart = b.recovery ? ` (récup ${b.recovery}min)` : "";
    return `${reps}×${distPart}${pacePart}${recoveryPart}`;
  }
  const parts = [];
  if (b.duration) parts.push(`${b.duration}min`);
  if (b.distance) parts.push(`${b.distance}km`);
  if (b.pace) parts.push(formatPaceDisplay(b.pace));
  return parts.length ? parts.join(" · ") : "—";
}
function computeIntervalTotal(b) {
  const reps = parseFloat(b.reps);
  const repDur = parseFloat(b.repDuration);
  const recovery = parseFloat(b.recovery) || 0;
  if (!reps || !repDur || isNaN(reps) || isNaN(repDur)) return null;
  return round2(reps * repDur + Math.max(0, reps - 1) * recovery);
}
function blockDistanceKm(b) {
  const reps = parseFloat(b.reps) || 0;
  if (getBlockMode(b) === "interval") {
    if (b.repDistance) return reps * parseFloat(b.repDistance);
    if (b.repDuration && b.pace) return reps * (parseFloat(b.repDuration) / parseFloat(b.pace));
    return 0;
  }
  if (b.distance) return parseFloat(b.distance);
  if (b.duration && b.pace) return parseFloat(b.duration) / parseFloat(b.pace);
  return 0;
}
function blockDurationMin(b) {
  if (getBlockMode(b) === "interval") {
    const total = computeIntervalTotal(b);
    if (total !== null) return total;
    const reps = parseFloat(b.reps) || 0;
    if (reps && b.repDistance && b.pace) {
      const repDur = parseFloat(b.repDistance) * parseFloat(b.pace);
      const recovery = parseFloat(b.recovery) || 0;
      return reps * repDur + Math.max(0, reps - 1) * recovery;
    }
    return 0;
  }
  if (b.duration) return parseFloat(b.duration);
  if (b.distance && b.pace) return parseFloat(b.distance) * parseFloat(b.pace);
  return 0;
}
function groupRunSessionsByWeek(sortedSessions) {
  const weeks = [];
  const index = {};
  for (const s of sortedSessions) {
    const weekStart = getMondayISO(s.date);
    if (!index[weekStart]) {
      const endDate = new Date(weekStart + "T00:00:00");
      endDate.setDate(endDate.getDate() + 6);
      index[weekStart] = { weekStart, weekEnd: endDate.toISOString().slice(0, 10), sessions: [] };
      weeks.push(index[weekStart]);
    }
    index[weekStart].sessions.push(s);
  }
  return weeks;
}
function computeTriangle(durationVal, distanceVal, paceVal) {
  const d = parseFloat(durationVal), dist = parseFloat(distanceVal), p = parseFloat(paceVal);
  const dOk = durationVal !== "" && durationVal != null && !isNaN(d);
  const distOk = distanceVal !== "" && distanceVal != null && !isNaN(dist) && dist > 0;
  const pOk = paceVal !== "" && paceVal != null && !isNaN(p) && p > 0;
  const result = { duration: durationVal, distance: distanceVal, pace: paceVal };
  if (dOk && distOk && !pOk) result.pace = String(round2(d / dist));
  else if (dOk && pOk && !distOk) result.distance = String(round2(d / p));
  else if (distOk && pOk && !dOk) result.duration = String(round2(dist * p));
  return result;
}

/* ---------- run app: draft helpers ---------- */
function getPaceDecimalFromCard(card) {
  const minEl = card.querySelector(".block-pace-min");
  const secEl = card.querySelector(".block-pace-sec");
  if (!minEl || !secEl) return "";
  const min = minEl.value === "" ? null : parseFloat(minEl.value);
  const sec = secEl.value === "" ? null : parseFloat(secEl.value);
  if (min === null && sec === null) return "";
  const totalMin = (min || 0) + (sec || 0) / 60;
  return totalMin > 0 ? String(totalMin) : "";
}
function setPaceFieldsOnCard(card, decimalStr) {
  const minEl = card.querySelector(".block-pace-min");
  const secEl = card.querySelector(".block-pace-sec");
  if (!minEl || !secEl || decimalStr === "" || decimalStr == null) return;
  const { min, sec } = splitPaceForDisplay(decimalStr);
  minEl.value = min;
  secEl.value = sec;
}

function serializeBlocksFromDOM() {
  const cards = document.querySelectorAll("#blocks-container .exercise-card");
  const result = [];
  cards.forEach((card) => {
    const id = card.dataset.id;
    const mode = card.dataset.mode || "duration";
    const label = card.querySelector(".ex-name-input").value;
    const block = { id, label, mode, duration: "", distance: "", pace: "", reps: "", repDistance: "", repDuration: "", recovery: "" };
    block.pace = getPaceDecimalFromCard(card);
    if (mode === "interval") {
      block.reps = card.querySelector(".block-reps").value;
      block.repDistance = card.querySelector(".block-repdistance").value;
      block.repDuration = card.querySelector(".block-repduration").value;
      block.recovery = card.querySelector(".block-recovery").value;
    } else {
      block.duration = card.querySelector(".block-duration").value;
      block.distance = card.querySelector(".block-distance").value;
    }
    result.push(block);
  });
  return result;
}

function scheduleRunDraftSave() {
  clearTimeout(runDraftSaveTimer);
  runDraftSaveTimer = setTimeout(() => {
    const dateEl = document.getElementById("run-date");
    const labelEl = document.getElementById("run-label");
    runDraft = {
      date: dateEl ? dateEl.value : runDraft.date,
      label: labelEl ? labelEl.value : runDraft.label,
      blocks: serializeBlocksFromDOM(),
      editingSessionId: runEditingSessionId,
    };
    saveJSON(KEYS.runDraft, runDraft);
  }, 350);
}

function clearRunDraft() {
  runDraft = { date: todayISO(), label: "", blocks: [emptyBlock()] };
  runEditingSessionId = null;
  saveJSON(KEYS.runDraft, runDraft);
}

function startEditRunSession(session) {
  runEditingSessionId = session.id;
  runDraft = {
    date: session.date,
    label: session.label || "",
    blocks: JSON.parse(JSON.stringify(session.blocks)),
    editingSessionId: runEditingSessionId,
  };
  saveJSON(KEYS.runDraft, runDraft);
  runTab = "log";
  renderRunApp();
}

function duplicateRunSession(session) {
  const clonedBlocks = JSON.parse(JSON.stringify(session.blocks)).map((b) => ({ ...b, id: uid() }));
  runEditingSessionId = null;
  runDraft = { date: todayISO(), label: session.label || "", blocks: clonedBlocks, editingSessionId: null };
  saveJSON(KEYS.runDraft, runDraft);
  runTab = "log";
  renderRunApp();
}

function renderRunApp() {
  app.className = "theme-run";
  app.innerHTML = `
    <div class="header">
      <button type="button" class="back-btn" data-go-home>${ICONS.back}</button>
      <div class="header-icon-only">${ICONS.stopwatch}</div>
      <div class="header-sub">${runSessions.length} séance${runSessions.length !== 1 ? "s" : ""} enregistrée${runSessions.length !== 1 ? "s" : ""}</div>
    </div>
    <div class="content" id="content"></div>
    <div class="tabbar">
      <button class="tab-btn ${runTab === "log" ? "active" : ""}" data-run-tab="log">${ICONS.stopwatch}Créer</button>
      <button class="tab-btn ${runTab === "history" ? "active" : ""}" data-run-tab="history">${ICONS.history}Séances</button>
    </div>
  `;
  document.querySelector("[data-go-home]").addEventListener("click", goHome);
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      runTab = btn.dataset.runTab;
      renderRunApp();
    });
  });
  renderRunContent();
}

function renderRunContent() {
  const content = document.getElementById("content");
  if (runTab === "log") content.innerHTML = runLogTabHTML();
  else content.innerHTML = runHistoryTabHTML();
  attachRunContentListeners();
}
function computeSessionTotals(blocks) {
  let km = 0, min = 0;
  blocks.forEach((b) => {
    km += blockDistanceKm(b);
    min += blockDurationMin(b);
  });
  const pace = km > 0 ? min / km : null;
  return { km, min, pace };
}
function formatSessionTotalsLine(blocks) {
  const t = computeSessionTotals(blocks);
  const kmPart = t.km > 0 ? `${Math.round(t.km * 10) / 10} km` : "0 km";
  const minPart = formatDurationMin(t.min);
  const pacePart = t.pace ? formatPaceDisplay(String(t.pace)) : "—";
  return `${kmPart} · ${minPart} · ${pacePart}`;
}

function blockCardHTML(b) {
  const mode = getBlockMode(b);
  const isInterval = mode === "interval";
  const total = isInterval ? computeIntervalTotal(b) : null;
  const paceFieldHTML = `
      <div class="field">
        <label>Allure (min/km)</label>
        <div class="pace-input-group">
          <input class="block-pace-min" type="number" inputmode="numeric" placeholder="min" value="${splitPaceForDisplay(b.pace).min}">
          <span class="pace-sep">'</span>
          <input class="block-pace-sec" type="number" inputmode="numeric" placeholder="sec" min="0" max="59" value="${splitPaceForDisplay(b.pace).sec}">
          <span class="pace-sep">"</span>
        </div>
      </div>`;
  const fieldsHTML = isInterval
    ? `
    <div class="block-fields-row">
      <div class="field"><label>Répétitions</label><input class="block-reps" type="number" inputmode="numeric" placeholder="ex. 8" value="${b.reps}"></div>
      <div class="field"><label>Distance/rép (km)</label><input class="block-repdistance" type="number" inputmode="decimal" placeholder="ex. 0.4" value="${b.repDistance}"></div>
      <div class="field"><label>Durée/rép (min)</label><input class="block-repduration" type="number" inputmode="decimal" placeholder="ex. 1.5" value="${b.repDuration}"></div>
    </div>
    <div class="block-fields-row">
      ${paceFieldHTML}
      <div class="field"><label>Récup. entre rép. (min)</label><input class="block-recovery" type="number" inputmode="decimal" placeholder="ex. 1" value="${b.recovery}"></div>
    </div>
    <div class="block-total-hint" data-total-hint>${total !== null ? `Durée totale estimée : ≈ ${total} min` : ""}</div>`
    : `
    <div class="block-fields-row">
      <div class="field"><label>Durée (min)</label><input class="block-duration" type="number" inputmode="decimal" placeholder="ex. 30" value="${b.duration}" ${mode === "distance" ? "disabled" : ""}></div>
      <div class="field"><label>Distance (km)</label><input class="block-distance" type="number" inputmode="decimal" placeholder="ex. 5" value="${b.distance}" ${mode === "duration" ? "disabled" : ""}></div>
      ${paceFieldHTML}
    </div>
    <div class="block-mode-hint">${mode === "duration" ? "Distance calculée automatiquement à partir de la durée et de l'allure." : "Durée calculée automatiquement à partir de la distance et de l'allure."}</div>`;

  return `
  <div class="exercise-card" data-id="${b.id}" data-mode="${mode}">
    <div class="exercise-head">
      <button type="button" class="drag-handle" data-drag-handle aria-label="Réordonner">${ICONS.grip}</button>
      <input class="ex-name-input" type="text" placeholder="Nom du bloc (optionnel)" list="block-suggestions" value="${b.label.replace(/"/g, "&quot;")}">
      <button type="button" class="icon-btn" data-duplicate-block="${b.id}" aria-label="Dupliquer le bloc">${ICONS.duplicate}</button>
      <button class="icon-btn" data-remove-block="${b.id}">${ICONS.x}</button>
    </div>
    <div class="ex-type-toggle">
      <button type="button" class="ex-type-btn ${mode === "duration" ? "active" : ""}" data-block-type="duration">Durée</button>
      <button type="button" class="ex-type-btn ${mode === "distance" ? "active" : ""}" data-block-type="distance">Distance</button>
      <button type="button" class="ex-type-btn ${isInterval ? "active" : ""}" data-block-type="interval">Fractionné</button>
    </div>
    ${fieldsHTML}
  </div>`;
}

function runLogTabHTML() {
  const blocksHTML = runDraft.blocks.map(blockCardHTML).join("");
  const libOptions = runLibrary.map((n) => `<option value="${n.replace(/"/g, "&quot;")}">`).join("");
  const editBanner = runEditingSessionId
    ? `<div class="edit-banner">Modification d'une séance existante<button type="button" id="run-cancel-edit-btn">Annuler</button></div>`
    : "";
  return `
    <div class="backup-row">
      <button class="backup-btn" id="run-import-draft-btn">${ICONS.down} Importer une séance</button>
      <button class="backup-btn" id="run-reset-draft-btn">${ICONS.reset} Réinitialiser</button>
      <input type="file" id="run-import-draft-file" accept="application/json" style="display:none">
    </div>
    ${editBanner}
    <div class="field-row">
      <div class="field"><label>Date</label><input type="date" id="run-date" value="${runDraft.date}"></div>
      <div class="field"><label>Séance</label><input type="text" id="run-label" placeholder="Sortie longue, fractionné 10x400… (optionnel)" value="${(runDraft.label || "").replace(/"/g, "&quot;")}"></div>
    </div>
    <div class="run-summary-bar" id="run-summary-bar">${formatSessionTotalsLine(runDraft.blocks)}</div>
    <div id="blocks-container">${blocksHTML}</div>
    <datalist id="block-suggestions"><option value="Échauffement"><option value="Endurance fondamentale"><option value="Fractionné"><option value="Récupération"><option value="Retour au calme">${libOptions}</datalist>
    <button class="add-exercise-btn" id="add-block-btn">${ICONS.plus} Ajouter un bloc</button>
    <div id="run-error-slot"></div>
    <button class="save-btn" id="save-run-session-btn">${ICONS.check} ${runEditingSessionId ? "Enregistrer les modifications" : "Enregistrer la séance"}</button>
    <div id="run-flash-slot"></div>
  `;
}

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

function startDragBlock(e, card) {
  startDragItem(e, card, document.getElementById("blocks-container"), () => {
    runDraft.blocks = serializeBlocksFromDOM();
    saveJSON(KEYS.runDraft, runDraft);
  });
}

/* ---------- run app: listeners ---------- */
function attachRunContentListeners() {
  if (runTab === "log") attachRunLogListeners();
  else attachRunHistoryListeners();
}

function normalizePaceFields(card) {
  const minEl = card.querySelector(".block-pace-min");
  const secEl = card.querySelector(".block-pace-sec");
  if (!minEl || !secEl) return;
  const sec = parseFloat(secEl.value);
  if (!isNaN(sec) && sec >= 60) {
    const min = parseFloat(minEl.value) || 0;
    const extraMin = Math.floor(sec / 60);
    minEl.value = String(min + extraMin);
    secEl.value = String(sec % 60);
  }
}

function applyTriangle(card, durSel, distSel) {
  const durEl = card.querySelector(durSel);
  const distEl = card.querySelector(distSel);
  normalizePaceFields(card);
  const currentPace = getPaceDecimalFromCard(card);
  const result = computeTriangle(durEl.value, distEl.value, currentPace);
  if (result.duration !== durEl.value) durEl.value = result.duration;
  if (result.distance !== distEl.value) distEl.value = result.distance;
  if (result.pace !== currentPace && result.pace !== "") setPaceFieldsOnCard(card, result.pace);
}

function updateRunSummaryBar() {
  const bar = document.getElementById("run-summary-bar");
  if (!bar) return;
  bar.innerHTML = formatSessionTotalsLine(serializeBlocksFromDOM());
}

function attachRunLogListeners() {
  const dateEl = document.getElementById("run-date");
  const labelEl = document.getElementById("run-label");
  dateEl.addEventListener("input", scheduleRunDraftSave);
  labelEl.addEventListener("input", scheduleRunDraftSave);

  const importDraftBtn = document.getElementById("run-import-draft-btn");
  const importDraftFile = document.getElementById("run-import-draft-file");
  importDraftBtn.addEventListener("click", () => importDraftFile.click());

  attachArmedConfirmButton(
    document.getElementById("run-reset-draft-btn"),
    `${ICONS.reset} Réinitialiser`,
    `${ICONS.reset} Confirmer ?`,
    () => {
      clearRunDraft();
      renderRunContent();
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
      const result = validateSingleSessionForSection(data, "run");
      if (!result.ok) {
        showAlert(result.message);
        importDraftFile.value = "";
        return;
      }
      showConfirm(
        `Charger cette séance (${formatDateFR(result.session.date)}) dans le formulaire ? Cela remplacera ce que tu es en train de saisir.`,
        () => {
          const s = result.session;
          runDraft = {
            date: s.date,
            label: s.label || "",
            blocks: JSON.parse(JSON.stringify(s.blocks)).map((b) => ({ ...b, id: uid() })),
            editingSessionId: null,
          };
          runEditingSessionId = null;
          saveJSON(KEYS.runDraft, runDraft);
          renderRunContent();
        },
        { confirmLabel: "Charger" }
      );
      importDraftFile.value = "";
    };
    reader.readAsText(file);
  });

  const cancelEditBtn = document.getElementById("run-cancel-edit-btn");
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      clearRunDraft();
      renderRunContent();
    });
  }

  document.querySelectorAll("#blocks-container .exercise-card").forEach((card) => {
    const mode = card.dataset.mode || "duration";
    const isInterval = mode === "interval";
    const labelInput = card.querySelector(".ex-name-input");
    labelInput.addEventListener("input", scheduleRunDraftSave);
    const paceMinEl = card.querySelector(".block-pace-min");
    const paceSecEl = card.querySelector(".block-pace-sec");

    if (isInterval) {
      const repsEl = card.querySelector(".block-reps");
      const repDistEl = card.querySelector(".block-repdistance");
      const repDurEl = card.querySelector(".block-repduration");
      const recoveryEl = card.querySelector(".block-recovery");
      const totalHint = card.querySelector("[data-total-hint]");

      const updateTotal = () => {
        const total = computeIntervalTotal({ reps: repsEl.value, repDuration: repDurEl.value, recovery: recoveryEl.value });
        totalHint.textContent = total !== null ? `Durée totale estimée : ≈ ${total} min` : "";
      };
      [repDistEl, repDurEl, paceMinEl, paceSecEl].forEach((el) => {
        el.addEventListener("input", () => {
          applyTriangle(card, ".block-repduration", ".block-repdistance");
          updateTotal();
          updateRunSummaryBar();
          scheduleRunDraftSave();
        });
      });
      [repsEl, recoveryEl].forEach((el) => {
        el.addEventListener("input", () => {
          updateTotal();
          updateRunSummaryBar();
          scheduleRunDraftSave();
        });
      });
    } else {
      const durEl = card.querySelector(".block-duration");
      const distEl = card.querySelector(".block-distance");
      const recompute = () => {
        normalizePaceFields(card);
        const paceDecimal = getPaceDecimalFromCard(card);
        const p = parseFloat(paceDecimal);
        if (mode === "duration") {
          const d = parseFloat(durEl.value);
          distEl.value = !isNaN(d) && !isNaN(p) && p > 0 ? String(round2(d / p)) : "";
        } else {
          const dist = parseFloat(distEl.value);
          durEl.value = !isNaN(dist) && !isNaN(p) && p > 0 ? String(round2(dist * p)) : "";
        }
      };
      const sourceInputs = mode === "duration" ? [durEl, paceMinEl, paceSecEl] : [distEl, paceMinEl, paceSecEl];
      sourceInputs.forEach((el) => {
        el.addEventListener("input", () => {
          recompute();
          updateRunSummaryBar();
          scheduleRunDraftSave();
        });
      });
    }

    card.querySelector("[data-duplicate-block]").addEventListener("click", () => {
      const blocks = serializeBlocksFromDOM();
      const index = blocks.findIndex((b) => b.id === card.dataset.id);
      if (index === -1) return;
      const clone = { ...blocks[index], id: uid() };
      blocks.splice(index + 1, 0, clone);
      runDraft.blocks = blocks;
      saveJSON(KEYS.runDraft, runDraft);
      renderRunContent();
    });

    card.querySelector("[data-remove-block]").addEventListener("click", () => {
      const blocks = serializeBlocksFromDOM();
      if (blocks.length <= 1) {
        const target = blocks.find((b) => b.id === card.dataset.id);
        target.label = "";
        target.duration = "";
        target.distance = "";
        target.pace = "";
        target.reps = "";
        target.repDistance = "";
        target.repDuration = "";
        target.recovery = "";
        runDraft.blocks = blocks;
        saveJSON(KEYS.runDraft, runDraft);
        renderRunContent();
        return;
      }
      runDraft.blocks = blocks.filter((b) => b.id !== card.dataset.id);
      saveJSON(KEYS.runDraft, runDraft);
      renderRunContent();
    });

    card.querySelectorAll("[data-block-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const newMode = btn.dataset.blockType;
        if (card.dataset.mode === newMode) return;
        const blocks = serializeBlocksFromDOM();
        const target = blocks.find((b) => b.id === card.dataset.id);
        target.mode = newMode;
        runDraft.blocks = blocks;
        saveJSON(KEYS.runDraft, runDraft);
        renderRunContent();
      });
    });

    card.querySelector("[data-drag-handle]").addEventListener("pointerdown", (e) => startDragBlock(e, card));
  });

  document.getElementById("add-block-btn").addEventListener("click", () => {
    const blocks = serializeBlocksFromDOM();
    blocks.push(emptyBlock());
    runDraft.blocks = blocks;
    saveJSON(KEYS.runDraft, runDraft);
    renderRunContent();
  });

  document.getElementById("save-run-session-btn").addEventListener("click", () => {
    const withData = serializeBlocksFromDOM()
      .map((b) => ({ ...b, label: b.label.trim() }))
      .filter((b) => b.label || blockHasData(b));
    const blocks = withData.map((b, idx) => ({ ...b, label: b.label || `Bloc ${idx + 1}` }));

    const errorSlot = document.getElementById("run-error-slot");
    if (blocks.length === 0) {
      errorSlot.innerHTML = `<div class="error-msg">Ajoute au moins un bloc avec des données avant d'enregistrer.</div>`;
      return;
    }
    errorSlot.innerHTML = "";

    const wasEditing = !!runEditingSessionId;
    const existingSession = wasEditing ? runSessions.find((s) => s.id === runEditingSessionId) : null;
    const planned = existingSession ? isUpcoming(existingSession) : dateEl.value > todayISO();
    const otherRunCount = runSessions.filter((s) => s.id !== runEditingSessionId).length;
    const sessionLabel = labelEl.value.trim() || `Séance ${otherRunCount + 1}`;
    const session = { id: runEditingSessionId || uid(), date: dateEl.value, label: sessionLabel, blocks, planned };
    if (wasEditing) {
      runSessions = runSessions.map((s) => (s.id === runEditingSessionId ? session : s));
    } else {
      runSessions = [session, ...runSessions];
    }
    runLibrary = Array.from(new Set([...runLibrary, ...blocks.map((b) => b.label)])).sort((a, b) => a.localeCompare(b));
    saveJSON(KEYS.runSessions, runSessions);
    saveJSON(KEYS.runLibrary, runLibrary);
    clearRunDraft();

    renderRunApp();
    document.getElementById("run-flash-slot").innerHTML = `<div class="flash">${ICONS.check} ${wasEditing ? "Séance modifiée" : "Séance enregistrée"}</div>`;
    setTimeout(() => {
      const f = document.getElementById("run-flash-slot");
      if (f) f.innerHTML = "";
    }, 1800);
  });
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
