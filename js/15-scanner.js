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

  actions.innerHTML = `<div class="empty-state">Chargement de l'outil de lecture...</div>`;
  try {
    await loadTesseractScript();
  } catch (e) {
    scannerShowAnalyzeError("Impossible de charger l'outil de lecture. Vérifie ta connexion internet et réessaie.");
    return;
  }

  actions.innerHTML = `<div class="empty-state">Lecture de l'image en cours...<br>Ça peut prendre 10 à 30 secondes.</div>`;
  try {
    const result = await Tesseract.recognize(canvas, "eng");
    const text = (result && result.data && result.data.text) || "";
    // On cherche chaque nombre immédiatement suivi de "kg" (insensible à la
    // casse et aux espaces) : c'est ce motif qui distingue la colonne kg de
    // la colonne lbs sur l'étiquette, sans avoir besoin de recadrer la photo.
    scannerExtractedWeights = [...text.matchAll(/(\d{1,3})\s*k\s*g/gi)].map((m) => parseInt(m[1], 10));
    renderScannerExtractedList();
  } catch (e) {
    scannerShowAnalyzeError("La lecture a échoué. Réessaie avec une photo plus nette et bien cadrée sur l'étiquette.");
  }
}

function scannerShowAnalyzeError(message) {
  const actions = document.getElementById("scanner-actions");
  actions.innerHTML = `
    <div class="empty-state">${message}</div>
    <button class="backup-btn" id="scanner-retake-btn" style="margin-top:10px;">${ICONS.reset} Reprendre une photo</button>
  `;
  document.getElementById("scanner-retake-btn").addEventListener("click", renderScannerContent);
}

function renderScannerExtractedList() {
  const actions = document.getElementById("scanner-actions");
  const chips = scannerExtractedWeights.length
    ? scannerExtractedWeights
        .map((w, i) => `<span class="weight-chip removable">${w}kg <button type="button" data-remove-extracted="${i}">${ICONS.x}</button></span>`)
        .join("")
    : `<span style="color:var(--text-dim); font-size:13px;">Aucune valeur détectée — ajoute-les à la main ci-dessous, ou reprends une photo plus nette.</span>`;

  actions.innerHTML = `
    <div class="weight-chip-label">Poids détectés (relis et corrige si besoin)</div>
    <div class="weight-chip-row" id="scanner-extracted-row">${chips}</div>
    <div class="field-row" style="margin-top:8px;">
      <input type="number" inputmode="decimal" id="scanner-add-weight" placeholder="Ajouter une valeur">
      <button type="button" class="add-exercise-btn" id="scanner-add-weight-btn" style="margin:0;">${ICONS.plus} Ajouter</button>
    </div>
    <button class="save-btn" id="scanner-copy-btn" style="margin-top:14px;">${ICONS.check} Copier la liste</button>
    <button class="backup-btn" id="scanner-retake-btn" style="margin-top:10px;">${ICONS.reset} Reprendre une photo</button>
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
