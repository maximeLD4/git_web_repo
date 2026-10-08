const { chromium } = require('playwright'); const L = require('./xss_lib.js');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8808';
const legit = () => ({
  sessions: [{ id: 'lk3j9x2a1b', date: '2026-09-01', label: "Séance d'été — \"jambes\" & dos 🏋️", notes: 'RPE>8 <10, ok', startedAt: 1788000000000, custom: { a: [1, 2, { b: null }], flag: true }, exercises: [
    { id: 'lk3j9x2a1c', name: "Développé couché (barre) — L'élévation \"latérale\"", exType: 'muscu', category: 'pecs', note: 'x', sets: [{ id: 'lk3j9x2a1d', weight: 62.5, reps: 8, side: 'left', rest: 90 }, { id: 'lk3j9x2a1e', weight: 60, reps: 10 }] },
    { id: 'lk3j9x2a1f', name: 'Planche', exType: 'cardio', category: 'gainage', sets: [{ id: 'lk3j9x2a1g', duration: 40, rounds: 6 }] }] }],
  runSessions: [{ id: 'run0000001', date: '2026-09-02', label: 'Footing 5 km', blocks: [{ id: 'blk0000001', label: 'Bloc 1', mode: 'duration', duration: '30', distance: '5', pace: '6', extra: 'x' }] }],
  swimSessions: [{ id: 'swm0000001', date: '2026-09-03', label: 'Crawl', blocks: [{ id: 'blk0000002', label: 'Bloc', mode: 'pool', poolLength: '25', lengths: '40', duration: '34' }] }],
  bikeSessions: [{ id: 'bik0000001', date: '2026-09-04', label: 'Route', blocks: [{ id: 'blk0000003', label: 'Bloc', mode: 'duration', duration: '60', distance: '20' }] }],
  library: ['Développé couché', "Curl à l'haltère", 'Squat <barre>'], runLibrary: ['Footing'], swimLibrary: [], bikeLibrary: [],
  gymExerciseConfigs: [{ id: 'cfg0000001', name: 'Squat', category: 'jambes', baseWeights: [60, 62.5, 70], maxIncrement: 2.5, autoIncrement: true, unilateral: true, pairedExerciseId: 'cfg0000002' }, { id: 'cfg0000002', name: 'Curl', category: 'bras', baseWeights: [10], maxIncrement: 0, autoIncrement: false, unilateral: false, pairedExerciseId: null }],
  gainageExerciseConfigs: [{ id: 'gai0000001', name: 'Planche', rounds: 6, workSec: 40, restSec: 20 }],
  sessionPlans: [{ id: 'pln0000001', label: "Push A — l'essentiel", createdAt: '2026-09-01T10:00:00.000Z', exercises: [{ id: 'pex0000001', name: 'Squat', exType: 'muscu', category: 'jambes', sets: [{ id: 'pst0000001', weight: 60, reps: 10 }], loop: null }, { id: 'pex0000002', name: 'Planche', exType: 'cardio', category: 'gainage', sets: [], loop: { rounds: 4, workSec: 30, restSec: 15 } }] }],
  weights: [{ id: 'wgt0000001', date: '2026-09-25', weight: 77.1 }, { id: 'wgt0000002', date: '2026-09-18', weight: 77.5 }],
});
const expected = () => { const sub = (v) => typeof v === 'string' ? v.replace(/</g, '＜').replace(/>/g, '＞') : Array.isArray(v) ? v.map(sub) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sub(x)])) : v; return sub(legit()); };
const STATE = "({ sessions, runSessions, swimSessions, bikeSessions, library, runLibrary, swimLibrary, bikeLibrary, gymExerciseConfigs, gainageExerciseConfigs, sessionPlans, weights })";
(async () => { const b = await chromium.launch(); const exp = expected(); let bad = 0;
  const cmp = (label, got) => { const diffs = Object.keys(exp).filter((k) => JSON.stringify(got[k]) !== JSON.stringify(exp[k])); console.log(`${diffs.length ? '✗' : '✓'} ${label.padEnd(52)} ${diffs.length ? 'ÉCARTS : ' + diffs.join(', ') : 'identique octet pour octet (hors < > → ＜ ＞)'}`); if (diffs.length) { bad++; const k = diffs[0]; console.log('    attendu :', JSON.stringify(exp[k]).slice(0, 220), '\n    obtenu  :', JSON.stringify(got[k]).slice(0, 220)); } };
  // A) cloud
  { const { ctx, p } = await L.newPage(b, DIR, PORT);
    const got = await p.evaluate(async ({ d }) => { currentUser = { uid: 'u1' }; window.__CLOUD = { 'sessions/gym': d.sessions, 'sessions/run': d.runSessions, 'sessions/swim': d.swimSessions, 'sessions/bike': d.bikeSessions, 'library/gym': d.library, 'library/run': d.runLibrary, 'library/swim': d.swimLibrary, 'library/bike': d.bikeLibrary, gymExerciseConfigs: d.gymExerciseConfigs, gainageExerciseConfigs: d.gainageExerciseConfigs, sessionPlans: d.sessionPlans, weights: d.weights }; await pullFromFirebase(); return eval(STATE_SRC); }, { d: legit() }).catch(async () => null);
    const got2 = await p.evaluate(async ({ d, STATE }) => { currentUser = { uid: 'u1' }; window.__CLOUD = { 'sessions/gym': d.sessions, 'sessions/run': d.runSessions, 'sessions/swim': d.swimSessions, 'sessions/bike': d.bikeSessions, 'library/gym': d.library, 'library/run': d.runLibrary, 'library/swim': d.swimLibrary, 'library/bike': d.bikeLibrary, gymExerciseConfigs: d.gymExerciseConfigs, gainageExerciseConfigs: d.gainageExerciseConfigs, sessionPlans: d.sessionPlans, weights: d.weights }; await pullFromFirebase(); return (new Function('return ' + STATE))(); }, { d: legit(), STATE });
    cmp('A) Cloud (pullFromFirebase)', got2); await ctx.close(); }
  // B) restauration d'une sauvegarde
  { const { ctx, p } = await L.newPage(b, DIR, PORT);
    const got = await p.evaluate(({ d, STATE }) => { restoreFromBackupData(JSON.parse(JSON.stringify(d))); return (new Function('return ' + STATE))(); }, { d: legit(), STATE });
    cmp('B) Restauration d\'une sauvegarde', got);
    // C) redémarrage : tout est relu depuis le stockage local
    await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return true; } catch (e) { return false; } }).catch(() => {}); await p.waitForTimeout(250);
    cmp('C) Redémarrage (relecture du stockage local)', await p.evaluate((STATE) => (new Function('return ' + STATE))(), STATE));
    // E) aller-retour export -> import (le vrai export de l'app)
    const rt = await p.evaluate((STATE) => { const json = window.__scriptableExport(); restoreFromBackupData(JSON.parse(json)); return (new Function('return ' + STATE))(); }, STATE);
    cmp('E) Aller-retour export → import (export réel)', rt); await ctx.close(); }
  // D) import d'une séance partagée (gym) : même contenu, nouvel identifiant
  { const { ctx, p } = await L.newPage(b, DIR, PORT);
    const r = await p.evaluate(async ({ d }) => { sessions = []; handleImportedFile({ kind: 'gymlog-single-session', type: 'gym', session: d.sessions[0] }, () => {}); await new Promise((r) => setTimeout(r, 80)); document.querySelector('.modal-confirm').click(); await new Promise((r) => setTimeout(r, 80)); return sessions[0]; }, { d: legit() });
    const want = { ...exp.sessions[0], id: r.id }; const ok = JSON.stringify(r) === JSON.stringify(want) && r.id !== exp.sessions[0].id && /^[\w-]+$/.test(r.id);
    console.log(`${ok ? '✓' : '✗'} D) Import d'une séance partagée                       ${ok ? 'identique, nouvel identifiant généré' : 'ÉCART'}`); if (!ok) { bad++; console.log('   ', JSON.stringify(r).slice(0, 200)); } await ctx.close(); }
  console.log(bad ? `\n${bad} chemin(s) altèrent des données légitimes` : '\nAucune donnée légitime altérée sur les 5 chemins');
  await b.close(); })();
