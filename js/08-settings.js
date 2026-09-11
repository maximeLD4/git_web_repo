
function categoryLabel(key) {
  const found = GYM_EXERCISE_CATEGORIES.find((c) => c.key === key);
  return found ? found.label : key;
}

function weightChipAreaHTML(config) {
  if (!config || !config.baseWeights || config.baseWeights.length === 0) return "";
  const bases = [...config.baseWeights].sort((a, b) => a - b);
  const maxInc = config.maxIncrement || 0;
  const baseChips = bases.map((w) => `<button type="button" class="weight-chip" data-base-chip="${w}">${w}kg</button>`).join("");
  let incRow = "";
  if (maxInc > 0) {
    const incs = [];
    for (let i = 0; i <= maxInc; i++) incs.push(i);
    incRow = `<div class="weight-chip-row increments">${incs
      .map((i) => `<button type="button" class="weight-chip increment" data-inc-chip="${i}">${i === 0 ? "+0" : "+" + i}</button>`)
      .join("")}</div>`;
  }
  return `<div class="weight-chip-label">${ICONS.gear} Poids rapide (${config.name})</div><div class="weight-chip-row">${baseChips}</div>${incRow}`;
}

function renderSettingsApp() {
  app.className = "theme-settings";
  app.innerHTML = `
    <div class="header">
      <button type="button" class="back-btn" data-go-home>${ICONS.back}</button>
      <div class="header-icon-only">${ICONS.gear}</div>
      <div class="header-sub">${currentUser && currentUser.email ? currentUser.email : "Personnalise chaque section"}</div>
    </div>
    <div class="content" id="content" style="padding-bottom: 90px;"></div>
    <div style="position:fixed; left:0; right:0; bottom:calc(16px + env(safe-area-inset-bottom)); display:flex; justify-content:center;">
      <button type="button" class="backup-btn" id="logout-btn" style="flex:none; padding-left:22px; padding-right:22px;">${ICONS.logout} Se déconnecter</button>
    </div>
    <div id="app-version-label" style="position:fixed; right:14px; bottom:calc(10px + env(safe-area-inset-bottom)); font-size:11px; color:var(--text-dim); opacity:0.5; font-family:-apple-system,system-ui,sans-serif;">${appVersion ? "v" + appVersion : ""}</div>
  `;
  document.querySelector("[data-go-home]").addEventListener("click", goHome);
  document.getElementById("logout-btn").addEventListener("click", () => {
    showConfirm("Te déconnecter ?", logoutUser, { confirmLabel: "Se déconnecter", danger: true });
  });
  renderSettingsContent();
}

function renderSettingsContent() {
  document.getElementById("content").innerHTML = `
    <div class="home-card" data-open-settings="gym">
      <div class="home-card-icon" style="background: rgba(var(--rgb-gym), 0.14); color: rgb(var(--rgb-gym));">${ICONS.dumbbell}</div>
      <div class="home-card-text">
        <div class="home-card-title">Salle de sport</div>
        <div class="home-card-sub">${gymExerciseConfigs.length + gainageExerciseConfigs.length} exercice${gymExerciseConfigs.length + gainageExerciseConfigs.length !== 1 ? "s" : ""} configuré${gymExerciseConfigs.length + gainageExerciseConfigs.length !== 1 ? "s" : ""}</div>
      </div>
      <div class="home-card-arrow">${ICONS.chevronRight}</div>
    </div>
    <div class="home-section-label" style="margin: 20px 0 10px;">Apparence</div>
    <div class="ex-type-toggle" style="margin-bottom: 12px;">
      <button type="button" class="ex-type-btn ${colorMode === "day" ? "active" : ""}" data-color-mode="day">${ICONS.sun} Jour</button>
      <button type="button" class="ex-type-btn ${colorMode === "night" ? "active" : ""}" data-color-mode="night">${ICONS.moon} Nuit</button>
      <button type="button" class="ex-type-btn ${colorMode === "anne" ? "active" : ""}" data-color-mode="anne">${ICONS.heart} Anne</button>
    </div>
  `;
  document.querySelector("[data-open-settings]").addEventListener("click", () => {
    currentApp = "settings-gym";
    render();
  });
  document.querySelectorAll("[data-color-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.colorMode;
      if (mode === colorMode) return;
      applyColorMode(mode);
      saveJSON(KEYS.colorMode, mode);
      // Re-rendu complet (pas juste ce petit toggle) : les couleurs de
      // module (icônes, etc.) codées en dur ailleurs dans ce même écran
      // doivent, elles aussi, refléter le nouveau mode tout de suite.
      renderSettingsApp();
    });
  });
}

function gymSettingsListHTML() {
  const uncategorized = gymExerciseConfigs.some((c) => !GYM_EXERCISE_CATEGORIES.some((cat) => cat.key === c.category));
  const tabs = [{ key: "all", label: "Tous" }, ...GYM_EXERCISE_CATEGORIES, ...(uncategorized ? [{ key: "other", label: "Autres" }] : [])];
  const tabsHTML = `
    <div class="ex-type-toggle wrap-toggle" style="margin-bottom:16px;">
      ${tabs
        .map(
          (t) =>
            `<button type="button" class="ex-type-btn ${gymSettingsActiveCategory === t.key ? "active" : ""}" data-settings-category="${t.key}">${t.label}</button>`
        )
        .join("")}
    </div>`;

  const filtered =
    gymSettingsActiveCategory === "all"
      ? gymExerciseConfigs
      : gymExerciseConfigs.filter((c) => {
          const cat = GYM_EXERCISE_CATEGORIES.some((k) => k.key === c.category) ? c.category : "other";
          return cat === gymSettingsActiveCategory;
        });

  const emptyState = `<div class="empty-state">Aucun exercice ${gymSettingsActiveCategory === "all" ? "configuré" : "dans cette catégorie"} pour l'instant.<br>Ajoute tes machines habituelles pour gagner du temps à la salle.</div>`;
  const items = [...filtered]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => {
      const bases = [...c.baseWeights].sort((a, b) => a - b).join(", ");
      const incLabel = c.maxIncrement > 0 ? ` · +0 ou +${c.maxIncrement}kg` : "";
      const autoIncLabel = c.autoIncrement ? ` · Incrément auto` : "";
      return `
      <div class="history-card">
        <div class="history-head" data-edit-config="${c.id}" style="cursor:pointer;">
          <div class="history-head-left">
            <div class="exercise-config-name">${c.name}</div>
            <div class="history-label">${bases ? bases + " kg" : "Aucun palier"}${incLabel}${autoIncLabel}</div>
          </div>
          <button type="button" class="icon-btn" data-duplicate-config="${c.id}" aria-label="Dupliquer">${ICONS.duplicate}</button>
          <button type="button" class="icon-btn" data-delete-config="${c.id}" aria-label="Supprimer">${ICONS.trash}</button>
        </div>
      </div>`;
    })
    .join("");
  return `${tabsHTML}${filtered.length === 0 ? emptyState : items}`;
}

function gymSettingsFormHTML() {
  const chips = gymSettingsFormDraft.baseWeights.length
    ? [...gymSettingsFormDraft.baseWeights]
        .sort((a, b) => a - b)
        .map((w) => `<span class="weight-chip removable">${w}kg <button type="button" data-remove-base-weight="${w}">${ICONS.x}</button></span>`)
        .join("")
    : `<span style="color:var(--text-dim); font-size:13px;">Aucun palier ajouté</span>`;
  // On ne propose pas les suggestions déjà utilisées par un AUTRE exercice
  // configuré — inutile de suggérer un nom qui provoquerait immédiatement une
  // erreur de doublon à l'enregistrement. L'exercice en cours d'édition
  // garde le droit de voir son propre nom parmi les suggestions.
  const usedNamesLower = new Set(
    gymExerciseConfigs.filter((c) => c.id !== gymSettingsEditingConfigId).map((c) => c.name.trim().toLowerCase())
  );
  const suggestions = (EXERCISE_SUGGESTIONS[gymSettingsFormDraft.category] || []).filter(
    (n) => !usedNamesLower.has(n.trim().toLowerCase())
  );
  const suggestionsHTML = suggestions
    .map((n) => `<button type="button" class="weight-chip" data-suggest-name="${n.replace(/"/g, "&quot;")}">${n}</button>`)
    .join("");
  return `
    <div class="exercise-card" style="padding: 16px 14px 16px 19px;">
      <div class="field" style="margin-bottom:14px;">
        <label>Catégorie</label>
        <div class="ex-type-toggle wrap-toggle" id="config-category-toggle">
          ${GYM_EXERCISE_CATEGORIES.map(
            (t) => `<button type="button" class="ex-type-btn ${gymSettingsFormDraft.category === t.key ? "active" : ""}" data-form-category="${t.key}">${t.label}</button>`
          ).join("")}
        </div>
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label>Suggestions (tape sur un nom pour le préremplir)</label>
        <div class="weight-chip-row" id="config-suggestions-row">${suggestionsHTML}</div>
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label>Nom de l'exercice / machine</label>
        <input type="text" id="config-name-input" placeholder="Ex. Leg press, Développé couché…" value="${(gymSettingsFormDraft.name || "").replace(/"/g, "&quot;")}">
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label>Poids possibles (paliers de la machine)</label>
        <div class="weight-chip-row" id="config-base-weights-row">${chips}</div>
        <button type="button" class="backup-btn" id="config-scan-weights-btn" style="margin-top:8px;">${ICONS.camera} Scanner les poids depuis une photo</button>
        <div class="inline-add-row" style="margin-top:8px;">
          <input type="text" inputmode="decimal" id="config-new-base-weight" placeholder="Ex. 20">
          <button type="button" class="add-exercise-btn" id="config-add-base-weight-btn" style="margin:0;">${ICONS.plus} Ajouter</button>
        </div>
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label>Incrément automatique</label>
        <div class="toggle-switch-row">
          <span class="toggle-switch-label-text">Passe automatiquement au palier de poids supérieur d'une série à l'autre en Séance en direct. Laisse sur off si tu préfères refaire plusieurs séries au même poids.</span>
          <button type="button" class="toggle-switch ${gymSettingsFormDraft.autoIncrement ? "on" : ""}" id="config-auto-increment-toggle" role="switch" aria-checked="${gymSettingsFormDraft.autoIncrement ? "true" : "false"}">
            <span class="toggle-switch-knob"></span>
          </button>
        </div>
      </div>
      <div class="field" style="margin-bottom:6px;">
        <label>Incrément possible (kg)</label>
        <input type="text" inputmode="decimal" min="0" id="config-max-increment" value="${gymSettingsFormDraft.maxIncrement || 0}">
        <div style="color:var(--text-dim); font-size:12px; margin-top:4px;">Poids fixe qu'on peut ajouter manuellement sur cette machine (ex. 5). Sur chaque palier, le choix sera alors +0 ou +5kg — jamais une valeur intermédiaire. Mets 0 si la machine n'a pas cette option.</div>
      </div>
      <div id="config-form-error"></div>
      <button class="save-btn" id="save-config-btn">${ICONS.check} Enregistrer</button>
      <button class="backup-btn" id="cancel-config-btn" style="margin-top:10px;">Annuler</button>
    </div>
  `;
}

// Si on est arrivé ici via "Configurer un exercice" depuis Séance en
// direct, renvoie exactement là-bas (pas un Live "frais" qui repartirait
// de zéro) plutôt que vers Paramètres ou l'Accueil. Utilisé aussi bien en
// quittant après avoir enregistré qu'en revenant en arrière sans rien
// ajouter — dans les deux cas, Live est là où on veut retourner.
function returnFromSettingsToLiveIfNeeded() {
  if (!liveConfigReturnTarget) return false;
  liveConfigReturnTarget = false;
  currentApp = "live";
  renderLiveApp(false);
  return true;
}

function renderGymSettingsApp() {
  app.className = "theme-gym";
  app.innerHTML = `
    <div class="header">
      <button type="button" class="back-btn" data-back-settings>${ICONS.back}</button>
      <div class="header-icon-only">${ICONS.dumbbell}</div>
      <div class="header-sub">Exercices préconfigurés</div>
    </div>
    <div class="content" id="content" style="padding-bottom: 90px;"></div>
    <div class="log-actions-bar" id="settings-actions-bar" style="display:none; bottom:0; padding-bottom: calc(12px + env(safe-area-inset-bottom));"></div>
  `;
  document.querySelector("[data-back-settings]").addEventListener("click", () => {
    const formOpen = gymSettingsMode === "gainage" ? gainageSettingsFormOpen : gymSettingsFormOpen;
    if (formOpen) {
      // On était en train d'éditer/ajouter un exercice : le bouton retour se
      // comporte comme "Annuler", il ferme juste le formulaire et reste sur
      // la liste — il ne sort de la section Salle de sport que si on y est
      // déjà (sinon, avant ce correctif, on ressortait directement vers
      // Paramètres même sans avoir voulu quitter la liste).
      if (gymSettingsMode === "gainage") gainageSettingsFormOpen = false;
      else gymSettingsFormOpen = false;
      renderGymSettingsContent();
    } else {
      if (returnFromSettingsToLiveIfNeeded()) return;
      currentApp = "settings";
      render();
    }
  });
  renderGymSettingsContent();
}

function renderGymSettingsContent() {
  const formOpen = gymSettingsMode === "gainage" ? gainageSettingsFormOpen : gymSettingsFormOpen;
  const body =
    gymSettingsMode === "gainage"
      ? gainageSettingsFormOpen
        ? gainageSettingsFormHTML()
        : gainageSettingsListHTML()
      : gymSettingsFormOpen
        ? gymSettingsFormHTML()
        : gymSettingsListHTML();
  // La bascule Muscu/Gainage ne s'affiche que sur les listes — pas pendant
  // l'édition d'un exercice, où elle n'aurait pas de sens.
  document.getElementById("content").innerHTML = (formOpen ? "" : gymSettingsModeToggleHTML()) + body;

  // Le bouton "Ajouter" vit dans une barre fixe en bas d'écran plutôt qu'en
  // bas de la liste défilante — toujours accessible sans avoir à dérouler
  // toute la liste, comme pour l'écran Créer (voir positionLogActionsBar,
  // qui ne s'applique pas ici : cet écran n'a pas de barre d'onglets).
  const actionsBar = document.getElementById("settings-actions-bar");
  if (actionsBar) {
    if (formOpen) {
      actionsBar.style.display = "none";
      actionsBar.innerHTML = "";
    } else {
      actionsBar.style.display = "";
      actionsBar.innerHTML =
        gymSettingsMode === "gainage"
          ? `<button class="add-exercise-btn" id="add-gainage-config-btn" style="margin:0;">${ICONS.plus} Ajouter un exercice de gainage</button>`
          : `<button class="add-exercise-btn" id="add-config-btn" style="margin:0;">${ICONS.plus} Ajouter un exercice</button>`;
    }
  }

  attachGymSettingsListeners();
}

// Bascule entre les deux listes gérées séparément (Salle de sport regroupe
// désormais les exercices Muscu ET les exercices de Gainage — voir
// CARDIO_CATEGORIES/GAINAGE_CATEGORY).
function gymSettingsModeToggleHTML() {
  return `
    <div class="ex-type-toggle" style="margin-bottom:16px;">
      <button type="button" class="ex-type-btn ${gymSettingsMode === "muscu" ? "active" : ""}" data-gym-settings-mode="muscu">${ICONS.dumbbell} Muscu</button>
      <button type="button" class="ex-type-btn ${gymSettingsMode === "gainage" ? "active" : ""}" data-gym-settings-mode="gainage">${ICONS.stopwatch} Gainage</button>
    </div>`;
}

// ---------- Gainage : liste et formulaire, volontairement minimalistes ----------
// (juste un nom — le gainage se travaille au temps, jamais au poids).
function gainageSettingsListHTML() {
  const emptyState = `<div class="empty-state">Aucun exercice de gainage configuré pour l'instant.<br>Ajoute tes mouvements habituels (planche, gainage latéral...) pour les retrouver directement en Séance en direct.</div>`;
  const items = [...gainageExerciseConfigs]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (c) => `
      <div class="history-card">
        <div class="history-head" data-edit-gainage-config="${c.id}" style="cursor:pointer;">
          <div class="history-head-left">
            <div class="exercise-config-name">${c.name}</div>
          </div>
          <button type="button" class="icon-btn" data-duplicate-gainage-config="${c.id}" aria-label="Dupliquer">${ICONS.duplicate}</button>
          <button type="button" class="icon-btn" data-delete-gainage-config="${c.id}" aria-label="Supprimer">${ICONS.trash}</button>
        </div>
      </div>`
    )
    .join("");
  return `${gainageExerciseConfigs.length === 0 ? emptyState : items}`;
}

function gainageSettingsFormHTML() {
  const usedNamesLower = new Set(
    gainageExerciseConfigs.filter((c) => c.id !== gainageSettingsEditingConfigId).map((c) => c.name.trim().toLowerCase())
  );
  const suggestions = (EXERCISE_SUGGESTIONS.gainage || []).filter((n) => !usedNamesLower.has(n.trim().toLowerCase()));
  const suggestionsHTML = suggestions
    .map((n) => `<button type="button" class="weight-chip" data-suggest-gainage-name="${n.replace(/"/g, "&quot;")}">${n}</button>`)
    .join("");
  return `
    <div class="exercise-card" style="padding: 16px 14px 16px 19px;">
      <div class="field" style="margin-bottom:14px;">
        <label>Suggestions (tape sur un nom pour le préremplir)</label>
        <div class="weight-chip-row" id="gainage-suggestions-row">${suggestionsHTML}</div>
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label>Nom de l'exercice de gainage</label>
        <input type="text" id="gainage-config-name-input" placeholder="Ex. Planche, Gainage latéral…" value="${(gainageSettingsFormDraft.name || "").replace(/"/g, "&quot;")}">
      </div>
      <div id="gainage-config-form-error"></div>
      <button class="save-btn" id="save-gainage-config-btn">${ICONS.check} Enregistrer</button>
      <button class="backup-btn" id="cancel-gainage-config-btn" style="margin-top:10px;">Annuler</button>
    </div>
  `;
}

function attachGymSettingsListeners() {
  document.querySelectorAll("[data-gym-settings-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      gymSettingsMode = btn.dataset.gymSettingsMode;
      renderGymSettingsContent();
    });
  });
  // Toujours câblée, quel que soit le mode affiché : les sélecteurs qu'elle
  // cible sont simplement absents du DOM (donc no-op) quand on est côté
  // Muscu — pas besoin de la conditionner.
  attachGainageSettingsListeners();
  document.querySelectorAll("[data-settings-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      gymSettingsActiveCategory = btn.dataset.settingsCategory;
      renderGymSettingsContent();
    });
  });
  const addBtn = document.getElementById("add-config-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      gymSettingsFormOpen = true;
      gymSettingsEditingConfigId = null;
      const defaultCategory = gymSettingsActiveCategory === "other" || gymSettingsActiveCategory === "all" ? "pecs" : gymSettingsActiveCategory;
      gymSettingsFormDraft = { name: "", category: defaultCategory, baseWeights: [], maxIncrement: 0, autoIncrement: false };
      gymSettingsFocusTarget = "name";
      renderGymSettingsContent();
    });
  }
  document.querySelectorAll("[data-edit-config]").forEach((el) => {
    el.addEventListener("click", () => {
      const config = gymExerciseConfigs.find((c) => c.id === el.dataset.editConfig);
      if (!config) return;
      gymSettingsFormOpen = true;
      gymSettingsEditingConfigId = config.id;
      gymSettingsFormDraft = {
        name: config.name,
        category: GYM_EXERCISE_CATEGORIES.some((c) => c.key === config.category) ? config.category : "pecs",
        baseWeights: [...config.baseWeights],
        maxIncrement: config.maxIncrement || 0,
        autoIncrement: config.autoIncrement || false,
      };
      gymSettingsFocusTarget = "name";
      renderGymSettingsContent();
    });
  });
  document.querySelectorAll("[data-duplicate-config]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const config = gymExerciseConfigs.find((c) => c.id === btn.dataset.duplicateConfig);
      if (!config) return;
      gymSettingsFormOpen = true;
      gymSettingsEditingConfigId = null; // duplication = nouvelle entrée, pas modification de l'original
      gymSettingsFormDraft = {
        name: config.name + " (copie)",
        category: config.category || "pecs",
        baseWeights: [...config.baseWeights],
        maxIncrement: config.maxIncrement || 0,
        autoIncrement: config.autoIncrement || false,
      };
      gymSettingsFocusTarget = "name";
      renderGymSettingsContent();
    });
  });
  document.querySelectorAll("[data-delete-config]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      showConfirm(
        "Supprimer cet exercice configuré ? Les séances déjà enregistrées ne sont pas affectées.",
        () => {
          gymExerciseConfigs = gymExerciseConfigs.filter((c) => c.id !== btn.dataset.deleteConfig);
          saveJSON(KEYS.gymExerciseConfigs, gymExerciseConfigs);
          renderGymSettingsContent();
        },
        { confirmLabel: "Supprimer", danger: true }
      );
    });
  });

  if (!gymSettingsFormOpen) return;

  const nameInput = document.getElementById("config-name-input");
  const incInput = document.getElementById("config-max-increment");
  const newWeightInput = document.getElementById("config-new-base-weight");

  function syncFormFromInputs() {
    gymSettingsFormDraft.name = nameInput.value;
    gymSettingsFormDraft.maxIncrement = parseFloat(incInput.value) || 0;
  }

  document.querySelectorAll("[data-form-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      syncFormFromInputs();
      gymSettingsFormDraft.category = btn.dataset.formCategory;
      renderGymSettingsContent();
    });
  });
  document.querySelectorAll("[data-suggest-name]").forEach((btn) => {
    btn.addEventListener("click", () => {
      nameInput.value = btn.dataset.suggestName;
      nameInput.focus();
    });
  });
  document.getElementById("config-add-base-weight-btn").addEventListener("click", () => {
    syncFormFromInputs();
    const val = parseFloat(newWeightInput.value);
    if (!isNaN(val) && val >= 0 && !gymSettingsFormDraft.baseWeights.includes(val)) {
      gymSettingsFormDraft.baseWeights.push(val);
    }
    gymSettingsFocusTarget = "weight";
    renderGymSettingsContent();
  });
  document.getElementById("config-auto-increment-toggle").addEventListener("click", () => {
    syncFormFromInputs();
    gymSettingsFormDraft.autoIncrement = !gymSettingsFormDraft.autoIncrement;
    renderGymSettingsContent();
  });
  document.getElementById("config-scan-weights-btn").addEventListener("click", () => {
    // On synchronise le formulaire (nom, incrément) avant de le quitter
    // temporairement, pour ne rien perdre au retour depuis le scanner.
    syncFormFromInputs();
    scannerReturnTarget = "gym-settings-weights";
    currentApp = "scanner";
    render();
  });
  document.querySelectorAll("[data-remove-base-weight]").forEach((btn) => {
    btn.addEventListener("click", () => {
      syncFormFromInputs();
      const val = parseFloat(btn.dataset.removeBaseWeight);
      gymSettingsFormDraft.baseWeights = gymSettingsFormDraft.baseWeights.filter((w) => w !== val);
      renderGymSettingsContent();
    });
  });
  document.getElementById("cancel-config-btn").addEventListener("click", () => {
    gymSettingsFormOpen = false;
    renderGymSettingsContent();
  });
  document.getElementById("save-config-btn").addEventListener("click", () => {
    syncFormFromInputs();
    const errorSlot = document.getElementById("config-form-error");
    const name = capitalizeFirst(gymSettingsFormDraft.name.trim());
    if (!name) {
      errorSlot.innerHTML = `<div class="error-msg">Donne un nom à cet exercice.</div>`;
      return;
    }
    if (gymSettingsFormDraft.baseWeights.length === 0) {
      errorSlot.innerHTML = `<div class="error-msg">Ajoute au moins un poids possible.</div>`;
      return;
    }
    const nameLower = name.toLowerCase();
    const isDuplicate = gymExerciseConfigs.some((c) => c.id !== gymSettingsEditingConfigId && c.name.trim().toLowerCase() === nameLower);
    if (isDuplicate) {
      errorSlot.innerHTML = `<div class="error-msg">Un exercice nommé « ${name} » existe déjà — choisis un nom différent.</div>`;
      return;
    }
    errorSlot.innerHTML = "";
    const newConfig = {
      id: gymSettingsEditingConfigId || uid(),
      name,
      category: gymSettingsFormDraft.category,
      baseWeights: Array.from(new Set(gymSettingsFormDraft.baseWeights)).sort((a, b) => a - b),
      maxIncrement: gymSettingsFormDraft.maxIncrement || 0,
      autoIncrement: !!gymSettingsFormDraft.autoIncrement,
    };
    if (gymSettingsEditingConfigId) {
      gymExerciseConfigs = gymExerciseConfigs.map((c) => (c.id === gymSettingsEditingConfigId ? newConfig : c));
    } else {
      gymExerciseConfigs.push(newConfig);
    }
    saveJSON(KEYS.gymExerciseConfigs, gymExerciseConfigs);
    gymSettingsFormOpen = false;
    if (returnFromSettingsToLiveIfNeeded()) return;
    renderGymSettingsContent();
  });
  if (gymSettingsFocusTarget === "weight") {
    const weightInput = document.getElementById("config-new-base-weight");
    if (weightInput) weightInput.focus();
  } else {
    nameInput.focus();
  }
  // On retombe sur "name" par défaut pour le prochain rendu, sauf si une
  // action explicite redemande "weight" avant le prochain appel.
  gymSettingsFocusTarget = "name";
}

// ---------- Gainage : écouteurs (liste + formulaire), séparés de ceux de
// Muscu ci-dessus — deux listes, deux formulaires, aucun état partagé. ----------
function attachGainageSettingsListeners() {
  const addBtn = document.getElementById("add-gainage-config-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      gainageSettingsFormOpen = true;
      gainageSettingsEditingConfigId = null;
      gainageSettingsFormDraft = { name: "" };
      renderGymSettingsContent();
    });
  }
  document.querySelectorAll("[data-edit-gainage-config]").forEach((el) => {
    el.addEventListener("click", () => {
      const config = gainageExerciseConfigs.find((c) => c.id === el.dataset.editGainageConfig);
      if (!config) return;
      gainageSettingsFormOpen = true;
      gainageSettingsEditingConfigId = config.id;
      gainageSettingsFormDraft = { name: config.name };
      renderGymSettingsContent();
    });
  });
  document.querySelectorAll("[data-duplicate-gainage-config]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const config = gainageExerciseConfigs.find((c) => c.id === btn.dataset.duplicateGainageConfig);
      if (!config) return;
      gainageSettingsFormOpen = true;
      gainageSettingsEditingConfigId = null;
      gainageSettingsFormDraft = { name: config.name + " (copie)" };
      renderGymSettingsContent();
    });
  });
  document.querySelectorAll("[data-delete-gainage-config]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      showConfirm(
        "Supprimer cet exercice de gainage configuré ? Les séances déjà enregistrées ne sont pas affectées.",
        () => {
          gainageExerciseConfigs = gainageExerciseConfigs.filter((c) => c.id !== btn.dataset.deleteGainageConfig);
          saveJSON(KEYS.gainageExerciseConfigs, gainageExerciseConfigs);
          renderGymSettingsContent();
        },
        { confirmLabel: "Supprimer", danger: true }
      );
    });
  });

  if (!gainageSettingsFormOpen) return;

  const nameInput = document.getElementById("gainage-config-name-input");
  document.querySelectorAll("[data-suggest-gainage-name]").forEach((btn) => {
    btn.addEventListener("click", () => {
      nameInput.value = btn.dataset.suggestGainageName;
      nameInput.focus();
    });
  });
  document.getElementById("cancel-gainage-config-btn").addEventListener("click", () => {
    gainageSettingsFormOpen = false;
    renderGymSettingsContent();
  });
  document.getElementById("save-gainage-config-btn").addEventListener("click", () => {
    const errorSlot = document.getElementById("gainage-config-form-error");
    const name = capitalizeFirst(nameInput.value.trim());
    if (!name) {
      errorSlot.innerHTML = `<div class="error-msg">Donne un nom à cet exercice.</div>`;
      return;
    }
    const nameLower = name.toLowerCase();
    const isDuplicate = gainageExerciseConfigs.some((c) => c.id !== gainageSettingsEditingConfigId && c.name.trim().toLowerCase() === nameLower);
    if (isDuplicate) {
      errorSlot.innerHTML = `<div class="error-msg">Un exercice de gainage nommé « ${name} » existe déjà — choisis un nom différent.</div>`;
      return;
    }
    errorSlot.innerHTML = "";
    const newConfig = { id: gainageSettingsEditingConfigId || uid(), name };
    if (gainageSettingsEditingConfigId) {
      gainageExerciseConfigs = gainageExerciseConfigs.map((c) => (c.id === gainageSettingsEditingConfigId ? newConfig : c));
    } else {
      gainageExerciseConfigs.push(newConfig);
    }
    saveJSON(KEYS.gainageExerciseConfigs, gainageExerciseConfigs);
    gainageSettingsFormOpen = false;
    if (returnFromSettingsToLiveIfNeeded()) return;
    renderGymSettingsContent();
  });
  nameInput.focus();
}
