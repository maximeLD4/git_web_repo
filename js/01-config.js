/* ---------- storage helpers (fully local, no account, no server) ---------- */
const KEYS = {
  colorMode: "gymlog:color-mode",
  sessions: "gymlog:sessions",
  library: "gymlog:library",
  weights: "gymlog:weights",
  draft: "gymlog:draft",
  lastExport: "gymlog:last-export",
  lastImport: "gymlog:last-import",
  runSessions: "gymlog:run-sessions",
  runLibrary: "gymlog:run-library",
  runDraft: "gymlog:run-draft",
  swimSessions: "gymlog:swim-sessions",
  swimLibrary: "gymlog:swim-library",
  swimDraft: "gymlog:swim-draft",
  bikeSessions: "gymlog:bike-sessions",
  bikeLibrary: "gymlog:bike-library",
  bikeDraft: "gymlog:bike-draft",
  gymExerciseConfigs: "gymlog:gym-exercise-configs",
  gainageExerciseConfigs: "gymlog:gainage-exercise-configs",
  firebaseDirtyKeys: "gymlog:firebase-dirty-keys",
  sessionPlans: "gymlog:session-plans",
  liveSession: "gymlog:live-session",
};

/* ---------- icons ---------- */
const ICONS = {
  plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 9 17 20 6"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 7v10M4 9.5v5M17.5 7v10M20 9.5v5M6.5 12h11"/></svg>',
  history: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  scale: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16l5-4 4 3 7-8"/><circle cx="20" cy="7" r="1.6" fill="currentColor"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
  reset: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
  grip: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  edit: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  duplicate: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  miniUp: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"/></svg>',
  miniDown: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  calendarBig: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  swim: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 11c1.4-1.3 2.8-1.3 4.2 0s2.8 1.3 4.2 0 2.8-1.3 4.2 0 2.8 1.3 4.2 0 2.8-1.3 4.2 0"/><path d="M2 16c1.4-1.3 2.8-1.3 4.2 0s2.8 1.3 4.2 0 2.8-1.3 4.2 0 2.8 1.3 4.2 0 2.8-1.3 4.2 0"/></svg>',
  bike: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1" fill="currentColor"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.6-10-9.3C.4 8 1.7 4.6 5 3.7c2.3-.6 4.6.4 6 2.4 1.4-2 3.7-3 6-2.4 3.3.9 4.6 4.3 3 7.5-2.5 4.7-10 9.3-10 9.3z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  logout: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  camera: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/><circle cx="12" cy="13" r="4"/></svg>',
  trending: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  stopwatch: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5"/><path d="M9 2h6"/><path d="M12 2v3"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="none"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
  stop: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>',
};

const GYM_EXERCISE_CATEGORIES = [
  { key: "pecs", label: "Pecs" },
  { key: "dos", label: "Dos" },
  { key: "epaules", label: "Épaules" },
  { key: "bras", label: "Bras" },
  { key: "jambes", label: "Jambes" },
  { key: "fessiers", label: "Fessiers" },
  { key: "abdos", label: "Abdos" },
];

// Catégories du type Cardio/Gainage (Salle de sport). Rameur/Vélo/Course
// sont des catégories "simples" : leur nom EST déjà l'exercice, pas besoin
// d'aller plus loin (voir liveCategoryStepHTML). Gainage fonctionne
// différemment — comme la Muscu — puisqu'on veut pouvoir distinguer
// plusieurs exercices de gainage entre eux (planche, gainage latéral...) ;
// voir gainageExerciseConfigs.
const CARDIO_CATEGORIES = [
  { key: "rameur", label: "Rameur" },
  { key: "velo", label: "Vélo" },
  { key: "course", label: "Course à pied" },
];
const GAINAGE_CATEGORY = { key: "gainage", label: "Gainage" };

const EXERCISE_SUGGESTIONS = {
  pecs: [
    "Développé couché", "Développé incliné", "Développé décliné", "Développé haltères",
    "Écarté couché", "Dips", "Pompes",
  ],
  dos: [
    "Tirage horizontal", "Tirage vertical", "Rowing barre", "Rowing haltère",
    "Tractions", "Soulevé de terre", "Shrugs",
  ],
  epaules: [
    "Développé militaire", "Élévations latérales", "Élévations frontales",
    "Oiseau", "Face pull", "Rowing menton",
  ],
  bras: [
    "Curl biceps", "Curl marteau", "Curl pupitre",
    "Extension triceps poulie", "Dips triceps", "Barre au front",
  ],
  jambes: [
    "Squat", "Presse à cuisses", "Extension jambes", "Leg curl", "Fentes",
    "Mollets", "Adducteurs", "Abducteurs",
  ],
  fessiers: [
    "Hip thrust", "Soulevé de terre roumain", "Glute bridge", "Kickback", "Squat sumo",
  ],
  abdos: [
    "Crunch", "Gainage", "Relevé de jambes", "Russian twist", "Crunch poulie",
  ],
  gainage: [
    "Planche", "Planche latérale", "Superman", "Gainage dynamique", "Pont fessier isométrique", "Mountain climbers",
  ],
};

const ACTIVITY_META = [
  { key: "gym", color: "#8FA06B", rgb: "143,160,107", label: "Muscu" },
  { key: "run", color: "#D08A62", rgb: "208,138,98", label: "Course" },
  { key: "swim", color: "#6FA3A0", rgb: "111,163,160", label: "Natation" },
  { key: "bike", color: "#D9AD5D", rgb: "217,173,93", label: "Vélo" },
  // Gainage a sa propre entrée (couleur/légende) dans le calendrier partagé
  // plutôt que d'être noyé sous "Muscu" — voir isGainageOnlySession dans
  // 14-shared-calendar.js : une séance qui ne contient QUE du gainage est
  // désormais comptée/affichée à part, pas comme si c'était de la muscu.
  { key: "gainage", color: "#A65C4B", rgb: "166,92,75", label: "Gainage" },
];

// Ces couleurs sont posées en style inline (calendrier partagé) — elles ne
// répondent donc PAS aux variables CSS de thème comme le reste de l'app.
// On les recalcule "à la main" à chaque changement de mode (voir
// applyColorMode dans 03-state.js) plutôt que de les figer une fois pour
// toutes, pour qu'elles restent lisibles sur un fond sombre (Nuit) ou
// s'accordent avec la teinte rose (Anne).
const ACTIVITY_META_COLORS = {
  day: {
    gym: ["#8FA06B", "143,160,107"],
    run: ["#D08A62", "208,138,98"],
    swim: ["#6FA3A0", "111,163,160"],
    bike: ["#D9AD5D", "217,173,93"],
    gainage: ["#A65C4B", "166,92,75"],
  },
  night: {
    gym: ["#A9BC8B", "169,188,139"],
    run: ["#E0A47F", "224,164,127"],
    swim: ["#8BC0BC", "139,192,188"],
    bike: ["#E8C077", "232,192,119"],
    gainage: ["#C47C6C", "196,124,108"],
  },
  anne: {
    gym: ["#C9718F", "201,113,143"],
    run: ["#D9435F", "217,67,95"],
    swim: ["#B03A5B", "176,58,91"],
    bike: ["#E0708F", "224,112,143"],
    gainage: ["#8C2F45", "140,47,69"],
  },
};
function applyActivityMetaColors(mode) {
  const set = ACTIVITY_META_COLORS[mode] || ACTIVITY_META_COLORS.day;
  ACTIVITY_META.forEach((a) => {
    const c = set[a.key];
    if (c) {
      a.color = c[0];
      a.rgb = c[1];
    }
  });
}
