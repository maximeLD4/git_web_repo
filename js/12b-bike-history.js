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
             <button class="edit-link" data-bike-share-session="${s.id}">${ICONS.up} Partager</button>
             <button class="delete-link" data-bike-delete-session="${s.id}">${ICONS.trash} Supprimer</button>
           </div>`
        : ""
    }
  </div>`;
  return open ? cardHTML : wrapSwipeToDeleteRow(s.id, cardHTML);
}

function bikeHistoryTabHTML() {
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

function attachBikeHistoryListeners() {
  initSwipeToDelete(document.getElementById("content"), deleteBikeSession);
  document.querySelectorAll("[data-bike-delete-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteBikeSession(btn.dataset.bikeDeleteSession, btn.closest(".history-card"));
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
}
