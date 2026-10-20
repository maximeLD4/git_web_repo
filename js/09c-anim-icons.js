/* ---------- Icônes animées : Rameur, Vélo, Natation, Course, Gainage, Repos ----------
   D'après les maquettes animées fournies (rameur.gif, velo.gif, natation.gif,
   chronometre.gif, gainage.gif, repos.gif). Plutôt que les GIF eux-mêmes (noirs en dur, donc invisibles
   en mode Nuit et hors palette en mode Anne, lourds, impossibles à figer
   proprement), chaque mouvement est recalculé ici en traits SVG, dans le style
   des autres icônes (grille 24, trait 2, currentColor) : il suit le thème et ne
   pèse rien.
     rower      rameur : d'après le dessin fourni (jambes tendues) ; retour vers
                l'attaque puis nouvelle poussée — jambes, dos, bras ;
     bike       vélo : pédalage (genou, pied sur le pédalier), roues qui tournent ;
     swim       natation : les deux vagues avancent ;
     stopwatch  course : l'aiguille du chronomètre fait le tour du cadran ;
     plank      gainage : planche, les hanches s'affaissent, une goutte de sueur ;
     rest       repos : penché, mains sur les genoux, on reprend son souffle.
   Chaque icône s'affiche de trois façons (animIconHTML) :
     "none"  fixe (sa pose de départ) — c'est aussi ICONS.<nom>, utilisé partout ;
     "once"  une micro-animation de 2 s puis figée sur la pose de départ
             (consulter une séance : Historique, Calendrier) ;
     "loop"  en continu (série en cours en Séance en direct).
   Aucune animation si l'appareil demande moins de mouvement
   (prefers-reduced-motion) : la pose fixe à la place. */

const ANIM_ICON_ONCE_MS = 2000;
const animFmt = (n) => Math.round(n * 100) / 100;
const animPts = (...pts) => pts.map((q) => `${animFmt(q[0])},${animFmt(q[1])}`).join(" ");
function animEase(x) {
  return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
}
// Articulation à deux segments (genou, coude) : position du point du milieu.
// side = -1 / +1 : de quel côté de la ligne a → b l'articulation se plie.
function animJoint(a, b, l1, l2, side) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.max(0.01, Math.min(Math.hypot(dx, dy), l1 + l2 - 0.001));
  const t = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ang = Math.atan2(dy, dx) + side * t;
  return [a[0] + l1 * Math.cos(ang), a[1] + l1 * Math.sin(ang)];
}
// Trois rayons d'une roue, tournés de deg degrés (sens horaire).
function animSpokes(c, r, deg) {
  let d = "";
  for (let k = 0; k < 3; k++) {
    const a = ((deg + k * 120) * Math.PI) / 180;
    d += `M${c[0]} ${c[1]}L${animFmt(c[0] + r * Math.cos(a))} ${animFmt(c[1] + r * Math.sin(a))}`;
  }
  return d;
}

/* ---- Rameur ---- */
// Dessin fixe fourni (icone-rameur-jambes-tendues.svg) : fin de la poussée,
// jambes tendues, dos en arrière, poignée tirée au ventre. Cette pose est
// reproduite EXACTEMENT à p = 0 ; l'animation repart de là (retour vers
// l'attaque, puis nouvelle poussée) et s'y fige. Longueurs des segments
// mesurées sur le dessin.
const ROWER_ANCHOR = [17.77, 14.68]; // sortie de la chaîne, sur la roue
const ROWER_WHEEL = [19.63, 16.28];
const ROWER_FOOT = [16.68, 16.28];
const ROWER_HIP_Y = 16.7;
const ROWER_HIP_X_FINISH = 6.39;
const ROWER_THIGH = 5.732;
const ROWER_SHIN = 5.149;
const ROWER_ARM = 2.526; // bras = avant-bras
const ROWER_LEAN_FINISH = -20; // degrés, en arrière
const ROWER_HAND_FINISH = [2.7, 1.09]; // poignée tirée, relativement à l'épaule
// Pose à la phase s du coup de rame (0 = attaque, jambes pliées ; 0,4 = fin de
// la poussée = le dessin fixe ; retour ensuite dans l'ordre inverse : bras,
// dos, jambes).
function rowerPose(sPhase) {
  let legs, back, arms;
  if (sPhase < 0.4) {
    legs = animEase(sPhase / 0.25);
    back = animEase((sPhase - 0.1) / 0.2);
    arms = animEase((sPhase - 0.2) / 0.2);
  } else {
    const q = (sPhase - 0.4) / 0.6;
    arms = 1 - animEase(q / 0.35);
    back = 1 - animEase((q - 0.2) / 0.35);
    legs = 1 - animEase((q - 0.4) / 0.6);
  }
  const hip = [ROWER_HIP_X_FINISH + 4.2 * (1 - legs), ROWER_HIP_Y];
  const knee = animJoint(hip, ROWER_FOOT, ROWER_THIGH, ROWER_SHIN, -1);
  const a = ((ROWER_LEAN_FINISH + 44 * (1 - back)) * Math.PI) / 180;
  const dir = [Math.sin(a), -Math.cos(a)];
  const shoulder = [hip[0] + dir[0] * 4.63, hip[1] + dir[1] * 4.63];
  const neck = [hip[0] + dir[0] * 6.74, hip[1] + dir[1] * 6.74];
  const head = [hip[0] + dir[0] * 8.85, hip[1] + dir[1] * 8.85];
  const v = [ROWER_ANCHOR[0] - shoulder[0], ROWER_ANCHOR[1] - shoulder[1]];
  const vl = Math.hypot(v[0], v[1]);
  const reach = Math.min(2 * ROWER_ARM - 0.15, vl - 0.3);
  const straight = [shoulder[0] + (v[0] / vl) * reach, shoulder[1] + (v[1] / vl) * reach];
  const bent = [shoulder[0] + ROWER_HAND_FINISH[0], shoulder[1] + ROWER_HAND_FINISH[1]];
  const hand = [straight[0] + (bent[0] - straight[0]) * arms, straight[1] + (bent[1] - straight[1]) * arms];
  const elbow = animJoint(shoulder, hand, ROWER_ARM, ROWER_ARM, 1);
  return { seatX: hip[0] - 0.08, hip, knee, shoulder, neck, head, elbow, hand };
}
// p : 0 = la pose du dessin fixe (fin de la poussée).
function rowerAttrs(p) {
  const s = rowerPose((p + 0.4) % 1);
  return {
    seat: { points: animPts([s.seatX - 1.18, 17.8], [s.seatX + 1.18, 17.8]) },
    post: { points: animPts([s.seatX, 17.8], [s.seatX, 20.5]) },
    legs: { points: animPts(s.hip, s.knee, ROWER_FOOT) },
    torso: { points: animPts(s.hip, s.neck) },
    head: { cx: animFmt(s.head[0]), cy: animFmt(s.head[1]) },
    arms: { points: animPts(s.shoulder, s.elbow, s.hand) },
    chain: { points: animPts(s.hand, ROWER_ANCHOR) },
  };
}

/* ---- Vélo ---- */
// Bonhomme bâton (d'après velo.gif) : tête pleine, buste, bras au guidon,
// sur deux roues à trois rayons. Il pédale (le genou monte et descend, le
// pied tourne autour du pédalier, le buste suit à peine) et les roues
// tournent. (2.92.0 l'avait remplacé par une silhouette pleine ; retour au
// bonhomme bâton en 2.93.0, plus sympathique et dans le style des autres.)
const BIKE_WHEELS = [[5.5, 17.5], [18.5, 17.5]];
const BIKE_CRANK = [12.4, 15.9]; // axe du pédalier
const BIKE_HIP = [8.8, 10.8];
// Pose à l'instant p d'un tour de pédalier (0 = pied en bas).
function bikePose(p) {
  const a = Math.PI / 2 + 2 * Math.PI * p; // sens horaire, comme la roue
  const foot = [BIKE_CRANK[0] + 1.8 * Math.cos(a), BIKE_CRANK[1] + 1.8 * Math.sin(a)];
  // Le buste suit très légèrement le pédalage.
  const bob = 0.15 * Math.sin(2 * a);
  const hip = [BIKE_HIP[0], BIKE_HIP[1] + bob];
  const knee = animJoint(hip, foot, 4.1, 4.1, -1);
  return { hip, knee, foot, bob };
}
function bikeAttrs(p, wheelDeg) {
  const s = bikePose(p);
  const sh = [13.2, 7.6 + s.bob];
  return {
    legs: { points: animPts(s.hip, s.knee, s.foot) },
    torso: { points: animPts(s.hip, sh) },
    arms: { points: animPts(sh, [15, 10.3 + s.bob * 0.5], [17, 10.4]) },
    head: { cy: animFmt(5 + s.bob) },
    spokesBack: { d: animSpokes(BIKE_WHEELS[0], 2, wheelDeg || 0) },
    spokesFront: { d: animSpokes(BIKE_WHEELS[1], 2, wheelDeg || 0) },
  };
}

/* ---- Natation ---- */
// Les deux vagues avancent d'une longueur d'onde par cycle.
function swimWave(y0, p) {
  const pts = [];
  for (let x = 2; x <= 22.001; x += 0.25) pts.push([x, y0 - 0.95 * Math.sin((2 * Math.PI * (x - 2)) / 8.4 - 2 * Math.PI * p)]);
  return "M" + pts.map((q) => `${animFmt(q[0])} ${animFmt(q[1])}`).join("L");
}
function swimAttrs(p) {
  return { waveTop: { d: swimWave(11, p) }, waveBottom: { d: swimWave(16, p) } };
}

/* ---- Course (chronomètre) ---- */
// L'aiguille fait un tour de cadran par cycle ; la petite aiguille reste.
function stopwatchAttrs(p) {
  const a = 2 * Math.PI * p;
  return { needle: { points: animPts([12, 13], [12 + 4 * Math.sin(a), 13 - 4 * Math.cos(a)]) } };
}

/* ---- Gainage (planche) ---- */
// Planche sur les avant-bras, de profil : les pieds à gauche, la tête à droite.
// Au fil de l'effort, les hanches s'affaissent un peu et tremblent, puis une
// goutte de sueur perle au front et tombe ; tout revient en place en fin de cycle.
const PLANK_FEET = [3.6, 19];
const PLANK_SHOULDER = [17, 13.1];
function plankAttrs(p) {
  const effort = Math.pow(Math.sin(Math.PI * p), 2); // 0 → 1 → 0
  const tremble = 0.07 * Math.sin(2 * Math.PI * 9 * p) * effort;
  const hip = [7.4, 17.33 + 0.6 * effort + tremble];
  const drop = p > 0.3 && p < 0.88 ? (p - 0.3) / 0.58 : 0;
  const dy = 12.9 + 5.2 * drop * drop;
  return {
    body: { points: animPts(PLANK_FEET, hip, PLANK_SHOULDER) },
    sweat: {
      transform: `translate(21.3 ${animFmt(dy)})`,
      opacity: drop > 0 ? animFmt(Math.min(1, drop * 6, (1 - drop) * 5)) : 0,
    },
  };
}

/* ---- Repos ---- */
// Penché en avant, mains sur les genoux, on reprend son souffle : le buste et
// la tête se soulèvent à l'inspiration et redescendent à l'expiration (les
// jambes ne bougent pas, les bras se tendent quand le buste monte).
const REST_HIP = [7.3, 10.7];
const REST_KNEE = [11.5, 14.4];
const REST_FOOT = [9.2, 19];
function restAttrs(p) {
  // Respiration : montée rapide, tenue, descente plus lente (comme dans le GIF).
  const b = p < 0.35 ? animEase(p / 0.35) : p < 0.5 ? 1 : 1 - animEase((p - 0.5) / 0.5);
  const neck = [13.6 - 0.25 * b, 8.6 - 1.0 * b];
  const head = [15.4 - 0.2 * b, 9 - 1.05 * b];
  const shoulder = [REST_HIP[0] + 0.72 * (neck[0] - REST_HIP[0]), REST_HIP[1] + 0.72 * (neck[1] - REST_HIP[1])];
  const hand = [11.6, 14.1];
  const elbow = animJoint(shoulder, hand, 2.95, 2.95, 1);
  return {
    torso: { points: animPts(REST_HIP, neck) },
    head: { cx: animFmt(head[0]), cy: animFmt(head[1]) },
    arms: { points: animPts(shoulder, elbow, hand) },
  };
}

// Chaque icône : ses parties fixes, ses parties mobiles (nom, balise, attributs
// en plus), sa fonction de pose, la durée d'un cycle en boucle et la rotation
// des roues (une micro-animation de 2 s = un cycle, roues lancées puis freinées).
const ANIM_ICONS = {
  rower: {
    fixed: `<path d="M1.93 20.5h20.23"/><circle cx="${ROWER_WHEEL[0]}" cy="${ROWER_WHEEL[1]}" r="2.53"/>`,
    parts: [["chain", "polyline", 'stroke-width="1"'], ["post", "polyline", 'stroke-width="1.4"'], ["seat", "polyline"], ["legs", "polyline"], ["torso", "polyline"], ["arms", "polyline"], ["head", "circle", 'r="1.52"']],
    attrs: rowerAttrs,
    loopMs: 1800, // ~33 coups par minute
  },
  bike: {
    fixed: `<circle cx="${BIKE_WHEELS[0][0]}" cy="${BIKE_WHEELS[0][1]}" r="3.5"/><circle cx="${BIKE_WHEELS[1][0]}" cy="${BIKE_WHEELS[1][1]}" r="3.5"/>`,
    parts: [["spokesBack", "path", 'stroke-width="1.4"'], ["spokesFront", "path", 'stroke-width="1.4"'], ["legs", "polyline"], ["torso", "polyline"], ["arms", "polyline"], ["head", "circle", 'cx="15" r="2" fill="currentColor" stroke="none"']],
    attrs: bikeAttrs,
    loopMs: 1300, // ~46 tours de pédalier par minute, à l'allure du GIF
    wheelLoopMs: 800,
    wheelOnceDeg: 720,
  },
  swim: {
    fixed: "",
    parts: [["waveTop", "path"], ["waveBottom", "path"]],
    attrs: swimAttrs,
    loopMs: 2000,
  },
  plank: {
    fixed: `<path d="M2.5 20.5h19"/><path d="M15.5 14V19h2.7"/><circle cx="18.9" cy="12.2" r="1.8"/>`,
    parts: [["body", "polyline"], ["sweat", "path", 'd="M0 -0.95C0.45 -0.2 0.6 0.05 0.6 0.35A0.6 0.6 0 1 1 -0.6 0.35C-0.6 0.05 -0.45 -0.2 0 -0.95Z" fill="currentColor" stroke="none"']],
    attrs: plankAttrs,
    loopMs: 2400,
  },
  rest: {
    fixed: `<path d="M2.5 20.5h19"/><polyline points="${animPts(REST_HIP, REST_KNEE, REST_FOOT)}"/>`,
    parts: [["torso", "polyline"], ["arms", "polyline"], ["head", "circle", 'r="1.8"']],
    attrs: restAttrs,
    loopMs: 3800, // une respiration, à l'allure du GIF
  },
  stopwatch: {
    fixed: `<circle cx="12" cy="13" r="8"/><path d="M9 2h6"/><path d="M12 2v3"/><path d="M12 13l2.5 1.5"/>`,
    parts: [["needle", "polyline"]],
    attrs: stopwatchAttrs,
    loopMs: 2400,
  },
};

// kind : "rower" | "bike" | "swim" | "stopwatch" | "plank" | "rest" ; opts.anim : "none" | "once" | "loop".
function animIconHTML(kind, opts) {
  const def = ANIM_ICONS[kind];
  if (!def) return "";
  const o = opts || {};
  const size = o.size || 20;
  const anim = o.anim === "once" || o.anim === "loop" ? o.anim : "none";
  const at = def.attrs(0, 0);
  const parts = def.parts
    .map(([name, tag, extra]) => `<${tag} data-anim-part="${name}" ${Object.entries(at[name]).map(([k, v]) => `${k}="${v}"`).join(" ")}${extra ? " " + extra : ""}/>`)
    .join("");
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-anim-icon="${kind}"${anim !== "none" ? ` data-anim="${anim}"` : ""} aria-hidden="true">${def.fixed}${parts}</svg>`;
}
function rowerIconHTML(opts) {
  return animIconHTML("rower", opts);
}

// Les icônes fixes (pose de départ) remplacent celles de 01-config.js : une
// seule silhouette par activité dans toute l'app. ICONS.stopwatch garde le
// même dessin qu'avant (il sert aussi au repos, aux minuteurs, aux boutons).
ICONS.rower = animIconHTML("rower");
ICONS.bike = animIconHTML("bike");
ICONS.swim = animIconHTML("swim");
ICONS.stopwatch = animIconHTML("stopwatch");
ICONS.plank = animIconHTML("plank");
ICONS.rest = animIconHTML("rest");

/* Moteur : une seule boucle requestAnimationFrame pour toutes les icônes
   animées présentes à l'écran ; elle s'arrête d'elle-même quand il n'y en a
   plus (rien ne tourne en fond). Les attributs sont modifiés en place, sans
   réécrire le HTML (aucun nouveau nœud : le filet domGuard n'a rien à voir). */
let animIconsTicking = false;
function animReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
}
function animIconApply(svg, p, wheelDeg) {
  const def = ANIM_ICONS[svg.getAttribute("data-anim-icon")];
  if (!def) return;
  const at = def.attrs(p, wheelDeg);
  svg.querySelectorAll("[data-anim-part]").forEach((el) => {
    const vals = at[el.getAttribute("data-anim-part")];
    if (vals) for (const k in vals) el.setAttribute(k, vals[k]);
  });
}
function animIconsTick(now) {
  const list = document.querySelectorAll("svg[data-anim]");
  if (!list.length) {
    animIconsTicking = false;
    return;
  }
  const still = animReducedMotion();
  list.forEach((svg) => {
    const def = ANIM_ICONS[svg.getAttribute("data-anim-icon")];
    if (!def) return svg.removeAttribute("data-anim");
    if (!svg.dataset.animStart) svg.dataset.animStart = String(now);
    const t = now - Number(svg.dataset.animStart);
    if (still || (svg.dataset.anim !== "loop" && t >= ANIM_ICON_ONCE_MS)) {
      // Pose de départ, figée pour de bon (fin de la micro-animation, ou
      // appareil réglé sur « réduire les animations »).
      animIconApply(svg, 0, 0);
      svg.removeAttribute("data-anim");
    } else if (svg.dataset.anim === "loop") {
      animIconApply(svg, (t % def.loopMs) / def.loopMs, def.wheelLoopMs ? (t / def.wheelLoopMs) * 360 : 0);
    } else {
      const k = t / ANIM_ICON_ONCE_MS;
      // Un cycle en 2 s ; les roues se lancent puis ralentissent jusqu'à l'arrêt.
      animIconApply(svg, k, (def.wheelOnceDeg || 0) * (1 - Math.pow(1 - k, 3)));
    }
  });
  requestAnimationFrame(animIconsTick);
}
function animIconsStart() {
  if (animIconsTicking || !document.querySelector("svg[data-anim]")) return;
  animIconsTicking = true;
  requestAnimationFrame(animIconsTick);
}
// Démarre dès qu'une icône animée apparaît, quel que soit l'écran qui l'affiche.
(function () {
  const root = document.getElementById("app");
  if (root) new MutationObserver(animIconsStart).observe(root, { childList: true, subtree: true });
})();
