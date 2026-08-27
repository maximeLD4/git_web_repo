function formatSetChip(exType, s) {
  if (exType === "cardio") {
    const mins = s.weight || 0;
    return s.reps ? `${mins}min · ${s.reps}km` : `${mins}min`;
  }
  return `${s.weight || 0}kg × ${s.reps || 0}`;
}
function formatSetsSummary(exType, sets) {
  return sets.map((s) => formatSetChip(exType, s)).join(", ");
}

/* ---------- draft helpers ---------- */
function serializeExercisesFromDOM() {
  const cards = document.querySelectorAll("#exercises-container .exercise-card");
  const result = [];
  cards.forEach((card) => {
    const id = card.dataset.id;
    const exType = card.dataset.extype || "muscu";
    const category = card.dataset.category || "pecs";
    const nameEl = card.querySelector(".ex-name-input");
    const name = nameEl ? nameEl.value : "";
    const sets = [];
    card.querySelectorAll(".set-row").forEach((row) => {
      const weightEl = row.querySelector(".set-weight");
      const repsEl = row.querySelector(".set-reps");
      sets.push({
        id: row.dataset.id,
        weight: weightEl ? weightEl.value : "",
        reps: repsEl ? repsEl.value : "",
      });
    });
    result.push({ id, name, exType, category, sets });
  });
  return result;
}

function moveSet(card, setId, direction) {
  const exs = serializeExercisesFromDOM();
  const target = exs.find((e) => e.id === card.dataset.id);
  if (!target) return;
  const idx = target.sets.findIndex((s) => s.id === setId);
  const newIdx = idx + direction;
  if (idx === -1 || newIdx < 0 || newIdx >= target.sets.length) return;
  const [item] = target.sets.splice(idx, 1);
  target.sets.splice(newIdx, 0, item);
  draft.exercises = exs;
  saveJSON(KEYS.draft, draft);
  renderContent();
}

function scheduleDraftSave() {
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    const dateEl = document.getElementById("log-date");
    const labelEl = document.getElementById("log-label");
    draft = {
      date: dateEl ? dateEl.value : draft.date,
      label: labelEl ? labelEl.value : draft.label,
      exercises: serializeExercisesFromDOM(),
      editingSessionId,
    };
    saveJSON(KEYS.draft, draft);
  }, 350);
}

function clearDraft() {
  draft = { date: todayISO(), label: "", exercises: [emptyExercise()] };
  editingSessionId = null;
  saveJSON(KEYS.draft, draft);
}

function startEditSession(session) {
  editingSessionId = session.id;
  draft = {
    date: session.date,
    label: session.label || "",
    exercises: JSON.parse(JSON.stringify(session.exercises)),
    editingSessionId,
  };
  saveJSON(KEYS.draft, draft);
  tab = "log";
  render();
}

function duplicateSession(session) {
  const clonedExercises = JSON.parse(JSON.stringify(session.exercises)).map((ex) => ({
    ...ex,
    id: uid(),
    sets: ex.sets.map((s) => ({ ...s, id: uid() })),
  }));
  editingSessionId = null;
  draft = { date: todayISO(), label: session.label || "", exercises: clonedExercises, editingSessionId: null };
  saveJSON(KEYS.draft, draft);
  tab = "log";
  render();
}

function getLastPerformance(name) {
  if (!name) return null;
  const norm = name.trim().toLowerCase();
  if (!norm) return null;
  for (const s of sessions) {
    const found = s.exercises.find((e) => e.name.trim().toLowerCase() === norm);
    if (found) return { date: s.date, exType: found.exType || "muscu", sets: found.sets };
  }
  return null;
}

function renderGymApp() {
  app.className = "theme-gym";
  app.innerHTML = `
    <div class="header">
      <button type="button" class="back-btn" data-go-home>${ICONS.back}</button>
      <div class="header-icon-only">${ICONS.dumbbell}</div>
      <div class="header-sub">${sessions.length} séance${sessions.length !== 1 ? "s" : ""} enregistrée${sessions.length !== 1 ? "s" : ""}</div>
    </div>
    <div class="content" id="content"></div>
    <div class="tabbar">
      <button class="tab-btn ${tab === "log" ? "active" : ""}" data-tab="log">${ICONS.dumbbell}Créer</button>
      <button class="tab-btn ${tab === "history" ? "active" : ""}" data-tab="history">${ICONS.history}Séances</button>
    </div>
  `;
  document.querySelector("[data-go-home]").addEventListener("click", goHome);
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      tab = btn.dataset.tab;
      renderGymApp();
    });
  });
  renderContent();
}

function renderContent() {
  const content = document.getElementById("content");
  if (tab === "log") content.innerHTML = logTabHTML();
  else content.innerHTML = historyTabHTML();
  attachContentListeners();
}

function categoryToggleHTML(category) {
  return `
    <div class="ex-type-toggle wrap-toggle" data-category-toggle style="margin-bottom:10px;">
      ${GYM_EXERCISE_CATEGORIES.map(
        (c) => `<button type="button" class="ex-type-btn ${category === c.key ? "active" : ""}" data-category-btn="${c.key}">${c.label}</button>`
      ).join("")}
    </div>`;
}

function nameSelectHTML(configsInCategory, effectiveConfig) {
  const options = [...configsInCategory]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (c) =>
        `<option value="${c.name.replace(/"/g, "&quot;")}" ${effectiveConfig && c.id === effectiveConfig.id ? "selected" : ""}>${c.name}</option>`
    )
    .join("");
  return `<select class="ex-name-input ex-name-pill">${options}</select>`;
}

function exerciseCardHTML(ex) {
  const exType = ex.exType || "muscu";
  const isCardio = exType === "cardio";
  const category = ex.category || "pecs";
  const configsInCategory = isCardio ? [] : gymExerciseConfigs.filter((c) => (c.category || "pecs") === category);
  // La config "effective" est celle qui correspond au nom enregistré, ou à défaut
  // la première de la catégorie — le menu affiché et les poids calculés
  // pointent toujours vers exactement le même exercice, jamais l'un sans l'autre.
  const effectiveConfig = isCardio ? null : findExerciseConfig(ex.name) || configsInCategory[0] || null;
  const last = getLastPerformance(isCardio ? ex.name : effectiveConfig ? effectiveConfig.name : ex.name);
  const possibleWeights = isCardio ? [] : computePossibleWeights(effectiveConfig);
  const baseOnlyWeights = isCardio ? [] : computeBaseWeightsOnly(effectiveConfig);
  const incrementedOnlyWeights = isCardio ? [] : computeIncrementedWeightsOnly(effectiveConfig);
  const hasIncrement = !isCardio && effectiveConfig && effectiveConfig.maxIncrement > 0;
  const categoryAndNameHTML = isCardio
    ? ""
    : categoryToggleHTML(category) +
      (configsInCategory.length === 0
        ? `<div class="empty-state" style="padding:16px; margin-bottom:10px;">Aucun exercice configuré dans "${categoryLabel(category)}".<br>Va dans Paramètres → Salle de sport pour en ajouter.</div>`
        : nameSelectHTML(configsInCategory, effectiveConfig));

  const setsHTML = ex.sets
    .map((s, i) => {
      let cols;
      if (isCardio) {
        const weightInput = `<input class="set-weight" type="number" inputmode="decimal" placeholder="min" value="${s.weight}">`;
        const repsInput = `<input class="set-reps" type="number" inputmode="decimal" placeholder="km (optionnel)" value="${s.reps}">`;
        cols = weightInput + repsInput;
      } else {
        const currentWeight = s.weight === "" ? null : parseFloat(s.weight);
        // Si l'exercice a un incrément configuré, on détermine dans quel
        // mode se trouve cette série au départ : si sa valeur actuelle
        // correspond à un poids incrémenté, on ouvre directement en mode
        // "incrémenté" plutôt que de forcer un retour en mode standard.
        const startsIncremented = hasIncrement && incrementedOnlyWeights.includes(currentWeight);
        const activeList = hasIncrement && startsIncremented ? incrementedOnlyWeights : baseOnlyWeights;
        const weightList = [...activeList];
        if (currentWeight !== null && !weightList.includes(currentWeight)) {
          weightList.push(currentWeight);
          weightList.sort((a, b) => a - b);
        }
        const weightOptions = weightList.length
          ? weightList.map((w) => `<option value="${w}" ${currentWeight === w ? "selected" : ""}>${w}kg</option>`).join("")
          : `<option value="">—</option>`;
        const incrementToggle = hasIncrement
          ? `<button type="button" class="increment-switch-btn ${startsIncremented ? "active" : ""}" data-increment-switch data-mode="${startsIncremented ? "on" : "off"}" data-increment-value="${effectiveConfig.maxIncrement}">${startsIncremented ? "+" + effectiveConfig.maxIncrement + "kg" : "Standard"}</button>`
          : "";
        const weightField = `
        <div class="set-weight-col">
          <select class="set-weight" data-mode="${startsIncremented ? "on" : "off"}" ${weightList.length === 0 ? "disabled" : ""}>${weightOptions}</select>
          ${incrementToggle}
        </div>`;
        const repsField = `
        <div class="rep-stepper">
          <button type="button" class="rep-step-btn" data-rep-minus aria-label="Moins">−</button>
          <span class="rep-value" data-rep-value>${s.reps || 0}</span>
          <button type="button" class="rep-step-btn" data-rep-plus aria-label="Plus">+</button>
          <input type="hidden" class="set-reps" value="${s.reps || 0}">
        </div>`;
        cols = repsField + weightField;
      }
      const isFirst = i === 0;
      const isLast = i === ex.sets.length - 1;
      return `
    <div class="set-row" data-id="${s.id}">
      <div class="set-main">
        <div class="set-num">${i + 1}</div>
        ${cols}
      </div>
      <div class="set-toolbar">
        <button type="button" class="set-action-btn" data-move-set-up="${s.id}" aria-label="Monter" ${isFirst ? "disabled" : ""}>${ICONS.miniUp}</button>
        <button type="button" class="set-action-btn" data-move-set-down="${s.id}" aria-label="Descendre" ${isLast ? "disabled" : ""}>${ICONS.miniDown}</button>
        <button type="button" class="set-action-btn danger" data-remove-set="${s.id}" aria-label="Supprimer" ${ex.sets.length === 1 ? "disabled" : ""}>${ICONS.trash}</button>
      </div>
    </div>`;
    })
    .join("");

  return `
  <div class="exercise-card" data-id="${ex.id}" data-extype="${exType}" data-category="${ex.category || "pecs"}">
    <div class="exercise-head">
      <button type="button" class="drag-handle" data-drag-handle aria-label="Réordonner">${ICONS.grip}</button>
      ${
        isCardio
          ? `<input class="ex-name-input" type="text" placeholder="Nom de l'exercice (optionnel)" list="exercise-suggestions" value="${ex.name.replace(/"/g, "&quot;")}">`
          : `<div class="ex-name-label">${ex.name || "Choisis un exercice"}</div>`
      }
      <button type="button" class="icon-btn" data-duplicate-ex="${ex.id}" aria-label="Dupliquer l'exercice">${ICONS.duplicate}</button>
      <button class="icon-btn" data-remove-ex="${ex.id}">${ICONS.x}</button>
    </div>
    <div class="ex-type-toggle">
      <button type="button" class="ex-type-btn ${!isCardio ? "active" : ""}" data-set-type="muscu">Muscu</button>
      <button type="button" class="ex-type-btn ${isCardio ? "active" : ""}" data-set-type="cardio">Cardio</button>
    </div>
    ${categoryAndNameHTML}
    ${last ? `<div class="last-perf" data-hint>Dernière fois (${formatDateFR(last.date)}) : <b>${formatSetsSummary(last.exType, last.sets)}</b></div>` : `<div class="last-perf" data-hint style="display:none"></div>`}
    <div class="sets-header"><span class="spacer"></span>${isCardio ? "<span>Min</span><span>Km</span>" : "<span>Reps</span><span>Kg</span>"}</div>
    <div class="sets-list">${setsHTML}</div>
    <button class="add-set-btn" data-add-set="${ex.id}">${ICONS.plus} ${isCardio ? "Ajouter un passage" : "Ajouter une série"}</button>
  </div>`;
}

function logTabHTML() {
  const exercisesHTML = draft.exercises.map(exerciseCardHTML).join("");
  const allNames = Array.from(new Set([...gymExerciseConfigs.map((c) => c.name), ...library])).sort((a, b) => a.localeCompare(b));
  const libOptions = allNames.map((n) => `<option value="${n.replace(/"/g, "&quot;")}">`).join("");
  const editBanner = editingSessionId
    ? `<div class="edit-banner">Modification d'une séance existante<button type="button" id="cancel-edit-btn">Annuler</button></div>`
    : "";
  return `
    <div class="backup-row">
      <button class="backup-btn" id="import-draft-btn">${ICONS.down} Importer une séance</button>
      <button class="backup-btn" id="reset-draft-btn">${ICONS.reset} Réinitialiser</button>
      <input type="file" id="import-draft-file" accept="application/json" style="display:none">
    </div>
    ${editBanner}
    <div class="field-row">
      <div class="field"><label>Date</label><input type="date" id="log-date" value="${draft.date}"></div>
      <div class="field"><label>Séance</label><input type="text" id="log-label" placeholder="Push day, jambes… (optionnel)" value="${(draft.label || "").replace(/"/g, "&quot;")}"></div>
    </div>
    <div id="exercises-container">${exercisesHTML}</div>
    <datalist id="exercise-suggestions">${libOptions}</datalist>
    <button class="add-exercise-btn" id="add-exercise-btn">${ICONS.plus} Ajouter un exercice</button>
    <div id="error-slot"></div>
    <button class="save-btn" id="save-session-btn">${ICONS.check} ${editingSessionId ? "Enregistrer les modifications" : "Enregistrer la séance"}</button>
    <div id="flash-slot"></div>
  `;
}

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

/* ---------- listeners ---------- */
function attachContentListeners() {
  if (tab === "log") attachLogListeners();
  else attachHistoryListeners();
}

function attachLogListeners() {
  const dateEl = document.getElementById("log-date");
  const labelEl = document.getElementById("log-label");
  dateEl.addEventListener("input", scheduleDraftSave);
  labelEl.addEventListener("input", scheduleDraftSave);

  const importDraftBtn = document.getElementById("import-draft-btn");
  const importDraftFile = document.getElementById("import-draft-file");
  importDraftBtn.addEventListener("click", () => importDraftFile.click());

  attachArmedConfirmButton(
    document.getElementById("reset-draft-btn"),
    `${ICONS.reset} Réinitialiser`,
    `${ICONS.reset} Confirmer ?`,
    () => {
      clearDraft();
      renderContent();
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
      const result = validateSingleSessionForSection(data, "gym");
      if (!result.ok) {
        showAlert(result.message);
        importDraftFile.value = "";
        return;
      }
      showConfirm(
        `Charger cette séance (${formatDateFR(result.session.date)}) dans le formulaire ? Cela remplacera ce que tu es en train de saisir.`,
        () => {
          const s = result.session;
          draft = {
            date: s.date,
            label: s.label || "",
            exercises: JSON.parse(JSON.stringify(s.exercises)).map((ex) => ({
              ...ex,
              id: uid(),
              sets: ex.sets.map((set) => ({ ...set, id: uid() })),
            })),
            editingSessionId: null,
          };
          editingSessionId = null;
          saveJSON(KEYS.draft, draft);
          renderContent();
        },
        { confirmLabel: "Charger" }
      );
      importDraftFile.value = "";
    };
    reader.readAsText(file);
  });

  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      clearDraft();
      renderContent();
    });
  }

  document.querySelectorAll("#exercises-container .exercise-card").forEach((card) => {
    const isCardio = card.dataset.extype === "cardio";
    const nameInput = card.querySelector(".ex-name-input");
    const hint = card.querySelector("[data-hint]");

    function refreshHint(name) {
      const last = getLastPerformance(name);
      if (last) {
        hint.style.display = "";
        hint.innerHTML = `Dernière fois (${formatDateFR(last.date)}) : <b>${formatSetsSummary(last.exType, last.sets)}</b>`;
      } else {
        hint.style.display = "none";
        hint.innerHTML = "";
      }
    }

    if (isCardio && nameInput) {
      nameInput.addEventListener("input", () => {
        refreshHint(nameInput.value);
        scheduleDraftSave();
      });
    } else if (nameInput) {
      nameInput.addEventListener("change", () => {
        const chosenName = nameInput.value;
        refreshHint(chosenName);
        const exs = serializeExercisesFromDOM();
        const target = exs.find((e) => e.id === card.dataset.id);
        target.name = chosenName;
        // Le poids de chaque série doit rester valide pour ce nouvel exercice :
        // on les repositionne sur le premier poids disponible.
        const newConfig = findExerciseConfig(target.name);
        const possible = computeBaseWeightsOnly(newConfig);
        target.sets = target.sets.map((s) => ({ ...s, weight: possible.length ? possible[0] : "" }));
        draft.exercises = exs;
        saveJSON(KEYS.draft, draft);
        renderContent();
      });
    }

    card.querySelectorAll("[data-category-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (card.dataset.category === btn.dataset.categoryBtn) return;
        const exs = serializeExercisesFromDOM();
        const target = exs.find((e) => e.id === card.dataset.id);
        target.category = btn.dataset.categoryBtn;
        // On change de catégorie : le nom choisi ne correspond plus, on repart
        // sur le premier exercice configuré dans cette nouvelle catégorie.
        const firstInCategory = gymExerciseConfigs.find((c) => (c.category || "pecs") === target.category);
        target.name = firstInCategory ? firstInCategory.name : "";
        const possible = firstInCategory ? computeBaseWeightsOnly(firstInCategory) : [];
        target.sets = target.sets.map((s) => ({ ...s, weight: possible.length ? possible[0] : "" }));
        draft.exercises = exs;
        saveJSON(KEYS.draft, draft);
        renderContent();
      });
    });

    card.querySelectorAll(".set-weight").forEach((select) => {
      select.addEventListener("change", scheduleDraftSave);
    });

    card.querySelectorAll(".set-row").forEach((row) => {
      const minusBtn = row.querySelector("[data-rep-minus]");
      const plusBtn = row.querySelector("[data-rep-plus]");
      const valueEl = row.querySelector("[data-rep-value]");
      const hiddenInput = row.querySelector(".set-reps");
      if (!minusBtn || !plusBtn || !hiddenInput) return;
      function bumpReps(delta) {
        const current = parseInt(hiddenInput.value, 10) || 0;
        const next = Math.max(0, current + delta);
        hiddenInput.value = next;
        valueEl.textContent = next;
        scheduleDraftSave();
      }
      minusBtn.addEventListener("click", () => bumpReps(-1));
      plusBtn.addEventListener("click", () => bumpReps(1));
      // Double-clic/double-tap = +5 (ou -5) au total : chaque clic simple a déjà
      // ajouté ±1 (donc ±2 pour les deux clics du double-clic), le gestionnaire
      // dblclick n'ajoute donc que ±3 de plus pour arriver exactement à ±5,
      // sans latence artificielle sur un simple tap.
      minusBtn.addEventListener("dblclick", () => bumpReps(-3));
      plusBtn.addEventListener("dblclick", () => bumpReps(3));

      const switchBtn = row.querySelector("[data-increment-switch]");
      const weightSelect = row.querySelector(".set-weight");
      if (switchBtn && weightSelect) {
        switchBtn.addEventListener("click", () => {
          const currentMode = switchBtn.dataset.mode;
          const mode = currentMode === "on" ? "off" : "on";
          const incValue = parseFloat(switchBtn.dataset.incrementValue) || 0;

          const cfg = findExerciseConfig(nameInput ? nameInput.value : "");
          const currentVal = weightSelect.value === "" ? null : parseFloat(weightSelect.value);
          // On essaie de rester sur le même palier de machine en changeant
          // de mode (ex. 70kg standard -> 75kg incrémenté), plutôt que de
          // sauter arbitrairement à la première valeur de la nouvelle liste.
          const currentBase = currentVal === null ? null : currentMode === "on" ? currentVal - incValue : currentVal;
          const newList = mode === "on" ? computeIncrementedWeightsOnly(cfg) : computeBaseWeightsOnly(cfg);
          const target = currentBase === null ? null : mode === "on" ? currentBase + incValue : currentBase;
          const selectedValue = target !== null && newList.includes(target) ? target : newList[0];

          switchBtn.dataset.mode = mode;
          switchBtn.classList.toggle("active", mode === "on");
          switchBtn.textContent = mode === "on" ? `+${incValue}kg` : "Standard";

          weightSelect.dataset.mode = mode;
          weightSelect.innerHTML = newList.length
            ? newList.map((w) => `<option value="${w}" ${w === selectedValue ? "selected" : ""}>${w}kg</option>`).join("")
            : `<option value="">—</option>`;
          weightSelect.disabled = newList.length === 0;
          scheduleDraftSave();
        });
      }
    });

    card.querySelectorAll("[data-move-set-up]").forEach((btn) => {
      btn.addEventListener("click", () => moveSet(card, btn.dataset.moveSetUp, -1));
    });
    card.querySelectorAll("[data-move-set-down]").forEach((btn) => {
      btn.addEventListener("click", () => moveSet(card, btn.dataset.moveSetDown, 1));
    });
    card.querySelectorAll("[data-set-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (card.dataset.extype === btn.dataset.setType) return;
        const exs = serializeExercisesFromDOM();
        const target = exs.find((e) => e.id === card.dataset.id);
        target.exType = btn.dataset.setType;
        if (btn.dataset.setType === "muscu") {
          const cat = target.category || "pecs";
          const firstInCategory = gymExerciseConfigs.find((c) => (c.category || "pecs") === cat);
          target.name = firstInCategory ? firstInCategory.name : "";
          const possible = firstInCategory ? computeBaseWeightsOnly(firstInCategory) : [];
          target.sets = target.sets.map((s) => ({ ...s, weight: possible.length ? possible[0] : "", reps: s.reps || 10 }));
        }
        draft.exercises = exs;
        saveJSON(KEYS.draft, draft);
        renderContent();
      });
    });
    card.querySelector("[data-remove-ex]").addEventListener("click", () => {
      const exs = serializeExercisesFromDOM();
      if (exs.length <= 1) {
        const target = exs.find((e) => e.id === card.dataset.id);
        const fresh = emptyExercise();
        target.name = fresh.name;
        target.category = fresh.category;
        target.exType = "muscu";
        target.sets = fresh.sets;
        draft.exercises = exs;
        saveJSON(KEYS.draft, draft);
        renderContent();
        return;
      }
      draft.exercises = exs.filter((e) => e.id !== card.dataset.id);
      saveJSON(KEYS.draft, draft);
      renderContent();
    });
    card.querySelector("[data-duplicate-ex]").addEventListener("click", () => {
      const exs = serializeExercisesFromDOM();
      const index = exs.findIndex((e) => e.id === card.dataset.id);
      if (index === -1) return;
      const original = exs[index];
      const clone = {
        ...original,
        id: uid(),
        sets: original.sets.map((s) => ({ ...s, id: uid() })),
      };
      exs.splice(index + 1, 0, clone);
      draft.exercises = exs;
      saveJSON(KEYS.draft, draft);
      renderContent();
    });
    card.querySelectorAll("[data-remove-set]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const exs = serializeExercisesFromDOM();
        const target = exs.find((e) => e.id === card.dataset.id);
        if (target.sets.length <= 1) return;
        target.sets = target.sets.filter((s) => s.id !== btn.dataset.removeSet);
        draft.exercises = exs;
        saveJSON(KEYS.draft, draft);
        renderContent();
      });
    });
    card.querySelector("[data-add-set]").addEventListener("click", () => {
      const exs = serializeExercisesFromDOM();
      const target = exs.find((e) => e.id === card.dataset.id);
      const lastSet = target.sets[target.sets.length - 1];
      target.sets.push({ id: uid(), weight: lastSet ? lastSet.weight : "", reps: lastSet ? lastSet.reps : "" });
      draft.exercises = exs;
      saveJSON(KEYS.draft, draft);
      renderContent();
    });

    card.querySelector("[data-drag-handle]").addEventListener("pointerdown", (e) => startDragExercise(e, card));
  });

  document.getElementById("add-exercise-btn").addEventListener("click", () => {
    const exs = serializeExercisesFromDOM();
    exs.push(emptyExercise());
    draft.exercises = exs;
    saveJSON(KEYS.draft, draft);
    renderContent();
  });

  document.getElementById("save-session-btn").addEventListener("click", () => {
    const exs = serializeExercisesFromDOM();
    const withData = exs
      .map((e) => ({ ...e, name: e.name.trim(), sets: e.sets.filter((s) => s.weight !== "" || s.reps !== "") }))
      .filter((e) => e.sets.length > 0);
    const cleaned = withData.map((e, idx) => ({ ...e, name: e.name || `Exercice ${idx + 1}` }));

    const errorSlot = document.getElementById("error-slot");
    if (cleaned.length === 0) {
      errorSlot.innerHTML = `<div class="error-msg">Ajoute au moins un exercice avec une série avant d'enregistrer.</div>`;
      return;
    }
    errorSlot.innerHTML = "";

    const wasEditing = !!editingSessionId;
    const existingSession = wasEditing ? sessions.find((s) => s.id === editingSessionId) : null;
    const planned = existingSession ? isUpcoming(existingSession) : dateEl.value > todayISO();
    const otherCount = sessions.filter((s) => s.id !== editingSessionId).length;
    const sessionLabel = labelEl.value.trim() || `Séance ${otherCount + 1}`;
    const session = { id: editingSessionId || uid(), date: dateEl.value, label: sessionLabel, exercises: cleaned, planned };
    if (wasEditing) {
      sessions = sessions.map((s) => (s.id === editingSessionId ? session : s));
    } else {
      sessions = [session, ...sessions];
    }
    library = Array.from(new Set([...library, ...cleaned.map((e) => e.name)])).sort((a, b) => a.localeCompare(b));
    saveJSON(KEYS.sessions, sessions);
    saveJSON(KEYS.library, library);
    clearDraft();

    render();
    document.getElementById("flash-slot").innerHTML = `<div class="flash">${ICONS.check} ${wasEditing ? "Séance modifiée" : "Séance enregistrée"}</div>`;
    setTimeout(() => {
      const f = document.getElementById("flash-slot");
      if (f) f.innerHTML = "";
    }, 1800);
  });
}

function startDragExercise(e, card) {
  startDragItem(e, card, document.getElementById("exercises-container"), () => {
    draft.exercises = serializeExercisesFromDOM();
    saveJSON(KEYS.draft, draft);
  });
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
