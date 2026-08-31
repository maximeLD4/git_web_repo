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
    <div class="log-actions-bar" id="log-actions-bar" style="display:none;"></div>
    <div class="tabbar">
      <button class="tab-btn ${runTab === "log" ? "active" : ""}" data-run-tab="log">${ICONS.stopwatch}Créer</button>
      <button class="tab-btn ${runTab === "history" ? "active" : ""}" data-run-tab="history">${ICONS.history}Séances</button>
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

  const actionsBar = document.getElementById("log-actions-bar");
  if (actionsBar) {
    if (runTab === "log") {
      actionsBar.style.display = "";
      actionsBar.innerHTML = runLogActionsBarContentHTML();
      attachRunLogActionsBarListeners();
    } else {
      actionsBar.style.display = "none";
    }
  }
  positionLogActionsBar();
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
    <div id="log-bottom-spacer" style="height:0;"></div>
  `;
}

function runLogActionsBarContentHTML() {
  return `
    <div id="run-error-slot"></div>
    <button class="add-exercise-btn" id="add-block-btn">${ICONS.plus} Ajouter un bloc</button>
    <button class="save-btn" id="save-run-session-btn">${ICONS.check} ${runEditingSessionId ? "Enregistrer les modifications" : "Enregistrer la séance"}</button>
    <div id="run-flash-slot"></div>
  `;
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
      if (calendarReturnTarget) {
        returnToCalendar();
      } else {
        renderRunContent();
      }
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
        renderContentPreservingScroll(renderRunContent, () =>
          scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${card.dataset.id}"]`))
        );
      });
    });

    card.querySelector("[data-drag-handle]").addEventListener("pointerdown", (e) => startDragBlock(e, card));
  });
}

function attachRunLogActionsBarListeners() {
  const dateEl = document.getElementById("run-date");
  const labelEl = document.getElementById("run-label");

  document.getElementById("add-block-btn").addEventListener("click", () => {
    const blocks = serializeBlocksFromDOM();
    const newBlock = emptyBlock();
    blocks.push(newBlock);
    runDraft.blocks = blocks;
    saveJSON(KEYS.runDraft, runDraft);
    renderContentPreservingScroll(renderRunContent, () => {
      const newCard = document.querySelector(`.exercise-card[data-id="${newBlock.id}"]`);
      scrollCardBottomIntoView(newCard);
    });
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

    if (calendarReturnTarget) {
      returnToCalendar();
      return;
    }
    renderRunApp();
    document.getElementById("run-flash-slot").innerHTML = `<div class="flash">${ICONS.check} ${wasEditing ? "Séance modifiée" : "Séance enregistrée"}</div>`;
    setTimeout(() => {
      const f = document.getElementById("run-flash-slot");
      if (f) f.innerHTML = "";
    }, 1800);
  });
}

