// Boucle de gainage : décompte en bips sur les 4 dernières secondes de chaque phase — « 3, 2, 1, GO » avant
// l'effort, « 3, 2, 1, STOP » avant le repos —, le dernier bip pile au moment du changement.
// Usage : node tools/tests/loop_countdown.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8823'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
const TICK = 660, GO = 1046, STOP = 392;
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
  // Enregistre chaque bip (fréquence, instant) au lieu de le jouer.
  await p.evaluate(() => { window.__beeps = []; window.playLiveBeep = (f, d) => window.__beeps.push({ f, d, t: performance.now() }); currentUser = { uid: 'u' }; gainageExerciseConfigs = [{ id: 'g', name: 'Planche', rounds: 2, workSec: 5, restSec: 5 }]; });
  const goLoop = async (rounds, work, rest) => { await p.evaluate(([r, w, re]) => { liveSession = null; liveActiveExerciseId = null; liveStep = 'category'; liveDraftType = 'cardio'; currentApp = 'live'; render(); document.querySelector('[data-live-no-plan], [data-live-skip-plan]')?.click(); liveDraftType = 'cardio'; renderLiveStep(); document.querySelector('[data-live-cardio-category="gainage"]').click(); document.querySelector('[data-live-exercise="Planche"]')?.click(); window.__beeps = []; window.__t0 = performance.now(); startLiveLoop(r, w, re); }, [rounds, work, rest]); };
  const beeps = () => p.evaluate(() => window.__beeps.map((x) => ({ f: x.f, d: x.d, s: Math.round((x.t - window.__t0) / 100) / 10 })));
  const near = (a, b, tol = 0.25) => Math.abs(a - b) <= tol;

  console.log('=== Boucle 2 tours : 5 s de travail, 5 s de repos ===');
  await goLoop(2, 5, 5); await p.waitForTimeout(20800);
  const bs = await beeps(); const seq = bs.map((x) => (x.f === TICK ? 'tic' : x.f === GO ? 'GO' : x.f === STOP ? 'STOP' : 'fin')).join(' ');
  console.log('   ' + bs.map((x) => `${x.s}s:${x.f === TICK ? 'tic' : x.f === GO ? 'GO' : x.f === STOP ? 'STOP' : x.f}`).join('  '));
  check('Séquence : GO, puis à chaque changement 3 tics + le bip long (STOP / GO), et la fin', seq === 'GO tic tic tic STOP tic tic tic GO tic tic tic STOP tic tic tic fin fin fin', seq);
  const at = (i) => bs[i] ? bs[i].s : NaN;
  check('Tics à 2, 3, 4 s, STOP à 5 s pile (le 4e bip au rythme des 3 premiers)', near(at(1), 2) && near(at(2), 3) && near(at(3), 4) && near(at(4), 5), [at(1), at(2), at(3), at(4)].join(' / '));
  check('Repos : tics à 7, 8, 9 s, GO à 10 s pile', near(at(5), 7) && near(at(6), 8) && near(at(7), 9) && near(at(8), 10), [at(5), at(6), at(7), at(8)].join(' / '));
  check('Tic court, GO / STOP longs', bs.filter((x) => x.f === TICK).every((x) => x.d <= 150) && bs.filter((x) => x.f === GO || x.f === STOP).every((x) => x.d >= 400));
  check('GO aigu, STOP grave, tic entre les deux', GO > TICK && TICK > STOP);
  check('La boucle passe bien de phase au même instant que le bip (pas jusqu\'à 1 s plus tard)', await p.evaluate(() => !liveSession.loop));

  console.log('\n=== Phases plus courtes que 4 s, et « Passer » ===');
  await goLoop(2, 2, 6); await p.waitForTimeout(2600);
  let b2 = await beeps(); check('Travail de 2 s : un seul tic (à 1 s), puis STOP à 2 s', b2.map((x) => x.f).join(',') === [GO, TICK, STOP].join(',') && near(b2[1].s, 1) && near(b2[2].s, 2), JSON.stringify(b2));
  await p.waitForTimeout(1000); await p.click('[data-live-skip-loop-phase]'); await p.waitForTimeout(3800);
  b2 = await beeps(); const afterSkip = b2.slice(3);
  check('« Passer » le repos : GO tout de suite, et les tics prévus pour ce repos ne sonnent plus', afterSkip.length >= 1 && afterSkip[0].f === GO && !afterSkip.slice(1).some((x) => x.s < afterSkip[0].s + 0.5), JSON.stringify(afterSkip));
  await p.click('[data-live-stop-loop]'); await p.waitForTimeout(300); const cf = await p.$('.modal-btn.danger, [data-modal-confirm]'); if (cf) { await cf.click(); await p.waitForTimeout(200); }
  const n = (await beeps()).length; await p.waitForTimeout(3000);
  check('Boucle arrêtée : plus aucun bip ensuite', (await beeps()).length === n);

  console.log('\n=== Réglages > Son ===');
  await p.evaluate(() => { window.__beeps = []; window.__t0 = performance.now(); currentApp = 'settings-sound'; render(); document.getElementById('test-sound-btn').click(); }); await p.waitForTimeout(3400);
  const b3 = await beeps(); check('« Tester le son » joue le décompte complet : 3 tics puis GO', b3.map((x) => x.f).join(',') === [TICK, TICK, TICK, GO].join(','), JSON.stringify(b3));
  check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune');
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
