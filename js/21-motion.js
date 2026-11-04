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
  if (!document.documentElement.classList.contains("mode-mono")) return false;
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

/* ---------- Mode Mono : garde-fou « blanc sur blanc » (3.7.1) ----------
   En Mono, tout ce qui était « couleur d'accent » devient blanc. Beaucoup
   d'éléments de l'app posent, eux, un texte ou une icône clairs SUR cette
   couleur (styles écrits en dur, parfois directement dans le gabarit :
   « color:#FFF8F0 » sur « var(--yellow) »…) : blanc sur blanc. Plutôt que de
   les traquer un par un, après chaque rendu on repère en Mono les éléments
   à fond clair et on passe en noir ce qui, dedans, est clair (texte, et
   icônes, qui suivent la couleur du texte). Hors Mono : rien. */
const MONO_FIX_CLASS = "mono-ink-fix";
function monoLum(c) {
  const m = c && c.match(/[\d.]+/g);
  if (!m) return null;
  const [r, g, b, a = 1] = m.map(Number);
  if (a < 0.5) return null;
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function monoLightBackground(el) {
  const cs = getComputedStyle(el);
  const l = monoLum(cs.backgroundColor);
  if (l !== null) return l > 0.55;
  // Acier brossé & co : fond porté par un dégradé.
  const img = cs.backgroundImage;
  if (img && img !== "none" && /gradient/.test(img) && !/repeating-linear-gradient\(-?45deg/.test(img.split("),")[0])) {
    const cols = (img.match(/rgba?\([^)]+\)/g) || []).map(monoLum).filter((x) => x !== null);
    if (cols.length) return cols.reduce((s, x) => s + x, 0) / cols.length > 0.55;
  }
  return false;
}
function monoFixContrast() {
  const roots = ["app", "custom-modal-root", "onb-root"].map((id) => document.getElementById(id)).filter(Boolean);
  const on = document.documentElement.classList.contains("mode-mono");
  roots.forEach((root) => {
    if (!on) {
      root.querySelectorAll("." + MONO_FIX_CLASS).forEach((e) => e.classList.remove(MONO_FIX_CLASS));
      return;
    }
    root.querySelectorAll("*").forEach((el) => {
      if (el.namespaceURI === "http://www.w3.org/2000/svg" && el.tagName.toLowerCase() !== "svg") return;
      if (!monoLightBackground(el)) return;
      // L'élément lui-même et ses descendants qui n'ont pas leur propre fond.
      const stack = [el];
      while (stack.length) {
        const n = stack.pop();
        const ownBg = n !== el && (monoLum(getComputedStyle(n).backgroundColor) !== null);
        if (ownBg) continue; // il a son propre fond : il sera examiné pour lui-même
        const l = monoLum(getComputedStyle(n).color);
        if (l !== null && l > 0.55) n.classList.add(MONO_FIX_CLASS);
        for (const ch of n.children) stack.push(ch);
      }
    });
  });
}
let monoFixPending = false;
function scheduleMonoFix() {
  if (monoFixPending) return;
  monoFixPending = true;
  requestAnimationFrame(() => {
    monoFixPending = false;
    monoFixContrast();
  });
}
new MutationObserver(scheduleMonoFix).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
