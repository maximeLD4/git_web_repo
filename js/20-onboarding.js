/* ---------- Guide de première utilisation ----------
   Une seule fois, au tout premier lancement d'un compte neuf : tout l'écran
   est grisé sauf l'élément à utiliser, et une bulle dit quoi faire. On ne peut
   toucher QUE cet élément ; l'étape suivante vient quand l'action est faite
   (ou avec « Suivant » pour les étapes qui présentent une option). Trois
   parties :
     1. configurer son premier exercice (Réglages > Exercices), en passant par
        chacune de ses options ;
     2. préparer son premier plan avec cet exercice (Salle de sport > Plan à
        préparer), en passant par chacune de ses options ;
     3. lancer ce plan en Séance en direct : première série, repos, puis
        enregistrer la séance et la retrouver dans ses séances.
   Ensuite, plus rien : l'utilisateur est libre.
   - Ne se lance pas pour un compte qui a déjà des données (exercices,
     séances ou plans) : il est marqué comme fait sans rien afficher.
   - « Quitter le guide » (confirmé dans la bulle) reste possible, pour ne
     jamais enfermer personne ; il se relance depuis Réglages > Apparence.
   - Si l'app est rechargée au milieu, le guide reprend au début de la partie
     en cours (l'écran d'où on était parti n'existe plus).
   - Le guide vit HORS de #app (dans <body>) : les nouveaux rendus de l'app ne
     l'effacent pas ; il se recale à chaque image sur l'élément visé.
   État gardé sur l'appareil (gymlog:onboarding), pour UN compte : un autre
   compte qui se connecte repart de zéro (voir onboardingMaybeStart). */

const ONB_KEY = "gymlog:onboarding";
let onb = loadJSON(ONB_KEY, null) || { done: false, step: 0 };
let onbActive = false;
let onbRaf = null;
let onbStepStartedFor = -1;
// Étape revisitée avec « Précédent » : son action est peut-être déjà faite —
// on ne la passe pas automatiquement, « Suivant » la valide ; et on ne
// rejoue pas sa navigation d'entrée.
let onbRevisit = false;

const onbSave = () => saveJSONLocalOnly(ONB_KEY, onb);
const onbQ = (sel) => (typeof sel === "function" ? sel() : document.querySelector(sel));
const onbGoHome = () => {
  currentApp = "home";
  render();
};
// Carte d'exercice du plan en cours de préparation (la dernière ajoutée).
const onbPlanCard = () => {
  const cards = document.querySelectorAll(".exercise-card");
  return cards.length ? cards[cards.length - 1] : null;
};
const onbRow = (inputSel) => {
  const el = document.querySelector(inputSel);
  return el ? el.closest(".field-list-row") : null;
};

/* Chaque étape :
     part     partie (1, 2, 3) — affichée dans la bulle ;
     target   sélecteur ou fonction → élément(s) à mettre en lumière (null =
              bulle seule, au centre) ; un tableau = la zone qui les englobe ;
     text     ce que dit la bulle ;
     next     libellé du bouton (étape « présentation ») ; sans bouton,
              l'étape avance quand done() devient vrai (action faite) ;
     ready    pour une étape à bouton : condition pour l'activer ;
     enter    action à l'entrée de l'étape (navigation…) ;
     onNext   action au « Suivant ». */
const ONB_STEPS = [
  /* ---- Partie 1 : le premier exercice ---- */
  { part: 1, start: true, target: null, text: "Bienvenue ! En trois étapes, tu vas configurer ton premier exercice, préparer un plan avec, puis le lancer. Suis le guide : seul l'élément éclairé répond.", next: "C'est parti", enter: onbGoHome },
  { part: 1, target: '[data-open-app="settings"]', text: "Tes exercices se configurent dans les Réglages. Touche « Réglages ».", done: () => currentApp === "settings" },
  { part: 1, target: '[data-open-settings="gym"]', text: "Ouvre « Exercices ».", done: () => currentApp === "settings-gym" },
  { part: 1, target: "#add-config-btn", text: "Touche « Ajouter un exercice ».", done: () => gymSettingsFormOpen && !!document.getElementById("config-name-input") },
  { part: 1, target: () => onbRow("#config-category-select"), text: "D'abord, sa catégorie (obligatoire) : elle range l'exercice, filtre les listes et décide des noms proposés.", next: "Suivant", ready: () => !!(document.getElementById("config-category-select") || {}).value },
  { part: 1, target: () => [onbRow("#config-name-input"), document.getElementById("config-name-suggest")], text: "Puis son nom : tape-le, ou touche une des suggestions de la catégorie qui s'affichent sous le champ.", next: "Suivant", ready: () => !!(document.getElementById("config-name-input") || {}).value?.trim() },
  { part: 1, target: () => onbRow("#config-equipment-select"), text: "Le type de poids est choisi d'après le nom ; change-le si besoin. Il décide du dessin de chaque série dans l'historique (pile de machine, barre, haltères…).", next: "Suivant" },
  { part: 1, target: () => [document.getElementById("config-base-weights-row"), onbRow("#config-new-base-weight")], text: "Les poids possibles : les paliers de ta machine. Tape un poids puis « Ajouter », autant de fois que nécessaire (au moins un). Plus tard, tu pourras aussi scanner la pile en photo.", next: "Suivant", ready: () => gymSettingsFormDraft && gymSettingsFormDraft.baseWeights.length > 0 },
  { part: 1, target: () => [onbRow("#config-auto-increment-toggle"), onbRow("#config-max-increment")], text: "Incrément automatique : en direct, le poids proposé monte d'un palier à chaque série. Incrément possible : un petit poids qu'on ajoute à la main sur la machine. Le « ? » explique chaque réglage.", next: "Suivant" },
  { part: 1, target: () => [onbRow("#config-unilateral-toggle"), onbRow("#config-paired-exercise-select")], text: "Travail unilatéral : pour noter côté gauche / côté droit. Alterner avec : pour enchaîner deux exercices en superset.", next: "Suivant" },
  { part: 1, target: "#save-config-btn", text: "Tout est réglé : touche « Enregistrer ».", done: () => !gymSettingsFormOpen && gymExerciseConfigs.length > (onb.base || {}).configs, onDone: () => { const c = gymExerciseConfigs[gymExerciseConfigs.length - 1]; onb.exerciseName = c ? c.name : ""; } },

  /* ---- Partie 2 : le premier plan ---- */
  { part: 2, start: true, target: null, text: () => `Bravo, « ${onb.exerciseName || "ton exercice"} » est prêt ! Maintenant, prépare ton premier plan avec.`, next: "Suivant", enter: onbGoHome },
  { part: 2, target: '[data-open-app="gym"]', text: "Ouvre « Salle de sport ».", done: () => currentApp === "gym" },
  { part: 2, target: '[data-gym-top-mode="plan"]', text: "En haut, choisis « Plan à préparer » : la liste de tes plans s'affiche.", done: () => gymTopMode === "plan" && (tab !== "log" ? !!document.querySelector("[data-new-entry]") : !!document.getElementById("log-label")) },
  { part: 2, target: "[data-new-entry]", skip: () => tab === "log" && !!document.getElementById("log-label"), text: "Touche « Ajouter un plan ».", done: () => !!document.getElementById("log-label") },
  { part: 2, target: () => onbRow("#log-label"), text: "Donne un nom à ton plan (par exemple « Jambes »).", next: "Suivant", ready: () => !!(document.getElementById("log-label") || {}).value?.trim() },
  { part: 2, target: "#add-exercise-btn", text: "Touche « Ajouter un exercice ».", done: () => !!onbPlanCard() },
  { part: 2, target: () => { const c = onbPlanCard(); return c ? c.querySelector('[data-set-type="muscu"]') : null; }, skip: () => { const c = onbPlanCard(); return !!c && !!c.querySelector("[data-category-toggle]"); }, text: "C'est un exercice de musculation : choisis « Muscu ».", done: () => { const c = onbPlanCard(); return !!c && !!c.querySelector("[data-category-toggle]"); } },
  { part: 2, target: () => { const c = onbPlanCard(); return c ? [c.querySelector("[data-category-toggle]"), c.querySelector("select.ex-name-input")] : null; }, text: () => `Choisis sa catégorie, puis « ${onb.exerciseName || "ton exercice"} » dans la liste.`, done: () => { const c = onbPlanCard(); const s = c && c.querySelector("select.ex-name-input"); return !!(s && s.value) && !!c.querySelector(".set-row"); } },
  { part: 2, target: () => { const c = onbPlanCard(); return c ? c.querySelector(".sets-list") : null; }, text: "Chaque ligne est une série : règle les répétitions avec − / +, et le poids dans le menu.", next: "Suivant" },
  { part: 2, target: () => { const c = onbPlanCard(); return c ? c.querySelector("[data-add-set]") : null; }, text: "Ajoute une deuxième série.", done: () => { const c = onbPlanCard(); return !!c && c.querySelectorAll(".set-row").length >= 2; } },
  { part: 2, target: () => { const c = onbPlanCard(); return c ? c.querySelector("[data-plan-rest]") : null; }, text: "Le repos entre les séries : en direct, il se décomptera tout seul après chaque série. Règle-le avec − / +.", next: "Suivant", ready: () => { const c = onbPlanCard(); const i = c && c.querySelector(".plan-rest-sec"); return !!i && parseInt(i.value, 10) > 0; } },
  { part: 2, target: () => { const c = onbPlanCard(); return c ? c.querySelector("[data-plan-gap]") : null; }, skip: () => { const c = onbPlanCard(); return !c || !c.querySelector("[data-plan-gap]"); }, text: "Entre deux séries précises, tu peux mettre un repos différent (− / +) ; « ↺ » le remet par défaut. Avec plusieurs exercices, tu régleras aussi le repos avant l'exercice suivant.", next: "Suivant" },
  { part: 2, target: "#save-session-btn", text: "Ton plan est prêt : touche « Enregistrer le plan ».", done: () => sessionPlans.length > (onb.base || {}).plans, onDone: () => { const p = sessionPlans[sessionPlans.length - 1]; onb.planId = p ? p.id : null; } },

  /* ---- Partie 3 : lancer le plan ---- */
  { part: 3, start: true, target: null, text: "Dernière étape : lance ton plan en Séance en direct.", next: "Suivant", enter: onbGoHome },
  { part: 3, target: '[data-open-app="live"]', text: "Touche « Séance en direct ».", done: () => currentApp === "live" && !!liveSession },
  { part: 3, target: () => document.querySelector(`[data-live-pick-plan="${onb.planId}"]`) || document.querySelector("[data-live-pick-plan]:not([data-live-pick-plan=''])"), skip: () => !!liveSession && liveSession.planId !== undefined, text: "Choisis ton plan.", done: () => !!liveSession && !!liveSession.planId },
  { part: 3, target: "[data-live-plan-exercise]", skip: () => !!document.querySelector("[data-live-start-set]"), text: "Touche ton exercice.", done: () => !!document.querySelector("[data-live-start-set]") },
  { part: 3, target: "[data-live-start-set]", text: "Le poids et les répétitions viennent du plan. Lance ta première série !", done: () => !!liveSession && !!liveSession.setInProgressStartedAt },
  { part: 3, target: "[data-live-finish-set]", text: "Fais ta série… puis touche « Finir la série ».", done: () => !!liveSession && !liveSession.setInProgressStartedAt && (liveSession.exercises || []).some((e) => e.sets.length > 0) },
  { part: 3, target: "#live-rest-hero", text: "Le repos prévu par ton plan se décompte tout seul. À la fin, la série suivante t'attend : rien ne se lance sans toi.", next: "Suivant" },
  { part: 3, target: "[data-live-stop]", text: "Pour ce premier essai, termine la séance : touche « Terminer ».", done: () => !!document.querySelector("[data-end-save]") },
  { part: 3, target: "[data-end-save]", text: "Enregistre ta séance.", done: () => sessions.length > (onb.base || {}).sessions },
  { part: 3, target: () => document.querySelector(".history-card .history-body") ? document.querySelector(".history-card") : null, text: "La voici dans tes séances : chaque exercice, chaque série, le poids et les répétitions. Tu la retrouveras ici et dans le Calendrier. Le guide est fini, l'app est à toi !", next: "Terminer", onNext: () => onbFinish() },
];

function onbBaseline() {
  onb.base = { configs: gymExerciseConfigs.length, plans: sessionPlans.length, sessions: sessions.length };
}

// Au premier affichage de l'accueil d'un compte : démarre le guide s'il n'a
// jamais été fait et que le compte est neuf, sinon le marque comme fait.
function onboardingMaybeStart() {
  if (onbActive || !currentUser) return;
  // L'état du guide est propre à CHAQUE compte : un appareil où un compte
  // existant l'a déjà marqué comme fait (ou l'a quitté) ne doit pas en priver
  // un compte neuf qui s'y connecte ensuite. Changement de compte = état
  // remis à zéro (l'ancien format, sans uid, compte comme un autre compte).
  if (onb.uid !== currentUser.uid) {
    onb = { done: false, step: 0, uid: currentUser.uid };
    onbSave();
  }
  if (onb.done) return;
  const hasData = gymExerciseConfigs.length > 0 || sessionPlans.length > 0 || sessions.length > 0;
  if (hasData && !onb.started) {
    onb.done = true;
    onbSave();
    return;
  }
  onboardingStart(onb.started ? onb.step : 0);
}

function onboardingStart(fromStep) {
  // Reprise au début de la partie en cours.
  let i = Math.max(0, Math.min(fromStep || 0, ONB_STEPS.length - 1));
  while (i > 0 && !ONB_STEPS[i].start) i--;
  onb = { ...onb, done: false, started: true, step: i };
  onbBaseline();
  onbSave();
  onbActive = true;
  onbStepStartedFor = -1;
  onbBuild();
  onbLoop();
}

// Relance depuis Réglages > Apparence.
function onboardingRestart() {
  onb = { done: false, started: true, step: 0, uid: currentUser ? currentUser.uid : onb.uid };
  onboardingStart(0);
}

function onbFinish() {
  onb.done = true;
  onbActive = false;
  onbSave();
  cancelAnimationFrame(onbRaf);
  const root = document.getElementById("onb-root");
  if (root) root.remove();
}

// Confirmation dans la bulle elle-même : le guide passe au-dessus des fenêtres
// de l'app (pour guider jusque dans « Terminer l'entraînement ? »).
let onbConfirmingQuit = false;
function onbQuit() {
  onbConfirmingQuit = true;
}

function onbBuild() {
  let root = document.getElementById("onb-root");
  if (root) root.remove();
  root = document.createElement("div");
  root.id = "onb-root";
  root.innerHTML = `
    <div class="onb-block" data-onb-block="top"></div>
    <div class="onb-block" data-onb-block="bottom"></div>
    <div class="onb-block" data-onb-block="left"></div>
    <div class="onb-block" data-onb-block="right"></div>
    <div class="onb-spot"></div>
    <div class="onb-bubble" role="dialog" aria-live="polite">
      <div class="onb-part"></div>
      <div class="onb-text"></div>
      <div class="onb-actions">
        <button type="button" class="onb-quit">Quitter le guide</button>
        <span class="onb-nav">
          <button type="button" class="onb-prev">Précédent</button>
          <button type="button" class="onb-next"></button>
        </span>
      </div>
    </div>`;
  document.body.appendChild(root);
  root.querySelector(".onb-quit").addEventListener("click", () => {
    if (onbConfirmingQuit) {
      onbConfirmingQuit = false; // « Rester »
      return;
    }
    onbQuit();
  });
  root.querySelector(".onb-prev").addEventListener("click", () => {
    if (!onbConfirmingQuit) onbBack();
  });
  root.querySelector(".onb-next").addEventListener("click", (ev) => {
    if (onbConfirmingQuit) {
      onbConfirmingQuit = false;
      onbFinish();
      return;
    }
    const st = ONB_STEPS[onb.step];
    if (!st || ev.currentTarget.disabled) return;
    if (!st.next) {
      // Étape « action » : « Suivant » n'est actif qu'en revisite (action
      // déjà faite) ou quand l'élément est introuvable (garde-fou).
      if (ev.currentTarget.dataset.onbContinue === "1") {
        onbLostSince = null;
        onbAdvance();
      }
      return;
    }
    if (st.ready && !st.ready()) return;
    if (st.onNext) st.onNext();
    if (onbActive) onbAdvance();
  });
}

// « Précédent » : retour à l'étape d'avant (en sautant celles sans objet).
function onbBack() {
  let i = onb.step - 1;
  while (i > 0 && ONB_STEPS[i].skip && ONB_STEPS[i].skip()) i--;
  if (i < 0) return;
  onb.step = i;
  onbRevisit = true;
  onbLostSince = null;
  onbStepStartedFor = -1;
  onbSave();
}

function onbAdvance() {
  onbRevisit = false;
  const st = ONB_STEPS[onb.step];
  if (st && st.onDone) st.onDone();
  onb.step += 1;
  if (onb.step >= ONB_STEPS.length) return onbFinish();
  if (ONB_STEPS[onb.step].start) onbBaseline();
  onbSave();
}

const ONB_PARTS = { 1: "1/3 · Ton premier exercice", 2: "2/3 · Ton premier plan", 3: "3/3 · Lancer et enregistrer" };

function onbTargetRect(st) {
  if (!st.target) return null;
  let els = onbQ(st.target);
  els = (Array.isArray(els) ? els : [els]).filter((e) => e && e.getClientRects().length);
  if (!els.length) return null;
  const rs = els.map((e) => e.getBoundingClientRect());
  const pad = 6;
  return { el: els[0], top: Math.min(...rs.map((r) => r.top)) - pad, left: Math.min(...rs.map((r) => r.left)) - pad, bottom: Math.max(...rs.map((r) => r.bottom)) + pad, right: Math.max(...rs.map((r) => r.right)) + pad };
}

function onbLoop() {
  cancelAnimationFrame(onbRaf);
  const tick = () => {
    if (!onbActive) return;
    const root = document.getElementById("onb-root");
    if (!root) onbBuild();
    let st = ONB_STEPS[onb.step];
    // Étapes sans objet dans la situation présente (ex. pas de suggestion).
    while (st && !onbRevisit && st.skip && st.skip()) {
      onbAdvance();
      if (!onbActive) return;
      st = ONB_STEPS[onb.step];
    }
    if (onbStepStartedFor !== onb.step) {
      onbStepStartedFor = onb.step;
      if (st.enter && !onbRevisit) st.enter();
      const r0 = onbTargetRect(st);
      if (r0 && r0.el.scrollIntoView) r0.el.scrollIntoView({ block: "center", behavior: "instant" });
    }
    if (!onbRevisit && st.done && st.done()) {
      onbAdvance();
      onbRaf = requestAnimationFrame(tick);
      return;
    }
    onbPaint(st);
    onbRaf = requestAnimationFrame(tick);
  };
  onbRaf = requestAnimationFrame(tick);
}

// Garde-fou : si l'élément d'une étape « action » reste introuvable (écran
// inattendu, bouton qui n'existe pas dans cette situation…), la bulle propose
// « Continuer » au bout de ONB_LOST_MS — le guide ne doit jamais bloquer.
const ONB_LOST_MS = 2500;
let onbLostSince = null;
function onbPaint(st) {
  const root = document.getElementById("onb-root");
  const W = window.innerWidth, H = window.innerHeight;
  const r = onbTargetRect(st);
  const lost = !!st.target && !r;
  if (!lost) onbLostSince = null;
  else if (onbLostSince === null) onbLostSince = Date.now();
  const offerContinue = lost && Date.now() - onbLostSince > ONB_LOST_MS;
  const set = (el, css) => Object.assign(el.style, css);
  const blocks = {};
  root.querySelectorAll("[data-onb-block]").forEach((b) => (blocks[b.dataset.onbBlock] = b));
  const spot = root.querySelector(".onb-spot");
  if (r) {
    const t = Math.max(0, r.top), btm = Math.min(H, r.bottom), l = Math.max(0, r.left), rt = Math.min(W, r.right);
    set(blocks.top, { top: "0px", left: "0px", width: W + "px", height: t + "px" });
    set(blocks.bottom, { top: btm + "px", left: "0px", width: W + "px", height: Math.max(0, H - btm) + "px" });
    set(blocks.left, { top: t + "px", left: "0px", width: l + "px", height: Math.max(0, btm - t) + "px" });
    set(blocks.right, { top: t + "px", left: rt + "px", width: Math.max(0, W - rt) + "px", height: Math.max(0, btm - t) + "px" });
    set(spot, { display: "block", top: t + "px", left: l + "px", width: Math.max(0, rt - l) + "px", height: Math.max(0, btm - t) + "px" });
  } else {
    set(blocks.top, { top: "0px", left: "0px", width: W + "px", height: H + "px" });
    ["bottom", "left", "right"].forEach((k) => set(blocks[k], { width: "0px", height: "0px" }));
    set(spot, { display: "none" });
  }
  root.classList.toggle("onb-no-target", !r);
  const bubble = root.querySelector(".onb-bubble");
  const text = onbConfirmingQuit ? "Quitter le guide ? Tu pourras le relancer depuis Réglages > Apparence > Guide de démarrage." : typeof st.text === "function" ? st.text() : st.text;
  const txtEl = bubble.querySelector(".onb-text");
  if (txtEl.textContent !== text) txtEl.textContent = text;
  bubble.querySelector(".onb-part").textContent = ONB_PARTS[st.part];
  const nextBtn = bubble.querySelector(".onb-next");
  const prevBtn = bubble.querySelector(".onb-prev");
  const quitBtn = bubble.querySelector(".onb-quit");
  quitBtn.textContent = onbConfirmingQuit ? "Rester" : "Quitter le guide";
  // « Précédent » partout sauf à la toute première étape.
  prevBtn.hidden = onbConfirmingQuit || onb.step === 0;
  nextBtn.hidden = false;
  nextBtn.dataset.onbContinue = "";
  if (onbConfirmingQuit) {
    nextBtn.textContent = "Quitter";
    nextBtn.disabled = false;
  } else if (st.next) {
    nextBtn.textContent = st.next;
    nextBtn.disabled = !!(st.ready && !st.ready());
  } else {
    // Étape « action » : « Suivant » grisé — c'est l'action demandée qui fait
    // avancer — sauf en revisite ou si l'élément reste introuvable.
    nextBtn.textContent = "Suivant";
    const free = onbRevisit || offerContinue;
    nextBtn.disabled = !free;
    nextBtn.dataset.onbContinue = free ? "1" : "";
  }
  // Bulle sous la zone éclairée s'il y a la place, sinon au-dessus ; au
  // centre s'il n'y a rien à éclairer.
  const bw = Math.min(360, W - 24);
  const bh = bubble.offsetHeight || 140;
  let top;
  if (!r) top = (H - bh) / 2;
  else if (H - r.bottom >= bh + 16) top = r.bottom + 10;
  else if (r.top >= bh + 16) top = r.top - bh - 10;
  else top = Math.max(12, H - bh - 12);
  set(bubble, { width: bw + "px", left: (W - bw) / 2 + "px", top: Math.max(12, top) + "px" });
}
