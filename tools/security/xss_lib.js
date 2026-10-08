// Banc d'essai : on remplace CHAQUE valeur (texte ET nombre) d'un jeu de données complet par une charge piégée,
// on la fait entrer par un chemin réel de l'app, puis on affiche tous les écrans et on détecte :
//   - l'exécution de code (compteur window.__PWNED),
//   - toute balise injectée portant un gestionnaire d'évènement (on*), ou <img src=x>, <svg>, <script> dans l'app.
const { chromium } = require('playwright');
const PAYLOADS = {
  'balise <img>': '<img src=x onerror=window.__P()>',
  'sortie d\'attribut "': 'x" onmouseover="window.__P()" onfocus="window.__P()" autofocus tabindex="0" data-x="',
  'balise après guillemet': '"><svg onload=window.__P()>',
  'sortie d\'attribut \'': "x' onmouseover='window.__P()' data-x='",
  'fermeture textarea/select': '</textarea></select><img src=x onerror=window.__P()>',
};
const base = () => ({
  sessions: [{ id: 's1', date: '2026-09-01', label: 'Push', exercises: [{ id: 'e1', name: 'Squat', exType: 'muscu', category: 'jambes', sets: [{ id: 'x1', weight: 60, reps: 10, side: 'left' }, { id: 'x2', weight: 70, reps: 8 }] }, { id: 'e2', name: 'Planche', exType: 'cardio', category: 'gainage', sets: [{ id: 'x3', duration: 40, rounds: 3 }] }] }],
  runSessions: [{ id: 'r1', date: '2026-09-02', label: 'Footing', blocks: [{ id: 'b1', label: 'Bloc', mode: 'duration', duration: '30', distance: '5', pace: '6' }] }],
  swimSessions: [{ id: 'w1', date: '2026-09-03', label: 'Crawl', blocks: [{ id: 'b2', label: 'Bloc', mode: 'pool', poolLength: '25', lengths: '40', duration: '34' }] }],
  bikeSessions: [{ id: 'k1', date: '2026-09-04', label: 'Route', blocks: [{ id: 'b3', label: 'Bloc', mode: 'duration', duration: '60', distance: '20' }] }],
  library: ['Squat', 'Curl'], runLibrary: [], swimLibrary: [], bikeLibrary: [],
  gymExerciseConfigs: [{ id: 'c1', name: 'Squat', category: 'jambes', baseWeights: [60, 70], maxIncrement: 2.5, autoIncrement: true, unilateral: true, pairedExerciseId: 'c2' }, { id: 'c2', name: 'Curl', category: 'bras', baseWeights: [10], maxIncrement: 0, autoIncrement: false, unilateral: false, pairedExerciseId: 'c1' }],
  gainageExerciseConfigs: [{ id: 'g1', name: 'Planche', rounds: 6, workSec: 40, restSec: 20 }],
  sessionPlans: [{ id: 'p1', label: 'Push A', createdAt: '2026-09-01', exercises: [{ id: 'pe1', name: 'Squat', exType: 'muscu', category: 'jambes', sets: [{ id: 'ps1', weight: 60, reps: 10 }], loop: null }, { id: 'pe2', name: 'Planche', exType: 'cardio', category: 'gainage', sets: [], loop: { rounds: 4, workSec: 30, restSec: 15 } }] }],
  weights: [{ id: 'q1', date: '2026-09-25', weight: 77.1 }, { id: 'q2', date: '2026-09-18', weight: 77.5 }],
});
const mapLeaves = (v, payload, numbersToo) => {
  if (typeof v === 'string') return payload;
  if (typeof v === 'number') return numbersToo ? payload : v;
  if (Array.isArray(v)) return v.map((x) => mapLeaves(x, payload, numbersToo));
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = mapLeaves(v[k], payload, numbersToo); return o; }
  return v;
};

const SCREENS = [
    ['Accueil', () => { currentApp = 'home'; render(); }],
  ['Salle > Créer', () => { currentApp = 'gym'; tab = 'log'; gymTopMode = 'session'; clearDraft(); render(); }],
  ['Salle > Séances', () => { currentApp = 'gym'; tab = 'history'; gymTopMode = 'session'; render(); }],
  ['Salle > Plans', () => { currentApp = 'gym'; tab = 'history'; gymTopMode = 'plan'; render(); }],
  ['Salle > modifier une séance', () => { currentApp = 'gym'; tab = 'log'; gymTopMode = 'session'; startEditSession(sessions[0]); render(); }],
  ['Course > Séances', () => { currentApp = 'run'; runTab = 'history'; runTopMode = 'session'; render(); }],
  ['Natation > Séances', () => { currentApp = 'swim'; swimTab = 'history'; swimTopMode = 'session'; render(); }],
  ['Vélo > Séances', () => { currentApp = 'bike'; bikeTab = 'history'; bikeTopMode = 'session'; render(); }],
  ['Poids', () => { currentApp = 'weight'; render(); }],
  ['Performance', () => { currentApp = 'performance'; render(); }],
  ['Calendrier', () => { currentApp = 'calendar'; render(); }],
  ['Calendrier > jour', () => { currentApp = 'calendar'; render(); document.querySelectorAll('[data-shared-cal-date]').forEach((el) => el.click()); }],
  ['Réglages', () => { currentApp = 'settings'; render(); }],
  ['Réglages > Exercices (liste)', () => { currentApp = 'settings-gym'; render(); }],
  ['Réglages > Exercices (formulaire)', () => { currentApp = 'settings-gym'; render(); document.querySelector('[data-edit-config]')?.click(); }],
  ['Réglages > Gainage (liste)', () => { currentApp = 'settings-gym'; render(); [...document.querySelectorAll('.ex-type-btn')].find((x) => /Gainage/.test(x.textContent))?.click(); }],
  ['Réglages > Sauvegarde', () => { currentApp = 'settings-backup'; render(); }],
  ['Live > choix du plan', () => { liveSession = null; currentApp = 'live'; render(); }],
  ['Live > plan choisi', () => { liveSession = null; currentApp = 'live'; render(); document.querySelector('[data-live-pick-plan]')?.click(); }],
  ['Live > catégorie > exercice', () => { liveSession = null; currentApp = 'live'; render(); document.querySelector('[data-live-no-plan], [data-live-skip-plan]')?.click(); document.querySelector('[data-live-category]')?.click(); document.querySelector('[data-live-exercise]')?.click(); }],
];
const EXPAND = '[data-toggle],[data-shared-toggle],[data-run-toggle],[data-swim-toggle],[data-bike-toggle],[data-plan-toggle]';
async function newPage(browser, dir, port) {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, serviceWorkers: 'block' }); const p = await ctx.newPage();
  await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { window.__PWNED = 0; window.__P = () => { window.__PWNED++; };
    const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } };
    window.__CLOUD = {}; const ref = (path) => ({ child: (c) => ref(path + '/' + c), once: () => Promise.resolve({ val: () => { const k = path.replace(/^users\/[^/]+\//, ''); return window.__CLOUD[k] === undefined ? null : window.__CLOUD[k]; } }), set: () => Promise.resolve() });
    window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref }) }; });
  await p.goto(`http://localhost:${port}/${dir}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(350);
  return { ctx, p };
}
// "data" = jeu piégé (entre par le chemin testé) ; "clean" = jeu sain (saisi localement, pour les données qui n'entrent PAS par ce chemin)
async function inject(p, path, data, clean) {
  return p.evaluate(async ({ path, data, clean, SCREENS_SRC, EXPAND }) => {
    const out = []; const errors = []; window.__PWNED = 0;
    document.getElementById('app').innerHTML = ''; document.getElementById('custom-modal-root').innerHTML = ''; liveSession = null;
    const onErr = (e) => errors.push(e.message); window.addEventListener('error', onErr);
    currentUser = { uid: 'u1', email: 'a@b.c' }; gymExerciseConfigs = []; gainageExerciseConfigs = []; sessionPlans = []; weights = []; sessions = []; runSessions = []; swimSessions = []; bikeSessions = [];
    const reported = new Set();
    const scan = (where) => {
      const hits = [];
      document.querySelectorAll('#app *, #custom-modal-root *').forEach((el) => {
        for (const at of el.attributes) if (/^on/i.test(at.name)) hits.push(`${el.tagName.toLowerCase()}[${at.name}]`);
        if (el.tagName === 'IMG' && el.getAttribute('src') === 'x') hits.push('img[src=x]');
        if (el.tagName === 'SCRIPT') hits.push('script');
      });
      if (hits.length) out.push({ where, hits: [...new Set(hits)].slice(0, 4) });
    };
    const local = (d) => { gymExerciseConfigs = d.gymExerciseConfigs; gainageExerciseConfigs = d.gainageExerciseConfigs; sessionPlans = d.sessionPlans; weights = d.weights; sessions = d.sessions; runSessions = d.runSessions; swimSessions = d.swimSessions; bikeSessions = d.bikeSessions; };
    try {
      if (path === 'cloud') { window.__CLOUD = { 'sessions/gym': data.sessions, 'sessions/run': data.runSessions, 'sessions/swim': data.swimSessions, 'sessions/bike': data.bikeSessions, 'library/gym': data.library, 'library/run': data.runLibrary, 'library/swim': data.swimLibrary, 'library/bike': data.bikeLibrary, gymExerciseConfigs: data.gymExerciseConfigs, gainageExerciseConfigs: data.gainageExerciseConfigs, sessionPlans: data.sessionPlans, weights: data.weights }; await pullFromFirebase(); }
      else if (path === 'import-sauvegarde') { restoreFromBackupData(data); }
      else if (path === 'local-brut') { local(data); }
      else { local(clean);
        for (const [type, s] of [['gym', data.sessions[0]], ['run', data.runSessions[0]], ['swim', data.swimSessions[0]], ['bike', data.bikeSessions[0]]]) {
          handleImportedFile({ kind: 'gymlog-single-session', type, session: s }, () => {}); await new Promise((r) => setTimeout(r, 50));
          scan('modale de confirmation (' + type + ')'); document.querySelector('.modal-confirm')?.click(); await new Promise((r) => setTimeout(r, 50)); } }
    } catch (e) { errors.push('entrée: ' + e.message.slice(0, 80)); }
    scan('après entrée');
    for (const [name, src] of SCREENS_SRC) {
      try { (new Function('return (' + src + ')'))()(); await new Promise((r) => setTimeout(r, 35));
        let i = 0; while (i < 12) { const els = document.querySelectorAll(EXPAND); if (!els[i]) break; els[i].click(); await new Promise((r) => setTimeout(r, 20)); i++; }
        scan(name);
      } catch (e) { errors.push(name + ': ' + e.message.slice(0, 70)); }
    }
    window.removeEventListener('error', onErr);
    return { out, errors: [...new Set(errors)].slice(0, 6), pwned: window.__PWNED };
  }, { path, data, clean, SCREENS_SRC: SCREENS.map(([n, f]) => [n, f.toString()]), EXPAND });
}
// chemins de feuilles du jeu de données
function leafPaths(v, pre = []) {
  if (v === null || typeof v !== 'object') return [pre];
  return Object.keys(v).flatMap((k) => leafPaths(v[k], [...pre, k]));
}
function setAt(obj, path, value) { const o = JSON.parse(JSON.stringify(obj)); let c = o; path.slice(0, -1).forEach((k) => { c = c[k]; }); c[path[path.length - 1]] = value; return o; }
module.exports = { PAYLOADS, base, mapLeaves, SCREENS, newPage, inject, leafPaths, setAt };
