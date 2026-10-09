// Parité entre modes : un champ qui s'applique à plusieurs modes d'un même bloc doit exister dans CHACUN d'eux.
// Usage : node tools/tests/mode_parity.js <dossier> [port]
// Pour ajouter une règle : la déclarer dans SHARED ci-dessous (sport -> champs présents dans tous ses modes).
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8816'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
// Champs communs à tous les modes d'un sport. (Les champs propres à un mode — Longueurs, Répétitions… — n'ont pas à y figurer.)
const SHARED = {
  natation: ['Nage'],
  course: ['Allure (min/km)'],
};
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 414, height: 896 }, serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
  await p.evaluate(() => { currentUser = { uid: 'u' }; swimSessions = []; runSessions = []; bikeSessions = []; swimSessionPlans = []; runSessionPlans = []; bikeSessionPlans = []; swimLibrary = []; });
  const labels = () => p.evaluate(() => [...document.querySelector('.exercise-card').querySelectorAll('.field label')].map((l) => l.textContent.trim()));
  const hasName = () => p.evaluate(() => !!document.querySelector('.exercise-card .ex-name-input'));
  console.log('=== Champs communs à tous les modes ===');
  await p.evaluate(() => { clearSwimDraft(); swimTopMode = 'session'; swimTab = 'log'; currentApp = 'swim'; renderSwimApp(); }); await p.waitForTimeout(300);
  for (const mode of ['both', 'pool']) { await p.click(`.exercise-card [data-block-type="${mode}"]`); await p.waitForTimeout(250); const l = await labels();
    for (const f of SHARED.natation) check(`Natation, mode « ${mode === 'both' ? 'Distance + Durée' : 'Bassin'} » : champ « ${f} » présent`, l.includes(f), JSON.stringify(l)); check(`Natation, mode « ${mode === 'both' ? 'Distance + Durée' : 'Bassin'} » : nom du bloc présent`, await hasName()); }
  await p.evaluate(() => { clearRunDraft(); runTopMode = 'session'; runTab = 'log'; currentApp = 'run'; renderRunApp(); }); await p.waitForTimeout(300);
  for (const mode of ['duration', 'distance', 'interval']) { await p.click(`.exercise-card [data-block-type="${mode}"]`); await p.waitForTimeout(250); const l = await labels();
    for (const f of SHARED.course) check(`Course, mode « ${mode} » : champ « ${f} » présent`, l.includes(f), JSON.stringify(l)); check(`Course, mode « ${mode} » : nom du bloc présent`, await hasName()); }
  await p.evaluate(() => { clearBikeDraft(); bikeTopMode = 'session'; bikeTab = 'log'; currentApp = 'bike'; renderBikeApp(); }); await p.waitForTimeout(300);
  check('Vélo : un seul mode de saisie (rien à comparer), nom du bloc présent', (await p.evaluate(() => document.querySelectorAll('.exercise-card .ex-type-btn').length)) === 0 && await hasName());

  console.log('\n=== Natation : la nage dans les deux modes, de la saisie à l\'historique ===');
  const swimOpen = async () => { await p.evaluate(() => { clearSwimDraft(); swimSessions = []; swimTopMode = 'session'; swimTab = 'log'; currentApp = 'swim'; renderSwimApp(); }); await p.waitForTimeout(300); };
  const saved = () => p.evaluate(() => swimSessions[0].blocks.map((b) => ({ mode: b.mode, stroke: b.stroke, duration: b.duration, distance: b.distance, lengths: b.lengths })));
  await swimOpen(); await p.fill('.swim-block-duration', '30'); await p.fill('.swim-block-distance', '1500'); await p.selectOption('.swim-block-stroke', 'Brasse'); await p.click('#save-swim-session-btn'); await p.waitForTimeout(800);
  let s = await saved(); check('« Distance + Durée » : nage choisie, enregistrée avec la durée et la distance', s[0].mode === 'both' && s[0].stroke === 'Brasse' && s[0].duration === '30' && s[0].distance === '1500', JSON.stringify(s[0]));
  await p.evaluate(() => { swimTab = 'history'; renderSwimApp(); document.querySelector('[data-toggle], [data-swim-toggle]')?.click(); }); await p.waitForTimeout(300); const hist = await p.evaluate(() => document.getElementById('app').innerText);
  check('Historique : le résumé du bloc indique la nage (« … · Brasse »)', /30min · 1500m · .*Brasse/.test(hist), (hist.match(/30min[^\n]*/) || [''])[0]);
  await swimOpen(); await p.selectOption('.swim-block-stroke', 'Dos'); await p.click('.exercise-card [data-block-type="pool"]'); await p.waitForTimeout(300);
  check('Changer de mode (Distance + Durée → Bassin) conserve la nage choisie', (await p.inputValue('.swim-block-stroke')) === 'Dos');
  await p.click('.exercise-card [data-block-type="both"]'); await p.waitForTimeout(300); check('…et dans l\'autre sens (Bassin → Distance + Durée)', (await p.inputValue('.swim-block-stroke')) === 'Dos');
  await swimOpen(); await p.fill('.swim-block-duration', '20'); await p.click('#save-swim-session-btn'); await p.waitForTimeout(800); s = await saved(); check('Sans nage choisie : enregistré avec une nage vide (comme avant)', s[0].stroke === '');
  await swimOpen(); await p.selectOption('.swim-block-stroke', 'Papillon'); await p.click('#save-swim-session-btn'); await p.waitForTimeout(800); s = await saved(); check('Une nage seule (sans chiffres) compte comme une donnée, comme en mode Bassin', s.length === 1 && s[0].stroke === 'Papillon', JSON.stringify(s));
  await p.evaluate(() => { swimSessions = [{ id: 'old', date: '2026-09-01', label: 'Ancienne', blocks: [{ id: 'o1', label: 'A', mode: 'both', duration: '30', distance: '1000', pace: '3', poolLength: '', lengths: '', stroke: 'Pull buoy' }] }]; startEditSwimSession(swimSessions[0]); }); await p.waitForTimeout(350);
  check('Ancien bloc « Distance + Durée » avec un texte libre : conservé et choisi dans le menu', (await p.inputValue('.swim-block-stroke')) === 'Pull buoy');
  await p.click('#save-swim-session-btn'); await p.waitForTimeout(800); s = await saved(); check('…enregistré sans rien toucher : « Pull buoy » conservé', s[0].stroke === 'Pull buoy');
  await swimOpen(); await p.click('[data-swim-top-mode="plan"]'); await p.waitForTimeout(350);
  await p.fill('#swim-label', 'Plan eau libre'); await p.fill('.swim-block-duration', '25'); await p.selectOption('.swim-block-stroke', 'Crawl'); await p.click('#save-swim-session-btn'); await p.waitForTimeout(800);
  check('Plan, mode « Distance + Durée » : nage enregistrée dans le plan', await p.evaluate(() => swimSessionPlans[0] && swimSessionPlans[0].blocks[0].stroke === 'Crawl'));
  check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune');
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
