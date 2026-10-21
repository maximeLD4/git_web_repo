
function categoryLabel(key) {
  const found = GYM_EXERCISE_CATEGORIES.find((c) => c.key === key);
  return found ? found.label : key;
}

function viewportFixLabel() {
  const stored = getViewportMode();
  if (stored === "off") return "correctif désactivé";
  if (viewportResolvedMode === "vh") return "mode " + (stored === "auto" ? "auto → vh" : "vh") + " (hauteur réelle de l'écran)";
  const names = { auto: "auto", vh: "vh", flux: "flux", bande: "bande" };
  if (viewportFixExtra > 0) return "mode " + names[stored] + (stored === "auto" ? " → " + viewportResolvedMode : "") + " (+" + viewportFixExtra + ")";
  return "mode " + names[stored] + " (sans effet : cet appareil n'en a pas besoin)";
}

function renderSettingsApp() {
  app.className = "theme-settings";
  app.innerHTML = `
    <div class="header header-plain-title">
      <div class="screen-title">Réglages</div>
    </div>
    <div class="content" id="content" style="padding-bottom: calc(var(--bottom-nav-h) + 10px);"></div>
    <div style="position:absolute; left:0; right:0; bottom:calc(var(--bottom-nav-h) + 10px); display:flex; flex-direction:column; align-items:center; gap:10px;">
      <button type="button" class="backup-btn" id="logout-btn" style="flex:none; padding-left:22px; padding-right:22px;">${ICONS.logout} Se déconnecter</button>
      <div id="app-version-label" style="font-size:11px; color:var(--text-dim); opacity:0.55; font-family:-apple-system,system-ui,sans-serif; padding:6px 14px;">${appVersion ? "v" + appVersion : ""}</div>
    </div>
    ${bottomNavHTML("settings")}
  `;
  attachBottomNavListeners();
  // Geste discret de secours : 5 touchers rapprochés sur le numéro de version
  // changent le mode du correctif d'affichage iPhone (auto → vh → flux →
  // bande → off), au cas où un appareil afficherait mal la barre du bas. Invisible
  // pour un usage normal.
  let versionTaps = 0;
  let versionTapTimer = null;
  document.getElementById("app-version-label").addEventListener("click", () => {
    versionTaps++;
    clearTimeout(versionTapTimer);
    versionTapTimer = setTimeout(() => { versionTaps = 0; }, 2000);
    if (versionTaps >= 5) {
      versionTaps = 0;
      cycleViewportMode();
      // Mesures jointes (3.3.2) : de quoi diagnostiquer à distance un écran
      // qui affiche mal la barre du bas.
      const vv = window.visualViewport;
      let safeTop = 0;
      try { safeTop = readSafeAreaTop(); } catch (e) {}
      const standalone = (window.navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches)) ? "app installée" : "navigateur";
      showAlert("Affichage : " + viewportFixLabel() + ". [" + standalone + " · écran " + window.screen.width + "×" + window.screen.height + " · fenêtre " + window.innerWidth + "×" + window.innerHeight + " · visible " + (vv ? Math.round(vv.height) : "?") + " · haut " + Math.round(safeTop) + " · v" + appVersion + "]");
    }
  });
  document.getElementById("logout-btn").addEventListener("click", () => {
    showConfirm("Te déconnecter ?", logoutUser, { confirmLabel: "Se déconnecter", danger: true, detail: "Tes données restent sauvegardées dans ton profil." });
  });
  renderSettingsContent();
}

function renderSettingsContent() {
  const initial = currentUser && currentUser.email ? currentUser.email.charAt(0).toUpperCase() : "?";
  document.getElementById("content").innerHTML = `
    <div class="settings-profile-card">
      <div class="settings-profile-avatar">${initial}</div>
      <div>
        <div class="settings-profile-title">Mon profil</div>
        <div class="settings-profile-sub">${currentUser && currentUser.email ? currentUser.email : ""}</div>
      </div>
    </div>
    <div class="home-list" style="margin-top:14px;">
      <div class="home-list-row" data-open-settings="gym">
        <div class="home-list-icon home-list-icon-square" style="background: rgb(var(--rgb-gym));">${ICONS.dumbbell}</div>
        <div class="home-list-label">Exercices</div>
        <div class="home-list-value">${gymExerciseConfigs.length + gainageExerciseConfigs.length} configuré${gymExerciseConfigs.length + gainageExerciseConfigs.length !== 1 ? "s" : ""}</div>
        <div class="home-list-chevron">${ICONS.chevronRight}</div>
      </div>
      <div class="home-list-row" data-open-settings="appearance">
        <div class="home-list-icon home-list-icon-square" style="background: var(--yellow); color:#FFF8F0;">${ICONS.sun}</div>
        <div class="home-list-label">Apparence</div>
        <div class="home-list-value">${colorMode === "day" ? "Jour" : colorMode === "night" ? "Nuit" : "Anne"}</div>
        <div class="home-list-chevron">${ICONS.chevronRight}</div>
      </div>
      <div class="home-list-row" data-open-settings="sound">
        <div class="home-list-icon home-list-icon-square" style="background: rgb(var(--rgb-swim));">${ICONS.volume}</div>
        <div class="home-list-label">Son</div>
        <div class="home-list-value">${soundVolume}%</div>
        <div class="home-list-chevron">${ICONS.chevronRight}</div>
      </div>
      <div class="home-list-row" data-open-settings="backup">
        <div class="home-list-icon home-list-icon-square" style="background: var(--ink); color: var(--on-ink);">${ICONS.up}</div>
        <div class="home-list-label">Sauvegarde</div>
        <div class="home-list-value"></div>
        <div class="home-list-chevron">${ICONS.chevronRight}</div>
      </div>
    </div>
  `;
  document.querySelectorAll("[data-open-settings]").forEach((card) => {
    card.addEventListener("click", () => {
      const target = card.dataset.openSettings;
      currentApp = target === "gym" ? "settings-gym" : "settings-" + target;
      render();
    });
  });
}

// ---------- Apparence : sous-écran dédié ----------
function renderSettingsAppearanceApp() {
  app.className = "theme-settings";
  app.innerHTML = `
    <div class="header header-plain-title">
      <button type="button" class="back-btn-text" data-back-settings>${ICONS.back} Réglages</button>
      <div class="screen-title">Apparence</div>
    </div>
    <div class="content" id="content">
      <div class="home-section-label" style="margin-top:0;">Mode</div>
      <div class="home-list">
        <div class="home-list-row" data-color-mode="day">
          <div class="home-list-icon home-list-icon-square" style="background: var(--yellow); color:#FFF8F0;">${ICONS.sun}</div>
          <div class="home-list-label">Jour</div>
          ${colorMode === "day" ? `<div style="color:var(--text); display:flex;">${ICONS.check}</div>` : ""}
        </div>
        <div class="home-list-row" data-color-mode="night">
          <div class="home-list-icon home-list-icon-square" style="background: #241E1A; color:#FFF8F0;">${ICONS.moon}</div>
          <div class="home-list-label">Nuit</div>
          ${colorMode === "night" ? `<div style="color:var(--text); display:flex;">${ICONS.check}</div>` : ""}
        </div>
        <div class="home-list-row" data-color-mode="anne">
          <div class="home-list-icon home-list-icon-square" style="background: #9E0B2E; color:#FFF8F0;">${ICONS.heart}</div>
          <div class="home-list-label">Anne</div>
          ${colorMode === "anne" ? `<div style="color:var(--text); display:flex;">${ICONS.check}</div>` : ""}
        </div>
      </div>
      <div class="field-hint">Nuit adoucit l'écran le soir. Anne passe l'app dans une palette rose.</div>
      <div class="home-section-label" style="margin-top:22px;">Aide</div>
      <div class="field-list-card">
        <div class="field-list-row">
          <span style="flex:1;">Textes d'aide</span>
          <button type="button" class="toggle-switch ${showHints ? "on" : ""}" id="show-hints-toggle" role="switch" aria-checked="${showHints ? "true" : "false"}" aria-label="Afficher les textes d'aide">
            <span class="toggle-switch-knob"></span>
          </button>
        </div>
        <div class="field-list-row">
          <span style="flex:1;">Guide de démarrage</span>
          <button type="button" class="secondary-btn secondary-btn-inline" id="restart-onboarding-btn">Revoir</button>
        </div>
      </div>
      <div class="home-section-label" style="margin-top:22px;">Séance en direct</div>
      <div class="field-list-card">
        <div class="field-list-row">
          <span style="flex:1;">Animations</span>
          <button type="button" class="toggle-switch ${liveAnimationsOn ? "on" : ""}" id="live-animations-toggle" role="switch" aria-checked="${liveAnimationsOn ? "true" : "false"}" aria-label="Afficher les animations en Séance en direct">
            <span class="toggle-switch-knob"></span>
          </button>
        </div>
      </div>
    </div>
  `;
  // Relance le guide de première utilisation (20-onboarding.js).
  document.getElementById("restart-onboarding-btn").addEventListener("click", () => onboardingRestart());
  document.getElementById("live-animations-toggle").addEventListener("click", () => {
    liveAnimationsOn = !liveAnimationsOn;
    saveJSON(KEYS.liveAnimations, liveAnimationsOn);
    renderSettingsAppearanceApp();
  });
  document.getElementById("show-hints-toggle").addEventListener("click", () => {
    applyShowHints(!showHints);
    saveJSON(KEYS.showHints, showHints);
    renderSettingsAppearanceApp();
  });
  document.querySelector("[data-back-settings]").addEventListener("click", () => {
    currentApp = "settings";
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
      renderSettingsAppearanceApp();
    });
  });
}

// ---------- Son : sous-écran dédié ----------
function renderSettingsSoundApp() {
  app.className = "theme-settings";
  app.innerHTML = `
    <div class="header header-plain-title">
      <button type="button" class="back-btn-text" data-back-settings>${ICONS.back} Réglages</button>
      <div class="screen-title">Son</div>
    </div>
    <div class="content" id="content">
      <div class="home-section-label" style="margin-top:0;">Bips de la séance en direct</div>
      <div class="sound-card">
        <div class="sound-slider-row">
          ${ICONS.volume}
          <input type="range" id="sound-volume-slider" min="0" max="150" step="10" value="${soundVolume}">
          <span class="sound-percent" id="sound-percent">${soundVolume} %</span>
        </div>
        <button type="button" class="sound-test-btn" id="test-sound-btn">
          <span class="sound-test-icon">${ICONS.volume}</span> Tester le son
        </button>
      </div>
      <div class="field-hint">Au-delà de 100 %, le bip est plus fort que le volume d'origine : utile si la musique dans tes oreilles le couvre.</div>
    </div>
  `;
  document.querySelector("[data-back-settings]").addEventListener("click", () => {
    currentApp = "settings";
    render();
  });
  // Pas de re-rendu complet à chaque glissement (saccaderait le curseur en
  // plein geste) : juste le texte du pourcentage, mis à jour à la volée.
  // Le son n'est prévisualisé qu'au relâchement ("change"), ou sur demande
  // via le bouton dédié — pas à chaque minuscule cran du curseur.
  const soundSlider = document.getElementById("sound-volume-slider");
  const testSoundBtn = document.getElementById("test-sound-btn");
  if (soundSlider) {
    const percentEl = document.getElementById("sound-percent");
    soundSlider.addEventListener("input", () => {
      soundVolume = parseInt(soundSlider.value, 10);
      if (percentEl) percentEl.textContent = `${soundVolume} %`;
    });
    soundSlider.addEventListener("change", () => {
      saveJSON(KEYS.soundVolume, soundVolume);
      playLiveCountdownTick();
    });
  }
  if (testSoundBtn) {
    // Le décompte complet tel qu'on l'entendra dans la boucle.
    testSoundBtn.addEventListener("click", () => {
      playLiveCountdownDemo();
    });
  }
}

// ---------- Sauvegarde : sous-écran dédié ----------
function renderSettingsBackupApp() {
  app.className = "theme-settings";
  app.innerHTML = `
    <div class="header header-plain-title">
      <button type="button" class="back-btn-text" data-back-settings>${ICONS.back} Réglages</button>
      <div class="screen-title">Sauvegarde</div>
    </div>
    <div class="content" id="content">
      <div class="home-list">
        <div class="home-list-row" id="export-btn">
          <div class="home-list-icon home-list-icon-square" style="background: rgb(var(--rgb-gym));">${ICONS.up}</div>
          <div class="home-list-label">Exporter mes données</div>
          <div class="home-list-chevron">${ICONS.chevronRight}</div>
        </div>
        <div class="home-list-row" id="import-btn">
          <div class="home-list-icon home-list-icon-square" style="background: var(--ink); color: var(--on-ink);">${ICONS.down}</div>
          <div class="home-list-label">Importer une sauvegarde</div>
          <div class="home-list-chevron">${ICONS.chevronRight}</div>
        </div>
      </div>
      <input type="file" id="import-file" accept="application/json" style="display:none">
      <div class="field-hint">La sauvegarde contient toutes tes activités, tes plans et tes exercices configurés, dans un seul fichier. Pour retrouver ton historique sur un autre appareil, exporte-le ici puis importe-le là-bas.</div>
      <div class="home-section-label" style="margin-top:22px;">Historique</div>
      <div class="home-list">
        <div class="home-list-row">
          <div class="home-list-label">Dernier export</div>
          <div class="home-list-value">${formatRelativeTime(loadJSON(KEYS.lastExport, null))}</div>
        </div>
        <div class="home-list-row">
          <div class="home-list-label">Dernier import</div>
          <div class="home-list-value">${formatRelativeTime(loadJSON(KEYS.lastImport, null))}</div>
        </div>
      </div>
    </div>
  `;
  document.querySelector("[data-back-settings]").addEventListener("click", () => {
    currentApp = "settings";
    render();
  });
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const importFile = document.getElementById("import-file");

  exportBtn.addEventListener("click", async () => {
    await exportBackup();
    renderSettingsBackupApp();
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
      handleImportedFile(data, renderSettingsBackupApp);
      importFile.value = "";
    };
    reader.readAsText(file);
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
      const cardHTML = `
      <div class="history-card">
        <div class="history-head" data-edit-config="${c.id}" style="cursor:pointer;">
          <div class="history-row-icon">${ICONS.dumbbell}</div>
          <div class="history-head-left">
            <div class="exercise-config-name">${c.name}</div>
            <div class="history-label">${categoryLabel(c.category)} · ${gymEquipmentLabel(resolveGymEquipment(c))} · ${bases ? bases + " kg" : "Aucun palier"}${incLabel}${autoIncLabel}</div>
          </div>
          <button type="button" class="icon-btn" data-duplicate-config="${c.id}" aria-label="Dupliquer">${ICONS.duplicate}</button>
        </div>
      </div>`;
      return wrapSwipeToDeleteRow(c.id, cardHTML);
    })
    .join("");
  return `${tabsHTML}${filtered.length === 0 ? emptyState : items}`;
}

// « Type de poids » : pas d'option « Automatique » — un des quatre types est
// TOUJOURS sélectionné. Tant qu'on n'en a pas touché un (equipment ""), la
// sélection est déduite du nom (guessGymEquipment) et suit la frappe, voir
// updateEquipmentFromName ; dès qu'on en touche un, c'est ce choix qui compte.
function gymFormEquipment(d) {
  return d.equipment && GYM_EQUIPMENT.some((e) => e.key === d.equipment) ? d.equipment : guessGymEquipment(d.name);
}
function gymEquipmentHint(d) {
  const shown = {
    machine: "la pile de la machine, broche sur le palier",
    barre: "la barre avec ses disques",
    halteres: "les haltères",
    kettlebell: "les kettlebells",
  };
  const what = `chaque série montrera ${shown[gymFormEquipment(d)]}`;
  if (d.equipment) return `Dans l'historique, ${what}.`;
  return `Choisi d'après le nom : dans l'historique, ${what}. Touche un autre type pour le changer.`;
}

/* ---------- Nom + suggestions, en un seul champ (3.2.0) ----------
   Avant : un champ « Nom » et, plus bas, un menu « Suggestions » qui
   remplissait le nom puis revenait sur « Choisir… ». Maintenant les
   suggestions se déplient SOUS le champ quand on le touche, filtrées au fur
   et à mesure de la frappe (sans tenir compte des accents ni des
   majuscules) ; en toucher une remplit le nom. Rien ne s'affiche quand le
   champ n'a pas le focus, ni quand le nom tapé est déjà exactement une
   suggestion. Au plus 6 propositions. */
const NAME_SUGGEST_MAX = 6;
const nameSuggestNorm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
function gymNameSuggestionCandidates() {
  const used = new Set(gymExerciseConfigs.filter((c) => c.id !== gymSettingsEditingConfigId).map((c) => nameSuggestNorm(c.name)));
  // D'abord la catégorie, PUIS le nom (3.2.1) : sans catégorie, pas de
  // suggestion (et le champ est grisé).
  const cat = gymSettingsFormDraft.category;
  if (!cat) return [];
  const cats = GYM_EXERCISE_CATEGORIES.filter((c) => c.key === cat);
  const out = [];
  const seen = new Set();
  cats.forEach((c) =>
    (EXERCISE_SUGGESTIONS[c.key] || []).forEach((n) => {
      const k = nameSuggestNorm(n);
      if (used.has(k) || seen.has(k)) return;
      seen.add(k);
      out.push({ name: n, cat: c.key, catLabel: cat ? "" : c.label });
    })
  );
  return out;
}
function gainageNameSuggestionCandidates() {
  const used = new Set(gainageExerciseConfigs.filter((c) => c.id !== gainageSettingsEditingConfigId).map((c) => nameSuggestNorm(c.name)));
  return (EXERCISE_SUGGESTIONS.gainage || []).filter((n) => !used.has(nameSuggestNorm(n))).map((n) => ({ name: n, cat: "", catLabel: "" }));
}
function attachNameSuggestions(input, panel, getCandidates, onPick) {
  if (!input || !panel) return;
  let hideTimer = null;
  const renderPanel = () => {
    const q = nameSuggestNorm(input.value);
    const all = getCandidates();
    const exact = all.some((c) => nameSuggestNorm(c.name) === q);
    const list = exact ? [] : all.filter((c) => !q || nameSuggestNorm(c.name).includes(q)).slice(0, NAME_SUGGEST_MAX);
    if (!list.length || document.activeElement !== input) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }
    panel.innerHTML = list
      .map((c, i) => `<button type="button" class="name-suggest-item" data-i="${i}"><span class="name-suggest-name">${escapeHTML(c.name)}</span>${c.catLabel ? `<span class="name-suggest-cat">${escapeHTML(c.catLabel)}</span>` : ""}</button>`)
      .join("");
    panel.hidden = false;
    panel.querySelectorAll(".name-suggest-item").forEach((btn) => {
      // pointerdown + preventDefault : le champ garde le focus jusqu'au choix.
      btn.addEventListener("pointerdown", (e) => e.preventDefault());
      btn.addEventListener("mousedown", (e) => e.preventDefault());
      btn.addEventListener("click", () => {
        const c = list[Number(btn.dataset.i)];
        panel.hidden = true;
        onPick(c.name, c.cat);
      });
    });
  };
  input.addEventListener("focus", () => {
    clearTimeout(hideTimer);
    renderPanel();
  });
  input.addEventListener("input", renderPanel);
  input.addEventListener("blur", () => {
    hideTimer = setTimeout(() => {
      panel.hidden = true;
    }, 150);
  });
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
  // Suggestions de noms : intégrées au champ « Nom » (3.2.0) — une liste qui
  // se déplie sous le nom quand on le touche, filtrée par ce qu'on tape (voir
  // attachNameSuggestions). Si la catégorie est déjà choisie, seulement les
  // siennes ; sinon toutes, avec leur catégorie, qui sera reprise.
  const opt = (v, label, sel) => `<option value="${String(v).replace(/"/g, "&quot;")}" ${sel ? "selected" : ""}>${label}</option>`;
  return `
    <div class="exercise-card exercise-form">
      <div class="home-section-label">Exercice</div>
      <div class="field-list-card">
        <label class="field-list-row" for="config-category-select">
          <span style="flex:1;">Catégorie</span>
          <select class="field-select app-select app-select-row" id="config-category-select">
            ${gymSettingsFormDraft.category ? "" : opt("", "Choisir…", true)}${GYM_EXERCISE_CATEGORIES.map((t) => opt(t.key, t.label, gymSettingsFormDraft.category === t.key)).join("")}
          </select>
        </label>
        <label class="field-list-row ${gymSettingsFormDraft.category ? "" : "field-list-row-locked"}" for="config-name-input">
          <span>Nom</span>
          <input type="text" id="config-name-input" placeholder="${gymSettingsFormDraft.category ? "Tape un nom ou choisis…" : "Choisis d'abord la catégorie"}" autocomplete="off" ${gymSettingsFormDraft.category ? "" : "disabled"} value="${(gymSettingsFormDraft.name || "").replace(/"/g, "&quot;")}">
        </label>
        <div class="name-suggest" id="config-name-suggest" hidden></div>
        <label class="field-list-row" for="config-equipment-select">
          <span style="flex:1;">Type de poids</span>
          <select class="field-select app-select app-select-row" id="config-equipment-select">
            ${GYM_EQUIPMENT.map((e) => opt(e.key, e.label, gymFormEquipment(gymSettingsFormDraft) === e.key)).join("")}
          </select>
        </label>
      </div>
      <div class="field-hint" id="config-equipment-hint">${gymEquipmentHint(gymSettingsFormDraft)}</div>

      <div class="home-section-label">Poids possibles</div>
      <div class="field-list-card">
        <div class="field-list-row weight-chip-row" id="config-base-weights-row">${chips}</div>
        <div class="field-list-row">
          <input type="text" inputmode="decimal" id="config-new-base-weight" class="field-list-input-left" placeholder="Ajouter un poids (kg)">
          <button type="button" class="secondary-btn secondary-btn-inline" id="config-add-base-weight-btn">${ICONS.plus} Ajouter</button>
        </div>
        <div class="field-list-row" id="config-scan-weights-btn" style="cursor:pointer;">
          <div class="home-list-icon home-list-icon-square" style="background:var(--ink); color:var(--on-ink); flex-shrink:0;">${ICONS.camera}</div>
          <span style="flex:1;">Scanner depuis une photo</span>
          <div class="home-list-chevron">${ICONS.chevronRight}</div>
        </div>
      </div>
      <div class="field-hint">Les paliers de poids de la machine.</div>

      <div class="home-section-label">Incrément</div>
      <div class="field-list-card">
        <div class="field-list-row">
          <div class="field-label-row" style="flex:1; margin-bottom:0;">
            <span>Incrément automatique</span>
            <button type="button" class="field-help-btn ${gymSettingsHelpOpen.autoIncrement ? "active" : ""}" data-field-help="autoIncrement" aria-label="Aide : incrément automatique">?</button>
          </div>
          <button type="button" class="toggle-switch ${gymSettingsFormDraft.autoIncrement ? "on" : ""}" id="config-auto-increment-toggle" role="switch" aria-checked="${gymSettingsFormDraft.autoIncrement ? "true" : "false"}">
            <span class="toggle-switch-knob"></span>
          </button>
        </div>
        ${gymSettingsHelpOpen.autoIncrement ? `<div class="field-help-text">En Séance en direct, après chaque série, le poids proposé pour la suivante monte d'un palier (ex. 40&nbsp;→&nbsp;45&nbsp;kg), jusqu'au palier le plus lourd. Désactivé, on reste au même poids. Sans effet quand un plan prévoit le poids de la série.</div>` : ""}
        <div class="field-list-row">
          <div class="field-label-row" style="flex:1; margin-bottom:0;">
            <span>Incrément possible</span>
            <button type="button" class="field-help-btn ${gymSettingsHelpOpen.maxIncrement ? "active" : ""}" data-field-help="maxIncrement" aria-label="Aide : incrément possible">?</button>
          </div>
          <input type="text" inputmode="decimal" id="config-max-increment" value="${gymSettingsFormDraft.maxIncrement || 0}" aria-label="Incrément possible, en kg" style="flex:0 0 auto; width:56px; text-align:right; color:var(--text-dim); font-weight:600;">
          <span style="color:var(--text-dim); margin:0 10px 0 4px;">kg</span>
          <div class="rep-stepper" style="flex:none;">
            <button type="button" class="rep-step-btn" id="config-max-increment-minus" aria-label="Moins">−</button>
            <button type="button" class="rep-step-btn" id="config-max-increment-plus" aria-label="Plus">+</button>
          </div>
        </div>
        ${gymSettingsHelpOpen.maxIncrement ? `<div class="field-help-text">Petit poids fixe qu'on peut ajouter à la main sur la machine (ex. une plaque de 2,5&nbsp;kg posée sur la pile). Sur chaque palier, on choisit alors «&nbsp;Standard&nbsp;» ou «&nbsp;+<span id="config-increment-help-value">${gymSettingsFormDraft.maxIncrement || 0}</span>&nbsp;kg&nbsp;», en Séance en direct comme dans Créer. 0 = pas d'incrément.</div>` : ""}
      </div>
      <div class="field-hint" id="config-increment-hint">Poids fixe qu'on peut ajouter à la main sur la machine. Sur chaque palier, le choix sera +0 ou +${gymSettingsFormDraft.maxIncrement || 0}kg.</div>

      <div class="home-section-label">Options avancées</div>
      <div class="field-list-card">
        <div class="field-list-row">
          <div class="field-label-row" style="flex:1; margin-bottom:0;">
            <span>Travail unilatéral</span>
            <button type="button" class="field-help-btn ${gymSettingsHelpOpen.unilateral ? "active" : ""}" data-field-help="unilateral" aria-label="Aide : travail unilatéral">?</button>
          </div>
          <button type="button" class="toggle-switch ${gymSettingsFormDraft.unilateral ? "on" : ""}" id="config-unilateral-toggle" role="switch" aria-checked="${gymSettingsFormDraft.unilateral ? "true" : "false"}">
            <span class="toggle-switch-knob"></span>
          </button>
        </div>
        ${gymSettingsHelpOpen.unilateral ? `<div class="field-help-text">Propose, en Séance en direct, de choisir Gauche/Droite/Les deux avant chaque série — pour les exercices qu'on peut faire un côté à la fois (ex. mollets, ischios).</div>` : ""}
        <label class="field-list-row" for="config-paired-exercise-select">
          <div class="field-label-row" style="flex:1; margin-bottom:0;">
            <span>Alterner avec</span>
            <button type="button" class="field-help-btn ${gymSettingsHelpOpen.paired ? "active" : ""}" data-field-help="paired" aria-label="Aide : alterner avec">?</button>
          </div>
          <select class="field-select app-select app-select-row" id="config-paired-exercise-select">
            <option value="">Aucun</option>
            ${gymExerciseConfigs
              .filter((c) => c.id !== gymSettingsEditingConfigId)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => `<option value="${c.id}" ${gymSettingsFormDraft.pairedExerciseId === c.id ? "selected" : ""}>${c.name}</option>`)
              .join("")}
          </select>
        </label>
        ${gymSettingsHelpOpen.paired ? `<div class="field-help-text">Pour une paire sur la même machine (ex. Abducteurs/Adducteurs) : un bouton de bascule rapide apparaît alors en Séance en direct pour passer de l'un à l'autre sans repasser par la liste. Le lien fonctionne dans les deux sens.</div>` : ""}
      </div>

      <div id="config-form-error"></div>
      <div class="exercise-form-actions">
        <button class="save-btn" id="save-config-btn">${ICONS.check} Enregistrer</button>
        <button class="secondary-btn" id="cancel-config-btn">Annuler</button>
      </div>
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

// Même principe, pour le bouton "Configurer un exercice" équivalent dans
// Créer (Salle de sport) — le brouillon en cours est déjà préservé par
// ailleurs (scheduleDraftSave), un simple retour normal sur l'onglet Créer
// suffit donc à le retrouver tel quel, pas besoin d'un rendu "non frais"
// comme pour Live.
function returnFromSettingsToGymCreateIfNeeded() {
  if (!gymCreateConfigReturnTarget) return false;
  gymCreateConfigReturnTarget = false;
  currentApp = "gym";
  tab = "log";
  render();
  return true;
}

function renderGymSettingsApp() {
  app.className = "theme-gym";
  app.innerHTML = `
    <div class="header header-plain-title">
      <button type="button" class="back-btn-text" data-back-settings>${ICONS.back} Réglages</button>
      <div class="screen-title">Exercices</div>
      <div class="header-sub screen-subtitle">Préconfigurés pour la séance en direct</div>
    </div>
    <div class="content exercise-settings" id="content"></div>
    <div class="log-actions-bar" id="settings-actions-bar" style="display:none; bottom:0; padding-bottom: calc(12px + var(--safe-bottom));"></div>
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
      if (returnFromSettingsToGymCreateIfNeeded()) return;
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
          ? `<button class="add-exercise-btn add-exercise-btn-plain" id="add-gainage-config-btn" style="margin:0;">${ICONS.plus} Ajouter un exercice de gainage</button>`
          : `<button class="add-exercise-btn add-exercise-btn-plain" id="add-config-btn" style="margin:0;">${ICONS.plus} Ajouter un exercice</button>`;
    }
    // Sur une liste courte ET une fenêtre basse (petit écran, fenêtre PC
    // redimensionnée...), le contenu peut tenir en entier sans le moindre
    // défilement — la marge basse réservée par le CSS ne sert alors à
    // rien puisqu'il n'y a rien à faire défiler pour l'atteindre. Réduire
    // la hauteur propre du conteneur garantit l'espacement dans tous les
    // cas (voir reserveSpaceForFixedBar).
    reserveSpaceForFixedBar(document.getElementById("content"), actionsBar);
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
      <button type="button" class="ex-type-btn ${gymSettingsMode === "gainage" ? "active" : ""}" data-gym-settings-mode="gainage">${ICONS.plank} Gainage</button>
    </div>`;
}

// ---------- Gainage : liste et formulaire, volontairement minimalistes ----------
// (juste un nom — le gainage se travaille au temps, jamais au poids).
function gainageSettingsListHTML() {
  const emptyState = `<div class="empty-state">Aucun exercice de gainage configuré pour l'instant.<br>Ajoute tes mouvements habituels (planche, gainage latéral...) pour les retrouver directement en Séance en direct.</div>`;
  const items = [...gainageExerciseConfigs]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (c) =>
        wrapSwipeToDeleteRow(
          c.id,
          `
      <div class="history-card">
        <div class="history-head" data-edit-gainage-config="${c.id}" style="cursor:pointer;">
          <div class="history-row-icon">${ICONS.plank}</div>
          <div class="history-head-left">
            <div class="exercise-config-name">${c.name}</div>
            <div class="history-label">${c.rounds || 10} tours · ${c.workSec || 30} s de travail · ${c.restSec ?? 30} s de repos</div>
          </div>
          <button type="button" class="icon-btn" data-duplicate-gainage-config="${c.id}" aria-label="Dupliquer">${ICONS.duplicate}</button>
        </div>
      </div>`
        )
    )
    .join("");
  return `${gainageExerciseConfigs.length === 0 ? emptyState : items}`;
}

function gainageSettingsFormHTML() {
  const usedNamesLower = new Set(
    gainageExerciseConfigs.filter((c) => c.id !== gainageSettingsEditingConfigId).map((c) => c.name.trim().toLowerCase())
  );
  const suggestions = (EXERCISE_SUGGESTIONS.gainage || []).filter((n) => !usedNamesLower.has(n.trim().toLowerCase()));
  const opt = (v, label, sel) => `<option value="${String(v).replace(/"/g, "&quot;")}" ${sel ? "selected" : ""}>${label}</option>`;
  // Même modèle que le formulaire Muscu (voir gymSettingsFormHTML) : titres
  // de section et lignes « libellé à gauche, réglage à droite ».
  const loopRow = (label, value, key) => `
        <div class="field-list-row">
          <span style="flex:1;">${label}</span>
          <span class="field-list-value">${value}</span>
          <div class="rep-stepper" style="flex:none;">
            <button type="button" class="rep-step-btn" data-gainage-loop-${key}-minus aria-label="Moins">−</button>
            <button type="button" class="rep-step-btn" data-gainage-loop-${key}-plus aria-label="Plus">+</button>
          </div>
        </div>`;
  return `
    <div class="exercise-card exercise-form">
      <div class="home-section-label">Exercice</div>
      <div class="field-list-card">
        <label class="field-list-row" for="gainage-config-name-input">
          <span>Nom</span>
          <input type="text" id="gainage-config-name-input" placeholder="Tape un nom ou choisis…" autocomplete="off" value="${(gainageSettingsFormDraft.name || "").replace(/"/g, "&quot;")}">
        </label>
        <div class="name-suggest" id="gainage-name-suggest" hidden></div>
      </div>
      <div class="home-section-label">Boucle par défaut</div>
      <div class="field-list-card">
        ${loopRow("Tours", gainageSettingsFormDraft.rounds, "rounds")}
        ${loopRow("Travail", `${gainageSettingsFormDraft.workSec} s`, "work")}
        ${loopRow("Repos", `${gainageSettingsFormDraft.restSec} s`, "rest")}
      </div>
      <div class="field-hint">Modifiables à chaque lancement de la boucle.</div>
      <div id="gainage-config-form-error"></div>
      <div class="exercise-form-actions">
        <button class="save-btn" id="save-gainage-config-btn">${ICONS.check} Enregistrer</button>
        <button class="secondary-btn" id="cancel-gainage-config-btn">Annuler</button>
      </div>
    </div>
  `;
}

function attachGymSettingsListeners() {
  initSwipeToDelete(document.getElementById("content"), (id, cardEl) => {
    if (gymSettingsMode === "gainage") {
      showConfirm(
        "Supprimer cet exercice de gainage configuré ? Les séances déjà enregistrées ne sont pas affectées.",
        () => {
          animateCardRemoval(cardEl, () => {
            gainageExerciseConfigs = gainageExerciseConfigs.filter((c) => c.id !== id);
            saveJSON(KEYS.gainageExerciseConfigs, gainageExerciseConfigs);
            renderGymSettingsContent();
          });
        },
        { confirmLabel: "Supprimer", danger: true }
      );
    } else {
      showConfirm(
        "Supprimer cet exercice configuré ? Les séances déjà enregistrées ne sont pas affectées.",
        () => {
          animateCardRemoval(cardEl, () => {
            gymExerciseConfigs = gymExerciseConfigs.filter((c) => c.id !== id);
            saveJSON(KEYS.gymExerciseConfigs, gymExerciseConfigs);
            renderGymSettingsContent();
          });
        },
        { confirmLabel: "Supprimer", danger: true }
      );
    }
  });
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
      // Pas de catégorie par défaut : elle doit être choisie (voir la
      // vérification à l'enregistrement).
      gymSettingsFormDraft = { name: "", category: "", equipment: "", baseWeights: [], maxIncrement: 0, autoIncrement: false, unilateral: false, pairedExerciseId: null };
      gymSettingsHelpOpen = {};
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
        equipment: GYM_EQUIPMENT.some((e) => e.key === config.equipment) ? config.equipment : "",
        baseWeights: [...config.baseWeights],
        maxIncrement: config.maxIncrement || 0,
        autoIncrement: config.autoIncrement || false,
        unilateral: config.unilateral || false,
        pairedExerciseId: config.pairedExerciseId || null,
      };
      gymSettingsHelpOpen = {};
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
        equipment: GYM_EQUIPMENT.some((e) => e.key === config.equipment) ? config.equipment : "",
        baseWeights: [...config.baseWeights],
        maxIncrement: config.maxIncrement || 0,
        autoIncrement: config.autoIncrement || false,
        unilateral: config.unilateral || false,
        // Le jumelage ne se duplique jamais : un exercice jumelé est une
        // relation à deux (voir switchGymExercisePair) — la copie créerait
        // sinon un triangle où deux configs pointent vers le même
        // partenaire, ambigu au moment de choisir avec laquelle basculer.
        pairedExerciseId: null,
      };
      gymSettingsHelpOpen = {};
      gymSettingsFocusTarget = "name";
      renderGymSettingsContent();
    });
  });

  if (!gymSettingsFormOpen) return;

  const nameInput = document.getElementById("config-name-input");
  const newWeightInput = document.getElementById("config-new-base-weight");

  function syncFormFromInputs() {
    gymSettingsFormDraft.name = nameInput.value;
    const incEl = document.getElementById("config-max-increment");
    // L'incrément se saisit librement (0,5 · 1 · 1,25 · 2,5…) : la virgule est déjà convertie en point
    // à la saisie (03-state.js) et le signe moins retiré ; un texte illisible vaut 0.
    if (incEl) gymSettingsFormDraft.maxIncrement = Math.max(0, parseFloat(incEl.value) || 0);
  }

  const categorySelect = document.getElementById("config-category-select");
  categorySelect.addEventListener("change", () => {
    syncFormFromInputs();
    gymSettingsFormDraft.category = categorySelect.value;
    // Catégorie choisie : on passe au nom (ses suggestions se déplient).
    gymSettingsFocusTarget = gymSettingsFormDraft.name ? null : "name";
    renderGymSettingsContent();
  });
  // Tant qu'aucun type n'a été touché, le type sélectionné suit le nom tapé
  // (sans réafficher le formulaire, qui ferait perdre le clavier) — y compris
  // quand le nom vient d'une suggestion.
  function updateEquipmentFromName() {
    gymSettingsFormDraft.name = nameInput.value;
    const equipmentSelect = document.getElementById("config-equipment-select");
    if (equipmentSelect) equipmentSelect.value = gymFormEquipment(gymSettingsFormDraft);
    const hintEl = document.getElementById("config-equipment-hint");
    if (hintEl) hintEl.textContent = gymEquipmentHint(gymSettingsFormDraft);
  }
  nameInput.addEventListener("input", updateEquipmentFromName);
  const equipmentSelect = document.getElementById("config-equipment-select");
  equipmentSelect.addEventListener("change", () => {
    syncFormFromInputs();
    gymSettingsFormDraft.equipment = equipmentSelect.value;
    gymSettingsFocusTarget = null;
    renderGymSettingsContent();
  });
  // Suggestions sous le nom : en choisir une remplit le nom ET, si la
  // catégorie n'est pas encore choisie, prend celle de la suggestion.
  attachNameSuggestions(
    nameInput,
    document.getElementById("config-name-suggest"),
    () => gymNameSuggestionCandidates(),
    (name, cat) => {
      syncFormFromInputs();
      gymSettingsFormDraft.name = name;
      if (!gymSettingsFormDraft.category && cat) gymSettingsFormDraft.category = cat;
      gymSettingsFocusTarget = null;
      renderGymSettingsContent();
    }
  );
  // Poids en cours de saisie dans "Ajouter un poids (kg)" : null si le champ est
  // vide, NaN si ce qui est tapé n'est pas un poids valide, sinon le nombre.
  // Partagé par le bouton "Ajouter" ET par "Enregistrer" (voir plus bas) : les
  // deux se comportent forcément à l'identique. (La virgule décimale est déjà
  // convertie en point, à la volée, par l'écouteur global de 03-state.js.)
  function readPendingWeight() {
    const raw = newWeightInput.value.trim();
    if (raw === "") return null;
    const val = parseFloat(raw);
    return isNaN(val) || val < 0 ? NaN : val;
  }
  function addWeightToDraft(val) {
    if (!gymSettingsFormDraft.baseWeights.includes(val)) gymSettingsFormDraft.baseWeights.push(val);
  }
  document.getElementById("config-add-base-weight-btn").addEventListener("click", () => {
    syncFormFromInputs();
    const pending = readPendingWeight();
    if (pending !== null && !isNaN(pending)) addWeightToDraft(pending);
    gymSettingsFocusTarget = "weight";
    renderGymSettingsContent();
  });
  document.getElementById("config-auto-increment-toggle").addEventListener("click", () => {
    syncFormFromInputs();
    gymSettingsFormDraft.autoIncrement = !gymSettingsFormDraft.autoIncrement;
    renderGymSettingsContent();
  });
  const maxIncEl = document.getElementById("config-max-increment");
  maxIncEl.addEventListener("input", () => {
    syncFormFromInputs();
    document.getElementById("config-increment-hint").textContent = `Poids fixe qu'on peut ajouter à la main sur la machine. Sur chaque palier, le choix sera +0 ou +${gymSettingsFormDraft.maxIncrement}kg.`;
    // L'aide « ? » ouverte cite la valeur : elle suit aussi.
    const incValue = document.getElementById("config-increment-help-value");
    if (incValue) incValue.textContent = gymSettingsFormDraft.maxIncrement;
  });
  // Une fois la saisie terminée, on affiche la valeur réellement retenue (« 2,50 » → 2.5, « abc » → 0).
  maxIncEl.addEventListener("change", () => {
    syncFormFromInputs();
    maxIncEl.value = gymSettingsFormDraft.maxIncrement;
  });
  document.getElementById("config-max-increment-minus").addEventListener("click", () => {
    syncFormFromInputs();
    gymSettingsFormDraft.maxIncrement = Math.max(0, round2((gymSettingsFormDraft.maxIncrement || 0) - 1));
    renderGymSettingsContent();
  });
  document.getElementById("config-max-increment-plus").addEventListener("click", () => {
    syncFormFromInputs();
    gymSettingsFormDraft.maxIncrement = round2((gymSettingsFormDraft.maxIncrement || 0) + 1);
    renderGymSettingsContent();
  });
  document.getElementById("config-unilateral-toggle").addEventListener("click", () => {
    syncFormFromInputs();
    gymSettingsFormDraft.unilateral = !gymSettingsFormDraft.unilateral;
    renderGymSettingsContent();
  });
  document.getElementById("config-paired-exercise-select").addEventListener("change", (ev) => {
    syncFormFromInputs();
    gymSettingsFormDraft.pairedExerciseId = ev.target.value || null;
  });
  document.querySelectorAll("[data-field-help]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.fieldHelp;
      // On synchronise d'abord (comme pour tout ce qui redessine ce
      // formulaire) : sans ça, déplier une aide en plein milieu de la
      // saisie du nom effacerait ce qui vient d'être tapé — même piège que
      // celui déjà rencontré et corrigé pour les steppers de boucle
      // Gainage (voir 2.59.2).
      syncFormFromInputs();
      gymSettingsHelpOpen[key] = !gymSettingsHelpOpen[key];
      renderGymSettingsContent();
    });
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
    // Un poids tapé dans "Ajouter un poids (kg)" mais jamais validé par
    // "Ajouter" (on va vite, entre deux séries) était perdu à l'enregistrement,
    // en silence. On l'ajoute maintenant, exactement comme le bouton l'aurait
    // fait — avant les vérifications ci-dessous, pour qu'il compte aussi dans
    // "au moins un poids possible".
    const pending = readPendingWeight();
    let addedPending = false;
    if (Number.isNaN(pending)) {
      const slot = document.getElementById("config-form-error");
      slot.innerHTML = `<div class="error-msg"><span style="text-transform:none;">« ${escapeHTML(newWeightInput.value.trim())} »</span> n'est pas un poids valide — corrige-le ou efface le champ.</div>`;
      newWeightInput.focus();
      return;
    }
    if (pending !== null && !gymSettingsFormDraft.baseWeights.includes(pending)) {
      addWeightToDraft(pending);
      addedPending = true;
    }
    // Si l'enregistrement s'arrête sur une erreur (nom manquant...), les
    // pastilles de poids doivent montrer celui qu'on vient d'ajouter : on
    // redessine le formulaire, puis on affiche l'erreur et on la ramène à l'écran.
    const fail = (message) => {
      if (addedPending) renderGymSettingsContent();
      const slot = document.getElementById("config-form-error");
      slot.innerHTML = `<div class="error-msg">${message}</div>`;
      if (slot.scrollIntoView) slot.scrollIntoView({ block: "nearest" });
    };
    const name = capitalizeFirst(gymSettingsFormDraft.name.trim());
    // Dans l'ordre du formulaire : la catégorie d'abord, puis le nom.
    if (!GYM_EXERCISE_CATEGORIES.some((c) => c.key === gymSettingsFormDraft.category)) {
      fail("Choisis une catégorie.");
      return;
    }
    if (!name) {
      fail("Donne un nom à cet exercice.");
      return;
    }
    if (gymSettingsFormDraft.baseWeights.length === 0) {
      fail("Ajoute au moins un poids possible.");
      return;
    }
    const nameLower = name.toLowerCase();
    const isDuplicate = gymExerciseConfigs.some((c) => c.id !== gymSettingsEditingConfigId && c.name.trim().toLowerCase() === nameLower);
    if (isDuplicate) {
      fail(`Un exercice nommé « ${escapeHTML(name)} » existe déjà — choisis un nom différent.`);
      return;
    }
    document.getElementById("config-form-error").innerHTML = "";
    const oldConfig = gymSettingsEditingConfigId ? gymExerciseConfigs.find((c) => c.id === gymSettingsEditingConfigId) : null;
    const oldPairedId = oldConfig ? oldConfig.pairedExerciseId || null : null;
    const newPairedId = gymSettingsFormDraft.pairedExerciseId || null;
    // Le partenaire qu'on vient de choisir avait peut-être lui-même un
    // AUTRE partenaire avant nous — sans quoi ce tiers resterait à pointer
    // vers lui sans que lui ne pointe plus en retour (lien à sens unique,
    // fantôme).
    const newPartnerConfig = newPairedId ? gymExerciseConfigs.find((c) => c.id === newPairedId) : null;
    const newPartnerOldPairedId = newPartnerConfig ? newPartnerConfig.pairedExerciseId || null : null;
    const newConfig = {
      id: gymSettingsEditingConfigId || uid(),
      name,
      category: gymSettingsFormDraft.category,
      // "" = aucun type touché : le type reste déduit du nom (affiché
      // sélectionné dans le formulaire, dessiné dans l'historique, voir
      // resolveGymEquipment) et suit donc un changement de nom.
      equipment: GYM_EQUIPMENT.some((e) => e.key === gymSettingsFormDraft.equipment) ? gymSettingsFormDraft.equipment : "",
      baseWeights: Array.from(new Set(gymSettingsFormDraft.baseWeights)).sort((a, b) => a - b),
      maxIncrement: gymSettingsFormDraft.maxIncrement || 0,
      autoIncrement: !!gymSettingsFormDraft.autoIncrement,
      unilateral: !!gymSettingsFormDraft.unilateral,
      pairedExerciseId: newPairedId,
    };
    if (gymSettingsEditingConfigId) {
      gymExerciseConfigs = gymExerciseConfigs.map((c) => (c.id === gymSettingsEditingConfigId ? newConfig : c));
    } else {
      gymExerciseConfigs.push(newConfig);
    }
    // Jumelage bidirectionnel : une paire n'a de sens qu'à deux exercices
    // exclusifs l'un de l'autre — voir switchGymExercisePair (Live) pour le
    // bouton de bascule rapide que ce lien permet.
    if (oldPairedId && oldPairedId !== newPairedId) {
      gymExerciseConfigs = gymExerciseConfigs.map((c) => (c.id === oldPairedId ? { ...c, pairedExerciseId: null } : c));
    }
    if (newPartnerOldPairedId && newPartnerOldPairedId !== newConfig.id) {
      gymExerciseConfigs = gymExerciseConfigs.map((c) => (c.id === newPartnerOldPairedId ? { ...c, pairedExerciseId: null } : c));
    }
    if (newPairedId) {
      gymExerciseConfigs = gymExerciseConfigs.map((c) => (c.id === newPairedId ? { ...c, pairedExerciseId: newConfig.id } : c));
    }
    saveJSON(KEYS.gymExerciseConfigs, gymExerciseConfigs);
    gymSettingsFormOpen = false;
    if (returnFromSettingsToLiveIfNeeded()) return;
    if (returnFromSettingsToGymCreateIfNeeded()) return;
    renderGymSettingsContent();
  });
  if (gymSettingsFocusTarget === "weight") {
    const weightInput = document.getElementById("config-new-base-weight");
    if (weightInput) weightInput.focus();
  } else if (gymSettingsFocusTarget === "name") {
    nameInput.focus();
  }
  // Sans demande explicite pour le prochain rendu (voir les points
  // d'ouverture du formulaire, qui redemandent "name" à chaque fois), on
  // ne redonne plus le focus à rien du tout — sinon un simple stepper
  // (incrément auto, +/- un poids...) rouvrait le clavier à chaque tap en
  // renvoyant le focus sur le nom, sans que rien ne le demande vraiment.
  gymSettingsFocusTarget = null;
}

// ---------- Gainage : écouteurs (liste + formulaire), séparés de ceux de
// Muscu ci-dessus — deux listes, deux formulaires, aucun état partagé. ----------
function attachGainageSettingsListeners() {
  const addBtn = document.getElementById("add-gainage-config-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      gainageSettingsFormOpen = true;
      gainageSettingsEditingConfigId = null;
      // 10 tours × 30s travail / 30s repos : mêmes valeurs par défaut que
      // la boucle générique en Séance en direct (voir liveLoopStepperHTML),
      // pour ne pas surprendre avec un point de départ différent.
      gainageSettingsFormDraft = { name: "", rounds: 10, workSec: 30, restSec: 30 };
      gymSettingsFocusTarget = "name";
      renderGymSettingsContent();
    });
  }
  document.querySelectorAll("[data-edit-gainage-config]").forEach((el) => {
    el.addEventListener("click", () => {
      const config = gainageExerciseConfigs.find((c) => c.id === el.dataset.editGainageConfig);
      if (!config) return;
      gainageSettingsFormOpen = true;
      gainageSettingsEditingConfigId = config.id;
      gainageSettingsFormDraft = { name: config.name, rounds: config.rounds || 10, workSec: config.workSec || 30, restSec: config.restSec ?? 30 };
      gymSettingsFocusTarget = "name";
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
      gainageSettingsFormDraft = { name: config.name + " (copie)", rounds: config.rounds || 10, workSec: config.workSec || 30, restSec: config.restSec ?? 30 };
      gymSettingsFocusTarget = "name";
      renderGymSettingsContent();
    });
  });

  if (!gainageSettingsFormOpen) return;

  const nameInput = document.getElementById("gainage-config-name-input");
  // Synchronise vers l'état à chaque frappe : sans ça, taper le nom PUIS
  // toucher un stepper (qui redessine tout le formulaire depuis l'état,
  // voir gainageConfigFormHTML) effacerait ce qui vient d'être tapé, non
  // encore reflété nulle part ailleurs que dans le champ lui-même.
  nameInput.addEventListener("input", () => {
    gainageSettingsFormDraft.name = nameInput.value;
  });
  attachNameSuggestions(
    nameInput,
    document.getElementById("gainage-name-suggest"),
    () => gainageNameSuggestionCandidates(),
    (name) => {
      nameInput.value = name;
      // Sans passer par l'événement « input » : on reporte le nom dans
      // l'état, sinon le premier − / + (qui redessine depuis l'état)
      // l'effacerait.
      gainageSettingsFormDraft.name = name;
    }
  );
  // Mêmes bornes que la boucle en Séance en direct (voir attachLiveSetFormListeners).
  const loopRoundsMinus = document.querySelector("[data-gainage-loop-rounds-minus]");
  const loopRoundsPlus = document.querySelector("[data-gainage-loop-rounds-plus]");
  const loopWorkMinus = document.querySelector("[data-gainage-loop-work-minus]");
  const loopWorkPlus = document.querySelector("[data-gainage-loop-work-plus]");
  const loopRestMinus = document.querySelector("[data-gainage-loop-rest-minus]");
  const loopRestPlus = document.querySelector("[data-gainage-loop-rest-plus]");
  if (loopRoundsMinus) loopRoundsMinus.addEventListener("click", () => { gainageSettingsFormDraft.rounds = Math.max(1, gainageSettingsFormDraft.rounds - 1); renderGymSettingsContent(); });
  if (loopRoundsPlus) loopRoundsPlus.addEventListener("click", () => { gainageSettingsFormDraft.rounds = Math.min(50, gainageSettingsFormDraft.rounds + 1); renderGymSettingsContent(); });
  if (loopWorkMinus) loopWorkMinus.addEventListener("click", () => { gainageSettingsFormDraft.workSec = Math.max(5, gainageSettingsFormDraft.workSec - 5); renderGymSettingsContent(); });
  if (loopWorkPlus) loopWorkPlus.addEventListener("click", () => { gainageSettingsFormDraft.workSec = Math.min(600, gainageSettingsFormDraft.workSec + 5); renderGymSettingsContent(); });
  if (loopRestMinus) loopRestMinus.addEventListener("click", () => { gainageSettingsFormDraft.restSec = Math.max(0, gainageSettingsFormDraft.restSec - 5); renderGymSettingsContent(); });
  if (loopRestPlus) loopRestPlus.addEventListener("click", () => { gainageSettingsFormDraft.restSec = Math.min(600, gainageSettingsFormDraft.restSec + 5); renderGymSettingsContent(); });
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
    const newConfig = {
      id: gainageSettingsEditingConfigId || uid(),
      name,
      rounds: gainageSettingsFormDraft.rounds,
      workSec: gainageSettingsFormDraft.workSec,
      restSec: gainageSettingsFormDraft.restSec,
    };
    if (gainageSettingsEditingConfigId) {
      gainageExerciseConfigs = gainageExerciseConfigs.map((c) => (c.id === gainageSettingsEditingConfigId ? newConfig : c));
    } else {
      gainageExerciseConfigs.push(newConfig);
    }
    saveJSON(KEYS.gainageExerciseConfigs, gainageExerciseConfigs);
    gainageSettingsFormOpen = false;
    if (returnFromSettingsToLiveIfNeeded()) return;
    if (returnFromSettingsToGymCreateIfNeeded()) return;
    renderGymSettingsContent();
  });
  // Même principe que pour Muscu (voir juste au-dessus) : uniquement à
  // l'ouverture fraîche du formulaire, jamais après un simple stepper —
  // sinon chaque tap sur Tours/Travail/Repos rouvrirait le clavier en
  // redonnant le focus au nom, sans que rien ne le demande vraiment.
  if (gymSettingsFocusTarget === "name") nameInput.focus();
  gymSettingsFocusTarget = null;
}
