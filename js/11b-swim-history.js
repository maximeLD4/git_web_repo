function swimSessionCardHTML(s) {
  const open = !!openSwimHistoryIds[s.id];
  const justLanded = justLandedItemId === s.id;
  if (justLanded) justLandedItemId = null;
  const blocksSummary = s.blocks
    .map(
      (b) => `
  <div>
    <div class="history-ex-name">${b.label}</div>
    <div class="history-sets"><div class="history-set-chip">${formatSwimBlockSummary(b)}</div></div>
  </div>`
    )
    .join("");
  const cardHTML = `
  <div class="history-card ${justLanded ? "just-landed" : ""}">
    <div class="history-head" data-swim-toggle="${s.id}">
      <div class="history-head-left">
        <div class="history-date">${formatDateFR(s.date)}</div>
        ${s.label ? `<div class="history-label">${s.label}</div>` : ""}
        <div class="history-run-stats">${formatSwimSessionTotalsLine(s.blocks)}</div>
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
             <button class="edit-link" data-swim-edit-session="${s.id}">${ICONS.edit} Modifier</button>
             <button class="edit-link" data-swim-duplicate-session="${s.id}">${ICONS.duplicate} Dupliquer</button>
             <button class="edit-link" data-swim-share-session="${s.id}">${ICONS.up} Partager</button>
             <button class="delete-link" data-swim-delete-session="${s.id}">${ICONS.trash} Supprimer</button>
           </div>`
        : ""
    }
  </div>`;
  return open ? cardHTML : wrapSwipeToDeleteRow(s.id, cardHTML);
}

function swimHistoryTabHTML() {
  const sorted = [...swimSessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (sorted.length === 0) {
    return `<div class="empty-state"><div class="bar-icon">${ICONS.history}</div>Aucune séance enregistrée pour l'instant.<br>Va dans l'onglet "Créer" pour ajouter la première.</div>`;
  }
  return sorted.map(swimSessionCardHTML).join("");
}


function deleteSwimSession(id, cardEl) {
  showConfirm(
    "Supprimer définitivement cette séance ? Cette action est irréversible.",
    () => {
      animateCardRemoval(cardEl, () => {
        swimSessions = swimSessions.filter((s) => s.id !== id);
        saveJSON(KEYS.swimSessions, swimSessions);
        renderSwimContent();
      });
    },
    { confirmLabel: "Supprimer", danger: true }
  );
}

function attachSwimHistoryListeners() {
  initSwipeToDelete(document.getElementById("content"), deleteSwimSession);
  document.querySelectorAll("[data-swim-delete-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteSwimSession(btn.dataset.swimDeleteSession, btn.closest(".history-card"));
    });
  });
  document.querySelectorAll("[data-swim-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.swimToggle;
      openSwimHistoryIds[id] = !openSwimHistoryIds[id];
      renderSwimContent();
    });
  });
  document.querySelectorAll("[data-swim-share-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = swimSessions.find((s) => s.id === btn.dataset.swimShareSession);
      if (session) exportSingleSession("swim", session);
    });
  });
  document.querySelectorAll("[data-swim-edit-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = swimSessions.find((s) => s.id === btn.dataset.swimEditSession);
      if (session) startEditSwimSession(session);
    });
  });
  document.querySelectorAll("[data-swim-duplicate-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = swimSessions.find((s) => s.id === btn.dataset.swimDuplicateSession);
      if (session) duplicateSwimSession(session);
    });
  });
}
