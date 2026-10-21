// Plan : repos prévu entre les séries (Créer > Plan à préparer), décompté en Séance en direct dès « Finir la
// série », arrêté à 00:00 sans rien lancer. Usage : node tools/tests/plan_rest.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8824'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
  await p.evaluate(() => { currentUser = { uid: 'u' }; gymExerciseConfigs = [{ id: 'c1', name: 'Squat', category: 'jambes', baseWeights: [60, 70] }, { id: 'c2', name: 'Leg curl', category: 'jambes', baseWeights: [20, 25] }]; });

  console.log('=== Créer > Plan à préparer ===');
  await p.evaluate(() => { currentApp = 'gym'; gymTopMode = 'plan'; tab = 'log'; draft = { kind: 'plan', date: todayISO(), label: 'Jambes', exercises: [{ id: 'e1', name: 'Squat', exType: 'muscu', category: 'jambes', sets: [{ id: 's1', weight: 60, reps: 10 }, { id: 's2', weight: 70, reps: 8 }] }], editingPlanId: null }; openExerciseIds = { e1: true }; render(); }); await p.waitForTimeout(300);
  check('Ligne « Repos entre les séries », à « Aucun » par défaut', await p.evaluate(() => { const r = document.querySelector('.exercise-card[data-id="e1"] [data-plan-rest]'); return !!r && r.querySelector('[data-plan-rest-value]').textContent === 'Aucun'; }));
  for (let i = 0; i < 6; i++) await p.click('.exercise-card[data-id="e1"] [data-plan-rest-plus]');
  check('+ par pas de 15 s : 6 appuis → « 1 min 30 »', await p.evaluate(() => document.querySelector('[data-plan-rest-value]').textContent) === '1 min 30');
  await p.click('.exercise-card[data-id="e1"] [data-plan-rest-minus]');
  check('− : « 1 min 15 »', await p.evaluate(() => document.querySelector('[data-plan-rest-value]').textContent) === '1 min 15');
  check('Lu avec le plan : restSec = 75 sur l\'exercice', await p.evaluate(() => serializeExercisesFromDOM()[0].restSec === 75));
  await p.evaluate(() => { document.querySelectorAll('[data-plan-rest-minus]').forEach((b) => { for (let i = 0; i < 10; i++) b.click(); }); });
  check('Revenu à 0 : « Aucun », rien d\'enregistré (pas de restSec)', await p.evaluate(() => document.querySelector('[data-plan-rest-value]').textContent === 'Aucun' && !('restSec' in serializeExercisesFromDOM()[0])));
  console.log('\n=== Repos propre à un écart, et entre deux exercices ===');
  await p.evaluate(() => { draft = { kind: 'plan', date: todayISO(), label: 'Jambes', exercises: [
      { id: 'e1', name: 'Squat', exType: 'muscu', category: 'jambes', restSec: 90, sets: [{ id: 's1', weight: 60, reps: 10 }, { id: 's2', weight: 70, reps: 8 }, { id: 's3', weight: 70, reps: 8 }] },
      { id: 'e2', name: 'Leg curl', exType: 'muscu', category: 'jambes', sets: [{ id: 't1', weight: 20, reps: 12 }] }], editingPlanId: null }; openExerciseIds = { e1: true, e2: true }; render(); }); await p.waitForTimeout(250);
  const gaps = () => p.evaluate(() => [...document.querySelectorAll('.exercise-card[data-id="e1"] [data-plan-gap]')].map((g) => g.querySelector('[data-plan-gap-value]').textContent + (g.classList.contains('custom') ? '*' : '')));
  check('Un écart sous chaque série sauf la dernière (3 séries → 2), au repos par défaut', JSON.stringify(await gaps()) === '["1 min 30","1 min 30"]', JSON.stringify(await gaps()));
  const gap1 = '.exercise-card[data-id="e1"] [data-plan-gap]:nth-of-type(1)';
  await p.evaluate(() => { const g = document.querySelectorAll('.exercise-card[data-id="e1"] [data-plan-gap]')[0]; for (let i = 0; i < 4; i++) g.querySelector('[data-plan-gap-minus]').click(); });
  check('− sur le 1er écart : 30 s, propre à cet écart (le 2e reste par défaut)', JSON.stringify(await gaps()) === '["30 s*","1 min 30"]', JSON.stringify(await gaps()));
  check('…enregistré sur la série du dessus (plannedRestSec = 30), pas sur les autres', await p.evaluate(() => { const ex = serializeExercisesFromDOM()[0]; return ex.sets[0].plannedRestSec === 30 && !('plannedRestSec' in ex.sets[1]) && !('plannedRestSec' in ex.sets[2]); }));
  await p.evaluate(() => { const r = document.querySelector('.exercise-card[data-id="e1"] [data-plan-rest-plus]'); for (let i = 0; i < 2; i++) r.click(); });
  check('Changer le repos par défaut : les écarts « par défaut » suivent, pas l\'écart réglé', JSON.stringify(await gaps()) === '["30 s*","2 min"]', JSON.stringify(await gaps()));
  await p.evaluate(() => document.querySelectorAll('.exercise-card[data-id="e1"] [data-plan-gap]')[0].querySelector('[data-plan-gap-reset]').click());
  check('↺ : l\'écart revient au repos par défaut, plus rien d\'enregistré dessus', JSON.stringify(await gaps()) === '["2 min","2 min"]' && await p.evaluate(() => !('plannedRestSec' in serializeExercisesFromDOM()[0].sets[0])), JSON.stringify(await gaps()));
  check('« Repos avant l\'exercice suivant » : sur Squat, pas sur le dernier exercice', await p.evaluate(() => !!document.querySelector('.exercise-card[data-id="e1"] [data-plan-rest-after]') && !document.querySelector('.exercise-card[data-id="e2"] [data-plan-rest-after]')));
  await p.evaluate(() => { const r = document.querySelector('.exercise-card[data-id="e1"] [data-plan-rest-after-plus]'); for (let i = 0; i < 12; i++) r.click(); document.querySelectorAll('.exercise-card[data-id="e1"] [data-plan-gap]')[1].querySelector('[data-plan-gap-plus]').click(); });
  check('…réglé à 3 min : restAfterSec = 180 sur l\'exercice', await p.evaluate(() => serializeExercisesFromDOM()[0].restAfterSec === 180));
  await p.evaluate(() => { draft.exercises = serializeExercisesFromDOM(); openExerciseIds = { e1: false, e2: true }; render(); });
  check('Exercice replié : ses repos sont conservés (défaut, écart réglé, avant le suivant)', await p.evaluate(() => { const ex = serializeExercisesFromDOM()[0]; return ex.restSec === 120 && ex.restAfterSec === 180 && ex.sets[1].plannedRestSec === 135; }), await p.evaluate(() => JSON.stringify(serializeExercisesFromDOM()[0])));
  await p.evaluate(() => { draft = { ...draft, kind: 'session' }; gymTopMode = 'session'; render(); }); await p.waitForTimeout(200);
  check('Séance effectuée : aucune ligne de repos prévu (ni défaut, ni écart, ni avant le suivant)', await p.evaluate(() => !document.querySelector('[data-plan-rest], [data-plan-gap], [data-plan-rest-after]')));
  check('Convertir un plan en séance : le repos prévu ne suit pas', await p.evaluate(() => { const plan = { id: 'pp', label: 'X', exercises: [{ id: 'e', name: 'Squat', exType: 'muscu', category: 'jambes', restSec: 90, restAfterSec: 120, sets: [{ id: 's', weight: 60, reps: 10, plannedRestSec: 30 }] }] }; window.playSaveTravelAnimation = (i, t, s, cb) => cb && cb(); convertPlanToSession(plan); return !('restSec' in draft.exercises[0]) && !('restAfterSec' in draft.exercises[0]) && !('plannedRestSec' in draft.exercises[0].sets[0]) && draft.kind === 'session'; }));

  console.log('\n=== Séance en direct, avec ce plan (repos prévu : 4 s pour Squat) ===');
  await p.evaluate(() => { sessionPlans = [{ id: 'P', label: 'Jambes', exercises: [{ id: 'pe1', name: 'Squat', exType: 'muscu', category: 'jambes', restSec: 4, sets: [{ id: 'a', weight: 60, reps: 10 }, { id: 'b', weight: 70, reps: 8 }, { id: 'c', weight: 70, reps: 8 }] }, { id: 'pe2', name: 'Leg curl', exType: 'muscu', category: 'jambes', sets: [{ id: 'a', weight: 20, reps: 12 }] }] }];
    liveSession = null; liveActiveExerciseId = null; liveStep = 'category'; liveDraftType = 'muscu'; currentApp = 'live'; render(); liveSession.planId = 'P'; liveStep = 'category'; renderLiveStep(); });
  await p.waitForTimeout(200);
  await p.evaluate(() => { const e = [...document.querySelectorAll('.live-plan-row[data-live-plan-exercise]')].find((b) => /Squat/.test(b.textContent)); if (e) e.click(); else { document.querySelector('[data-live-category="jambes"]').click(); document.querySelector('[data-live-exercise="Squat"]').click(); } }); await p.waitForTimeout(250);
  await p.click('[data-live-start-set]'); await p.waitForTimeout(300); await p.click('[data-live-finish-set]'); await p.waitForTimeout(250);
  const v = await p.$('[data-live-validate]'); if (v) { await v.click(); await p.waitForTimeout(250); }
  const st = () => p.evaluate(() => ({ chrono: (document.getElementById('live-rest-chrono') || {}).textContent, label: (document.getElementById('live-rest-label-text') || {}).textContent, done: !!document.querySelector('.live-rest-hero-done'), pulse: !!document.querySelector('[data-live-start-set].live-ready-pulse'), phase: liveSetPhase(), resting: !!liveSession.restStartedAt, inProgress: !!liveSession.setInProgressStartedAt }));
  let s = await st();
  check('« Finir la série » : le repos démarre tout seul et DÉCOMPTE depuis 00:04', s.resting && (s.chrono === '00:04' || s.chrono === '00:03') && s.label === 'Repos' && !s.done, JSON.stringify(s));
  await p.waitForTimeout(1500); const s2 = await st();
  check('…il défile vers le bas', s2.chrono < s.chrono || s2.chrono === '00:02', `${s.chrono} → ${s2.chrono}`);
  await p.waitForTimeout(3200); s = await st();
  check('Écoulé : arrêté sur 00:00, « Repos terminé »', s.chrono === '00:00' && s.label === 'Repos terminé' && s.done, JSON.stringify(s));
  check('…la série suivante proposée « à lancer » (bouton mis en avant), RIEN de lancé', s.pulse && !s.inProgress && s.phase === 'ready' && /Lancer Squat/.test(await p.textContent('[data-live-start-set]')), JSON.stringify(s));
  await p.waitForTimeout(2000); s = await st();
  check('…et ça reste ainsi (toujours 00:00, toujours rien de lancé)', s.chrono === '00:00' && !s.inProgress, JSON.stringify(s));
  await p.click('[data-live-start-set]'); await p.waitForTimeout(250); s = await st();
  check('« Lancer Squat » : la série démarre, le bandeau quitte le repos', s.inProgress && !s.resting && !s.done);
  check('…le repos réellement pris (≈ 7 s) est enregistré avec la série', await p.evaluate(() => { const ex = liveSession.exercises.find((e) => e.name === 'Squat'); const r = ex.sets[ex.sets.length - 1].restSec; return r >= 6 && r <= 9; }));

  console.log('\n=== Repos d\'un écart précis, puis entre deux exercices ===');
  await p.evaluate(() => { const pe = sessionPlans[0].exercises[0]; pe.sets[1].plannedRestSec = 2; pe.restAfterSec = 3; });
  await p.click('[data-live-finish-set]'); await p.waitForTimeout(250); { const v3 = await p.$('[data-live-validate]'); if (v3) { await v3.click(); await p.waitForTimeout(200); } }
  check('Après la 2e série (écart réglé à 2 s) : décompte depuis 00:02, pas le défaut', await p.evaluate(() => liveSession.plannedRestSec === 2 && /00:0[12]/.test(document.getElementById('live-rest-chrono').textContent)), await p.evaluate(() => liveSession.plannedRestSec));
  await p.click('[data-live-start-set]'); await p.waitForTimeout(200); await p.click('[data-live-finish-set]'); await p.waitForTimeout(250); { const v3 = await p.$('[data-live-validate]'); if (v3) { await v3.click(); await p.waitForTimeout(200); } }
  check('Après la DERNIÈRE série de Squat : repos avant l\'exercice suivant (00:03), retour au menu', await p.evaluate(() => liveSession.plannedRestSec === 3 && liveStep === 'category' && /00:0[23]/.test(document.getElementById('live-rest-chrono').textContent)), await p.evaluate(() => `${liveSession.plannedRestSec} / ${liveStep}`));
  await p.waitForTimeout(3300);
  check('…arrêté sur 00:00, « Repos terminé », rien de lancé', await p.evaluate(() => document.getElementById('live-rest-chrono').textContent === '00:00' && document.getElementById('live-rest-label-text').textContent === 'Repos terminé' && !liveSession.setInProgressStartedAt));

  console.log('\n=== Sans repos prévu ===');
  await p.evaluate(() => { liveSession.restStartedAt = null; liveSession.setInProgressStartedAt = null; liveActiveExerciseId = null; liveStep = 'category'; renderLiveStep(); const e = [...document.querySelectorAll('.live-plan-row[data-live-plan-exercise]')].find((b) => /Leg curl/.test(b.textContent)); if (e) e.click(); else { document.querySelector('[data-live-category="jambes"]').click(); document.querySelector('[data-live-exercise="Leg curl"]').click(); } }); await p.waitForTimeout(250);
  await p.click('[data-live-start-set]'); await p.waitForTimeout(200); await p.click('[data-live-finish-set]'); await p.waitForTimeout(300); const v2 = await p.$('[data-live-validate]'); if (v2) { await v2.click(); await p.waitForTimeout(200); }
  const a1 = await st(); await p.waitForTimeout(2100); const a2 = await st();
  check('Exercice du plan sans repos réglé : le repos compte le temps écoulé, comme avant', a1.resting && a2.chrono > a1.chrono && a2.label === 'Repos' && !a2.done, `${a1.chrono} → ${a2.chrono}`);
  check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune');
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
