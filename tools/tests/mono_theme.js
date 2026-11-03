// Mode « Mono » (3.6.0) : noir & blanc. Sélection, mémorisation, couleur de barre d'état, et lisibilité des grandes
// surfaces blanches (tuile Séance en direct, bandeau du repos) comme noires (effort). Usage : node tools/tests/mono_theme.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8839'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
  await p.evaluate(() => { currentUser = { uid: 'u' }; gymExerciseConfigs = [{ id: 'c', name: 'Squat', category: 'jambes', baseWeights: [60, 70] }]; currentApp = 'settings-appearance'; render(); });
  check('Réglages > Apparence : un 4e mode « Mono »', await p.evaluate(() => /Mono/.test(document.querySelector('[data-color-mode="mono"]').textContent)));
  await p.click('[data-color-mode="mono"]'); await p.waitForTimeout(200);
  check('Choisi : classe mode-mono, retenu, barre d\'état noire', await p.evaluate(() => document.documentElement.classList.contains('mode-mono') && localStorage.getItem('gymlog:color-mode') === '"mono"' && document.getElementById('theme-color-meta').content === '#0A0A0A'));
  const cr = (sel, sub) => p.evaluate(([sel, sub]) => { const parse = (c) => c.match(/[\d.]+/g).map(Number); const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); const el = document.querySelector(sel), t = sub ? el.querySelector(sub) : el; const bg = parse(getComputedStyle(el).backgroundColor), fg = parse(getComputedStyle(t).color); const a = lum(bg), b2 = lum(fg); return Math.round(((Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05)) * 10) / 10; }, [sel, sub]);
  await p.evaluate(() => { currentApp = 'home'; render(); }); await p.waitForTimeout(150);
  let r = await cr('.home-tile-wide', '.home-tile-title'); check(`Accueil : tuile « Séance en direct » blanche, titre noir (${r}:1)`, r >= 7, r);
  check('Fond de page noir, cartes gris très foncé, aucune couleur', await p.evaluate(() => getComputedStyle(document.getElementById('app')).backgroundColor === 'rgb(10, 10, 10)' && /22, 22, 22/.test(getComputedStyle(document.querySelector('.home-tile:not(.home-tile-wide)')).backgroundColor)));
  await p.evaluate(() => { liveSession = null; liveStep = 'category'; liveDraftType = 'muscu'; currentApp = 'live'; render(); document.querySelector('[data-live-pick-plan=""]')?.click(); document.querySelector('[data-live-category="jambes"]').click(); document.querySelector('[data-live-exercise="Squat"]').click(); startLiveSet(); }); await p.waitForTimeout(200);
  r = await cr('.live-rest-hero', '.live-rest-hero-value'); check(`Effort : bandeau noir, chrono blanc (${r}:1)`, r >= 7 && await p.evaluate(() => getComputedStyle(document.querySelector('.live-rest-hero')).backgroundColor === 'rgb(10, 10, 10)'), r);
  await p.evaluate(() => finishLiveSet()); await p.waitForTimeout(200);
  r = await cr('.live-rest-hero', '.live-rest-hero-value'); check(`Repos : bandeau blanc, chrono noir (${r}:1)`, r >= 7 && await p.evaluate(() => getComputedStyle(document.querySelector('.live-rest-hero')).backgroundColor === 'rgb(244, 244, 244)'), r);
  r = await cr('[data-live-start-set]'); check(`« Lancer » : bouton blanc, texte noir (${r}:1)`, r >= 7, r);
  check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune');
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
