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
    const existing = draft.exercises.find((e) => e.id === id);
    const exType = card.dataset.extype || "";
    const category = card.dataset.category || "";
    const nameEl = card.querySelector(".ex-name-input");
    // Pour un exercice Muscu réduit, le sélecteur de nom n'existe plus dans le
    // DOM (il est dans la partie repliée) : on conserve alors le nom déjà
    // connu plutôt que d'écraser par une valeur vide.
    const name = nameEl ? nameEl.value : existing ? existing.name : "";
    const rows = card.querySelectorAll(".set-row");
    let sets;
    if (rows.length === 0 && existing) {
      // Carte réduite : la liste des séries n'existe pas dans le DOM — on
      // conserve les séries déjà connues plutôt que de les remplacer par un
      // tableau vide, ce qui les aurait silencieusement effacées.
      sets = existing.sets;
    } else {
      sets = [];
      rows.forEach((row) => {
        const weightEl = row.querySelector(".set-weight");
        const repsEl = row.querySelector(".set-reps");
        sets.push({
          id: row.dataset.id,
          weight: weightEl ? weightEl.value : "",
          reps: repsEl ? repsEl.value : "",
          // Mode explicite (Standard/"off" ou +Xkg/"on") lu directement depuis
          // le sélecteur — on ne le redéduit JAMAIS depuis la seule valeur
          // numérique du poids, car celle-ci peut être ambiguë (ex. un
          // incrément de 10kg avec des paliers espacés de 10kg : "30kg" peut
          // être le palier 30 en standard, OU le palier 20 + 10 incrémenté).
          weightMode: weightEl ? weightEl.dataset.mode || "off" : "off",
        });
      });
    }
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
  draft = { date: todayISO(), label: "", exercises: [] };
  editingSessionId = null;
  openExerciseIds = {};
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
  // Réduit tous les exercices par défaut : on ouvre une séance existante
  // pour la consulter/ajuster ponctuellement, pas pour retaper chaque
  // exercice depuis le début — inutile d'afficher tout développé d'emblée.
  openExerciseIds = {};
  draft.exercises.forEach((ex) => {
    openExerciseIds[ex.id] = false;
  });
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
  openExerciseIds = {};
  clonedExercises.forEach((ex) => {
    openExerciseIds[ex.id] = false;
  });
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
    <div class="log-actions-bar" id="log-actions-bar" style="display:none;"></div>
    <div class="tabbar">
      <button class="tab-btn ${tab === "log" ? "active" : ""}" data-tab="log">${ICONS.dumbbell}Créer</button>
      <button class="tab-btn ${tab === "history" ? "active" : ""}" data-tab="history">${ICONS.history}Séances</button>
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

  const actionsBar = document.getElementById("log-actions-bar");
  if (actionsBar) {
    if (tab === "log") {
      actionsBar.style.display = "";
      actionsBar.innerHTML = logActionsBarContentHTML();
      attachLogActionsBarListeners();
    } else {
      actionsBar.style.display = "none";
    }
  }
  positionLogActionsBar();
}

function positionLogActionsBar() {
  const actionsBar = document.getElementById("log-actions-bar");
  const tabbarEl = document.querySelector(".tabbar");
  const spacer = document.getElementById("log-bottom-spacer");
  if (!actionsBar || !tabbarEl) return;
  if (actionsBar.style.display === "none") {
    if (spacer) spacer.style.height = "0";
    return;
  }
  // Positionne la barre d'actions juste au-dessus de la barre d'onglets, en
  // mesurant sa vraie hauteur rendue plutôt qu'une valeur fixe devinée (qui
  // varierait selon les appareils à cause de la zone de sécurité en bas).
  actionsBar.style.bottom = tabbarEl.offsetHeight + "px";
  // Réserve la même hauteur en bas du contenu défilant, pour que le dernier
  // exercice ne se retrouve jamais caché derrière cette barre fixe.
  if (spacer) spacer.style.height = actionsBar.offsetHeight + 16 + "px";
}

function categoryToggleHTML(category) {
  return `
    <div class="ex-type-toggle wrap-toggle" data-category-toggle style="margin-bottom:10px;">
      ${GYM_EXERCISE_CATEGORIES.map(
        (c) => `<button type="button" class="ex-type-btn ${category === c.key ? "active" : ""}" data-category-btn="${c.key}">${c.label}</button>`
      ).join("")}
    </div>`;
}

function cardioCategoryToggleHTML(category) {
  return `
    <div class="ex-type-toggle wrap-toggle" data-cardio-category-toggle style="margin-bottom:10px;">
      ${CARDIO_CATEGORIES.map(
        (c) => `<button type="button" class="ex-type-btn ${category === c.key ? "active" : ""}" data-cardio-category-btn="${c.key}">${c.label}</button>`
      ).join("")}
    </div>`;
}

function nameSelectHTML(configsInCategory, effectiveConfig) {
  const placeholder = `<option value="" ${!effectiveConfig ? "selected" : ""}>— Choisis un exercice —</option>`;
  const options = [...configsInCategory]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (c) =>
        `<option value="${c.name.replace(/"/g, "&quot;")}" ${effectiveConfig && c.id === effectiveConfig.id ? "selected" : ""}>${c.name}</option>`
    )
    .join("");
  return `<select class="ex-name-input ex-name-pill">${placeholder}${options}</select>`;
}

function exerciseCardHTML(ex) {
  const exType = ex.exType || ""; // "" tant qu'aucun type n'a été choisi
  const isCardio = exType === "cardio";
  const isMuscu = exType === "muscu";
  const category = ex.category || ""; // "" tant qu'aucune catégorie n'a été choisie

  const configsInCategory = category ? gymExerciseConfigs.filter((c) => (c.category || "pecs") === category) : [];
  // La config "effective" est UNIQUEMENT celle qui correspond exactement au nom
  // déjà choisi — contrairement à avant, on ne se replie plus sur le premier
  // exercice de la catégorie : tant que rien n'est explicitement sélectionné,
  // rien n'est effectif.
  const effectiveConfig = isMuscu ? findExerciseConfig(ex.name) : null;
  const last = getLastPerformance(isCardio ? ex.name : effectiveConfig ? effectiveConfig.name : "");
  const baseOnlyWeights = effectiveConfig ? computeBaseWeightsOnly(effectiveConfig) : [];
  const incrementedOnlyWeights = effectiveConfig ? computeIncrementedWeightsOnly(effectiveConfig) : [];
  const hasIncrement = !!effectiveConfig && effectiveConfig.maxIncrement > 0;

  // Le corps de la carte dépend d'où on en est dans le parcours :
  // aucun type choisi -> juste une invite ; Muscu sans catégorie -> choisir la
  // catégorie ; Muscu avec catégorie mais sans exercice -> choisir l'exercice ;
  // sinon (Cardio, ou Muscu avec un exercice choisi) -> les séries.
  let bodyHTML;
  if (!exType) {
    bodyHTML = `<div class="empty-state" style="padding:16px; margin-bottom:10px;">Choisis Muscu ou Cardio pour continuer.</div>`;
  } else if (isMuscu && !category) {
    bodyHTML = categoryToggleHTML(category) + `<div class="empty-state" style="padding:16px; margin-bottom:10px;">Choisis une catégorie pour continuer.</div>`;
  } else if (isMuscu && configsInCategory.length === 0) {
    bodyHTML =
      categoryToggleHTML(category) +
      `<div class="empty-state" style="padding:16px; margin-bottom:10px;">Aucun exercice configuré dans "${categoryLabel(category)}".<br>Va dans Paramètres → Salle de sport pour en ajouter.</div>`;
  } else if (isMuscu && !effectiveConfig) {
    bodyHTML =
      categoryToggleHTML(category) +
      nameSelectHTML(configsInCategory, null) +
      `<div class="empty-state" style="padding:16px; margin-bottom:10px;">Choisis un exercice pour continuer.</div>`;
  } else {
    const categoryAndNameHTML = isCardio ? cardioCategoryToggleHTML(category) : categoryToggleHTML(category) + nameSelectHTML(configsInCategory, effectiveConfig);
    const setsHTML = ex.sets
      .map((s, i) => {
        let cols;
        if (isCardio) {
          const weightInput = `<input class="set-weight" type="number" inputmode="decimal" placeholder="min" value="${s.weight}">`;
          const repsInput = `<input class="set-reps" type="number" inputmode="decimal" placeholder="km (optionnel)" value="${s.reps}">`;
          cols = weightInput + repsInput;
        } else {
          const currentWeight = s.weight === "" ? null : parseFloat(s.weight);
          // On fait confiance en priorité au mode explicitement sauvegardé sur
          // la série (voir serializeExercisesFromDOM) — la déduction à partir
          // de la seule valeur numérique est ambiguë dès que l'incrément
          // correspond à l'écart entre deux paliers, et servait auparavant à
          // tort de seule source de vérité, provoquant des bascules
          // involontaires du switch sur d'anciennes séries lors d'un nouveau
          // rendu. On ne s'y replie que si aucun mode n'a jamais été
          // enregistré (séries créées avant ce correctif).
          const startsIncremented = hasIncrement && (s.weightMode ? s.weightMode === "on" : incrementedOnlyWeights.includes(currentWeight));
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

    bodyHTML = `
    ${categoryAndNameHTML}
    ${last ? `<div class="last-perf" data-hint>Dernière fois (${formatDateFR(last.date)}) : <b>${formatSetsSummary(last.exType, last.sets)}</b></div>` : `<div class="last-perf" data-hint style="display:none"></div>`}
    <div class="sets-header"><span class="spacer"></span>${isCardio ? "<span>Min</span><span>Km</span>" : "<span>Reps</span><span>Kg</span>"}</div>
    <div class="sets-list">${setsHTML}</div>
    <button class="add-set-btn" data-add-set="${ex.id}">${ICONS.plus} ${isCardio ? "Ajouter un passage" : "Ajouter une série"}</button>`;
  }

  const isOpen = openExerciseIds[ex.id] !== false; // par défaut développé, sauf réduction explicite
  const summaryCount = ex.sets.length ? (isCardio ? `${ex.sets.length} passage${ex.sets.length > 1 ? "s" : ""}` : `${ex.sets.length} série${ex.sets.length > 1 ? "s" : ""}`) : "vide";
  const summaryLast = last ? ` · ${formatSetsSummary(last.exType, last.sets)}` : "";

  return `
  <div class="exercise-card" data-id="${ex.id}" data-extype="${exType}" data-category="${ex.category || ""}">
    <div class="exercise-head">
      <button type="button" class="drag-handle" data-drag-handle aria-label="Réordonner">${ICONS.grip}</button>
      ${
        isCardio
          ? `<input class="ex-name-input" type="text" placeholder="Nom de l'exercice (optionnel)" list="exercise-suggestions" value="${ex.name.replace(/"/g, "&quot;")}">`
          : `<div class="ex-name-label">${ex.name || "Nouvel exercice"}</div>`
      }
      <button type="button" class="icon-btn" data-toggle-exercise="${ex.id}" aria-label="${isOpen ? "Réduire" : "Développer"}"><span class="chev ${isOpen ? "open" : ""}">${ICONS.chevron}</span></button>
      <button type="button" class="icon-btn" data-duplicate-ex="${ex.id}" aria-label="Dupliquer l'exercice">${ICONS.duplicate}</button>
      <button class="icon-btn" data-remove-ex="${ex.id}">${ICONS.x}</button>
    </div>
    ${
      isOpen
        ? `
    <div class="ex-type-toggle">
      <button type="button" class="ex-type-btn ${isMuscu ? "active" : ""}" data-set-type="muscu">Muscu</button>
      <button type="button" class="ex-type-btn ${isCardio ? "active" : ""}" data-set-type="cardio">Cardio</button>
    </div>
    ${bodyHTML}`
        : `<div class="exercise-collapsed-summary" data-toggle-exercise="${ex.id}">${ex.name || (isCardio ? "Exercice cardio" : "Nouvel exercice")}${" · "}${summaryCount}${summaryLast}</div>`
    }
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
    <div id="log-bottom-spacer" style="height:0;"></div>
  `;
}

function logActionsBarContentHTML() {
  return `
    <div id="error-slot"></div>
    <button class="add-exercise-btn" id="add-exercise-btn">${ICONS.plus} Ajouter un exercice</button>
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

function scrollCardTopIntoView(card, topMargin = 16) {
  if (!card) return;
  const doScroll = () => {
    const contentEl = document.getElementById("content");
    if (!contentEl || typeof contentEl.getBoundingClientRect !== "function" || typeof contentEl.scrollBy !== "function") return;
    const cardRect = card.getBoundingClientRect();
    const contentRect = contentEl.getBoundingClientRect();
    // Aligne systématiquement le haut de la carte avec le haut de la zone
    // visible (à une petite marge près) — pas seulement si besoin : chaque
    // sélection (type, catégorie, exercice) révèle du contenu juste en
    // dessous, autant garder un repère stable en haut à chaque fois.
    const delta = cardRect.top - (contentRect.top + topMargin);
    // En dessous d'un petit seuil, on ne bouge rien : sans ça, un simple
    // écart d'arrondi de quelques pixels déclenchait une animation de
    // scroll perceptible alors qu'on était déjà pile au bon endroit.
    if (Math.abs(delta) < 6) return;
    contentEl.scrollBy({ top: delta, behavior: "smooth" });
  };
  // On attend une frame avant de mesurer/scroller : juste après avoir inséré
  // le nouveau contenu, le navigateur peut ne pas avoir encore terminé sa
  // mise en page, ce qui donnerait une mesure incomplète et un scroll trop
  // court.
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(doScroll);
  else doScroll();
}

function scrollCardBottomIntoView(card) {
  if (!card) return;
  const doScroll = () => {
    const contentEl = document.getElementById("content");
    const tabbarEl = document.querySelector(".tabbar");
    const actionsBarEl = document.getElementById("log-actions-bar");
    if (!contentEl || typeof contentEl.getBoundingClientRect !== "function" || typeof contentEl.scrollBy !== "function") return;
    const cardRect = card.getBoundingClientRect();
    const contentRect = contentEl.getBoundingClientRect();
    // La marge à réserver correspond à la vraie hauteur mesurée de la barre
    // d'onglets + la barre d'actions fixe (qui recouvrent visuellement le
    // bas du conteneur) — une valeur fixe devinée était trop petite sur les
    // appareils avec une zone de sécurité en bas plus grande, ce qui faisait
    // s'arrêter le scroll trop tôt.
    const tabbarHeight = tabbarEl ? tabbarEl.offsetHeight : 0;
    const actionsBarHeight = actionsBarEl && actionsBarEl.style.display !== "none" ? actionsBarEl.offsetHeight : 0;
    const bottomMargin = tabbarHeight + actionsBarHeight + 20;
    const delta = cardRect.bottom - (contentRect.bottom - bottomMargin);
    // Même seuil que pour l'alignement en haut : évite un scroll perceptible
    // pour un écart insignifiant.
    if (Math.abs(delta) < 6) return;
    contentEl.scrollBy({ top: delta, behavior: "smooth" });
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(doScroll);
  else doScroll();
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
      if (calendarReturnTarget) {
        returnToCalendar();
      } else {
        renderContent();
      }
    });
  }

  document.querySelectorAll("#exercises-container .exercise-card").forEach((card) => {
    const isCardio = card.dataset.extype === "cardio";
    const nameInput = card.querySelector(".ex-name-input");
    const hint = card.querySelector("[data-hint]");

    function refreshHint(name) {
      if (!hint) return;
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
        if (!chosenName) {
          // Retour à "aucun exercice choisi" (option placeholder) : pas de
          // séries tant qu'un exercice n'est pas explicitement sélectionné.
          target.sets = [];
        } else {
          const newConfig = findExerciseConfig(target.name);
          const possible = computeBaseWeightsOnly(newConfig);
          if (target.sets.length === 0) {
            // Première sélection : on crée la toute première série.
            target.sets = [{ id: uid(), weight: possible.length ? possible[0] : "", reps: 10, weightMode: "off" }];
          } else {
            // Changement d'exercice après coup : les séries existantes
            // doivent rester valides pour ce nouvel exercice.
            target.sets = target.sets.map((s) => ({ ...s, weight: possible.length ? possible[0] : "", weightMode: "off" }));
          }
        }
        draft.exercises = exs;
        saveJSON(KEYS.draft, draft);
        renderContent();
        scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${card.dataset.id}"]`));
      });
    }

    card.querySelectorAll("[data-category-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (card.dataset.category === btn.dataset.categoryBtn) return;
        const exs = serializeExercisesFromDOM();
        const target = exs.find((e) => e.id === card.dataset.id);
        target.category = btn.dataset.categoryBtn;
        // On change de catégorie : le nom choisi ne correspond plus à rien.
        // On ne présélectionne plus le premier exercice de la catégorie —
        // l'utilisateur doit choisir explicitement, et les séries restent
        // vides tant qu'aucun exercice n'est choisi.
        target.name = "";
        target.sets = [];
        draft.exercises = exs;
        saveJSON(KEYS.draft, draft);
        renderContent();
        scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${card.dataset.id}"]`));
      });
    });

    card.querySelectorAll("[data-cardio-category-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (card.dataset.category === btn.dataset.cardioCategoryBtn) return;
        const exs = serializeExercisesFromDOM();
        const target = exs.find((e) => e.id === card.dataset.id);
        target.category = btn.dataset.cardioCategoryBtn;
        // Les catégories Cardio se comportent toutes pareil pour l'instant :
        // elles servent uniquement à préremplir le titre par défaut, que
        // l'utilisateur peut toujours modifier librement ensuite.
        const cat = CARDIO_CATEGORIES.find((c) => c.key === target.category);
        target.name = cat ? cat.label : target.name;
        draft.exercises = exs;
        saveJSON(KEYS.draft, draft);
        renderContent();
        scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${card.dataset.id}"]`));
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
          // Repart entièrement à zéro : rien n'est présélectionné, l'utilisateur
          // choisit la catégorie puis l'exercice lui-même à son rythme.
          target.category = "";
          target.name = "";
          target.sets = [];
        } else {
          // Cardio : catégorie repart à zéro (aucune des catégories Muscu ne
          // s'applique ici), le nom reste libre (texte). On s'assure juste
          // qu'il y a au moins une ligne à remplir si aucune série n'existait
          // déjà.
          target.category = "";
          if (target.sets.length === 0) {
            target.sets = [{ id: uid(), weight: "", reps: "" }];
          }
        }
        draft.exercises = exs;
        saveJSON(KEYS.draft, draft);
        renderContent();
        scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${card.dataset.id}"]`));
      });
    });
    card.querySelectorAll("[data-toggle-exercise]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.toggleExercise;
        // On sauvegarde d'abord l'état actuel du DOM (via le repli déjà en
        // place dans serializeExercisesFromDOM pour les cartes réduites)
        // avant de changer l'état réduit/développé, pour ne perdre aucune
        // saisie en cours sur les AUTRES exercices.
        draft.exercises = serializeExercisesFromDOM();
        const isCurrentlyOpen = openExerciseIds[id] !== false;
        openExerciseIds[id] = !isCurrentlyOpen;
        saveJSON(KEYS.draft, draft);
        renderContent();
        // On ne scrolle que si on vient de DÉVELOPPER (pas en réduisant) :
        // le contenu qui se révèle en dessous doit rester accessible avec un
        // repère stable en haut, comme pour les autres sélections.
        if (isCurrentlyOpen === false) {
          scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${id}"]`));
        }
      });
    });
    card.querySelector("[data-remove-ex]").addEventListener("click", () => {
      const exs = serializeExercisesFromDOM();
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
    const addSetBtn = card.querySelector("[data-add-set]");
    if (addSetBtn) {
      addSetBtn.addEventListener("click", () => {
        const exs = serializeExercisesFromDOM();
        const exerciseId = card.dataset.id;
        const target = exs.find((e) => e.id === exerciseId);
        const lastSet = target.sets[target.sets.length - 1];
        target.sets.push({
          id: uid(),
          weight: lastSet ? lastSet.weight : "",
          reps: lastSet ? lastSet.reps : "",
          weightMode: lastSet ? lastSet.weightMode : "off",
        });
        draft.exercises = exs;
        saveJSON(KEYS.draft, draft);
        renderContent();
        // La carte a été reconstruite par renderContent() : on la retrouve
        // par son id (l'ancienne référence "card" n'existe plus dans le DOM),
        // puis on aligne son bas avec le bas de l'écran.
        const updatedCard = document.querySelector(`.exercise-card[data-id="${exerciseId}"]`);
        scrollCardBottomIntoView(updatedCard);
      });
    }

    card.querySelector("[data-drag-handle]").addEventListener("pointerdown", (e) => startDragExercise(e, card));
  });
}

function attachLogActionsBarListeners() {
  const dateEl = document.getElementById("log-date");
  const labelEl = document.getElementById("log-label");

  document.getElementById("add-exercise-btn").addEventListener("click", () => {
    const exs = serializeExercisesFromDOM();
    // Réduit tous les exercices déjà présents : le nouvel exercice devient le
    // seul développé, au centre de l'attention, sans avoir à scroller parmi
    // les autres pour le retrouver.
    exs.forEach((e) => {
      openExerciseIds[e.id] = false;
    });
    const newExercise = emptyExercise();
    exs.push(newExercise);
    draft.exercises = exs;
    saveJSON(KEYS.draft, draft);
    renderContent();
    const newCard = document.querySelector(`.exercise-card[data-id="${newExercise.id}"]`);
    scrollCardBottomIntoView(newCard);
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

    if (calendarReturnTarget) {
      returnToCalendar();
      return;
    }
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
