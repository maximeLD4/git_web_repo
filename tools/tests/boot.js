// Démarrage : l'écran de connexion (ou l'app) s'affiche quel que soit le moment où Firebase répond — y compris
// AVANT la fin du chargement des fichiers (chargement infini corrigé en 2.97.1) —, et un message remplace le
// chargement si Firebase ne répond jamais. Usage : node tools/tests/boot.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8827'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
// mode : 'sync' (répond dès qu'on écoute), 'early' (répond avant même le dernier fichier de l'app),
// 'later', 'user' (connecté), 'never', 'nosdk'
async function boot(b, mode, wait) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 760 }, serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  // 'early' : on retarde le dernier fichier (17-main.js) — comme un téléchargement lent après une mise à
  // jour —, pendant que Firebase répond tout de suite.
  if (mode === 'early') await p.route('**/js/17-main.js*', async (r) => { await new Promise((res) => setTimeout(res, 600)); r.continue(); });
  await p.addInitScript((mode) => { if (mode === 'nosdk') return; const noop = () => {};
    const user = { uid: 'u1', email: 'a@b.c' };
    const o = { onAuthStateChanged: (cb) => { if (mode === 'never') return; if (mode === 'sync') cb(null); else if (mode === 'user') setTimeout(() => cb(user), 10); else setTimeout(() => cb(null), mode === 'early' ? 5 : 300); }, signOut: noop, setPersistence: () => Promise.resolve() };
    const a = () => o; a.Auth = { Persistence: { LOCAL: 'local' } };
    const ref = { once: () => Promise.resolve({ val: () => null, exists: () => false }), set: () => Promise.resolve(), update: () => Promise.resolve(), on: noop, off: noop, child: () => ref }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ref }) };
    // 'early' : la réponse de Firebase est déclenchée dès qu'on l'écoute ; avant 2.97.1, on l'écoutait dès
    // 04-auth.js, donc bien avant que 17-main.js (retardé) ait fini de se charger.
  }, mode);
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(wait);
  const st = await p.evaluate(() => ({ login: !!document.getElementById('login-form'), loading: !!document.querySelector('.auth-loading') && !document.getElementById('auth-retry-btn'), stuck: (document.getElementById('auth-retry-btn') ? document.querySelector('.auth-loading-label').textContent : ''), home: !!document.querySelector('#app.theme-home, .home-wordmark') }));
  return { p, ctx, st };
}
(async () => { const b = await chromium.launch();
  let r = await boot(b, 'sync', 800); check('Firebase répond à l\'instant où on l\'écoute : écran de connexion', r.st.login && !r.st.loading, JSON.stringify(r.st)); await r.ctx.close();
  r = await boot(b, 'early', 1500); check('Firebase répond AVANT la fin du chargement des fichiers (fichier lent) : écran de connexion, pas de chargement infini', r.st.login && !r.st.loading, JSON.stringify(r.st)); check('    aucune erreur JS', r.p.errs.length === 0, r.p.errs.join(' | ') || 'aucune'); await r.ctx.close();
  r = await boot(b, 'later', 1000); check('Firebase répond plus tard : écran de connexion', r.st.login, JSON.stringify(r.st)); await r.ctx.close();
  r = await boot(b, 'user', 4500); check('Utilisateur déjà connecté : l\'app s\'ouvre (accueil)', r.st.home && !r.st.loading && !r.st.login, JSON.stringify(r.st)); check('    aucune erreur JS', r.p.errs.length === 0, r.p.errs.join(' | ') || 'aucune'); await r.ctx.close();
  r = await boot(b, 'nosdk', 800); check('Script Firebase non chargé : message clair + « Réessayer », pas de chargement infini', /Impossible de joindre le service de connexion/.test(r.st.stuck), JSON.stringify(r.st)); check('    aucune erreur JS', r.p.errs.length === 0, r.p.errs.join(' | ') || 'aucune'); await r.ctx.close();
  r = await boot(b, 'never', 12800); check('Firebase ne répond jamais : au bout de 12 s, message + « Réessayer »', /plus de temps que prévu|Pas de connexion/.test(r.st.stuck), JSON.stringify(r.st)); await r.ctx.close();
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
