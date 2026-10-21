// Hors ligne / mauvaise connexion : rien ne doit disparaître, et l'app doit s'ouvrir vite.
// Firebase est simulé : hors ligne, lectures (once) et écritures (set) restent en attente ; au retour du réseau,
// elles aboutissent — dans l'ordre le PIRE pour les données (l'ancienne lecture du cloud arrive d'abord).
// Usage : node tools/tests/offline_sync.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8832'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
const OLD = [{ id: 'old1', date: '2026-10-01', label: 'Ancienne', exercises: [{ id: 'e', name: 'Squat', exType: 'muscu', category: 'jambes', sets: [{ id: 's', weight: 60, reps: 10 }] }] }];
async function open(b, { online, latency = 0, cache = true, order = 'reads-first' }) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', offline: false });
  const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(({ online, latency, cache, order, OLD }) => {
    const noop = () => {};
    // « Cloud » simulé, gardé entre les rechargements de la page.
    const cloud = JSON.parse(sessionStorage.getItem('fakeCloud') || 'null') || { 'users/u1/sessions/gym': OLD };
    const saveCloud = () => sessionStorage.setItem('fakeCloud', JSON.stringify(cloud));
    window.__net = { online, reads: [], writes: [], cloud };
    const snap = (path) => ({ val: () => (cloud[path] === undefined ? null : JSON.parse(JSON.stringify(cloud[path]))), exists: () => cloud[path] !== undefined });
    const later = (fn) => new Promise((res) => setTimeout(() => res(fn()), latency));
    const ref = (path) => ({
      child: (c) => ref(path + '/' + c),
      once: () => (window.__net.online ? later(() => snap(path)) : new Promise((res) => window.__net.reads.push(() => res(snap(path))))),
      set: (v) => { const w = () => { cloud[path] = JSON.parse(JSON.stringify(v)); saveCloud(); }; return window.__net.online ? later(w) : new Promise((res) => window.__net.writes.push(() => { w(); res(); })); },
      update: () => Promise.resolve(), on: (ev, cb) => { if (path === '.info/connected') { window.__net.connCb = cb; cb({ val: () => window.__net.online }); } }, off: noop,
    });
    window.__goOnline = () => { window.__net.online = true; const r = window.__net.reads.splice(0), w = window.__net.writes.splice(0); (order === 'reads-first' ? [...r, ...w] : [...w, ...r]).forEach((f) => f()); if (window.__net.connCb) window.__net.connCb({ val: () => true }); window.dispatchEvent(new Event('online')); };
    const o = { onAuthStateChanged: (cb) => setTimeout(() => cb({ uid: 'u1', email: 'a@b.c' }), 20), signOut: noop, setPersistence: () => Promise.resolve() }; const a = () => o; a.Auth = { Persistence: { LOCAL: 'local' } };
    window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: (path) => ref(path || '') }) };
    if (cache && !localStorage.getItem('gymlog:last-uid')) { localStorage.setItem('gymlog:last-uid', JSON.stringify('u1')); localStorage.setItem('gymlog:sessions', JSON.stringify(OLD)); localStorage.setItem('gymlog:onboarding', JSON.stringify({ done: true, step: 0, uid: 'u1' })); }
  }, { online, latency, cache, order, OLD });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  const t0 = Date.now(); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' });
  await p.waitForFunction(() => { try { return currentApp === 'home' && !!document.querySelector('[data-open-app="gym"]'); } catch (e) { return false; } }, null, { timeout: 20000 });
  return { ctx, p, openMs: Date.now() - t0 };
}
const saveSessionHere = (p, id) => p.evaluate((id) => { sessions = [{ id, date: '2026-10-21', label: 'Hors ligne', exercises: [{ id: 'e', name: 'Squat', exType: 'muscu', category: 'jambes', sets: [{ id: 's', weight: 70, reps: 8 }] }] }, ...sessions]; saveJSON(KEYS.sessions, sessions); }, id);
const state = (p) => p.evaluate(() => ({ local: sessions.map((s) => s.id), stored: JSON.parse(localStorage.getItem('gymlog:sessions') || '[]').map((s) => s.id), cloud: (window.__net.cloud['users/u1/sessions/gym'] || []).map((s) => s.id), dirty: [...firebaseDirtyKeys] }));
(async () => { const b = await chromium.launch();
  for (const order of ['reads-first', 'writes-first']) {
    console.log(`\n=== Ouverte HORS LIGNE, séance enregistrée, puis retour du réseau (au retour : ${order === 'reads-first' ? 'l\'ancienne lecture du cloud arrive d\'abord' : 'les envois partent d\'abord'}) ===`);
    const { ctx, p, openMs } = await open(b, { online: false, order });
    check(`Ouverture hors ligne rapide (${openMs} ms, moins de 2 s)`, openMs < 2000, openMs);
    await saveSessionHere(p, 'off1'); await p.waitForTimeout(1800);
    let s = await state(p); check('Séance enregistrée hors ligne : sur l\'appareil, en attente d\'envoi', s.local.includes('off1') && s.stored.includes('off1') && s.dirty.length > 0, JSON.stringify(s));
    if (order === 'reads-first') { await p.evaluate(() => render()); check('Accueil : « Hors ligne · tes données sont gardées sur ce téléphone… »', await p.evaluate(() => { const b = document.getElementById('cloud-sync-badge'); return !b.hidden && /Hors ligne/.test(b.textContent) && /gardées sur ce téléphone/.test(b.textContent); })); }
    await p.evaluate(() => window.__goOnline()); await p.waitForTimeout(2500);
    s = await state(p);
    check('Retour du réseau : la séance est TOUJOURS là (mémoire et appareil)', s.local.includes('off1') && s.stored.includes('off1'), JSON.stringify(s));
    check('…et elle est arrivée dans le cloud, plus rien en attente', s.cloud.includes('off1') && s.cloud.includes('old1') && s.dirty.length === 0, JSON.stringify(s));
    check('…et le bandeau « Hors ligne » disparaît', await p.evaluate(() => document.getElementById('cloud-sync-badge').hidden));
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close();
  }
  console.log('\n=== Connexion très lente (chaque échange met 8 s) ===');
  { const { ctx, p, openMs } = await open(b, { online: true, latency: 8000 });
    check(`L'app s'ouvre sans attendre le réseau (${openMs} ms, moins de 2 s), sur les données de l'appareil`, openMs < 2000 && await p.evaluate(() => sessions.some((s) => s.id === 'old1')), openMs);
    await saveSessionHere(p, 'slow1'); await p.waitForTimeout(9500);
    const s = await state(p); check('Une séance enregistrée pendant la lente synchro n\'est pas écrasée par la lecture arrivée après', s.local.includes('slow1') && s.stored.includes('slow1'), JSON.stringify(s));
    await p.waitForTimeout(9000); const s2 = await state(p); check('…puis elle part bien dans le cloud', s2.cloud.includes('slow1'), JSON.stringify(s2));
    await ctx.close(); }
  console.log('\n=== Données ajoutées depuis un autre appareil ===');
  { const { ctx, p } = await open(b, { online: true });
    await p.evaluate(() => { window.__net.cloud['users/u1/sessions/gym'] = [{ id: 'other', date: '2026-10-20', label: 'Autre téléphone', exercises: [] }, ...window.__net.cloud['users/u1/sessions/gym']]; sessionStorage.setItem('fakeCloud', JSON.stringify(window.__net.cloud)); });
    await p.reload(); await p.waitForFunction(() => { try { return currentApp === 'home'; } catch (e) { return false; } }); await p.waitForTimeout(800);
    const s = await state(p); check('En ligne : ce qui vient du cloud (autre appareil) arrive bien', s.local.includes('other') && s.stored.includes('other'), JSON.stringify(s));
    await ctx.close(); }
  console.log('\n=== Premier lancement sur un nouvel appareil, hors ligne ===');
  { const { ctx, p, openMs } = await open(b, { online: false, cache: false });
    check(`Pas de données sur l'appareil, hors ligne : l'app s'ouvre quand même vite (${openMs} ms)`, openMs < 6000, openMs);
    await ctx.close(); }
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
