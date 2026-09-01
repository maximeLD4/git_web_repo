/* ---------- Séance en direct : remplir la séance en s'entraînant ---------- */

function renderLiveApp(freshEntry) {
  app.className = "theme-live";
  // Reprend une séance en cours si elle existe déjà (fermeture accidentelle
  // de l'app en plein entraînement) — sinon en démarre une toute nouvelle.
  if (!liveSession) {
    liveSession = { id: uid(), date: todayISO(), label: "", exercises: [], log: [] };
    saveJSON(KEYS.liveSession, liveSession);
  }
  // Une entrée "fraîche" (depuis l'accueil) repart toujours de l'étape de
  // choix du type, quelle que soit l'étape où on se trouvait avant une
  // fermeture accidentelle — les séries déjà validées, elles, restent
  // intactes dans liveSession.
  if (freshEntry) {
    liveStep = "type";
    liveDraftType = "";
    liveDraftCategory = "";
    liveDraftName = "";
    liveActiveExerciseId = null;
  }
  const titles = {
    type: "Quel type d'exercice ?",
    category: liveDraftType === "cardio" ? "Quelle catégorie ?" : "Quel groupe musculaire ?",
    exercise: "Quel exercice ?",
    "log-set": liveDraftName || "Enregistre ta série",
  };
  app.innerHTML = `
    <div class="live-screen">
      <div class="live-header">
        <button type="button" class="back-btn" data-live-back>${ICONS.back}</button>
        <div class="live-header-title">${titles[liveStep] || ""}</div>
        <div class="live-header-actions">
          <button type="button" class="live-cancel-btn" data-live-cancel>Annuler</button>
          <button type="button" class="live-stop-btn" data-live-stop>${ICONS.check} Fin</button>
        </div>
      </div>
      <div class="live-body" id="live-content"></div>
    </div>
  `;
  document.querySelector("[data-live-back]").addEventListener("click", () => {
    if (liveStep === "type") {
      goHome();
      return;
    }
    if (liveStep === "category") {
      liveStep = "type";
    } else if (liveStep === "exercise") {
      liveStep = "category";
    } else if (liveStep === "log-set") {
      liveActiveExerciseId = null;
      liveStep = "type";
    }
    renderLiveApp();
  });
  document.querySelector("[data-live-stop]").addEventListener("click", finishLiveSession);
  document.querySelector("[data-live-cancel]").addEventListener("click", cancelLiveSession);
  renderLiveStep();
}

function renderLiveStep() {
  const content = document.getElementById("live-content");
  const prevTimeline = document.getElementById("live-timeline");
  // On ne force le défilement tout à droite que si l'utilisateur y était déjà
  // (cas normal après validation d'une série) — s'il avait scrollé vers la
  // gauche pour taper sur une ancienne puce, on préserve sa position plutôt
  // que de la faire disparaître au moment où il tente de la supprimer.
  const wasAtEnd = prevTimeline ? prevTimeline.scrollLeft + prevTimeline.clientWidth >= prevTimeline.scrollWidth - 4 : true;
  const prevScrollLeft = prevTimeline ? prevTimeline.scrollLeft : null;

  if (liveStep === "type") content.innerHTML = liveTypeStepHTML();
  else if (liveStep === "category") content.innerHTML = liveCategoryStepHTML();
  else if (liveStep === "exercise") content.innerHTML = liveExerciseStepHTML();
  else if (liveStep === "log-set") content.innerHTML = liveLogSetStepHTML();
  attachLiveStepListeners();
  const timeline = document.getElementById("live-timeline");
  if (timeline) {
    timeline.scrollLeft = wasAtEnd ? timeline.scrollWidth : prevScrollLeft;
  }
}

function liveTypeStepHTML() {
  return `
    <div class="live-grid" style="grid-template-columns:1fr;">
      <button type="button" class="live-btn" style="font-size:19px; padding:26px;" data-live-type="muscu">${ICONS.dumbbell} Muscu</button>
      <button type="button" class="live-btn" style="font-size:19px; padding:26px;" data-live-type="cardio">${ICONS.stopwatch} Cardio</button>
    </div>`;
}

function liveCategoryStepHTML() {
  if (liveDraftType === "cardio") {
    return `
      <div class="live-grid" style="grid-template-columns:1fr 1fr;">
        ${CARDIO_CATEGORIES.map((c) => `<button type="button" class="live-btn" data-live-cardio-category="${c.key}">${c.label}</button>`).join("")}
      </div>`;
  }
  return `
    <div class="live-grid" style="grid-template-columns:1fr 1fr;">
      ${GYM_EXERCISE_CATEGORIES.map((c) => `<button type="button" class="live-btn" data-live-category="${c.key}">${c.label}</button>`).join("")}
    </div>`;
}

function liveExerciseStepHTML() {
  const configs = gymExerciseConfigs.filter((c) => (c.category || "pecs") === liveDraftCategory);
  if (configs.length === 0) {
    return `<div class="empty-state">Aucun exercice configuré dans "${categoryLabel(liveDraftCategory)}".<br>Ajoute-en dans Paramètres → Salle de sport.</div>`;
  }
  return `
    <div class="live-grid" style="grid-template-columns:1fr 1fr;">
      ${[...configs]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => {
          const already = liveSession.exercises.find((e) => e.name.trim().toLowerCase() === c.name.trim().toLowerCase());
          const badge = already ? ` (${already.sets.length})` : "";
          return `<button type="button" class="live-btn ${already ? "has-progress" : ""}" data-live-exercise="${c.name.replace(/"/g, "&quot;")}">${c.name}${badge}</button>`;
        })
        .join("")}
    </div>`;
}

function liveTimelineHTML() {
  if (!liveSession.log || liveSession.log.length === 0) return "";
  const chips = liveSession.log
    .map((entry, idx) => {
      const ex = liveSession.exercises.find((e) => e.id === entry.exerciseId);
      if (!ex) return "";
      const set = ex.sets.find((s) => s.id === entry.setId);
      if (!set) return "";
      const valueLabel = ex.exType === "cardio" ? `${set.weight}min${set.reps ? "/" + set.reps + "km" : ""}` : `${set.weight}kg×${set.reps}`;
      const confirming = idx === liveTimelineConfirmIndex;
      return `
        <div class="live-timeline-chip ${confirming ? "confirm-delete" : ""}" data-live-timeline-chip="${idx}">
          <span class="ex">${ex.name}</span>
          <span class="val">${valueLabel}</span>
          <div class="live-timeline-delete-overlay">${ICONS.trash}</div>
        </div>`;
    })
    .join("");
  return `<div class="live-timeline" id="live-timeline">${chips}</div>`;
}

function liveLogSetStepHTML() {
  const activeExercise = liveSession.exercises.find((e) => e.id === liveActiveExerciseId);
  const form = liveDraftType === "cardio" ? liveCardioSetFormHTML(activeExercise) : liveMuscuSetFormHTML(activeExercise);
  return liveTimelineHTML() + form;
}

function liveMuscuSetFormHTML(activeExercise) {
  const config = findExerciseConfig(liveDraftName);
  const hasIncrement = !!config && config.maxIncrement > 0;
  const baseOnly = config ? computeBaseWeightsOnly(config) : [];
  const incremented = config ? computeIncrementedWeightsOnly(config) : [];
  const activeList = hasIncrement && liveDraftWeightMode === "on" ? incremented : baseOnly;
  const weightList = [...activeList];
  if (liveDraftWeight !== null && !weightList.includes(liveDraftWeight)) {
    weightList.push(liveDraftWeight);
    weightList.sort((a, b) => a - b);
  }
  const weightOptions = weightList.length
    ? weightList.map((w) => `<option value="${w}" ${liveDraftWeight === w ? "selected" : ""}>${w}kg</option>`).join("")
    : `<option value="">—</option>`;
  const lastSet = activeExercise && activeExercise.sets.length ? activeExercise.sets[activeExercise.sets.length - 1] : null;

  return `
    <div class="live-set-form">
      <div class="live-exercise-name">${liveDraftName}</div>
      ${lastSet ? `<div class="live-prev-set">Précédent : ${lastSet.weight}kg × ${lastSet.reps}</div>` : ""}
      <div id="live-flash-slot"></div>
      <div class="live-stepper-group">
        <div class="live-stepper-label">Répétitions</div>
        <div class="live-stepper">
          <button type="button" class="live-stepper-btn" data-live-reps-minus aria-label="Moins">−</button>
          <div class="live-stepper-value">${liveDraftReps}</div>
          <button type="button" class="live-stepper-btn" data-live-reps-plus aria-label="Plus">+</button>
        </div>
      </div>
      <div class="live-stepper-group">
        <div class="live-stepper-label">Poids</div>
        <select class="live-weight-select" id="live-weight-select" ${weightList.length === 0 ? "disabled" : ""}>${weightOptions}</select>
        ${
          hasIncrement
            ? `<button type="button" class="increment-switch-btn live-increment-btn ${liveDraftWeightMode === "on" ? "active" : ""}" data-live-toggle-increment>${liveDraftWeightMode === "on" ? "+" + config.maxIncrement + "kg" : "Standard"}</button>`
            : ""
        }
      </div>
      <button type="button" class="live-validate-btn" data-live-validate-set ${liveDraftWeight === null ? "disabled" : ""}>${ICONS.plus} Série suivante</button>
      <button type="button" class="live-post-btn" style="background:var(--surface); border:1px solid var(--border); color:var(--text); padding:13px;" data-live-change-exercise>${ICONS.chevron} Changer d'exercice</button>
    </div>`;
}

function liveCardioSetFormHTML(activeExercise) {
  const duration = liveDraftDuration || 0;
  const distance = liveDraftDistance || 0;
  const lastSet = activeExercise && activeExercise.sets.length ? activeExercise.sets[activeExercise.sets.length - 1] : null;
  return `
    <div class="live-set-form">
      <div class="live-exercise-name">${liveDraftName}</div>
      ${lastSet ? `<div class="live-prev-set">Précédent : ${lastSet.weight}min${lastSet.reps ? " · " + lastSet.reps + "km" : ""}</div>` : ""}
      <div id="live-flash-slot"></div>
      <div class="live-stepper-group">
        <div class="live-stepper-label">Durée (minutes)</div>
        <div class="live-stepper">
          <button type="button" class="live-stepper-btn" data-live-duration-minus aria-label="Moins">−</button>
          <div class="live-stepper-value">${duration} min</div>
          <button type="button" class="live-stepper-btn" data-live-duration-plus aria-label="Plus">+</button>
        </div>
      </div>
      <div class="live-stepper-group">
        <div class="live-stepper-label">Distance (km, optionnel)</div>
        <div class="live-stepper">
          <button type="button" class="live-stepper-btn" data-live-distance-minus aria-label="Moins">−</button>
          <div class="live-stepper-value">${distance.toFixed(1)} km</div>
          <button type="button" class="live-stepper-btn" data-live-distance-plus aria-label="Plus">+</button>
        </div>
      </div>
      <button type="button" class="live-validate-btn" data-live-validate-set ${duration === 0 ? "disabled" : ""}>${ICONS.plus} Passage suivant</button>
      <button type="button" class="live-post-btn" style="background:var(--surface); border:1px solid var(--border); color:var(--text); padding:13px;" data-live-change-exercise>${ICONS.chevron} Changer d'exercice</button>
    </div>`;
}

function computeNextLiveWeight(name, currentWeight, mode) {
  if (currentWeight === null) return currentWeight;
  const config = findExerciseConfig(name);
  if (!config) return currentWeight;
  const activeList = [...(mode === "on" ? computeIncrementedWeightsOnly(config) : computeBaseWeightsOnly(config))].sort((a, b) => a - b);
  const idx = activeList.indexOf(currentWeight);
  // Si le poids actuel ne correspond à aucun palier connu, ou si on est déjà
  // au palier le plus haut disponible, on ne change rien.
  if (idx === -1 || idx >= activeList.length - 1) return currentWeight;
  return activeList[idx + 1];
}

function deleteLiveTimelineEntry(idx) {
  const entry = liveSession.log[idx];
  if (!entry) return;
  const exercise = liveSession.exercises.find((e) => e.id === entry.exerciseId);
  if (exercise) {
    exercise.sets = exercise.sets.filter((s) => s.id !== entry.setId);
    // Si l'exercice n'a plus aucune série après cette suppression, on le
    // retire aussi complètement de la séance — pas d'exercice vide qui
    // traîne. Si c'était l'exercice actif, on repart au choix du type.
    if (exercise.sets.length === 0) {
      liveSession.exercises = liveSession.exercises.filter((e) => e.id !== exercise.id);
      if (liveActiveExerciseId === exercise.id) {
        liveActiveExerciseId = null;
        liveStep = "type";
      }
    }
  }
  liveSession.log.splice(idx, 1);
  saveJSON(KEYS.liveSession, liveSession);
  liveTimelineConfirmIndex = null;
  clearTimeout(liveTimelineConfirmTimer);
  renderLiveApp();
}

function startOrResumeLiveExercise() {
  const norm = liveDraftName.trim().toLowerCase();
  const existing = liveSession.exercises.find((e) => e.name.trim().toLowerCase() === norm);
  if (existing) {
    liveActiveExerciseId = existing.id;
    const lastSet = existing.sets.length ? existing.sets[existing.sets.length - 1] : null;
    if (existing.exType === "cardio") {
      liveDraftDuration = lastSet ? parseFloat(lastSet.weight) || 0 : 0;
      liveDraftDistance = lastSet ? parseFloat(lastSet.reps) || 0 : 0;
    } else {
      liveDraftWeightMode = lastSet ? lastSet.weightMode || "off" : "off";
      const lastWeight = lastSet ? parseFloat(lastSet.weight) : null;
      liveDraftWeight = computeNextLiveWeight(liveDraftName, lastWeight, liveDraftWeightMode);
      liveDraftReps = lastSet ? parseFloat(lastSet.reps) || 10 : 10;
    }
  } else {
    // Nouvel exercice pour cette séance : pas encore ajouté à
    // liveSession.exercises, on attend la validation de la première série.
    liveActiveExerciseId = null;
    if (liveDraftType === "cardio") {
      liveDraftDuration = 0;
      liveDraftDistance = 0;
    } else {
      const config = findExerciseConfig(liveDraftName);
      const base = config ? computeBaseWeightsOnly(config) : [];
      liveDraftWeight = base.length ? base[0] : null;
      liveDraftReps = 10;
      liveDraftWeightMode = "off";
    }
  }
  liveStep = "log-set";
  renderLiveApp();
}

function validateLiveSet() {
  if (liveDraftType !== "cardio" && liveDraftWeight === null) return;
  let exercise = liveSession.exercises.find((e) => e.id === liveActiveExerciseId);
  if (!exercise) {
    exercise = {
      id: uid(),
      name: liveDraftName,
      exType: liveDraftType,
      category: liveDraftCategory,
      sets: [],
    };
    liveSession.exercises.push(exercise);
    liveActiveExerciseId = exercise.id;
  }
  const newSet =
    liveDraftType === "cardio"
      ? { id: uid(), weight: liveDraftDuration || 0, reps: liveDraftDistance || 0 }
      : { id: uid(), weight: liveDraftWeight, reps: liveDraftReps, weightMode: liveDraftWeightMode };
  exercise.sets.push(newSet);
  if (!liveSession.log) liveSession.log = [];
  liveSession.log.push({ exerciseId: exercise.id, setId: newSet.id });
  saveJSON(KEYS.liveSession, liveSession);
  // Pour la prochaine série, on propose automatiquement le palier de poids
  // disponible juste au-dessus (progression naturelle d'une série à
  // l'autre), sauf si on est déjà au maximum disponible. Les reps restent
  // inchangées — seul le poids avance.
  if (liveDraftType !== "cardio") {
    liveDraftWeight = computeNextLiveWeight(liveDraftName, liveDraftWeight, liveDraftWeightMode);
  }
  // On reste volontairement sur le même écran, prêt pour la série suivante
  // (poids/reps conservés tels quels) — pas de reconstruction complète de la
  // page, juste une confirmation brève qui disparaît toute seule.
  renderLiveStep();
  const flashSlot = document.getElementById("live-flash-slot");
  if (flashSlot) {
    flashSlot.innerHTML = `<div class="flash">${ICONS.check} Enregistrée</div>`;
    setTimeout(() => {
      const f = document.getElementById("live-flash-slot");
      if (f) f.innerHTML = "";
    }, 1200);
  }
}

function cancelLiveSession() {
  showConfirm(
    "Annuler cette séance en direct ? Toutes les séries déjà enregistrées seront définitivement perdues.",
    () => {
      liveSession = null;
      saveJSON(KEYS.liveSession, null);
      liveStep = "type";
      liveDraftType = "";
      liveDraftCategory = "";
      liveDraftName = "";
      liveActiveExerciseId = null;
      goHome();
    },
    { confirmLabel: "Annuler la séance", danger: true }
  );
}

function finishLiveSession() {
  const cleaned = (liveSession.exercises || []).filter((e) => e.sets.length > 0);
  if (cleaned.length === 0) {
    // Rien d'enregistré cette fois-ci : on quitte simplement, sans créer de
    // séance vide.
    liveSession = null;
    saveJSON(KEYS.liveSession, null);
    goHome();
    return;
  }
  showConfirm("Terminer et enregistrer cette séance ?", () => {
    const otherCount = sessions.length;
    const session = {
      id: uid(),
      date: liveSession.date,
      label: liveSession.label || `Séance ${otherCount + 1}`,
      exercises: cleaned,
      planned: false,
    };
    sessions = [session, ...sessions];
    library = Array.from(new Set([...library, ...cleaned.map((e) => e.name)])).sort((a, b) => a.localeCompare(b));
    saveJSON(KEYS.sessions, sessions);
    saveJSON(KEYS.library, library);

    liveSession = null;
    saveJSON(KEYS.liveSession, null);
    liveStep = "type";
    liveDraftType = "";
    liveDraftCategory = "";
    liveDraftName = "";
    liveActiveExerciseId = null;

    goHome();
  });
}

function attachLiveStepListeners() {
  const content = document.getElementById("live-content");
  if (!content) return;

  content.querySelectorAll("[data-live-timeline-chip]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const idx = parseInt(chip.dataset.liveTimelineChip, 10);
      clearTimeout(liveTimelineConfirmTimer);
      if (liveTimelineConfirmIndex === idx) {
        // 2e appui sur la même puce : suppression effective, après un bref
        // flash "très rouge" pour confirmer visuellement l'action.
        chip.classList.add("deleting");
        setTimeout(() => deleteLiveTimelineEntry(idx), 220);
      } else {
        // 1er appui (ou appui sur une autre puce pendant qu'une était déjà
        // en attente) : passe cette puce en mode confirmation, avec 2
        // secondes pour confirmer avant annulation automatique.
        liveTimelineConfirmIndex = idx;
        liveTimelineConfirmTimer = setTimeout(() => {
          liveTimelineConfirmIndex = null;
          renderLiveStep();
        }, 2000);
        renderLiveStep();
      }
    });
  });

  content.querySelectorAll("[data-live-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      liveDraftType = btn.dataset.liveType;
      liveStep = "category";
      renderLiveApp();
    });
  });

  content.querySelectorAll("[data-live-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      liveDraftCategory = btn.dataset.liveCategory;
      liveStep = "exercise";
      renderLiveApp();
    });
  });

  content.querySelectorAll("[data-live-cardio-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = CARDIO_CATEGORIES.find((c) => c.key === btn.dataset.liveCardioCategory);
      liveDraftCategory = btn.dataset.liveCardioCategory;
      liveDraftName = cat ? cat.label : "";
      startOrResumeLiveExercise();
    });
  });

  content.querySelectorAll("[data-live-exercise]").forEach((btn) => {
    btn.addEventListener("click", () => {
      liveDraftName = btn.dataset.liveExercise;
      startOrResumeLiveExercise();
    });
  });

  const repsMinus = content.querySelector("[data-live-reps-minus]");
  const repsPlus = content.querySelector("[data-live-reps-plus]");
  if (repsMinus) repsMinus.addEventListener("click", () => { liveDraftReps = Math.max(0, liveDraftReps - 1); renderLiveApp(); });
  if (repsPlus) repsPlus.addEventListener("click", () => { liveDraftReps = liveDraftReps + 1; renderLiveApp(); });

  const weightSelect = content.querySelector("#live-weight-select");
  if (weightSelect) {
    weightSelect.addEventListener("change", () => {
      liveDraftWeight = weightSelect.value === "" ? null : parseFloat(weightSelect.value);
    });
  }

  const incToggle = content.querySelector("[data-live-toggle-increment]");
  if (incToggle) {
    incToggle.addEventListener("click", () => {
      const config = findExerciseConfig(liveDraftName);
      const inc = (config && config.maxIncrement) || 0;
      const newMode = liveDraftWeightMode === "on" ? "off" : "on";
      const base = liveDraftWeightMode === "on" ? (liveDraftWeight || 0) - inc : liveDraftWeight || 0;
      liveDraftWeightMode = newMode;
      liveDraftWeight = newMode === "on" ? base + inc : base;
      renderLiveApp();
    });
  }

  const durMinus = content.querySelector("[data-live-duration-minus]");
  const durPlus = content.querySelector("[data-live-duration-plus]");
  if (durMinus) durMinus.addEventListener("click", () => { liveDraftDuration = Math.max(0, (liveDraftDuration || 0) - 1); renderLiveApp(); });
  if (durPlus) durPlus.addEventListener("click", () => { liveDraftDuration = (liveDraftDuration || 0) + 1; renderLiveApp(); });

  const distMinus = content.querySelector("[data-live-distance-minus]");
  const distPlus = content.querySelector("[data-live-distance-plus]");
  if (distMinus) distMinus.addEventListener("click", () => { liveDraftDistance = Math.max(0, Math.round(((liveDraftDistance || 0) - 0.1) * 10) / 10); renderLiveApp(); });
  if (distPlus) distPlus.addEventListener("click", () => { liveDraftDistance = Math.round(((liveDraftDistance || 0) + 0.1) * 10) / 10; renderLiveApp(); });

  const validateBtn = content.querySelector("[data-live-validate-set]");
  if (validateBtn) validateBtn.addEventListener("click", validateLiveSet);

  const changeExBtn = content.querySelector("[data-live-change-exercise]");
  if (changeExBtn) {
    changeExBtn.addEventListener("click", () => {
      liveActiveExerciseId = null;
      liveStep = "type";
      renderLiveApp();
    });
  }
}
