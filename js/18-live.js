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
    autoFinishLiveSetIfInProgress();
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
      autoFinishLiveSetIfInProgress();
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
  ensureLiveRestTicking();
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

  const stepHTML = liveStep === "category" ? liveCategoryStepHTML() : liveLogSetStepHTML();
  // Le bloc de statut (gros chrono, bien visible) s'affiche en haut du
  // contenu sur N'IMPORTE QUEL écran du Live tant qu'un repos OU une série
  // est en cours — pas seulement sur l'écran de saisie — puisqu'on peut très
  // bien être en train de choisir le prochain exercice pendant qu'on
  // récupère, ou avoir laissé le chrono de la série tourner en arrière-plan.
  content.innerHTML = liveStatusHeroHTML() + stepHTML;
  attachLiveStepListeners();
  ensureLiveRestTicking();
  const timeline = document.getElementById("live-timeline");
  if (timeline) {
    timeline.scrollLeft = wasAtEnd ? timeline.scrollWidth : prevScrollLeft;
  }
}

// Gros bloc de statut, bien visible (contrairement à l'ancien indicateur
// minuscule dans l'en-tête) — reste à l'écran en permanence tant qu'un
// repos OU une série est en cours (voir startLiveRestManually / startLiveSet
// / finishLiveSet) :
// - pendant un repos : "Repos" + le chrono de repos.
// - pendant une série en cours ("Débuter" tapé, "Finir" pas encore) : le nom
//   de l'exercice + le temps écoulé depuis le début de cette série.
// Absent uniquement quand ni l'un ni l'autre n'est en cours (état "prêt",
// avant la toute première série par exemple).
function liveStatusHeroHTML() {
  if (!liveSession) return "";
  if (liveSession.restStartedAt) {
    return `
    <div class="live-rest-hero" id="live-rest-hero">
      <div class="live-rest-hero-label">${ICONS.stopwatch} Repos</div>
      <div class="live-rest-hero-value" id="live-rest-chrono">00:00</div>
    </div>`;
  }
  if (liveSession.setInProgressStartedAt) {
    return `
    <div class="live-rest-hero live-rest-hero-active" id="live-rest-hero">
      <div class="live-rest-hero-label">${ICONS.play} ${liveDraftName || "Série en cours"}</div>
      <div class="live-rest-hero-value" id="live-rest-chrono">00:00</div>
    </div>`;
  }
  return "";
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
                // Nom et badge de comptage dans deux éléments distincts
                // (plutôt qu'une seule chaîne concaténée) pour que le CSS
                // puisse styler le badge indépendamment (petite pastille),
                // sans jamais toucher au texte du nom lui-même.
                const badgeHTML = already ? `<span class="live-exercise-btn-badge">${already.sets.length}</span>` : "";
                return `<button type="button" class="live-btn ${already ? "has-progress" : ""}" data-live-exercise="${c.name.replace(/"/g, "&quot;")}"><span class="live-exercise-btn-name">${c.name}</span>${badgeHTML}</button>`;
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
  // startLiveSet) — on le consomme immédiatement pour qu'il ne rejoue
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
      // Repos affiché entre deux puces = uniquement le repos réellement
      // MESURÉ manuellement ("Débuter la série" arrête le repos en cours et
      // l'attache à cette série) — pas de calcul automatique. Absent si le
      // repos n'a pas été chronométré pour cette série-là.
      const restBadge =
        set.restSec !== undefined && set.restSec !== null
          ? `<div class="live-timeline-rest">${ICONS.stopwatch}<span>${formatLiveChrono(set.restSec)}</span></div>`
          : "";
      return `
        ${restBadge}
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

// Phase dans laquelle se trouve la série en cours de préparation :
// - "in-progress" : "Débuter la série" a été tapé, on est en train de la
//   faire physiquement — plus rien à saisir, juste "Finir la série" à
//   taper une fois fait.
// - "ready" (sinon, qu'on soit en repos ou non) : le poids/reps affichés
//   sont modifiables, prêts à être lancés via "Débuter la série".
function liveSetPhase() {
  if (liveSession && liveSession.setInProgressStartedAt) return "in-progress";
  return "ready";
}

function liveMuscuSetFormHTML(activeExercise) {
  const phase = liveSetPhase();
  const lastSet = activeExercise && activeExercise.sets.length ? activeExercise.sets[activeExercise.sets.length - 1] : null;

  if (phase === "in-progress") {
    return `
      <div class="live-set-form">
        <div class="live-set-form-scroll">
          <div class="live-exercise-name">${liveDraftName}</div>
          <div class="live-in-progress-banner">Série en cours${lastSet ? ` : ${lastSet.weight}kg × ${lastSet.reps}` : ""}</div>
          ${lastSet && lastSet.restSec != null ? `<div class="live-prev-set">Repos avant cette série : ${formatLiveChrono(lastSet.restSec)}</div>` : ""}
        </div>
        <div class="live-set-form-actions">
          <button type="button" class="live-validate-btn live-finish-btn" data-live-finish-set>${ICONS.stop} Finir la série</button>
          <button type="button" class="live-post-btn" style="background:var(--surface); border:1px solid var(--border); color:var(--text); padding:13px;" data-live-change-exercise>${ICONS.chevron} Changer d'exercice</button>
        </div>
      </div>`;
  }

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

  return `
    <div class="live-set-form">
      <div class="live-set-form-scroll">
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
      </div>
      <div class="live-set-form-actions">
        <button type="button" class="live-validate-btn" data-live-start-set ${finalWeight === null ? "disabled" : ""}>${ICONS.play} Débuter la série</button>
        <button type="button" class="live-post-btn" style="background:var(--surface); border:1px solid var(--border); color:var(--text); padding:13px;" data-live-change-exercise>${ICONS.chevron} Changer d'exercice</button>
      </div>
    </div>`;
}

function liveCardioSetFormHTML(activeExercise) {
  const phase = liveSetPhase();
  const lastSet = activeExercise && activeExercise.sets.length ? activeExercise.sets[activeExercise.sets.length - 1] : null;

  if (phase === "in-progress") {
    return `
      <div class="live-set-form">
        <div class="live-set-form-scroll">
          <div class="live-exercise-name">${liveDraftName}</div>
          <div class="live-in-progress-banner">Série en cours${lastSet ? ` : ${lastSet.weight}min${lastSet.reps ? "/" + lastSet.reps + "km" : ""}` : ""}</div>
          ${lastSet && lastSet.restSec != null ? `<div class="live-prev-set">Repos avant cette série : ${formatLiveChrono(lastSet.restSec)}</div>` : ""}
        </div>
        <div class="live-set-form-actions">
          <button type="button" class="live-validate-btn live-finish-btn" data-live-finish-set>${ICONS.stop} Finir la série</button>
          <button type="button" class="live-post-btn" style="background:var(--surface); border:1px solid var(--border); color:var(--text); padding:13px;" data-live-change-exercise>${ICONS.chevron} Changer d'exercice</button>
        </div>
      </div>`;
  }

  const duration = liveDraftDuration || 0;
  const distance = liveDraftDistance || 0;
  return `
    <div class="live-set-form">
      <div class="live-set-form-scroll">
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
      </div>
      <div class="live-set-form-actions">
        <button type="button" class="live-validate-btn" data-live-start-set ${duration === 0 ? "disabled" : ""}>${ICONS.play} Débuter la série</button>
        <button type="button" class="live-post-btn" style="background:var(--surface); border:1px solid var(--border); color:var(--text); padding:13px;" data-live-change-exercise>${ICONS.chevron} Changer d'exercice</button>
      </div>
    </div>`;
}

function computeNextLiveBaseWeight(name, currentBaseWeight) {
  if (currentBaseWeight === null) return currentBaseWeight;
  const config = findExerciseConfig(name);
  if (!config) return currentBaseWeight;
  // L'incrément automatique d'une série à l'autre est désormais optionnel,
  // réglable par exercice dans Paramètres > Salle de sport (off par défaut) :
  // certaines personnes préfèrent enchaîner plusieurs séries au même poids
  // plutôt que de monter systématiquement d'un palier.
  if (!config.autoIncrement) return currentBaseWeight;
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
  // Ces informations doivent être capturées AVANT toute suppression,
  // pendant qu'elles reflètent encore l'état réel de la série qu'on est en
  // train de retirer.
  const isLastEntry = idx === liveSession.log.length - 1;
  const wasInProgress = isLastEntry && !!liveSession.setInProgressStartedAt;
  const wasJustFinishedAndResting = isLastEntry && !wasInProgress && !!liveSession.restStartedAt;
  const exercise = liveSession.exercises.find((e) => e.id === entry.exerciseId);
  const deletedSet = exercise ? exercise.sets.find((s) => s.id === entry.setId) || null : null;

  // Si la série supprimée n'est PAS la dernière de la frise, le repos qui
  // lui avait été attaché (mesuré avant elle) doit être reversé à la série
  // suivante — sinon ce temps de repos disparaîtrait purement et
  // simplement. Résultat : le repos affiché entre la série précédente et la
  // série suivante redevient correct, comme si celle du milieu (avec son
  // exercice, le cas échéant) n'avait jamais existé.
  if (!isLastEntry && deletedSet && deletedSet.restSec) {
    const nextEntry = liveSession.log[idx + 1];
    if (nextEntry) {
      const nextExercise = liveSession.exercises.find((e) => e.id === nextEntry.exerciseId);
      const nextSet = nextExercise ? nextExercise.sets.find((s) => s.id === nextEntry.setId) : null;
      if (nextSet) {
        nextSet.restSec = (nextSet.restSec || 0) + deletedSet.restSec;
      }
    }
  }

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

  // Cas 1 : on supprime la série qu'on est justement en train de faire
  // ("Débuter la série" tapé, "Finir la série" pas encore) — la suppression
  // vaut annulation de cette série : elle n'a jamais eu lieu. On renvoie
  // alors en mode repos, comme si "Débuter la série" n'avait jamais été
  // tapé — en reprenant le compteur là où il en était juste avant (le repos
  // qui avait été mesuré et attaché à cette série, s'il y en avait un),
  // plutôt que de simplement revenir à un état neutre sans repos.
  if (wasInProgress) {
    liveSession.setInProgressStartedAt = null;
    const resumeRestSec = deletedSet && deletedSet.restSec ? deletedSet.restSec : 0;
    liveSession.restStartedAt = Date.now() - resumeRestSec * 1000;
  }
  // Cas 2 : on supprime la toute dernière série (déjà terminée) alors qu'on
  // est déjà en plein repos après elle — on considère qu'elle n'a en fait
  // jamais été faite. Le repos qui avait été mesuré AVANT cette série (et
  // lui avait été attaché) est alors "rendu" au repos actuellement en
  // cours : on recule d'autant son horodatage de départ, pour qu'il se
  // CUMULE avec le repos déjà écoulé plutôt que de repartir de zéro. Ainsi,
  // quand on tapera vraiment "Débuter la série" pour la suivante, le repos
  // total (avant + après la série supprimée) apparaîtra correctement dans
  // la frise.
  if (wasJustFinishedAndResting && deletedSet && deletedSet.restSec) {
    liveSession.restStartedAt -= deletedSet.restSec * 1000;
  }

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

// ---------- Chrono de repos (manuel) ----------
// Le repos ne démarre JAMAIS tout seul : c'est "Finir la série" qui le
// lance. Il ne s'arrête que via "Débuter la série" (la série suivante), qui
// récupère au passage la durée mesurée pour l'attacher à cette série.
// L'horodatage de départ est conservé sur liveSession (donc persistant si
// l'app se ferme accidentellement en plein repos) ; la durée mesurée à
// l'arrêt est stockée dans liveDraftRestSec en attendant d'être attachée à
// la série qu'on démarre.
let liveRestChronoInterval = null;

// Démarre le repos. Appelée uniquement depuis applyFinishLiveSet() — jamais
// directement par un bouton dédié.
function startLiveRestManually() {
  if (!liveSession || liveSession.restStartedAt) return;
  liveSession.restStartedAt = Date.now();
  saveJSON(KEYS.liveSession, liveSession);
}

// Arrête le repos en cours (s'il y en a un) et mémorise la durée mesurée
// dans liveDraftRestSec, pour l'attacher à la série qu'on est en train de
// démarrer (voir startLiveSet). Ne redessine pas l'écran elle-même.
function stopLiveRestManually() {
  if (!liveSession || !liveSession.restStartedAt) return;
  const restSec = Math.max(0, Math.round((Date.now() - liveSession.restStartedAt) / 1000));
  liveDraftRestSec = restSec;
  liveSession.restStartedAt = null;
  saveJSON(KEYS.liveSession, liveSession);
}

// (Re)démarre ou coupe le ticker du gros bloc de statut, selon qu'un repos
// OU une série est actuellement en cours — appelée à chaque rendu de
// l'écran Live (le bloc lui-même n'existe dans le DOM que dans ces deux cas,
// voir liveStatusHeroHTML), pour ne jamais laisser tourner un intervalle
// inutile.
function ensureLiveRestTicking() {
  clearInterval(liveRestChronoInterval);
  if (!liveSession || (!liveSession.restStartedAt && !liveSession.setInProgressStartedAt)) return;
  updateLiveRestChronoDisplay();
  liveRestChronoInterval = setInterval(updateLiveRestChronoDisplay, 1000);
}

function updateLiveRestChronoDisplay() {
  const el = document.getElementById("live-rest-chrono");
  const startedAt = liveSession ? liveSession.restStartedAt || liveSession.setInProgressStartedAt : null;
  if (!el || !startedAt) {
    clearInterval(liveRestChronoInterval);
    return;
  }
  const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
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

// "Débuter la série" : enregistre la série (poids/reps actuellement
// affichés) dans la frise ET compte comme le début de son exécution — puis,
// si un repos était en cours, l'arrête et lui attache sa durée mesurée.
function startLiveSet() {
  if (liveDraftType !== "cardio" && liveDraftBaseWeight === null) return;
  if (liveSetPhase() === "in-progress") return; // déjà démarrée, rien à refaire
  if (liveSession.restStartedAt) stopLiveRestManually();
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
      ? { id: uid(), weight: liveDraftDuration || 0, reps: liveDraftDistance || 0, timestamp: Date.now() }
      : { id: uid(), weight: finalWeight, reps: liveDraftReps, weightMode: liveDraftWeightMode, timestamp: Date.now() };
  // Le repos mesuré manuellement juste avant cette série (s'il y en a eu
  // un) lui est attaché ici, puis consommé — il ne doit pas se réappliquer
  // à la série suivante.
  if (liveDraftRestSec !== null) {
    newSet.restSec = liveDraftRestSec;
    liveDraftRestSec = null;
  }
  exercise.sets.push(newSet);
  if (!liveSession.log) liveSession.log = [];
  liveSession.log.push({ exerciseId: exercise.id, setId: newSet.id });
  liveJustAddedLogIndex = liveSession.log.length - 1;
  liveSession.setInProgressStartedAt = Date.now();
  saveJSON(KEYS.liveSession, liveSession);
  renderLiveStep();
}

// "Finir la série" : ne modifie plus les données de la série (déjà fixées
// au moment de "Débuter la série") — passe juste en mode repos, et prépare
// le palier de poids suggéré pour la prochaine série pendant qu'on récupère.
// La logique elle-même ne redessine rien (voir applyFinishLiveSet) : c'est
// finishLiveSet() (bouton) qui s'en charge, pour pouvoir aussi être
// appliquée silencieusement depuis un contexte qui va de toute façon
// redessiner juste après (voir autoFinishLiveSetIfInProgress).
function applyFinishLiveSet() {
  if (!liveSession.setInProgressStartedAt) return;
  liveSession.setInProgressStartedAt = null;
  // Pour la prochaine série, on propose automatiquement le palier de base
  // disponible juste au-dessus (progression naturelle d'une série à
  // l'autre), sauf si on est déjà au maximum disponible. Les reps restent
  // inchangées — seul le poids avance. Le mode Standard/+Xkg est conservé
  // tel quel, sans y toucher.
  if (liveDraftType !== "cardio") {
    liveDraftBaseWeight = computeNextLiveBaseWeight(liveDraftName, liveDraftBaseWeight);
  }
  startLiveRestManually();
  saveJSON(KEYS.liveSession, liveSession);
}

function finishLiveSet() {
  applyFinishLiveSet();
  renderLiveStep();
}

// Si on quitte l'exercice (changement d'exercice ou retour en arrière) alors
// qu'une série est en cours ("Débuter" tapé mais pas encore "Finir"), on
// considère implicitement qu'elle est terminée — on ne va pas laisser un
// état "en cours" orphelin qui n'aurait plus aucun sens pour un autre
// exercice. Ceci a pour effet, comme un "Finir la série" normal, de lancer
// le repos. Ne redessine rien elle-même : appelée depuis des contextes qui
// redessinent de toute façon juste après (y compris parfois avant que le
// DOM de l'écran Live n'existe encore, ex. juste après avoir rouvert
// l'écran depuis l'accueil).
function autoFinishLiveSetIfInProgress() {
  if (liveSession && liveSession.setInProgressStartedAt) {
    applyFinishLiveSet();
  }
}

function cancelLiveSession() {
  showConfirm(
    "Annuler cette séance en direct ? Toutes les séries déjà enregistrées seront définitivement perdues.",
    () => {
      clearInterval(liveChronoInterval);
      clearInterval(liveRestChronoInterval);
      liveSession = null;
      saveJSON(KEYS.liveSession, null);
      liveStep = "category";
      liveDraftType = "";
      liveDraftCategory = "";
      liveDraftName = "";
      liveActiveExerciseId = null;
      liveDraftRestSec = null;
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
    clearInterval(liveRestChronoInterval);
    liveSession = null;
    saveJSON(KEYS.liveSession, null);
    liveDraftRestSec = null;
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
    clearInterval(liveRestChronoInterval);
    liveSession = null;
    saveJSON(KEYS.liveSession, null);
    liveStep = "category";
    liveDraftType = "";
    liveDraftCategory = "";
    liveDraftName = "";
    liveActiveExerciseId = null;
    liveDraftRestSec = null;

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

  const startSetBtn = content.querySelector("[data-live-start-set]");
  if (startSetBtn) startSetBtn.addEventListener("click", startLiveSet);

  const finishSetBtn = content.querySelector("[data-live-finish-set]");
  if (finishSetBtn) finishSetBtn.addEventListener("click", finishLiveSet);

  const changeExBtn = content.querySelector("[data-live-change-exercise]");
  if (changeExBtn) {
    changeExBtn.addEventListener("click", () => {
      autoFinishLiveSetIfInProgress();
      closeCurrentLiveSegment();
      saveJSON(KEYS.liveSession, liveSession);
      liveActiveExerciseId = null;
      liveStep = "category";
      renderLiveApp();
    });
  }
}
