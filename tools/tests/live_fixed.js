// Séance en direct : l'écran de saisie ne défile jamais — tout tient dans la hauteur, sur tous les écrans,
// dans le pire cas (unilatéral + incrément + exercice jumelé, repos en cours). Usage : node tools/tests/live_fixed.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8821'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
const HEIGHTS = [667, 740, 844, 932]; // iPhone SE, petits Android, iPhone 14, iPhone 14 Plus
const SETUP = () => {
  currentUser = { uid: 'u' };
  gymExerciseConfigs = [
    { id: 'c1', name: 'Développé couché prise serrée', category: 'pecs', baseWeights: [40, 45, 50, 55], maxIncrement: 2.5, unilateral: true, pairedExerciseId: 'c2' },
    { id: 'c2', name: 'Écarté poulie', category: 'pecs', baseWeights: [10, 15], maxIncrement: 0 },
  ];
  gainageExerciseConfigs = [{ id: 'g', name: 'Planche', rounds: 6, workSec: 40, restSec: 15 }];
};
const fresh = () => { liveSession = null; liveActiveExerciseId = null; liveStep = 'category'; liveDraftType = 'muscu'; currentApp = 'live'; render(); const n = document.querySelector('[data-live-no-plan], [data-live-skip-plan]'); if (n) n.click(); };
const STATES = {
  'Muscu, prêt (pire cas : côté, incrément, jumelé)': () => { window.__fresh(); document.querySelector('[data-live-category="pecs"]').click(); document.querySelector('[data-live-exercise="Développé couché prise serrée"]').click(); },
  'Muscu, série en cours': () => { startLiveSet(); },
  'Muscu, repos (bandeau Repos + frise)': () => { finishLiveSet(); const v = document.querySelector('[data-live-validate]'); if (v) v.click(); if (!liveSession.restStartedAt) { liveSession.restStartedAt = Date.now(); } renderLiveStep(); },
  'Rameur, repos (bonhomme au centre)': () => { window.__fresh(); liveDraftType = 'cardio'; renderLiveStep(); document.querySelector('[data-live-cardio-category="rameur"]').click(); liveSession.restStartedAt = Date.now(); renderLiveStep(); },
  'Rameur, série en cours (rameur animé + distance)': () => { startLiveSet(); },
  'Gainage, prêt (avec « Lancer en boucle »), repos': () => { window.__fresh(); liveDraftType = 'cardio'; renderLiveStep(); document.querySelector('[data-live-cardio-category="gainage"]').click(); const e = document.querySelector('[data-live-exercise="Planche"]'); if (e) e.click(); liveSession.restStartedAt = Date.now(); renderLiveStep(); },
  'Gainage, réglage de la boucle': () => { document.querySelector('[data-live-open-loop-form]').click(); },
  'Gainage, boucle : travail': () => { document.querySelector('[data-live-start-loop]').click(); },
  'Gainage, boucle : repos': () => { document.querySelector('[data-live-skip-loop-phase]').click(); },
};
(async () => { const b = await chromium.launch();
  for (const hints of [false, true]) {
    console.log(`\n=== Textes d'aide ${hints ? 'ACTIVÉS' : 'masqués (par défaut)'} ===`);
    for (const h of HEIGHTS) {
      const ctx = await b.newContext({ viewport: { width: 375, height: h }, serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
      await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
      p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
      await p.evaluate((hints) => applyShowHints(hints), hints); await p.evaluate(SETUP); await p.evaluate('window.__fresh = ' + fresh.toString());
      for (const [name, fn] of Object.entries(STATES)) {
        await p.evaluate(fn); await p.waitForTimeout(250);
        const r = await p.evaluate(() => { const sc = document.querySelector('.live-set-form-scroll'), body = document.getElementById('live-content'), acts = document.querySelector('.live-set-form-actions');
          const over = (el) => el ? el.scrollHeight - el.clientHeight : 0; const last = acts ? acts.lastElementChild.getBoundingClientRect().bottom : 0;
          return { form: !!sc, scrollable: sc ? getComputedStyle(sc).overflowY : '', hidden: Math.max(over(sc), over(body)), btnsIn: !acts || last <= innerHeight + 0.5 }; });
        check(`${String(h).padEnd(4)} px — ${name}`, r.form && r.scrollable === 'hidden' && r.hidden <= 1 && r.btnsIn, r.hidden > 1 ? `${r.hidden}px de trop` : r.btnsIn ? undefined : 'boutons hors écran');
      }
      if (p.errs.length) check('    aucune erreur JS', false, p.errs.join(' | ')); await ctx.close();
    }
  }
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
