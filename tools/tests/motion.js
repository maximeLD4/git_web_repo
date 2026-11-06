// Mode Mono, mouvement (3.7.0) : onde au toucher + micro-vibration, cascade à l'arrivée sur un écran (pas à chaque
// redessin), saut d'un chiffre qui change, rien hors Mono ni avec « réduire les animations ».
// Usage : node tools/tests/motion.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8840'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
async function page(b, reduced) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch: false });
  const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { window.__vib = 0; navigator.vibrate = () => { window.__vib++; return true; }; const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
  return { ctx, p };
}
(async () => { const b = await chromium.launch();
  { const { ctx, p } = await page(b, false);
    await p.evaluate(() => { currentUser = { uid: 'u' }; applyColorMode('mono'); gymExerciseConfigs = [{ id: 'c', name: 'Squat', category: 'jambes', baseWeights: [60, 70] }]; currentApp = 'home'; render(); }); await p.waitForTimeout(80);
    check('Arrivée sur l\'accueil : tuiles et lignes montent en cascade (décalage croissant)', await p.evaluate(() => { const els = [...document.querySelectorAll('.motion-enter')]; return els.length >= 6 && els.slice(0, 4).map((e) => +e.style.getPropertyValue('--motion-i')).join(',') === '0,1,2,3'; }));
    const box = await p.$('[data-open-app="gym"]'); const bb = await box.boundingBox();
    await p.mouse.move(bb.x + 30, bb.y + 20); await p.mouse.down(); await p.waitForTimeout(60);
    const tap = await p.evaluate(() => { const el = document.querySelector('[data-open-app="gym"]'); return { ripple: !!el.querySelector('.motion-ripple'), vib: window.__vib, scale: getComputedStyle(el).transform }; });
    check('Toucher : une onde part du doigt, micro-vibration, la tuile s\'enfonce', tap.ripple && tap.vib >= 1 && tap.scale !== 'none', JSON.stringify(tap));
    await p.mouse.up(); await p.waitForTimeout(700);
    check('…l\'onde disparaît ensuite', await p.evaluate(() => !document.querySelector('.motion-ripple')));
    await p.evaluate(() => { liveSession = null; liveStep = 'category'; liveDraftType = 'muscu'; currentApp = 'live'; render(); document.querySelector('[data-live-pick-plan=""]')?.click(); document.querySelector('[data-live-category="jambes"]').click(); document.querySelector('[data-live-exercise="Squat"]').click(); }); await p.waitForTimeout(800);
    await p.click('[data-live-reps-plus]'); await p.waitForTimeout(60);
    const st = await p.evaluate(() => ({ pop: !!document.querySelector('.live-stepper-value.motion-pop'), cascade: document.querySelectorAll('.motion-enter').length }));
    check('« + » sur les répétitions : le chiffre saute, et l\'écran ne refait PAS sa cascade (même écran)', st.pop && st.cascade === 0, JSON.stringify(st));
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close(); }
  { const { ctx, p } = await page(b, false);
    await p.evaluate(() => { currentUser = { uid: 'u' }; applyColorMode('night'); currentApp = 'home'; render(); }); await p.waitForTimeout(80);
    await p.click('[data-open-app="calendar"]', { noWaitAfter: true, trial: false }).catch(() => {});
    check('Apparence au mouvement calme (Nuit) : ni cascade ni onde', await p.evaluate(() => !document.querySelector('.motion-enter, .motion-ripple')));
    await ctx.close(); }
  { const { ctx, p } = await page(b, true);
    await p.evaluate(() => { currentUser = { uid: 'u' }; applyColorMode('mono'); currentApp = 'home'; render(); }); await p.waitForTimeout(80);
    const bb = await (await p.$('[data-open-app="gym"]')).boundingBox(); await p.mouse.move(bb.x + 20, bb.y + 20); await p.mouse.down(); await p.waitForTimeout(50);
    check('Mono avec « réduire les animations » : ni cascade ni onde', await p.evaluate(() => !document.querySelector('.motion-enter, .motion-ripple')));
    await p.mouse.up(); await ctx.close(); }
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
