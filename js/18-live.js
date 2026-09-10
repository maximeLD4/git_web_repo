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
    if (liveSession) liveSession.loop = null;
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
      liveSession.loop = null;
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

  const stepHTML = livePlanPickerNeeded() ? livePlanPickerStepHTML() : liveStep === "category" ? liveCategoryStepHTML() : liveLogSetStepHTML();
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
  const loop = liveSession.loop;
  if (liveSession.restStartedAt) {
    const label = loop ? `${ICONS.stopwatch} Repos — Tour ${loop.currentRound}/${loop.rounds}` : `${ICONS.stopwatch} Repos`;
    return `
    <div class="live-rest-hero" id="live-rest-hero">
      <div class="live-rest-hero-label">${label}</div>
      <div class="live-rest-hero-value" id="live-rest-chrono">00:00</div>
    </div>`;
  }
  if (liveSession.setInProgressStartedAt) {
    const label = loop ? `${ICONS.play} Travail — Tour ${loop.currentRound}/${loop.rounds}` : `${ICONS.play} ${liveDraftName || "Série en cours"}`;
    return `
    <div class="live-rest-hero live-rest-hero-active" id="live-rest-hero">
      <div class="live-rest-hero-label">${label}</div>
      <div class="live-rest-hero-value" id="live-rest-chrono">00:00</div>
    </div>`;
  }
  return "";
}

// Retrouve, dans le plan attaché à la séance en cours (s'il y en a un),
// l'exercice planifié correspondant à ce nom — utilisé pour préremplir
// poids/reps (ou la config de boucle) la toute première fois qu'on démarre
// cet exercice (voir startOrResumeLiveExercise). Après cette première fois,
// c'est l'historique réel de la séance qui prend le relais, pas le plan.
function getAttachedPlanExerciseFor(name) {
  if (!liveSession.planId) return null;
  const plan = sessionPlans.find((p) => p.id === liveSession.planId);
  if (!plan) return null;
  const norm = (name || "").trim().toLowerCase();
  return plan.exercises.find((e) => e.name.trim().toLowerCase() === norm) || null;
}

// Écran affiché une seule fois, tout au début d'une séance neuve (rien
// encore loggé) : proposer d'attacher un plan préparé à l'avance (voir
// l'onglet Créer > Plan), ou de continuer sans. Ne s'affiche jamais si
// aucun plan n'existe, ni après ce premier choix (voir renderLiveStep).
// Ne propose le choix d'un plan qu'une seule fois, tout au début d'une
// séance neuve : rien encore loggé, jamais répondu (planId reste undefined
// tant qu'on n'a rien choisi — null veut dire "explicitement aucun plan"),
// et seulement s'il existe au moins un plan à proposer.
function livePlanPickerNeeded() {
  return liveSession.planId === undefined && (!liveSession.log || liveSession.log.length === 0) && sessionPlans.length > 0;
}

function livePlanPickerStepHTML() {
  const buttons = sessionPlans
    .map((p) => `<button type="button" class="live-btn" data-live-pick-plan="${p.id}"><span class="live-exercise-btn-name">${p.label} · ${p.exercises.length} exo${p.exercises.length !== 1 ? "s" : ""}</span></button>`)
    .join("");
  return `
    <div class="live-set-form">
      <div class="live-set-form-scroll live-set-form-scroll-fixed">
        <div class="live-exercise-name" style="white-space: normal; overflow: visible; text-overflow: clip;">Un plan pour aujourd'hui ?</div>
        <div class="live-grid" style="grid-template-columns:1fr 1fr;">${buttons}</div>
      </div>
      <div class="live-set-form-actions">
        <button type="button" class="live-post-btn" style="background:var(--surface); border:1px solid var(--border); color:var(--text); padding:13px;" data-live-pick-plan="">Aucun plan, je verrai au fur et à mesure</button>
      </div>
    </div>`;
}

// Section "Ton plan" — accès rapide (en grille, dans le désordre) aux
// exercices du plan attaché à la séance en cours, en plus du parcours
// normal par catégorie qui reste entièrement disponible pour tout le reste.
// Un exercice déjà fait au moins une fois cette séance se grise (pas
// désactivé, juste visuellement discret) — voir .plan-done en CSS.
// Un exercice préparé est "fait" seulement quand il a été fait EN ENTIER —
// toutes ses séries cibles pour Muscu/Rameur/Vélo/Course (pas juste la
// 1ère d'une pyramide), ou sa boucle pour le Gainage (dont on ne peut de
// toute façon ressortir vers ce menu qu'une fois finie/arrêtée, voir
// applyFinishLiveSet/checkLiveLoopAutoAdvance/stopLiveLoop) — jamais dès la
// première série.
function isPlanExercisePreparedDone(ex) {
  const liveEx = liveSession.exercises.find((e) => e.name.trim().toLowerCase() === ex.name.trim().toLowerCase());
  if (!liveEx || liveEx.sets.length === 0) return false;
  if (ex.loop) return true;
  const targetCount = ex.sets && ex.sets.length ? ex.sets.length : 1;
  return liveEx.sets.length >= targetCount;
}

function livePlanSectionHTML() {
  if (!liveSession.planId) return "";
  const plan = sessionPlans.find((p) => p.id === liveSession.planId);
  if (!plan) return "";
  let doneCount = 0;
  const buttons = plan.exercises
    .map((ex) => {
      const done = isPlanExercisePreparedDone(ex);
      if (done) doneCount += 1;
      return `<button type="button" class="live-btn ${done ? "plan-done" : ""}" data-live-plan-exercise="${ex.id}"><span class="live-exercise-btn-name">${ex.name}</span></button>`;
    })
    .join("");
  return `
    <div class="live-plan-section">
      <div class="live-plan-section-title">${ICONS.stopwatch} Ton plan : ${plan.label} <span class="live-plan-progress">${doneCount}/${plan.exercises.length}</span></div>
      <div class="live-grid" style="grid-template-columns:1fr 1fr;">${buttons}</div>
    </div>`;
}

function liveCategoryStepHTML() {
  const isCardio = liveDraftType === "cardio";
  const planSectionHTML = livePlanSectionHTML();
  const switchHTML = `
    <div class="live-type-switch">
      <div class="live-type-thumb" id="live-type-thumb" style="transform: translateX(${isCardio ? "100%" : "0"});"></div>
      <button type="button" class="live-type-switch-btn ${!isCardio ? "active" : ""}" data-live-type-switch="muscu">${ICONS.dumbbell} Muscu</button>
      <button type="button" class="live-type-switch-btn ${isCardio ? "active" : ""}" data-live-type-switch="cardio">${ICONS.stopwatch} Cardio/Gainage</button>
    </div>`;

  if (isCardio) {
    // Cardio "simple" (Rameur/Vélo/Course) : la catégorie EST déjà le choix
    // final (préremplit le nom), pas de niveau supplémentaire — inchangé.
    // Gainage fonctionne différemment (comme la Muscu) : c'est une
    // catégorie qu'on sélectionne, révélant en dessous la liste des
    // exercices de gainage nommés/configurés — voir plus bas.
    const allCardioCats = [...CARDIO_CATEGORIES, GAINAGE_CATEGORY];
    const categoriesHTML = `
      <div class="live-grid" style="grid-template-columns:1fr 1fr;">
        ${allCardioCats.map((c) => `<button type="button" class="live-btn ${liveDraftCategory === c.key ? "active" : ""}" data-live-cardio-category="${c.key}">${c.label}</button>`).join("")}
      </div>`;
    let gainageListHTML = "";
    if (liveDraftCategory === GAINAGE_CATEGORY.key) {
      // Même drapeau/consommation qu'en Muscu (voir plus bas) — évite de
      // rejouer l'animation d'entrée à chaque rendu non lié à ce choix.
      const shouldAnimateEnter = liveCategoryJustChanged;
      liveCategoryJustChanged = false;
      // Le gainage n'a pas besoin d'un exercice nommé pour être lancé — au
      // fond, c'est juste une boucle générique (n tours de t1 travail / t2
      // repos), exactement comme Rameur/Vélo/Course n'ont pas besoin d'être
      // configurés au préalable. Un bouton "Gainage" générique est donc
      // toujours proposé en premier, que des exercices nommés (Planche,
      // Superman...) soient configurés ou non — ceux-ci restent de simples
      // raccourcis nommés facultatifs par-dessus, pas un préalable.
      const genericAlready = liveSession.exercises.find((e) => e.name.trim().toLowerCase() === "gainage");
      const genericBadgeHTML = genericAlready ? `<span class="live-exercise-btn-badge">${genericAlready.sets.length}</span>` : "";
      const genericButtonHTML = `<button type="button" class="live-btn ${genericAlready ? "has-progress" : ""}" data-live-exercise="Gainage"><span class="live-exercise-btn-name">Gainage</span>${genericBadgeHTML}</button>`;
      const configuredButtonsHTML = [...gainageExerciseConfigs]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => {
          const already = liveSession.exercises.find((e) => e.name.trim().toLowerCase() === c.name.trim().toLowerCase());
          const badgeHTML = already ? `<span class="live-exercise-btn-badge">${already.sets.length}</span>` : "";
          return `<button type="button" class="live-btn ${already ? "has-progress" : ""}" data-live-exercise="${c.name.replace(/"/g, "&quot;")}"><span class="live-exercise-btn-name">${c.name}</span>${badgeHTML}</button>`;
        })
        .join("");
      const inner = `<div class="live-grid" style="grid-template-columns:1fr 1fr;">${genericButtonHTML}${configuredButtonsHTML}</div>`;
      gainageListHTML = `<div id="live-exercise-list" class="${shouldAnimateEnter ? "live-exercise-list-enter" : ""}">${inner}</div>`;
    }
    return liveTimelineHTML() + planSectionHTML + switchHTML + categoriesHTML + gainageListHTML;
  }

  // Aucun exercice Muscu configuré nulle part : pas la peine de faire
  // choisir une catégorie d'abord pour découvrir ensuite qu'elle est vide
  // elle aussi — direct vers l'invite à configurer (voir aussi le point
  // équivalent pour le Gainage, déjà immédiat puisqu'il n'a pas cette
  // étape de catégorie intermédiaire).
  if (gymExerciseConfigs.length === 0) {
    return (
      liveTimelineHTML() +
      planSectionHTML +
      switchHTML +
      `<div class="empty-state">Aucun exercice de musculation configuré.<br>Configure-en un pour commencer.<button type="button" class="add-exercise-btn configure-exercise-btn" data-live-go-settings>${ICONS.plus} Configurer un exercice</button></div>`
    );
  }

  // Muscu : la catégorie s'affiche en rangée compacte de puces (comme un
  // filtre), sélectionnable et désélectionnable — la reselectionner referme
  // la liste d'exercices sans changer d'écran.
  const categoryRowHTML = `
    <div class="live-subcat-row">
      ${GYM_EXERCISE_CATEGORIES.map((c) => {
        // Même signal visuel qu'en Créer (voir categoryToggleHTML) : une
        // catégorie sans le moindre exercice configuré se grise, mais
        // reste sélectionnable normalement — elle affiche alors l'invite
        // "Configurer un exercice" comme n'importe quelle autre.
        const hasConfigs = gymExerciseConfigs.some((cfg) => (cfg.category || "pecs") === c.key);
        return `<button type="button" class="live-subcat-btn ${liveDraftCategory === c.key ? "active" : ""} ${!hasConfigs ? "needs-setup-btn" : ""}" data-live-category="${c.key}">${c.label}</button>`;
      }).join("")}
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
        ? `<div class="empty-state">Aucun exercice configuré dans "${categoryLabel(liveDraftCategory)}".<br>Configure-en un pour commencer.<button type="button" class="add-exercise-btn configure-exercise-btn" data-live-go-settings>${ICONS.plus} Configurer un exercice</button></div>`
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

  return liveTimelineHTML() + planSectionHTML + switchHTML + categoryRowHTML + exercisesHTML;
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
      // Le cardio en cours est un placeholder tant que "Finir la série"
      // n'a pas été tapé (durée chronométrée en temps réel, voir
      // applyFinishLiveSet) — afficher "0min" serait trompeur.
      const isInProgressCardioPlaceholder = ex.exType === "cardio" && idx === liveSession.log.length - 1 && !!liveSession.setInProgressStartedAt;
      const valueLabel = isInProgressCardioPlaceholder
        ? "en cours..."
        : ex.exType === "cardio"
          ? `${formatCardioDuration(set.weight)}${set.reps ? "/" + set.reps + "km" : ""}`
          : `${set.weight}kg×${set.reps}`;
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
  const sets = activeExercise ? activeExercise.sets : [];
  // Le gainage se travaille uniquement au temps — pas de distance à
  // proposer (contrairement à Rameur/Vélo/Course), et c'est le seul type
  // d'exercice où le minuteur en boucle a du sens (voir plus bas).
  const isGainage = liveDraftCategory === GAINAGE_CATEGORY.key;
  const loop = liveSession.loop;
  // En cours, la dernière entrée est le PLACEHOLDER de la série en train de
  // se faire (durée/distance pas encore connues, voir startLiveSet) — pas
  // une vraie série précédente. Le "Précédent" affiché doit donc pointer
  // juste avant lui dans ce cas, jamais sur lui-même.
  const inProgressSet = phase === "in-progress" && sets.length ? sets[sets.length - 1] : null;
  const lastSet = phase === "in-progress" ? (sets.length > 1 ? sets[sets.length - 2] : null) : sets.length ? sets[sets.length - 1] : null;

  // Boucle active (travail OU repos) : plus aucun bouton manuel — le chrono
  // (décompte) et le numéro de tour sont déjà affichés en haut par
  // liveStatusHeroHTML, ici on ne montre que la progression et un moyen
  // d'arrêter proprement.
  if (loop) {
    const workingNow = !!liveSession.setInProgressStartedAt;
    return `
      <div class="live-set-form">
        <div class="live-set-form-scroll">
          <div class="live-exercise-name">${liveDraftName}</div>
          <div class="live-in-progress-banner">${workingNow ? "Travail" : "Repos"} — Tour ${loop.currentRound}/${loop.rounds}</div>
        </div>
        <div class="live-set-form-actions">
          <button type="button" class="live-validate-btn live-finish-btn" data-live-stop-loop>${ICONS.stop} Arrêter la boucle</button>
          <button type="button" class="live-post-btn" style="background:var(--surface); border:1px solid var(--border); color:var(--text); padding:13px;" data-live-change-exercise>${ICONS.chevron} Changer d'exercice</button>
        </div>
      </div>`;
  }

  if (phase === "in-progress") {
    const distance = liveDraftDistance || 0;
    return `
      <div class="live-set-form">
        <div class="live-set-form-scroll">
          <div class="live-exercise-name">${liveDraftName}</div>
          <div class="live-in-progress-banner">Chrono en cours</div>
          ${inProgressSet && inProgressSet.restSec != null ? `<div class="live-prev-set">Repos avant cette série : ${formatLiveChrono(inProgressSet.restSec)}</div>` : ""}
          ${
            isGainage
              ? ""
              : `<div class="live-stepper-group">
            <div class="live-stepper-label">Distance (km, optionnel)</div>
            <div class="live-stepper">
              <button type="button" class="live-stepper-btn" data-live-distance-minus aria-label="Moins">−</button>
              <div class="live-stepper-value">${distance.toFixed(1)} km</div>
              <button type="button" class="live-stepper-btn" data-live-distance-plus aria-label="Plus">+</button>
            </div>
          </div>`
          }
        </div>
        <div class="live-set-form-actions">
          <button type="button" class="live-validate-btn live-finish-btn" data-live-finish-set>${ICONS.stop} Finir la série</button>
          <button type="button" class="live-post-btn" style="background:var(--surface); border:1px solid var(--border); color:var(--text); padding:13px;" data-live-change-exercise>${ICONS.chevron} Changer d'exercice</button>
        </div>
      </div>`;
  }

  // Formulaire de réglage du minuteur en boucle (Gainage) : remplace
  // entièrement l'écran "prêt" tant qu'il est ouvert — Démarrer/Annuler
  // prennent la place de Débuter la série/Changer d'exercice, mêmes styles
  // de bouton, dans la zone fixe du bas. Contenu volontairement minimal
  // (pas de "Précédent" ni de texte d'aide) et défilement désactivé, pour
  // que l'écran tienne sans bouger.
  if (isGainage && liveLoopFormOpen) {
    return `
      <div class="live-set-form">
        <div class="live-set-form-scroll live-set-form-scroll-fixed">
          <div class="live-exercise-name">${liveDraftName}</div>
          ${liveLoopStepperHTML()}
        </div>
        <div class="live-set-form-actions">
          <button type="button" class="live-validate-btn" data-live-start-loop>${ICONS.play} Démarrer la boucle</button>
          <button type="button" class="live-post-btn" style="background:var(--surface); border:1px solid var(--border); color:var(--text); padding:13px;" data-live-cancel-loop-form>Annuler</button>
        </div>
      </div>`;
  }

  return `
    <div class="live-set-form">
      <div class="live-set-form-scroll">
        <div class="live-exercise-name">${liveDraftName}</div>
        ${lastSet ? `<div class="live-prev-set">Précédent : ${formatCardioDuration(lastSet.weight)}${lastSet.reps ? " · " + lastSet.reps + "km" : ""}</div>` : ""}
        <div class="live-prev-set">Le temps est chronométré automatiquement dès que tu débutes.</div>
      </div>
      <div class="live-set-form-actions">
        <button type="button" class="live-validate-btn" data-live-start-set>${ICONS.play} Débuter la série</button>
        ${isGainage ? `<button type="button" class="live-post-btn" style="background:var(--surface); border:1px solid var(--accent); color:var(--accent); padding:13px;" data-live-open-loop-form>${ICONS.stopwatch} Lancer en boucle</button>` : ""}
        <button type="button" class="live-post-btn" style="background:var(--surface); border:1px solid var(--border); color:var(--text); padding:13px;" data-live-change-exercise>${ICONS.chevron} Changer d'exercice</button>
      </div>
    </div>`;
}

// Les trois réglages du minuteur en boucle (Gainage) — tours, durée de
// travail, durée de repos. Saisis à chaque lancement, jamais enregistrés
// (voir conversation) : les valeurs par défaut/précédentes servent juste à
// ne pas repartir de zéro d'une fois sur l'autre dans la même session de
// l'app. Les boutons Démarrer/Annuler vivent dans la zone fixe du bas, pas
// ici (voir liveCardioSetFormHTML).
function liveLoopStepperHTML() {
  return `
    <div class="live-loop-config">
      <div class="live-stepper-group">
        <div class="live-stepper-label">Tours</div>
        <div class="live-stepper">
          <button type="button" class="live-stepper-btn" data-live-loop-rounds-minus aria-label="Moins">−</button>
          <div class="live-stepper-value">${liveLoopDraftRounds}</div>
          <button type="button" class="live-stepper-btn" data-live-loop-rounds-plus aria-label="Plus">+</button>
        </div>
      </div>
      <div class="live-stepper-group">
        <div class="live-stepper-label">Travail (secondes)</div>
        <div class="live-stepper">
          <button type="button" class="live-stepper-btn" data-live-loop-work-minus aria-label="Moins">−</button>
          <div class="live-stepper-value">${liveLoopDraftWork}s</div>
          <button type="button" class="live-stepper-btn" data-live-loop-work-plus aria-label="Plus">+</button>
        </div>
      </div>
      <div class="live-stepper-group">
        <div class="live-stepper-label">Repos (secondes)</div>
        <div class="live-stepper">
          <button type="button" class="live-stepper-btn" data-live-loop-rest-minus aria-label="Moins">−</button>
          <div class="live-stepper-value">${liveLoopDraftRest}s</div>
          <button type="button" class="live-stepper-btn" data-live-loop-rest-plus aria-label="Plus">+</button>
        </div>
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
    // Annuler la série en cours pendant une boucle (Gainage) arrête aussi la
    // boucle — reprendre l'automatisation après une annulation manuelle
    // serait ambigu (retenter le même tour ? passer au suivant ?).
    liveSession.loop = null;
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
// inutile. Fait aussi avancer le minuteur en boucle (Gainage) le cas
// échéant — voir liveTick.
function ensureLiveRestTicking() {
  clearInterval(liveRestChronoInterval);
  if (!liveSession || (!liveSession.restStartedAt && !liveSession.setInProgressStartedAt)) return;
  liveTick();
  liveRestChronoInterval = setInterval(liveTick, 1000);
}

function liveTick() {
  checkLiveLoopAutoAdvance();
  updateLiveRestChronoDisplay();
}

// Le chrono de repos/travail habituel (manuel) compte le temps ÉCOULÉ,
// puisqu'il n'y a pas de durée connue à l'avance. En boucle (Gainage), en
// revanche, la durée de chaque phase est fixée d'avance (voir
// startLiveLoop) — on affiche donc un DÉCOMPTE (temps restant), plus lisible
// pour savoir combien de temps il reste avant le prochain changement.
// Pour Rameur/Vélo/Course préparés via un plan (jamais le Gainage, qui a sa
// propre boucle) : renvoie la durée cible en secondes de la série en cours
// (le placeholder déjà poussé dans exercise.sets par startLiveSet compte
// dans l'index), ou null si cet exercice n'a pas de cible de plan restante
// — auquel cas le chrono compte normalement (voir updateLiveRestChronoDisplay).
function getCurrentCardioTargetSec() {
  if (liveDraftType !== "cardio" || liveSession.loop) return null;
  const exercise = liveSession.exercises.find((e) => e.id === liveActiveExerciseId);
  const planExercise = getAttachedPlanExerciseFor(liveDraftName);
  if (!exercise || !planExercise || !planExercise.sets || !planExercise.sets.length) return null;
  const idx = Math.max(0, exercise.sets.length - 1);
  const target = planExercise.sets[idx];
  if (!target || target.weight === "" || target.weight == null) return null;
  return Math.round(parseFloat(target.weight) * 60);
}

function updateLiveRestChronoDisplay() {
  const el = document.getElementById("live-rest-chrono");
  const startedAt = liveSession ? liveSession.restStartedAt || liveSession.setInProgressStartedAt : null;
  if (!el || !startedAt) {
    clearInterval(liveRestChronoInterval);
    return;
  }
  const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const loop = liveSession.loop;
  if (loop) {
    const totalSec = liveSession.setInProgressStartedAt ? loop.workSec : loop.restSec;
    el.textContent = formatLiveChrono(Math.max(0, totalSec - elapsedSec));
    return;
  }
  if (liveSession.setInProgressStartedAt) {
    const targetSec = getCurrentCardioTargetSec();
    if (targetSec != null) {
      el.textContent = formatLiveChrono(Math.max(0, targetSec - elapsedSec));
      return;
    }
  }
  el.textContent = formatLiveChrono(elapsedSec);
}

// Fait avancer automatiquement le minuteur en boucle (Gainage) : bascule
// du travail vers le repos une fois la durée de travail écoulée, puis du
// repos vers le tour suivant une fois la durée de repos écoulée — jusqu'au
// nombre de tours prévu, où la boucle s'arrête d'elle-même. Ne fait rien si
// aucune boucle n'est en cours (voir startLiveLoop/stopLiveLoop). Les
// signaux sonores/haptiques appelés ici (playLiveRestSignal, etc.) vivent
// dans 19-live-sound.js.
function checkLiveLoopAutoAdvance() {
  const loop = liveSession ? liveSession.loop : null;
  if (!loop) return;
  if (liveSession.setInProgressStartedAt) {
    const elapsed = (Date.now() - liveSession.setInProgressStartedAt) / 1000;
    if (elapsed >= loop.workSec) {
      playLiveRestSignal();
      finishLiveSet();
    }
  } else if (liveSession.restStartedAt) {
    const elapsed = (Date.now() - liveSession.restStartedAt) / 1000;
    if (elapsed >= loop.restSec) {
      if (loop.currentRound >= loop.rounds) {
        // Dernier tour terminé : la boucle s'arrête d'elle-même, on repasse
        // en mode manuel normal (le repos qui vient de s'écouler reste
        // disponible pour être attaché à la prochaine série, comme
        // d'habitude — voir stopLiveRestManually).
        playLiveLoopDoneSignal();
        liveSession.loop = null;
        stopLiveRestManually();
        // Exercice de gainage PRÉPARÉ (via le plan attaché) dont la boucle
        // vient de se terminer entièrement : retour au menu de sélection,
        // comme pour n'importe quel exercice préparé achevé (voir aussi
        // applyFinishLiveSet pour Muscu/Rameur/Vélo/Course).
        const planExercise = getAttachedPlanExerciseFor(liveDraftName);
        if (planExercise && planExercise.loop) {
          closeCurrentLiveSegment();
          liveActiveExerciseId = null;
          liveStep = "category";
        }
        saveJSON(KEYS.liveSession, liveSession);
        renderLiveApp();
      } else {
        playLiveWorkSignal();
        loop.currentRound += 1;
        startLiveSet();
      }
    }
  }
}

// Lance un minuteur en boucle pour l'exercice de gainage actuel : démarre
// immédiatement le premier tour de travail, puis bascule tout seul
// travail/repos jusqu'au nombre de tours prévu (voir checkLiveLoopAutoAdvance).
function startLiveLoop(rounds, workSec, restSec) {
  if (liveSetPhase() === "in-progress") return; // déjà en cours, rien à faire
  liveSession.loop = { rounds, workSec, restSec, currentRound: 1 };
  liveLoopFormOpen = false;
  saveJSON(KEYS.liveSession, liveSession);
  playLiveWorkSignal();
  startLiveSet();
}

// Arrête la boucle en cours à tout moment — ne coupe que l'automatisation,
// pas l'effort naturel qui suit : si un tour était en train de se faire, on
// le finalise avec le temps réellement écoulé (comme un "Finir la série"
// normal, rien n'est perdu), ce qui enchaîne comme d'habitude sur un repos
// — qui, lui, continue bel et bien de tourner (arrêter la boucle ne veut
// pas dire arrêter de se reposer). Si on était déjà en repos au moment
// d'arrêter, il continue simplement tel quel, sans relancer de tour
// suivant. Si l'exercice fait partie du plan attaché (préparé), on
// considère qu'arrêter la boucle vaut "terminé" : retour au menu de
// sélection, comme pour les autres types d'exercices préparés.
function stopLiveLoop() {
  if (!liveSession || !liveSession.loop) return;
  const planExercise = getAttachedPlanExerciseFor(liveDraftName);
  const wasPreparedGainage = !!(planExercise && planExercise.loop);
  liveSession.loop = null;
  if (liveSession.setInProgressStartedAt) {
    applyFinishLiveSet(); // pas finishLiveSet() : un seul rendu, à la toute fin
  }
  if (wasPreparedGainage) {
    closeCurrentLiveSegment();
    liveActiveExerciseId = null;
    liveStep = "category";
  }
  saveJSON(KEYS.liveSession, liveSession);
  renderLiveApp();
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
  // Repart toujours d'un état propre : sans ça, un formulaire de boucle
  // resté ouvert (préréglé pour l'exercice précédent) pourrait s'afficher à
  // tort pour un tout autre exercice de gainage enchaîné sans passer par
  // "Démarrer"/"Annuler" entre les deux.
  liveLoopFormOpen = false;
  const norm = liveDraftName.trim().toLowerCase();
  const existing = liveSession.exercises.find((e) => e.name.trim().toLowerCase() === norm);
  if (existing) {
    liveActiveExerciseId = existing.id;
    const lastSet = existing.sets.length ? existing.sets[existing.sets.length - 1] : null;
    if (existing.exType === "cardio") {
      // Le temps est désormais pris en temps réel (comme pour la muscu, voir
      // startLiveSet/applyFinishLiveSet) — rien à préremplir pour la durée.
      // La distance repart de zéro à chaque série : c'est une mesure propre
      // à CETTE série, pas une valeur qu'on continuerait depuis la
      // précédente.
      liveDraftDistance = 0;
    } else {
      // Si cet exercice fait partie du plan attaché, et qu'il reste une
      // série cible prévue pour ce numéro de série (ex. une pyramide
      // 60×10, 65×8, 70×6), on la propose telle quelle — poids exact défini,
      // pas d'incrément automatique — pour dérouler la progression prévue à
      // l'avance. Une fois les séries du plan épuisées pour cet exercice, on
      // repasse sur la logique habituelle (incrément auto / dernier poids).
      const planExercise = getAttachedPlanExerciseFor(liveDraftName);
      const nextTarget = planExercise && planExercise.sets && existing.sets.length < planExercise.sets.length ? planExercise.sets[existing.sets.length] : null;
      if (nextTarget) {
        liveDraftWeightMode = "off";
        liveDraftBaseWeight = nextTarget.weight !== "" ? parseFloat(nextTarget.weight) : null;
        liveDraftReps = nextTarget.reps !== "" ? parseFloat(nextTarget.reps) || 10 : 10;
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
    }
  } else {
    // Nouvel exercice pour cette séance : pas encore ajouté à
    // liveSession.exercises, on attend la validation de la première série.
    liveActiveExerciseId = null;
    // Si cet exercice fait partie du plan attaché à la séance, on préremplit
    // depuis sa cible plutôt que depuis les valeurs par défaut génériques —
    // seulement cette toute première fois : une fois de vraies séries
    // loggées, c'est la branche ci-dessus (historique réel) qui prend le
    // relais, le plan ne joue plus aucun rôle pour cet exercice.
    const planExercise = getAttachedPlanExerciseFor(liveDraftName);
    if (liveDraftType === "cardio") {
      liveDraftDistance = 0;
      if (planExercise && planExercise.loop) {
        liveLoopDraftRounds = planExercise.loop.rounds;
        liveLoopDraftWork = planExercise.loop.workSec;
        liveLoopDraftRest = planExercise.loop.restSec;
        // Ouvre directement l'écran de confirmation de la boucle, déjà
        // prérempli — prêt à lancer, comme demandé.
        liveLoopFormOpen = true;
      }
    } else {
      const config = findExerciseConfig(liveDraftName);
      const base = config ? computeBaseWeightsOnly(config) : [];
      const targetSet = planExercise && planExercise.sets && planExercise.sets.length ? planExercise.sets[0] : null;
      liveDraftBaseWeight = targetSet && targetSet.weight !== "" ? parseFloat(targetSet.weight) : base.length ? base[0] : null;
      liveDraftReps = targetSet && targetSet.reps !== "" ? parseFloat(targetSet.reps) || 10 : 10;
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
      ? // Placeholder : la durée n'est pas encore connue (chronométrée en
        // temps réel, voir applyFinishLiveSet) — elle sera complétée à
        // "Finir la série", tout comme la distance éventuellement saisie
        // entre-temps.
        { id: uid(), weight: 0, reps: 0, timestamp: Date.now() }
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

// "Finir la série" : passe en mode repos. Pour la muscu, les données étaient
// déjà fixées au moment de "Débuter la série" — rien à faire ici sinon
// préparer le palier suggéré pour la suivante. Pour le cardio en revanche,
// la durée est chronométrée en temps réel : c'est ICI qu'on calcule le
// temps réellement écoulé et qu'on complète le placeholder créé au
// démarrage, avec la distance éventuellement saisie entre-temps.
// La logique elle-même ne redessine rien (voir applyFinishLiveSet) : c'est
// finishLiveSet() (bouton) qui s'en charge, pour pouvoir aussi être
// appliquée silencieusement depuis un contexte qui va de toute façon
// redessiner juste après (voir autoFinishLiveSetIfInProgress).
function applyFinishLiveSet() {
  if (!liveSession.setInProgressStartedAt) return;
  const startedAt = liveSession.setInProgressStartedAt;
  liveSession.setInProgressStartedAt = null;
  // Un exercice PRÉPARÉ (via le plan attaché) dont toutes les cibles
  // viennent d'être faites est considéré "terminé" — voir plus bas, où ce
  // drapeau renvoie vers l'écran de sélection (points 3/4 : retour au menu
  // + grisage uniquement quand vraiment fini, pas dès la 1ère série d'une
  // pyramide).
  let preparedExerciseDone = false;
  if (liveDraftType === "cardio") {
    // Le placeholder à compléter est toujours la toute dernière série
    // loggée (voir startLiveSet — on ne peut pas en démarrer une seconde
    // tant que celle-ci est en cours).
    const entry = liveSession.log[liveSession.log.length - 1];
    const exercise = entry ? liveSession.exercises.find((e) => e.id === entry.exerciseId) : null;
    const set = exercise ? exercise.sets.find((s) => s.id === entry.setId) : null;
    if (set) {
      const elapsedMin = Math.max(0, (Date.now() - startedAt) / 60000);
      // Arrondi à la seconde près (pas au dixième de minute) — sinon
      // l'affichage minutes+secondes perdrait jusqu'à 6 secondes de
      // précision à l'enregistrement.
      set.weight = Math.round(elapsedMin * 60) / 60;
      set.reps = liveDraftDistance || 0;
    }
    liveDraftDistance = 0;
    // Rameur/Vélo/Course préparés (jamais le Gainage ici — pas de "sets"
    // cibles pour lui, juste une boucle ; voir checkLiveLoopAutoAdvance/
    // stopLiveLoop pour sa propre détection de fin, plus bas) : une seule
    // "série" suffit généralement à considérer que c'est fait — y compris
    // quand aucun temps/distance cible n'a été renseigné dans le plan (ces
    // deux valeurs sont facultatives à la préparation), auquel cas on
    // considère qu'une seule fois suffit, comme pour une cible chiffrée
    // unique (voir aussi isPlanExercisePreparedDone, même règle).
    if (!liveSession.loop) {
      const planExercise = getAttachedPlanExerciseFor(liveDraftName);
      if (planExercise && planExercise.sets && exercise) {
        const targetCount = planExercise.sets.length || 1;
        if (exercise.sets.length >= targetCount) preparedExerciseDone = true;
      }
    }
  } else {
    // Si cet exercice fait partie du plan attaché, et qu'il reste une série
    // cible prévue pour ce numéro de série (ex. une pyramide 60×10, 65×8,
    // 70×6), on la propose telle quelle — poids exact défini, pas
    // d'incrément automatique — pour dérouler la progression prévue à
    // l'avance. C'est ICI, pas seulement dans startOrResumeLiveExercise,
    // que ça compte le plus : c'est ce qui se déclenche en enchaînant les
    // séries d'affilée sans quitter l'exercice.
    const exercise = liveSession.exercises.find((e) => e.id === liveActiveExerciseId);
    const planExercise = getAttachedPlanExerciseFor(liveDraftName);
    const nextTarget = exercise && planExercise && planExercise.sets && exercise.sets.length < planExercise.sets.length ? planExercise.sets[exercise.sets.length] : null;
    if (nextTarget) {
      liveDraftWeightMode = "off";
      liveDraftBaseWeight = nextTarget.weight !== "" ? parseFloat(nextTarget.weight) : null;
      liveDraftReps = nextTarget.reps !== "" ? parseFloat(nextTarget.reps) || 10 : 10;
    } else {
      // Pour la prochaine série, on propose automatiquement le palier de base
      // disponible juste au-dessus (progression naturelle d'une série à
      // l'autre), sauf si on est déjà au maximum disponible. Les reps restent
      // inchangées — seul le poids avance. Le mode Standard/+Xkg est conservé
      // tel quel, sans y toucher.
      liveDraftBaseWeight = computeNextLiveBaseWeight(liveDraftName, liveDraftBaseWeight);
      // Plus aucune cible prévue par le plan pour cet exercice : terminé.
      if (planExercise && planExercise.sets && planExercise.sets.length) {
        preparedExerciseDone = true;
      }
    }
  }
  startLiveRestManually();
  if (preparedExerciseDone) {
    // Retour au menu de sélection (préparés + tous les autres) — le repos
    // qu'on vient de lancer continue de tourner, affiché sur cet écran
    // comme sur n'importe quel autre (voir liveStatusHeroHTML).
    closeCurrentLiveSegment();
    liveActiveExerciseId = null;
    liveStep = "category";
  }
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
    "Annuler ? La séance sera définitivement perdues.",
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
  // Comme pour changer d'exercice ou revenir en arrière : si une série est
  // encore en cours ("Débuter" tapé, "Finir" pas encore), on la finalise
  // d'abord — sinon, pour le cardio notamment, elle serait enregistrée avec
  // sa durée à 0 (placeholder jamais complété, voir applyFinishLiveSet).
  liveSession.loop = null;
  autoFinishLiveSetIfInProgress();
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
  attachLiveTimelineListeners(content);
  attachLiveNavigationListeners(content);
  attachLivePlanListeners(content);
  attachLiveSetFormListeners(content);
  attachLiveSetActionListeners(content);
  attachLiveLoopListeners(content);
}

// Puces de la frise en haut d'écran : un appui passe en mode confirmation
// (2s pour confirmer), un second appui sur la même puce supprime pour de bon.
function attachLiveTimelineListeners(content) {
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
}

// Navigation entre types/catégories (Muscu ↔ Cardio, catégories Muscu,
// catégories Cardio dont Gainage) et raccourci vers Paramètres depuis un
// cul-de-sac "aucun exercice configuré".
function attachLiveNavigationListeners(content) {
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
        thumb.style.transform = `translateX(${newType === "cardio" ? "100%" : "0"})`;
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

  const goSettingsBtn = content.querySelector("[data-live-go-settings]");
  if (goSettingsBtn) {
    goSettingsBtn.addEventListener("click", () => {
      // La séance en cours (si il y en a une) reste intacte en arrière-plan
      // (voir la reprise automatique dans renderLiveApp) — configurer un
      // exercice puis revenir en Live la retrouve telle quelle.
      currentApp = "settings-gym";
      render();
    });
  }

  content.querySelectorAll("[data-live-cardio-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.liveCardioCategory;
      if (key === GAINAGE_CATEGORY.key) {
        // Comme les catégories Muscu : on sélectionne/désélectionne, ça
        // révèle la liste des exercices de gainage juste en dessous, sans
        // démarrer quoi que ce soit tout de suite.
        liveDraftCategory = liveDraftCategory === key ? "" : key;
        liveCategoryJustChanged = true;
        renderLiveApp();
        return;
      }
      const cat = CARDIO_CATEGORIES.find((c) => c.key === key);
      liveDraftCategory = key;
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
}

// Choix d'un plan pour la séance, puis sélection d'un de ses exercices
// préparés (voir aussi livePlanSectionHTML/getAttachedPlanExerciseFor).
function attachLivePlanListeners(content) {
  content.querySelectorAll("[data-live-pick-plan]").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Chaîne vide (bouton "Aucun plan") -> null, explicitement "pas de
      // plan" — pour ne plus jamais reproposer ce choix cette séance (voir
      // livePlanPickerNeeded, qui ne se déclenche que si planId est encore
      // undefined).
      liveSession.planId = btn.dataset.livePickPlan || null;
      saveJSON(KEYS.liveSession, liveSession);
      renderLiveStep();
    });
  });

  content.querySelectorAll("[data-live-plan-exercise]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const plan = sessionPlans.find((p) => p.id === liveSession.planId);
      if (!plan) return;
      const ex = plan.exercises.find((e) => e.id === btn.dataset.livePlanExercise);
      if (!ex) return;
      liveDraftType = ex.exType;
      liveDraftCategory = ex.category;
      liveDraftName = ex.name;
      startOrResumeLiveExercise();
    });
  });
}

// Champs de saisie d'une série (reps, poids/incrément, distance) — tout ce
// qui ajuste liveDraft* sans valider quoi que ce soit.
function attachLiveSetFormListeners(content) {
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

  const distMinus = content.querySelector("[data-live-distance-minus]");
  const distPlus = content.querySelector("[data-live-distance-plus]");
  if (distMinus) distMinus.addEventListener("click", () => { liveDraftDistance = Math.max(0, Math.round(((liveDraftDistance || 0) - 0.1) * 10) / 10); renderLiveApp(); });
  if (distPlus) distPlus.addEventListener("click", () => { liveDraftDistance = Math.round(((liveDraftDistance || 0) + 0.1) * 10) / 10; renderLiveApp(); });
}

// Actions qui valident/changent l'état d'une série ou d'un exercice :
// démarrer, finir, changer d'exercice.
function attachLiveSetActionListeners(content) {
  const startSetBtn = content.querySelector("[data-live-start-set]");
  if (startSetBtn) startSetBtn.addEventListener("click", startLiveSet);

  const finishSetBtn = content.querySelector("[data-live-finish-set]");
  if (finishSetBtn) finishSetBtn.addEventListener("click", finishLiveSet);

  const changeExBtn = content.querySelector("[data-live-change-exercise]");
  if (changeExBtn) {
    changeExBtn.addEventListener("click", () => {
      // Changer d'exercice arrête toute boucle en cours — continuer à
      // avancer automatiquement pour un exercice qu'on a quitté n'aurait
      // pas de sens.
      liveSession.loop = null;
      autoFinishLiveSetIfInProgress();
      closeCurrentLiveSegment();
      saveJSON(KEYS.liveSession, liveSession);
      liveActiveExerciseId = null;
      liveStep = "category";
      renderLiveApp();
    });
  }
}

// Minuteur en boucle (Gainage) : ouvrir/annuler le formulaire de réglage,
// ses trois steppers, puis démarrer/arrêter la boucle elle-même.
function attachLiveLoopListeners(content) {
  const openLoopBtn = content.querySelector("[data-live-open-loop-form]");
  if (openLoopBtn) openLoopBtn.addEventListener("click", () => { liveLoopFormOpen = true; renderLiveApp(); });

  const cancelLoopFormBtn = content.querySelector("[data-live-cancel-loop-form]");
  if (cancelLoopFormBtn) cancelLoopFormBtn.addEventListener("click", () => { liveLoopFormOpen = false; renderLiveApp(); });

  const loopRoundsMinus = content.querySelector("[data-live-loop-rounds-minus]");
  const loopRoundsPlus = content.querySelector("[data-live-loop-rounds-plus]");
  if (loopRoundsMinus) loopRoundsMinus.addEventListener("click", () => { liveLoopDraftRounds = Math.max(1, liveLoopDraftRounds - 1); renderLiveApp(); });
  if (loopRoundsPlus) loopRoundsPlus.addEventListener("click", () => { liveLoopDraftRounds = Math.min(50, liveLoopDraftRounds + 1); renderLiveApp(); });

  const loopWorkMinus = content.querySelector("[data-live-loop-work-minus]");
  const loopWorkPlus = content.querySelector("[data-live-loop-work-plus]");
  if (loopWorkMinus) loopWorkMinus.addEventListener("click", () => { liveLoopDraftWork = Math.max(5, liveLoopDraftWork - 5); renderLiveApp(); });
  if (loopWorkPlus) loopWorkPlus.addEventListener("click", () => { liveLoopDraftWork = Math.min(600, liveLoopDraftWork + 5); renderLiveApp(); });

  const loopRestMinus = content.querySelector("[data-live-loop-rest-minus]");
  const loopRestPlus = content.querySelector("[data-live-loop-rest-plus]");
  if (loopRestMinus) loopRestMinus.addEventListener("click", () => { liveLoopDraftRest = Math.max(0, liveLoopDraftRest - 5); renderLiveApp(); });
  if (loopRestPlus) loopRestPlus.addEventListener("click", () => { liveLoopDraftRest = Math.min(600, liveLoopDraftRest + 5); renderLiveApp(); });

  const startLoopBtn = content.querySelector("[data-live-start-loop]");
  if (startLoopBtn) startLoopBtn.addEventListener("click", () => startLiveLoop(liveLoopDraftRounds, liveLoopDraftWork, liveLoopDraftRest));

  const stopLoopBtn = content.querySelector("[data-live-stop-loop]");
  if (stopLoopBtn) stopLoopBtn.addEventListener("click", stopLiveLoop);
}
