
/* ---------- state ---------- */
let sessions = loadJSON(KEYS.sessions, []);
let library = loadJSON(KEYS.library, []);
let gymExerciseConfigs = loadJSON(KEYS.gymExerciseConfigs, []);
let gymSettingsFormOpen = false;
let gymSettingsFocusTarget = "name"; // "name" (par défaut) ou "weight" (après un ajout de poids)
let gymSettingsEditingConfigId = null;
let gymSettingsFormDraft = { name: "", category: "pecs", baseWeights: [], maxIncrement: 0 };
let gymSettingsActiveCategory = "all";
let weights = loadJSON(KEYS.weights, []);
let draft = loadJSON(KEYS.draft, null) || { date: todayISO(), label: "", exercises: [] };
if (!Array.isArray(draft.exercises)) draft.exercises = [];

let tab = "log";
let openHistoryIds = {};
let openExerciseIds = {}; // réduit/développé des exercices dans l'onglet Créer (par défaut : développé, sauf réduction explicite)
let draftSaveTimer = null;
let editingSessionId = draft.editingSessionId || null;
let historyViewMode = "calendar"; // "list" | "calendar"
let calendarMonth = todayISO().slice(0, 7);
let selectedCalendarDate = null;
let calendarTimeFilter = "past";

let currentApp = "home"; // "home" | "gym" | "run" | "weight" | "calendar"
let sharedCalendarMonth = todayISO().slice(0, 7);
let sharedSelectedDate = null;
let sharedCalendarTimeFilter = "past"; // "past" | "future"

let runSessions = loadJSON(KEYS.runSessions, []);
let runLibrary = loadJSON(KEYS.runLibrary, []);
let runDraft = loadJSON(KEYS.runDraft, null) || { date: todayISO(), label: "", blocks: [emptyBlock()] };
if (!Array.isArray(runDraft.blocks) || runDraft.blocks.length === 0) runDraft.blocks = [emptyBlock()];
let runEditingSessionId = runDraft.editingSessionId || null;
let runTab = "log";
let openRunHistoryIds = {};
let runDraftSaveTimer = null;
let runHistoryViewMode = "calendar"; // "list" | "calendar"
let runCalendarMonth = todayISO().slice(0, 7);
let runSelectedCalendarDate = null;
let runCalendarTimeFilter = "past";

let swimSessions = loadJSON(KEYS.swimSessions, []);
let swimLibrary = loadJSON(KEYS.swimLibrary, []);
let swimDraft = loadJSON(KEYS.swimDraft, null) || { date: todayISO(), label: "", blocks: [emptySwimBlock()] };
if (!Array.isArray(swimDraft.blocks) || swimDraft.blocks.length === 0) swimDraft.blocks = [emptySwimBlock()];
let swimEditingSessionId = swimDraft.editingSessionId || null;
let swimTab = "log";
let openSwimHistoryIds = {};
let swimDraftSaveTimer = null;
let swimHistoryViewMode = "calendar";
let swimCalendarMonth = todayISO().slice(0, 7);
let swimSelectedCalendarDate = null;
let swimCalendarTimeFilter = "past";

let bikeSessions = loadJSON(KEYS.bikeSessions, []);
let bikeLibrary = loadJSON(KEYS.bikeLibrary, []);
let bikeDraft = loadJSON(KEYS.bikeDraft, null) || { date: todayISO(), label: "", blocks: [emptyBikeBlock()] };
if (!Array.isArray(bikeDraft.blocks) || bikeDraft.blocks.length === 0) bikeDraft.blocks = [emptyBikeBlock()];
let bikeEditingSessionId = bikeDraft.editingSessionId || null;
let bikeTab = "log";
let openBikeHistoryIds = {};
let bikeDraftSaveTimer = null;
let bikeHistoryViewMode = "calendar";
let bikeCalendarMonth = todayISO().slice(0, 7);
let bikeSelectedCalendarDate = null;
let bikeCalendarTimeFilter = "past";

const app = document.getElementById("app");
let scannerStream = null;
let scannerExtractedWeights = [];
let scannerReturnTarget = null;
let performanceSelectedExerciseId = null;
let currentUser = null;

// Garde globale : aucune valeur physique ne peut être négative (poids, reps, distance,
// durée, vitesse, allure...). S'applique à tous les champs numériques, présents et futurs,
// en phase de capture pour corriger la valeur avant que les autres écouteurs ne la lisent.
document.addEventListener(
  "input",
  (e) => {
    const el = e.target;
    if (el.tagName === "INPUT" && el.type === "number" && el.value.indexOf("-") !== -1) {
      el.value = el.value.replace(/-/g, "");
    }
  },
  true
);
