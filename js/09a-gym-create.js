// La durée cardio est stockée en minutes décimales (voir applyFinishLiveSet
// dans 18-live.js, qui chronomètre en temps réel), mais on veut toujours
// l'AFFICHER en minutes et secondes — jamais "0.2min", illisible. Délègue à
// formatLiveDuration (18-live.js), déjà utilisée pour le temps passé par
// exercice, pour n'avoir qu'un seul formateur de durée dans toute l'app.
function formatCardioDuration(decimalMinutes) {
  return formatLiveDuration(Math.round((decimalMinutes || 0) * 60));
}
function formatSetChip(exType, s) {
  if (exType === "cardio") {
    const durationLabel = formatCardioDuration(s.weight);
    return s.reps ? `${durationLabel} · ${s.reps}km` : durationLabel;
  }
  return `${s.weight || 0}kg × ${s.reps || 0}`;
}
function formatSetsSummary(exType, sets) {
  return sets.map((s) => formatSetChip(exType, s)).join(", ");
}
// Comme formatSetsSummary, mais gère aussi le cas d'une boucle (Gainage,
// voir cardioSetsHistoryHTML) — utilisé pour le rappel "Dernière fois" en
// haut d'un exercice dans l'écran Créer.
function formatLastPerfSummary(last) {
  if (last.loop) return `${last.loop.rounds}×${last.loop.workSec}s/${last.loop.restSec}s`;
  return formatSetsSummary(last.exType, last.sets);
}
// Résumé "Cardio" d'un exercice dans l'historique (séances, calendrier
// partagé) : soit la liste habituelle de puces temps/distance, soit — pour
// le Gainage, désormais saisi en boucle plutôt qu'en séries individuelles,
// même en séance déjà faite (même mécanisme qu'un plan, voir Créer et la
// discussion sur l'uniformisation de la saisie) — un résumé du type
// "8×40s/15s".
function cardioSetsHistoryHTML(ex) {
  if (ex.loop) {
    return `<div class="history-sets"><div class="history-set-chip">${ex.loop.rounds}×${ex.loop.workSec}s/${ex.loop.restSec}s</div></div>`;
  }
  return `<div class="history-sets">${ex.sets.map((set) => `${historyRestBadgeHTML(set.restSec)}<div class="history-set-chip">${formatSetChip(ex.exType, set)}</div>`).join("")}</div>`;
}
// Petit badge "repos" affiché dans l'historique/le calendrier partagé, entre
// deux séries — repris depuis la Séance en direct (restSec mesuré
// manuellement via "Débuter"/"Finir la série"). Absent si le repos n'a pas
// été chronométré pour cette série (séance créée manuellement, ou série
// enregistrée avant l'ajout de cette fonctionnalité).
function historyRestBadgeHTML(restSec) {
  if (restSec === undefined || restSec === null) return "";
  return `<div class="history-set-rest">${ICONS.stopwatch}<span>${formatLiveChrono(restSec)}</span></div>`;
}
// Version "ligne pleine largeur, plutôt fine" utilisée dans l'écran Créer
// (contrairement au badge compact ci-dessus, pensé pour être intercalé
// entre des barres/puces) — affichée juste au-dessus de la série à
// laquelle ce repos est attaché (celle qui LE SUIT chronologiquement).
function setRestLineHTML(restSec) {
  if (restSec === undefined || restSec === null) return "";
  return `<div class="set-rest-line">${ICONS.stopwatch} Repos ${formatLiveChrono(restSec)}</div>`;
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

    // Exercice de gainage dans un PLAN : pas de séries, une configuration de
    // boucle à la place (voir loopConfigFieldsHTML) — on la lit et on
    // s'arrête là pour cette carte, "sets" reste vide.
    const loopRoundsInput = card.querySelector(".loop-rounds");
    if (loopRoundsInput) {
      const loop = {
        rounds: parseInt(loopRoundsInput.value, 10) || 1,
        workSec: parseInt(card.querySelector(".loop-work").value, 10) || 5,
        restSec: parseInt(card.querySelector(".loop-rest").value, 10) || 0,
      };
      result.push({ id, name, exType, category, sets: [], loop });
      return;
    } else if (existing && existing.loop) {
      // Carte de boucle (gainage en plan) réduite : les champs n'existent
      // pas dans le DOM — on conserve la configuration déjà connue plutôt
      // que de la perdre silencieusement.
      result.push({ id, name, exType, category, sets: [], loop: existing.loop });
      return;
    }

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
        const newSet = {
          id: row.dataset.id,
          weight: finalWeight,
          reps: repsEl ? repsEl.value : "",
          // Mode explicite (Standard/"off" ou +Xkg/"on") lu directement depuis
          // le sélecteur — on ne le redéduit JAMAIS depuis la seule valeur
          // numérique du poids, car celle-ci peut être ambiguë (ex. un
          // incrément de 10kg avec des paliers espacés de 10kg : "30kg" peut
          // être le palier 30 en standard, OU le palier 20 + 10 incrémenté).
          weightMode,
        };
        // Le temps de repos (mesuré uniquement en Séance en direct) et
        // l'horodatage ne sont saisissables nulle part dans cet écran — sans
        // ce report explicite depuis la série déjà connue, ils seraient
        // silencieusement perdus à la moindre interaction ici (ajouter une
        // série, en supprimer une autre, replier/déplier l'exercice...),
        // puisque ce formulaire reconstruit entièrement chaque série depuis
        // le DOM à chaque changement.
        const existingSet = existing ? existing.sets.find((s) => s.id === row.dataset.id) : null;
        if (existingSet && existingSet.restSec !== undefined) newSet.restSec = existingSet.restSec;
        if (existingSet && existingSet.timestamp !== undefined) newSet.timestamp = existingSet.timestamp;
        sets.push(newSet);
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
      kind: draft.kind || "session",
      date: dateEl ? dateEl.value : draft.date,
      label: labelEl ? labelEl.value : draft.label,
      exercises: serializeExercisesFromDOM(),
      editingSessionId,
      editingPlanId,
    };
    saveJSON(KEYS.draft, draft);
  }, 350);
}

function clearDraft() {
  draft = { kind: "session", date: todayISO(), label: "", exercises: [] };
  editingSessionId = null;
  editingPlanId = null;
  openExerciseIds = {};
  saveJSON(KEYS.draft, draft);
}

function startEditSession(session) {
  editingSessionId = session.id;
  editingPlanId = null;
  draft = {
    kind: "session",
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

// Équivalent de startEditSession, pour un PLAN plutôt qu'une séance déjà
// faite — mêmes mécanismes (même écran Créer, juste des séries CIBLES et,
// pour le gainage, une config de boucle au lieu de séries).
function startEditPlan(plan) {
  editingPlanId = plan.id;
  editingSessionId = null;
  draft = {
    kind: "plan",
    date: todayISO(),
    label: plan.label || "",
    exercises: JSON.parse(JSON.stringify(plan.exercises)),
    editingPlanId,
  };
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
  editingPlanId = null;
  openExerciseIds = {};
  clonedExercises.forEach((ex) => {
    openExerciseIds[ex.id] = false;
  });
  draft = { kind: "session", date: todayISO(), label: session.label || "", exercises: clonedExercises, editingSessionId: null };
  saveJSON(KEYS.draft, draft);
  tab = "log";
  render();
}

// Équivalent de duplicateSession, pour un plan — donne un nouveau plan
// indépendant à partir d'un existant, plutôt que de le modifier sur place.
function duplicatePlan(plan) {
  const clonedExercises = JSON.parse(JSON.stringify(plan.exercises)).map((ex) => ({
    ...ex,
    id: uid(),
    sets: (ex.sets || []).map((s) => ({ ...s, id: uid() })),
  }));
  editingSessionId = null;
  editingPlanId = null;
  openExerciseIds = {};
  clonedExercises.forEach((ex) => {
    openExerciseIds[ex.id] = false;
  });
  draft = { kind: "plan", date: todayISO(), label: (plan.label || "") + " (copie)", exercises: clonedExercises, editingPlanId: null };
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
    if (found) return { date: s.date, exType: found.exType || "muscu", sets: found.sets, loop: found.loop || null };
  }
  return null;
}

function gymHeaderSubText() {
  if (gymTopMode === "plan") {
    return `${sessionPlans.length} plan${sessionPlans.length !== 1 ? "s" : ""} enregistré${sessionPlans.length !== 1 ? "s" : ""}`;
  }
  return `${sessions.length} séance${sessions.length !== 1 ? "s" : ""} enregistrée${sessions.length !== 1 ? "s" : ""}`;
}

function renderGymApp() {
  app.className = "theme-gym";
  // Rattrapage silencieux : si un brouillon d'une session précédente (avant
  // cette restructuration, ou après une fermeture en plein milieu) a un
  // "kind" différent du mode affiché, on aligne le mode sur lui plutôt que
  // de laisser les deux se contredire à l'écran.
  if (draft.kind && draft.kind !== gymTopMode) gymTopMode = draft.kind;
  const isPlanMode = gymTopMode === "plan";
  app.innerHTML = `
    <div class="header">
      <button type="button" class="back-btn" data-go-home>${ICONS.back}</button>
      <div class="header-icon-only">${ICONS.dumbbell}</div>
      <div class="header-sub" id="gym-header-sub">${gymHeaderSubText()}</div>
    </div>
    <div class="ex-type-toggle" id="gym-top-mode-toggle" style="margin: 14px 16px 0 18px;">
      <button type="button" class="ex-type-btn ${!isPlanMode ? "active" : ""}" data-gym-top-mode="session">Séance effectuée</button>
      <button type="button" class="ex-type-btn ${isPlanMode ? "active" : ""}" data-gym-top-mode="plan">Plan à préparer</button>
    </div>
    <div class="content" id="content"></div>
    <div class="log-actions-bar" id="log-actions-bar" style="display:none;"></div>
    <div class="tabbar">
      <button class="tab-btn ${tab === "log" ? "active" : ""}" data-tab="log">${ICONS.dumbbell}Créer</button>
      <button class="tab-btn ${tab === "history" ? "active" : ""}" data-tab="history">${ICONS.history}${isPlanMode ? "Plans" : "Séances"}</button>
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
  document.querySelectorAll("[data-gym-top-mode]").forEach((btn) => {
    btn.addEventListener("click", () => switchGymTopMode(btn.dataset.gymTopMode));
  });
  renderContent();
}

// Change le grand mode Séance/Plan qui structure tout le module. Si un
// brouillon non enregistré est en cours (peu importe si c'est une édition
// ou une nouvelle saisie), on prévient avant de l'effacer — changer de mode
// n'a de sens qu'en repartant d'une ardoise vierge pour l'autre mode.
function switchGymTopMode(newMode) {
  if (gymTopMode === newMode) return;
  const hasUnsavedDraft = draft.exercises && draft.exercises.length > 0;
  const applySwitch = () => {
    gymTopMode = newMode;
    clearDraft();
    draft.kind = newMode;
    saveJSON(KEYS.draft, draft);
    renderGymApp();
  };
  if (hasUnsavedDraft) {
    showConfirm(
      "Changer de mode effacera la séance/le plan en cours de saisie (non enregistré). Continuer ?",
      applySwitch,
      { confirmLabel: "Changer", danger: true }
    );
  } else {
    applySwitch();
  }
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
      ${GYM_EXERCISE_CATEGORIES.map((c) => {
        // Simple signal visuel (jamais un blocage, voir .ex-type-btn-needs-setup
        // en CSS) : une catégorie sans le moindre exercice configuré se grise,
        // mais reste sélectionnable normalement — la choisir affiche toujours
        // le bouton "Configurer un exercice" comme aujourd'hui.
        const hasConfigs = gymExerciseConfigs.some((cfg) => (cfg.category || "pecs") === c.key);
        return `<button type="button" class="ex-type-btn ${category === c.key ? "active" : ""} ${!hasConfigs ? "ex-type-btn-needs-setup" : ""}" data-category-btn="${c.key}">${c.label}</button>`;
      }).join("")}
    </div>`;
}

function cardioCategoryToggleHTML(category) {
  return `
    <div class="ex-type-toggle wrap-toggle" data-cardio-category-toggle style="margin-bottom:10px;">
      ${[...CARDIO_CATEGORIES, GAINAGE_CATEGORY].map(
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

// Configuration de boucle (tours/travail/repos) pour un exercice de gainage
// dans un PLAN — mêmes réglages, mêmes classes visuelles (.live-stepper-*)
// que la boucle en Séance en direct, pour que ce soit familier et pour
// pouvoir la relancer telle quelle une fois en Live (voir 18-live.js).
// Les valeurs sont lues via des input[type=hidden] au moment de la
// sérialisation (voir serializeExercisesFromDOM), sur le même principe que
// le stepper de répétitions un peu plus haut dans ce fichier.
// Configuration de boucle (tours/travail/repos) pour un exercice de gainage
// dans un PLAN — même style de champs que le bloc "Fractionné" de Course à
// pied (répétitions/distance-par-répétition/récupération), qui alterne lui
// aussi effort et repos : de simples champs numériques dans une rangée,
// cohérents avec le reste de l'écran Créer plutôt qu'empruntés au Live.
function loopConfigFieldsHTML(loop) {
  return `
    <div class="block-fields-row" data-loop-config>
      <div class="field"><label>Tours</label><input class="loop-rounds" type="number" inputmode="numeric" placeholder="ex. 10" value="${loop.rounds}"></div>
      <div class="field"><label>Travail (s)</label><input class="loop-work" type="number" inputmode="numeric" placeholder="ex. 30" value="${loop.workSec}"></div>
      <div class="field"><label>Repos (s)</label><input class="loop-rest" type="number" inputmode="numeric" placeholder="ex. 30" value="${loop.restSec}"></div>
    </div>`;
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
  // sinon (Cardio — Rameur/Vélo/Course/Gainage, dont le nom EST toujours la
  // catégorie choisie — ou Muscu avec un exercice choisi) -> les séries.
  let bodyHTML;
  if (!exType) {
    bodyHTML = `<div class="empty-state" style="padding:16px; margin-bottom:10px;">Choisis Muscu ou Cardio/Gainage pour continuer.</div>`;
  } else if (isMuscu && gymExerciseConfigs.length === 0) {
    // Aucun exercice Muscu configuré nulle part : pas la peine de faire
    // choisir une catégorie d'abord pour découvrir ensuite qu'elle est vide
    // elle aussi — direct vers l'invite à configurer.
    bodyHTML = `<div class="empty-state" style="padding:16px; margin-bottom:10px;">Aucun exercice de musculation configuré.<br>Configure-en un pour commencer.<button type="button" class="add-exercise-btn" style="margin-top:14px; text-transform:none; letter-spacing:0; font-size:13px;" data-go-settings-gym>${ICONS.plus} Configurer un exercice</button></div>`;
  } else if (isMuscu && !category) {
    bodyHTML = categoryToggleHTML(category) + `<div class="empty-state" style="padding:16px; margin-bottom:10px;">Choisis une catégorie pour continuer.</div>`;
  } else if (isMuscu && configsInCategory.length === 0) {
    bodyHTML =
      categoryToggleHTML(category) +
      `<div class="empty-state" style="padding:16px; margin-bottom:10px;">Aucun exercice configuré dans "${categoryLabel(category)}".<br>Configure-en un pour commencer.<button type="button" class="add-exercise-btn" style="margin-top:14px; text-transform:none; letter-spacing:0; font-size:13px;" data-go-settings-gym>${ICONS.plus} Configurer un exercice</button></div>`;
  } else if (isMuscu && !effectiveConfig) {
    bodyHTML =
      categoryToggleHTML(category) +
      nameSelectHTML(configsInCategory, null) +
      `<div class="empty-state" style="padding:16px; margin-bottom:10px;">Choisis un exercice pour continuer.</div>`;
  } else {
    const categoryAndNameHTML = isCardio ? cardioCategoryToggleHTML(category) : categoryToggleHTML(category) + nameSelectHTML(configsInCategory, effectiveConfig);
    // Le gainage se travaille uniquement au temps — pas de colonne distance
    // à afficher (contrairement à Rameur/Vélo/Course).
    const isGainage = isCardio && category === GAINAGE_CATEGORY.key;

    // Le gainage se prépare/s'enregistre en configuration de boucle
    // (tours/travail/repos) plutôt qu'en séries — mêmes réglages qu'en
    // Séance en direct (pour pouvoir la relancer telle quelle), et surtout
    // MÊME mécanisme qu'on soit en train de préparer un plan ou de logguer
    // une séance déjà faite : la façon de saisir ne doit pas changer selon
    // ce à quoi ça sert au final. Rameur/Vélo/Course, eux, gardent la liste
    // de séries habituelle dans les deux cas (déjà unifié).
    if (isGainage) {
      const loop = ex.loop || { rounds: 10, workSec: 30, restSec: 30 };
      bodyHTML = `
    ${categoryAndNameHTML}
    <div class="cardio-config-area">
    ${last ? `<div class="last-perf" data-hint>Dernière fois (${formatDateFR(last.date)}) : <b>${formatLastPerfSummary(last)}</b></div>` : `<div class="last-perf" data-hint style="display:none"></div>`}
    ${loopConfigFieldsHTML(loop)}
    </div>`;
    } else {
    // Rameur/Vélo/Course : un temps et un kilométrage à remplir par défaut,
    // même si aucune série n'a encore été ajoutée (ex. en rouvrant pour
    // modifier un exercice enregistré vide, voir "ni l'un ni l'autre n'est
    // obligatoire" à l'enregistrement) — ni l'un ni l'autre n'est requis,
    // cette ligne à blanc n'est qu'un point de départ pratique, pas une
    // valeur imposée. Purement un filet d'affichage : tant que rien n'est
    // saisi dedans, elle disparaît à nouveau au prochain enregistrement (les
    // séries vides sont filtrées, voir plus bas).
    const setsForRender = isCardio && !isGainage && ex.sets.length === 0 ? [{ id: uid(), weight: "", reps: "" }] : ex.sets;
    const setsHTML = setsForRender
      .map((s, i) => {
        let cols;
        if (isCardio) {
          const weightInput = `<input class="set-weight" type="text" inputmode="decimal" placeholder="min" value="${s.weight}">`;
          const repsInput = `<input class="set-reps" type="text" inputmode="decimal" placeholder="km (optionnel)" value="${s.reps}">`;
          cols = isGainage ? weightInput : weightInput + repsInput;
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
        const isLast = i === setsForRender.length - 1;
        return `
    ${setRestLineHTML(s.restSec)}
    <div class="set-row" data-id="${s.id}">
      <div class="set-main">
        <div class="set-num">${i + 1}</div>
        ${cols}
      </div>
      <div class="set-toolbar">
        <button type="button" class="set-action-btn" data-move-set-up="${s.id}" aria-label="Monter" ${isFirst ? "disabled" : ""}>${ICONS.miniUp}</button>
        <button type="button" class="set-action-btn" data-move-set-down="${s.id}" aria-label="Descendre" ${isLast ? "disabled" : ""}>${ICONS.miniDown}</button>
        <button type="button" class="set-action-btn danger" data-remove-set="${s.id}" aria-label="Supprimer" ${setsForRender.length === 1 ? "disabled" : ""}>${ICONS.trash}</button>
      </div>
    </div>`;
      })
      .join("");

    bodyHTML = `
    ${categoryAndNameHTML}
    <div class="${isCardio ? "cardio-config-area" : ""}">
    ${last ? `<div class="last-perf" data-hint>Dernière fois (${formatDateFR(last.date)}) : <b>${formatLastPerfSummary(last)}</b></div>` : `<div class="last-perf" data-hint style="display:none"></div>`}
    <div class="sets-header"><span class="spacer"></span>${isCardio ? (isGainage ? "<span>Min</span>" : "<span>Min</span><span>Km</span>") : "<span>Reps</span><span>Kg</span>"}</div>
    <div class="sets-list">${setsHTML}</div>
    <button class="add-set-btn" data-add-set="${ex.id}">${ICONS.plus} ${isCardio ? "Ajouter un passage" : "Ajouter une série"}</button>
    </div>`;
    }
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
      <button type="button" class="ex-type-btn ${isCardio ? "active" : ""}" data-set-type="cardio">Cardio/Gainage</button>
    </div>
    ${bodyHTML}`
        : `<div class="exercise-collapsed-summary" data-toggle-exercise="${ex.id}">${ex.name || (isCardio ? "Exercice cardio" : "Nouvel exercice")}${" · "}${summaryCount}${summaryLast}</div>`
    }
  </div>`;
}

function logTabHTML() {
  const exercisesHTML = draft.exercises.map(exerciseCardHTML).join("");
  const allNames = Array.from(new Set([...gymExerciseConfigs.map((c) => c.name), ...gainageExerciseConfigs.map((c) => c.name), ...library])).sort((a, b) => a.localeCompare(b));
  const libOptions = allNames.map((n) => `<option value="${n.replace(/"/g, "&quot;")}">`).join("");
  const editBanner = editingSessionId
    ? `<div class="edit-banner">Modification d'une séance existante<button type="button" id="cancel-edit-btn">Annuler</button></div>`
    : editingPlanId
      ? `<div class="edit-banner">Modification d'un plan existant<button type="button" id="cancel-edit-btn">Annuler</button></div>`
      : "";
  // Le "kind" du brouillon suit désormais le grand sélecteur en haut du
  // module (voir renderGymApp/switchGymTopMode) — plus de bascule locale ici,
  // qui faisait doublon avec lui tout en étant moins visible.
  const isPlan = draft.kind === "plan";
  const fieldsHTML = isPlan
    ? `<div class="field"><label>Nom du plan</label><input type="text" id="log-label" placeholder="Push day, jambes…" value="${(draft.label || "").replace(/"/g, "&quot;")}"></div>`
    : `
    <div class="field-row">
      <div class="field field-date"><label>Date</label><input type="date" id="log-date" value="${draft.date}"></div>
      <div class="field"><label>Séance</label><input type="text" id="log-label" placeholder="Push day…" value="${(draft.label || "").replace(/"/g, "&quot;")}"></div>
    </div>`;
  return `
    <div class="backup-row">
      <button class="backup-btn" id="import-draft-btn">${ICONS.down} ${isPlan ? "Importer un plan" : "Importer une séance"}</button>
      <button class="backup-btn" id="reset-draft-btn">${ICONS.reset} Réinitialiser</button>
      <input type="file" id="import-draft-file" accept="application/json" style="display:none">
    </div>
    ${editBanner}
    ${fieldsHTML}
    <div id="exercises-container">${exercisesHTML}</div>
    <datalist id="exercise-suggestions">${libOptions}</datalist>
    <div id="log-bottom-spacer" style="height:0;"></div>
  `;
}

function logActionsBarContentHTML() {
  const isPlan = draft.kind === "plan";
  const saveLabel = isPlan
    ? editingPlanId
      ? "Enregistrer les modifications"
      : "Enregistrer le plan"
    : editingSessionId
      ? "Enregistrer les modifications"
      : "Enregistrer la séance";
  return `
    <div id="error-slot"></div>
    <button class="add-exercise-btn" id="add-exercise-btn">${ICONS.plus} Ajouter un exercice</button>
    <button class="save-btn" id="save-session-btn">${ICONS.check} ${saveLabel}</button>
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
  if (dateEl) dateEl.addEventListener("input", scheduleDraftSave);
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

    const goSettingsBtn = card.querySelector("[data-go-settings-gym]");
    if (goSettingsBtn) {
      goSettingsBtn.addEventListener("click", () => {
        // Le brouillon en cours est déjà sauvegardé au fil de la saisie (voir
        // scheduleDraftSave) — configurer un exercice puis revenir sur Créer
        // le retrouve tel quel.
        currentApp = "settings-gym";
        render();
      });
    }

    function refreshHint(name) {
      if (!hint) return;
      const last = getLastPerformance(name);
      if (last) {
        hint.style.display = "";
        hint.innerHTML = `Dernière fois (${formatDateFR(last.date)}) : <b>${formatLastPerfSummary(last)}</b>`;
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
        renderContentAnimatingCardHeight(card.dataset.id, renderContent, () => scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${card.dataset.id}"]`)));
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
        renderContentAnimatingCardHeight(card.dataset.id, renderContent, () => scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${card.dataset.id}"]`)));
      });
    });

    card.querySelectorAll("[data-cardio-category-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (card.dataset.category === btn.dataset.cardioCategoryBtn) return;
        const exs = serializeExercisesFromDOM();
        const target = exs.find((e) => e.id === card.dataset.id);
        target.category = btn.dataset.cardioCategoryBtn;
        // Rameur/Vélo/Course/Gainage se comportent tous pareil : la
        // catégorie choisie préremplit directement le titre (elle EST le
        // nom de l'exercice), que l'utilisateur peut toujours modifier
        // librement ensuite s'il le souhaite.
        const cat = [...CARDIO_CATEGORIES, GAINAGE_CATEGORY].find((c) => c.key === target.category);
        target.name = cat ? cat.label : target.name;
        // Rameur/Vélo/Course : un temps et un kilométrage à remplir par
        // défaut dès le choix de la catégorie — comme pour le Gainage, plus
        // besoin d'appuyer sur "Ajouter un passage" pour voir apparaître les
        // champs. Ni l'un ni l'autre n'est obligatoire (voir la validation à
        // l'enregistrement) ; on ne touche pas à des séries déjà présentes
        // (ex. en revenant de Gainage vers Vélo après avoir déjà rempli
        // Rameur, ce serait dommage de perdre ce qui était saisi ailleurs —
        // mais Gainage n'a de toute façon jamais de "sets", donc ce cas ne
        // se présente pas ; ce garde-fou est surtout là pour ne jamais
        // écraser une valeur déjà en cours de saisie).
        if (target.category !== GAINAGE_CATEGORY.key && target.sets.length === 0) {
          target.sets = [{ id: uid(), weight: "", reps: "" }];
        }
        draft.exercises = exs;
        saveJSON(KEYS.draft, draft);
        renderContentAnimatingCardHeight(card.dataset.id, renderContent, () => scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${card.dataset.id}"]`)));
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

    // Configuration de boucle (gainage en plan) — de simples champs, comme
    // le reste de l'écran : un "input" déclenche juste la sauvegarde
    // différée, pas de logique de stepper à gérer ici.
    const loopConfigEl = card.querySelector("[data-loop-config]");
    if (loopConfigEl) {
      loopConfigEl.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", scheduleDraftSave);
      });
    }

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
        renderContentAnimatingCardHeight(card.dataset.id, renderContent, () => scrollCardTopIntoView(document.querySelector(`.exercise-card[data-id="${card.dataset.id}"]`)));
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
        // Contrairement à la Séance en direct, on ne cumule pas ici le repos
        // de la série supprimée sur la suivante — trop ambigu dans un écran
        // d'édition manuelle où l'ordre peut lui-même avoir été modifié à la
        // main (voir "Monter"/"Descendre"). Le repos attaché à la série
        // supprimée disparaît donc avec elle, pour le moment.
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
    const errorSlot = document.getElementById("error-slot");
    // Même règle de validité qu'on prépare un plan ou qu'on logue une séance
    // déjà faite (voir la discussion sur l'uniformisation de la saisie) :
    // valide s'il y a des séries (Muscu), une config de boucle (Gainage),
    // ou — pour Rameur/Vélo/Course — simplement un nom/catégorie choisis :
    // temps et distance y sont toujours facultatifs.
    const cleaned = exs
      .map((e, idx) => ({ ...e, name: e.name.trim() || `Exercice ${idx + 1}`, sets: e.sets.filter((s) => s.weight !== "" || s.reps !== "") }))
      .filter((e) => e.sets.length > 0 || e.loop || (e.exType === "cardio" && e.category !== GAINAGE_CATEGORY.key));

    if (draft.kind === "plan") {
      if (cleaned.length === 0) {
        errorSlot.innerHTML = `<div class="error-msg">Ajoute au moins un exercice avant d'enregistrer ce plan.</div>`;
        return;
      }
      errorSlot.innerHTML = "";
      const wasEditingPlan = !!editingPlanId;
      const planLabel = labelEl.value.trim() || `Plan ${sessionPlans.filter((p) => p.id !== editingPlanId).length + 1}`;
      const plan = { id: editingPlanId || uid(), label: planLabel, exercises: cleaned };
      if (wasEditingPlan) {
        sessionPlans = sessionPlans.map((p) => (p.id === editingPlanId ? plan : p));
      } else {
        sessionPlans = [plan, ...sessionPlans];
      }
      saveJSON(KEYS.sessionPlans, sessionPlans);
      clearDraft();
      render();
      document.getElementById("flash-slot").innerHTML = `<div class="flash">${ICONS.check} ${wasEditingPlan ? "Plan modifié" : "Plan enregistré"}</div>`;
      setTimeout(() => {
        const f = document.getElementById("flash-slot");
        if (f) f.innerHTML = "";
      }, 1800);
      return;
    }

    if (cleaned.length === 0) {
      errorSlot.innerHTML = `<div class="error-msg">Ajoute au moins un exercice avant d'enregistrer.</div>`;
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

