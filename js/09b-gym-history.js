/* ---------- Détail d'un exercice dans une séance (historique, calendrier) ----------
   Remplace les anciennes barres (setBarsHTML), jugées trop « graphique » : peu
   lisibles et sans rapport avec ce qu'on fait à la salle. Chaque série est
   désormais dessinée comme l'objet qu'on a réellement manipulé :
     - Muscu, selon le « Type de poids » de Réglages > Exercices (déduit du
       nom par défaut, voir resolveGymEquipment) :
         machine    la pile de plaques, broche sur le palier choisi et, si
                    l'incrément a été ajouté (weightMode "on"), le petit poids
                    posé sur la pile ;
         barre      la barre avec ses disques (couleurs de compétition) ;
         haltères / kettlebell  deux objets, ou un seul du côté travaillé ;
       pour un exercice unilatéral, le côté travaillé (gauche/droite) ;
     - Cardio (Rameur, Vélo, Course) : un couloir dont la longueur est la
       durée, un repère par minute (ou par 5/10 min pour les longues séries) ;
     - Gainage en boucle : la frise des tours, travail plein / repos en creux.
   À droite, les chiffres en gros (×10, 10min) et le poids — sans pastille de
   progression entre deux séries (essayée puis retirée : non souhaitée).
   Le repos entre les séries n'est volontairement plus affiché ici (il
   éloignait les séries les unes des autres sans rien apporter à la lecture) ;
   il reste enregistré et visible ailleurs.
   accentColor : couleur d'activité imposée (calendrier partagé), sinon la
   teinte du module (--accent). */
function gxNum(n) {
  return String(Math.round(n * 100) / 100).replace(".", ",");
}
function gxSide(s) {
  return s.side === "left" || s.side === "right" ? s.side : null;
}

function exerciseDetailHTML(ex, accentColor) {
  let rows;
  if (ex.loop) rows = gxLoopRowHTML(ex.loop);
  else if ((ex.exType || "muscu") === "cardio") rows = gxCardioRowsHTML(ex);
  else rows = gxMuscuRowsHTML(ex);
  if (!rows) return "";
  const style = accentColor ? ` style="--gx-accent:${accentColor};"` : "";
  return `<div class="gx-sets"${style}>${rows}</div>`;
}

function gxRowHTML(n, visualHTML, label, big, sub) {
  return `
  <div class="gx-row">
    <div class="gx-n">${n}</div>
    <div class="gx-visual" role="img" aria-label="${label}">${visualHTML}</div>
    <div class="gx-figures">
      <div class="gx-big">${big}</div>
      ${sub ? `<div class="gx-sub">${sub}</div>` : ""}
    </div>
  </div>`;
}

// Pile de plaques d'une machine. Les paliers connus (config) donnent une
// plaque par palier et la broche sur celui de la série ; sans config (ou un
// poids qui ne correspond à aucun palier, config modifiée depuis), la pile est
// approchée en proportion du poids le plus lourd de l'exercice.
function gxStackHTML(base, total, plus, paliers, maxTotal) {
  const idx = paliers.findIndex((p) => Math.abs(p - base) < 0.01);
  let count, pinAt;
  if (idx >= 0) {
    count = paliers.length;
    pinAt = idx;
  } else {
    count = 12;
    pinAt = maxTotal > 0 ? Math.max(1, Math.round((count * total) / maxTotal)) - 1 : 0;
  }
  let slats = "";
  for (let k = 0; k < count; k++) {
    const cls = k < pinAt ? "on" : k === pinAt ? `pin${plus ? " plus" : ""}` : "";
    slats += `<span class="gx-slat ${cls}"></span>`;
  }
  return `<div class="gx-stack">${slats}</div>`;
}

// Barre : disques de chaque côté, couleurs des disques de compétition (une
// couleur = toujours le même poids, partout dans l'app), barre de 20 kg.
const GX_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
function gxPlateClass(kg) {
  return "p" + String(kg).replace(".", "-");
}
function gxBarbellHTML(total) {
  let side = Math.max(0, (total - 20) / 2);
  const plates = [];
  for (const kg of GX_PLATES) {
    while (side >= kg - 0.001) {
      plates.push(kg);
      side -= kg;
    }
  }
  const right = plates.map((kg) => `<span class="gx-plate ${gxPlateClass(kg)}"></span>`).join("");
  const left = [...plates].reverse().map((kg) => `<span class="gx-plate ${gxPlateClass(kg)}"></span>`).join("");
  return `<div class="gx-barbell"><span class="gx-bar-end"></span>${left}<span class="gx-collar"></span><span class="gx-shaft"></span><span class="gx-collar"></span>${right}<span class="gx-bar-end"></span></div>`;
}
// Haltère : plus il est lourd, plus il porte de disques (un de plus tous les
// 2,5 kg : 6 kg = 2, 8 kg = 3, 10 kg = 4…, plafonné à 5 de chaque côté), plus
// ses disques sont hauts (+2 px par kg) et plus sa poignée est longue — 8 et
// 10 kg se distinguent d'un coup d'œil, sans lire le chiffre. Échelle fixe :
// un 10 kg a la même allure dans toutes les séances. Disques sans code
// couleur : ils ne correspondent pas à des poids réels, contrairement à ceux
// de la barre.
function gxDumbbellHTML(kg) {
  const count = Math.max(1, Math.min(5, Math.round(kg / 2.5)));
  const h = Math.max(18, Math.min(54, Math.round(14 + kg * 2.2)));
  const discs = [];
  for (let i = 0; i < count; i++) discs.push(Math.round(h * Math.pow(0.9, i)));
  const disc = (dh) => `<span class="gx-db-disc" style="height:${dh}px;"></span>`;
  const side = discs.map(disc).join("");
  const handle = Math.round(14 + Math.min(kg, 20) * 0.6);
  return `<span class="gx-dumbbell">${[...discs].reverse().map(disc).join("")}<span class="gx-db-handle" style="width:${handle}px;"></span>${side}</span>`;
}
// Kettlebell : la couleur des disques quand le poids en a une (20 kg = bleu),
// sinon neutre ; le poids est écrit dessus.
function gxKettlebellHTML(kg) {
  const size = Math.min(44, Math.round(22 + kg * 0.9));
  const coded = GX_PLATES.slice(0, 5).some((p) => Math.abs(p - kg) < 0.01);
  const cls = coded ? gxPlateClass(Math.round(kg)) : "neutral";
  return `<span class="gx-kb ${cls}"><span class="gx-kb-handle" style="width:${Math.round(size * 0.62)}px;"></span><span class="gx-kb-body" style="width:${size}px;height:${size}px;">${gxNum(kg)}</span></span>`;
}
// Haltères et kettlebells se tiennent à la main : deux pour une série « les
// deux côtés », un seul du côté travaillé pour une série unilatérale (l'autre
// main en pointillés).
function gxHandheldHTML(objHTML, ghostHTML, side) {
  if (!side) return `<div class="gx-pair">${objHTML}${objHTML}</div>`;
  const slot = (code, name) =>
    `<div class="gx-slot ${side === code ? "on" : ""}">${side === code ? objHTML : ghostHTML}<span class="gx-slot-label">${name}</span></div>`;
  return `<div class="gx-pair">${slot("left", "gauche")}${slot("right", "droite")}</div>`;
}

function gxMuscuRowsHTML(ex) {
  if (!ex.sets.length) return "";
  const config = findExerciseConfig(ex.name);
  const equipment = resolveGymEquipment(config, ex.name);
  const paliers = config ? computeBaseWeightsOnly(config) : [];
  const inc = config && config.maxIncrement > 0 ? config.maxIncrement : 0;
  const totals = ex.sets.map((s) => parseFloat(s.weight) || 0);
  const maxTotal = Math.max(...totals, 0);
  const has = (w) => paliers.some((p) => Math.abs(p - w) < 0.01);
  const handheld = equipment === "halteres" || equipment === "kettlebell";
  return ex.sets
    .map((s, i) => {
      const total = totals[i];
      const reps = parseFloat(s.reps) || 0;
      // Ancienne série sans weightMode : déduit comme dans Créer (poids qui
      // n'est pas un palier, mais l'est une fois l'incrément retiré).
      const plus = inc > 0 && (s.weightMode === "on" || (!s.weightMode && !has(total) && has(total - inc)));
      const base = plus ? Math.round((total - inc) * 100) / 100 : total;
      const side = gxSide(s);
      const sideName = side === "left" ? "gauche" : side === "right" ? "droite" : "";
      const sidesHTML = side
        ? `<div class="gx-sides"><span class="${side === "left" ? "on" : ""}">gauche</span><span class="${side === "right" ? "on" : ""}">droite</span></div>`
        : "";
      let visual;
      if (total <= 0) visual = `<div class="gx-bodyweight">Poids du corps</div>` + sidesHTML;
      else if (equipment === "barre") visual = gxBarbellHTML(total) + sidesHTML;
      else if (equipment === "halteres") visual = gxHandheldHTML(gxDumbbellHTML(total), `<span class="gx-ghost db"></span>`, side);
      else if (equipment === "kettlebell") visual = gxHandheldHTML(gxKettlebellHTML(total), `<span class="gx-ghost kb"></span>`, side);
      else visual = gxStackHTML(base, total, plus, paliers, maxTotal) + sidesHTML;
      const weightText = plus ? `${gxNum(base)} + ${gxNum(inc)}kg` : `${gxNum(total)}kg`;
      // Deux haltères/kettlebells : le poids est celui de CHACUN (8 kg par main,
      // pas 16 kg au total) — « 2 × 8kg » se lisait comme une somme à faire.
      const each = equipment === "kettlebell" ? "chacune" : "chacun";
      const sub = total <= 0 ? "" : handheld && !side ? `${weightText} ${each}` : weightText;
      const what = { barre: "barre chargée à", halteres: side ? "un haltère de" : "un haltère dans chaque main, de", kettlebell: side ? "une kettlebell de" : "une kettlebell dans chaque main, de", machine: "machine à" }[equipment];
      const label =
        `${reps} répétitions` +
        (total > 0 ? `, ${what} ${gxNum(total)} kg` + (plus ? ` (${gxNum(base)} kg plus ${gxNum(inc)} kg ajoutés)` : "") : ", poids du corps") +
        (sideName ? `, côté ${sideName}` : "");
      return gxRowHTML(i + 1, visual, label, `×${gxNum(reps)}`, sub);
    })
    .join("");
}

// Cardio : weight = durée (minutes décimales), reps = distance (km), voir
// formatSetChip. Le couloir le plus long est la série la plus longue.
const GX_CARDIO_ICONS = { rameur: "rower", velo: "bike", course: "stopwatch", gainage: "plank" };
function gxCardioRowsHTML(ex) {
  if (!ex.sets.length) return "";
  const mins = ex.sets.map((s) => parseFloat(s.weight) || 0);
  const maxMin = Math.max(...mins, 0);
  const step = maxMin <= 20 ? 1 : maxMin <= 60 ? 5 : 10;
  // Micro-animation de 2 s (un coup de rame, un tour de pédalier, un tour de
  // chronomètre), puis figée — voir 09c-anim-icons.js.
  const icon = animIconHTML(Object.prototype.hasOwnProperty.call(GX_CARDIO_ICONS, ex.category) ? GX_CARDIO_ICONS[ex.category] : "stopwatch", { anim: "once", size: 18 });
  return ex.sets
    .map((s, i) => {
      const min = mins[i];
      const km = parseFloat(s.reps) || 0;
      const pct = maxMin > 0 ? Math.round((100 * min) / maxMin) : 0;
      let ticks = "";
      for (let t = step; t < maxMin; t += step) {
        const at = (100 * t) / maxMin;
        ticks += `<span class="gx-tick ${at < pct ? "in" : ""}" style="left:${at.toFixed(2)}%;"></span>`;
      }
      const visual = `
      <div class="gx-lane">
        <div class="gx-lane-fill" style="width:${pct}%;"></div>
        ${ticks}
        ${pct > 0 ? `<span class="gx-lane-icon" style="left:${pct}%;">${icon}</span>` : ""}
      </div>`;
      const duration = formatCardioDuration(min);
      const label = `${duration}${km ? `, ${gxNum(km)} km` : ""}, un repère toutes les ${step === 1 ? "minutes" : step + " minutes"}`;
      return gxRowHTML(i + 1, visual, label, duration, km ? `${gxNum(km)} km` : "");
    })
    .join("");
}

// Gainage en boucle : une frise par tour, travail (plein) puis repos (creux).
function gxLoopRowHTML(loop) {
  const rounds = Math.max(0, parseInt(loop.rounds, 10) || 0);
  if (!rounds) return "";
  const work = Math.max(0, parseInt(loop.workSec, 10) || 0);
  const rest = Math.max(0, parseInt(loop.restSec, 10) || 0);
  let strip = "";
  for (let r = 0; r < rounds; r++) {
    strip += `<span class="gx-loop-work" style="flex-grow:${work || 1};"></span>`;
    if (rest && r < rounds - 1) strip += `<span class="gx-loop-rest" style="flex-grow:${rest};"></span>`;
  }
  const label = `${rounds} tours de ${work} secondes de travail et ${rest} secondes de repos`;
  // La planche au bout de la frise : micro-animation de 2 s puis figée, comme
  // l'icône au bout d'un couloir de cardio.
  const icon = `<span class="gx-lane-icon" style="left:100%;">${animIconHTML("plank", { anim: "once", size: 18 })}</span>`;
  return gxRowHTML(1, `<div class="gx-loop">${strip}${icon}</div>`, label, `${rounds} tours`, `${work}s / ${rest}s`);
}

function sessionCardHTML(s) {
  const open = !!openHistoryIds[s.id];
  const justLanded = justLandedItemId === s.id;
  if (justLanded) justLandedItemId = null;
  const exHTML = s.exercises
    .map(
      (ex) => `
  <div>
    <div class="history-ex-name">${ex.name}${getExerciseDurationSeconds(ex) != null ? ` <span style="color:var(--text-dim); font-weight:600;">· ${formatLiveDuration(getExerciseDurationSeconds(ex))}</span>` : ""}</div>
    ${exerciseDetailHTML(ex)}
  </div>`
    )
    .join("");
  const durationLabel = getSessionDurationSeconds(s) != null ? `${formatLiveDuration(getSessionDurationSeconds(s))} · ` : "";
  const cardHTML = `
  <div class="history-card ${justLanded ? "just-landed" : ""}">
    <div class="history-head" data-toggle="${s.id}">
      <div class="history-row-icon">${ICONS.dumbbell}</div>
      <div class="history-head-left">
        <div class="history-date">${s.label || formatDateFR(s.date)}</div>
        <div class="history-label">${formatDateFR(s.date)} · ${s.exercises.length} exo${s.exercises.length !== 1 ? "s" : ""}${durationLabel ? " · " + durationLabel.replace(" · ", "") : ""}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="chev ${open ? "open" : ""}">${ICONS.chevron}</span>
      </div>
    </div>
    ${
      open
        ? `<div class="history-body">${exHTML}</div>
           <div class="delete-row">
             <button class="edit-link" data-edit-session="${s.id}">${ICONS.edit} Modifier</button>
             <button class="edit-link" data-duplicate-session="${s.id}">${ICONS.duplicate} Dupliquer</button>
             <button class="edit-link" data-convert-session="${s.id}">${ICONS.stopwatch} Convertir en plan</button>
             <button class="edit-link" data-share-session="${s.id}">${ICONS.up} Partager</button>
             <button class="delete-link" data-delete-session="${s.id}">${ICONS.trash} Supprimer</button>
           </div>`
        : ""
    }
  </div>`;
  // Le glissé (voir wrapSwipeToDeleteRow) ne s'active que carte repliée —
  // dépliée, le bloc est trop grand pour qu'un glissement reste naturel,
  // et le bouton "Supprimer" ci-dessus reprend le relais à sa place.
  return open ? cardHTML : wrapSwipeToDeleteRow(s.id, cardHTML);
}

// Résumé compact d'un exercice de plan : séries cibles pour Muscu/Rameur/
// Vélo/Course, ou tours×travail/repos pour une config de boucle (Gainage).
function planExerciseSummary(ex) {
  if (ex.loop) return `${ex.loop.rounds}×${ex.loop.workSec}s/${ex.loop.restSec}s`;
  return formatSetsSummary(ex.exType, ex.sets);
}

function planCardHTML(plan) {
  const open = !!openHistoryIds[plan.id];
  const justLanded = justLandedItemId === plan.id;
  if (justLanded) justLandedItemId = null;
  const exHTML = plan.exercises
    .map((ex) => `<div class="history-ex-name">${ex.name} <span style="color:var(--text-dim); font-weight:600;">· ${planExerciseSummary(ex)}</span></div>`)
    .join("");
  const cardHTML = `
  <div class="history-card ${justLanded ? "just-landed" : ""}">
    <div class="history-head" data-toggle="${plan.id}">
      <div class="history-head-left">
        <div class="history-date">${plan.label}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="history-meta">${plan.exercises.length} exo${plan.exercises.length !== 1 ? "s" : ""}</div>
        <span class="chev ${open ? "open" : ""}">${ICONS.chevron}</span>
      </div>
    </div>
    ${
      open
        ? `<div class="history-body">${exHTML}</div>
           <div class="delete-row">
             <button class="edit-link" data-edit-plan="${plan.id}">${ICONS.edit} Modifier</button>
             <button class="edit-link" data-duplicate-plan="${plan.id}">${ICONS.duplicate} Dupliquer</button>
             <button class="edit-link" data-convert-plan="${plan.id}">${ICONS.dumbbell} Convertir en séance</button>
             <button class="delete-link" data-delete-plan="${plan.id}">${ICONS.trash} Supprimer</button>
           </div>`
        : ""
    }
  </div>`;
  return open ? cardHTML : wrapSwipeToDeleteRow(plan.id, cardHTML);
}

function plansListHTML() {
  if (sessionPlans.length === 0) {
    return `<div class="empty-state"><div class="bar-icon">${ICONS.history}</div>Aucun plan préparé pour l'instant.<br>Touche « Ajouter un plan » pour en préparer un.</div>`;
  }
  return sessionPlans.map(planCardHTML).join("");
}

function historyTabHTML() {
  const sorted = [...sessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  // Le choix Séances/Plans est désormais porté par le grand sélecteur en
  // haut du module (voir renderGymApp) — cet onglet se contente d'en
  // refléter le mode courant, plus de bascule locale qui ferait doublon.
  if (gymTopMode === "plan") {
    return plansListHTML();
  }

  if (sorted.length === 0) {
    return `<div class="empty-state"><div class="bar-icon">${ICONS.history}</div>Aucune séance enregistrée pour l'instant.<br>Touche « Ajouter une séance » pour la première.</div>`;
  }
  // Toutes les séances sont traitées pareil, qu'elles soient datées dans le
  // passé ou le futur — plus de distinction "à venir" séparée, dépassée
  // depuis l'arrivée des Plans (voir le grand sélecteur en haut du module).
  return sorted.map(sessionCardHTML).join("");
}


// Partagée entre le glissé (carte repliée) et le bouton "Supprimer" de la
// rangée d'actions (carte dépliée, voir sessionCardHTML/planCardHTML) —
// même confirmation, même animation de disparition, peu importe le chemin.
function deleteGymSessionOrPlan(id, cardEl) {
  // Le mode du grand sélecteur du haut (Séance/Plan) dit lequel des deux
  // on regarde — les deux se ressemblent trop pour se fier à autre chose.
  const isSession = gymTopMode === "session";
  if (isSession) {
    showConfirm(
      "Supprimer définitivement cette séance ? Cette action est irréversible.",
      () => {
        animateCardRemoval(cardEl, () => {
          sessions = sessions.filter((s) => s.id !== id);
          saveJSON(KEYS.sessions, sessions);
          renderContent();
        });
      },
      { confirmLabel: "Supprimer", danger: true }
    );
  } else {
    showConfirm(
      "Supprimer définitivement ce plan ? Cette action est irréversible.",
      () => {
        animateCardRemoval(cardEl, () => {
          sessionPlans = sessionPlans.filter((p) => p.id !== id);
          saveJSON(KEYS.sessionPlans, sessionPlans);
          renderContent();
        });
      },
      { confirmLabel: "Supprimer", danger: true }
    );
  }
}

function attachHistoryListeners() {
  initSwipeToDelete(document.getElementById("content"), deleteGymSessionOrPlan);
  document.querySelectorAll("[data-delete-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteGymSessionOrPlan(btn.dataset.deleteSession, btn.closest(".history-card"));
    });
  });
  document.querySelectorAll("[data-delete-plan]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      deleteGymSessionOrPlan(btn.dataset.deletePlan, btn.closest(".history-card"));
    });
  });
  document.querySelectorAll("[data-edit-plan]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const plan = sessionPlans.find((p) => p.id === btn.dataset.editPlan);
      if (plan) startEditPlan(plan);
    });
  });
  document.querySelectorAll("[data-duplicate-plan]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const plan = sessionPlans.find((p) => p.id === btn.dataset.duplicatePlan);
      if (plan) duplicatePlan(plan);
    });
  });
  document.querySelectorAll("[data-convert-plan]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const plan = sessionPlans.find((p) => p.id === btn.dataset.convertPlan);
      if (plan) convertPlanToSession(plan);
    });
  });
  document.querySelectorAll("[data-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.toggle;
      openHistoryIds[id] = !openHistoryIds[id];
      renderContent();
    });
  });
  document.querySelectorAll("[data-share-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = sessions.find((s) => s.id === btn.dataset.shareSession);
      if (session) exportSingleSession("gym", session);
    });
  });
  document.querySelectorAll("[data-edit-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = sessions.find((s) => s.id === btn.dataset.editSession);
      if (session) startEditSession(session);
    });
  });
  document.querySelectorAll("[data-duplicate-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = sessions.find((s) => s.id === btn.dataset.duplicateSession);
      if (session) duplicateSession(session);
    });
  });
  document.querySelectorAll("[data-convert-session]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const session = sessions.find((s) => s.id === btn.dataset.convertSession);
      if (session) convertSessionToPlan(session);
    });
  });
}
