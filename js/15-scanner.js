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

  actions.innerHTML = `<button class="backup-btn" id="scanner-retake-btn">${ICONS.reset} Reprendre une photo</button>`;
  document.getElementById("scanner-retake-btn").addEventListener("click", renderScannerContent);

  const note = document.createElement("div");
  note.className = "empty-state";
  note.style.marginTop = "10px";
  note.textContent = "Photo capturée, non enregistrée. La reconnaissance automatique de la machine arrivera dans une prochaine étape.";
  document.querySelector(".scanner-wrap").appendChild(note);
}

function stopScannerCamera() {
  if (scannerStream) {
    scannerStream.getTracks().forEach((t) => t.stop());
    scannerStream = null;
  }
}
