/* ---------- scanner (prototype) : accès caméra, capture temporaire, aucune persistance ---------- */
function renderScannerApp() {
  app.className = "theme-scanner";
  app.innerHTML = `
    <div class="header">
      <button type="button" class="back-btn" data-go-home>${ICONS.back}</button>
      <div class="header-icon-only">${ICONS.camera}</div>
      <div class="header-sub">Photo d'une machine (prototype)</div>
    </div>
    <div class="content" id="content" style="padding-bottom: 24px;"></div>
  `;
  document.querySelector("[data-go-home]").addEventListener("click", () => {
    stopScannerCamera();
    goHome();
  });
  renderScannerContent();
}

function renderScannerContent() {
  scannerExtractedWeights = [];
  scannerLastRawText = "";
  document.getElementById("content").innerHTML = `
    <div class="scanner-wrap">
      <div id="scanner-status" class="empty-state">
        La caméra ne sert qu'à prendre une photo temporaire pour analyse — rien n'est enregistré.<br><br>
        Sur Safari, il faudra autoriser l'accès à la caméra à la première utilisation.
      </div>
      <video id="scanner-video" playsinline autoplay muted style="display:none; width:100%; border-radius:16px; background:#000;"></video>
      <canvas id="scanner-canvas" style="display:none;"></canvas>
      <img id="scanner-preview" style="display:none; width:100%; border-radius:16px;" />
      <div id="scanner-actions" style="margin-top:14px;">
        <button class="save-btn" id="scanner-start-btn">${ICONS.camera} Activer la caméra</button>
      </div>
    </div>
  `;
  attachScannerListeners();
}

function attachScannerListeners() {
  const startBtn = document.getElementById("scanner-start-btn");
  if (startBtn) startBtn.addEventListener("click", startScannerCamera);
}

async function startScannerCamera() {
  const statusEl = document.getElementById("scanner-status");
  const video = document.getElementById("scanner-video");
  const actions = document.getElementById("scanner-actions");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusEl.innerHTML =
      "La caméra n'est pas accessible dans ce contexte.<br><br>" +
      "Les navigateurs exigent une connexion sécurisée (HTTPS) pour autoriser la caméra : " +
      "ouvre l'app via ton adresse GitLab Pages dans Safari plutôt que via Scriptable, qui charge le fichier en local.";
    return;
  }

  statusEl.textContent = "Demande d'autorisation en cours...";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    scannerStream = stream;
    video.srcObject = stream;
    video.style.display = "block";
    statusEl.style.display = "none";
    actions.innerHTML = `<button class="save-btn" id="scanner-capture-btn">${ICONS.check} Prendre la photo</button>`;
    document.getElementById("scanner-capture-btn").addEventListener("click", captureScannerPhoto);
  } catch (e) {
    statusEl.style.display = "";
    statusEl.innerHTML =
      "Accès à la caméra refusé ou indisponible.<br><br>" +
      "Vérifie les autorisations caméra pour ce site dans les réglages de ton navigateur, puis réessaie.";
  }
}

function captureScannerPhoto() {
  const video = document.getElementById("scanner-video");
  const canvas = document.getElementById("scanner-canvas");
  const preview = document.getElementById("scanner-preview");
  const actions = document.getElementById("scanner-actions");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  preview.src = canvas.toDataURL("image/jpeg", 0.85);
  preview.style.display = "block";
  video.style.display = "none";
  stopScannerCamera();

  actions.innerHTML = `
    <button class="save-btn" id="scanner-analyze-btn">${ICONS.check} Extraire les poids (kg)</button>
    <button class="backup-btn" id="scanner-retake-btn" style="margin-top:10px;">${ICONS.reset} Reprendre une photo</button>
  `;
  document.getElementById("scanner-retake-btn").addEventListener("click", renderScannerContent);
  document.getElementById("scanner-analyze-btn").addEventListener("click", analyzeScannerPhoto);
}

function stopScannerCamera() {
  if (scannerStream) {
    scannerStream.getTracks().forEach((t) => t.stop());
    scannerStream = null;
  }
}

/* ---------- Lecture des poids (OCR embarqué, via Tesseract.js) ---------- */
// Chargé à la demande (pas dans index.html) : c'est une bibliothèque assez
// lourde, pas la peine d'alourdir le chargement initial de toute l'app pour
// une fonctionnalité utilisée occasionnellement.
let tesseractLoadPromise = null;
function loadTesseractScript() {
  if (window.Tesseract) return Promise.resolve();
  if (tesseractLoadPromise) return tesseractLoadPromise;
  tesseractLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger la bibliothèque de lecture de texte."));
    document.head.appendChild(script);
  });
  return tesseractLoadPromise;
}

async function analyzeScannerPhoto() {
  const canvas = document.getElementById("scanner-canvas");
  const actions = document.getElementById("scanner-actions");

  actions.innerHTML = `<div class="empty-state" id="scanner-progress">Chargement de l'outil de lecture...</div>`;
  try {
    await loadTesseractScript();
  } catch (e) {
    scannerShowAnalyzeError("Impossible de charger l'outil de lecture. Vérifie ta connexion internet et réessaie.", e);
    return;
  }

  if (!window.Tesseract) {
    scannerShowAnalyzeError("L'outil de lecture ne s'est pas initialisé correctement (Tesseract introuvable après chargement du script).", null);
    return;
  }

  const progressEl = document.getElementById("scanner-progress");
  // Les photos de téléphone en pleine résolution (souvent 3000-4000px de
  // large) sont inutilement lourdes pour de l'OCR et peuvent ralentir ou
  // faire échouer la lecture : on réduit avant analyse.
  const resizedCanvas = scannerResizeCanvas(canvas, 1600);

  let settled = false;
  const timeoutId = setTimeout(() => {
    if (settled) return;
    settled = true;
    scannerShowAnalyzeError("La lecture prend trop de temps (plus de 45 secondes) et a été interrompue. Réessaie avec une photo plus nette, prise de plus près de l'étiquette.", null);
  }, 45000);

  try {
    const result = await Tesseract.recognize(resizedCanvas, "eng", {
      logger: (m) => {
        if (!progressEl || settled) return;
        const pct = typeof m.progress === "number" ? ` (${Math.round(m.progress * 100)}%)` : "";
        progressEl.textContent = "Lecture de l'image en cours : " + (m.status || "...") + pct;
      },
    });
    if (settled) return;
    settled = true;
    clearTimeout(timeoutId);

    const text = (result && result.data && result.data.text) || "";
    scannerExtractedWeights = [...text.matchAll(/(\d{1,3})\s*k\s*g/gi)].map((m) => parseInt(m[1], 10));
    renderScannerExtractedList(text);
  } catch (e) {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutId);
    scannerShowAnalyzeError("La lecture a échoué.", e);
  }
}

function scannerResizeCanvas(sourceCanvas, maxSide) {
  const { width, height } = sourceCanvas;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  if (scale >= 1) return sourceCanvas;
  const out = document.createElement("canvas");
  out.width = Math.round(width * scale);
  out.height = Math.round(height * scale);
  out.getContext("2d").drawImage(sourceCanvas, 0, 0, out.width, out.height);
  return out;
}

function scannerShowAnalyzeError(message, err) {
  const actions = document.getElementById("scanner-actions");
  let detail = "";
  if (err) {
    const raw = (err && err.message) || String(err);
    detail = `<div style="font-size:11px; color:var(--text-dim); margin-top:8px; word-break:break-word; text-align:left;">Détail technique (utile si tu me le communiques) :<br>${raw.replace(/</g, "&lt;")}</div>`;
  }
  actions.innerHTML = `
    <div class="empty-state">${message}${detail}</div>
    <button class="backup-btn" id="scanner-retake-btn" style="margin-top:10px;">${ICONS.reset} Reprendre une photo</button>
  `;
  document.getElementById("scanner-retake-btn").addEventListener("click", renderScannerContent);
}

let scannerLastRawText = "";

function renderScannerExtractedList(rawText) {
  if (typeof rawText === "string") scannerLastRawText = rawText;
  const actions = document.getElementById("scanner-actions");
  const chips = scannerExtractedWeights.length
    ? scannerExtractedWeights
        .map((w, i) => `<span class="weight-chip removable">${w}kg <button type="button" data-remove-extracted="${i}">${ICONS.x}</button></span>`)
        .join("")
    : `<span style="color:var(--text-dim); font-size:13px;">Aucune valeur détectée — ajoute-les à la main ci-dessous, ou reprends une photo plus nette.</span>`;

  const rawTextBlock = scannerLastRawText.trim()
    ? `<details style="margin-top:12px;">
         <summary style="font-size:12px; color:var(--text-dim); cursor:pointer;">Voir le texte brut lu par l'OCR (diagnostic)</summary>
         <div style="font-size:11px; color:var(--text-dim); background:var(--surface-2); border-radius:10px; padding:10px; margin-top:6px; white-space:pre-wrap; word-break:break-word; max-height:160px; overflow-y:auto;">${scannerLastRawText.replace(/</g, "&lt;")}</div>
       </details>`
    : `<div style="font-size:12px; color:var(--text-dim); margin-top:12px;">L'OCR n'a lu <b>aucun texte</b> dans cette photo — c'est probablement le signe d'un problème de chargement de l'outil plutôt que d'une photo peu nette.</div>`;

  actions.innerHTML = `
    <div class="weight-chip-label">Poids détectés (relis et corrige si besoin)</div>
    <div class="weight-chip-row" id="scanner-extracted-row">${chips}</div>
    <div class="field-row" style="margin-top:8px;">
      <input type="number" inputmode="decimal" id="scanner-add-weight" placeholder="Ajouter une valeur">
      <button type="button" class="add-exercise-btn" id="scanner-add-weight-btn" style="margin:0;">${ICONS.plus} Ajouter</button>
    </div>
    <button class="save-btn" id="scanner-copy-btn" style="margin-top:14px;">${ICONS.check} Copier la liste</button>
    <button class="backup-btn" id="scanner-retake-btn" style="margin-top:10px;">${ICONS.reset} Reprendre une photo</button>
    ${rawTextBlock}
  `;

  document.getElementById("scanner-retake-btn").addEventListener("click", renderScannerContent);
  document.querySelectorAll("[data-remove-extracted]").forEach((btn) => {
    btn.addEventListener("click", () => {
      scannerExtractedWeights.splice(parseInt(btn.dataset.removeExtracted, 10), 1);
      renderScannerExtractedList();
    });
  });
  document.getElementById("scanner-add-weight-btn").addEventListener("click", () => {
    const input = document.getElementById("scanner-add-weight");
    const val = parseFloat(input.value);
    if (!isNaN(val)) {
      scannerExtractedWeights.push(val);
      scannerExtractedWeights.sort((a, b) => a - b);
      renderScannerExtractedList();
    }
  });
  document.getElementById("scanner-copy-btn").addEventListener("click", async () => {
    const text = scannerExtractedWeights.join(", ");
    try {
      await navigator.clipboard.writeText(text);
      showAlert("Copié dans le presse-papier :<br>" + text);
    } catch (e) {
      showAlert("Impossible de copier automatiquement. Valeurs :<br>" + text);
    }
  });
}
