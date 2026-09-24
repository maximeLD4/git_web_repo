function setBarsHTML(ex, colorOverride) {
  const weights = ex.sets.map((s) => parseFloat(s.weight) || 0);
  const reps = ex.sets.map((s) => parseFloat(s.reps) || 0);
  const maxWeight = Math.max(...weights, 1);
  const maxReps = Math.max(...reps, 1);
  const barColorStyle = colorOverride ? `background:${colorOverride};` : "";
  const repsColorStyle = colorOverride ? `color:${colorOverride};` : "";
  const bars = ex.sets
    .map((s, i) => {
      const w = weights[i];
      const r = reps[i];
      const heightPx = w > 0 ? Math.round(20 + (w / maxWeight) * 70) : 8;
      const widthPx = r > 0 ? Math.round(18 + (r / maxReps) * 40) : 14;
      return `
      ${historyRestBadgeHTML(s.restSec)}
      <div class="set-bar-col">
        <div class="set-bar-reps" style="${repsColorStyle}">${r ? `×${r}${s.side === "left" ? " (G)" : s.side === "right" ? " (D)" : ""}` : ""}</div>
        <div class="set-bar" style="height:${heightPx}px;width:${widthPx}px;${barColorStyle}"></div>
        <div class="set-bar-weight">${w ? `${w}kg` : ""}</div>
      </div>`;
    })
    .join("");
  return `<div class="set-bars-row">${bars}</div>`;
}

function sessionCardHTML(s) {
  const open = !!openHistoryIds[s.id];
  const justLanded = justLandedItemId === s.id;
  if (justLanded) justLandedItemId = null;
  const exHTML = s.exercises
    .map(
      (ex) => `
  <div>
    <div class="history-ex-name">${ex.name}${getExerciseDurationSeconds(ex) != null ? ` <span style="color:var(--text-dim); font-weight:600;">· ${formatLiveDuration(getExerciseDurationSeconds(ex))}</span>` : ""}</div>
    ${
      (ex.exType || "muscu") === "cardio"
        ? cardioSetsHistoryHTML(ex)
        : setBarsHTML(ex)
    }
  </div>`
    )
    .join("");
  const durationLabel = getSessionDurationSeconds(s) != null ? `${formatLiveDuration(getSessionDurationSeconds(s))} · ` : "";
  const cardHTML = `
  <div class="history-card ${justLanded ? "just-landed" : ""}">
    <div class="history-head" data-toggle="${s.id}">
      <div class="history-head-left">
        <div class="history-date">${formatDateFR(s.date)}</div>
        ${s.label ? `<div class="history-label">${s.label}</div>` : ""}
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="history-meta">${durationLabel}${s.exercises.length} exo${s.exercises.length !== 1 ? "s" : ""}</div>
        <span class="chev ${open ? "open" : ""}">${ICONS.chevron}</span>
      </div>
    </div>
    ${
      open
        ? `<div class="history-body">${exHTML}</div>
           <div class="delete-row">
             <button class="edit-link" data-edit-session="${s.id}">${ICONS.edit} Modifier</button>
             <button class="edit-link" data-duplicate-session="${s.id}">${ICONS.duplicate} Dupliquer</button>
             <button class="edit-link" data-convert-session="${s.id}">${ICONS.stopwatch} Convertir en plan</button>
             <button class="edit-link" data-share-session="${s.id}">${ICONS.up} Partager</button>
             <button class="delete-link" data-delete-session="${s.id}">${ICONS.trash} Supprimer</button>
           </div>`
        : ""
    }
  </div>`;
  // Le glissé (voir wrapSwipeToDeleteRow) ne s'active que carte repliée —
  // dépliée, le bloc est trop grand pour qu'un glissement reste naturel,
  // et le bouton "Supprimer" ci-dessus reprend le relais à sa place.
  return open ? cardHTML : wrapSwipeToDeleteRow(s.id, cardHTML);
}

// Résumé compact d'un exercice de plan : séries cibles pour Muscu/Rameur/
// Vélo/Course, ou tours×travail/repos pour une config de boucle (Gainage).
function planExerciseSummary(ex) {
  if (ex.loop) return `${ex.loop.rounds}×${ex.loop.workSec}s/${ex.loop.restSec}s`;
  return formatSetsSummary(ex.exType, ex.sets);
}

function planCardHTML(plan) {
  const open = !!openHistoryIds[plan.id];
  const justLanded = justLandedItemId === plan.id;
  if (justLanded) justLandedItemId = null;
  const exHTML = plan.exercises
    .map((ex) => `<div class="history-ex-name">${ex.name} <span style="color:var(--text-dim); font-weight:600;">· ${planExerciseSummary(ex)}</span></div>`)
    .join("");
  const cardHTML = `
  <div class="history-card ${justLanded ? "just-landed" : ""}">
    <div class="history-head" data-toggle="${plan.id}">
      <div class="history-head-left">
        <div class="history-date">${plan.label}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="history-meta">${plan.exercises.length} exo${plan.exercises.length !== 1 ? "s" : ""}</div>
        <span class="chev ${open ? "open" : ""}">${ICONS.chevron}</span>
      </div>
    </div>
    ${
      open
        ? `<div class="history-body">${exHTML}</div>
           <div class="delete-row">
             <button class="edit-link" data-edit-plan="${plan.id}">${ICONS.edit} Modifier</button>
             <button class="edit-link" data-duplicate-plan="${plan.id}">${ICONS.duplicate} Dupliquer</button>
             <button class="edit-link" data-convert-plan="${plan.id}">${ICONS.dumbbell} Convertir en séance</button>
             <button class="delete-link" data-delete-plan="${plan.id}">${ICONS.trash} Supprimer</button>
           </div>`
        : ""
    }
  </div>`;
  return open ? cardHTML : wrapSwipeToDeleteRow(plan.id, cardHTML);
}

function plansListHTML() {
  if (sessionPlans.length === 0) {
    return `<div class="empty-state"><div class="bar-icon">${ICONS.history}</div>Aucun plan préparé pour l'instant.<br>Va dans l'onglet "Créer" pour en préparer un.</div>`;
  }
  return sessionPlans.map(planCardHTML).join("");
}

function historyTabHTML() {
  const sorted = [...sessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  // Le choix Séances/Plans est désormais porté par le grand sélecteur en
  // haut du module (voir renderGymApp) — cet onglet se contente d'en
  // refléter le mode courant, plus de bascule locale qui ferait doublon.
  if (gymTopMode === "plan") {
    return plansListHTML();
  }

  if (sorted.length === 0) {
    return `<div class="empty-state"><div class="bar-icon">${ICONS.history}</div>Aucune séance enregistrée pour l'instant.<br>Va dans l'onglet "Créer" pour ajouter la première.</div>`;
  }
  // Toutes les séances sont traitées pareil, qu'elles soient datées dans le
  // passé ou le futur — plus de distinction "à venir" séparée, dépassée
  // depuis l'arrivée des Plans (voir le grand sélecteur en haut du module).
  return sorted.map(sessionCardHTML).join("");
}


// Partagée entre le glissé (carte repliée) et le bouton "Supprimer" de la
// rangée d'actions (carte dépliée, voir sessionCardHTML/planCardHTML) —
// même confirmation, même animation de disparition, peu importe le chemin.
function deleteGymSessionOrPlan(id, cardEl) {
  // Le mode du grand sélecteur du haut (Séance/Plan) dit lequel des deux
  // on regarde — les deux se ressemblent trop pour se fier à autre chose.
  const isSession = gymTopMode === "session";
  if (isSession) {
    showConfirm(
      "Supprimer définitivement cette séance ? Cette action est irréversible.",
      () => {
        animateCardRemoval(cardEl, () => {
          sessions = sessions.filter((s) => s.id !== id);
          saveJSON(KEYS.sessions, sessions);
          renderContent();
        });
      },
      { confirmLabel: "Supprimer", danger: true }
    );
  } else {
    showConfirm(
      "Supprimer définitivement ce plan ? Cette action est irréversible.",
      () => {
        animateCardRemoval(cardEl, () => {
          sessionPlans = sessionPlans.filter((p) => p.id !== id);
          saveJSON(KEYS.sessionPlans, sessionPlans);
          renderContent();
        });
      },
      { confirmLabel: "Supprimer", danger: true }
    );
  }
}

function attachHistoryListeners() {
  initSwipeToDelete(document.getElementById("content"), deleteGymSessionOrPlan);
  document.querySelectorAll("[data-delete-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteGymSessionOrPlan(btn.dataset.deleteSession, btn.closest(".history-card"));
    });
  });
  document.querySelectorAll("[data-delete-plan]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteGymSessionOrPlan(btn.dataset.deletePlan, btn.closest(".history-card"));
    });
  });
  document.querySelectorAll("[data-edit-plan]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const plan = sessionPlans.find((p) => p.id === btn.dataset.editPlan);
      if (plan) startEditPlan(plan);
    });
  });
  document.querySelectorAll("[data-duplicate-plan]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const plan = sessionPlans.find((p) => p.id === btn.dataset.duplicatePlan);
      if (plan) duplicatePlan(plan);
    });
  });
  document.querySelectorAll("[data-convert-plan]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const plan = sessionPlans.find((p) => p.id === btn.dataset.convertPlan);
      if (plan) convertPlanToSession(plan);
    });
  });
  document.querySelectorAll("[data-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.toggle;
      openHistoryIds[id] = !openHistoryIds[id];
      renderContent();
    });
  });
  document.querySelectorAll("[data-share-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = sessions.find((s) => s.id === btn.dataset.shareSession);
      if (session) exportSingleSession("gym", session);
    });
  });
  document.querySelectorAll("[data-edit-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = sessions.find((s) => s.id === btn.dataset.editSession);
      if (session) startEditSession(session);
    });
  });
  document.querySelectorAll("[data-duplicate-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = sessions.find((s) => s.id === btn.dataset.duplicateSession);
      if (session) duplicateSession(session);
    });
  });
  document.querySelectorAll("[data-convert-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = sessions.find((s) => s.id === btn.dataset.convertSession);
      if (session) convertSessionToPlan(session);
    });
  });
}
