// Textes d'aide (Réglages > Apparence) : masqués par défaut, réaffichables, retenus. Usage : node tools/tests/hints.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8819'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
const HINTS = '.field-hint, .block-mode-hint, .cal-empty-hint, .live-hint';
// Écrans qui contiennent des textes d'aide (au moins un chacun).
const SCREENS = {
  'Réglages > Apparence': () => { currentApp = 'settings-appearance'; render(); },
  'Réglages > Son': () => { currentApp = 'settings-sound'; render(); },
  'Réglages > Sauvegarde': () => { currentApp = 'settings-backup'; render(); },
  'Réglages > Exercices > formulaire': () => { gymExerciseConfigs = [{ id: 'c1', name: 'Squat', category: 'jambes', baseWeights: [40, 50], maxIncrement: 2.5 }]; gymSettingsFormOpen = false; currentApp = 'settings-gym'; render(); document.querySelector('[data-edit-config="c1"]').click(); },
  'Course > bloc Durée': () => { clearRunDraft(); runTopMode = 'session'; runTab = 'log'; currentApp = 'run'; renderRunApp(); },
  'Vélo > bloc': () => { clearBikeDraft(); bikeTopMode = 'session'; bikeTab = 'log'; currentApp = 'bike'; renderBikeApp(); },
  // Séance en direct : les phrases qui redisent le bandeau du haut ou qui expliquent.
  'Direct > Muscu, série en cours': () => { gymExerciseConfigs = [{ id: 'c1', name: 'Squat', category: 'jambes', baseWeights: [40, 50] }]; liveSession = null; liveActiveExerciseId = null; liveStep = 'category'; liveDraftType = 'muscu'; currentApp = 'live'; render(); const n = document.querySelector('[data-live-no-plan], [data-live-skip-plan]'); if (n) n.click(); document.querySelector('[data-live-category="jambes"]').click(); document.querySelector('[data-live-exercise="Squat"]').click(); liveSession.restStartedAt = Date.now() - 50000; liveDraftRestSec = 50; startLiveSet(); },
  'Direct > Rameur, avant de lancer': () => { liveSession = null; liveActiveExerciseId = null; liveStep = 'category'; liveDraftType = 'muscu'; currentApp = 'live'; render(); const n = document.querySelector('[data-live-no-plan], [data-live-skip-plan]'); if (n) n.click(); liveDraftType = 'cardio'; renderLiveStep(); document.querySelector('[data-live-cardio-category="rameur"]').click(); },
  'Direct > Rameur, chrono en cours': () => { liveDraftRestSec = 40; startLiveSet(); },
  'Direct > Boucle de gainage': () => { liveSession = null; liveActiveExerciseId = null; liveStep = 'category'; liveDraftType = 'muscu'; currentApp = 'live'; render(); const n = document.querySelector('[data-live-no-plan], [data-live-skip-plan]'); if (n) n.click(); liveDraftType = 'cardio'; renderLiveStep(); document.querySelector('[data-live-cardio-category="gainage"]').click(); const e = document.querySelector('[data-live-exercise]'); if (e) e.click(); document.querySelector('[data-live-open-loop-form]').click(); document.querySelector('[data-live-start-loop]').click(); },
  'Calendrier (jour vide)': () => { sessions = []; runSessions = []; swimSessions = []; bikeSessions = []; currentApp = 'calendar'; render(); },
};
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 414, height: 896 }, serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  const boot = async () => { await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } }); await p.evaluate(() => { currentUser = { uid: 'u' }; }); };
  const count = (fn) => p.evaluate(([fn, sel]) => { eval('(' + fn + ')')(); const all = [...document.querySelectorAll(sel)]; return { n: all.length, visible: all.filter((e) => e.offsetParent !== null).length }; }, [fn.toString(), HINTS]);
  await boot(); await p.evaluate(() => localStorage.removeItem('gymlog:show-hints')); await boot();
  console.log('=== Par défaut : masqués ===');
  for (const [name, fn] of Object.entries(SCREENS)) { const r = await count(fn); await p.waitForTimeout(150); check(`${name.padEnd(36)} ${r.n} texte(s), 0 visible`, r.n > 0 && r.visible === 0, `${r.visible} visible(s)`); }
  check('Le réglage est désactivé', await p.evaluate(() => { currentApp = 'settings-appearance'; render(); const t = document.getElementById('show-hints-toggle'); return !t.classList.contains('on') && t.getAttribute('aria-checked') === 'false'; }));
  check('Le nouveau réglage n\'a pas de texte d\'aide à lui', await p.evaluate(() => { const card = document.getElementById('show-hints-toggle').closest('.field-list-card'); const nx = card.nextElementSibling; return !nx || !nx.classList.contains('field-hint'); }));
  console.log('\n=== Activé : tous visibles ===');
  await p.click('#show-hints-toggle'); await p.waitForTimeout(250);
  check('Interrupteur activé', await p.evaluate(() => document.getElementById('show-hints-toggle').classList.contains('on')));
  for (const [name, fn] of Object.entries(SCREENS)) { const r = await count(fn); await p.waitForTimeout(150); check(`${name.padEnd(36)} ${r.visible}/${r.n} visible(s)`, r.n > 0 && r.visible === r.n); }
  await boot(); check('Retenu après redémarrage', await p.evaluate(() => showHints === true && !document.documentElement.classList.contains('hide-hints')));
  console.log('\n=== Désactivé de nouveau ===');
  await p.evaluate(() => { currentApp = 'settings-appearance'; render(); }); await p.click('#show-hints-toggle'); await p.waitForTimeout(250);
  const r = await count(SCREENS['Réglages > Exercices > formulaire']); check('Masqués de nouveau', r.visible === 0);
  check('« Incrément possible » met toujours son texte à jour (masqué) sans erreur', await p.evaluate(() => { document.getElementById('config-max-increment-plus').click(); return /\+3\.5kg/.test(document.getElementById('config-increment-hint').textContent); }));
  await p.evaluate(() => { clearRunDraft(); runDraft.blocks = [{ ...emptyBlock(), mode: 'interval', reps: '8', repDuration: '1.5', recovery: '1' }]; runTopMode = 'session'; runTab = 'log'; currentApp = 'run'; renderRunApp(); }); await p.waitForTimeout(300);
  const tot = await p.evaluate(() => { const t = document.querySelector('.block-total-hint'); return t ? { text: t.textContent.trim(), shown: t.offsetParent !== null } : null; });
  check('Les données calculées restent visibles (Course fractionné : « Durée totale estimée »)', tot && /Durée totale estimée/.test(tot.text) && tot.shown, tot && tot.text);
  console.log('\n=== Séance en direct : bouton « Lancer <nom> » ===');
  const btn = (fn) => p.evaluate((fn) => { eval('(' + fn + ')')(); const b = document.querySelector('[data-live-start-set]'); return b ? b.textContent.trim() : null; }, fn.toString());
  check('Muscu : « Lancer Squat »', (await btn(() => { liveSession = null; liveActiveExerciseId = null; liveStep = 'category'; liveDraftType = 'muscu'; currentApp = 'live'; render(); const n = document.querySelector('[data-live-no-plan], [data-live-skip-plan]'); if (n) n.click(); document.querySelector('[data-live-category="jambes"]').click(); document.querySelector('[data-live-exercise="Squat"]').click(); })) === 'Lancer Squat');
  check('Cardio : « Lancer Rameur »', (await btn(SCREENS['Direct > Rameur, avant de lancer'])) === 'Lancer Rameur');
  check('Plus aucun « Débuter la série » à l\'écran', await p.evaluate(() => !document.body.textContent.includes('Débuter la série')));
  check('Nom très long : une seule ligne, terminée par « … »', await p.evaluate(() => { liveDraftName = 'Développé couché prise serrée sur banc incliné à 30 degrés'; renderLiveStep(); const b = document.querySelector('[data-live-start-set]'), l = b.querySelector('.live-btn-label'); return b.getBoundingClientRect().height < 80 && l.scrollWidth > l.clientWidth && getComputedStyle(l).textOverflow === 'ellipsis'; }));
  check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune');
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
