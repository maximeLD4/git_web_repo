function computeSwimTriangle(durationVal, distanceVal, paceVal) {
  const d = parseFloat(durationVal), dist = parseFloat(distanceVal), p = parseFloat(paceVal);
  const dOk = durationVal !== "" && !isNaN(d);
  const distOk = distanceVal !== "" && !isNaN(dist) && dist > 0;
  const pOk = paceVal !== "" && !isNaN(p) && p > 0;
  const result = { duration: durationVal, distance: distanceVal, pace: paceVal };
  if (dOk && distOk && !pOk) result.pace = String(round2((d * 100) / dist));
  else if (dOk && pOk && !distOk) result.distance = String(round2((d * 100) / p));
  else if (distOk && pOk && !dOk) result.duration = String(round2((p * dist) / 100));
  return result;
}
function formatSwimPaceDisplay(paceStr) {
  const val = parseFloat(paceStr);
  if (!paceStr || isNaN(val) || val <= 0) return null;
  const { min, sec } = splitPaceForDisplay(paceStr);
  return `${min}'${String(sec).padStart(2, "0")}"/100m`;
}
function swimBlockDistanceM(b) {
  if (b.mode === "pool") {
    const poolLength = parseFloat(b.poolLength) || 0;
    const lengths = parseFloat(b.lengths) || 0;
    return poolLength && lengths ? poolLength * lengths : 0;
  }
  if (b.distance) return parseFloat(b.distance);
  if (b.duration && b.pace) return (parseFloat(b.duration) * 100) / parseFloat(b.pace);
  return 0;
}
function swimBlockDurationMin(b) {
  if (b.mode === "pool") {
    if (b.duration) return parseFloat(b.duration);
    const dist = swimBlockDistanceM(b);
    if (dist && b.pace) return (parseFloat(b.pace) * dist) / 100;
    return 0;
  }
  if (b.duration) return parseFloat(b.duration);
  if (b.distance && b.pace) return (parseFloat(b.pace) * parseFloat(b.distance)) / 100;
  return 0;
}
function swimBlockHasData(b) {
  if (b.mode === "pool") return !!(b.poolLength || b.lengths || b.stroke || b.duration);
  return !!(b.duration || b.distance || b.pace);
}
function formatSwimBlockSummary(b) {
  if (b.mode === "pool") {
    const poolLength = b.poolLength || "?";
    const lengths = b.lengths || "?";
    const dist = swimBlockDistanceM(b);
    const strokePart = b.stroke ? ` ${b.stroke}` : "";
    const distPart = dist ? ` (${Math.round(dist)}m)` : "";
    return `${lengths}×${poolLength}m${strokePart}${distPart}`;
  }
  const parts = [];
  if (b.duration) parts.push(`${b.duration}min`);
  if (b.distance) parts.push(`${b.distance}m`);
  if (b.pace) {
    const p = formatSwimPaceDisplay(b.pace);
    if (p) parts.push(p);
  }
  return parts.length ? parts.join(" · ") : "—";
}
function computeSwimSessionTotals(blocks) {
  let m = 0, min = 0;
  blocks.forEach((b) => {
    m += swimBlockDistanceM(b);
    min += swimBlockDurationMin(b);
  });
  const pace = m > 0 ? (min * 100) / m : null;
  return { m, min, pace };
}
function formatSwimSessionTotalsLine(blocks) {
  const t = computeSwimSessionTotals(blocks);
  const distPart = t.m > 0 ? `${Math.round(t.m)} m` : "0 m";
  const minPart = formatDurationMin(t.min);
  const pacePart = t.pace ? formatSwimPaceDisplay(String(t.pace)) || "—" : "—";
  return `${distPart} · ${minPart} · ${pacePart}`;
}

/* ---------- swim: draft helpers ---------- */
function serializeSwimBlocksFromDOM() {
  const cards = document.querySelectorAll("#swim-blocks-container .exercise-card");
  const result = [];
  cards.forEach((card) => {
    const id = card.dataset.id;
    const mode = card.dataset.mode || "duration";
    const label = card.querySelector(".ex-name-input").value;
    const block = { id, label, mode, duration: "", distance: "", pace: "", poolLength: "", lengths: "", stroke: "" };
    block.pace = getPaceDecimalFromCard(card);
    if (mode === "pool") {
      block.poolLength = card.querySelector(".swim-block-poollength").value;
      block.lengths = card.querySelector(".swim-block-lengths").value;
      block.stroke = card.querySelector(".swim-block-stroke").value;
      block.duration = card.querySelector(".swim-block-duration").value;
    } else {
      block.duration = card.querySelector(".swim-block-duration").value;
      block.distance = card.querySelector(".swim-block-distance").value;
    }
    result.push(block);
  });
  return result;
}

function scheduleSwimDraftSave() {
  clearTimeout(swimDraftSaveTimer);
  swimDraftSaveTimer = setTimeout(() => {
    const dateEl = document.getElementById("swim-date");
    const labelEl = document.getElementById("swim-label");
    swimDraft = {
      date: dateEl ? dateEl.value : swimDraft.date,
      label: labelEl ? labelEl.value : swimDraft.label,
      blocks: serializeSwimBlocksFromDOM(),
      editingSessionId: swimEditingSessionId,
    };
    saveJSON(KEYS.swimDraft, swimDraft);
  }, 350);
}

function clearSwimDraft() {
  swimDraft = { date: todayISO(), label: "", blocks: [emptySwimBlock()] };
  swimEditingSessionId = null;
  saveJSON(KEYS.swimDraft, swimDraft);
}

function startEditSwimSession(session) {
  swimEditingSessionId = session.id;
  swimDraft = {
    date: session.date,
    label: session.label || "",
    blocks: JSON.parse(JSON.stringify(session.blocks)),
    editingSessionId: swimEditingSessionId,
  };
  saveJSON(KEYS.swimDraft, swimDraft);
  swimTab = "log";
  renderSwimApp();
}

function duplicateSwimSession(session) {
  const clonedBlocks = JSON.parse(JSON.stringify(session.blocks)).map((b) => ({ ...b, id: uid() }));
  swimEditingSessionId = null;
  swimDraft = { date: todayISO(), label: session.label || "", blocks: clonedBlocks, editingSessionId: null };
  saveJSON(KEYS.swimDraft, swimDraft);
  swimTab = "log";
  renderSwimApp();
}

function renderSwimApp() {
  app.className = "theme-swim";
  app.innerHTML = `
    <div class="header">
      <div class="header-title"><button type="button" class="back-btn" data-go-home>${ICONS.back}</button><span class="header-icon">${ICONS.swim}</span>Natation</div>
      <div class="header-sub">${swimSessions.length} séance${swimSessions.length !== 1 ? "s" : ""} enregistrée${swimSessions.length !== 1 ? "s" : ""}</div>
    </div>
    <div class="content" id="content"></div>
    <div class="tabbar">
      <button class="tab-btn ${swimTab === "log" ? "active" : ""}" data-swim-tab="log">${ICONS.swim}Créer</button>
      <button class="tab-btn ${swimTab === "history" ? "active" : ""}" data-swim-tab="history">${ICONS.history}Séances</button>
    </div>
  `;
  document.querySelector("[data-go-home]").addEventListener("click", goHome);
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      swimTab = btn.dataset.swimTab;
      renderSwimApp();
    });
  });
  renderSwimContent();
}

function renderSwimContent() {
  const content = document.getElementById("content");
  if (swimTab === "log") content.innerHTML = swimLogTabHTML();
  else content.innerHTML = swimHistoryTabHTML();
  attachSwimContentListeners();
}

function swimBlockCardHTML(b) {
  const mode = b.mode === "pool" ? "pool" : "both";
  const isPool = mode === "pool";
  const paceFieldHTML = `
      <div class="field">
        <label>Allure (min/100m)</label>
        <div class="pace-input-group">
          <input class="block-pace-min" type="number" inputmode="numeric" placeholder="min" value="${splitPaceForDisplay(b.pace).min}" disabled>
          <span class="pace-sep">'</span>
          <input class="block-pace-sec" type="number" inputmode="numeric" placeholder="sec" min="0" max="59" value="${splitPaceForDisplay(b.pace).sec}" disabled>
          <span class="pace-sep">"</span>
        </div>
      </div>`;

  let fieldsHTML;
  if (isPool) {
    const dist = swimBlockDistanceM(b);
    const durVal = parseFloat(b.duration);
    const hintParts = [];
    if (dist) hintParts.push(`${Math.round(dist)} m`);
    if (dist && !isNaN(durVal) && durVal > 0) {
      const paceDisp = formatSwimPaceDisplay(String((durVal * 100) / dist));
      if (paceDisp) hintParts.push(paceDisp);
    }
    fieldsHTML = `
    <div class="block-fields-row">
      <div class="field"><label>Taille du bassin (m)</label><input class="swim-block-poollength" type="number" inputmode="decimal" placeholder="ex. 25" value="${b.poolLength}"></div>
      <div class="field"><label>Longueurs</label><input class="swim-block-lengths" type="number" inputmode="numeric" placeholder="ex. 20" value="${b.lengths}"></div>
    </div>
    <div class="block-fields-row">
      <div class="field"><label>Nage</label><input class="swim-block-stroke" type="text" list="swim-stroke-suggestions" placeholder="Crawl, dos, brasse…" value="${(b.stroke || "").replace(/"/g, "&quot;")}"></div>
      <div class="field"><label>Durée (min, optionnel)</label><input class="swim-block-duration" type="number" inputmode="decimal" placeholder="ex. 25" value="${b.duration}"></div>
    </div>
    <div class="block-total-hint" data-total-hint>${hintParts.length ? `Distance totale : ${hintParts.join(" · ")}` : ""}</div>`;
  } else {
    fieldsHTML = `
    <div class="block-fields-row">
      <div class="field"><label>Durée (min)</label><input class="swim-block-duration" type="number" inputmode="decimal" placeholder="ex. 20" value="${b.duration}"></div>
      <div class="field"><label>Distance (m)</label><input class="swim-block-distance" type="number" inputmode="decimal" placeholder="ex. 1000" value="${b.distance}"></div>
      ${paceFieldHTML}
    </div>
    <div class="block-mode-hint">Allure calculée automatiquement à partir de la durée et de la distance.</div>`;
  }

  return `
  <div class="exercise-card" data-id="${b.id}" data-mode="${mode}">
    <div class="exercise-head">
      <button type="button" class="drag-handle" data-drag-handle aria-label="Réordonner">${ICONS.grip}</button>
      <input class="ex-name-input" type="text" placeholder="Nom du bloc (optionnel)" list="swim-block-suggestions" value="${b.label.replace(/"/g, "&quot;")}">
      <button type="button" class="icon-btn" data-duplicate-block="${b.id}" aria-label="Dupliquer le bloc">${ICONS.duplicate}</button>
      <button class="icon-btn" data-remove-block="${b.id}">${ICONS.x}</button>
    </div>
    <div class="ex-type-toggle">
      <button type="button" class="ex-type-btn ${!isPool ? "active" : ""}" data-block-type="both">Distance + Durée</button>
      <button type="button" class="ex-type-btn ${isPool ? "active" : ""}" data-block-type="pool">Bassin</button>
    </div>
    ${fieldsHTML}
  </div>`;
}

function swimLogTabHTML() {
  const blocksHTML = swimDraft.blocks.map(swimBlockCardHTML).join("");
  const libOptions = swimLibrary.map((n) => `<option value="${n.replace(/"/g, "&quot;")}">`).join("");
  const editBanner = swimEditingSessionId
    ? `<div class="edit-banner">Modification d'une séance existante<button type="button" id="swim-cancel-edit-btn">Annuler</button></div>`
    : "";
  return `
    <div class="backup-row">
      <button class="backup-btn" id="swim-import-draft-btn">${ICONS.down} Importer une séance</button>
      <button class="backup-btn" id="swim-reset-draft-btn">${ICONS.reset} Réinitialiser</button>
      <input type="file" id="swim-import-draft-file" accept="application/json" style="display:none">
    </div>
    ${editBanner}
    <div class="field-row">
      <div class="field"><label>Date</label><input type="date" id="swim-date" value="${swimDraft.date}"></div>
      <div class="field"><label>Séance</label><input type="text" id="swim-label" placeholder="Séance technique, endurance… (optionnel)" value="${(swimDraft.label || "").replace(/"/g, "&quot;")}"></div>
    </div>
    <div class="run-summary-bar" id="swim-summary-bar">${formatSwimSessionTotalsLine(swimDraft.blocks)}</div>
    <div id="swim-blocks-container">${blocksHTML}</div>
    <datalist id="swim-block-suggestions"><option value="Échauffement"><option value="Technique"><option value="Endurance"><option value="Récupération">${libOptions}</datalist>
    <datalist id="swim-stroke-suggestions"><option value="Crawl"><option value="Dos"><option value="Brasse"><option value="Papillon"><option value="4 nages"></datalist>
    <button class="add-exercise-btn" id="add-swim-block-btn">${ICONS.plus} Ajouter un bloc</button>
    <div id="swim-error-slot"></div>
    <button class="save-btn" id="save-swim-session-btn">${ICONS.check} ${swimEditingSessionId ? "Enregistrer les modifications" : "Enregistrer la séance"}</button>
    <div id="swim-flash-slot"></div>
  `;
}

function swimSessionCardHTML(s) {
  const open = !!openSwimHistoryIds[s.id];
  const upcoming = isUpcoming(s);
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
  <div class="history-card ${upcoming ? "upcoming" : ""}">
    <div class="history-head" data-swim-toggle="${s.id}">
      <div class="history-head-left">
        <div class="history-date">${formatDateFR(s.date)}${upcoming ? '<span class="upcoming-badge">À venir</span>' : ""}</div>
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
             ${upcoming ? `<button class="edit-link" data-swim-mark-done-session="${s.id}">${ICONS.check} Marquer comme faite</button>` : ""}
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
  const showFuture = swimCalendarTimeFilter === "future";
  const sessionDates = new Set(swimSessions.filter((s) => isUpcoming(s) === showFuture).map((s) => s.date));
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
        ${hasData ? `<span class="${showFuture ? "cal-dot-hollow" : "cal-dot"}"></span>` : ""}
      </button>`);
  }

  let selectedHTML = "";
  if (swimSelectedCalendarDate) {
    const daySessions = swimSessions.filter((s) => s.date === swimSelectedCalendarDate && isUpcoming(s) === showFuture);
    selectedHTML =
      daySessions.length > 0
        ? `<div class="cal-selected-label">${formatDateFR(swimSelectedCalendarDate)}</div>${daySessions.map(swimSessionCardHTML).join("")}`
        : `<div class="empty-state" style="padding: 30px 20px;">Aucune séance ${showFuture ? "prévue" : "effectuée"} ce jour-là.</div>`;
  }

  return `
    ${timeFilterToggleHTML(showFuture, "swim-time-filter")}
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
  const upcoming = sorted.filter((s) => isUpcoming(s)).sort((a, b) => (a.date > b.date ? 1 : -1));
  const past = sorted.filter((s) => !isUpcoming(s));
  const showHeadings = upcoming.length > 0 && past.length > 0;
  const upcomingHTML = upcoming.length > 0 ? (showHeadings ? `<div class="session-group-heading">À venir</div>` : "") + upcoming.map(swimSessionCardHTML).join("") : "";
  const pastHTML = past.length > 0 ? (showHeadings ? `<div class="session-group-heading">Effectuées</div>` : "") + past.map(swimSessionCardHTML).join("") : "";
  return backup + viewToggle + upcomingHTML + pastHTML;
}

function startDragSwimBlock(e, card) {
  startDragItem(e, card, document.getElementById("swim-blocks-container"), () => {
    swimDraft.blocks = serializeSwimBlocksFromDOM();
    saveJSON(KEYS.swimDraft, swimDraft);
  });
}

/* ---------- swim app: listeners ---------- */
function attachSwimContentListeners() {
  if (swimTab === "log") attachSwimLogListeners();
  else attachSwimHistoryListeners();
}

function updateSwimSummaryBar() {
  const bar = document.getElementById("swim-summary-bar");
  if (!bar) return;
  bar.innerHTML = formatSwimSessionTotalsLine(serializeSwimBlocksFromDOM());
}

function attachSwimLogListeners() {
  const dateEl = document.getElementById("swim-date");
  const labelEl = document.getElementById("swim-label");
  dateEl.addEventListener("input", scheduleSwimDraftSave);
  labelEl.addEventListener("input", scheduleSwimDraftSave);

  const importDraftBtn = document.getElementById("swim-import-draft-btn");
  const importDraftFile = document.getElementById("swim-import-draft-file");
  importDraftBtn.addEventListener("click", () => importDraftFile.click());

  attachArmedConfirmButton(
    document.getElementById("swim-reset-draft-btn"),
    `${ICONS.reset} Réinitialiser`,
    `${ICONS.reset} Confirmer ?`,
    () => {
      clearSwimDraft();
      renderSwimContent();
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
      const result = validateSingleSessionForSection(data, "swim");
      if (!result.ok) {
        showAlert(result.message);
        importDraftFile.value = "";
        return;
      }
      showConfirm(
        `Charger cette séance (${formatDateFR(result.session.date)}) dans le formulaire ? Cela remplacera ce que tu es en train de saisir.`,
        () => {
          const s = result.session;
          swimDraft = {
            date: s.date,
            label: s.label || "",
            blocks: JSON.parse(JSON.stringify(s.blocks)).map((b) => ({ ...b, id: uid() })),
            editingSessionId: null,
          };
          swimEditingSessionId = null;
          saveJSON(KEYS.swimDraft, swimDraft);
          renderSwimContent();
        },
        { confirmLabel: "Charger" }
      );
      importDraftFile.value = "";
    };
    reader.readAsText(file);
  });

  const cancelEditBtn = document.getElementById("swim-cancel-edit-btn");
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      clearSwimDraft();
      renderSwimContent();
    });
  }

  document.querySelectorAll("#swim-blocks-container .exercise-card").forEach((card) => {
    const mode = card.dataset.mode === "pool" ? "pool" : "both";
    const isPool = mode === "pool";
    const labelInput = card.querySelector(".ex-name-input");
    labelInput.addEventListener("input", scheduleSwimDraftSave);

    if (isPool) {
      const poolLengthEl = card.querySelector(".swim-block-poollength");
      const lengthsEl = card.querySelector(".swim-block-lengths");
      const strokeEl = card.querySelector(".swim-block-stroke");
      const durationEl = card.querySelector(".swim-block-duration");
      const totalHint = card.querySelector("[data-total-hint]");
      const updateTotal = () => {
        const dist = swimBlockDistanceM({ mode: "pool", poolLength: poolLengthEl.value, lengths: lengthsEl.value });
        const durVal = parseFloat(durationEl.value);
        const hintParts = [];
        if (dist) hintParts.push(`${Math.round(dist)} m`);
        if (dist && !isNaN(durVal) && durVal > 0) {
          const paceDisp = formatSwimPaceDisplay(String((durVal * 100) / dist));
          if (paceDisp) hintParts.push(paceDisp);
        }
        totalHint.textContent = hintParts.length ? `Distance totale : ${hintParts.join(" · ")}` : "";
      };
      [poolLengthEl, lengthsEl, durationEl].forEach((el) => {
        el.addEventListener("input", () => {
          updateTotal();
          updateSwimSummaryBar();
          scheduleSwimDraftSave();
        });
      });
      strokeEl.addEventListener("input", scheduleSwimDraftSave);
    } else {
      const durEl = card.querySelector(".swim-block-duration");
      const distEl = card.querySelector(".swim-block-distance");
      const recomputePace = () => {
        const d = parseFloat(durEl.value);
        const dist = parseFloat(distEl.value);
        if (!isNaN(d) && !isNaN(dist) && dist > 0) {
          setPaceFieldsOnCard(card, String(round2((d * 100) / dist)));
        } else {
          card.querySelector(".block-pace-min").value = "";
          card.querySelector(".block-pace-sec").value = "";
        }
      };
      [durEl, distEl].forEach((el) => {
        el.addEventListener("input", () => {
          recomputePace();
          updateSwimSummaryBar();
          scheduleSwimDraftSave();
        });
      });
    }

    card.querySelector("[data-duplicate-block]").addEventListener("click", () => {
      const blocks = serializeSwimBlocksFromDOM();
      const index = blocks.findIndex((b) => b.id === card.dataset.id);
      if (index === -1) return;
      const clone = { ...blocks[index], id: uid() };
      blocks.splice(index + 1, 0, clone);
      swimDraft.blocks = blocks;
      saveJSON(KEYS.swimDraft, swimDraft);
      renderSwimContent();
    });

    card.querySelector("[data-remove-block]").addEventListener("click", () => {
      const blocks = serializeSwimBlocksFromDOM();
      if (blocks.length <= 1) {
        const target = blocks.find((b) => b.id === card.dataset.id);
        target.label = "";
        target.duration = "";
        target.distance = "";
        target.pace = "";
        target.poolLength = "";
        target.lengths = "";
        target.stroke = "";
        swimDraft.blocks = blocks;
        saveJSON(KEYS.swimDraft, swimDraft);
        renderSwimContent();
        return;
      }
      swimDraft.blocks = blocks.filter((b) => b.id !== card.dataset.id);
      saveJSON(KEYS.swimDraft, swimDraft);
      renderSwimContent();
    });

    card.querySelectorAll("[data-block-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const newMode = btn.dataset.blockType;
        if (card.dataset.mode === newMode) return;
        const blocks = serializeSwimBlocksFromDOM();
        const target = blocks.find((b) => b.id === card.dataset.id);
        target.mode = newMode;
        swimDraft.blocks = blocks;
        saveJSON(KEYS.swimDraft, swimDraft);
        renderSwimContent();
      });
    });

    card.querySelector("[data-drag-handle]").addEventListener("pointerdown", (e) => startDragSwimBlock(e, card));
  });

  document.getElementById("add-swim-block-btn").addEventListener("click", () => {
    const blocks = serializeSwimBlocksFromDOM();
    blocks.push(emptySwimBlock());
    swimDraft.blocks = blocks;
    saveJSON(KEYS.swimDraft, swimDraft);
    renderSwimContent();
  });

  document.getElementById("save-swim-session-btn").addEventListener("click", () => {
    const withData = serializeSwimBlocksFromDOM()
      .map((b) => ({ ...b, label: b.label.trim() }))
      .filter((b) => b.label || swimBlockHasData(b));
    const blocks = withData.map((b, idx) => ({ ...b, label: b.label || `Bloc ${idx + 1}` }));

    const errorSlot = document.getElementById("swim-error-slot");
    if (blocks.length === 0) {
      errorSlot.innerHTML = `<div class="error-msg">Ajoute au moins un bloc avec des données avant d'enregistrer.</div>`;
      return;
    }
    errorSlot.innerHTML = "";

    const wasEditing = !!swimEditingSessionId;
    const existingSession = wasEditing ? swimSessions.find((s) => s.id === swimEditingSessionId) : null;
    const planned = existingSession ? isUpcoming(existingSession) : dateEl.value > todayISO();
    const otherCount = swimSessions.filter((s) => s.id !== swimEditingSessionId).length;
    const sessionLabel = labelEl.value.trim() || `Séance ${otherCount + 1}`;
    const session = { id: swimEditingSessionId || uid(), date: dateEl.value, label: sessionLabel, blocks, planned };
    if (wasEditing) {
      swimSessions = swimSessions.map((s) => (s.id === swimEditingSessionId ? session : s));
    } else {
      swimSessions = [session, ...swimSessions];
    }
    swimLibrary = Array.from(new Set([...swimLibrary, ...blocks.map((b) => b.label)])).sort((a, b) => a.localeCompare(b));
    saveJSON(KEYS.swimSessions, swimSessions);
    saveJSON(KEYS.swimLibrary, swimLibrary);
    clearSwimDraft();

    renderSwimApp();
    document.getElementById("swim-flash-slot").innerHTML = `<div class="flash">${ICONS.check} ${wasEditing ? "Séance modifiée" : "Séance enregistrée"}</div>`;
    setTimeout(() => {
      const f = document.getElementById("swim-flash-slot");
      if (f) f.innerHTML = "";
    }, 1800);
  });
}

function attachSwimHistoryListeners() {
  document.querySelectorAll("[data-swim-history-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      swimHistoryViewMode = btn.dataset.swimHistoryView;
      renderSwimContent();
    });
  });
  document.querySelectorAll("[data-swim-time-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      swimCalendarTimeFilter = btn.dataset.swimTimeFilter;
      swimSelectedCalendarDate = null;
      renderSwimContent();
    });
  });
  const calPrev = document.querySelector("[data-swim-cal-prev]");
  const calNext = document.querySelector("[data-swim-cal-next]");
  if (calPrev) calPrev.addEventListener("click", () => { shiftSwimCalendarMonth(-1); renderSwimContent(); });
  if (calNext) calNext.addEventListener("click", () => { shiftSwimCalendarMonth(1); renderSwimContent(); });
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
  document.querySelectorAll("[data-swim-mark-done-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      markActivityDone("swim", btn.dataset.swimMarkDoneSession);
      renderSwimContent();
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
