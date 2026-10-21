// Barre du bas (accueil) : la racine prend la couleur de la barre, pour que la bande qu'iOS laisse parfois sous la
// fenêtre la prolonge au lieu d'être une marge beige — dans tous les modes du correctif et tous les thèmes.
// Usage : node tools/tests/bottom_band.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8833'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
  const look = () => p.evaluate(() => { const cs = (el) => getComputedStyle(el).backgroundColor; const nav = document.querySelector('.home-bottom-nav'); const probe = document.createElement('div'); probe.style.background = 'rgb(var(--surface-rgb))'; document.body.appendChild(probe); const surface = getComputedStyle(probe).backgroundColor; probe.remove(); const probe2 = document.createElement('div'); probe2.style.background = 'var(--bg)'; document.getElementById('app').appendChild(probe2); const bg = getComputedStyle(probe2).backgroundColor; probe2.remove(); return { root: cs(document.documentElement), body: cs(document.body), app: cs(document.getElementById('app')), nav: nav ? cs(nav) : null, surface, bg, bar: document.documentElement.classList.contains('vfix-bar') }; });
  for (const mode of ['day', 'night', 'anne']) {
    await p.evaluate((m) => { currentUser = { uid: 'u' }; applyColorMode(m); currentApp = 'home'; render(); }, mode); await p.waitForTimeout(150);
    const l = await look();
    check(`${mode} — accueil : racine ET body = couleur de la barre du bas (opaque), même sans défaut détecté`, l.bar && l.root === l.surface && l.body === l.surface && l.nav === l.surface, JSON.stringify(l));
    check(`${mode} — …et l'écran ne change pas : #app garde le fond de page`, l.app === l.bg, JSON.stringify(l));
  }
  await p.evaluate(() => { liveSession = null; currentApp = 'live'; render(); }); await p.waitForTimeout(150);
  const l = await look(); check('Écran sans barre du bas (Séance en direct) : la racine garde le fond de page', !l.bar && l.root !== l.surface, JSON.stringify(l));
  check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune');
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
