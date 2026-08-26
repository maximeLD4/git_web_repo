
function renderWeightApp() {
  app.className = "theme-weight";
  app.innerHTML = `
    <div class="header">
      <div class="header-title"><button type="button" class="back-btn" data-go-home>${ICONS.back}</button><span class="header-icon">${ICONS.scale}</span>Poids</div>
      <div class="header-sub">${weights.length} pesée${weights.length !== 1 ? "s" : ""} enregistrée${weights.length !== 1 ? "s" : ""}</div>
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
  const chartData = [...weights].sort((a, b) => (a.date > b.date ? 1 : -1));

  let statsHTML = "";
  if (latest) {
    statsHTML = `
    <div class="weight-stat-row">
      <div class="weight-stat-card">
        <div class="weight-stat-label">Dernier poids</div>
        <div class="weight-stat-value">${latest.weight} kg</div>
      </div>
      <div class="weight-stat-card">
        <div class="weight-stat-label">Variation</div>
        <div class="weight-stat-value">${diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff} kg`}</div>
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
      : sorted
          .map(
            (e) => `
      <div class="weight-entry-row">
        <div class="weight-entry-date">${formatDateFR(e.date)}</div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="weight-entry-value">${e.weight} kg</div>
          <button class="icon-btn" data-delete-weight="${e.id}">${ICONS.trash}</button>
        </div>
      </div>`
          )
          .join("");

  return `
    ${statsHTML}
    ${chartHTML}
    <div class="field-row">
      <div class="field"><label>Date</label><input type="date" id="w-date" value="${todayISO()}"></div>
      <div class="field"><label>Poids (kg)</label><input type="number" inputmode="decimal" id="w-value" placeholder="72.5"></div>
    </div>
    <button class="save-btn" id="save-weight-btn" style="margin-bottom:20px;">${ICONS.check} Enregistrer le poids</button>
    ${listHTML}
  `;
}

function renderWeightContent() {
  document.getElementById("content").innerHTML = weightTabHTML();
  attachWeightListeners();
}

function attachWeightListeners() {
  document.getElementById("save-weight-btn").addEventListener("click", () => {
    const dateEl = document.getElementById("w-date");
    const valueEl = document.getElementById("w-value");
    const val = parseFloat(valueEl.value);
    if (valueEl.value === "" || isNaN(val)) return;
    weights = weights.filter((e) => e.date !== dateEl.value);
    weights.push({ id: uid(), date: dateEl.value, weight: val });
    saveJSON(KEYS.weights, weights);
    renderWeightContent();
  });
  document.querySelectorAll("[data-delete-weight]").forEach((btn) => {
    btn.addEventListener("click", () => {
      weights = weights.filter((e) => e.id !== btn.dataset.deleteWeight);
      saveJSON(KEYS.weights, weights);
      renderWeightContent();
    });
  });
}
