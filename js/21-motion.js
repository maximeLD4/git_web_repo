/* ---------- Mode Mono : des éléments vivants (3.7.0) ----------
   En plus des matières (3.6.1), le mode Mono donne du corps aux gestes :
     - chaque toucher laisse une onde qui part du doigt (ripple), le bouton
       s'enfonce puis rebondit en se relâchant (CSS, voir « MONO :
       MOUVEMENT ») ; sur Android, une micro-vibration ;
     - (plus de cascade à l'arrivée sur un écran depuis 3.13.0 : le
       mouvement ne sert qu'à souligner ce qu'on touche, pas à décorer) ;
     - l'élément qu'on vient de CHOISIR (puce, onglet, catégorie…) fait un
       petit « clac » — seulement lui, seulement juste après le toucher ;
     - un chiffre qui change (répétitions, poids, compteurs) fait un petit
       saut ;
     - un élément glissé (carte à supprimer) revient avec un rebond.
   Rien de tout ça hors du mode Mono, ni quand l'appareil demande de
   réduire les animations. Uniquement de la présentation : aucun rendu ni
   aucune donnée ne dépendent de ce fichier. */

const MOTION_TAP_SELECTOR =
  "button, .home-tile, .home-list-row, .history-head, .live-plan-row, .live-plan-next, .gym-add-card, .ex-type-btn, .toggle-switch, .live-subcat-btn, .live-exercise-btn, [data-open-app], [data-live-exercise]";
// Ce qui se CHOISIT (devient « actif ») : il fait un petit « clac » juste
// après qu'on l'a touché.
const MOTION_PICK_SELECTOR = ".ex-type-btn, .live-subcat-btn, .live-type-switch-btn, [data-open-app], [data-gym-top-mode], [data-category-btn], [data-color-mode]";
let motionPicked = null; // { sig, at }
function motionSignature(el) {
  return [...el.attributes].filter((a) => a.name.startsWith("data-") && a.name !== "data-step-glyph").map((a) => `[${a.name}="${CSS.escape(a.value)}"]`).join("");
}

function motionOn() {
  if (!document.documentElement.classList.contains("motion-rich")) return false;
  try {
    return !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) {
    return true;
  }
}

// Onde au toucher, partant du point de contact.
document.addEventListener(
  "pointerdown",
  (e) => {
    if (!motionOn()) return;
    const el = e.target.closest && e.target.closest(MOTION_TAP_SELECTOR);
    if (!el || el.disabled || el.closest("#onb-root")) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const size = Math.max(r.width, r.height) * 2.2;
    const wave = document.createElement("span");
    wave.className = "motion-ripple";
    wave.style.width = wave.style.height = size + "px";
    wave.style.left = e.clientX - r.left - size / 2 + "px";
    wave.style.top = e.clientY - r.top - size / 2 + "px";
    if (getComputedStyle(el).position === "static") el.classList.add("motion-host-static");
    el.classList.add("motion-host");
    el.appendChild(wave);
    setTimeout(() => {
      wave.remove();
      if (!el.querySelector(".motion-ripple")) el.classList.remove("motion-host", "motion-host-static");
    }, 650);
    const pick = e.target.closest(MOTION_PICK_SELECTOR);
    if (pick) {
      const sig = motionSignature(pick);
      if (sig) motionPicked = { sig, at: Date.now() };
    }
    // Micro-vibration (Android ; iOS l'ignore).
    try {
      if (navigator.vibrate) navigator.vibrate(7);
    } catch (err) {
      /* sans effet */
    }
  },
  { passive: true }
);

// Après chaque rendu : les chiffres qui ont changé, et l'élément qu'on vient de
// choisir. (Plus de cascade à l'arrivée sur un écran : décoratif.)
let motionLastScreen = "";
let motionLastValues = [];
function motionScreenKey() {
  try {
    return [document.getElementById("app").className, currentApp, typeof tab !== "undefined" ? tab : "", typeof liveStep !== "undefined" ? liveStep : "", typeof gymTopMode !== "undefined" ? gymTopMode : ""].join("|");
  } catch (e) {
    return "";
  }
}
function motionAfterRender() {
  const key = motionScreenKey();
  if (!motionOn()) {
    motionLastScreen = key;
    return;
  }
  if (key !== motionLastScreen) {
    motionLastScreen = key;
    motionLastValues = []; // nouvel écran : pas de « saut » des chiffres qui arrivent
  }
  // L'élément qu'on vient de choisir (s'il est bien devenu actif).
  if (motionPicked && Date.now() - motionPicked.at < 700) {
    const el = document.querySelector(motionPicked.sig);
    if (el && el.classList.contains("active")) {
      motionPicked = null;
      const target = el.closest(".home-bottom-nav") ? el.querySelector("svg") || el : el;
      target.classList.remove("motion-pick");
      void target.offsetWidth;
      target.classList.add("motion-pick");
      setTimeout(() => target.classList.remove("motion-pick"), 400);
    }
  }
  // Un chiffre qui change saute un peu.
  const vals = [...document.querySelectorAll("#app .live-stepper-value, #app .live-rest-hero-label span, #app .plan-rest-value, #app .loop-step-sec")];
  vals.forEach((el, i) => {
    const prev = motionLastValues[i];
    if (prev !== undefined && prev !== el.textContent) {
      el.classList.remove("motion-pop");
      void el.offsetWidth;
      el.classList.add("motion-pop");
    }
  });
  motionLastValues = vals.map((el) => el.textContent);
}
let motionPending = false;
new MutationObserver(() => {
  if (motionPending) return;
  motionPending = true;
  requestAnimationFrame(() => {
    motionPending = false;
    motionAfterRender();
  });
}).observe(document.getElementById("app"), { childList: true, subtree: true });

/* (3.7.1 avait ici un « garde-fou blanc sur blanc » qui repeignait en noir,
   après chaque rendu, les textes clairs posés sur un fond clair en Mono. Il
   n'a plus lieu d'être depuis 3.8.0 : chaque fond a sa couleur de texte
   attitrée dans le registre des apparences — js/00-themes.js, paires
   on-ink, on-yellow, ink-highlight… — et tools/tests/themes.js vérifie
   qu'elles restent lisibles.) */
