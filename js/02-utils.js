
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

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ---------- Suivi d'écran (scroll auto) : partagé par tous les sports ----------
   Tous les modules (Salle de sport, Course, Natation, Vélo) utilisent les
   mêmes identifiants (#content, .tabbar, #log-actions-bar) puisqu'un seul
   écran est monté à la fois — ces fonctions génériques leur servent à tous,
   pas besoin de les dupliquer par sport. */

function renderContentPreservingScroll(renderFn, afterRenderScroll) {
  const contentEl = document.getElementById("content");
  const scrollBefore = contentEl ? contentEl.scrollTop : 0;
  renderFn();
  if (contentEl) {
    // Remplacer le contenu (innerHTML) peut faire réajuster instantanément la
    // position de scroll par le navigateur lui-même si la hauteur change
    // (ex. des séries/blocs qui disparaissent en changeant de mode) — AVANT
    // même que notre propre réalignement ne s'exécute. On restaure d'abord
    // la position exacte d'avant, sans animation, pour annuler ce saut natif
    // invisible-mais-brutal, puis on applique le scroll réellement voulu
    // par-dessus, lui, animé.
    contentEl.scrollTop = scrollBefore;
  }
  if (afterRenderScroll) {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(afterRenderScroll);
    else afterRenderScroll();
  }
}

function scrollCardTopIntoView(card, topMargin = 16) {
  if (!card) return;
  const contentEl = document.getElementById("content");
  if (!contentEl || typeof contentEl.getBoundingClientRect !== "function" || typeof contentEl.scrollBy !== "function") return;
  const cardRect = card.getBoundingClientRect();
  const contentRect = contentEl.getBoundingClientRect();
  // Aligne systématiquement le haut de la carte avec le haut de la zone
  // visible (à une petite marge près) — pas seulement si besoin : chaque
  // sélection (type, catégorie, exercice/bloc) révèle du contenu juste en
  // dessous, autant garder un repère stable en haut à chaque fois.
  const delta = cardRect.top - (contentRect.top + topMargin);
  // En dessous d'un petit seuil, on ne bouge rien : sans ça, un simple
  // écart d'arrondi de quelques pixels déclenchait une animation de
  // scroll perceptible alors qu'on était déjà pile au bon endroit.
  if (Math.abs(delta) < 6) return;
  contentEl.scrollBy({ top: delta, behavior: "smooth" });
}

function scrollCardBottomIntoView(card) {
  if (!card) return;
  const contentEl = document.getElementById("content");
  const tabbarEl = document.querySelector(".tabbar");
  const actionsBarEl = document.getElementById("log-actions-bar");
  if (!contentEl || typeof contentEl.getBoundingClientRect !== "function" || typeof contentEl.scrollBy !== "function") return;
  const cardRect = card.getBoundingClientRect();
  const contentRect = contentEl.getBoundingClientRect();
  // La marge à réserver correspond à la vraie hauteur mesurée de la barre
  // d'onglets + la barre d'actions fixe (qui recouvrent visuellement le
  // bas du conteneur) — une valeur fixe devinée était trop petite sur les
  // appareils avec une zone de sécurité en bas plus grande, ce qui faisait
  // s'arrêter le scroll trop tôt.
  const tabbarHeight = tabbarEl ? tabbarEl.offsetHeight : 0;
  const actionsBarHeight = actionsBarEl && actionsBarEl.style.display !== "none" ? actionsBarEl.offsetHeight : 0;
  const bottomMargin = tabbarHeight + actionsBarHeight + 20;
  const delta = cardRect.bottom - (contentRect.bottom - bottomMargin);
  // Même seuil que pour l'alignement en haut : évite un scroll perceptible
  // pour un écart insignifiant.
  if (Math.abs(delta) < 6) return;
  contentEl.scrollBy({ top: delta, behavior: "smooth" });
}

// Glissement latéral au changement de mois, réutilisable par tous les
// calendriers (chaque sport + le calendrier partagé) puisqu'ils utilisent
// tous la même classe ".cal-grid" et qu'un seul est visible à la fois.
function animateCalendarMonthChange(delta, renderFn) {
  const oldGrid = document.querySelector(".cal-grid");
  if (oldGrid) {
    const rect = oldGrid.getBoundingClientRect();
    const clone = oldGrid.cloneNode(true);
    clone.style.position = "fixed";
    clone.style.top = rect.top + "px";
    clone.style.left = rect.left + "px";
    clone.style.width = rect.width + "px";
    clone.style.pointerEvents = "none";
    clone.style.zIndex = "20";
    clone.style.animation = delta > 0 ? "cal-grid-slide-out-to-left 0.2s ease forwards" : "cal-grid-slide-out-to-right 0.2s ease forwards";
    document.body.appendChild(clone);
    clone.addEventListener("animationend", () => clone.remove(), { once: true });
  }
  renderFn();
  const newGrid = document.querySelector(".cal-grid");
  if (newGrid) {
    newGrid.style.animation = delta > 0 ? "cal-grid-slide-in-from-right 0.22s cubic-bezier(0.4,0,0.2,1)" : "cal-grid-slide-in-from-left 0.22s cubic-bezier(0.4,0,0.2,1)";
  }
}

function positionLogActionsBar() {
  const actionsBar = document.getElementById("log-actions-bar");
  const tabbarEl = document.querySelector(".tabbar");
  const spacer = document.getElementById("log-bottom-spacer");
  if (!actionsBar || !tabbarEl) return;
  if (actionsBar.style.display === "none") {
    if (spacer) spacer.style.height = "0";
    return;
  }
  actionsBar.style.bottom = tabbarEl.offsetHeight + "px";
  if (spacer) spacer.style.height = actionsBar.offsetHeight + 16 + "px";
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
  return {
    id: uid(),
    name: "",
    exType: "", // "" tant qu'aucun type (Muscu/Cardio) n'a été choisi explicitement
    category: "", // "" tant qu'aucune catégorie musculaire n'a été choisie
    sets: [],
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
