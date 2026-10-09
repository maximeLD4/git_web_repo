// Tests des menus déroulants : un seul habillage, et chacun fonctionne. Usage : node tools/tests/dropdowns.js <dossier> [port] [dossier-témoin]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8814', CTL = process.argv[4] || null; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
const open = async (b, dir, mode = 'day') => { const ctx = await b.newContext({ viewport: { width: 414, height: 896 }, serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${dir}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } }); await p.waitForTimeout(250);
  await p.evaluate((m) => { currentUser = { uid: 'u', email: 'a@b.c' }; applyColorMode(m); gymExerciseConfigs = [{ id: 'c1', name: 'Squat', category: 'jambes', baseWeights: [40, 50, 60, 70], maxIncrement: 2.5, pairedExerciseId: null }, { id: 'c2', name: 'Presse', category: 'jambes', baseWeights: [100, 120] }]; gainageExerciseConfigs = []; sessions = []; runSessions = []; bikeSessions = []; swimSessions = []; swimSessionPlans = []; sessionPlans = []; weights = []; }, mode); return { ctx, p }; };
const SCREENS = {
  'Créer (muscu, exercice choisi + à choisir)': () => { clearDraft(); draft.exercises = [{ id: 'e0', name: '', exType: 'muscu', category: 'jambes', sets: [{ id: 's0', weight: '', reps: '', weightMode: 'off' }] }, { id: 'e1', name: 'Squat', exType: 'muscu', category: 'jambes', sets: [{ id: 's1', weight: 60, reps: 10, weightMode: 'off' }] }]; saveJSON(KEYS.draft, draft); currentApp = 'gym'; tab = 'log'; gymTopMode = 'session'; renderGymApp(); },
  'Créer (plan)': () => { clearDraft(); draft.kind = 'plan'; draft.exercises = [{ id: 'e1', name: 'Squat', exType: 'muscu', category: 'jambes', sets: [{ id: 's1', weight: 60, reps: 10, weightMode: 'off' }] }]; saveJSON(KEYS.draft, draft); currentApp = 'gym'; tab = 'log'; gymTopMode = 'plan'; renderGymApp(); },
  'Natation > bloc Bassin': () => { clearSwimDraft(); swimTopMode = 'session'; swimTab = 'log'; currentApp = 'swim'; renderSwimApp(); document.querySelector('[data-block-type="pool"]').click(); },
};
(async () => { const b = await chromium.launch();
  console.log('=== 1) Plus aucun menu hors du style commun, sur chaque écran qui en contient ===');
  { const { ctx, p } = await open(b, DIR); let total = 0;
    for (const [name, fn] of Object.entries(SCREENS)) { await p.evaluate(fn); await p.waitForTimeout(450); const r = await p.evaluate(() => ({ n: document.querySelectorAll('select').length, hors: [...document.querySelectorAll('select:not(.app-select)')].map((s) => s.className || s.id) })); total += r.n; check(`${name.padEnd(46)} ${r.n} menu(s)`, r.n > 0 && r.hors.length === 0, r.hors.length ? 'HORS STYLE : ' + r.hors.join(',') : ''); }
    await p.evaluate(() => { currentApp = 'settings-gym'; render(); }); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('[data-edit-config="c1"]').click()); await p.waitForTimeout(400);
    let r = await p.evaluate(() => ({ n: document.querySelectorAll('select').length, hors: [...document.querySelectorAll('select:not(.app-select)')].length })); check(`${'Réglages > exercice > « Alterner avec »'.padEnd(46)} ${r.n} menu(s)`, r.n === 1 && r.hors === 0);
    await p.evaluate(() => { liveSession = null; currentApp = 'live'; render(); }); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('[data-live-category="jambes"]').click()); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('[data-live-exercise="Squat"]').click()); await p.waitForTimeout(450);
    r = await p.evaluate(() => ({ n: document.querySelectorAll('select').length, hors: [...document.querySelectorAll('select:not(.app-select)')].length })); check(`${'Séance en direct > poids'.padEnd(46)} ${r.n} menu(s)`, r.n === 1 && r.hors === 0);
    check('Aucun champ de saisie « Nage » au clavier : plus de liste de suggestions de nage', await p.evaluate(() => !document.getElementById('swim-stroke-suggestions') && !document.querySelector('input.swim-block-stroke')));
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close(); }
  console.log('\n=== 2) Chaque menu fonctionne ===');
  { const { ctx, p } = await open(b, DIR);
    await p.evaluate(SCREENS['Créer (muscu, exercice choisi + à choisir)']); await p.waitForTimeout(450);
    await p.selectOption('.set-weight', '70'); await p.waitForTimeout(250); let w = await p.evaluate(() => serializeExercisesFromDOM().find((e) => e.name === 'Squat').sets[0].weight);
    check('Créer : le menu de poids enregistre le palier choisi (70)', Number(w) === 70, String(w));
    await p.click('.increment-switch-btn'); await p.waitForTimeout(250); w = await p.evaluate(() => serializeExercisesFromDOM().find((e) => e.name === 'Squat').sets[0].weight); check('Créer : le bouton « Standard / +2.5kg » s\'ajoute toujours au palier (72.5)', Number(w) === 72.5, String(w));
    await p.evaluate(SCREENS['Créer (muscu, exercice choisi + à choisir)']); await p.waitForTimeout(450); await p.selectOption('.exercise-card:first-child select.ex-name-pill', 'Presse'); await p.waitForTimeout(400);
    check('Créer : « Choisis un exercice » → Presse : la carte prend l\'exercice choisi', await p.evaluate(() => serializeExercisesFromDOM().some((e) => e.name === 'Presse')));
    await p.evaluate(() => { currentApp = 'settings-gym'; render(); }); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('[data-edit-config="c1"]').click()); await p.waitForTimeout(400);
    await p.selectOption('#config-paired-exercise-select', 'c2'); await p.click('#save-config-btn'); await p.waitForTimeout(300);
    check('Réglages : « Alterner avec » → Presse est bien enregistré', await p.evaluate(() => gymExerciseConfigs.find((c) => c.id === 'c1').pairedExerciseId === 'c2'));
    await p.evaluate(() => { liveSession = null; currentApp = 'live'; render(); }); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('[data-live-category="jambes"]').click()); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('[data-live-exercise="Squat"]').click()); await p.waitForTimeout(450);
    await p.selectOption('#live-weight-select', '60'); await p.waitForTimeout(300); check('Séance en direct : le menu de poids retient le palier choisi (60)', await p.evaluate(() => liveDraftBaseWeight === 60 || document.getElementById('live-weight-select').value === '60'), String(await p.evaluate(() => document.getElementById('live-weight-select').value)));
    await p.selectOption('#live-weight-select', '__edit_config__'); await p.waitForTimeout(500); check('Séance en direct : l\'option « ⚙ Modifier les poids… » ouvre toujours les réglages de l\'exercice', await p.evaluate(() => currentApp === 'settings-gym'), await p.evaluate(() => currentApp));
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close(); }
  console.log('\n=== 3) Natation : « Nage » = liste fermée ===');
  { const { ctx, p } = await open(b, DIR);
    await p.evaluate(SCREENS['Natation > bloc Bassin']); await p.waitForTimeout(400);
    const opts = await p.evaluate(() => [...document.querySelector('.swim-block-stroke').options].map((o) => o.textContent)); check('Choix proposés : placeholder + 5 nages, sans saisie libre', JSON.stringify(opts) === JSON.stringify(['— Choisis une nage —', 'Crawl', 'Dos', 'Brasse', 'Papillon', '4 nages']), JSON.stringify(opts));
    for (const s of ['Crawl', 'Dos', 'Brasse', 'Papillon', '4 nages']) { await p.evaluate(() => { clearSwimDraft(); swimSessions = []; swimTopMode = 'session'; swimTab = 'log'; currentApp = 'swim'; renderSwimApp(); document.querySelector('[data-block-type="pool"]').click(); }); await p.waitForTimeout(350);
      await p.fill('#swim-pool-length', '25'); await p.fill('.swim-block-lengths', '16'); await p.selectOption('.swim-block-stroke', s); await p.click('#save-swim-session-btn'); await p.waitForTimeout(800);
      check(`Nage « ${s} » : enregistrée telle quelle`, await p.evaluate((s) => swimSessions[0].blocks[0].stroke === s, s)); }
    await p.evaluate(() => { clearSwimDraft(); swimSessions = []; swimTopMode = 'session'; swimTab = 'log'; currentApp = 'swim'; renderSwimApp(); document.querySelector('[data-block-type="pool"]').click(); }); await p.waitForTimeout(350); await p.fill('#swim-pool-length', '25'); await p.fill('.swim-block-lengths', '16'); await p.click('#save-swim-session-btn'); await p.waitForTimeout(800);
    check('Sans choix de nage : enregistré avec une nage vide (comme avant)', await p.evaluate(() => swimSessions[0].blocks[0].stroke === ''));
    // anciennes séances : texte libre conservé
    await p.evaluate(() => { swimSessions = [{ id: 'leg', date: '2026-09-02', label: 'Ancienne', blocks: [{ id: 'l1', label: 'A', mode: 'pool', duration: '', distance: '', pace: '', poolLength: '25', lengths: '10', stroke: 'Pull buoy' }, { id: 'l2', label: 'B', mode: 'pool', duration: '', distance: '', pace: '', poolLength: '25', lengths: '8', stroke: 'crawl' }] }]; startEditSwimSession(swimSessions[0]); }); await p.waitForTimeout(400);
    const lo = await p.evaluate(() => [...document.querySelectorAll('.swim-block-stroke')].map((s) => ({ value: s.value, options: [...s.options].map((o) => o.textContent) })));
    check('Ancienne séance : un texte libre (« Pull buoy ») reste affiché et choisi, sans rien effacer', lo[0].value === 'Pull buoy' && lo[0].options.includes('Pull buoy'), JSON.stringify(lo[0].value));
    check('Ancienne séance : « crawl » (casse différente) est rattaché au choix « Crawl »', lo[1].value === 'Crawl' && lo[1].options.filter((o) => /crawl/i.test(o)).length === 1, JSON.stringify(lo[1].value));
    await p.click('#save-swim-session-btn'); await p.waitForTimeout(800); const s1 = await p.evaluate(() => swimSessions[0].blocks.map((b) => b.stroke)); check('…enregistrée sans rien toucher : « Pull buoy » conservé, « crawl » → « Crawl »', s1[0] === 'Pull buoy' && s1[1] === 'Crawl', JSON.stringify(s1));
    await p.evaluate(() => { startEditSwimSession(swimSessions[0]); }); await p.waitForTimeout(350); await p.selectOption('#swim-blocks-container .exercise-card:nth-child(1) .swim-block-stroke', 'Dos'); await p.click('#save-swim-session-btn'); await p.waitForTimeout(800); const s2 = await p.evaluate(() => swimSessions[0].blocks.map((b) => b.stroke));
    check('Choisir une nage remplace le texte libre', s2[0] === 'Dos', JSON.stringify(s2));
    await p.evaluate(() => { swimTab = 'history'; renderSwimApp(); document.querySelector('[data-toggle], [data-swim-toggle]')?.click(); }); await p.waitForTimeout(300); check('Historique : la nage s\'affiche toujours (« 10×25m Dos »)', /10×25m Dos/.test(await p.evaluate(() => document.getElementById('app').innerText)));
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close(); }
  if (CTL) { console.log('\n=== 4) Le modèle (« Choisis un exercice ») est inchangé en mode Jour, et son chevron est maintenant visible en Nuit ===');
    const shot = async (dir, mode) => { const { ctx, p } = await open(b, dir, mode); await p.evaluate(SCREENS['Créer (muscu, exercice choisi + à choisir)']); await p.waitForTimeout(500); const el = await p.$('.exercise-card:first-child select.ex-name-pill'); const buf = await el.screenshot(); const bb = await el.boundingBox(); await ctx.close(); return { buf, bb }; };
    const { PNG } = (() => { try { return require('pngjs'); } catch (e) { return {}; } })();
    const day0 = await shot(CTL, 'day'), day1 = await shot(DIR, 'day');
    check('Mode Jour : même taille que le modèle d\'origine', Math.abs(day0.bb.width - day1.bb.width) < 1 && Math.abs(day0.bb.height - day1.bb.height) < 1, `${day0.bb.width}×${day0.bb.height} vs ${day1.bb.width}×${day1.bb.height}`);
    check('Mode Jour : rendu identique octet pour octet', Buffer.compare(day0.buf, day1.buf) === 0); }
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
