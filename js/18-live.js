/* ---------- Séance en direct : remplir la séance en s'entraînant ---------- */

function renderLiveApp(freshEntry) {
  app.className = "theme-live";
  // Reprend une séance en cours si elle existe déjà (fermeture accidentelle
  // de l'app en plein entraînement) — sinon en démarre une toute nouvelle.
  if (!liveSession) {
    liveSession = { id: uid(), date: todayISO(), label: "", exercises: [], log: [], startedAt: Date.now(), segments: [] };
    saveJSON(KEYS.liveSession, liveSession);
  }
  // Une entrée "fraîche" (depuis l'accueil) repart toujours de l'étape
  // fusionnée type+catégorie (Muscu par défaut), quelle que soit l'étape où
  // on se trouvait avant une fermeture accidentelle — les séries déjà
  // validées, elles, restent intactes dans liveSession.
  if (freshEntry) {
    liveStep = "category";
    liveDraftType = "muscu";
    liveDraftCategory = "";
    liveDraftName = "";
    liveActiveExerciseId = null;
  }
  app.innerHTML = `
    <div class="live-screen">
      <div class="live-header">
        <button type="button" class="back-btn" data-live-back>${ICONS.back}</button>
        <div class="live-header-center">
          <div class="live-header-chrono live-header-chrono-big" id="live-chrono">00:00</div>
        </div>
        <div class="live-header-actions">
          <button type="button" class="live-cancel-btn" data-live-cancel>Annuler</button>
          <button type="button" class="live-stop-btn" data-live-stop>${ICONS.check} Fin</button>
        </div>
      </div>
      <div class="live-body" id="live-content"></div>
    </div>
  `;
  document.querySelector("[data-live-back]").addEventListener("click", () => {
    if (liveStep === "category") {
      goHome();
      return;
    }
    if (liveStep === "log-set") {
      closeCurrentLiveSegment();
      saveJSON(KEYS.liveSession, liveSession);
      liveActiveExerciseId = null;
      liveStep = "category";
    }
    renderLiveApp();
  });
  document.querySelector("[data-live-stop]").addEventListener("click", finishLiveSession);
  document.querySelector("[data-live-cancel]").addEventListener("click", cancelLiveSession);
  startLiveChrono();
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

  if (liveStep === "category") content.innerHTML = liveCategoryStepHTML();
  else if (liveStep === "log-set") content.innerHTML = liveLogSetStepHTML();
  attachLiveStepListeners();
  const timeline = document.getElementById("live-timeline");
  if (timeline) {
    timeline.scrollLeft = wasAtEnd ? timeline.scrollWidth : prevScrollLeft;
  }
}

function liveCategoryStepHTML() {
  const isCardio = liveDraftType === "cardio";
  const switchHTML = `
    <div class="live-type-switch">
      <div class="live-type-thumb" id="live-type-thumb" style="transform: translateX(${isCardio ? "calc(100% + 6px)" : "0"});"></div>
      <button type="button" class="live-type-switch-btn ${!isCardio ? "active" : ""}" data-live-type-switch="muscu">${ICONS.dumbbell} Muscu</button>
      <button type="button" class="live-type-switch-btn ${isCardio ? "active" : ""}" data-live-type-switch="cardio">${ICONS.stopwatch} Cardio</button>
    </div>`;

  if (isCardio) {
    // Cardio : la catégorie EST déjà le choix final (préremplit le nom), pas
    // de niveau supplémentaire nécessaire — inchangé.
    const categoriesHTML = `
      <div class="live-grid" style="grid-template-columns:1fr 1fr;">
        ${CARDIO_CATEGORIES.map((c) => `<button type="button" class="live-btn" data-live-cardio-category="${c.key}">${c.label}</button>`).join("")}
      </div>`;
    return liveTimelineHTML() + switchHTML + categoriesHTML;
  }

  // Muscu : la catégorie s'affiche en rangée compacte de puces (comme un
  // filtre), sélectionnable et désélectionnable — la reselectionner referme
  // la liste d'exercices sans changer d'écran.
  const categoryRowHTML = `
    <div class="live-subcat-row">
      ${GYM_EXERCISE_CATEGORIES.map((c) => `<button type="button" class="live-subcat-btn ${liveDraftCategory === c.key ? "active" : ""}" data-live-category="${c.key}">${c.label}</button>`).join("")}
    </div>`;

  let exercisesHTML = "";
  if (liveDraftCategory) {
    // Ce drapeau n'est vrai que juste après un changement réel de catégorie
    // — on le consomme immédiatement pour qu'il ne rejoue pas l'animation
    // lors des rendus suivants déclenchés par d'autres interactions (ex.
    // premier appui sur une puce de la frise pour la supprimer).
    const shouldAnimateEnter = liveCategoryJustChanged;
    liveCategoryJustChanged = false;
    const configs = gymExerciseConfigs.filter((c) => (c.category || "pecs") === liveDraftCategory);
    const inner =
      configs.length === 0
        ? `<div class="empty-state">Aucun exercice configuré dans "${categoryLabel(liveDraftCategory)}".<br>Ajoute-en dans Paramètres → Salle de sport.</div>`
        : `<div class="live-grid" style="grid-template-columns:1fr 1fr;">
            ${[...configs]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => {
                const already = liveSession.exercises.find((e) => e.name.trim().toLowerCase() === c.name.trim().toLowerCase());
                const badge = already ? ` (${already.sets.length})` : "";
                return `<button type="button" class="live-btn ${already ? "has-progress" : ""}" data-live-exercise="${c.name.replace(/"/g, "&quot;")}">${c.name}${badge}</button>`;
              })
              .join("")}
          </div>`;
    exercisesHTML = `<div id="live-exercise-list" class="${shouldAnimateEnter ? "live-exercise-list-enter" : ""}" data-category-key="${liveDraftCategory}">${inner}</div>`;
  }

  return liveTimelineHTML() + switchHTML + categoryRowHTML + exercisesHTML;
}

function liveTimelineHTML() {
  if (!liveSession.log || liveSession.log.length === 0) return "";
  // Ce drapeau n'est vrai que juste après un ajout réel (voir
  // validateLiveSet) — on le consomme immédiatement pour qu'il ne rejoue
  // plus l'animation lors des rendus suivants déclenchés par d'autres
  // interactions (changement de catégorie, toggle, etc.), ce qui donnait
  // l'impression que la dernière puce "clignotait" à chaque clic.
  const enterIdx = liveJustAddedLogIndex;
  liveJustAddedLogIndex = null;
  const chips = liveSession.log
    .map((entry, idx) => {
      const ex = liveSession.exercises.find((e) => e.id === entry.exerciseId);
      if (!ex) return "";
      const set = ex.sets.find((s) => s.id === entry.setId);
      if (!set) return "";
      const valueLabel = ex.exType === "cardio" ? `${set.weight}min${set.reps ? "/" + set.reps + "km" : ""}` : `${set.weight}kg×${set.reps}`;
      const confirming = idx === liveTimelineConfirmIndex;
      return `
        <div class="live-timeline-chip ${confirming ? "confirm-delete" : ""} ${idx === enterIdx ? "live-timeline-chip-enter" : ""}" data-live-timeline-chip="${idx}">
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
  const increment = hasIncrement ? config.maxIncrement : 0;
  const baseOnly = config ? computeBaseWeightsOnly(config) : [];
  // Le menu déroulant ne liste et ne sélectionne QUE des paliers réellement
  // configurés — le toggle Standard/+Xkg juste en dessous ne modifie jamais
  // cette liste ni la valeur sélectionnée, il s'ajoute simplement par-dessus
  // au moment de calculer le poids final.
  const weightList = [...baseOnly];
  if (liveDraftBaseWeight !== null && !weightList.includes(liveDraftBaseWeight)) {
    weightList.push(liveDraftBaseWeight);
    weightList.sort((a, b) => a - b);
  }
  const weightOptions = weightList.length
    ? weightList.map((w) => `<option value="${w}" ${liveDraftBaseWeight === w ? "selected" : ""}>${w}kg</option>`).join("")
    : `<option value="">—</option>`;
  const finalWeight = liveDraftBaseWeight !== null ? liveDraftBaseWeight + (liveDraftWeightMode === "on" ? increment : 0) : null;
  const lastSet = activeExercise && activeExercise.sets.length ? activeExercise.sets[activeExercise.sets.length - 1] : null;

  return `
    <div class="live-set-form">
      <div class="live-exercise-name">${liveDraftName}</div>
      ${lastSet ? `<div class="live-prev-set">Précédent : ${lastSet.weight}kg × ${lastSet.reps}</div>` : ""}
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
            ? `<button type="button" class="increment-switch-btn live-increment-btn ${liveDraftWeightMode === "on" ? "active" : ""}" data-live-toggle-increment>${liveDraftWeightMode === "on" ? "+" + increment + "kg" : "Standard"}</button>`
            : ""
        }
      </div>
      <button type="button" class="live-validate-btn" data-live-validate-set ${finalWeight === null ? "disabled" : ""}>${ICONS.plus} Série suivante</button>
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

function computeNextLiveBaseWeight(name, currentBaseWeight) {
  if (currentBaseWeight === null) return currentBaseWeight;
  const config = findExerciseConfig(name);
  if (!config) return currentBaseWeight;
  const baseList = [...computeBaseWeightsOnly(config)].sort((a, b) => a - b);
  const idx = baseList.indexOf(currentBaseWeight);
  // Si le poids actuel ne correspond à aucun palier connu, ou si on est déjà
  // au palier le plus haut disponible, on ne change rien.
  if (idx === -1 || idx >= baseList.length - 1) return currentBaseWeight;
  return baseList[idx + 1];
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
      const norm = exercise.name.trim().toLowerCase();
      liveSession.exercises = liveSession.exercises.filter((e) => e.id !== exercise.id);
      // L'exercice n'existant plus, son suivi de temps (segments) n'a plus
      // lieu d'être — qu'il soit déjà clos ou encore EN COURS (si on
      // supprime l'exercice qu'on est justement en train de faire). Sans ce
      // nettoyage, un segment resterait ouvert indéfiniment (jamais refermé
      // par la suite, puisque l'exercice n'existe plus pour déclencher sa
      // fermeture), ou du temps orphelin traînerait sans jamais être
      // affiché nulle part.
      if (liveSession.segments) {
        liveSession.segments = liveSession.segments.filter((s) => s.name.trim().toLowerCase() !== norm);
      }
      if (liveActiveExerciseId === exercise.id) {
        liveActiveExerciseId = null;
        liveStep = "category";
      }
    }
    // Suppression partielle (il reste d'autres séries) : on laisse les
    // segments de temps intacts — le temps passé sur l'exercice reste réel,
    // seule une série mal saisie a été retirée.
  }
  liveSession.log.splice(idx, 1);
  saveJSON(KEYS.liveSession, liveSession);
  liveTimelineConfirmIndex = null;
  clearTimeout(liveTimelineConfirmTimer);
  renderLiveApp();
}

function formatLiveDuration(totalSeconds) {
  if (totalSeconds == null) return "";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}min` : `${m}min ${String(s).padStart(2, "0")}s`;
}

// Compatibilité avec les séances déjà archivées avant ce changement, qui
// n'ont qu'une durée en minutes arrondies (durationMin) plutôt qu'en
// secondes précises (durationSec) — on affiche alors sans les secondes,
// plutôt que de ne rien afficher du tout.
function getSessionDurationSeconds(s) {
  if (s.durationSec != null) return s.durationSec;
  if (s.durationMin != null) return s.durationMin * 60;
  return null;
}

function getExerciseDurationSeconds(ex) {
  if (ex.durationSec != null) return ex.durationSec;
  if (ex.durationMin != null) return ex.durationMin * 60;
  return null;
}

let liveChronoInterval = null;

function startLiveChrono() {
  clearInterval(liveChronoInterval);
  updateLiveChronoDisplay();
  liveChronoInterval = setInterval(updateLiveChronoDisplay, 1000);
}

function updateLiveChronoDisplay() {
  const el = document.getElementById("live-chrono");
  if (!el || !liveSession || !liveSession.startedAt) {
    clearInterval(liveChronoInterval);
    return;
  }
  const elapsedSec = Math.max(0, Math.floor((Date.now() - liveSession.startedAt) / 1000));
  el.textContent = formatLiveChrono(elapsedSec);
}

function formatLiveChrono(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Suivi du temps réellement passé sur chaque exercice : à chaque fois qu'on
// entre sur un exercice (nouveau ou repris), on ferme le segment en cours
// (s'il y en a un) et on en ouvre un nouveau. À la fin de la séance, on
// additionne les segments par nom d'exercice pour obtenir sa durée totale.
function closeCurrentLiveSegment() {
  if (!liveSession.segments) liveSession.segments = [];
  const openSeg = liveSession.segments.find((s) => s.end === null);
  if (openSeg) openSeg.end = Date.now();
}

function openLiveSegment(name, exType) {
  if (!liveSession.segments) liveSession.segments = [];
  liveSession.segments.push({ name, exType, start: Date.now(), end: null });
}

function startOrResumeLiveExercise() {
  closeCurrentLiveSegment();
  openLiveSegment(liveDraftName, liveDraftType);
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
      const config = findExerciseConfig(liveDraftName);
      const increment = config && config.maxIncrement ? config.maxIncrement : 0;
      // Le poids sauvegardé sur la dernière série est le poids FINAL (base +
      // incrément le cas échéant) — on en déduit le palier de base réel
      // avant de calculer le palier suivant, pour ne jamais faire avancer le
      // menu déroulant sur une valeur incrémentée qui n'existe pas dans sa
      // liste.
      const lastBaseWeight = lastSet ? parseFloat(lastSet.weight) - (liveDraftWeightMode === "on" ? increment : 0) : null;
      liveDraftBaseWeight = computeNextLiveBaseWeight(liveDraftName, lastBaseWeight);
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
      liveDraftBaseWeight = base.length ? base[0] : null;
      liveDraftReps = 10;
      liveDraftWeightMode = "off";
    }
  }
  liveStep = "log-set";
  renderLiveApp();
}

function validateLiveSet() {
  if (liveDraftType !== "cardio" && liveDraftBaseWeight === null) return;
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
  // Le poids final sauvegardé est la somme du palier réellement sélectionné
  // dans le menu et de l'incrément le cas échéant — jamais l'inverse.
  const config = findExerciseConfig(liveDraftName);
  const increment = config && config.maxIncrement ? config.maxIncrement : 0;
  const finalWeight = liveDraftType === "cardio" ? null : liveDraftBaseWeight + (liveDraftWeightMode === "on" ? increment : 0);
  const newSet =
    liveDraftType === "cardio"
      ? { id: uid(), weight: liveDraftDuration || 0, reps: liveDraftDistance || 0 }
      : { id: uid(), weight: finalWeight, reps: liveDraftReps, weightMode: liveDraftWeightMode };
  exercise.sets.push(newSet);
  if (!liveSession.log) liveSession.log = [];
  liveSession.log.push({ exerciseId: exercise.id, setId: newSet.id });
  liveJustAddedLogIndex = liveSession.log.length - 1;
  saveJSON(KEYS.liveSession, liveSession);
  // Pour la prochaine série, on propose automatiquement le palier de base
  // disponible juste au-dessus (progression naturelle d'une série à
  // l'autre), sauf si on est déjà au maximum disponible. Les reps restent
  // inchangées — seul le poids avance. Le mode Standard/+Xkg est conservé
  // tel quel, sans y toucher.
  if (liveDraftType !== "cardio") {
    liveDraftBaseWeight = computeNextLiveBaseWeight(liveDraftName, liveDraftBaseWeight);
  }
  // On reste volontairement sur le même écran, prêt pour la série suivante
  // (poids/reps conservés tels quels) — pas de reconstruction complète de la
  // page. La confirmation visuelle vient désormais de la nouvelle puce qui
  // apparaît dans la frise, plus besoin d'un message texte séparé.
  renderLiveStep();
}

function cancelLiveSession() {
  showConfirm(
    "Annuler cette séance en direct ? Toutes les séries déjà enregistrées seront définitivement perdues.",
    () => {
      clearInterval(liveChronoInterval);
      liveSession = null;
      saveJSON(KEYS.liveSession, null);
      liveStep = "category";
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
    clearInterval(liveChronoInterval);
    liveSession = null;
    saveJSON(KEYS.liveSession, null);
    goHome();
    return;
  }
  showConfirm("Terminer et enregistrer cette séance ?", () => {
    closeCurrentLiveSegment();
    const totalDurationSec = liveSession.startedAt ? Math.round((Date.now() - liveSession.startedAt) / 1000) : null;
    // Additionne, pour chaque exercice, la somme de ses segments de temps
    // (utile en cas de reprise multiple d'un même exercice en superset).
    const withDurations = cleaned.map((ex) => {
      const norm = ex.name.trim().toLowerCase();
      const totalMs = (liveSession.segments || [])
        .filter((s) => s.name.trim().toLowerCase() === norm && s.end !== null)
        .reduce((sum, s) => sum + (s.end - s.start), 0);
      return { ...ex, durationSec: Math.round(totalMs / 1000) };
    });

    const otherCount = sessions.length;
    const session = {
      id: uid(),
      date: liveSession.date,
      label: liveSession.label || `Séance ${otherCount + 1}`,
      exercises: withDurations,
      planned: false,
      durationSec: totalDurationSec,
    };
    sessions = [session, ...sessions];
    library = Array.from(new Set([...library, ...cleaned.map((e) => e.name)])).sort((a, b) => a.localeCompare(b));
    saveJSON(KEYS.sessions, sessions);
    saveJSON(KEYS.library, library);

    clearInterval(liveChronoInterval);
    liveSession = null;
    saveJSON(KEYS.liveSession, null);
    liveStep = "category";
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

  content.querySelectorAll("[data-live-type-switch]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const newType = btn.dataset.liveTypeSwitch;
      if (liveDraftType === newType) return;
      liveDraftType = newType;
      // On anime d'abord le curseur sur l'élément DOM déjà présent (pour que
      // la transition CSS glisse vraiment), puis on ne reconstruit le
      // contenu (catégories) qu'une fois le glissement visuellement
      // terminé — sinon tout changerait d'un coup, en même temps que le
      // glissement, ce qui casserait l'effet.
      const thumb = document.getElementById("live-type-thumb");
      if (thumb) {
        thumb.style.transform = `translateX(${newType === "cardio" ? "calc(100% + 6px)" : "0"})`;
        setTimeout(() => renderLiveApp(), 220);
      } else {
        renderLiveApp();
      }
    });
  });

  content.querySelectorAll("[data-live-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.liveCategory;
      // On capture l'ancienne liste d'exercices AVANT de changer d'état, pour
      // l'animer en sortie (glissement vers la gauche) pendant que la
      // nouvelle liste entre par la droite. renderLiveApp() reconstruit tout
      // l'écran (pas juste le contenu) : une copie simplement rattachée au
      // même parent serait détruite instantanément. On la détache donc
      // complètement, positionnée en fixe aux coordonnées exactes de
      // l'écran, pour qu'elle survive à la reconstruction et s'anime
      // par-dessus pendant que le nouveau contenu apparaît en dessous.
      const oldList = document.getElementById("live-exercise-list");
      if (oldList) {
        const rect = oldList.getBoundingClientRect();
        const clone = oldList.cloneNode(true);
        clone.removeAttribute("id");
        clone.classList.remove("live-exercise-list-enter");
        clone.classList.add("live-exercise-list-exit");
        clone.style.position = "fixed";
        clone.style.top = rect.top + "px";
        clone.style.left = rect.left + "px";
        clone.style.width = rect.width + "px";
        document.body.appendChild(clone);
        clone.addEventListener("animationend", () => clone.remove(), { once: true });
      }
      // Re-cliquer sur la catégorie déjà active la désélectionne et referme
      // la liste d'exercices, sans changer d'écran.
      liveDraftCategory = liveDraftCategory === key ? "" : key;
      liveCategoryJustChanged = true;
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
      liveDraftBaseWeight = weightSelect.value === "" ? null : parseFloat(weightSelect.value);
      renderLiveApp();
    });
  }

  const incToggle = content.querySelector("[data-live-toggle-increment]");
  if (incToggle) {
    incToggle.addEventListener("click", () => {
      // Le toggle ne change QUE le mode — il ne touche jamais au poids de
      // base sélectionné dans le menu, ni à sa liste d'options.
      liveDraftWeightMode = liveDraftWeightMode === "on" ? "off" : "on";
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
      closeCurrentLiveSegment();
      saveJSON(KEYS.liveSession, liveSession);
      liveActiveExerciseId = null;
      liveStep = "category";
      renderLiveApp();
    });
  }
}
