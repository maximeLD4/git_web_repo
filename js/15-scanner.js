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
    if (scannerReturnTarget === "gym-settings-weights") {
      scannerReturnTarget = null;
      currentApp = "settings-gym";
      render();
    } else {
      goHome();
    }
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
      <div id="scanner-actions" style="margin-top:14px; display:flex; flex-direction:column; gap:10px;">
        <button class="save-btn" id="scanner-start-btn">${ICONS.camera} Activer la caméra</button>
        <button class="backup-btn" id="scanner-gallery-btn">${ICONS.down} Choisir une photo depuis la galerie</button>
        <input type="file" accept="image/*" id="scanner-file-input" style="display:none;">
      </div>
    </div>
  `;
  attachScannerListeners();
}

function attachScannerListeners() {
  const startBtn = document.getElementById("scanner-start-btn");
  if (startBtn) startBtn.addEventListener("click", startScannerCamera);
  const galleryBtn = document.getElementById("scanner-gallery-btn");
  const fileInput = document.getElementById("scanner-file-input");
  if (galleryBtn && fileInput) {
    galleryBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => handleScannerGalleryFile(e.target.files[0]));
  }
}

function handleScannerGalleryFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const canvas = document.getElementById("scanner-canvas");
    const preview = document.getElementById("scanner-preview");
    const video = document.getElementById("scanner-video");
    const actions = document.getElementById("scanner-actions");

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    preview.src = canvas.toDataURL("image/jpeg", 0.85);
    preview.style.display = "block";
    video.style.display = "none";
    stopScannerCamera();
    URL.revokeObjectURL(url);

    actions.innerHTML = `
      <button class="save-btn" id="scanner-analyze-btn">${ICONS.check} Extraire les poids (kg)</button>
      <button class="backup-btn" id="scanner-retake-btn" style="margin-top:10px;">${ICONS.reset} Choisir une autre photo</button>
    `;
    document.getElementById("scanner-retake-btn").addEventListener("click", renderScannerContent);
    document.getElementById("scanner-analyze-btn").addEventListener("click", analyzeScannerPhoto);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    showAlert("Impossible d'ouvrir cette image. Si c'est une photo HEIC exportée telle quelle depuis l'iPhone, essaie une capture d'écran ou une photo enregistrée en JPEG à la place.");
  };
  img.src = url;
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

  // Si le flux vidéo n'a pas encore de dimensions, la capture donnerait un
  // canvas vide (donc rien à lire) : mieux vaut le signaler clairement que
  // de laisser échouer silencieusement l'analyse plus tard.
  if (!video.videoWidth || !video.videoHeight) {
    showAlert("La caméra n'est pas encore tout à fait prête. Patiente une seconde puis retente.");
    return;
  }

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
  const updateProgress = (msg) => {
    if (progressEl) progressEl.textContent = msg;
  };
  // Les photos de téléphone en pleine résolution (souvent 3000-4000px de
  // large) sont inutilement lourdes pour de l'OCR et peuvent ralentir ou
  // faire échouer la lecture : on réduit avant analyse.
  const resizedCanvas = scannerResizeCanvas(canvas, 1600);

  let settled = false;
  // Deux passes = plus lent qu'une seule lecture : on laisse un peu plus de
  // marge qu'avant (90s au lieu de 45s) avant de considérer que ça bloque.
  const timeoutId = setTimeout(() => {
    if (settled) return;
    settled = true;
    scannerShowAnalyzeError("La lecture prend trop de temps (plus de 90 secondes) et a été interrompue. Réessaie avec une photo plus nette, prise de plus près de l'étiquette.", null);
  }, 90000);

  let worker = null;
  try {
    // On passe par un worker explicite (plutôt que le raccourci
    // Tesseract.recognize()) pour être sûr que la restriction de caractères
    // ci-dessous est bien prise en compte, et pour pouvoir le réutiliser sur
    // plusieurs lectures successives sans le recréer à chaque fois.
    worker = await Tesseract.createWorker("eng", 1, {
      logger: (m) => {
        if (!progressEl || settled) return;
        const pct = typeof m.progress === "number" ? ` (${Math.round(m.progress * 100)}%)` : "";
        updateProgress("Étape 1/2 — détection des zones de texte : " + (m.status || "...") + pct);
      },
    });
    // Restreint les caractères possibles à ceux qui peuvent réellement
    // apparaître sur une étiquette de poids (chiffres + kg/lbs). Sans ça,
    // Tesseract essaie de faire correspondre ce qu'il voit à n'importe quel
    // mot anglais plausible, ce qui produit du texte incohérent sur une
    // image qui n'a justement rien à voir avec du texte normal.
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789kgKGlbsLBS ",
    });

    // ---- Étape 1 : passe grossière sur l'image entière, pour repérer OÙ se
    // trouvent les zones de texte (lignes), sans se fier à leur contenu exact
    // à ce stade — juste leur position.
    const detectResult = await worker.recognize(resizedCanvas);
    const allLines = (detectResult.data && detectResult.data.lines) || [];
    // On ne garde que les lignes qui contenaient déjà au moins un chiffre
    // lors de cette passe grossière : pas la peine de recadrer et relire en
    // détail une zone qui n'a manifestement rien à voir avec un poids.
    const candidateLines = allLines.filter((l) => l.text && /\d/.test(l.text) && l.bbox);

    // ---- Étape 2 : pour chaque ligne candidate, recadrage + agrandissement
    // + nouvelle lecture, isolée du reste de l'image (donc bien moins de
    // bruit visuel autour, et une résolution effective plus élevée).
    let combinedText = "";
    const maxLines = Math.min(candidateLines.length, 40);
    for (let i = 0; i < maxLines; i++) {
      if (settled) return;
      updateProgress(`Étape 2/2 — lecture précise (${i + 1}/${maxLines})...`);
      const cropCanvas = scannerCropAndUpscale(resizedCanvas, candidateLines[i].bbox, 2.5);
      try {
        const lineResult = await worker.recognize(cropCanvas);
        combinedText += ((lineResult.data && lineResult.data.text) || "") + "\n";
      } catch (e) {
        // Une ligne isolée qui échoue ne doit pas faire échouer tout le
        // reste : on l'ignore simplement et on continue avec les suivantes.
      }
    }

    await worker.terminate();
    worker = null;

    if (settled) return;
    settled = true;
    clearTimeout(timeoutId);

    // Si aucune ligne candidate n'a été trouvée en étape 1 (photo très
    // bruitée, ou aucun chiffre lu du tout), on retombe sur le texte brut de
    // la passe grossière plutôt que de n'avoir absolument rien à montrer.
    const finalText = combinedText.trim() ? combinedText : (detectResult.data && detectResult.data.text) || "";
    scannerExtractedWeights = scannerExtractWeightsFromText(finalText);
    renderScannerExtractedList(finalText);
  } catch (e) {
    if (worker) worker.terminate().catch(() => {});
    if (settled) return;
    settled = true;
    clearTimeout(timeoutId);
    scannerShowAnalyzeError("La lecture a échoué.", e);
  }
}

function scannerLbsToKg(lbs) {
  // 1 lb = 0.45359237 kg. Arrondi standard (pas de troncature) : c'est ce qui
  // correspond réellement aux étiquettes de machines de musculation (ex.
  // 30 lbs -> 14 kg réel, alors qu'une troncature donnerait 13, faux).
  return Math.round(lbs * 0.45359237);
}

function scannerInferKgFromPair(a, b) {
  // Retourne la valeur en kg si (a, b) forment une paire lbs/kg plausible
  // (l'une des deux convertie correspond à l'autre, à 1kg près), sinon null.
  // La tolérance de ±1kg n'est pas arbitraire : sur une vraie étiquette de
  // machine, la conversion imprimée par le fabricant ne suit pas toujours
  // exactement 1 lb = 0.453592 kg au kg près (ex. 140 lbs est étiqueté
  // 63 kg alors que la conversion précise arrondirait à 64) — sans cette
  // tolérance, on rejetterait à tort de vraies paires légitimes.
  // On exige que la valeur "lbs" soit strictement supérieure à la valeur
  // "kg", pour éviter les faux positifs entre deux petits nombres proches.
  if (a > b && Math.abs(scannerLbsToKg(a) - b) <= 1) return b;
  if (b > a && Math.abs(scannerLbsToKg(b) - a) <= 1) return a;
  return null;
}

function scannerExtractWeightsFromText(text) {
  const weights = new Set();
  const lines = text.split("\n");
  for (const line of lines) {
    // Niveau 1 : motif explicite "<nombre>kg" — le plus fiable, on lui fait
    // confiance directement quand l'OCR a bien lu l'unité.
    const explicitMatches = [...line.matchAll(/(\d{1,3})\s*k\s*g/gi)];
    if (explicitMatches.length > 0) {
      explicitMatches.forEach((m) => weights.add(parseInt(m[1], 10)));
      continue;
    }
    // Niveau 2 (repli) : l'OCR a lu deux nombres sur la ligne mais pas
    // l'unité ("kg"/"lbs") — si l'un converti en kg correspond exactement à
    // l'autre, c'est très probablement une paire lbs/kg dont on peut déduire
    // le poids en kg sans avoir eu besoin de lire le mot "kg" lui-même.
    const numbers = [...line.matchAll(/\d+/g)].map((m) => parseInt(m[0], 10));
    if (numbers.length === 2) {
      const inferred = scannerInferKgFromPair(numbers[0], numbers[1]);
      if (inferred !== null) weights.add(inferred);
    }
  }
  return Array.from(weights).sort((a, b) => a - b);
}

function scannerCropAndUpscale(sourceCanvas, bbox, scale) {
  const pad = 4;
  const x = Math.max(0, Math.floor(bbox.x0 - pad));
  const y = Math.max(0, Math.floor(bbox.y0 - pad));
  const w = Math.min(sourceCanvas.width - x, Math.ceil(bbox.x1 - bbox.x0) + pad * 2);
  const h = Math.min(sourceCanvas.height - y, Math.ceil(bbox.y1 - bbox.y0) + pad * 2);
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(w * scale));
  out.height = Math.max(1, Math.round(h * scale));
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(sourceCanvas, x, y, Math.max(1, w), Math.max(1, h), 0, 0, out.width, out.height);
  return out;
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

  const useButtonHTML =
    scannerReturnTarget === "gym-settings-weights"
      ? `<button class="save-btn" id="scanner-use-btn" style="margin-top:14px;" ${scannerExtractedWeights.length === 0 ? "disabled" : ""}>${ICONS.check} Utiliser ces poids pour l'exercice</button>`
      : "";

  actions.innerHTML = `
    <div class="weight-chip-label">Poids détectés (relis et corrige si besoin)</div>
    <div class="weight-chip-row" id="scanner-extracted-row">${chips}</div>
    <div class="field-row" style="margin-top:8px;">
      <input type="number" inputmode="decimal" id="scanner-add-weight" placeholder="Ajouter une valeur">
      <button type="button" class="add-exercise-btn" id="scanner-add-weight-btn" style="margin:0;">${ICONS.plus} Ajouter</button>
    </div>
    ${useButtonHTML}
    <button class="${useButtonHTML ? "backup-btn" : "save-btn"}" id="scanner-copy-btn" style="margin-top:10px;">${ICONS.check} Copier la liste</button>
    <button class="backup-btn" id="scanner-retake-btn" style="margin-top:10px;">${ICONS.reset} Reprendre une photo</button>
    ${rawTextBlock}
  `;

  if (useButtonHTML) {
    document.getElementById("scanner-use-btn").addEventListener("click", () => {
      // On fusionne avec les poids déjà présents dans le formulaire plutôt
      // que de les écraser, au cas où certains auraient déjà été ajoutés à
      // la main avant de lancer le scanner.
      const merged = new Set([...gymSettingsFormDraft.baseWeights, ...scannerExtractedWeights]);
      gymSettingsFormDraft.baseWeights = Array.from(merged).sort((a, b) => a - b);
      scannerReturnTarget = null;
      stopScannerCamera();
      currentApp = "settings-gym";
      render();
    });
  }

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
