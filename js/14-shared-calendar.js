
function renderSharedCalendarApp() {
  app.className = "theme-calendar";
  sharedCalendarMonth = todayISO().slice(0, 7);
  sharedSelectedDate = todayISO();
  sharedCalendarFilter = "all";
  app.innerHTML = `
    <div class="header header-plain-title">
      <div class="screen-title">Calendrier</div>
      <div class="header-sub screen-subtitle" id="cal-header-sub"></div>
    </div>
    <div class="content" id="content" style="padding-bottom: calc(var(--bottom-nav-h) + 10px);"></div>
    ${bottomNavHTML("calendar")}
  `;
  attachBottomNavListeners();
  renderSharedCalendarContent();
}

/* ---------- shared calendar (read-only) ---------- */
function shiftSharedCalendarMonth(delta) {
  const [y, m] = sharedCalendarMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  sharedCalendarMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
// Une séance qui ne contient QUE des exercices de gainage (aucun muscu) ne
// doit pas être comptée/affichée comme "Muscu" dans le calendrier partagé —
// elle vit dans les mêmes données (sessions), mais visuellement/logiquement
// c'est autre chose. Une séance MIXTE (muscu + gainage) reste "Muscu" : pas
// de double-comptage, la présence de vrai travail musculaire prime.
function isGainageOnlySession(s) {
  return s.exercises.length > 0 && s.exercises.every((ex) => (ex.category || "") === GAINAGE_CATEGORY.key);
}
function getActivitySessions(key) {
  if (key === "gym") return sessions.filter((s) => !isGainageOnlySession(s));
  if (key === "gainage") return sessions.filter((s) => isGainageOnlySession(s));
  if (key === "run") return runSessions;
  if (key === "swim") return swimSessions;
  return bikeSessions;
}

function editActivityFromCalendar(type, id) {
  const session = getActivitySessions(type).find((s) => s.id === id);
  if (!session) return;
  calendarReturnTarget = true;
  calendarReturnDate = session.date;
  // Le gainage vit dans le même module que la Muscu (currentApp = "gym") —
  // "gainage" n'est qu'une distinction visuelle/logique propre à ce
  // calendrier (voir getActivitySessions), pas un onglet séparé de l'app.
  currentApp = type === "gainage" ? "gym" : type;
  if (type === "gym" || type === "gainage") startEditSession(session);
  else if (type === "run") startEditRunSession(session);
  else if (type === "swim") startEditSwimSession(session);
  else startEditBikeSession(session);
}

function duplicateActivityFromCalendar(type, id) {
  const session = getActivitySessions(type).find((s) => s.id === id);
  if (!session) return;
  // Même logique que "Modifier" : après avoir enregistré (ou annulé) le
  // doublon dans l'onglet Créer du sport concerné, on revient au calendrier
  // plutôt que de rester sur ce sport.
  calendarReturnTarget = true;
  calendarReturnDate = session.date;
  currentApp = type === "gainage" ? "gym" : type;
  if (type === "gym" || type === "gainage") duplicateSession(session);
  else if (type === "run") duplicateRunSession(session);
  else if (type === "swim") duplicateSwimSession(session);
  else duplicateBikeSession(session);
}

function returnToCalendar() {
  const returnDate = calendarReturnDate;
  calendarReturnTarget = null;
  calendarReturnDate = null;
  currentApp = "calendar";
  render(); // construit l'écran (renderSharedCalendarApp réinitialise la sélection par défaut)
  if (returnDate) {
    // On impose ensuite la bonne date/mois et on ne rafraîchit que le
    // contenu, pour ne pas reconstruire tout l'en-tête inutilement.
    sharedCalendarMonth = returnDate.slice(0, 7);
    sharedSelectedDate = returnDate;
    renderSharedCalendarContent();
  }
}

function sharedSessionPreviewHTML(s, type) {
  const meta = ACTIVITY_META.find((a) => a.key === type);
  const color = meta.color;
  const rgb = meta.rgb;
  const label = meta.label;
  const toggleKey = `${type}:${s.id}`;
  const open = !!openSharedCalendarIds[toggleKey];
  let detail, metaCount, valueHTML, subtitleExtra;

  if (type === "gym" || type === "gainage") {
    detail = s.exercises
      .map(
        (ex) => `
    <div>
      <div class="history-ex-name">${ex.name}${getExerciseDurationSeconds(ex) != null ? ` <span style="color:var(--text-dim); font-weight:600;">· ${formatLiveDuration(getExerciseDurationSeconds(ex))}</span>` : ""}</div>
      ${
        (ex.exType || "muscu") === "cardio"
          ? cardioSetsHistoryHTML(ex)
          : setBarsHTML(ex, color)
      }
    </div>`
      )
      .join("");
    metaCount = `${s.exercises.length} exo${s.exercises.length !== 1 ? "s" : ""}`;
    valueHTML = "";
    subtitleExtra = "";
  } else {
    const formatSummary = type === "run" ? formatBlockSummary : type === "swim" ? formatSwimBlockSummary : formatBikeBlockSummary;
    const totals = type === "run" ? computeSessionTotals(s.blocks) : type === "swim" ? computeSwimSessionTotals(s.blocks) : computeBikeSessionTotals(s.blocks);
    detail = s.blocks
      .map(
        (b) => `
    <div>
      <div class="history-ex-name">${b.label}</div>
      <div class="history-sets"><div class="history-set-chip">${formatSummary(b)}</div></div>
    </div>`
      )
      .join("");
    metaCount = `${s.blocks.length} bloc${s.blocks.length !== 1 ? "s" : ""}`;
    if (type === "run") { valueHTML = totals.km > 0 ? `${Math.round(totals.km * 10) / 10} km` : "0 km"; subtitleExtra = totals.pace ? ` · ${formatPaceDisplay(String(totals.pace))}` : ""; }
    else if (type === "swim") { valueHTML = totals.m > 0 ? `${Math.round(totals.m)} m` : "0 m"; subtitleExtra = totals.pace ? ` · ${formatSwimPaceDisplay(String(totals.pace)) || ""}` : ""; }
    else { valueHTML = totals.km > 0 ? `${Math.round(totals.km * 10) / 10} km` : "0 km"; subtitleExtra = totals.speed ? ` · ${Math.round(totals.speed * 10) / 10} km/h` : ""; }
  }
  const activityIcon = { gym: ICONS.dumbbell, gainage: ICONS.dumbbell, run: ICONS.stopwatch, swim: ICONS.swim, bike: ICONS.bike }[type];

  const cardHTML = `
  <div class="history-card" style="border-color: rgba(${rgb},0.35);">
    <div class="history-head" data-shared-toggle="${toggleKey}">
      <div class="history-row-icon" style="background:rgba(${rgb},0.16); color:${color};">${activityIcon}</div>
      <div class="history-head-left">
        <div class="history-date">${s.label || formatDateFR(s.date)}</div>
        <div class="history-label">${label} · ${metaCount}${subtitleExtra}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        ${valueHTML ? `<div class="history-meta">${valueHTML}</div>` : ""}
        <span class="chev ${open ? "open" : ""}">${ICONS.chevron}</span>
      </div>
    </div>
    ${
      open
        ? `<div class="history-body">${detail}</div>
           <div class="delete-row">
             <button class="edit-link" data-shared-edit-type="${type}" data-shared-edit-id="${s.id}">${ICONS.edit} Modifier</button>
             <button class="edit-link" data-shared-duplicate-type="${type}" data-shared-duplicate-id="${s.id}">${ICONS.duplicate} Dupliquer</button>
             <button class="edit-link" data-shared-share-type="${type}" data-shared-share-id="${s.id}">${ICONS.up} Partager</button>
             <button class="delete-link" data-shared-delete-type="${type}" data-shared-delete-id="${s.id}">${ICONS.trash} Supprimer</button>
           </div>`
        : ""
    }
  </div>`;
  // L'id du glissé embarque aussi le type (gym/gainage/run/swim/bike) —
  // plusieurs listes différentes cohabitent ici, un simple id de séance ne
  // suffirait pas à savoir laquelle supprimer (voir attachSharedCalendarListeners).
  return open ? cardHTML : wrapSwipeToDeleteRow(toggleKey, cardHTML);
}

function sharedCalendarViewHTML() {
  const [y, m] = sharedCalendarMonth.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const startDow = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthLabelRaw = firstOfMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);
  // Remplace les calendriers individuels retirés de chaque module de sport —
  // "gym" inclut aussi "gainage" (même module "Salle de sport"), les autres
  // filtres correspondent chacun à un seul module.
  const activeMeta = sharedCalendarFilter === "all" ? ACTIVITY_META : ACTIVITY_META.filter((a) => a.key === sharedCalendarFilter || (sharedCalendarFilter === "gym" && a.key === "gainage"));
  const filterOptions = [
    { key: "all", label: "Tous" },
    { key: "gym", label: "Salle de sport" },
    { key: "run", label: "Course" },
    { key: "swim", label: "Natation" },
    { key: "bike", label: "Vélo" },
  ];
  const filterHTML = `
    <div class="ex-type-toggle scroll-toggle" style="margin-bottom:16px;">
      ${filterOptions.map((f) => `<button type="button" class="ex-type-btn ${sharedCalendarFilter === f.key ? "active" : ""}" data-shared-cal-filter="${f.key}">${f.label}</button>`).join("")}
    </div>`;
  const dateSets = {};
  activeMeta.forEach((a) => {
    const list = getActivitySessions(a.key);
    dateSets[a.key] = new Set(list.map((s) => s.date));
  });
  const today = todayISO();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push("<div class=\"cal-cell empty\"></div>");
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${sharedCalendarMonth}-${String(d).padStart(2, "0")}`;
    const isSelected = sharedSelectedDate === dateStr;
    const isToday = dateStr === today;
    let hasAny = false;
    const dots = activeMeta.map((a) => {
      if (!dateSets[a.key].has(dateStr)) return "";
      hasAny = true;
      return `<span class="cal-dot-mini" style="background:${a.color};"></span>`;
    }).join("");
    cells.push(`
      <button type="button" class="cal-cell ${hasAny ? "has-data" : ""} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}" data-shared-cal-date="${dateStr}">
        <span class="cal-day-num">${d}</span>
        <span class="cal-dot-row">${dots}</span>
      </button>`);
  }

  let selectedHTML = "";
  if (sharedSelectedDate) {
    const perType = activeMeta.map((a) => ({
      key: a.key,
      list: getActivitySessions(a.key).filter((s) => s.date === sharedSelectedDate),
    }));
    const anyData = perType.some((t) => t.list.length > 0);
    const isToday = sharedSelectedDate === today;
    const fullDateRaw = new Date(sharedSelectedDate + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const titleText = isToday ? "Aujourd'hui" : fullDateRaw.charAt(0).toUpperCase() + fullDateRaw.slice(1);
    selectedHTML = `<div class="home-section-label" style="margin-top:20px;">${titleText}</div>`;
    if (!anyData) {
      selectedHTML += `<div class="cal-empty-card">Aucune séance</div><div class="cal-empty-hint">Touche un jour pour voir ses séances.</div>`;
    } else {
      selectedHTML += perType.map((t) => t.list.map((s) => sharedSessionPreviewHTML(s, t.key)).join("")).join("");
    }
  }

  return `
    ${filterHTML}
    <div class="cal-card">
      <div class="cal-header">
        <button type="button" class="cal-nav-btn" data-shared-cal-prev>${ICONS.back}</button>
        <div class="cal-month-label">${monthLabel}</div>
        <button type="button" class="cal-nav-btn" data-shared-cal-next>${ICONS.chevronRight}</button>
      </div>
      <div class="cal-weekdays"><div>Lu</div><div>Ma</div><div>Me</div><div>Je</div><div>Ve</div><div>Sa</div><div>Di</div></div>
      <div class="cal-grid">${cells.join("")}</div>
      <div class="cal-legend">
        ${activeMeta.map((a) => `<span><span class="cal-dot-mini" style="background:${a.color};"></span> ${a.label}</span>`).join("")}
      </div>
    </div>
    ${selectedHTML}
  `;
}

function renderSharedCalendarContent() {
  document.getElementById("content").innerHTML = sharedCalendarViewHTML();
  attachSharedCalendarListeners();
  const monthCount = ACTIVITY_META.reduce((sum, a) => sum + getActivitySessions(a.key).filter((s) => s.date.slice(0, 7) === sharedCalendarMonth).length, 0);
  const subEl = document.getElementById("cal-header-sub");
  if (subEl) subEl.textContent = `${monthCount} séance${monthCount !== 1 ? "s" : ""} ce mois-ci`;
}

function deleteSharedActivity(swipeId, cardEl) {
  // swipeId embarque "type:id" (voir sharedSessionPreviewHTML) — plusieurs
  // listes différentes cohabitent dans ce calendrier, contrairement aux
  // autres écrans où l'id seul suffit.
  const sep = swipeId.indexOf(":");
  const type = swipeId.slice(0, sep);
  const id = swipeId.slice(sep + 1);
  showConfirm(
    "Supprimer définitivement cette activité ? Cette action est irréversible.",
    () => {
      animateCardRemoval(cardEl, () => {
        if (type === "gym" || type === "gainage") {
          sessions = sessions.filter((s) => s.id !== id);
          saveJSON(KEYS.sessions, sessions);
        } else if (type === "run") {
          runSessions = runSessions.filter((s) => s.id !== id);
          saveJSON(KEYS.runSessions, runSessions);
        } else if (type === "swim") {
          swimSessions = swimSessions.filter((s) => s.id !== id);
          saveJSON(KEYS.swimSessions, swimSessions);
        } else {
          bikeSessions = bikeSessions.filter((s) => s.id !== id);
          saveJSON(KEYS.bikeSessions, bikeSessions);
        }
        renderSharedCalendarContent();
      });
    },
    { confirmLabel: "Supprimer", danger: true }
  );
}

function attachSharedCalendarListeners() {
  document.querySelectorAll("[data-shared-cal-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      sharedCalendarFilter = btn.dataset.sharedCalFilter;
      renderSharedCalendarContent();
    });
  });
  initSwipeToDelete(document.getElementById("content"), deleteSharedActivity);
  document.querySelectorAll("[data-shared-delete-type]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteSharedActivity(`${btn.dataset.sharedDeleteType}:${btn.dataset.sharedDeleteId}`, btn.closest(".history-card"));
    });
  });
  const prev = document.querySelector("[data-shared-cal-prev]");
  const next = document.querySelector("[data-shared-cal-next]");
  if (prev) prev.addEventListener("click", () => animateCalendarMonthChange(-1, () => { shiftSharedCalendarMonth(-1); renderSharedCalendarContent(); }));
  if (next) next.addEventListener("click", () => animateCalendarMonthChange(1, () => { shiftSharedCalendarMonth(1); renderSharedCalendarContent(); }));
  document.querySelectorAll("[data-shared-cal-date]").forEach((cell) => {
    cell.addEventListener("click", () => {
      const d = cell.dataset.sharedCalDate;
      sharedSelectedDate = sharedSelectedDate === d ? null : d;
      renderSharedCalendarContent();
    });
  });
  document.querySelectorAll("[data-shared-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const key = el.dataset.sharedToggle;
      openSharedCalendarIds[key] = !openSharedCalendarIds[key];
      renderSharedCalendarContent();
    });
  });
  document.querySelectorAll("[data-shared-edit-type]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      editActivityFromCalendar(btn.dataset.sharedEditType, btn.dataset.sharedEditId);
    });
  });
  document.querySelectorAll("[data-shared-duplicate-type]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      duplicateActivityFromCalendar(btn.dataset.sharedDuplicateType, btn.dataset.sharedDuplicateId);
    });
  });
  document.querySelectorAll("[data-shared-share-type]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const type = btn.dataset.sharedShareType;
      const session = getActivitySessions(type).find((s) => s.id === btn.dataset.sharedShareId);
      if (session) exportSingleSession(type, session);
    });
  });
}
