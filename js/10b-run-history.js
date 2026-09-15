function runSessionCardHTML(s) {
  const open = !!openRunHistoryIds[s.id];
  const justLanded = justLandedItemId === s.id;
  if (justLanded) justLandedItemId = null;
  const blocksSummary = s.blocks
    .map(
      (b) => `
  <div>
    <div class="history-ex-name">${b.label}</div>
    <div class="history-sets"><div class="history-set-chip">${formatBlockSummary(b)}</div></div>
  </div>`
    )
    .join("");
  const cardHTML = `
  <div class="history-card ${justLanded ? "just-landed" : ""}">
    <div class="history-head" data-run-toggle="${s.id}">
      <div class="history-head-left">
        <div class="history-date">${formatDateFR(s.date)}</div>
        ${s.label ? `<div class="history-label">${s.label}</div>` : ""}
        <div class="history-run-stats">${formatSessionTotalsLine(s.blocks)}</div>
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
             <button class="edit-link" data-run-edit-session="${s.id}">${ICONS.edit} Modifier</button>
             <button class="edit-link" data-run-duplicate-session="${s.id}">${ICONS.duplicate} Dupliquer</button>
             <button class="edit-link" data-run-share-session="${s.id}">${ICONS.up} Partager</button>
             <button class="delete-link" data-run-delete-session="${s.id}">${ICONS.trash} Supprimer</button>
           </div>`
        : ""
    }
  </div>`;
  return open ? cardHTML : wrapSwipeToDeleteRow(s.id, cardHTML);
}

function runHistoryTabHTML() {
  const sorted = [...runSessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (sorted.length === 0) {
    return `<div class="empty-state"><div class="bar-icon">${ICONS.history}</div>Aucune séance enregistrée pour l'instant.<br>Va dans l'onglet "Créer" pour ajouter la première.</div>`;
  }

  // Toutes les séances sont regroupées par semaine, qu'elles soient datées
  // dans le passé ou le futur — plus de distinction "à venir" séparée.
  const weeks = groupRunSessionsByWeek(sorted);
  const weeksHTML = weeks
    .map((week) => {
      let totalKm = 0;
      let totalMin = 0;
      week.sessions.forEach((s) => {
        s.blocks.forEach((b) => {
          totalKm += blockDistanceKm(b);
          totalMin += blockDurationMin(b);
        });
      });
      const sessionsHTML = week.sessions.map(runSessionCardHTML).join("");
      return `
      <div class="week-group">
        <div class="week-header">
          <div class="week-range">Semaine du ${formatDateShortFR(week.weekStart)} au ${formatDateShortFR(week.weekEnd)}</div>
          <div class="week-stats">${totalKm > 0 ? `${Math.round(totalKm * 10) / 10} km` : "—"} · ${formatDurationMin(totalMin)}</div>
        </div>
        ${sessionsHTML}
      </div>`;
    })
    .join("");

  return weeksHTML;
}


function deleteRunSession(id, cardEl) {
  showConfirm(
    "Supprimer définitivement cette séance ? Cette action est irréversible.",
    () => {
      animateCardRemoval(cardEl, () => {
        runSessions = runSessions.filter((s) => s.id !== id);
        saveJSON(KEYS.runSessions, runSessions);
        renderRunContent();
      });
    },
    { confirmLabel: "Supprimer", danger: true }
  );
}

function attachRunHistoryListeners() {
  initSwipeToDelete(document.getElementById("content"), deleteRunSession);
  document.querySelectorAll("[data-run-delete-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteRunSession(btn.dataset.runDeleteSession, btn.closest(".history-card"));
    });
  });
  document.querySelectorAll("[data-run-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.runToggle;
      openRunHistoryIds[id] = !openRunHistoryIds[id];
      renderRunContent();
    });
  });
  document.querySelectorAll("[data-run-share-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = runSessions.find((s) => s.id === btn.dataset.runShareSession);
      if (session) exportSingleSession("run", session);
    });
  });
  document.querySelectorAll("[data-run-edit-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = runSessions.find((s) => s.id === btn.dataset.runEditSession);
      if (session) startEditRunSession(session);
    });
  });
  document.querySelectorAll("[data-run-duplicate-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = runSessions.find((s) => s.id === btn.dataset.runDuplicateSession);
      if (session) duplicateRunSession(session);
    });
  });
}
