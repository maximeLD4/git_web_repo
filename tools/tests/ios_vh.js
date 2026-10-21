// Barre du bas sur l'app installée iOS (3.3.3) : la page prend la hauteur RÉELLE de l'écran (100vh) au lieu de
// suivre la fenêtre (position: fixed + inset: 0), comme le recommande l'enquête r/PWA. Usage : node tools/tests/ios_vh.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8834'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
async function open(b, { standalone, stored }) {
  const ctx = await b.newContext({ viewport: { width: 414, height: 896 }, serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(({ standalone, stored }) => { if (standalone) Object.defineProperty(window.navigator, 'standalone', { get: () => true });
    if (stored !== undefined && !sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('gymlog.viewportFix', stored); if (stored !== 'old') localStorage.setItem('gymlog.viewportFix.v2', '1'); }
    const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; }, { standalone, stored });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
  await p.evaluate(() => { currentUser = { uid: 'u' }; currentApp = 'home'; render(); }); await p.waitForTimeout(150);
  return { ctx, p };
}
const look = (p) => p.evaluate(() => { const st = getComputedStyle(document.documentElement), bs = getComputedStyle(document.body), nav = document.querySelector('.home-bottom-nav').getBoundingClientRect(); return { vh: document.documentElement.classList.contains('vfix-vh'), htmlH: st.height, bodyH: bs.height, bodyBottom: bs.bottom, navBottom: Math.round(nav.bottom), innerH: innerHeight, mode: viewportResolvedMode }; });
(async () => { const b = await chromium.launch();
  { const { ctx, p } = await open(b, { standalone: true }); const l = await look(p);
    check('Barre d\'état iOS : style « default », PLUS « black-translucent » (cause de la bande inaccessible)', await p.evaluate(() => { const m = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]'); return !!m && m.content === 'default' && !document.querySelector('meta[content="black-translucent"]'); }));
    check('App installée, mode auto : page ancrée à la fenêtre (plus de « vh » d\'office), barre du bas en bas de la fenêtre', !l.vh && l.navBottom === l.innerH, JSON.stringify(l));
    for (const [mode, color] of [['day', '#F3ECE4'], ['night', '#1E1A17'], ['anne', '#FCE3EC']]) {
      await p.evaluate((m) => applyColorMode(m), mode);
      check(`theme-color (zone de la barre d'état) suit le thème : ${mode} → ${color}`, (await p.evaluate(() => document.getElementById('theme-color-meta').content)) === color);
    }
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close(); }
  { const { ctx, p } = await open(b, { standalone: false }); const l = await look(p);
    check('Dans le navigateur (pas installée) : pas de « vh » (comme avant)', !l.vh && l.mode !== 'vh', JSON.stringify(l)); await ctx.close(); }
  { const { ctx, p } = await open(b, { standalone: true, stored: 'old' });
    check('Mode choisi à la main AVANT 3.3.3 (ex. « flux ») : oublié une fois (retour à auto)', await p.evaluate(() => getViewportMode() === 'auto' && !document.documentElement.classList.contains('vfix-vh'))); await ctx.close(); }
  { const { ctx, p } = await open(b, { standalone: true, stored: 'bande' });
    check('Mode choisi à la main APRÈS (5 touchers) : respecté (secours)', await p.evaluate(() => getViewportMode() === 'bande' && !document.documentElement.classList.contains('vfix-vh'))); await ctx.close(); }
  { const { ctx, p } = await open(b, { standalone: false, stored: 'vh' });
    check('« vh » reste disponible à la main (secours)', (await look(p)).vh); await ctx.close(); }
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
