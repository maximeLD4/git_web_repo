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
    check('App installée (standalone), mode auto : correction « vh » appliquée', l.vh && l.mode === 'vh', JSON.stringify(l));
    const rule = await p.evaluate(() => { for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } for (const r of rules) if (r.selectorText === 'html.vfix-vh, html.vfix-vh body') return { h: r.style.height, b: r.style.bottom }; } return null; });
    check('…racine et body : height 100vh, plus ancrés au bas de la fenêtre (bottom: auto) — la recette r/PWA', !!rule && rule.h === '100vh' && rule.b === 'auto' && l.htmlH === '896px' && l.bodyH === '896px', JSON.stringify(rule));
    check('…barre du bas tout en bas', l.navBottom === 896, JSON.stringify(l));
    check('Les 5 touchers sur la version annoncent « auto → vh »', await p.evaluate(() => /auto → vh/.test(viewportFixLabel())));
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close(); }
  { const { ctx, p } = await open(b, { standalone: false }); const l = await look(p);
    check('Dans le navigateur (pas installée) : pas de « vh » (comme avant)', !l.vh && l.mode !== 'vh', JSON.stringify(l)); await ctx.close(); }
  { const { ctx, p } = await open(b, { standalone: true, stored: 'old' });
    check('Mode choisi à la main AVANT cette version (ex. « flux ») : oublié une fois, « vh » s\'applique', await p.evaluate(() => getViewportMode() === 'auto' && viewportResolvedMode === 'vh')); await ctx.close(); }
  { const { ctx, p } = await open(b, { standalone: true, stored: 'bande' });
    check('Mode choisi à la main APRÈS (5 touchers) : respecté (secours)', await p.evaluate(() => getViewportMode() === 'bande' && !document.documentElement.classList.contains('vfix-vh'))); await ctx.close(); }
  { const { ctx, p } = await open(b, { standalone: false, stored: 'vh' });
    check('« vh » choisi à la main dans le navigateur : appliqué', (await look(p)).vh); await ctx.close(); }
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
