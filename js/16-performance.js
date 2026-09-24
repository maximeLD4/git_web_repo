/* ---------- Performance : suivi des indicateurs de progression ---------- */

// Calcule, pour un sport cardio donné, l'historique chronologique des
// séances avec leurs totaux agrégés (distance, durée, allure/vitesse
// moyenne) — l'équivalent cardio de getExerciseHistory (Muscu) ci-dessous,
// mais à l'échelle de la séance ENTIÈRE plutôt que d'un exercice nommé :
// Course/Natation/Vélo n'ont pas cette notion, leurs blocs n'ont pas de nom
// stable d'une séance à l'autre.
function getCardioSessionHistory(sport) {
  const sessionsArr = sport === "run" ? runSessions : sport === "swim" ? swimSessions : bikeSessions;
  const sorted = [...sessionsArr]
    .filter((s) => s.date <= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return sorted.map((s) => {
    let distance = 0;
    let duration = 0;
    s.blocks.forEach((b) => {
      if (sport === "run") {
        distance += blockDistanceKm(b);
        duration += blockDurationMin(b);
      } else if (sport === "swim") {
        distance += swimBlockDistanceM(b);
        duration += swimBlockDurationMin(b);
      } else {
        distance += bikeBlockDistanceKm(b);
        duration += bikeBlockDurationMin(b);
      }
    });
    // "index" représente ici l'allure (min/km ou min/100m, plus petit =
    // mieux) ou la vitesse pour le vélo (km/h, plus grand = mieux) — pas un
    // score composite comme pour la Muscu, la valeur brute est déjà le
    // bon indicateur à suivre dans le temps.
    let index = 0;
    if (distance > 0) {
      if (sport === "run") index = duration / distance;
      else if (sport === "swim") index = (duration * 100) / distance;
      else index = duration > 0 ? distance / (duration / 60) : 0;
    }
    return { date: s.date, sessionId: s.id, distance: Math.round(distance * 100) / 100, duration: Math.round(duration * 10) / 10, index: Math.round(index * 100) / 100 };
  });
}

// Meilleure allure/vitesse et plus longue distance sur tout l'historique
// — équivalent cardio de getPersonalRecords (Muscu) ci-dessous. Le sens
// de "meilleur" s'inverse pour le vélo (vitesse : plus grand = mieux)
// par rapport à la course/natation (allure : plus petit = mieux).
function getCardioRecords(history, sport) {
  let bestIndex = null;
  let bestIndexDate = null;
  let longestDist = null;
  let longestDistDate = null;
  history.forEach((h) => {
    if (h.index > 0) {
      const better = sport === "bike" ? bestIndex === null || h.index > bestIndex : bestIndex === null || h.index < bestIndex;
      if (better) {
        bestIndex = h.index;
        bestIndexDate = h.date;
      }
    }
    if (longestDist === null || h.distance > longestDist) {
      longestDist = h.distance;
      longestDistDate = h.date;
    }
  });
  return { bestIndex, bestIndexDate, longestDist, longestDistDate };
}

function cardioSportLabel(sport) {
  return sport === "run" ? "Course à pied" : sport === "swim" ? "Natation" : "Vélo";
}
function cardioDistUnit(sport) {
  return sport === "swim" ? "m" : "km";
}
function cardioFormatIndex(sport, v) {
  if (v == null) return "—";
  if (sport === "bike") return `${Math.round(v * 10) / 10} km/h`;
  if (sport === "run") return formatPaceDisplay(String(v)) || "—";
  return formatSwimPaceDisplay(String(v)) || "—";
}

function getExerciseHistory(exerciseName) {
  const norm = (exerciseName || "").trim().toLowerCase();
  if (!norm) return [];
  const occurrences = [];
  sessions.forEach((session) => {
    // On ne compte que les séances dont la date n'est pas dans le futur :
    // une séance datée à venir ne doit pas fausser le suivi de progression,
    // même si elle n'a plus de statut "prévue" à proprement parler (voir
    // la suppression de cette notion — la date suffit à elle seule ici).
    if (session.date > todayISO()) return;
    (session.exercises || []).forEach((ex) => {
      if ((ex.exType || "muscu") !== "muscu") return;
      if ((ex.name || "").trim().toLowerCase() !== norm) return;
      const validSets = (ex.sets || []).filter((s) => {
        const w = parseFloat(s.weight);
        const r = parseFloat(s.reps);
        return !isNaN(w) && w > 0 && !isNaN(r) && r > 0;
      });
      if (validSets.length === 0) return;
      // Une série unilatérale (voir config.unilateral) compte à moitié —
      // elle ne mobilise qu'un membre à la fois, environ la moitié du
      // travail réel d'une série "les deux". Choisi ainsi plutôt qu'à poids
      // plein ou exclue du calcul : qu'on fasse "les deux" en une série ou
      // "gauche" puis "droite" en deux séries séparées, le score final
      // reste cohérent d'une approche à l'autre.
      const volume = validSets.reduce((sum, s) => {
        const setVolume = parseFloat(s.weight) * parseFloat(s.reps);
        const sideFactor = s.side === "left" || s.side === "right" ? 0.5 : 1;
        return sum + setVolume * sideFactor;
      }, 0);
      // Indice de performance : volume total (poids × reps sommé sur toutes
      // les séries), avec un petit bonus de +5% par série au-delà de la
      // première — reconnaît que répartir l'effort sur plusieurs séries
      // représente généralement plus de travail réel, sans dominer le score.
      const index = Math.round(volume * (1 + 0.05 * (validSets.length - 1)));
      occurrences.push({
        date: session.date,
        sessionId: session.id,
        sets: validSets,
        volume: Math.round(volume),
        setsCount: validSets.length,
        index,
      });
    });
  });
  occurrences.sort((a, b) => a.date.localeCompare(b.date) || a.sessionId.localeCompare(b.sessionId));
  return occurrences;
}

function getPersonalRecords(history) {
  let maxWeight = null;
  let maxWeightDate = null;
  let bestSet = null; // meilleure série : le plus grand volume (poids×reps) sur UNE seule série
  let bestSetDate = null;
  history.forEach((occ) => {
    occ.sets.forEach((s) => {
      const w = parseFloat(s.weight);
      const r = parseFloat(s.reps);
      if (maxWeight === null || w > maxWeight) {
        maxWeight = w;
        maxWeightDate = occ.date;
      }
      // Même pondération que pour le volume global (voir getExerciseHistory)
      // : une série unilatérale compte à moitié, pour rester cohérente avec
      // le reste du calcul plutôt que de fausser "meilleure série" en
      // faveur d'une série gauche/droite non comparable à une série
      // "les deux".
      const sideFactor = s.side === "left" || s.side === "right" ? 0.5 : 1;
      const setVolume = w * r * sideFactor;
      if (bestSet === null || setVolume > bestSet.weight * bestSet.reps * (bestSet.sideFactor || 1)) {
        bestSet = { weight: w, reps: r, sideFactor, side: s.side || null };
        bestSetDate = occ.date;
      }
    });
  });
  return { maxWeight, maxWeightDate, bestSet, bestSetDate };
}

function renderPerformanceApp() {
  app.className = "theme-performance";
  app.innerHTML = `
    <div class="header">
      <button type="button" class="back-btn" data-go-home>${ICONS.back}</button>
      <div class="header-icon-only">${ICONS.trending}</div>
      <div class="header-sub">Suivi de tes progrès</div>
    </div>
    <div class="ex-type-toggle wrap-toggle" style="margin: 14px 16px 0 18px;">
      <button type="button" class="ex-type-btn ${performanceMode === "muscu" ? "active" : ""}" data-performance-mode="muscu">Muscu</button>
      <button type="button" class="ex-type-btn ${performanceMode === "run" ? "active" : ""}" data-performance-mode="run">Course</button>
      <button type="button" class="ex-type-btn ${performanceMode === "swim" ? "active" : ""}" data-performance-mode="swim">Natation</button>
      <button type="button" class="ex-type-btn ${performanceMode === "bike" ? "active" : ""}" data-performance-mode="bike">Vélo</button>
    </div>
    <div class="content" id="content" style="padding-bottom: 24px;"></div>
  `;
  document.querySelector("[data-go-home]").addEventListener("click", goHome);
  document.querySelectorAll("[data-performance-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      performanceMode = btn.dataset.performanceMode;
      renderPerformanceApp();
    });
  });
  renderPerformanceContent();
}

function performanceRowHTML(config) {
  const history = getExerciseHistory(config.name);
  if (history.length === 0) {
    return `
    <div class="history-card">
      <div class="history-head" style="cursor:default;">
        <div class="history-head-left">
          <div class="exercise-config-name">${config.name}</div>
          <div class="history-label" style="color:var(--text-dim);">Pas encore de séance enregistrée</div>
        </div>
      </div>
    </div>`;
  }
  const last = history[history.length - 1];
  const prev = history.length > 1 ? history[history.length - 2] : null;
  // Classe sémantique plutôt qu'une couleur posée en inline — n'importe
  // quelle charte graphique peut ainsi la styler directement (voir
  // .trend-up/.trend-down/.trend-flat dans styles.css), sans avoir à
  // rattraper une valeur inline via un sélecteur.
  let trendIcon = "→";
  let trendClass = "trend-flat";
  if (prev) {
    if (last.index > prev.index) {
      trendIcon = "↑";
      trendClass = "trend-up";
    } else if (last.index < prev.index) {
      trendIcon = "↓";
      trendClass = "trend-down";
    }
  }
  return `
  <div class="history-card" data-open-exercise="${config.id}" style="cursor:pointer;">
    <div class="history-head">
      <div class="history-head-left">
        <div class="exercise-config-name">${config.name}</div>
        <div class="history-label">Indice : ${last.index} <span class="trend-icon ${trendClass}">${trendIcon}</span></div>
      </div>
      <div class="home-card-arrow">${ICONS.chevronRight}</div>
    </div>
  </div>`;
}

function renderPerformanceContent() {
  const content = document.getElementById("content");
  if (performanceMode !== "muscu") {
    content.innerHTML = cardioPerformanceContentHTML(performanceMode);
    content.querySelectorAll(".perf-record-value[data-count-to]").forEach((el) => animateCountUp(el));
    return;
  }
  if (gymExerciseConfigs.length === 0) {
    content.innerHTML = `<div class="empty-state">Aucun exercice configuré pour l'instant.<br>Configure tes exercices dans Paramètres → Salle de sport pour voir apparaître leur suivi ici.</div>`;
    return;
  }
  const groups = GYM_EXERCISE_CATEGORIES.map((cat) => ({
    ...cat,
    exercises: gymExerciseConfigs.filter((c) => (c.category || "pecs") === cat.key),
  })).filter((g) => g.exercises.length > 0);

  content.innerHTML = groups
    .map(
      (g) => `
    <div class="perf-group">
      <div class="perf-group-title">${g.label}</div>
      ${[...g.exercises].sort((a, b) => a.name.localeCompare(b.name)).map(performanceRowHTML).join("")}
    </div>`
    )
    .join("");

  document.querySelectorAll("[data-open-exercise]").forEach((el) => {
    el.addEventListener("click", () => {
      performanceSelectedExerciseId = el.dataset.openExercise;
      currentApp = "performance-detail";
      render();
    });
  });
}

// Contenu Performance pour un sport cardio (Course/Natation/Vélo) — une
// seule page directement (contrairement à la Muscu, pas de "liste
// d'exercices" à choisir d'abord : il n'y a qu'un seul indicateur par
// sport, pas un par exercice nommé).
function cardioPerformanceContentHTML(sport) {
  const history = getCardioSessionHistory(sport);
  if (history.length === 0) {
    return `<div class="empty-state">Aucune séance de ${cardioSportLabel(sport).toLowerCase()} enregistrée pour l'instant.</div>`;
  }
  const records = getCardioRecords(history, sport);
  const paceLabel = sport === "bike" ? "vitesse" : "allure";
  const distUnit = cardioDistUnit(sport);
  const historyRowsHTML = [...history]
    .reverse()
    .map(
      (h) => `
    <div class="history-card">
      <div class="history-head" style="cursor:default;">
        <div class="history-head-left">
          <div class="history-date">${formatDateFR(h.date)}</div>
          <div class="history-label">${Math.round(h.distance * 10) / 10}${distUnit} · ${formatDurationMin(h.duration)} · ${cardioFormatIndex(sport, h.index)}</div>
        </div>
      </div>
    </div>`
    )
    .join("");

  return `
    <div class="perf-records-row">
      <div class="perf-record-card">
        <div class="perf-record-label">Meilleure ${paceLabel}</div>
        <div class="perf-record-value">${cardioFormatIndex(sport, records.bestIndex)}</div>
        <div class="perf-record-date">${formatDateFR(records.bestIndexDate)}</div>
      </div>
      <div class="perf-record-card">
        <div class="perf-record-label">Plus longue distance</div>
        <div class="perf-record-value" data-count-to="${records.longestDist}" data-count-suffix="${distUnit}">0${distUnit}</div>
        <div class="perf-record-date">${formatDateFR(records.longestDistDate)}</div>
      </div>
    </div>
    <div class="perf-chart-wrap">
      <div class="weight-chip-label" style="margin-top:0;">${paceLabel.charAt(0).toUpperCase() + paceLabel.slice(1)} dans le temps</div>
      ${performanceChartSVG(history)}
    </div>
    <div class="weight-chip-label">Historique des séances</div>
    ${historyRowsHTML}
  `;
}

function performanceChartSVG(history) {
  const width = 320;
  const height = 140;
  const padding = 22;
  const values = history.map((h) => h.index);
  const maxVal = Math.max(...values);
  const minVal = Math.min(0, Math.min(...values));
  const range = maxVal - minVal || 1;
  const stepX = history.length > 1 ? (width - padding * 2) / (history.length - 1) : 0;

  const points = history.map((h, i) => {
    const x = history.length > 1 ? padding + i * stepX : width / 2;
    const y = height - padding - ((h.index - minVal) / range) * (height - padding * 2);
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  // Longueur approximative du tracé (somme des distances entre points
  // consécutifs) — utilisée pour l'astuce classique du "dessin progressif"
  // via stroke-dasharray/stroke-dashoffset : on ne peut pas appeler
  // getTotalLength() ici puisqu'on construit une chaîne HTML, pas un
  // élément SVG réellement posé dans le DOM.
  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    pathLength += Math.sqrt(dx * dx + dy * dy);
  }
  const dots = points
    .map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" style="fill:var(--accent); opacity:0; animation: chart-dot-fade-in 0.3s ease 0.7s forwards;" />`)
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; display:block;">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" style="stroke:var(--border); stroke-width:1;" />
      <path d="${pathD}" style="fill:none; stroke:var(--accent); stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:${pathLength.toFixed(1)}; stroke-dashoffset:${pathLength.toFixed(1)}; animation: chart-draw-line 0.7s ease forwards;" />
      ${dots}
    </svg>`;
}

function renderPerformanceDetailApp() {
  const config = gymExerciseConfigs.find((c) => c.id === performanceSelectedExerciseId);
  app.className = "theme-performance";
  app.innerHTML = `
    <div class="header">
      <button type="button" class="back-btn" data-back-performance>${ICONS.back}</button>
      <div class="header-icon-only">${ICONS.trending}</div>
      <div class="header-sub">${config ? config.name : "Exercice"}</div>
    </div>
    <div class="content" id="content" style="padding-bottom: 24px;"></div>
  `;
  document.querySelector("[data-back-performance]").addEventListener("click", () => {
    currentApp = "performance";
    render();
  });
  renderPerformanceDetailContent(config);
}

function renderPerformanceDetailContent(config) {
  const content = document.getElementById("content");
  if (!config) {
    content.innerHTML = `<div class="empty-state">Exercice introuvable.</div>`;
    return;
  }
  const history = getExerciseHistory(config.name);
  if (history.length === 0) {
    content.innerHTML = `<div class="empty-state">Aucune séance enregistrée pour « ${config.name} » pour l'instant.</div>`;
    return;
  }
  const records = getPersonalRecords(history);
  const historyRowsHTML = [...history]
    .reverse()
    .map(
      (occ) => `
    <div class="history-card">
      <div class="history-head" style="cursor:default;">
        <div class="history-head-left">
          <div class="history-date">${formatDateFR(occ.date)}</div>
          <div class="history-label">${occ.setsCount} série${occ.setsCount > 1 ? "s" : ""} · Indice ${occ.index}</div>
        </div>
      </div>
    </div>`
    )
    .join("");

  content.innerHTML = `
    <div class="perf-records-row">
      <div class="perf-record-card">
        <div class="perf-record-label">Poids max</div>
        <div class="perf-record-value" data-count-to="${records.maxWeight}" data-count-suffix="kg">0kg</div>
        <div class="perf-record-date">${formatDateFR(records.maxWeightDate)}</div>
      </div>
      <div class="perf-record-card">
        <div class="perf-record-label">Meilleure série</div>
        <div class="perf-record-value" data-count-to="${records.bestSet.weight}" data-count-suffix="kg × ${records.bestSet.reps}${records.bestSet.side === "left" ? " (G)" : records.bestSet.side === "right" ? " (D)" : ""}">0kg × ${records.bestSet.reps}</div>
        <div class="perf-record-date">${formatDateFR(records.bestSetDate)}</div>
      </div>
    </div>
    <div class="perf-chart-wrap">
      <div class="weight-chip-label" style="margin-top:0;">Indice de performance dans le temps</div>
      ${performanceChartSVG(history)}
    </div>
    <div class="weight-chip-label">Historique des séances</div>
    ${historyRowsHTML}
  `;
  content.querySelectorAll(".perf-record-value[data-count-to]").forEach((el) => animateCountUp(el));
}

function animateCountUp(el) {
  const target = parseFloat(el.dataset.countTo);
  const suffix = el.dataset.countSuffix || "";
  if (isNaN(target) || typeof requestAnimationFrame !== "function") {
    el.textContent = `${target}${suffix ? suffix : ""}`;
    return;
  }
  const duration = 450;
  const start = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic : rapide au début, doux à l'arrivée
    const current = Math.round(target * eased * 10) / 10;
    el.textContent = `${current}${suffix}`;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = `${target}${suffix}`;
  }
  requestAnimationFrame(step);
}
