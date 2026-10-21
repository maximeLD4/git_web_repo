// Séance en direct avec un plan (3.1.0) : le plan seul à l'écran — « À suivre » (premier exercice pas fait, dans
// l'ordre du plan) et la liste numérotée dans l'ordre — ; le choix libre replié derrière « + Exercice hors plan ».
// Usage : node tools/tests/live_plan.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8830'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
  await p.evaluate(() => { currentUser = { uid: 'u' };
    gymExerciseConfigs = ['Leg curl', 'Squat', 'Fentes', 'Presse'].map((n, i) => ({ id: 'c' + i, name: n, category: 'jambes', baseWeights: [20, 40, 60] }));
    // Ordre volontairement NON alphabétique : le plan dit Squat, Leg curl, Fentes.
    sessionPlans = [{ id: 'P', label: 'Jambes', exercises: [
      { id: 'p1', name: 'Squat', exType: 'muscu', category: 'jambes', sets: [{ id: 'a', weight: 40, reps: 10 }, { id: 'b', weight: 60, reps: 8 }] },
      { id: 'p2', name: 'Leg curl', exType: 'muscu', category: 'jambes', sets: [{ id: 'a', weight: 20, reps: 12 }] },
      { id: 'p3', name: 'Fentes', exType: 'muscu', category: 'jambes', sets: [{ id: 'a', weight: 20, reps: 10 }, { id: 'b', weight: 20, reps: 10 }, { id: 'c', weight: 20, reps: 10 }] }] }];
    liveSession = null; liveStep = 'category'; currentApp = 'live'; render(); document.querySelector('[data-live-pick-plan="P"]').click(); });
  await p.waitForTimeout(300);
  const st = () => p.evaluate(() => ({ next: (document.querySelector('.live-plan-next .live-plan-next-name') || {}).textContent, kicker: (document.querySelector('.live-plan-next-kicker') || {}).textContent, rows: [...document.querySelectorAll('.live-plan-row')].map((r) => (r.querySelector('.live-plan-row-num svg') ? '✓' : r.querySelector('.live-plan-row-num').textContent.trim()) + ':' + r.querySelector('.live-plan-row-name').textContent + (r.classList.contains('done') ? '(fait)' : '') + (r.classList.contains('next') ? '(suivant)' : '')), free: !!document.querySelector('[data-live-type-switch], [data-live-category]'), freeBtn: !!document.querySelector('[data-live-free-open]'), progress: (document.querySelector('.live-plan-progress') || {}).textContent }));
  let s = await st();
  check('Plan attaché : SEUL le plan à l\'écran (ni Muscu/Cardio, ni catégories, ni exercices libres)', !s.free && s.freeBtn, JSON.stringify(s));
  check('Exercices dans l\'ordre du plan, numérotés (Squat, Leg curl, Fentes)', JSON.stringify(s.rows) === JSON.stringify(['1:Squat(suivant)', '2:Leg curl', '3:Fentes']), JSON.stringify(s.rows));
  check('« À suivre » : le 1er du plan, avec son résumé', s.next === 'Squat' && /1\/3/.test(s.kicker) && await p.evaluate(() => /2 séries · 10\/8 × 40–60 kg/.test(document.querySelector('.live-plan-next-sum').textContent)));
  await p.click('.live-plan-next'); await p.waitForTimeout(250);
  check('Toucher « À suivre » ouvre Squat, prêt à lancer', await p.evaluate(() => liveDraftName === 'Squat' && !!document.querySelector('[data-live-start-set]')));
  for (let i = 0; i < 2; i++) { await p.evaluate(() => { startLiveSet(); finishLiveSet(); }); await p.waitForTimeout(150); }
  await p.evaluate(() => { liveActiveExerciseId = null; liveStep = 'category'; renderLiveStep(); }); await p.waitForTimeout(200); s = await st();
  check('Squat fait (2/2) : coché, et « À suivre » passe à Leg curl (2/3)', s.next === 'Leg curl' && JSON.stringify(s.rows) === JSON.stringify(['✓:Squat(fait)', '2:Leg curl(suivant)', '3:Fentes']) && s.progress === '1/3', JSON.stringify(s));
  await p.evaluate(() => [...document.querySelectorAll('.live-plan-row')].find((r) => /Fentes/.test(r.textContent)).click()); await p.waitForTimeout(200);
  await p.evaluate(() => { startLiveSet(); finishLiveSet(); liveActiveExerciseId = null; liveStep = 'category'; renderLiveStep(); }); await p.waitForTimeout(200);
  check('On peut faire un autre exercice dans le désordre : Fentes « 1 série faite sur 3 », Leg curl reste « À suivre »', await p.evaluate(() => /1 série faite sur 3/.test([...document.querySelectorAll('.live-plan-row')].find((r) => /Fentes/.test(r.textContent)).textContent) && document.querySelector('.live-plan-next-name').textContent === 'Leg curl'));
  console.log('\n=== Exercice hors plan ===');
  await p.click('[data-live-free-open]'); await p.waitForTimeout(250); s = await st();
  check('« + Exercice hors plan » : le choix libre s\'ouvre, la liste du plan se replie (un rappel « Revenir au plan »)', s.free && s.rows.length === 0 && await p.evaluate(() => /Revenir au plan « Jambes »/.test(document.querySelector('[data-live-free-close]').textContent)), JSON.stringify(s));
  await p.click('[data-live-free-close]'); await p.waitForTimeout(200); s = await st();
  check('« Revenir au plan » : de nouveau le plan seul', !s.free && s.rows.length === 3);
  await p.click('[data-live-free-open]'); await p.waitForTimeout(200);
  await p.evaluate(() => { if (!document.querySelector('[data-live-exercise="Presse"]')) document.querySelector('[data-live-category="jambes"]').click(); }); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('[data-live-exercise="Presse"]').click()); await p.waitForTimeout(250);
  check('Un exercice hors plan se lance normalement (Presse)', await p.evaluate(() => liveDraftName === 'Presse' && !!document.querySelector('[data-live-start-set]')));
  await p.evaluate(() => { startLiveSet(); finishLiveSet(); liveActiveExerciseId = null; liveStep = 'category'; renderLiveStep(); }); await p.waitForTimeout(200); s = await st();
  check('Retour au menu après l\'exercice hors plan : de nouveau le plan seul, choix libre replié', !s.free && s.rows.length === 3 && s.next === 'Leg curl', JSON.stringify(s));
  await p.evaluate(() => { for (const n of ['Leg curl', 'Fentes', 'Fentes']) { [...document.querySelectorAll('.live-plan-row')].find((r) => r.textContent.includes(n)).click(); startLiveSet(); finishLiveSet(); liveActiveExerciseId = null; liveStep = 'category'; renderLiveStep(); } }); await p.waitForTimeout(250);
  check('Plan fini : « Plan terminé ! … Terminer … », tout est coché', await p.evaluate(() => /Plan terminé/.test(document.querySelector('.live-plan-finished').textContent) && document.querySelectorAll('.live-plan-row.done').length === 3 && !document.querySelector('.live-plan-next')));
  console.log('\n=== Long plan sur un petit écran (667 px) ===');
  await p.setViewportSize({ width: 375, height: 667 });
  await p.evaluate(() => { sessionPlans.push({ id: 'L', label: 'Long', exercises: Array.from({ length: 12 }, (_, i) => ({ id: 'l' + i, name: 'Exercice ' + (i + 1), exType: 'muscu', category: 'jambes', sets: [{ id: 'a', weight: 20, reps: 10 }] })) }); liveSession = null; liveStep = 'category'; liveActiveExerciseId = null; render(); document.querySelector('[data-live-pick-plan="L"]').click(); liveSession.restStartedAt = Date.now() - 20000; renderLiveStep(); }); await p.waitForTimeout(300);
  const lay = await p.evaluate(() => { const btn = document.querySelector('[data-live-free-open]'), r = btn.getBoundingClientRect(), list = document.querySelector('.live-plan-list'), body = document.getElementById('live-content'); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { btnIn: r.bottom <= innerHeight && r.top >= 0, btnHit: btn === hit || btn.contains(hit), listScroll: list.scrollHeight > list.clientHeight && getComputedStyle(list).overflowY === 'auto', bodyNoScroll: body.scrollHeight - body.clientHeight <= 1 }; });
  check('« + Exercice hors plan » en pied d\'écran, visible et touchable', lay.btnIn && lay.btnHit, JSON.stringify(lay));
  check('Seule la liste des exercices du plan défile ; l\'écran, lui, ne défile pas', lay.listScroll && lay.bodyNoScroll, JSON.stringify(lay));
  await p.evaluate(() => { const l = document.querySelector('.live-plan-list'); l.scrollTop = l.scrollHeight; }); await p.waitForTimeout(150);
  check('…en faisant défiler la liste, le 12e exercice est atteignable', await p.evaluate(() => { const rows = document.querySelectorAll('.live-plan-row'), last = rows[rows.length - 1], r = last.getBoundingClientRect(), hit = document.elementFromPoint(r.left + 40, r.top + r.height / 2); return /Exercice 12/.test(last.textContent) && (last === hit || last.contains(hit)); }));
  await p.setViewportSize({ width: 390, height: 844 });
  console.log('\n=== Sans plan ===');
  await p.evaluate(() => { liveSession = null; liveActiveExerciseId = null; liveStep = 'category'; liveDraftType = 'muscu'; render(); document.querySelector('[data-live-pick-plan=""]').click(); }); await p.waitForTimeout(250);
  check('Sans plan : le choix libre, comme avant (pas de bouton « hors plan »)', await p.evaluate(() => !!document.querySelector('[data-live-type-switch]') && !document.querySelector('[data-live-free-open], .live-plan-section')));
  check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune');
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
