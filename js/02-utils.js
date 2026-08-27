
function formatRelativeTime(iso) {
  if (!iso) return "jamais";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  const w = Math.floor(d / 7);
  if (w < 5) return `il y a ${w} sem.`;
  const mo = Math.floor(d / 30);
  return `il y a ${mo} mois`;
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}
let localStorageWarned = false;
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (!localStorageWarned) {
      console.error("Sauvegarde locale indisponible dans ce contexte (sans incidence : les données restent en mémoire et sont synchronisées via Scriptable).", e);
      localStorageWarned = true;
    }
  }
  // Simple drapeau consulté périodiquement par Scriptable (voir GymLog-Scriptable.js).
  // Ne fait rien de risqué et n'a aucun effet quand l'app tourne dans Safari classique.
  window.__scriptableDirty = true;
  // Synchro cloud (Firebase) débounced, par domaine — définie dans 04-auth.js.
  // On passe la clé pour ne pousser vers Firebase que le "tiroir" réellement
  // modifié (séances d'un sport, poids, exercices configurés...), pas tout
  // en bloc à chaque sauvegarde.
  if (typeof scheduleFirebaseSync === "function") scheduleFirebaseSync(key);
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayISO = () => new Date().toISOString().slice(0, 10);

function attachArmedConfirmButton(btn, defaultHTML, confirmHTML, onConfirm) {
  let armed = false;
  let timer = null;
  btn.innerHTML = defaultHTML;
  btn.addEventListener("click", () => {
    if (!armed) {
      armed = true;
      btn.classList.add("armed-danger");
      btn.innerHTML = confirmHTML;
      timer = setTimeout(() => {
        armed = false;
        btn.classList.remove("armed-danger");
        btn.innerHTML = defaultHTML;
      }, 2800);
    } else {
      clearTimeout(timer);
      onConfirm();
    }
  });
}

function showConfirm(message, onConfirm, opts = {}) {
  const root = document.getElementById("custom-modal-root");
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-box">
        <div class="modal-message">${message}</div>
        <div class="modal-actions">
          <button type="button" class="modal-btn modal-cancel">Annuler</button>
          <button type="button" class="modal-btn modal-confirm ${opts.danger ? "danger" : ""}">${opts.confirmLabel || "Confirmer"}</button>
        </div>
      </div>
    </div>`;
  const close = () => {
    root.innerHTML = "";
  };
  root.querySelector(".modal-cancel").addEventListener("click", () => {
    close();
    if (opts.onCancel) opts.onCancel();
  });
  root.querySelector(".modal-confirm").addEventListener("click", () => {
    close();
    onConfirm();
  });
}

function showAlert(message) {
  const root = document.getElementById("custom-modal-root");
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-box">
        <div class="modal-message">${message}</div>
        <div class="modal-actions">
          <button type="button" class="modal-btn modal-confirm">OK</button>
        </div>
      </div>
    </div>`;
  root.querySelector(".modal-confirm").addEventListener("click", () => {
    root.innerHTML = "";
  });
}
function formatDateFR(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
function formatDateShortFR(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function emptyExercise() {
  const firstConfig = gymExerciseConfigs.find((c) => (c.category || "pecs") === "pecs") || gymExerciseConfigs[0] || null;
  const baseWeights = firstConfig ? computeBaseWeightsOnly(firstConfig) : [];
  return {
    id: uid(),
    name: firstConfig ? firstConfig.name : "",
    exType: "muscu",
    category: firstConfig ? firstConfig.category || "pecs" : "pecs",
    sets: [{ id: uid(), weight: baseWeights.length ? baseWeights[0] : "", reps: 10 }],
  };
}
function emptyBlock() {
  return { id: uid(), label: "", mode: "duration", duration: "", distance: "", pace: "", reps: "", repDistance: "", repDuration: "", recovery: "" };
}
function formatDurationMin(totalMin) {
  const m = Math.round(totalMin);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}min` : `${h}h`;
}
function getMondayISO(dateISO) {
  const d = new Date(dateISO + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/* ---------- pace/duration/distance triangle ---------- */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/* ---------- swim: data model & calculations ---------- */
function emptySwimBlock() {
  return { id: uid(), label: "", mode: "both", duration: "", distance: "", pace: "", poolLength: "", lengths: "", stroke: "" };
}

/* ---------- bike: data model & calculations ---------- */
function emptyBikeBlock() {
  return { id: uid(), label: "", mode: "both", duration: "", distance: "", speed: "" };
}

function findExerciseConfig(name) {
  const norm = (name || "").trim().toLowerCase();
  if (!norm) return null;
  return gymExerciseConfigs.find((c) => c.name.trim().toLowerCase() === norm) || null;
}

function computePossibleWeights(config) {
  if (!config || !config.baseWeights || config.baseWeights.length === 0) return [];
  // L'incrément représente un poids fixe qu'on peut ajouter manuellement sur
  // la machine (ex. +5kg) — pas une plage continue. Sur chaque palier, on a
  // donc exactement deux choix : le palier seul, ou le palier + cet
  // incrément fixe (jamais +1, +2, +3... entre les deux).
  const inc = config.maxIncrement || 0;
  const set = new Set();
  config.baseWeights.forEach((b) => {
    set.add(Math.round(b * 100) / 100);
    if (inc > 0) set.add(Math.round((b + inc) * 100) / 100);
  });
  return Array.from(set).sort((a, b) => a - b);
}

function computeBaseWeightsOnly(config) {
  if (!config || !config.baseWeights) return [];
  return [...new Set(config.baseWeights.map((b) => Math.round(b * 100) / 100))].sort((a, b) => a - b);
}

function computeIncrementedWeightsOnly(config) {
  if (!config || !config.baseWeights || !config.maxIncrement) return [];
  const inc = config.maxIncrement;
  return [...new Set(config.baseWeights.map((b) => Math.round((b + inc) * 100) / 100))].sort((a, b) => a - b);
}

/* ---------- run app: rendering ---------- */
function splitPaceForDisplay(paceStr) {
  const val = parseFloat(paceStr);
  if (!paceStr || isNaN(val) || val <= 0) return { min: "", sec: "" };
  let min = Math.floor(val);
  let sec = Math.round((val - min) * 60);
  if (sec === 60) { min += 1; sec = 0; }
  return { min: String(min), sec: String(sec) };
}
function formatPaceDisplay(paceStr) {
  const val = parseFloat(paceStr);
  if (!paceStr || isNaN(val) || val <= 0) return null;
  const { min, sec } = splitPaceForDisplay(paceStr);
  return `${min}'${String(sec).padStart(2, "0")}"/km`;
}

function startDragItem(e, item, container, onDrop) {
  e.preventDefault();
  const pointerId = e.pointerId;
  item.setPointerCapture(pointerId);
  item.classList.add("dragging");
  let startY = e.clientY;

  function onMove(ev) {
    const deltaY = ev.clientY - startY;
    item.style.transform = `translateY(${deltaY}px)`;

    const children = Array.from(container.children);
    const dragIndexCurrent = children.indexOf(item);
    const dragRect = item.getBoundingClientRect();
    const dragCenter = dragRect.top + dragRect.height / 2;

    for (const sib of children) {
      if (sib === item) continue;
      const sibRect = sib.getBoundingClientRect();
      const sibCenter = sibRect.top + sibRect.height / 2;
      const sibIndex = children.indexOf(sib);
      if (dragCenter > sibCenter && dragIndexCurrent < sibIndex) {
        container.insertBefore(item, sib.nextSibling);
        startY = ev.clientY;
        item.style.transform = "translateY(0px)";
        break;
      } else if (dragCenter < sibCenter && dragIndexCurrent > sibIndex) {
        container.insertBefore(item, sib);
        startY = ev.clientY;
        item.style.transform = "translateY(0px)";
        break;
      }
    }
  }

  function onUp() {
    try { item.releasePointerCapture(pointerId); } catch (e) {}
    item.classList.remove("dragging");
    item.style.transform = "";
    item.removeEventListener("pointermove", onMove);
    item.removeEventListener("pointerup", onUp);
    item.removeEventListener("pointercancel", onUp);
    onDrop();
  }

  item.addEventListener("pointermove", onMove);
  item.addEventListener("pointerup", onUp);
  item.addEventListener("pointercancel", onUp);
}
