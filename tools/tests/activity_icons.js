// Icônes animées (Rameur, Vélo, Natation, Course, Gainage, Repos) : 2 s puis figées quand on consulte une séance
// (Historique, Calendrier), en boucle pendant une série en direct. Usage : node tools/tests/activity_icons.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8820'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
const open = async (b, reduced) => { const ctx = await b.newContext({ viewport: { width: 414, height: 896 }, serviceWorkers: 'block', reducedMotion: reduced ? 'reduce' : 'no-preference' }); const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
  await p.evaluate(() => { currentUser = { uid: 'u' };
    sessions = [{ id: 's1', date: '2026-09-28', label: 'Cardio', exercises: [{ id: 'e0', name: 'Rameur', exType: 'cardio', category: 'rameur', sets: [{ id: 'a', weight: 10, reps: 2 }] }, { id: 'e1', name: 'Vélo', exType: 'cardio', category: 'velo', sets: [{ id: 'a', weight: 10, reps: 4 }] }, { id: 'e2', name: 'Course à pied', exType: 'cardio', category: 'course', sets: [{ id: 'a', weight: 20, reps: 4 }] }, { id: 'e3', name: 'Planche', exType: 'cardio', category: 'gainage', sets: [], loop: { rounds: 6, workSec: 40, restSec: 15 } }] },
      { id: 'g1', date: '2026-09-24', label: 'Gainage', exercises: [{ id: 'e4', name: 'Planche', exType: 'cardio', category: 'gainage', sets: [], loop: { rounds: 8, workSec: 30, restSec: 10 } }] }];
    gainageExerciseConfigs = [{ id: 'gc', name: 'Planche', rounds: 6, workSec: 3, restSec: 3 }];
    runSessions = [{ id: 'r1', date: '2026-09-27', label: 'Footing', blocks: [{ id: 'b', label: 'Footing', mode: 'duration', duration: '30', distance: '', pace: '6', reps: '', repDistance: '', repDuration: '', recovery: '' }] }];
    swimSessions = [{ id: 'w1', date: '2026-09-26', label: 'Piscine', blocks: [{ id: 'b', label: 'Crawl', mode: 'both', duration: '30', distance: '1000', pace: '', poolLength: '', lengths: '', stroke: 'Crawl' }] }];
    bikeSessions = [{ id: 'v1', date: '2026-09-25', label: 'Sortie', blocks: [{ id: 'b', label: 'Route', mode: 'both', duration: '60', distance: '25', speed: '' }] }]; });
  return { ctx, p }; };
// Signature de la pose d'une icône (tous ses attributs mobiles), et celle de sa pose de départ.
const pose = (p, sel) => p.evaluate((sel) => { const s = document.querySelector(sel); return s ? [...s.querySelectorAll('[data-anim-part]')].map((e) => [...e.attributes].map((a) => a.value).join(',')).join('|') : null; }, sel);
const startPose = (p, kind) => p.evaluate((kind) => { const d = document.createElement('div'); d.innerHTML = animIconHTML(kind); return [...d.querySelectorAll('[data-anim-part]')].map((e) => [...e.attributes].map((a) => a.value).join(',')).join('|'); }, kind);
// Une icône « once » : bouge, puis figée sur sa pose de départ après 2 s.
async function once(p, label, sel, kind, openFn) {
  await p.evaluate(openFn); await p.waitForTimeout(450);
  const s0 = await startPose(p, kind), mid = await pose(p, sel);
  check(`${label} : l'icône bouge à l'ouverture`, !!mid && mid !== s0 && await p.evaluate((sel) => document.querySelector(sel).getAttribute('data-anim') === 'once', sel));
  await p.waitForTimeout(2400); // marge : le départ de l'animation suit la 1re image affichée
  check(`${label} : puis figée sur la pose de départ`, (await pose(p, sel)) === s0 && await p.evaluate((sel) => !document.querySelector(sel).hasAttribute('data-anim'), sel));
}
(async () => { const b = await chromium.launch();
  { const { ctx, p } = await open(b);
    console.log('=== Icônes fixes ===');
    check('ICONS.rower/bike/swim/stopwatch/plank/rest : les nouveaux dessins, pose de départ, sans animation', await p.evaluate(() => ['rower', 'bike', 'swim', 'stopwatch', 'plank', 'rest'].every((k) => ICONS[k].includes(`data-anim-icon="${k}"`) && !ICONS[k].includes('data-anim="'))));
    check('Rameur fixe : le dessin fourni (jambes tendues), au centième près', await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = ICONS.rower; const g = (n) => d.querySelector(`[data-anim-part="${n}"]`); return g('legs').getAttribute('points') === '6.39,16.7 11.77,14.73 16.68,16.28' && g('torso').getAttribute('points') === '6.39,16.7 4.08,10.37' && g('arms').getAttribute('points') === '4.81,12.35 5.38,14.81 7.51,13.44' && g('chain').getAttribute('points') === '7.51,13.44 17.77,14.68' && g('seat').getAttribute('points') === '5.13,17.8 7.49,17.8' && !d.querySelector('[data-anim-part="spokes"]'); }));
    check('Chronomètre fixe : aiguille à midi (même dessin qu\'avant)', await p.evaluate(() => /points="12,13 12,9"/.test(ICONS.stopwatch)));
    console.log('\n=== Séance de salle (Historique) : rameur, vélo, course, gainage ===');
    await p.evaluate(() => { currentApp = 'gym'; gymTopMode = 'session'; tab = 'history'; openHistoryIds = { s1: true }; render(); }); await p.waitForTimeout(450);
    const kinds = await p.evaluate(() => [...document.querySelectorAll('.gx-lane-icon svg')].map((s) => s.getAttribute('data-anim-icon') + ':' + s.getAttribute('data-anim')).join(' '));
    check('Chaque couloir (et la frise de gainage) a l\'icône de son activité, animée une fois', kinds === 'rower:once bike:once stopwatch:once plank:once', kinds);
    const before = await pose(p, '.gx-lane-icon svg[data-anim-icon="bike"]'); await p.waitForTimeout(2400); // marge : le départ de l'animation suit la 1re image affichée
    check('…toutes figées après 2 s', await p.evaluate(() => !document.querySelector('svg[data-anim]')) && before !== (await pose(p, '.gx-lane-icon svg[data-anim-icon="bike"]')));
    await p.waitForTimeout(150); check('…la boucle d\'animation s\'est arrêtée (rien ne tourne en fond)', await p.evaluate(() => animIconsTicking === false));
    console.log('\n=== Historiques Course, Natation, Vélo ===');
    await p.evaluate(() => { currentApp = 'run'; runTopMode = 'session'; runTab = 'history'; openRunHistoryIds = {}; render(); }); await p.waitForTimeout(300);
    check('Course, carte fermée : icône fixe', await p.evaluate(() => { const s = document.querySelector('.history-row-icon svg'); return !!s && !s.hasAttribute('data-anim'); }));
    await once(p, 'Course, séance ouverte', '.history-row-icon svg', 'stopwatch', () => { openRunHistoryIds = { r1: true }; render(); });
    await once(p, 'Natation, séance ouverte', '.history-row-icon svg', 'swim', () => { currentApp = 'swim'; swimTopMode = 'session'; swimTab = 'history'; openSwimHistoryIds = { w1: true }; render(); });
    await once(p, 'Vélo, séance ouverte', '.history-row-icon svg', 'bike', () => { currentApp = 'bike'; bikeTopMode = 'session'; bikeTab = 'history'; openBikeHistoryIds = { v1: true }; render(); });
    console.log('\n=== Calendrier ===');
    for (const [label, type, id, kind, date] of [['Course', 'run', 'r1', 'stopwatch', '2026-09-27'], ['Natation', 'swim', 'w1', 'swim', '2026-09-26'], ['Vélo', 'bike', 'v1', 'bike', '2026-09-25']]) {
      await once(p, `Calendrier, ${label} ouverte`, '.history-row-icon svg', kind, new Function(`currentApp = 'calendar'; render(); sharedCalendarMonth = '2026-09'; sharedSelectedDate = '${date}'; openSharedCalendarIds = { '${type}:${id}': true }; renderSharedCalendarContent();`));
    }
    await once(p, 'Calendrier, séance de salle : rameur', '.gx-lane-icon svg', 'rower', () => { currentApp = 'calendar'; render(); sharedCalendarMonth = '2026-09'; sharedSelectedDate = '2026-09-28'; openSharedCalendarIds = { 'gym:s1': true }; renderSharedCalendarContent(); });
    await once(p, 'Calendrier, Gainage ouverte', '.history-row-icon svg', 'plank', () => { currentApp = 'calendar'; render(); sharedCalendarMonth = '2026-09'; sharedSelectedDate = '2026-09-24'; openSharedCalendarIds = { 'gainage:g1': true }; renderSharedCalendarContent(); });
    await p.evaluate(() => { currentApp = 'calendar'; render(); sharedCalendarMonth = '2026-09'; sharedSelectedDate = '2026-09-28'; openSharedCalendarIds = { 'gym:s1': true }; renderSharedCalendarContent(); }); await p.waitForTimeout(300);
    check('Calendrier, Muscu : haltère, jamais animé', await p.evaluate(() => { const s = document.querySelector('.history-row-icon svg'); return !!s && !s.hasAttribute('data-anim-icon'); }));
    console.log('\n=== Séance en direct ===');
    for (const [cat, kind] of [['rameur', 'rower'], ['velo', 'bike'], ['course', 'stopwatch']]) {
      await p.evaluate(() => { liveSession = null; currentApp = 'live'; render(); const n = document.querySelector('[data-live-no-plan], [data-live-skip-plan]'); if (n) n.click(); document.querySelector('[data-live-type-switch="cardio"]').click(); }); await p.waitForTimeout(350);
      await p.evaluate((cat) => document.querySelector(`[data-live-cardio-category="${cat}"]`).click(), cat); await p.waitForTimeout(300);
      const pre = await p.evaluate(() => !document.querySelector('.live-activity-anim'));
      await p.click('[data-live-start-set]'); await p.waitForTimeout(400);
      const L = `.live-activity-anim svg[data-anim-icon="${kind}"]`; const a1 = await pose(p, L); await p.waitForTimeout(350); const a2 = await pose(p, L); await p.waitForTimeout(2300); const a3 = await pose(p, L);
      check(`${cat} : rien avant la série, en boucle pendant (encore après 3 s)`, pre && !!a1 && a1 !== a2 && a3 !== null && await p.evaluate((L) => document.querySelector(L).getAttribute('data-anim') === 'loop', L));
      await p.click('[data-live-finish-set]'); await p.waitForTimeout(350);
      check(`${cat} : disparaît à « Finir la série » (le repos commence : le bonhomme du repos à sa place)`, await p.evaluate((kind) => !document.querySelector(`.live-activity-anim svg[data-anim-icon="${kind}"]`) && !!document.querySelector('.live-rest-center svg[data-anim-icon="rest"]'), kind));
    }
    await p.evaluate(() => { liveSession = null; currentApp = 'live'; render(); const n = document.querySelector('[data-live-no-plan], [data-live-skip-plan]'); if (n) n.click(); document.querySelector('[data-live-type-switch="cardio"]').click(); }); await p.waitForTimeout(350);
    check('Choix de l\'activité : la planche pour le gainage (fixe)', await p.evaluate(() => { const s = document.querySelector('[data-live-cardio-category="gainage"] svg'); return !!s && s.getAttribute('data-anim-icon') === 'plank' && !s.hasAttribute('data-anim'); })); await p.evaluate(() => document.querySelector('[data-live-cardio-category="gainage"]').click()); await p.waitForTimeout(300);
    const ex = await p.$('[data-live-exercise="Planche"]'); if (ex) { await ex.click(); await p.waitForTimeout(300); }
    await p.click('[data-live-start-set]'); await p.waitForTimeout(400);
    { const L = '.live-activity-anim svg[data-anim-icon="plank"]'; const g1 = await pose(p, L); await p.waitForTimeout(500); const g2 = await pose(p, L);
      check('Gainage, série au chrono : la planche s\'anime en boucle', !!g1 && g1 !== g2 && await p.evaluate((L) => document.querySelector(L).getAttribute('data-anim') === 'loop', L)); }
    await p.click('[data-live-finish-set]'); await p.waitForTimeout(350);
    await p.click('[data-live-open-loop-form]'); await p.waitForTimeout(300); await p.click('[data-live-start-loop]'); await p.waitForTimeout(500);
    check('Boucle de gainage, travail : la planche s\'anime en boucle', await p.evaluate(() => { const s = document.querySelector('.live-activity-anim svg[data-anim-icon="plank"]'); return !!s && s.getAttribute('data-anim') === 'loop' && !!liveSession.setInProgressStartedAt; }));
    await p.click('[data-live-skip-loop-phase]'); await p.waitForTimeout(400);
    check('…repos : plus de planche', await p.evaluate(() => !document.querySelector('.live-activity-anim svg[data-anim-icon="plank"]') && !liveSession.setInProgressStartedAt));
    { const R = '.live-rest-center svg[data-anim-icon="rest"]'; const r1 = await pose(p, R); await p.waitForTimeout(700); const r2 = await pose(p, R);
      check('…et à sa place, en grand au centre, le bonhomme qui reprend son souffle, en boucle', !!r1 && r1 !== r2 && await p.evaluate((R) => document.querySelector(R).getAttribute('data-anim') === 'loop' && !document.querySelector('.live-activity-anim svg[data-anim-icon="plank"]') && !document.querySelector('.live-rest-hero svg[data-anim-icon="rest"]'), R)); }
    await p.click('[data-live-stop-loop]'); await p.waitForTimeout(400); const cf = await p.$('.modal-btn.danger, [data-modal-confirm]'); if (cf) { await cf.click(); await p.waitForTimeout(300); }
    console.log('\n=== Repos entre deux séries ===');
    await p.evaluate(() => { gymExerciseConfigs = [{ id: 'c1', name: 'Squat', category: 'jambes', baseWeights: [60, 70] }]; liveSession = null; liveActiveExerciseId = null; liveStep = 'category'; liveDraftType = 'muscu'; currentApp = 'live'; render(); const n = document.querySelector('[data-live-no-plan], [data-live-skip-plan]'); if (n) n.click(); }); await p.waitForTimeout(300);
    check('Pas de repos en cours : pas de bonhomme', await p.evaluate(() => !document.querySelector('svg[data-anim-icon="rest"]')));
    await p.evaluate(() => { document.querySelector('[data-live-category="jambes"]').click(); document.querySelector('[data-live-exercise="Squat"]').click(); liveSession.restStartedAt = Date.now() - 30000; renderLiveStep(); }); await p.waitForTimeout(400);
    check('Muscu en repos : PAS de bonhomme (répétitions, poids… l\'écran est déjà plein)', await p.evaluate(() => !document.querySelector('svg[data-anim-icon="rest"]')));
    check('…l\'écran reste comme hors repos : nom et réglages (plus de sous-titre ni de « Précédent » depuis 2.88.0)', await p.evaluate(() => !!document.querySelector('.live-exercise-name') && !document.querySelector('.live-exercise-subtitle') && !!document.querySelector('[data-live-reps-plus]')));
    await p.evaluate(() => { liveSession = null; liveActiveExerciseId = null; liveStep = 'category'; liveDraftType = 'muscu'; currentApp = 'live'; render(); const n = document.querySelector('[data-live-no-plan], [data-live-skip-plan]'); if (n) n.click(); liveDraftType = 'cardio'; renderLiveStep(); document.querySelector('[data-live-cardio-category="rameur"]').click(); liveSession.restStartedAt = Date.now() - 30000; renderLiveStep(); }); await p.waitForTimeout(400);
    { const R = '.live-rest-center svg[data-anim-icon="rest"]'; const r1 = await pose(p, R); await p.waitForTimeout(800); const r2 = await pose(p, R); await p.waitForTimeout(3200); const r3 = await pose(p, R);
      check('Cardio en repos (de la place) : le bonhomme en GRAND au centre, en boucle (encore après 4 s)', !!r1 && r1 !== r2 && !!r3 && await p.evaluate((R) => document.querySelector(R).getAttribute('data-anim') === 'loop', R)); }
    check('…à la place du nom et de « Précédent » (le bouton dit « Lancer Rameur »)', await p.evaluate(() => !document.querySelector('.live-exercise-name') && document.querySelector('[data-live-start-set]').textContent.trim() === 'Lancer Rameur'));
    check('…et rien dans le bandeau du haut', await p.evaluate(() => !document.querySelector('.live-rest-hero svg[data-anim-icon="rest"]')));
    const geo = async () => p.evaluate(() => { const box = document.querySelector('.live-rest-center'), svg = box.querySelector('svg'), c = box.getBoundingClientRect(), g = svg.getBoundingClientRect(), sc = document.querySelector('.live-set-form-scroll').getBoundingClientRect(); return { svgH: Math.round(g.height), inside: g.top >= c.top - 0.5 && g.bottom <= c.bottom + 0.5, visible: g.top >= sc.top - 1, rule: getComputedStyle(svg).height }; });
    let g = await geo();
    check('Taille fixe (112 px sur cet écran), dans sa case, rien de coupé', g.svgH === 112 && g.inside && g.visible && g.rule === '112px', JSON.stringify(g));
    for (const [h, px] of [[780, 80], [680, 56]]) { await p.setViewportSize({ width: 414, height: h }); await p.waitForTimeout(200); g = await geo();
      check(`Écran de ${h} px : ${px} px, toujours au centre et sans déborder`, g.svgH === px && g.inside && g.visible, JSON.stringify(g)); }
    await p.setViewportSize({ width: 414, height: 896 }); await p.waitForTimeout(150);
    // « Débuter la série » (vraie action) : le repos s'arrête, la série démarre.
    await p.evaluate(() => { liveDraftType = 'muscu'; liveDraftName = 'Squat'; liveDraftCategory = 'jambes'; liveDraftBaseWeight = 60; liveDraftReps = 10; liveActiveExerciseId = null; startLiveSet(); }); await p.waitForTimeout(300);
    check('Série en cours : plus de bonhomme', await p.evaluate(() => !document.querySelector('svg[data-anim-icon="rest"]') && !!document.querySelector('.live-rest-hero-active')));
    check('Ailleurs (repos, boutons) : le chronomètre reste fixe', await p.evaluate(() => [...document.querySelectorAll('svg[data-anim-icon="stopwatch"]')].every((s) => !s.hasAttribute('data-anim'))));
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close(); }
  console.log('\n=== Appareil réglé sur « réduire les animations » ===');
  { const { ctx, p } = await open(b, true);
    await p.evaluate(() => { currentApp = 'bike'; bikeTopMode = 'session'; bikeTab = 'history'; openBikeHistoryIds = { v1: true }; render(); }); await p.waitForTimeout(400);
    check('Pose fixe d\'emblée, aucune animation', (await pose(p, '.history-row-icon svg')) === (await startPose(p, 'bike')) && await p.evaluate(() => !document.querySelector('svg[data-anim]')));
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close(); }
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
