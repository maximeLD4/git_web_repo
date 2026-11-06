/* ==========================================================================
   APPARENCES — LA SOURCE UNIQUE (3.8.0)

   Chaque apparence (Jour, Nuit, Anne, Mono…) est décrite ICI, et seulement
   ici : son nom, son aperçu dans Réglages, la couleur de la barre d'état, ses
   couleurs, ses formes (arrondis, ombres), ses polices, ses matières
   (textures), son mouvement, les couleurs des sports. Rien d'autre dans l'app
   ne nomme une apparence ni n'écrit une de ses couleurs :
     - la feuille de styles n'utilise que des VARIABLES (--bg, --text,
       --radius…) et des PRÉRÉGLAGES génériques (html.type-athletic,
       html.texture-gym, html.motion-rich), jamais
       « html.mode-xxx » ;
     - ce fichier ÉCRIT les valeurs de ces variables pour chaque apparence
       (feuille <style id="theme-tokens"> générée au chargement, avant tout
       affichage, donc sans éclair d'une autre apparence) ;
     - Réglages > Apparence liste les apparences d'après THEME_ORDER ;
     - les couleurs des sports du calendrier partagé, la barre d'état, le
       préréglage de mouvement… viennent d'ici.
   Ajouter une apparence = ajouter une entrée à THEMES (et son id à
   THEME_ORDER). La batterie tools/tests/themes.js vérifie que chaque
   apparence définit TOUTES les variables du contrat, que chaque paire
   fond / texte reste lisible, et que plus aucune apparence n'est écrite
   ailleurs.

   Chargé dans <head>, avant la feuille de styles et avant tous les autres
   scripts (aucune dépendance).
   ========================================================================== */

// Chaque apparence décrit aussi : label (nom affiché), hint (sa phrase dans
// Réglages > Apparence), icon (icône de son aperçu, clé de ICONS), swatch
// (couleurs de l'aperçu), dark (thème sombre ?), statusBar (couleur de la
// barre d'état), presets, tokens, screens (accent de chaque écran), activity
// (couleurs des sports du calendrier partagé), overrides (rares exceptions,
// écrites avec les variables).

// Le contrat : toutes les variables qu'une apparence DOIT définir.
const THEME_TOKENS = {
  // Couleurs de base
  bg: "fond de page",
  surface: "fond des cartes",
  "surface-2": "fond secondaire (champs, puces)",
  border: "contours",
  rule: "filets",
  text: "texte",
  "text-dim": "texte secondaire",
  ink: "encre : action, sélection (boutons principaux, onglet actif)",
  "ink-rgb": "encre en r,g,b",
  "on-ink": "texte posé sur l'encre",
  "on-ink-rgb": "texte sur l'encre en r,g,b",
  "surface-rgb": "fond des cartes en r,g,b",
  action: "bouton principal",
  accent: "accent par défaut (avant qu'un écran pose le sien)",
  "accent-rgb": "accent par défaut en r,g,b",
  yellow: "le temps qui court : chrono, repos, séance en cours",
  "yellow-rgb": "idem en r,g,b",
  "header-bg": "fond de l'en-tête des écrans",
  "on-yellow": "icône / texte posé sur --yellow",
  "ink-highlight": "touche de couleur posée SUR l'encre (logo, bouton lecture…)",
  knob: "boule des interrupteurs",
  destructive: "bouton de suppression définitive",
  "on-destructive": "texte sur --destructive",
  "recording-bg": "tuile « séance en cours » de l'accueil",
  "on-recording": "texte sur --recording-bg",
  "on-sport": "icône posée sur une couleur de sport",
  "control-bg": "fond d'un contrôle secondaire (menus déroulants)",
  "on-control": "texte d'un contrôle secondaire",
  "control-border": "contour d'un contrôle secondaire",
  "field-bg": "fond d'un champ de saisie (là où l'on tape)",
  "field-border": "contour d'un champ de saisie",
  "field-border-focus": "contour d'un champ touché",
  "select-chevron": "chevron des menus (doit contraster avec l'encre)",
  // Couleurs des sports (données : barres, points du calendrier, pastilles)
  "rgb-gym": "Salle de sport",
  "rgb-run": "Course",
  "rgb-swim": "Natation",
  "rgb-bike": "Vélo",
  "rgb-performance": "Performances",
  "rgb-weight": "Poids",
  "rgb-calendar": "Calendrier",
  "data-filter": "filtre posé sur les dessins de séries (disques, haltères)",
  // Formes
  radius: "arrondi courant",
  "radius-sm": "petit arrondi (puces, petits contrôles)",
  "radius-lg": "grand arrondi (listes)",
  "radius-xl": "très grand arrondi (tuile héros)",
  "shadow-card": "ombre des cartes et petits boutons",
  // Polices
  font: "texte courant",
  "font-display": "gros titres et grands chiffres",
  "font-mono": "libellés en capitales",
  // Matières (utilisées par le préréglage texture-gym ; « none » ailleurs)
  "tex-app": "matière du fond de page",
  "tex-surface": "matière des cartes et barres",
  "tex-steel": "matière des surfaces claires (boutons principaux…)",
  "tex-steel-base": "couleur de fond sous la matière claire",
  "tex-work": "matière du bandeau d'effort",
  "tex-stepper": "matière des compteurs − / +",
};

// Variables qui doivent rester lisibles l'une sur l'autre (au moins 4,5:1).
// [texte, fond, minimum] — 4,5:1 pour du texte, 3:1 pour une icône ou un
// grand bandeau.
const THEME_CONTRAST_PAIRS = [
  ["on-yellow", "yellow", 4.5],
  ["ink-highlight", "ink", 3],
  ["text", "bg", 4.5],
  ["text", "surface", 4.5],
  ["on-ink", "ink", 4.5],
  ["on-ink", "action", 4.5],
  ["ink", "bg", 4.5],
  ["on-destructive", "destructive", 4.5],
  ["on-recording", "recording-bg", 4.5],
  ["on-control", "control-bg", 4.5],
  ["text", "field-bg", 4.5],
];

// Préréglages : des familles de styles GÉNÉRIQUES, définies une fois dans la
// feuille de styles, que chaque apparence choisit.
const THEME_PRESETS = {
  type: ["classic", "athletic"], // athletic : titres condensés, capitales, italique
  texture: ["none", "gym"], // gym : grain, carbone, acier brossé, moletage, caoutchouc
  motion: ["calm", "rich"], // rich : enfoncement, rebond, onde, cascade
};

const CHEVRON = (stroke) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${stroke}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`;
const NO_TEXTURE = { "tex-app": "none", "tex-surface": "none", "tex-steel": "none", "tex-steel-base": "transparent", "tex-work": "none", "tex-stepper": "none" };
const FONTS_DEFAULT = {
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif',
  "font-display": '"Jost", -apple-system, sans-serif',
  "font-mono": '"IBM Plex Mono", ui-monospace, Menlo, monospace',
};

const THEMES = {
  /* ---------- Jour ---------- */
  day: {
    label: "Jour",
    hint: "",
    icon: "sun",
    swatch: { bg: "#E2A66B", fg: "#3D3230" },
    dark: false,
    statusBar: "#F3ECE4",
    // 3.11.0 : les couleurs de Jour, avec la typo, les formes et le mouvement
    // de Mono — mais à plat (pas de matières).
    presets: { type: "athletic", texture: "none", motion: "rich" },
    tokens: {
      bg: "#F3ECE4",
      surface: "#FFFDF8",
      "surface-2": "rgba(var(--ink-rgb), 0.055)",
      border: "rgba(var(--ink-rgb), 0.16)",
      rule: "rgba(var(--ink-rgb), 0.16)",
      text: "#3D3230",
      "text-dim": "rgba(var(--ink-rgb), 0.62)",
      ink: "#3D3230",
      "ink-rgb": "61,50,48",
      "on-ink": "#FFFDF8",
      "on-ink-rgb": "255,253,248",
      "surface-rgb": "255,253,248",
      action: "#3D3230",
      accent: "#3D3230",
      "accent-rgb": "61, 50, 48",
      yellow: "#E2A66B",
      "yellow-rgb": "226,166,107",
      "header-bg": "var(--bg)",
      "on-yellow": "#3D3230",
      "ink-highlight": "var(--yellow)",
      "knob": "#fff",
      "destructive": "#A84B3D",
      "on-destructive": "#fff",
      "recording-bg": "#241E1A",
      "on-recording": "#fff",
      "on-sport": "#fff",
      "control-bg": "var(--ink)",
      "on-control": "var(--on-ink)",
      "control-border": "transparent",
      "field-bg": "#FFFFFF",
      "field-border": "rgba(61,50,48,0.28)",
      "field-border-focus": "#3D3230",
      "select-chevron": CHEVRON("white"),
      "rgb-gym": "143,160,107",
      "rgb-run": "208,138,98",
      "rgb-swim": "111,163,160",
      "rgb-bike": "217,173,93",
      "rgb-performance": "201,122,108",
      "rgb-weight": "160,138,158",
      "rgb-calendar": "122,106,92",
      "data-filter": "none",
      radius: "4px",
      "radius-sm": "3px",
      "radius-lg": "6px",
      "radius-xl": "8px",
      "shadow-card": "none",
      ...FONTS_DEFAULT,
      "font-display": '"Barlow Condensed", "Arial Narrow", -apple-system, sans-serif',
      ...NO_TEXTURE,
    },
    // Accent de chaque écran (--accent / --accent-rgb, posés sur #app.theme-xxx).
    screens: {
      gym: ["#6B7F45", "107, 127, 69"],
      run: ["#BF6A3D", "191, 106, 61"],
      weight: ["#7D6482", "125, 100, 130"],
      calendar: ["#3D3230", "61, 50, 48"],
      settings: ["#3D3230", "61, 50, 48"],
      swim: ["#4C8480", "76, 132, 128"],
      bike: ["#BD8A34", "189, 138, 52"],
      home: ["#3D3230", "61, 50, 48"],
      scanner: ["var(--yellow)", "217, 138, 43"],
      performance: ["#A84B3D", "168, 75, 61"],
      live: ["var(--yellow)", "217, 138, 43"],
      auth: ["#3D3230", "61, 50, 48"],
    },
    // Couleurs des sports dans le calendrier partagé (style posé en ligne).
    activity: {
      gym: ["#8FA06B", "143,160,107"],
      run: ["#D08A62", "208,138,98"],
      swim: ["#6FA3A0", "111,163,160"],
      bike: ["#D9AD5D", "217,173,93"],
      gainage: ["#A65C4B", "166,92,75"],
    },
    overrides: [],
  },

  /* ---------- Nuit ---------- */
  night: {
    label: "Nuit",
    hint: "Nuit adoucit l'écran le soir.",
    icon: "moon",
    swatch: { bg: "#241E1A", fg: "#FFF8F0" },
    dark: true,
    statusBar: "#1E1A17",
    presets: { type: "classic", texture: "none", motion: "calm" },
    tokens: {
      bg: "#1E1A17",
      surface: "#2A2420",
      "surface-2": "rgba(255, 255, 255, 0.07)",
      border: "rgba(255, 255, 255, 0.10)",
      rule: "rgba(255, 255, 255, 0.15)",
      text: "#EDE4DB",
      "text-dim": "rgba(237, 228, 219, 0.62)",
      ink: "#EDE4DB",
      "ink-rgb": "237,228,219",
      "on-ink": "#211C19",
      "on-ink-rgb": "33,28,25",
      "surface-rgb": "42,36,32",
      action: "#EDE4DB",
      accent: "#EDE4DB",
      "accent-rgb": "237, 228, 219",
      yellow: "#E8B77E",
      "yellow-rgb": "232,183,126",
      // L'en-tête reste sombre (l'encre est claire en Nuit : un en-tête à
      // l'encre ferait un grand bandeau lumineux en haut de chaque écran).
      "header-bg": "#15110E",
      "on-yellow": "#211C19",
      "ink-highlight": "var(--on-ink)", // l'encre est claire en Nuit : une touche moutarde dessus ne se voyait pas (1,5:1)
      "knob": "#fff",
      "destructive": "#A84B3D",
      "on-destructive": "#fff",
      "recording-bg": "#241E1A",
      "on-recording": "#fff",
      "on-sport": "#fff",
      "control-bg": "var(--ink)",
      "on-control": "var(--on-ink)",
      "control-border": "transparent",
      "field-bg": "#1A1613",
      "field-border": "rgba(255,255,255,0.22)",
      "field-border-focus": "#EDE4DB",
      "select-chevron": CHEVRON("%23211C19"),
      "rgb-gym": "157,176,126",
      "rgb-run": "216,151,114",
      "rgb-swim": "126,176,172",
      "rgb-bike": "224,177,102",
      "rgb-performance": "224,148,132",
      "rgb-weight": "185,164,182",
      "rgb-calendar": "168,151,138",
      "data-filter": "none",
      radius: "14px",
      "radius-sm": "8px",
      "radius-lg": "18px",
      "radius-xl": "22px",
      "shadow-card": "none",
      ...FONTS_DEFAULT,
      ...NO_TEXTURE,
    },
    screens: {
      gym: ["#9DB07E", "157, 176, 126"],
      run: ["#D89772", "216, 151, 114"],
      weight: ["#9E85A5", "158, 133, 165"],
      calendar: ["#EDE4DB", "237, 228, 219"],
      settings: ["#EDE4DB", "237, 228, 219"],
      swim: ["#7EB0AC", "126, 176, 172"],
      bike: ["#E0B166", "224, 177, 102"],
      home: ["#EDE4DB", "237, 228, 219"],
      scanner: ["#E8B77E", "232, 183, 126"],
      performance: ["#C06858", "192, 104, 88"],
      live: ["#E8B77E", "232, 183, 126"],
      auth: ["#EDE4DB", "237, 228, 219"],
    },
    activity: {
      gym: ["#A9BC8B", "169,188,139"],
      run: ["#E0A47F", "224,164,127"],
      swim: ["#8BC0BC", "139,192,188"],
      bike: ["#E8C077", "232,192,119"],
      gainage: ["#C47C6C", "196,124,108"],
    },
    overrides: [[".header", "background: var(--header-bg);"]],
  },

  /* ---------- Anne : palette « Barbra » (#FFC4D9, #9E0B2E, #C01343) ---------- */
  anne: {
    label: "Anne",
    hint: "Anne passe l'app dans une palette rose.",
    icon: "heart",
    swatch: { bg: "#9E0B2E", fg: "#FFF8F0" },
    dark: false,
    statusBar: "#FCE3EC",
    presets: { type: "classic", texture: "none", motion: "calm" },
    tokens: {
      bg: "#FCE3EC",
      surface: "#FFF6F9",
      "surface-2": "rgba(158, 11, 46, 0.08)",
      border: "rgba(158, 11, 46, 0.16)",
      rule: "rgba(158, 11, 46, 0.20)",
      text: "#9E0B2E",
      "text-dim": "rgba(158, 11, 46, 0.8)",
      ink: "#9E0B2E",
      "ink-rgb": "158,11,46",
      "on-ink": "#FFF2F6",
      "on-ink-rgb": "255,242,246",
      "surface-rgb": "255,246,249",
      action: "#9E0B2E",
      accent: "#9E0B2E",
      "accent-rgb": "158, 11, 46",
      yellow: "#FFC4D9",
      "yellow-rgb": "255,196,217",
      "header-bg": "var(--bg)",
      "on-yellow": "#9E0B2E",
      "ink-highlight": "var(--yellow)",
      "knob": "#fff",
      "destructive": "#A84B3D",
      "on-destructive": "#fff",
      "recording-bg": "#241E1A",
      "on-recording": "#fff",
      "on-sport": "#fff",
      "control-bg": "var(--ink)",
      "on-control": "var(--on-ink)",
      "control-border": "transparent",
      "field-bg": "#FFFFFF",
      "field-border": "rgba(158,11,46,0.30)",
      "field-border-focus": "#9E0B2E",
      "select-chevron": CHEVRON("white"),
      "rgb-gym": "172,65,102",
      "rgb-run": "196,40,69",
      "rgb-swim": "176,58,91",
      "rgb-bike": "194,42,84",
      "rgb-performance": "192,19,67",
      "rgb-weight": "158,11,46",
      "rgb-calendar": "158,11,46",
      "data-filter": "none",
      // Une app plate recolorée en rose faisait « filtre posé dessus » : on
      // assouplit aussi la FORME — coins plus ronds, ombre douce rosée.
      radius: "14px",
      "radius-sm": "10px",
      "radius-lg": "18px",
      "radius-xl": "22px",
      "shadow-card": "0 3px 14px rgba(158, 11, 46, 0.14)",
      ...FONTS_DEFAULT,
      ...NO_TEXTURE,
    },
    // Accents foncés (3.4.2) : ils servent aussi de couleur de texte — au moins
    // 4,5:1 sur le fond rose.
    screens: {
      gym: ["#AC4166", "172, 65, 102"],
      run: ["#C42845", "196, 40, 69"],
      weight: ["#9E0B2E", "158, 11, 46"],
      calendar: ["#9E0B2E", "158, 11, 46"],
      settings: ["#9E0B2E", "158, 11, 46"],
      swim: ["#B03A5B", "176, 58, 91"],
      bike: ["#C22A54", "194, 42, 84"],
      home: ["#9E0B2E", "158, 11, 46"],
      scanner: ["#C01343", "192, 19, 67"],
      performance: ["#C01343", "192, 19, 67"],
      live: ["#C01343", "192, 19, 67"],
      auth: ["#9E0B2E", "158, 11, 46"],
    },
    activity: {
      gym: ["#AC4166", "172,65,102"],
      run: ["#C42845", "196,40,69"],
      swim: ["#B03A5B", "176,58,91"],
      bike: ["#C22A54", "194,42,84"],
      gainage: ["#8C2F45", "140,47,69"],
    },
    // Petits boutons − / + : ombre serrée (deux ombres larges se fondaient).
    overrides: [[".rep-step-btn, .live-stepper-btn, .live-stepper-tiny-btn, .plan-gap-btn", "box-shadow: 0 1px 3px rgba(158, 11, 46, 0.16);"]],
  },

  /* ---------- Mono : noir & blanc, esprit salle de sport ---------- */
  mono: {
    label: "Mono",
    hint: "Mono : noir & blanc, esprit salle de sport.",
    icon: "dumbbell",
    swatch: { bg: "#0A0A0A", fg: "#F4F4F4", border: "rgba(255,255,255,0.2)" },
    dark: true,
    statusBar: "#0A0A0A",
    presets: { type: "athletic", texture: "gym", motion: "rich" },
    tokens: {
      bg: "#0A0A0A",
      surface: "#1C1C1C", // 3.9.0 : nettement au-dessus du fond (#161616 se confondait avec lui)
      "surface-2": "rgba(255, 255, 255, 0.11)",
      border: "rgba(255, 255, 255, 0.16)",
      rule: "rgba(255, 255, 255, 0.18)",
      text: "#F4F4F4",
      "text-dim": "rgba(244, 244, 244, 0.6)", // un vrai cran sous le texte principal
      ink: "#F4F4F4",
      "ink-rgb": "244,244,244",
      "on-ink": "#0A0A0A",
      "on-ink-rgb": "10,10,10",
      "surface-rgb": "28,28,28",
      action: "#F4F4F4",
      accent: "#F4F4F4",
      "accent-rgb": "244, 244, 244",
      yellow: "#F4F4F4",
      "yellow-rgb": "244,244,244",
      "header-bg": "#0A0A0A",
      "on-yellow": "#0A0A0A",
      "ink-highlight": "var(--on-ink)",
      "knob": "#fff",
      "destructive": "#F4F4F4",
      "on-destructive": "#0A0A0A",
      "recording-bg": "#F4F4F4",
      "on-recording": "#0A0A0A",
      "on-sport": "#0A0A0A",
      "control-bg": "#050505",
      "on-control": "#F4F4F4",
      "control-border": "rgba(255,255,255,0.34)",
      "field-bg": "#050505",
      "field-border": "rgba(255,255,255,0.30)",
      "field-border-focus": "#F4F4F4",
      "select-chevron": CHEVRON("%23F4F4F4"), // menus sombres en Mono (3.9.0)
      "rgb-gym": "244,244,244",
      "rgb-run": "190,190,190",
      "rgb-swim": "145,145,145",
      "rgb-bike": "215,215,215",
      "rgb-performance": "244,244,244",
      "rgb-weight": "200,200,200",
      "rgb-calendar": "170,170,170",
      "data-filter": "grayscale(1) contrast(1.1)",
      radius: "4px",
      "radius-sm": "3px",
      "radius-lg": "6px",
      "radius-xl": "8px",
      "shadow-card": "none",
      ...FONTS_DEFAULT,
      "font-display": '"Barlow Condensed", "Arial Narrow", -apple-system, sans-serif',
      "tex-app": `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"), radial-gradient(120% 80% at 50% 0%, rgba(255, 255, 255, 0.05), transparent 60%)`,
      "tex-surface": "repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.028) 0 2px, transparent 2px 5px), repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.12) 0 2px, transparent 2px 5px)",
      "tex-steel": "repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.035) 0 1px, transparent 1px 3px), linear-gradient(180deg, #FFFFFF 0%, #EDEDED 48%, #D9D9D9 100%)",
      "tex-steel-base": "#EDEDED",
      "tex-work": "repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.07) 0 1px, transparent 1px 7px), repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.07) 0 1px, transparent 1px 7px)",
      "tex-stepper": "radial-gradient(circle, rgba(255, 255, 255, 0.09) 1px, transparent 1.3px) 0 0 / 7px 7px",
    },
    screens: Object.fromEntries(["gym", "run", "weight", "calendar", "settings", "swim", "bike", "home", "scanner", "performance", "live", "auth"].map((k) => [k, ["#F4F4F4", "244, 244, 244"]])),
    activity: {
      gym: ["#F4F4F4", "244,244,244"],
      run: ["#BEBEBE", "190,190,190"],
      swim: ["#919191", "145,145,145"],
      bike: ["#D7D7D7", "215,215,215"],
      gainage: ["#A5A5A5", "165,165,165"],
    },
    // Exceptions propres à Mono (tout le reste vient des variables et des
    // préréglages) — écrites avec les variables, pas avec des couleurs.
    overrides: [
      [".header", "background: var(--header-bg);"],
      [".ex-type-btn.active", "background: var(--ink); color: var(--on-ink); border-color: var(--ink);"],
      [".live-validate-btn:not(.live-finish-btn)", "background: var(--ink); color: var(--on-ink);"],
      [".live-finish-btn", "background: transparent; color: var(--ink); border: 1.5px solid var(--ink);"],
      // Grandes surfaces claires (tuile Séance en direct, bandeau du repos) :
      // texte à l'encre inversée.
      [".home-tile-wide", "background: var(--ink); color: var(--on-ink); border-color: var(--ink);"],
      [".home-tile-wide .home-tile-eyebrow", "color: rgba(var(--on-ink-rgb), 0.62) !important;"],
      [".home-tile-wide .home-tile-title", "color: var(--on-ink) !important; font-size: 34px; font-style: italic;"],
      [".home-tile-wide .home-tile-play-btn", "background: var(--on-ink); color: var(--ink);"],
      [".live-rest-hero", "background: var(--ink); border: 1.5px solid var(--ink);"],
      [".live-rest-hero .live-rest-hero-label, .live-rest-hero .live-rest-hero-value", "color: var(--on-ink);"],
      [".live-rest-hero.live-rest-hero-active", "background: var(--on-ink); border-color: var(--ink);"],
      [".live-rest-hero.live-rest-hero-active .live-rest-hero-label, .live-rest-hero.live-rest-hero-active .live-rest-hero-value", "color: var(--ink);"],
      [".toggle-switch.on .toggle-switch-knob", "background: var(--on-ink); box-shadow: none;"],
      [".home-tile.live-recording .home-tile-play-btn", "background: var(--on-ink); color: var(--ink);"],
      [".home-tile.live-recording .live-rec-dot", "background: var(--on-ink);"],
      // Action destructrice : cadre à bandes de danger (au lieu du rouge).
      [
        ".modal-btn.danger, .modal-actions-stack .modal-btn.danger, .modal-confirm.danger",
        "background: linear-gradient(var(--on-ink), var(--on-ink)) padding-box, repeating-linear-gradient(-45deg, var(--ink) 0 6px, var(--on-ink) 6px 12px) border-box !important; border: 4px solid transparent !important; color: var(--ink) !important; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;",
      ],
      [".swipe-delete-reveal", "background: var(--ink) !important; border: none !important; color: var(--on-ink) !important;"],
    ],
  },
};

// Ordre d'affichage dans Réglages > Apparence.
const THEME_ORDER = ["day", "night", "anne", "mono"];
const THEME_DEFAULT = "day";

// ---------- Génération de la feuille des apparences ----------
function themeTokensCSS(id, t) {
  const sel = id === THEME_DEFAULT ? `:root, html.mode-${id}, html.mode-${id} #app` : `html.mode-${id}, html.mode-${id} #app`;
  const decl = Object.keys(THEME_TOKENS)
    .map((k) => `  --${k}: ${t.tokens[k]};`)
    .join("\n");
  let css = `${sel} {\n${decl}\n}\nhtml.mode-${id} { color-scheme: ${t.dark ? "dark" : "light"}; }\n`;
  Object.entries(t.screens || {}).forEach(([screen, [hex, rgb]]) => {
    css += `html.mode-${id} #app.theme-${screen} { --accent: ${hex}; --accent-rgb: ${rgb}; }\n`;
  });
  (t.overrides || []).forEach(([selectors, body]) => {
    const scoped = selectors
      .split(",")
      .map((s) => `html.mode-${id} ${s.trim()}`)
      .join(", ");
    css += `${scoped} { ${body} }\n`;
  });
  return css;
}
function buildThemesCSS() {
  return THEME_ORDER.map((id) => `/* --- ${THEMES[id].label} --- */\n${themeTokensCSS(id, THEMES[id])}`).join("\n");
}
function injectThemesCSS() {
  let el = document.getElementById("theme-tokens");
  if (!el) {
    el = document.createElement("style");
    el.id = "theme-tokens";
    // Avant la feuille de styles de l'app : ses règles génériques gardent la
    // priorité à spécificité égale, les variables viennent d'ici.
    const first = document.head.querySelector('link[rel="stylesheet"]');
    document.head.insertBefore(el, first || null);
  }
  el.textContent = buildThemesCSS();
}

// ---------- Appliquer une apparence ----------
// Pose sur <html> : la classe de l'apparence (mode-xxx, pour les variables) et
// les classes de ses PRÉRÉGLAGES (type-xxx, texture-xxx, motion-xxx), lues par la feuille de styles et par 21-motion.js ; met la
// barre d'état à la bonne couleur. Renvoie l'id réellement appliqué.
function applyThemeClasses(id) {
  const t = THEMES[id] ? id : THEME_DEFAULT;
  const theme = THEMES[t];
  const root = document.documentElement;
  const drop = [];
  root.classList.forEach((c) => {
    if (/^(mode|type|texture|motion)-/.test(c)) drop.push(c);
  });
  drop.forEach((c) => root.classList.remove(c));
  root.classList.add(`mode-${t}`, `type-${theme.presets.type}`, `texture-${theme.presets.texture}`, `motion-${theme.presets.motion}`);
  const meta = document.getElementById("theme-color-meta");
  if (meta) meta.setAttribute("content", theme.statusBar);
  return t;
}

// Tout premier affichage : feuille des apparences + apparence enregistrée,
// avant même que la feuille de styles ne peigne quoi que ce soit.
(function initThemes() {
  try {
    injectThemesCSS();
    let saved = THEME_DEFAULT;
    try {
      saved = JSON.parse(localStorage.getItem("gymlog:color-mode")) || THEME_DEFAULT;
    } catch (e) {}
    applyThemeClasses(saved);
  } catch (e) {
    /* sans conséquence : 03-state.js appliquera l'apparence au démarrage */
  }
})();
