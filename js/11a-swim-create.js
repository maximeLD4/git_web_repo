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
  // La taille du bassin seule n'en est pas une : elle est posée sur TOUS les blocs en mode
  // Bassin (voir swimPoolContext) — un bloc laissé vide ne doit donc pas être enregistré
  // sous prétexte qu'il porte la taille du bassin.
  if (b.mode === "pool") return !!(b.lengths || b.stroke || b.duration);
  return !!(b.duration || b.distance || b.pace);
}

/* ---------- swim: le bassin se saisit UNE fois par séance ---------- */
// On ne change pas de piscine en cours de séance : la taille se saisit une seule fois (ligne
// « Bassin » en haut) et est recopiée dans chaque bloc en mode Bassin à l'enregistrement. Le
// modèle de données reste inchangé (poolLength est toujours porté par chaque bloc) : historique,
// calendrier, performances et exports n'ont rien à savoir de ce changement.
function swimPoolValues(blocks) {
  const seen = new Map();
  blocks.forEach((b) => {
    if (b.mode !== "pool") return;
    const n = parseFloat(b.poolLength);
    if (!isNaN(n) && n > 0 && !seen.has(n)) seen.set(n, String(b.poolLength).trim());
  });
  return [...seen.values()];
}
// Bassin de la séance la plus récente qui en a un : on nage presque toujours dans la même piscine.
function lastSwimPoolLength() {
  const sorted = [...swimSessions].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  for (const s of sorted) {
    for (const b of s.blocks || []) if (b.mode === "pool" && parseFloat(b.poolLength) > 0) return String(b.poolLength).trim();
  }
  return "";
}
// { value, mixed } — "mixed" : une ancienne séance dont les blocs ont des bassins DIFFÉRENTS ; on
// ne les écrase pas (chaque bloc garde alors son champ), sauf si on saisit une taille en haut.
function swimPoolContext() {
  const vals = swimPoolValues(swimDraft.blocks);
  if (swimDraft.poolLength !== undefined && swimDraft.poolLength !== null) {
    const typed = String(swimDraft.poolLength).trim();
    if (typed) return { value: typed, mixed: false };
    return { value: "", mixed: vals.length > 1 };
  }
  if (vals.length > 1) return { value: "", mixed: true };
  return { value: vals[0] || lastSwimPoolLength(), mixed: false };
}
function swimBlocksWithPool(blocks, pool) {
  if (pool.mixed || !pool.value) return blocks;
  return blocks.map((b) => (b.mode === "pool" ? { ...b, poolLength: pool.value } : b));
}
// Taille de bassin à COPIER pour un bloc qui n'en a pas : celle du bloc en mode Bassin le plus proche
// avant lui, à défaut après lui. On ne ressaisit jamais ce qu'un autre bloc de la séance sait déjà.
function nearestSwimPoolLength(blocks, index) {
  const has = (b) => b && b.mode === "pool" && parseFloat(b.poolLength) > 0;
  for (let i = index - 1; i >= 0; i--) if (has(blocks[i])) return String(blocks[i].poolLength).trim();
  for (let i = index + 1; i < blocks.length; i++) if (has(blocks[i])) return String(blocks[i].poolLength).trim();
  return "";
}
// Texte de l'indication « Bassin » affichée dans chaque bloc en mode Bassin.
function swimPoolChipHTML(poolVal) {
  const n = parseFloat(poolVal);
  return n > 0 ? `Bassin : <b>${String(poolVal).trim().replace(/</g, "&lt;")} m</b> <span>· modifier</span>` : `<b>Bassin à saisir</b> <span>· ligne « Bassin » en haut</span>`;
}

// Mise à jour de la ligne « Distance totale » d'un bloc en mode Bassin, d'après le DOM.
function updateSwimPoolCardHint(card) {
  const hintEl = card.querySelector("[data-total-hint]");
  if (!hintEl) return;
  const poolEl = document.getElementById("swim-pool-length");
  const perBlockEl = card.querySelector(".swim-block-poollength");
  const poolVal = poolEl && poolEl.value.trim() ? poolEl.value : perBlockEl ? perBlockEl.value : "";
  const chipEl = card.querySelector("[data-pool-chip]");
  if (chipEl) chipEl.innerHTML = swimPoolChipHTML(poolVal);
  const dist = swimBlockDistanceM({ mode: "pool", poolLength: poolVal, lengths: card.querySelector(".swim-block-lengths").value });
  const durVal = parseFloat(card.querySelector(".swim-block-duration").value);
  const hintParts = [];
  if (dist) hintParts.push(`${Math.round(dist)} m`);
  if (dist && !isNaN(durVal) && durVal > 0) {
    const paceDisp = formatSwimPaceDisplay(String((durVal * 100) / dist));
    if (paceDisp) hintParts.push(paceDisp);
  }
  hintEl.textContent = hintParts.length ? `Distance totale : ${hintParts.join(" · ")}` : "";
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
  // Le nom et la date saisis font partie du brouillon DÈS la saisie : jusqu'ici ils n'y entraient
  // qu'après un délai de 350 ms, donc un nom tapé juste avant « Ajouter un bloc » (ou un
  // changement de mode) était perdu sans un mot au réaffichage de l'écran.
  {
    const dateEl = document.getElementById("swim-date");
    const labelEl = document.getElementById("swim-label");
    if (dateEl) swimDraft.date = dateEl.value;
    if (labelEl) swimDraft.label = labelEl.value;
  }
  const cards = document.querySelectorAll("#swim-blocks-container .exercise-card");
  const poolEl = document.getElementById("swim-pool-length");
  // La taille saisie en haut fait partie du brouillon, même s'il n'y a pas (encore) de bloc en
  // mode Bassin — sinon elle serait perdue au prochain réaffichage.
  if (poolEl) swimDraft.poolLength = poolEl.value;
  const sessionPool = poolEl ? poolEl.value.trim() : "";
  const result = [];
  cards.forEach((card) => {
    const id = card.dataset.id;
    const mode = card.dataset.mode || "duration";
    const label = card.querySelector(".ex-name-input").value;
    const block = { id, label, mode, duration: "", distance: "", pace: "", poolLength: "", lengths: "", stroke: "" };
    block.pace = getPaceDecimalFromCard(card);
    if (mode === "pool") {
      // Taille saisie en haut : elle vaut pour tous les blocs. Sinon (ancienne séance à plusieurs
      // bassins) chaque bloc garde la sienne.
      const perBlockEl = card.querySelector(".swim-block-poollength");
      block.poolLength = sessionPool ? poolEl.value : perBlockEl ? perBlockEl.value : "";
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
    const blocks = serializeSwimBlocksFromDOM(); // met aussi à jour swimDraft.poolLength
    swimDraft = {
      date: dateEl ? dateEl.value : swimDraft.date,
      label: labelEl ? labelEl.value : swimDraft.label,
      blocks,
      poolLength: swimDraft.poolLength,
      editingSessionId: swimEditingSessionId,
    };
    saveJSON(KEYS.swimDraft, swimDraft);
  }, 350);
}

function clearSwimDraft() {
  swimDraft = { kind: "session", date: todayISO(), label: "", blocks: [emptySwimBlock()] };
  swimEditingSessionId = null;
  swimEditingPlanId = null;
  saveJSON(KEYS.swimDraft, swimDraft);
}

function startEditSwimSession(session) {
  swimEditingSessionId = session.id;
  swimEditingPlanId = null;
  swimDraft = {
    kind: "session",
    date: session.date,
    label: session.label || "",
    blocks: JSON.parse(JSON.stringify(session.blocks)),
    editingSessionId: swimEditingSessionId,
  };
  saveJSON(KEYS.swimDraft, swimDraft);
  swimTab = "log";
  renderSwimApp();
}

// Équivalent de startEditSwimSession, pour un PLAN — même écran Créer, les
// blocs d'un plan sont déjà des cibles par nature.
function startEditSwimPlan(plan) {
  swimEditingPlanId = plan.id;
  swimEditingSessionId = null;
  swimDraft = {
    kind: "plan",
    date: todayISO(),
    label: plan.label || "",
    blocks: JSON.parse(JSON.stringify(plan.blocks)),
    editingPlanId: swimEditingPlanId,
  };
  saveJSON(KEYS.swimDraft, swimDraft);
  swimTab = "log";
  renderSwimApp();
}

function duplicateSwimSession(session) {
  const clonedBlocks = JSON.parse(JSON.stringify(session.blocks)).map((b) => ({ ...b, id: uid() }));
  swimEditingSessionId = null;
  swimEditingPlanId = null;
  swimDraft = { kind: "session", date: todayISO(), label: session.label || "", blocks: clonedBlocks, editingSessionId: null };
  saveJSON(KEYS.swimDraft, swimDraft);
  playSaveTravelAnimation(ICONS.duplicate, "Duplication de la séance", session.label || formatDateFR(session.date), () => {
    swimTab = "log";
    renderSwimApp();
  });
}

function duplicateSwimPlan(plan) {
  const clonedBlocks = JSON.parse(JSON.stringify(plan.blocks)).map((b) => ({ ...b, id: uid() }));
  swimEditingSessionId = null;
  swimEditingPlanId = null;
  swimDraft = { kind: "plan", date: todayISO(), label: (plan.label || "") + " (copie)", blocks: clonedBlocks, editingPlanId: null };
  saveJSON(KEYS.swimDraft, swimDraft);
  playSaveTravelAnimation(ICONS.duplicate, "Duplication du plan", plan.label || "", () => {
    swimTab = "log";
    renderSwimApp();
  });
}

function convertSwimSessionToPlan(session) {
  const clonedBlocks = JSON.parse(JSON.stringify(session.blocks)).map((b) => ({ ...b, id: uid() }));
  swimEditingSessionId = null;
  swimEditingPlanId = null;
  swimDraft = { kind: "plan", date: todayISO(), label: session.label || formatDateFR(session.date), blocks: clonedBlocks, editingPlanId: null };
  saveJSON(KEYS.swimDraft, swimDraft);
  playSaveTravelAnimation(ICONS.stopwatch, "Conversion en plan", session.label || formatDateFR(session.date), () => {
    swimTab = "log";
    renderSwimApp();
  }, "right");
}

function convertSwimPlanToSession(plan) {
  const clonedBlocks = JSON.parse(JSON.stringify(plan.blocks)).map((b) => ({ ...b, id: uid() }));
  swimEditingSessionId = null;
  swimEditingPlanId = null;
  swimDraft = { kind: "session", date: todayISO(), label: plan.label || "", blocks: clonedBlocks, editingSessionId: null };
  saveJSON(KEYS.swimDraft, swimDraft);
  playSaveTravelAnimation(ICONS.stopwatch, "Conversion en séance", plan.label || "", () => {
    swimTab = "log";
    renderSwimApp();
  }, "left");
}

function switchSwimTopMode(newMode) {
  if (swimTopMode === newMode) return;
  swimTopMode = newMode;
  const dateEl = document.getElementById("swim-date");
  const labelEl = document.getElementById("swim-label");
  const blocks = serializeSwimBlocksFromDOM(); // met aussi à jour swimDraft.poolLength
  swimDraft = {
    kind: newMode,
    date: dateEl ? dateEl.value : swimDraft.date,
    label: labelEl ? labelEl.value : swimDraft.label,
    blocks,
    poolLength: swimDraft.poolLength,
    editingSessionId: null,
    editingPlanId: null,
  };
  swimEditingSessionId = null;
  swimEditingPlanId = null;
  saveJSON(KEYS.swimDraft, swimDraft);
  renderSwimApp();
}

function renderSwimApp() {
  app.className = "theme-swim";
  if (swimTab === "log" && swimDraft.kind && swimDraft.kind !== swimTopMode) swimTopMode = swimDraft.kind;
  const isPlanMode = swimTopMode === "plan";
  app.innerHTML = `
    <div class="header header-plain-title">
      <button type="button" class="back-btn-text" data-go-home>${ICONS.back} Accueil</button>
      <div class="screen-title">Natation</div>
      <div class="header-sub screen-subtitle">${isPlanMode ? `${swimSessionPlans.length} plan${swimSessionPlans.length !== 1 ? "s" : ""} enregistré${swimSessionPlans.length !== 1 ? "s" : ""}` : `${swimSessions.length} séance${swimSessions.length !== 1 ? "s" : ""} enregistrée${swimSessions.length !== 1 ? "s" : ""}`}</div>
    </div>
    <div class="ex-type-toggle ex-type-toggle-pill" id="swim-top-mode-toggle" style="margin: 14px 16px 0 18px;">
      <button type="button" class="ex-type-btn ${!isPlanMode ? "active" : ""}" data-swim-top-mode="session">Séance effectuée</button>
      <button type="button" class="ex-type-btn ${isPlanMode ? "active" : ""}" data-swim-top-mode="plan">Plan à préparer</button>
    </div>
    <div class="content" id="content"></div>
    <div class="log-actions-bar" id="log-actions-bar" style="display:none;"></div>
    <div class="tabbar">
      <button class="tab-btn ${swimTab === "log" ? "active" : ""}" data-swim-tab="log">${ICONS.swim}Créer</button>
      <button class="tab-btn ${swimTab === "history" ? "active" : ""}" data-swim-tab="history">${ICONS.history}${isPlanMode ? "Plans" : "Séances"}</button>
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
  document.querySelectorAll("[data-swim-top-mode]").forEach((btn) => {
    btn.addEventListener("click", () => switchSwimTopMode(btn.dataset.swimTopMode));
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

// Menu de la nage. Une séance ENREGISTRÉE avant ce menu peut porter un texte libre (« Pull »,
// « crawl 25 »…) : on le garde comme choix supplémentaire plutôt que de l'effacer en silence ; il
// disparaît du menu dès qu'on choisit autre chose. Une variante de casse (« crawl ») est rattachée
// à la nage correspondante.
function swimStrokeSelectHTML(current) {
  const cur = String(current || "").trim();
  const match = SWIM_STROKES.find((s) => s.toLowerCase() === cur.toLowerCase());
  const legacy = cur && !match ? `<option value="${escapeHTML(cur)}" selected>${escapeHTML(cur)}</option>` : "";
  const options = SWIM_STROKES.map((s) => `<option value="${s}" ${s === match ? "selected" : ""}>${s}</option>`).join("");
  return `<select class="swim-block-stroke app-select app-select-field"><option value="" ${cur ? "" : "selected"}>— Choisis une nage —</option>${legacy}${options}</select>`;
}

function swimBlockCardHTML(b, pool) {
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
    // Bassin saisi en haut (une fois pour la séance) : le bloc n'a plus son propre champ — sauf
    // pour une ancienne séance à plusieurs bassins, qu'on ne veut pas écraser.
    const unified = !pool.mixed;
    const dist = swimBlockDistanceM(unified ? { ...b, poolLength: pool.value } : b);
    const durVal = parseFloat(b.duration);
    const hintParts = [];
    if (dist) hintParts.push(`${Math.round(dist)} m`);
    if (dist && !isNaN(durVal) && durVal > 0) {
      const paceDisp = formatSwimPaceDisplay(String((durVal * 100) / dist));
      if (paceDisp) hintParts.push(paceDisp);
    }
    const strokeField = `<div class="field"><label>Nage</label>${swimStrokeSelectHTML(b.stroke)}</div>`;
    const lengthsField = `<div class="field"><label>Longueurs</label><input class="swim-block-lengths" type="number" inputmode="numeric" placeholder="ex. 20" value="${b.lengths}"></div>`;
    const durationField = `<div class="field"><label>Durée (min, optionnel)</label><input class="swim-block-duration" type="text" inputmode="decimal" placeholder="ex. 25" value="${b.duration}"></div>`;
    const poolChip = `<div class="block-pool-chip ${parseFloat(pool.value) > 0 ? "" : "block-pool-chip-missing"}" data-pool-chip role="button" tabindex="0">${swimPoolChipHTML(pool.value)}</div>`;
    fieldsHTML = (unified
      ? `
    ${poolChip}
    <div class="block-fields-row">${lengthsField}${durationField}</div>
    <div class="block-fields-row">${strokeField}</div>`
      : `
    <div class="block-fields-row">
      <div class="field"><label>Taille du bassin (m)</label><input class="swim-block-poollength" type="text" inputmode="decimal" placeholder="ex. 25" value="${b.poolLength}"></div>
      ${lengthsField}
    </div>
    <div class="block-fields-row">${strokeField}${durationField}</div>`) + `
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
  const pool = swimPoolContext();
  const blocksHTML = swimDraft.blocks.map((b) => swimBlockCardHTML(b, pool)).join("");
  // « Bassin » : une ligne pour toute la séance. Toujours affichée (même sans bloc en mode Bassin)
  // pour qu'on la trouve en passant un bloc en mode Bassin, plutôt que de la voir apparaître hors
  // de l'écran, tout en haut.
  const poolRowHTML = `<label class="field-list-row" for="swim-pool-length"><span>Bassin (m)</span><input type="text" inputmode="decimal" id="swim-pool-length" placeholder="${pool.mixed ? "Plusieurs — saisir pour tout unifier" : "ex. 25"}" value="${pool.value.replace(/"/g, "&quot;")}"></label>`;
  const libOptions = swimLibrary.map((n) => `<option value="${n.replace(/"/g, "&quot;")}">`).join("");
  const editBanner = swimEditingSessionId
    ? `<div class="edit-banner">Modification d'une séance existante<button type="button" id="swim-cancel-edit-btn">Annuler</button></div>`
    : swimEditingPlanId
      ? `<div class="edit-banner">Modification d'un plan existant<button type="button" id="swim-cancel-edit-btn">Annuler</button></div>`
      : "";
  const isPlan = swimDraft.kind === "plan";
  const fieldsHTML = isPlan
    ? `<div class="field-list-card"><label class="field-list-row" for="swim-label"><span>Nom du plan</span><input type="text" id="swim-label" placeholder="Séance technique…" value="${(swimDraft.label || "").replace(/"/g, "&quot;")}"></label>${poolRowHTML}</div>`
    : `
    <div class="field-list-card">
      <label class="field-list-row" for="swim-date"><span>Date</span><input type="date" id="swim-date" value="${swimDraft.date}"></label>
      <label class="field-list-row" for="swim-label"><span>Séance</span><input type="text" id="swim-label" placeholder="Séance technique…" value="${(swimDraft.label || "").replace(/"/g, "&quot;")}"></label>
      ${poolRowHTML}
    </div>`;
  return `
    <div class="backup-row">
      <button class="backup-btn" id="swim-import-draft-btn">${ICONS.down} ${isPlan ? "Importer un plan" : "Importer une séance"}</button>
      <button class="backup-btn" id="swim-reset-draft-btn">${ICONS.reset} Réinitialiser</button>
      <input type="file" id="swim-import-draft-file" accept="application/json" style="display:none">
    </div>
    ${editBanner}
    ${fieldsHTML}
    <div class="run-summary-bar" id="swim-summary-bar">${formatSwimSessionTotalsLine(swimBlocksWithPool(swimDraft.blocks, pool))}</div>
    <div id="swim-blocks-container">${blocksHTML}</div>
    <datalist id="swim-block-suggestions"><option value="Échauffement"><option value="Technique"><option value="Endurance"><option value="Récupération">${libOptions}</datalist>
    
    <div id="log-bottom-spacer" style="height:0;"></div>
  `;
}

function swimLogActionsBarContentHTML() {
  const isPlan = swimDraft.kind === "plan";
  const saveLabel = isPlan
    ? swimEditingPlanId
      ? "Enregistrer les modifications"
      : "Enregistrer le plan"
    : swimEditingSessionId
      ? "Enregistrer les modifications"
      : "Enregistrer la séance";
  return `
    <div id="swim-error-slot"></div>
    <button class="add-exercise-btn" id="add-swim-block-btn">${ICONS.plus} Ajouter un bloc</button>
    <button class="save-btn" id="save-swim-session-btn">${ICONS.check} ${saveLabel}</button>
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
  if (dateEl) dateEl.addEventListener("input", scheduleSwimDraftSave);
  labelEl.addEventListener("input", scheduleSwimDraftSave);

  const poolEl = document.getElementById("swim-pool-length");
  const goToPoolRow = () => {
    poolEl.scrollIntoView({ block: "center", behavior: "smooth" });
    poolEl.focus({ preventScroll: true });
  };
  document.querySelectorAll("#swim-blocks-container [data-pool-chip]").forEach((chip) => {
    chip.addEventListener("click", goToPoolRow);
    chip.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goToPoolRow();
      }
    });
  });
  poolEl.addEventListener("input", () => {
    document.querySelectorAll('#swim-blocks-container .exercise-card[data-mode="pool"]').forEach(updateSwimPoolCardHint);
    updateSwimSummaryBar();
    scheduleSwimDraftSave();
  });
  // Ancienne séance à plusieurs bassins : une taille saisie en haut s'applique à tous les blocs,
  // on réaffiche donc la séance en mode unifié (sans les champs par bloc) une fois la saisie finie.
  poolEl.addEventListener("change", () => {
    if (poolEl.value.trim() && document.querySelector("#swim-blocks-container .swim-block-poollength")) {
      swimDraft.blocks = serializeSwimBlocksFromDOM();
      saveJSON(KEYS.swimDraft, swimDraft);
      renderContentPreservingScroll(renderSwimContent, () => {});
    }
  });

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
      const poolLengthEl = card.querySelector(".swim-block-poollength"); // seulement pour une ancienne séance à plusieurs bassins
      const lengthsEl = card.querySelector(".swim-block-lengths");
      const strokeEl = card.querySelector(".swim-block-stroke");
      const durationEl = card.querySelector(".swim-block-duration");
      [poolLengthEl, lengthsEl, durationEl].filter(Boolean).forEach((el) => {
        el.addEventListener("input", () => {
          updateSwimPoolCardHint(card);
          updateSwimSummaryBar();
          scheduleSwimDraftSave();
        });
      });
      strokeEl.addEventListener("change", scheduleSwimDraftSave);
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
      card.classList.add("exercise-card-exit");
      setTimeout(renderSwimContent, 200);
    });

    card.querySelectorAll("[data-block-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const newMode = btn.dataset.blockType;
        if (card.dataset.mode === newMode) return;
        const blocks = serializeSwimBlocksFromDOM();
        const target = blocks.find((b) => b.id === card.dataset.id);
        target.mode = newMode;
        if (newMode === "pool" && !(parseFloat(target.poolLength) > 0)) {
          target.poolLength = nearestSwimPoolLength(blocks, blocks.indexOf(target));
        }
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
    // En bassin, tous les blocs sont en mode Bassin : on ne refait pas le choix à chaque bloc.
    // (Le mode « Distance + Durée » sert surtout en eau libre, aussi constant sur une séance ;
    // il reste le choix par défaut tant qu'on n'a pas choisi Bassin.)
    const previousBlock = blocks[blocks.length - 1];
    if (previousBlock && previousBlock.mode === "pool") newBlock.mode = "pool";
    // La taille du bassin est celle du bloc précédent : on ne la ressaisit pas. (En séance
    // « normale » la ligne du haut l'impose déjà à tous les blocs ; cette copie sert quand chaque
    // bloc a son propre champ — ancienne séance à plusieurs bassins.)
    if (newBlock.mode === "pool") newBlock.poolLength = nearestSwimPoolLength([...blocks, newBlock], blocks.length);
    blocks.push(newBlock);
    swimDraft.blocks = blocks;
    saveJSON(KEYS.swimDraft, swimDraft);
    renderContentPreservingScroll(renderSwimContent, () => {
      const newCard = document.querySelector(`.exercise-card[data-id="${newBlock.id}"]`);
      if (newCard) newCard.classList.add("exercise-card-enter");
      // Le haut du bloc, pas son bas — même raison que pour "Ajouter un
      // exercice" (Salle de sport) : un bloc neuf n'a rien à montrer avant
      // son propre haut.
      scrollCardTopIntoView(newCard, 16, true);
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

    if (swimDraft.kind === "plan") {
      errorSlot.innerHTML = "";
      const wasEditingPlan = !!swimEditingPlanId;
      const planLabel = labelEl.value.trim() || `Plan ${swimSessionPlans.filter((p) => p.id !== swimEditingPlanId).length + 1}`;
      const plan = { id: swimEditingPlanId || uid(), label: planLabel, blocks };
      if (wasEditingPlan) {
        swimSessionPlans = swimSessionPlans.map((p) => (p.id === swimEditingPlanId ? plan : p));
      } else {
        swimSessionPlans = [plan, ...swimSessionPlans];
      }
      saveJSON(KEYS.swimSessionPlans, swimSessionPlans);
      clearSwimDraft();
      justLandedItemId = plan.id;
      playSaveTravelAnimation(ICONS.check, wasEditingPlan ? "Plan modifié" : "Plan enregistré", `${blocks.length} bloc${blocks.length !== 1 ? "s" : ""}`, () => {
        swimTab = "history";
        swimTopMode = "plan";
        renderSwimApp();
      });
      return;
    }
    errorSlot.innerHTML = "";

    const wasEditing = !!swimEditingSessionId;
    const otherCount = swimSessions.filter((s) => s.id !== swimEditingSessionId).length;
    const sessionLabel = labelEl.value.trim() || `Séance ${otherCount + 1}`;
    const session = { id: swimEditingSessionId || uid(), date: dateEl.value, label: sessionLabel, blocks };
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
    justLandedItemId = session.id;
    playSaveTravelAnimation(ICONS.check, wasEditing ? "Séance modifiée" : "Séance enregistrée", `${blocks.length} bloc${blocks.length !== 1 ? "s" : ""}`, () => {
      swimTopMode = "session";
      swimTab = "history";
      renderSwimApp();
    });
  });
}

