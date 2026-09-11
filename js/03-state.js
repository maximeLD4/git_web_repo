
/* ---------- state ---------- */
// "day" | "night" | "anne" — voir applyColorMode, appelé tout de suite après
// pour poser la classe sur <html> et recalculer les couleurs du calendrier
// partagé (ACTIVITY_META, posées en style inline donc pas suivies par les
// variables CSS) dès le tout premier rendu, avant même de dessiner quoi que
// ce soit — pour ne jamais montrer le mode Jour une fraction de seconde
// avant de basculer vers le mode choisi.
let colorMode = loadJSON(KEYS.colorMode, "day");
function applyColorMode(mode) {
  colorMode = mode;
  document.documentElement.classList.remove("mode-day", "mode-night", "mode-anne");
  document.documentElement.classList.add("mode-" + mode);
  applyActivityMetaColors(mode);
}
applyColorMode(colorMode);

let sessions = loadJSON(KEYS.sessions, []);
let library = loadJSON(KEYS.library, []);
let gymExerciseConfigs = loadJSON(KEYS.gymExerciseConfigs, []);
// Liste des exercices de gainage nommés/configurés (Salle de sport, type
// Cardio/Gainage) — volontairement plus simple que gymExerciseConfigs : pas
// de poids/palier/incrément puisque le gainage ne se travaille qu'au temps.
let gainageExerciseConfigs = loadJSON(KEYS.gainageExerciseConfigs, []);
// Plans préparés en amont (module Créer, mode "Plan") — une liste d'exercices
// avec des séries CIBLES (poids/reps) plutôt que des séries réellement
// faites ; pour le gainage, une config de boucle (tours/travail/repos) au
// lieu de séries, puisque le gainage ne se planifie pas en poids/reps.
// Chaque plan : { id, label, createdAt, exercises: [{ id, name, exType,
// category, sets: [{id, weight, reps}], loop: {rounds, workSec, restSec} | null }] }
let sessionPlans = loadJSON(KEYS.sessionPlans, []);
// Migration ponctuelle : un nom d'exercice enregistré sans majuscule initiale
// (tapé avant ce correctif, ex. "ischio") est corrigé une bonne fois pour
// toutes, pour que le nom affiché soit partout identique à ce qui est
// réellement stocké. Appelée ici pour le chargement local, et à nouveau
// juste après la récupération Firebase (voir 04-auth.js) — sans quoi une
// éventuelle ancienne valeur encore présente dans le cloud écraserait cette
// correction locale au moment de la synchro.
function migrateGymExerciseConfigNames() {
  let changed = false;
  gymExerciseConfigs = gymExerciseConfigs.map((c) => {
    const fixedName = capitalizeFirst(c.name);
    if (fixedName === c.name) return c;
    changed = true;
    return { ...c, name: fixedName };
  });
  if (changed) saveJSON(KEYS.gymExerciseConfigs, gymExerciseConfigs);
}
migrateGymExerciseConfigNames();
let gymSettingsFormOpen = false;
let gymSettingsFocusTarget = "name"; // "name" (par défaut) ou "weight" (après un ajout de poids)
let gymSettingsEditingConfigId = null;
let gymSettingsFormDraft = { name: "", category: "pecs", baseWeights: [], maxIncrement: 0 };
let gymSettingsActiveCategory = "all";
// Bascule entre la gestion des exercices Muscu (poids) et celle des
// exercices de Gainage (temps uniquement) dans l'écran Paramètres > Salle
// de sport — deux listes bien distinctes, gérées séparément.
let gymSettingsMode = "muscu"; // "muscu" | "gainage"
let gainageSettingsFormOpen = false;
let gainageSettingsEditingConfigId = null;
let gainageSettingsFormDraft = { name: "" };
let weights = loadJSON(KEYS.weights, []);
let draft = loadJSON(KEYS.draft, null) || { date: todayISO(), label: "", exercises: [], kind: "session" };
if (!Array.isArray(draft.exercises)) draft.exercises = [];
if (!draft.kind) draft.kind = "session"; // séances déjà sauvegardées avant l'ajout des plans

let tab = "log";
let openHistoryIds = {};
let openExerciseIds = {}; // réduit/développé des exercices dans l'onglet Créer (par défaut : développé, sauf réduction explicite)
let draftSaveTimer = null;
let editingSessionId = draft.editingSessionId || null;
let editingPlanId = draft.editingPlanId || null;
// "sessions" (par défaut) ou "plans" — bascule d'affichage dans l'onglet
// Historique de la Salle de sport, indépendante du mode Séance/Plan de
// l'onglet Créer.
// "session" ou "plan" — le grand sélecteur en haut du module Salle de
// sport, qui détermine à la fois ce que l'onglet Créer construit (une
// séance déjà faite, ou un plan à préparer) et ce que l'onglet du bas liste
// (Historique ou Mes plans). Remplace l'ancien double toggle (un dans
// Créer, un dans Historique), tous deux trop discrets pour porter une
// distinction aussi structurante.
let gymTopMode = "session";
let historyViewMode = "calendar"; // "list" | "calendar"
let calendarMonth = todayISO().slice(0, 7);
let selectedCalendarDate = null;

let currentApp = "home"; // "home" | "gym" | "run" | "weight" | "calendar"
let sharedCalendarMonth = todayISO().slice(0, 7);
let sharedSelectedDate = null;

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

const app = document.getElementById("app");
let scannerStream = null;
let scannerExtractedWeights = [];
let scannerReturnTarget = null;
let calendarReturnTarget = null; // true si on doit revenir au calendrier partagé après avoir édité une séance depuis là (au lieu du menu principal ou de rester sur l'onglet Créer)
// true si on doit revenir à Séance en direct (exactement là où on était —
// même exercice, même catégorie) après être passé par Paramètres pour
// configurer un exercice manquant, plutôt que de rester sur Paramètres ou
// de repartir de zéro sur Live (voir le bouton "Configurer un exercice").
let liveConfigReturnTarget = false;
let calendarReturnDate = null; // date de la séance éditée, pour la re-sélectionner au retour dans le calendrier
let openSharedCalendarIds = {}; // réduit/déplié des séances dans le calendrier partagé (par défaut : réduit)
let performanceSelectedExerciseId = null;
let currentUser = null;

/* ---------- Séance en direct : état du parcours pas-à-pas ---------- */
// La séance elle-même (persistée en continu, reprise si l'app se ferme en
// cours de route). null tant qu'aucune séance en direct n'est active.
let liveSession = loadJSON(KEYS.liveSession, null);
// Étape actuelle du parcours : "type" | "category" | "exercise" | "log-set"
let liveStep = "type";
// Sélections en cours, avant qu'un exercice ne soit confirmé/repris
let liveDraftType = ""; // "muscu" | "cardio"
let liveDraftCategory = "";
let liveDraftName = "";
// L'exercice actif dans liveSession.exercises pendant qu'on saisit une série
// (peut être un exercice déjà entamé plus tôt dans la séance, repris ici)
let liveActiveExerciseId = null;
let liveDraftWeight = null; // poids final utilisé (base + incrément le cas échéant) — calculé, jamais saisi directement
let liveDraftBaseWeight = null; // poids réellement sélectionné dans le menu déroulant (toujours un palier existant, jamais l'incrément)
let liveDraftReps = 10;
let liveDraftWeightMode = "off";
let liveDraftDistance = null;
// ---------- Minuteur en boucle (Gainage) ----------
// Saisi à chaque lancement en Live, jamais enregistré (voir conversation) —
// ces valeurs ne sont que le brouillon du petit formulaire de réglage,
// repris comme valeurs de départ la prochaine fois pour éviter d'avoir à
// tout retaper, mais rien n'est jamais persistant côté stockage.
let liveLoopFormOpen = false;
let liveLoopDraftRounds = 10;
let liveLoopDraftWork = 30;
let liveLoopDraftRest = 30;
// Dernier temps de repos mesuré MANUELLEMENT (bouton "Démarrer le repos" puis
// arrêt automatique dès qu'on touche au poids/reps de la série suivante) —
// conservé ici jusqu'à la validation de cette prochaine série, à laquelle il
// sera attaché (voir startLiveSet). Remis à null une fois consommé.
let liveDraftRestSec = null;
// Suppression d'un élément de la frise en deux temps : index (dans
// liveSession.log) actuellement en attente de confirmation, et minuteur
// d'annulation automatique après 2 secondes sans second appui.
let liveTimelineConfirmIndex = null;
let liveTimelineConfirmTimer = null;
// Index (dans liveSession.log) de l'entrée qui vient tout juste d'être
// ajoutée — consommé une seule fois au rendu suivant, pour que l'animation
// d'entrée ne s'applique QUE lors de l'ajout réel, pas à chaque interaction.
let liveJustAddedLogIndex = null;
// true seulement juste après un vrai changement de catégorie (sélection ou
// désélection) — consommé une seule fois au rendu suivant, pour que
// l'animation d'entrée de la liste d'exercices ne rejoue pas à chaque
// interaction sans rapport (ex. premier appui sur une puce de la frise).
let liveCategoryJustChanged = false;

// Garde globale : aucune valeur physique ne peut être négative (poids, reps, distance,
// durée, vitesse, allure...). S'applique à tous les champs numériques, présents et futurs,
// en phase de capture pour corriger la valeur avant que les autres écouteurs ne la lisent.
document.addEventListener(
  "input",
  (e) => {
    const el = e.target;
    if (el.tagName !== "INPUT") return;
    // Champs texte dédiés aux nombres à virgule (poids, distances, allure...)
    // — volontairement en type="text" + inputmode="decimal" plutôt que
    // type="number", car un input natif type="number" rejette la virgule
    // avant même que ce script ne puisse intervenir, empêchant toute
    // correction. Certains claviers (notamment en français) ne proposent
    // que la virgule comme séparateur décimal, alors que le code interprète
    // toujours un point — on la convertit ici à la volée, une bonne fois
    // pour toutes, sans jamais avoir à y penser ailleurs dans le code.
    if (el.inputMode === "decimal" && el.value.indexOf(",") !== -1) {
      el.value = el.value.replace(/,/g, ".");
    }
    if ((el.type === "number" || el.inputMode === "decimal") && el.value.indexOf("-") !== -1) {
      el.value = el.value.replace(/-/g, "");
    }
  },
  true
);
