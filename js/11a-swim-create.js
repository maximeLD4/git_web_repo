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
      <button type="button" class="back-btn" data-go-home>${ICONS.back}</button>
      <div class="header-icon-only">${ICONS.swim}</div>
      <div class="header-sub">${swimSessions.length} séance${swimSessions.length !== 1 ? "s" : ""} enregistrée${swimSessions.length !== 1 ? "s" : ""}</div>
    </div>
    <div class="content" id="content"></div>
    <div class="log-actions-bar" id="log-actions-bar" style="display:none;"></div>
    <div class="tabbar">
      <button class="tab-btn ${swimTab === "log" ? "active" : ""}" data-swim-tab="log">${ICONS.swim}Créer</button>
      <button class="tab-btn ${swimTab === "history" ? "active" : ""}" data-swim-tab="history">${ICONS.history}Séances</button>
    </div>
  `;
  document.querySelector("[data-go-home]").addEventListener("click", () => {
    if (calendarReturnTarget) {
      returnToCalendar();
    } else {
      goHome();
    }
  });
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

  const actionsBar = document.getElementById("log-actions-bar");
  if (actionsBar) {
    if (swimTab === "log") {
      actionsBar.style.display = "";
      actionsBar.innerHTML = swimLogActionsBarContentHTML();
      attachSwimLogActionsBarListeners();
    } else {
      actionsBar.style.display = "none";
    }
  }
  positionLogActionsBar();
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
      <div class="field"><label>Taille du bassin (m)</label><input class="swim-block-poollength" type="text" inputmode="decimal" placeholder="ex. 25" value="${b.poolLength}"></div>
      <div class="field"><label>Longueurs</label><input class="swim-block-lengths" type="number" inputmode="numeric" placeholder="ex. 20" value="${b.lengths}"></div>
    </div>
    <div class="block-fields-row">
      <div class="field"><label>Nage</label><input class="swim-block-stroke" type="text" list="swim-stroke-suggestions" placeholder="Crawl, dos, brasse…" value="${(b.stroke || "").replace(/"/g, "&quot;")}"></div>
      <div class="field"><label>Durée (min, optionnel)</label><input class="swim-block-duration" type="text" inputmode="decimal" placeholder="ex. 25" value="${b.duration}"></div>
    </div>
    <div class="block-total-hint" data-total-hint>${hintParts.length ? `Distance totale : ${hintParts.join(" · ")}` : ""}</div>`;
  } else {
    fieldsHTML = `
    <div class="block-fields-row">
      <div class="field"><label>Durée (min)</label><input class="swim-block-duration" type="text" inputmode="decimal" placeholder="ex. 20" value="${b.duration}"></div>
      <div class="field"><label>Distance (m)</label><input class="swim-block-distance" type="text" inputmode="decimal" placeholder="ex. 1000" value="${b.distance}"></div>
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
    <div id="log-bottom-spacer" style="height:0;"></div>
  `;
}

function swimLogActionsBarContentHTML() {
  return `
    <div id="swim-error-slot"></div>
    <button class="add-exercise-btn" id="add-swim-block-btn">${ICONS.plus} Ajouter un bloc</button>
    <button class="save-btn" id="save-swim-session-btn">${ICONS.check} ${swimEditingSessionId ? "Enregistrer les modifications" : "Enregistrer la séance"}</button>
    <div id="swim-flash-slot"></div>
  `;
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
      if (calendarReturnTarget) {
        returnToCalendar();
      } else {
        renderSwimContent();
      }
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
        renderContentPreservingScroll(renderSwimContent, () =>
          scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${card.dataset.id}"]`))
        );
      });
    });

    card.querySelector("[data-drag-handle]").addEventListener("pointerdown", (e) => startDragSwimBlock(e, card));
  });
}

function attachSwimLogActionsBarListeners() {
  const dateEl = document.getElementById("swim-date");
  const labelEl = document.getElementById("swim-label");

  document.getElementById("add-swim-block-btn").addEventListener("click", () => {
    const blocks = serializeSwimBlocksFromDOM();
    const newBlock = emptySwimBlock();
    blocks.push(newBlock);
    swimDraft.blocks = blocks;
    saveJSON(KEYS.swimDraft, swimDraft);
    renderContentPreservingScroll(renderSwimContent, () => {
      const newCard = document.querySelector(`.exercise-card[data-id="${newBlock.id}"]`);
      scrollCardBottomIntoView(newCard);
    });
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

    if (calendarReturnTarget) {
      returnToCalendar();
      return;
    }
    renderSwimApp();
    document.getElementById("swim-flash-slot").innerHTML = `<div class="flash">${ICONS.check} ${wasEditing ? "Séance modifiée" : "Séance enregistrée"}</div>`;
    setTimeout(() => {
      const f = document.getElementById("swim-flash-slot");
      if (f) f.innerHTML = "";
    }, 1800);
  });
}

