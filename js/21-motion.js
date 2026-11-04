/* ---------- Mode Mono : des éléments vivants (3.7.0) ----------
   En plus des matières (3.6.1), le mode Mono donne du corps aux gestes :
     - chaque toucher laisse une onde qui part du doigt (ripple), le bouton
       s'enfonce puis rebondit en se relâchant (CSS, voir « MONO :
       MOUVEMENT ») ; sur Android, une micro-vibration ;
     - en arrivant sur un écran, ses cartes et lignes montent en cascade ;
     - un chiffre qui change (répétitions, poids, compteurs) fait un petit
       saut ;
     - un élément glissé (carte à supprimer) revient avec un rebond.
   Rien de tout ça hors du mode Mono, ni quand l'appareil demande de
   réduire les animations. Uniquement de la présentation : aucun rendu ni
   aucune donnée ne dépendent de ce fichier. */

const MOTION_TAP_SELECTOR =
  "button, .home-tile, .home-list-row, .history-head, .live-plan-row, .live-plan-next, .gym-add-card, .ex-type-btn, .toggle-switch, .live-subcat-btn, .live-exercise-btn, [data-open-app], [data-live-exercise]";
const MOTION_ENTER_SELECTOR =
  ".home-tile, .home-list-row, .home-section-label, .swipe-row, .gym-add-card, .live-plan-next, .live-plan-row, .exercise-card, .field-list-card, .live-exercise-btn, .live-stepper-group, .live-validate-btn";
const MOTION_ENTER_MAX = 14;

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
    // Micro-vibration (Android ; iOS l'ignore).
    try {
      if (navigator.vibrate) navigator.vibrate(7);
    } catch (err) {
      /* sans effet */
    }
  },
  { passive: true }
);

// Arrivée sur un écran : cascade. Seulement quand on CHANGE d'écran — pas à
// chaque petit redessin du même écran (un + / −, une frappe…), qui ferait
// clignoter le contenu.
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
  if (!motionOn()) {
    motionLastScreen = motionScreenKey();
    return;
  }
  const key = motionScreenKey();
  if (key !== motionLastScreen) {
    motionLastScreen = key;
    motionLastValues = []; // nouvel écran : pas de « saut » des chiffres qui arrivent
    const items = [...document.querySelectorAll("#app " + MOTION_ENTER_SELECTOR.split(", ").join(", #app "))].filter((el) => el.getClientRects().length).slice(0, MOTION_ENTER_MAX);
    items.forEach((el, i) => {
      el.style.setProperty("--motion-i", i);
      el.classList.remove("motion-enter");
      void el.offsetWidth; // relance l'animation
      el.classList.add("motion-enter");
      setTimeout(() => el.classList.remove("motion-enter"), 700 + i * 40);
    });
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
