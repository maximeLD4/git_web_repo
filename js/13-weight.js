
function renderWeightApp() {
  app.className = "theme-weight";
  app.innerHTML = `
    <div class="header header-plain-title">
      <button type="button" class="back-btn-text" data-go-home>${ICONS.back} Accueil</button>
      <div class="screen-title">Poids</div>
      <div class="header-sub screen-subtitle">${weights.length} pesée${weights.length !== 1 ? "s" : ""} enregistrée${weights.length !== 1 ? "s" : ""}</div>
    </div>
    <div class="content" id="content" style="padding-bottom: 24px;"></div>
  `;
  document.querySelector("[data-go-home]").addEventListener("click", goHome);
  renderWeightContent();
}

function weightTabHTML() {
  const sorted = [...weights].sort((a, b) => (a.date < b.date ? 1 : -1));
  const latest = sorted[0];
  const prev = sorted[1];
  const diff = latest && prev ? +(latest.weight - prev.weight).toFixed(1) : null;
  // La variation compare à la pesée PRÉCÉDENTE, quel que soit l'écart : le
  // libellé doit donc dire l'écart réel, pas un "7 jours" figé.
  const diffDays = latest && prev ? Math.round((new Date(latest.date + "T00:00:00") - new Date(prev.date + "T00:00:00")) / 86400000) : null;
  const diffLabel = diffDays === null ? "" : diffDays <= 0 ? "même jour" : "sur " + diffDays + " jour" + (diffDays > 1 ? "s" : "");
  const chartData = [...weights].sort((a, b) => (a.date > b.date ? 1 : -1));

  let statsHTML = "";
  if (latest) {
    statsHTML = `
    <div class="weight-stat-row">
      <div class="weight-stat-card">
        <div class="weight-stat-label">Dernier poids</div>
        <div class="weight-stat-value">${latest.weight} kg</div>
        <div class="weight-stat-date">${formatDateFR(latest.date)}</div>
      </div>
      <div class="weight-stat-card weight-stat-card-dark">
        <div class="weight-stat-label">Variation</div>
        <div class="weight-stat-value">${diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff} kg`}</div>
        <div class="weight-stat-date">${diffLabel}</div>
      </div>
    </div>`;
  }

  let chartHTML = "";
  if (chartData.length > 1) {
    const vals = chartData.map((d) => d.weight);
    const min = Math.min(...vals) - 1;
    const max = Math.max(...vals) + 1;
    const W = 300, H = 120, pad = 10;
    const points = chartData.map((d, i) => {
      const x = pad + (i / (chartData.length - 1)) * (W - pad * 2);
      const y = H - pad - ((d.weight - min) / (max - min || 1)) * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const dots = chartData
      .map((d, i) => {
        const [x, y] = points[i].split(",");
        return `<circle cx="${x}" cy="${y}" r="3" fill="var(--accent)"/>`;
      })
      .join("");
    chartHTML = `
    <div class="chart-card">
      <div class="chart-title">Évolution</div>
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="140" preserveAspectRatio="none">
        <polyline points="${points.join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2" />
        ${dots}
      </svg>
      <div class="chart-labels"><span>${formatDateShortFR(chartData[0].date)}</span><span>${formatDateShortFR(chartData[chartData.length - 1].date)}</span></div>
    </div>`;
  }

  const listHTML =
    sorted.length === 0
      ? `<div class="empty-state"><div class="bar-icon">${ICONS.scale}</div>Aucune pesée enregistrée pour l'instant.</div>`
      : `<div class="weight-history-card">${sorted
          .map((e) =>
            wrapSwipeToDeleteRow(
              e.id,
              `
      <div class="weight-entry-row" data-id="${e.id}">
        <div class="weight-entry-date">${formatDateFR(e.date)}</div>
        <div class="weight-entry-value">${e.weight} kg</div>
      </div>`
            )
          )
          .join("")}</div>`;

  return `
    ${statsHTML}
    ${chartHTML}
    <div class="home-section-label" style="margin-top:0;">Nouvelle pesée</div>
    <div class="field-list-card">
      <label class="field-list-row" for="w-date"><span>Date</span><input type="date" id="w-date" value="${todayISO()}"></label>
      <label class="field-list-row" for="w-value"><span>Poids</span><input type="text" inputmode="decimal" id="w-value" placeholder="72.5"></label>
    </div>
    <button class="save-btn" id="save-weight-btn" style="margin-bottom:20px;">${ICONS.check} Enregistrer le poids</button>
    <div class="home-section-label" style="margin-top:0;">Historique</div>
    ${listHTML}
  `;
}

function renderWeightContent() {
  document.getElementById("content").innerHTML = weightTabHTML();
  attachWeightListeners();
}

function attachWeightListeners() {
  initSwipeToDelete(document.getElementById("content"), (id, cardEl) => {
    animateCardRemoval(cardEl, () => {
      weights = weights.filter((e) => e.id !== id);
      saveJSON(KEYS.weights, weights);
      renderWeightContent();
    });
  });
  document.getElementById("save-weight-btn").addEventListener("click", () => {
    const dateEl = document.getElementById("w-date");
    const valueEl = document.getElementById("w-value");
    const val = parseFloat(valueEl.value);
    if (valueEl.value === "" || isNaN(val)) return;
    weights = weights.filter((e) => e.date !== dateEl.value);
    const newEntry = { id: uid(), date: dateEl.value, weight: val };
    weights.push(newEntry);
    saveJSON(KEYS.weights, weights);
    renderWeightContent();
    const newRow = document.querySelector(`.weight-entry-row[data-id="${newEntry.id}"]`);
    if (newRow) newRow.classList.add("set-row-enter");
  });
}
