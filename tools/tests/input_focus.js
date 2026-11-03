// Champs de saisie touchés : aucun rectangle d'ombre autour du texte, dans les 3 thèmes (le mode Anne en
// affichait un, rosé, autour du nom d'exercice). Usage : node tools/tests/input_focus.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8835'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
  for (const mode of ['day', 'night', 'anne']) {
    await p.evaluate((m) => { applyShowHints(false); applyColorMode(m); currentUser = { uid: 'u' }; gymExerciseConfigs = [{ id: 'c', name: 'Leg extension', category: 'jambes', baseWeights: [40] }]; gymSettingsFormOpen = false; gainageSettingsFormOpen = false; gymSettingsMode = 'muscu'; currentApp = 'settings-gym'; render(); document.querySelector('[data-edit-config="c"]').click(); }, mode);
    await p.waitForTimeout(200);
    const res = [];
    for (const id of ['config-name-input', 'config-new-base-weight', 'config-max-increment']) {
      await p.focus('#' + id); await p.waitForTimeout(60);
      res.push(id + ':' + (await p.evaluate((id) => { const cs = getComputedStyle(document.getElementById(id)); return cs.boxShadow === 'none' && cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'ok' : cs.boxShadow + ' / ' + cs.backgroundColor; }, id)));
    }
    check(`${mode} — Réglages > exercice : nom, poids à ajouter, incrément — sans ombre ni fond une fois touchés`, res.every((r) => r.endsWith(':ok')), JSON.stringify(res));
    const gap = await p.evaluate(() => { const m = document.getElementById('config-max-increment-minus').getBoundingClientRect(), pl = document.getElementById('config-max-increment-plus').getBoundingClientRect(); const cs = getComputedStyle(document.getElementById('config-max-increment-plus')); return { gap: Math.round(pl.left - m.right), shadow: cs.boxShadow }; });
    check(`${mode} — « Incrément possible » : − et + séparés (≥ 6 px)${mode === 'anne' ? ', ombre serrée' : ''}`, gap.gap >= 6 && (mode !== 'anne' || /0px 1px 3px/.test(gap.shadow)), JSON.stringify(gap));
  }
  // − / + dessinés et centrés (3.3.7) : le dessin est au centre géométrique du bouton, quelle que soit la police.
  for (const [where, prep] of [['Réglages', () => { currentApp = 'settings-gym'; gymSettingsFormOpen = false; render(); document.querySelector('[data-edit-config="c"]').click(); }], ['Séance en direct', () => { liveSession = null; liveStep = 'category'; liveDraftType = 'muscu'; currentApp = 'live'; render(); document.querySelector('[data-live-pick-plan=""]')?.click(); document.querySelector('[data-live-category="jambes"]').click(); document.querySelector('[data-live-exercise="Leg extension"]').click(); }]]) {
    await p.evaluate(prep); await p.waitForTimeout(250);
    const r = await p.evaluate(() => [...document.querySelectorAll('.rep-step-btn, .live-stepper-btn, .live-stepper-tiny-btn')].filter((b) => b.offsetParent).map((b) => { const g = b.querySelector('svg.step-glyph'); if (!g) return 'texte:' + b.textContent; const bb = b.getBoundingClientRect(), gb = g.getBoundingClientRect(); return Math.max(Math.abs((gb.left + gb.right) / 2 - (bb.left + bb.right) / 2), Math.abs((gb.top + gb.bottom) / 2 - (bb.top + bb.bottom) / 2)).toFixed(2); }));
    check(`${where} : chaque − / + est un dessin centré dans son bouton (écart < 0,5 px)`, r.length > 0 && r.every((x) => !/texte/.test(x) && parseFloat(x) < 0.5), JSON.stringify(r));
  }
  check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune');
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
