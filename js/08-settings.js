
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
      <div class="home-card-icon" style="background: rgba(0,184,153,0.14); color: #00B899;">${ICONS.dumbbell}</div>
      <div class="home-card-text">
        <div class="home-card-title">Salle de sport</div>
        <div class="home-card-sub">${gymExerciseConfigs.length} exercice${gymExerciseConfigs.length !== 1 ? "s" : ""} configuré${gymExerciseConfigs.length !== 1 ? "s" : ""}</div>
      </div>
      <div class="home-card-arrow">${ICONS.chevronRight}</div>
    </div>
  `;
  document.querySelector("[data-open-settings]").addEventListener("click", () => {
    currentApp = "settings-gym";
    render();
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
  return `${tabsHTML}${filtered.length === 0 ? emptyState : items}<button class="add-exercise-btn" id="add-config-btn">${ICONS.plus} Ajouter un exercice</button>`;
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

function renderGymSettingsApp() {
  app.className = "theme-gym";
  app.innerHTML = `
    <div class="header">
      <button type="button" class="back-btn" data-back-settings>${ICONS.back}</button>
      <div class="header-icon-only">${ICONS.dumbbell}</div>
      <div class="header-sub">Exercices et poids préconfigurés</div>
    </div>
    <div class="content" id="content" style="padding-bottom: 24px;"></div>
  `;
  document.querySelector("[data-back-settings]").addEventListener("click", () => {
    if (gymSettingsFormOpen) {
      // On était en train d'éditer/ajouter un exercice : le bouton retour se
      // comporte comme "Annuler", il ferme juste le formulaire et reste sur
      // la liste — il ne sort de la section Salle de sport que si on y est
      // déjà (sinon, avant ce correctif, on ressortait directement vers
      // Paramètres même sans avoir voulu quitter la liste).
      gymSettingsFormOpen = false;
      renderGymSettingsContent();
    } else {
      currentApp = "settings";
      render();
    }
  });
  renderGymSettingsContent();
}

function renderGymSettingsContent() {
  document.getElementById("content").innerHTML = gymSettingsFormOpen ? gymSettingsFormHTML() : gymSettingsListHTML();
  attachGymSettingsListeners();
}

function attachGymSettingsListeners() {
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
