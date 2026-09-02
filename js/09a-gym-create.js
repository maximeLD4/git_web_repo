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
        const weightMode = weightEl ? weightEl.dataset.mode || "off" : "off";
        // Le menu déroulant ne contient jamais que le palier de base réel —
        // le poids final sauvegardé est cette valeur, plus l'incrément si le
        // mode +Xkg est actif (jamais l'inverse). Pour les lignes Cardio,
        // l'attribut data-increment est absent, incVal vaut alors 0 et le
        // calcul redonne simplement la valeur saisie telle quelle.
        const baseVal = weightEl && weightEl.value !== "" ? parseFloat(weightEl.value) : "";
        const incVal = weightEl ? parseFloat(weightEl.dataset.increment) || 0 : 0;
        const finalWeight = baseVal === "" ? "" : weightMode === "on" ? baseVal + incVal : baseVal;
        sets.push({
          id: row.dataset.id,
          weight: finalWeight,
          reps: repsEl ? repsEl.value : "",
          // Mode explicite (Standard/"off" ou +Xkg/"on") lu directement depuis
          // le sélecteur — on ne le redéduit JAMAIS depuis la seule valeur
          // numérique du poids, car celle-ci peut être ambiguë (ex. un
          // incrément de 10kg avec des paliers espacés de 10kg : "30kg" peut
          // être le palier 30 en standard, OU le palier 20 + 10 incrémenté).
          weightMode,
        });
      });
    }
    result.push({ id, name, exType, category, sets, ...(existing && existing.durationSec != null ? { durationSec: existing.durationSec } : {}) });
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

function findExerciseConfig(name) {
  const norm = (name || "").trim().toLowerCase();
  if (!norm) return null;
  return gymExerciseConfigs.find((c) => c.name.trim().toLowerCase() === norm) || null;
}

function computeBaseWeightsOnly(config) {
  if (!config || !config.baseWeights) return [];
  return [...new Set(config.baseWeights.map((b) => Math.round(b * 100) / 100))].sort((a, b) => a - b);
}

function computeIncrementedWeightsOnly(config) {
  if (!config || !config.baseWeights || !config.maxIncrement) return [];
  const inc = config.maxIncrement;
  return [...new Set(config.baseWeights.map((b) => Math.round((b + inc) * 100) / 100))].sort((a, b) => a - b);
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
          const currentBaseWeight = currentWeight === null ? null : startsIncremented ? currentWeight - effectiveConfig.maxIncrement : currentWeight;
          const weightList = [...baseOnlyWeights];
          if (currentBaseWeight !== null && !weightList.includes(currentBaseWeight)) {
            weightList.push(currentBaseWeight);
            weightList.sort((a, b) => a - b);
          }
          const weightOptions = weightList.length
            ? weightList.map((w) => `<option value="${w}" ${currentBaseWeight === w ? "selected" : ""}>${w}kg</option>`).join("")
            : `<option value="">—</option>`;
          const incrementToggle = hasIncrement
            ? `<button type="button" class="increment-switch-btn ${startsIncremented ? "active" : ""}" data-increment-switch data-mode="${startsIncremented ? "on" : "off"}" data-increment-value="${effectiveConfig.maxIncrement}">${startsIncremented ? "+" + effectiveConfig.maxIncrement + "kg" : "Standard"}</button>`
            : "";
          const weightField = `
        <div class="set-weight-col">
          <select class="set-weight" data-mode="${startsIncremented ? "on" : "off"}" data-increment="${effectiveConfig ? effectiveConfig.maxIncrement || 0 : 0}" ${weightList.length === 0 ? "disabled" : ""}>${weightOptions}</select>
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
        renderContentPreservingScroll(renderContent, () => scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${card.dataset.id}"]`)));
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
        renderContentPreservingScroll(renderContent, () => scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${card.dataset.id}"]`)));
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
        renderContentPreservingScroll(renderContent, () => scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${card.dataset.id}"]`)));
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

          switchBtn.dataset.mode = mode;
          switchBtn.classList.toggle("active", mode === "on");
          switchBtn.textContent = mode === "on" ? `+${incValue}kg` : "Standard";

          // Le menu déroulant ne change JAMAIS de liste ni de sélection ici —
          // seul le mode change.
          weightSelect.dataset.mode = mode;
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
        renderContentPreservingScroll(renderContent, () => scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${card.dataset.id}"]`)));
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
        // On ne scrolle que si on vient de DÉVELOPPER (pas en réduisant) :
        // le contenu qui se révèle en dessous doit rester accessible avec un
        // repère stable en haut, comme pour les autres sélections.
        if (isCurrentlyOpen === false) {
          renderContentPreservingScroll(renderContent, () => {
            const updatedCard = document.querySelector(`.exercise-card[data-id="${id}"]`);
            if (updatedCard) updatedCard.classList.add("exercise-card-toggle-anim");
            scrollCardTopIntoView(updatedCard);
          });
        } else {
          renderContentPreservingScroll(renderContent, () => {
            const updatedCard = document.querySelector(`.exercise-card[data-id="${id}"]`);
            if (updatedCard) updatedCard.classList.add("exercise-card-toggle-anim");
          });
        }
      });
    });
    card.querySelector("[data-remove-ex]").addEventListener("click", () => {
      card.classList.add("exercise-card-exit");
      setTimeout(() => {
        const exs = serializeExercisesFromDOM();
        draft.exercises = exs.filter((e) => e.id !== card.dataset.id);
        saveJSON(KEYS.draft, draft);
        renderContent();
      }, 200);
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
        // On retrouve la carte par son id après le rendu (l'ancienne
        // référence "card" n'existe plus dans le DOM), puis on aligne son
        // bas avec le bas de l'écran.
        renderContentPreservingScroll(renderContent, () => {
          const updatedCard = document.querySelector(`.exercise-card[data-id="${exerciseId}"]`);
          scrollCardBottomIntoView(updatedCard);
        });
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
    renderContentPreservingScroll(renderContent, () => {
      const newCard = document.querySelector(`.exercise-card[data-id="${newExercise.id}"]`);
      if (newCard) newCard.classList.add("exercise-card-enter");
      scrollCardBottomIntoView(newCard);
    });
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
    const session = {
      id: editingSessionId || uid(),
      date: dateEl.value,
      label: sessionLabel,
      exercises: cleaned,
      planned,
      ...(existingSession && existingSession.durationSec != null ? { durationSec: existingSession.durationSec } : {}),
    };
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

