
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

// Comme renderContentPreservingScroll, mais anime en plus le changement de
// hauteur d'UNE carte d'exercice précise plutôt que de le laisser se
// produire d'un coup — utile quand le contenu change de nature au point de
// changer radicalement de hauteur (ex. passer de Rameur/Vélo/Course, qui a
// une barre d'outils + un bouton "Ajouter", à Gainage, qui n'a ni l'un ni
// l'autre : environ 100px d'écart d'un coup, ressenti comme un "saut").
// Le scroll, lui, s'aligne normalement (voir scrollCardTopIntoView) : il
// cale le HAUT de la carte, qui ne bouge pas avec ce changement de hauteur
// (seul le bas de la carte change), donc pas de conflit entre les deux
// animations.
function renderContentAnimatingCardHeight(cardId, renderFn, afterRenderScroll) {
  const oldCard = document.querySelector(`.exercise-card[data-id="${cardId}"]`);
  const oldHeight = oldCard ? oldCard.offsetHeight : null;

  renderContentPreservingScroll(renderFn, afterRenderScroll);

  const newCard = document.querySelector(`.exercise-card[data-id="${cardId}"]`);
  if (!newCard || oldHeight == null) return;
  const newHeight = newCard.offsetHeight;
  // En dessous d'un petit seuil, pas la peine d'animer : la différence ne
  // se verrait de toute façon pas.
  if (Math.abs(newHeight - oldHeight) < 6) return;

  newCard.style.height = oldHeight + "px";
  newCard.style.overflow = "hidden";
  // Force le navigateur à appliquer cette valeur AVANT de la faire
  // transitionner — sinon les deux changements de hauteur (l'ancienne
  // valeur qu'on vient de fixer, puis la nouvelle) se confondent en un seul
  // saut instantané au lieu de s'animer entre les deux.
  newCard.getBoundingClientRect();
  newCard.style.transition = "height 0.22s ease";
  newCard.style.height = newHeight + "px";
  const cleanup = () => {
    newCard.style.transition = "";
    newCard.style.height = "";
    newCard.style.overflow = "";
    newCard.removeEventListener("transitionend", cleanup);
  };
  newCard.addEventListener("transitionend", cleanup);
}

function scrollCardTopIntoView(card, topMargin = 16, smooth = false) {
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
  // Instantané par défaut : un réalignement animé laissait une fenêtre de
  // quelques centaines de ms pendant laquelle un tap rapide sur le bouton
  // suivant (catégorie, Gainage, Ajouter une série...) pouvait atterrir sur
  // une cible encore en mouvement, ou être absorbé par le navigateur comme
  // un geste "stopper le défilement" plutôt qu'un vrai tap — d'où le besoin
  // occasionnel de cliquer deux fois. "Ajouter un exercice/bloc" n'est pas
  // un geste qu'on enchaîne aussi vite : demande explicitement l'animation
  // (voir add-exercise-btn) pour montrer la nouvelle carte apparaître
  // plutôt que de se retrouver déjà dessus l'instant d'après.
  contentEl.scrollBy({ top: delta, behavior: smooth ? "smooth" : "auto" });
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
  // Animé (contrairement à scrollCardTopIntoView, resté instantané) : ici,
  // l'utilisateur vient de taper "Ajouter..." et doit voir le nouveau bloc
  // apparaître pendant qu'on y arrive, pas se retrouver déjà dessus l'instant
  // d'après. scrollCardTopIntoView protège une séquence de taps rapides
  // (type → catégorie → nom) où un défilement animé gênerait ; ce n'est
  // pas le cas ici, l'ajout n'est pas un geste qu'on enchaîne aussi vite.
  contentEl.scrollBy({ top: delta, behavior: "smooth" });
}

// Glissement latéral au changement de mois, réutilisable par tous les
// calendriers (chaque sport + le calendrier partagé) puisqu'ils utilisent
// tous la même classe ".cal-grid" et qu'un seul est visible à la fois.
// ---------- Maintenir un bouton +/- enfoncé pour répéter ----------
// Le premier appui reste géré par le "click" normal laissé à l'appelant
// (aucun changement de comportement pour un tap simple) — cette fonction
// ajoute SEULEMENT la répétition après un temps de garde, tant qu'on
// maintient. Légère accélération après quelques pas, pour parcourir une
// plage large sans que ça devienne interminable.
let holdRepeatActive = null; // { timeoutId, intervalId }
function stopHoldRepeat() {
  if (!holdRepeatActive) return;
  clearTimeout(holdRepeatActive.timeoutId);
  clearInterval(holdRepeatActive.intervalId);
  holdRepeatActive = null;
}
// Écouté au niveau du document, jamais sur le bouton lui-même : certains
// de ces boutons (voir Séance en direct) redessinent tout l'écran à
// chaque pas, ce qui remplace le bouton EN PLEIN MAINTIEN — un écouteur
// posé dessus ne verrait alors jamais le relâchement puisque l'élément
// sous le doigt n'est déjà plus le même. Attaché une seule fois pour de
// bon, pas à chaque rendu.
let holdRepeatGlobalListenerAttached = false;
function ensureHoldRepeatGlobalListener() {
  if (holdRepeatGlobalListenerAttached) return;
  holdRepeatGlobalListenerAttached = true;
  document.addEventListener("pointerup", stopHoldRepeat, true);
  document.addEventListener("pointercancel", stopHoldRepeat, true);
}
function attachHoldToRepeat(el, onStep) {
  if (!el) return;
  ensureHoldRepeatGlobalListener();
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return; // clic gauche/tap seulement
    stopHoldRepeat();
    const timeoutId = setTimeout(() => {
      let steps = 0;
      const intervalId = setInterval(() => {
        steps++;
        if (steps === 12 && holdRepeatActive) {
          clearInterval(holdRepeatActive.intervalId);
          holdRepeatActive.intervalId = setInterval(onStep, 60);
        }
        onStep();
      }, 130);
      holdRepeatActive = { timeoutId: null, intervalId };
    }, 450);
    holdRepeatActive = { timeoutId, intervalId: null };
  });
}

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

// Empêche le contenu défilant de passer sous une barre d'actions fixe
// (voir #log-actions-bar / #settings-actions-bar) — sur une fenêtre assez
// haute, la marge basse réservée par le CSS (dans .content) suffit toujours
// puisqu'on doit défiler jusqu'au bout pour l'atteindre. Mais si la liste
// est courte (peu d'éléments) ET la fenêtre basse (petit écran ou fenêtre
// PC redimensionnée), le contenu peut tenir ENTIÈREMENT sans le moindre
// défilement — cette marge interne ne sert alors à rien, elle ne "pousse"
// jamais rien puisqu'il n'y a rien à faire défiler. Réduire la hauteur
// PROPRE du conteneur (via une marge EXTÉRIEURE) garantit l'espacement
// dans tous les cas, qu'on défile ou non.
function reserveSpaceForFixedBar(contentEl, actionsBarEl) {
  if (!contentEl || !actionsBarEl || actionsBarEl.style.display === "none") {
    if (contentEl) contentEl.style.marginBottom = "";
    return;
  }
  requestAnimationFrame(() => {
    const gap = document.getElementById("app").getBoundingClientRect().bottom - actionsBarEl.getBoundingClientRect().top;
    if (gap > 0) contentEl.style.marginBottom = gap + "px";
  });
}

function positionLogActionsBar() {
  ensureLogActionsBarResizeListener();
  const actionsBar = document.getElementById("log-actions-bar");
  const tabbarEl = document.querySelector(".tabbar");
  const spacer = document.getElementById("log-bottom-spacer");
  if (!actionsBar || !tabbarEl) return;
  if (actionsBar.style.display === "none") {
    if (spacer) spacer.style.height = "0";
  } else {
    actionsBar.style.bottom = tabbarEl.offsetHeight + "px";
    if (spacer) spacer.style.height = actionsBar.offsetHeight + 16 + "px";
  }
  reserveSpaceForFixedBar(document.getElementById("content"), actionsBar);
}

// Sans ça, ouvrir le clavier (en tapant dans un champ de la liste) change
// la hauteur utile de l'écran SANS jamais redéclencher positionLogActionsBar
// — jusque là seulement appelée au rendu — laissant la barre et la cale
// calculées pour l'ancienne hauteur. `visualViewport` (repli sur `resize`
// si absent) reflète justement ce que le clavier fait à l'écran visible,
// contrairement à `window.innerHeight` qui ne bouge pas toujours pareil.
// Attaché une seule fois pour de bon, pas à chaque rendu.
let logActionsBarResizeListenerAttached = false;
function ensureLogActionsBarResizeListener() {
  if (logActionsBarResizeListenerAttached) return;
  logActionsBarResizeListenerAttached = true;
  const target = window.visualViewport || window;
  target.addEventListener("resize", () => positionLogActionsBar());
}


/* ---------- Correctif iOS : fenêtre plus courte que l'écran ---------- */
// Sur certains iPhone, la fenêtre annoncée à la page (window.innerHeight)
// est plus courte que l'écran EXACTEMENT de la hauteur de la barre d'état
// (ex. 848 pour un écran de 896 sur iPhone 11 : écart de 48 = zone de
// sécurité du haut). La page ne peut pas peindre dans cette bande du bas
// (constaté : tout y est rogné), mais iOS la remplit avec la couleur de
// fond de la page. On ne réagit que sur cette signature précise (portrait,
// écart = zone de sécurité du haut à 6px près) pour ne jamais fausser un
// appareil, un navigateur ou une fenêtre de bureau qui n'ont pas ce défaut.
//   "bande"  (défaut) : tout reste dans la fenêtre visible, la couleur de la
//                       barre est prolongée dans la bande du bas.
//   "flux"   (essai)  : la page devient un document normal de la hauteur de l'écran.
//   "off"             : aucun correctif.
// Un toucher sur la ligne de version (Réglages) passe au mode suivant.
const VIEWPORT_FIX_KEY = "gymlog.viewportFix";
const VIEWPORT_MODES = ["auto", "flux", "bande", "off"];
let viewportFixExtra = 0;
let viewportResolvedMode = "off";
function getViewportMode() {
  try {
    const m = localStorage.getItem(VIEWPORT_FIX_KEY);
    return VIEWPORT_MODES.includes(m) ? m : "auto";
  } catch (e) {
    return "auto";
  }
}
// Mode "auto" : visualViewport.height est la zone RÉELLEMENT visible. Si elle
// atteint le bas de l'écran alors que la fenêtre de mise en page (innerHeight)
// s'arrête 48pt plus haut, la bande est affichable : un contenu en flux normal
// (mode "flux") y sera peint. Sinon on reste dans la fenêtre visible ("bande").
function resolveViewportMode() {
  const stored = getViewportMode();
  if (stored !== "auto") return stored;
  const vv = window.visualViewport;
  return vv && Math.round(vv.height) + 6 >= window.screen.height ? "flux" : "bande";
}
function readSafeAreaTop() {
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute; visibility:hidden; pointer-events:none; padding-top:env(safe-area-inset-top);";
  document.body.appendChild(probe);
  const v = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  return v;
}
function isTypingNow() {
  const a = document.activeElement;
  return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT" || a.isContentEditable);
}
function applyViewportFix() {
  // Clavier ouvert : visualViewport.height rétrécit, ce qui ferait passer
  // "auto" en "bande" en pleine saisie (la mise en page sauterait). On garde
  // l'état courant jusqu'à la fin de la saisie (voir "focusout" plus bas).
  if (isTypingNow()) return;
  const root = document.documentElement;
  let extra = 0;
  if (getViewportMode() !== "off" && window.innerHeight > window.innerWidth) {
    const insetTop = readSafeAreaTop();
    const gap = Math.round(window.screen.height - window.innerHeight);
    if (insetTop > 0 && gap > 0 && Math.abs(gap - insetTop) <= 6) extra = gap;
  }
  const mode = extra > 0 ? resolveViewportMode() : "off";
  viewportResolvedMode = mode;
  viewportFixExtra = extra;
  ["flux", "bande"].forEach((m) => root.classList.toggle("vfix-" + m, extra > 0 && mode === m));
  // Mode "bande" : le bas de la fenêtre visible n'est PAS le bas de l'écran,
  // donc la zone de l'indicateur d'accueil n'a pas à être réservée dans l'app.
  if (extra > 0 && mode === "bande") root.style.setProperty("--safe-bottom", "0px");
  else root.style.removeProperty("--safe-bottom");
  if (extra > 0 && mode === "flux") {
    const h = window.innerHeight + extra;
    root.style.setProperty("--viewport-h", h + "px");
    root.style.setProperty("--vh", h / 100 + "px");
  } else {
    root.style.removeProperty("--viewport-h");
    root.style.removeProperty("--vh");
  }
  updateBarFlag();
}
// Mode "bande" : la bande du bas prend la couleur de FOND de la page — on la
// veut de la couleur de la barre seulement quand une barre est affichée.
function updateBarFlag() {
  document.documentElement.classList.toggle("vfix-bar", !!document.querySelector(".home-bottom-nav, .tabbar"));
}
function cycleViewportMode() {
  const next = VIEWPORT_MODES[(VIEWPORT_MODES.indexOf(getViewportMode()) + 1) % VIEWPORT_MODES.length];
  try { localStorage.setItem(VIEWPORT_FIX_KEY, next); } catch (e) {}
  applyViewportFix();
}
window.addEventListener("resize", applyViewportFix);
window.addEventListener("orientationchange", () => setTimeout(applyViewportFix, 250));
window.addEventListener("pageshow", applyViewportFix);
document.addEventListener("focusout", () => setTimeout(applyViewportFix, 300));
// Mode "flux" : le document fait 48pt de plus que la fenêtre de mise en page ;
// on empêche tout défilement de la page elle-même (le contenu défile dans
// ses propres zones). Sans effet dans les autres modes (scrollY reste à 0).
window.addEventListener("scroll", () => { if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0); }, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) applyViewportFix(); });
new MutationObserver(updateBarFlag).observe(document.getElementById("app"), { childList: true });
applyViewportFix();


/* ---------- Données venues de l'extérieur : normalisation à l'entrée ---------- */
// Trois chemins font entrer dans l'app des données qu'elle n'a pas écrites
// elle-même : le cloud (pullFromFirebase), l'import d'une séance partagée et
// l'import d'une sauvegarde. Leurs valeurs finissent dans des gabarits HTML
// (innerHTML) — y compris DANS DES ATTRIBUTS (une centaine de sites, voir
// data-edit-session="${s.id}"...) — donc un texte piégé pouvait s'exécuter
// (testé : champ par champ, pour chacun des trois chemins). On les normalise
// donc ici, une fois, plutôt qu'à chaque site d'affichage :
//   - toute clé "id" ou "...Id" (pairedExerciseId...) : seulement [A-Za-z0-9_-]
//     (c'est exactement l'alphabet des identifiants que l'app génère) ;
//   - toute clé "date" : une vraie date AAAA-MM-JJ, sinon aujourd'hui (une date
//     illisible faisait planter l'affichage) ;
//   - tout autre texte : "<" et ">" remplacés par leurs sosies pleine largeur
//     (＜ ＞) — rien n'est perdu à l'affichage (« RPE ＞ 8 »), mais ce ne sont
//     plus des balises ;
//   - clés dangereuses (__proto__, constructor, prototype) ignorées.
const EXTERNAL_ID_KEY = /(^id$|Id$)/;
const EXTERNAL_MAX_DEPTH = 40;
function sanitizeExternalValue(v, key, depth = 0) {
  // Un fichier imbriqué à l'absurde (des milliers de niveaux) ferait dépasser la
  // pile d'appels : au-delà d'une profondeur qu'aucune donnée réelle n'atteint,
  // on coupe la branche.
  if (depth > EXTERNAL_MAX_DEPTH) return null;
  if (typeof v === "string") {
    if (key && EXTERNAL_ID_KEY.test(key)) return v.replace(/[^\w-]/g, "").slice(0, 64);
    if (key === "date") return /^\d{4}-\d{2}-\d{2}(T[\d:.+\-Z]*)?$/.test(v) ? v : todayISO();
    return v.replace(/</g, "＜").replace(/>/g, "＞");
  }
  // Un nom ou un libellé est toujours un texte (trié/comparé avec localeCompare).
  if ((key === "name" || key === "label") && typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map((x) => sanitizeExternalValue(x, key, depth + 1));
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      out[k] = sanitizeExternalValue(v[k], k, depth + 1);
      // Identifiant vidé par le nettoyage : un "id" doit rester unique et non vide ;
      // une référence ("...Id") vidée n'a plus de cible.
      if (EXTERNAL_ID_KEY.test(k) && typeof v[k] === "string" && out[k] === "") out[k] = k === "id" ? uid() : null;
    }
    return out;
  }
  return v;
}
// Une liste reçue du cloud : Firebase renvoie parfois un objet (clés non
// consécutives) ou null à la place d'un tableau, et des trous (null) dans un
// tableau — ce qui faisait planter les .map/.sort de l'affichage.
function asExternalList(v) {
  const list = Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
  return list.filter((x) => x !== null && x !== undefined);
}
/* ---------- Validation de forme : une donnée abîmée ne doit jamais empêcher l'app de démarrer ---------- */
// Constaté : importer une liste contenant un élément null rendait l'app incapable de
// démarrer ; des champs de mauvais type (exercises = texte, sets = nombre, blocks =
// null...) faisaient planter l'affichage d'un écran. On garantit ici la FORME (listes
// là où l'app attend des listes, objets là où elle attend des objets) sans rien
// changer à des données déjà correctes — les champs inconnus sont conservés.
const _isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const _arr = (x) => (Array.isArray(x) ? x : []);
const _objList = (v) => asExternalList(v).filter(_isObj);
// Une séance ou une pesée sans date n'a pas de place dans l'historique ni dans
// le calendrier (qui lisent la date de chacune) : on l'écarte plutôt que de
// laisser l'écran planter.
const _dated = (v) => _objList(v).filter((x) => typeof x.date === "string");
function shapeGymSessions(v) {
  return _dated(v).map((s) => ({ ...s, exercises: _arr(s.exercises).filter(_isObj).map((ex) => ({ ...ex, sets: _arr(ex.sets).filter(_isObj) })) }));
}
function shapeBlockSessions(v) {
  return _dated(v).map((s) => ({ ...s, blocks: _arr(s.blocks).filter(_isObj) }));
}
function shapeGymPlans(v) {
  return _objList(v).map((p) => ({ ...p, exercises: _arr(p.exercises).filter(_isObj).map((ex) => ({ ...ex, sets: _arr(ex.sets).filter(_isObj) })) }));
}
function shapeConfigs(v) {
  return _objList(v).map((c) => ({
    ...c,
    name: typeof c.name === "string" ? c.name : String(c.name == null ? "" : c.name),
    baseWeights: _arr(c.baseWeights).map((x) => (typeof x === "number" ? x : parseFloat(x))).filter(Number.isFinite),
  }));
}
function shapeNamedObjects(v) {
  return _objList(v).map((c) => ({ ...c, name: typeof c.name === "string" ? c.name : String(c.name == null ? "" : c.name) }));
}
function shapeWeights(v) {
  return _dated(v);
}
function shapeNameList(v) {
  return asExternalList(v).filter((x) => typeof x === "string");
}


/* ---------- Filet de sécurité : aucun gestionnaire d'évènement injecté ---------- */
// L'app n'utilise AUCUN attribut on*="..." dans ses gabarits (tous ses
// évènements passent par addEventListener) : un tel attribut dans l'interface
// ne peut donc venir que d'un texte injecté. Quoi qu'il arrive en amont, on le
// retire — ainsi que les balises exécutables et les adresses javascript: —
// aussitôt après chaque affichage. Un MutationObserver s'exécute avant que le
// navigateur ne traite l'évènement (chargement raté d'une image, focus
// automatique...) : le gestionnaire est déjà parti quand il serait appelé.
const DOM_GUARD_BLOCKED_TAGS = new Set(["SCRIPT", "IFRAME", "FRAME", "FRAMESET", "OBJECT", "EMBED", "APPLET", "BASE", "META", "LINK"]);
const DOM_GUARD_URL_ATTRS = new Set(["href", "src", "action", "formaction", "data", "xlink:href"]);
function scrubInjectedDom(root) {
  if (!root || root.nodeType !== 1) return;
  const all = [root, ...root.querySelectorAll("*")];
  for (const el of all) {
    if (DOM_GUARD_BLOCKED_TAGS.has(el.tagName.toUpperCase())) {
      el.remove();
      continue;
    }
    for (const at of Array.from(el.attributes)) {
      const name = at.name.toLowerCase();
      if (name.startsWith("on") || name === "srcdoc") el.removeAttribute(at.name);
      else if (DOM_GUARD_URL_ATTRS.has(name) && /^\s*(?:javascript|vbscript|data\s*:\s*text\/html)/i.test(at.value)) el.removeAttribute(at.name);
    }
  }
}
const domGuard = new MutationObserver((mutations) => {
  for (const m of mutations) for (const n of m.addedNodes) scrubInjectedDom(n);
});
["app", "custom-modal-root"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) domGuard.observe(el, { childList: true, subtree: true });
});

/* ---------- Anti-"clickjacking" ---------- */
// Une page tierce ne doit pas pouvoir afficher l'app dans un cadre invisible
// pour piéger un toucher (suppression, déconnexion...). L'hébergement statique ne
// permet pas d'envoyer l'en-tête X-Frame-Options : on fait la vérification ici.
if (window.top !== window.self) {
  document.documentElement.style.display = "none";
  try {
    window.top.location = window.self.location;
  } catch (e) {
    // Cadre d'un autre domaine : on laisse l'app cachée plutôt que cliquable.
  }
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
let localStorageFullWarned = false;
function warnIfStorageFull(e) {
  // Stockage de l'appareil plein : la donnée reste en mémoire mais ne survivrait
  // PAS à la fermeture de l'app — jusqu'ici, sans le moindre signe visible.
  const full = e && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22);
  if (full && !localStorageFullWarned && typeof showAlert === "function") {
    localStorageFullWarned = true;
    showAlert("Le stockage de cet appareil est plein : tes dernières données ne sont pas enregistrées localement. Fais de la place (ou exporte une sauvegarde) avant de fermer l'app.");
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    warnIfStorageFull(e);
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

// Comme saveJSON, mais sans déclencher de resynchro cloud en retour —
// utilisée uniquement pour mettre en cache localement des données qui
// viennent justement d'être récupérées DEPUIS Firebase (voir
// pullFromFirebase dans 04-auth.js) : les repousser aussitôt vers Firebase
// serait un aller-retour inutile, puisque c'est très exactement leur source.
function saveJSONLocalOnly(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    warnIfStorageFull(e);
    if (!localStorageWarned) {
      console.error("Sauvegarde locale indisponible dans ce contexte.", e);
      localStorageWarned = true;
    }
  }
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

// Échappe un texte destiné à être inséré dans du HTML (contenu ou attribut).
function escapeHTML(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function showConfirm(message, onConfirm, opts = {}) {
  const root = document.getElementById("custom-modal-root");
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-box" role="alertdialog" aria-label="${escapeHTML(message)}">
        <div class="modal-message">${escapeHTML(message)}</div>
        ${opts.detail ? `<div class="modal-detail">${escapeHTML(opts.detail)}</div>` : ""}
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
// Enregistrer une séance ne doit pas "sentir" comme la supprimer — visuellement,
// les deux ne sont aujourd'hui qu'un même genre de saut instantané d'un écran à
// l'autre. Cette petite capsule matérialise la séance qu'on vient de créer,
// apparaît par-dessus l'écran, puis "s'envole" vers le bas — exactement là où
// vit la liste vers laquelle on navigue — avant de disparaître. `onMidpoint`
// est appelé pendant qu'elle s'envole (pas après) : le nouvel écran (liste,
// avec la carte qui vient d'arriver déjà mise en valeur — voir
// `justLandedItemId` plus bas) a donc le temps de s'installer dessous avant que
// la capsule ne s'efface, pour que les deux se répondent au lieu de se succéder
// sèchement.
function playSaveTravelAnimation(iconHTML, title, subtitle, onMidpoint, direction = "down") {
  const el = document.createElement("div");
  el.className = "save-capsule";
  el.innerHTML = `
    <div class="save-capsule-icon">${iconHTML}</div>
    <div class="save-capsule-text">
      <div class="save-capsule-title">${title}</div>
      ${subtitle ? `<div class="save-capsule-subtitle">${subtitle}</div>` : ""}
    </div>`;
  document.body.appendChild(el);
  // Un frame d'écart avant d'ajouter la classe qui déclenche la transition
  // d'entrée — sinon, posée dès la création de l'élément, elle n'aurait rien
  // à animer (déjà dans son état final au premier rendu du navigateur).
  requestAnimationFrame(() => el.classList.add("arrive"));
  setTimeout(() => {
    el.classList.remove("arrive");
    el.classList.add("travel-" + direction);
    setTimeout(() => {
      if (onMidpoint) onMidpoint();
    }, 160);
    setTimeout(() => el.remove(), 480);
  }, 420);
}

// Petite animation de disparition avant de retirer réellement une carte de
// la liste (séance, plan...) — pour que supprimer se sente différent d'un
// simple rechargement de liste, sans reprendre l'animation de création
// (2.43.0/2.44.0) : ici la carte s'efface sur PLACE, elle ne voyage nulle
// part. `card` peut être introuvable (déjà retirée, structure imprévue) :
// dans ce cas on appelle `onComplete` tout de suite, sans planter.
function animateCardRemoval(card, onComplete) {
  if (!card) {
    onComplete();
    return;
  }
  const height = card.getBoundingClientRect().height;
  card.style.height = height + "px";
  card.style.overflow = "hidden";
  // Force le navigateur à "figer" cette hauteur avant d'ajouter la classe
  // qui déclenche la transition — sinon, posée dans le même tick, il n'y
  // aurait rien à animer (déjà dans son état final au tout premier rendu).
  card.getBoundingClientRect();
  requestAnimationFrame(() => card.classList.add("card-removing"));
  setTimeout(onComplete, 320);
}

// ---------- Glisser pour supprimer (séances, plans...) ----------
// Une seule carte "ouverte" (glissée, bouton Supprimer révélé) à la fois,
// peu importe l'écran — on ferme l'ancienne avant d'en ouvrir une autre.
let swipeOpenCard = null;
let swipeGlobalCloserAttached = false;

function closeSwipeCard(card) {
  if (!card) return;
  // Vide plutôt qu'une valeur explicite : la carte retombe sur le petit
  // repli permanent fixé en CSS (voir .swipe-row > [data-swipe-id]) — un
  // indice discret et toujours visible que quelque chose se cache derrière,
  // plutôt que 0 qui ne laisserait absolument rien deviner.
  card.style.transform = "";
  card.classList.remove("swipe-open");
  if (swipeOpenCard === card) swipeOpenCard = null;
}

// Un tap n'importe où en dehors de la carte actuellement ouverte la
// referme — attaché une seule fois pour de bon (pas à chaque rendu, sinon
// les écouteurs s'empileraient indéfiniment au fil des re-rendus).
function ensureSwipeGlobalCloser() {
  if (swipeGlobalCloserAttached) return;
  swipeGlobalCloserAttached = true;
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (swipeOpenCard && document.body.contains(swipeOpenCard) && !swipeOpenCard.closest(".swipe-row")?.contains(e.target)) {
        closeSwipeCard(swipeOpenCard);
      }
    },
    true
  );
}

// Enveloppe le HTML d'une carte existante dans la structure nécessaire au
// glissé : un bouton "Supprimer" rouge en dessous, révélé en glissant la
// carte elle-même vers la gauche par-dessus. `cardHTML` doit contenir un
// unique élément racine (`.history-card`, `.weight-entry-row`...) ; `id`
// sert à le retrouver et à savoir laquelle supprimer une fois le bouton
// révélé tapoté (voir initSwipeToDelete) — peu importe sa classe exacte,
// l'attribut est simplement ajouté juste après le premier "<div".
function wrapSwipeToDeleteRow(id, cardHTML) {
  const withId = cardHTML.replace(/^(\s*<div)(\s)/, `$1 data-swipe-id="${id}"$2`);
  return `
  <div class="swipe-row">
    <div class="swipe-delete-reveal" data-swipe-delete-reveal>${ICONS.trash}<span>Supprimer</span></div>
    ${withId}
  </div>`;
}

// Active le geste sur toutes les cartes d'un conteneur donné (enveloppées
// via wrapSwipeToDeleteRow ci-dessus). `onDeleteTap(id, cardEl)` est
// appelé au tap sur le bouton révélé — à charge de l'appelant de gérer la
// confirmation et la suppression réelle, propres à chaque écran de liste.
function initSwipeToDelete(container, onDeleteTap) {
  ensureSwipeGlobalCloser();
  const REVEAL = 84;
  // Repli permanent (voir la même valeur en CSS, .swipe-row > [data-swipe-id])
  // — la position de repos réelle n'est pas 0 mais ce léger décalage, pour
  // qu'un mince bord rouge dépasse toujours un peu, seul indice qu'un
  // geste est possible ici.
  const PEEK = 8;
  container.querySelectorAll(".swipe-row").forEach((row) => {
    const card = row.querySelector("[data-swipe-id]");
    const reveal = row.querySelector("[data-swipe-delete-reveal]");
    if (!card || !reveal) return;
    const id = card.dataset.swipeId;

    reveal.addEventListener("click", () => onDeleteTap(id, card));

    let startX = 0,
      startY = 0,
      baseX = 0,
      dragging = false,
      horizontal = null,
      justDragged = false;

    card.addEventListener("pointerdown", (e) => {
      startX = e.clientX;
      startY = e.clientY;
      baseX = card.classList.contains("swipe-open") ? -REVEAL : -PEEK;
      dragging = true;
      horizontal = null;
      card.style.transition = "none";
    });

    card.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (horizontal === null) {
        // Pas assez de mouvement pour trancher horizontal/vertical : on
        // attend, sans rien empêcher (le scroll vertical natif doit rester
        // parfaitement fluide tant qu'on n'est pas sûr que c'est un glissé
        // latéral).
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        horizontal = Math.abs(dx) > Math.abs(dy);
        if (!horizontal) {
          dragging = false;
          return;
        }
      }
      if (!horizontal) return;
      e.preventDefault();
      const x = Math.min(-PEEK, Math.max(-REVEAL - 24, baseX + dx));
      card.style.transform = `translateX(${x}px)`;
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      card.style.transition = "";
      if (horizontal) {
        justDragged = true;
        const dx = (e.clientX ?? startX) - startX;
        const x = baseX + dx;
        if (x < -REVEAL / 2) {
          if (swipeOpenCard && swipeOpenCard !== card) closeSwipeCard(swipeOpenCard);
          card.style.transform = `translateX(${-REVEAL}px)`;
          card.classList.add("swipe-open");
          swipeOpenCard = card;
        } else {
          closeSwipeCard(card);
        }
      }
    }
    card.addEventListener("pointerup", endDrag);
    card.addEventListener("pointercancel", endDrag);

    // En capture, avant le clic normal (ex. data-toggle qui déplie/replie) :
    // un tap qui suit un glissement ne doit pas AUSSI déplier la carte, et
    // un tap sur une carte déjà ouverte (glissée) doit la refermer plutôt
    // que basculer son état d'ouverture habituel.
    card.addEventListener(
      "click",
      (e) => {
        if (justDragged) {
          justDragged = false;
          e.stopPropagation();
          e.preventDefault();
        } else if (card.classList.contains("swipe-open")) {
          e.stopPropagation();
          e.preventDefault();
          closeSwipeCard(card);
        }
      },
      true
    );
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
// Barre de navigation persistante (Accueil / Calendrier / Réglages) —
// partagée entre ces 3 écrans précisément, pour qu'on puisse passer de
// n'importe lequel à n'importe quel autre sans revenir en arrière. activeKey
// vaut "home" | "calendar" | "settings" ; l'icône correspondante est mise en
// évidence. Les clics sont attachés séparément par attachBottomNavListeners,
// une fois ce HTML inséré dans le DOM.
function bottomNavHTML(activeKey) {
  const items = [
    { key: "home", icon: ICONS.house, label: "Accueil" },
    { key: "calendar", icon: ICONS.calendarBig, label: "Calendrier" },
    { key: "settings", icon: ICONS.gear, label: "Réglages" },
  ];
  return `
    <nav aria-label="Navigation principale" class="home-bottom-nav">
      ${items
        .map(
          (it) => `<button type="button" class="home-bottom-nav-item ${it.key === activeKey ? "home-bottom-nav-item-active" : ""}" data-open-app="${it.key}">
        ${it.icon}
        <span>${it.label}</span>
      </button>`
        )
        .join("")}
    </nav>`;
}
function attachBottomNavListeners(root) {
  (root || document).querySelectorAll(".home-bottom-nav-item").forEach((el) => {
    el.addEventListener("click", () => {
      currentApp = el.dataset.openApp;
      render();
    });
  });
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
