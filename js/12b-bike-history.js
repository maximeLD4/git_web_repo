function bikeSessionCardHTML(s) {
  const open = !!openBikeHistoryIds[s.id];
  const justLanded = justLandedItemId === s.id;
  if (justLanded) justLandedItemId = null;
  const blocksSummary = s.blocks
    .map(
      (b) => `
  <div>
    <div class="history-ex-name">${b.label}</div>
    <div class="history-sets"><div class="history-set-chip">${formatBikeBlockSummary(b)}</div></div>
  </div>`
    )
    .join("");
  const cardHTML = `
  <div class="history-card ${justLanded ? "just-landed" : ""}">
    <div class="history-head" data-bike-toggle="${s.id}">
      <div class="history-head-left">
        <div class="history-date">${formatDateFR(s.date)}</div>
        ${s.label ? `<div class="history-label">${s.label}</div>` : ""}
        <div class="history-run-stats">${formatBikeSessionTotalsLine(s.blocks)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="history-meta">${s.blocks.length} bloc${s.blocks.length !== 1 ? "s" : ""}</div>
        <span class="chev ${open ? "open" : ""}">${ICONS.chevron}</span>
      </div>
    </div>
    ${
      open
        ? `<div class="history-body">${blocksSummary}</div>
           <div class="delete-row">
             <button class="edit-link" data-bike-edit-session="${s.id}">${ICONS.edit} Modifier</button>
             <button class="edit-link" data-bike-duplicate-session="${s.id}">${ICONS.duplicate} Dupliquer</button>
             <button class="edit-link" data-bike-convert-session="${s.id}">${ICONS.stopwatch} Convertir en plan</button>
             <button class="edit-link" data-bike-share-session="${s.id}">${ICONS.up} Partager</button>
             <button class="delete-link" data-bike-delete-session="${s.id}">${ICONS.trash} Supprimer</button>
           </div>`
        : ""
    }
  </div>`;
  return open ? cardHTML : wrapSwipeToDeleteRow(s.id, cardHTML);
}

function bikePlanCardHTML(plan) {
  const open = !!openBikeHistoryIds[plan.id];
  const justLanded = justLandedItemId === plan.id;
  if (justLanded) justLandedItemId = null;
  const blocksSummary = plan.blocks
    .map(
      (b) => `
  <div>
    <div class="history-ex-name">${b.label}</div>
    <div class="history-sets"><div class="history-set-chip">${formatBikeBlockSummary(b)}</div></div>
  </div>`
    )
    .join("");
  const cardHTML = `
  <div class="history-card ${justLanded ? "just-landed" : ""}">
    <div class="history-head" data-bike-toggle="${plan.id}">
      <div class="history-head-left">
        <div class="history-date">${plan.label}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="history-meta">${plan.blocks.length} bloc${plan.blocks.length !== 1 ? "s" : ""}</div>
        <span class="chev ${open ? "open" : ""}">${ICONS.chevron}</span>
      </div>
    </div>
    ${
      open
        ? `<div class="history-body">${blocksSummary}</div>
           <div class="delete-row">
             <button class="edit-link" data-bike-edit-plan="${plan.id}">${ICONS.edit} Modifier</button>
             <button class="edit-link" data-bike-duplicate-plan="${plan.id}">${ICONS.duplicate} Dupliquer</button>
             <button class="edit-link" data-bike-convert-plan="${plan.id}">${ICONS.stopwatch} Convertir en séance</button>
             <button class="delete-link" data-bike-delete-plan="${plan.id}">${ICONS.trash} Supprimer</button>
           </div>`
        : ""
    }
  </div>`;
  return open ? cardHTML : wrapSwipeToDeleteRow(plan.id, cardHTML);
}

function bikePlansListHTML() {
  if (bikeSessionPlans.length === 0) {
    return `<div class="empty-state"><div class="bar-icon">${ICONS.history}</div>Aucun plan préparé pour l'instant.<br>Va dans l'onglet "Créer" pour en préparer un.</div>`;
  }
  return bikeSessionPlans.map(bikePlanCardHTML).join("");
}

function bikeHistoryTabHTML() {
  if (bikeTopMode === "plan") {
    return bikePlansListHTML();
  }
  const sorted = [...bikeSessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (sorted.length === 0) {
    return `<div class="empty-state"><div class="bar-icon">${ICONS.history}</div>Aucune séance enregistrée pour l'instant.<br>Va dans l'onglet "Créer" pour ajouter la première.</div>`;
  }
  return sorted.map(bikeSessionCardHTML).join("");
}


function deleteBikeSession(id, cardEl) {
  showConfirm(
    "Supprimer définitivement cette séance ? Cette action est irréversible.",
    () => {
      animateCardRemoval(cardEl, () => {
        bikeSessions = bikeSessions.filter((s) => s.id !== id);
        saveJSON(KEYS.bikeSessions, bikeSessions);
        renderBikeContent();
      });
    },
    { confirmLabel: "Supprimer", danger: true }
  );
}

function deleteBikePlan(id, cardEl) {
  showConfirm(
    "Supprimer définitivement ce plan ? Cette action est irréversible.",
    () => {
      animateCardRemoval(cardEl, () => {
        bikeSessionPlans = bikeSessionPlans.filter((p) => p.id !== id);
        saveJSON(KEYS.bikeSessionPlans, bikeSessionPlans);
        renderBikeContent();
      });
    },
    { confirmLabel: "Supprimer", danger: true }
  );
}

function attachBikeHistoryListeners() {
  initSwipeToDelete(document.getElementById("content"), (id, cardEl) => {
    if (bikeTopMode === "plan") deleteBikePlan(id, cardEl);
    else deleteBikeSession(id, cardEl);
  });
  document.querySelectorAll("[data-bike-delete-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteBikeSession(btn.dataset.bikeDeleteSession, btn.closest(".history-card"));
    });
  });
  document.querySelectorAll("[data-bike-delete-plan]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteBikePlan(btn.dataset.bikeDeletePlan, btn.closest(".history-card"));
    });
  });
  document.querySelectorAll("[data-bike-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.bikeToggle;
      openBikeHistoryIds[id] = !openBikeHistoryIds[id];
      renderBikeContent();
    });
  });
  document.querySelectorAll("[data-bike-share-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = bikeSessions.find((s) => s.id === btn.dataset.bikeShareSession);
      if (session) exportSingleSession("bike", session);
    });
  });
  document.querySelectorAll("[data-bike-edit-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = bikeSessions.find((s) => s.id === btn.dataset.bikeEditSession);
      if (session) startEditBikeSession(session);
    });
  });
  document.querySelectorAll("[data-bike-duplicate-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = bikeSessions.find((s) => s.id === btn.dataset.bikeDuplicateSession);
      if (session) duplicateBikeSession(session);
    });
  });
  document.querySelectorAll("[data-bike-convert-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = bikeSessions.find((s) => s.id === btn.dataset.bikeConvertSession);
      if (session) convertBikeSessionToPlan(session);
    });
  });
  document.querySelectorAll("[data-bike-edit-plan]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const plan = bikeSessionPlans.find((p) => p.id === btn.dataset.bikeEditPlan);
      if (plan) startEditBikePlan(plan);
    });
  });
  document.querySelectorAll("[data-bike-duplicate-plan]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const plan = bikeSessionPlans.find((p) => p.id === btn.dataset.bikeDuplicatePlan);
      if (plan) duplicateBikePlan(plan);
    });
  });
  document.querySelectorAll("[data-bike-convert-plan]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const plan = bikeSessionPlans.find((p) => p.id === btn.dataset.bikeConvertPlan);
      if (plan) convertBikePlanToSession(plan);
    });
  });
}
