// Chronos de la Séance en direct : chaque seconde s'affiche, une fois, sans en sauter (« 36 → 34 » en gainage).
// Les minuteries du navigateur sont rendues imprécises (comme sur téléphone : ±30 ms à chaque tic), et la phase
// démarre à un instant « mal tombé » (juste avant une seconde). Usage : node tools/tests/chrono_steps.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8836'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => {
    // Minuteries qui glissent : chaque intervalle / délai part avec un écart aléatoire.
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const st = window.setTimeout.bind(window), ct = window.clearTimeout.bind(window);
    window.setTimeout = (fn, d, ...a) => st(fn, Math.max(0, (d || 0) + Math.round((rnd() - 0.5) * 60)), ...a);
    const ivs = new Map(); let n = 1e6;
    window.setInterval = (fn, d) => { const id = ++n; const loop = () => ivs.set(id, st(() => { fn(); if (ivs.has(id)) loop(); }, d + Math.round((rnd() - 0.5) * 60))); loop(); return id; };
    window.clearInterval = (id) => { if (ivs.has(id)) { ct(ivs.get(id)); ivs.delete(id); } else ct(id); };
    window.clearTimeout = (id) => { if (ivs.has(id)) { ct(ivs.get(id)); ivs.delete(id); } else ct(id); };
    const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
  await p.evaluate(() => { currentUser = { uid: 'u' }; gainageExerciseConfigs = [{ id: 'g', name: 'Planche', rounds: 3, workSec: 20, restSec: 10 }]; window.playLiveBeep = () => {}; liveSession = null; liveStep = 'category'; currentApp = 'live'; render(); document.querySelector('[data-live-pick-plan=""]')?.click(); liveDraftType = 'cardio'; renderLiveStep(); document.querySelector('[data-live-cardio-category="gainage"]').click(); (liveDraftName = 'Planche', startOrResumeLiveExercise()); startLiveLoop(3, 20, 10);
    // Phase démarrée « juste avant » une seconde : le cas qui faisait sauter des chiffres.
    liveSession.setInProgressStartedAt = Date.now() - 960; ensureLiveRestTicking();
    window.__seen = []; const read = () => { const el = document.getElementById('live-rest-chrono'); const c = document.getElementById('live-chrono'); window.__seen.push([el ? el.textContent : '', c ? c.textContent : '']); }; window.__rd = setInterval.call(window, read, 0); // remplacé ci-dessous
  });
  // Lecture fine de l'affichage (toutes les 25 ms, minuterie native non perturbée via requestAnimationFrame).
  await p.evaluate(() => { clearInterval(window.__rd); window.__seen = []; const loop = () => { const el = document.getElementById('live-rest-chrono'); const c = document.getElementById('live-chrono'); window.__seen.push([el ? el.textContent : '', c ? c.textContent : '', performance.now()]); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  await p.waitForTimeout(17000);
  const seen = await p.evaluate(() => window.__seen);
  // Valeurs successives affichées, avec l'instant où l'observateur les a vues. Si l'observateur lui-même
  // a été suspendu plus de 0,9 s (machine de test surchargée), il a pu manquer une valeur : ce passage-là
  // n'est pas compté comme un saut de l'app.
  const seqT = (k) => { const out = []; let prevT = null; seen.forEach((x) => { if (!x[k]) return; if (!out.length || out[out.length - 1].v !== x[k]) out.push({ v: x[k], gap: prevT === null ? 0 : x[2] - prevT }); prevT = x[2]; }); return out; };
  const seq = (k) => seqT(k).map((o) => o.v);
  const blind = (k) => seqT(k).map((o) => o.gap > 900);
  const secs = (t) => { const [m, s] = t.split(':').map(Number); return m * 60 + s; };
  const band = seq(0).map(secs), head = seq(1).map(secs);
  const skips = (arr, dir, bl) => arr.slice(1).map((v, i) => [arr[i], v, bl ? bl[i + 1] : false]).filter(([a, v, b]) => !b && !((dir < 0 && (a - v === 1 || v > a)) || (dir > 0 && (v - a === 1 || v < a))));
  check(`Bandeau du gainage (décompte travail 20 s puis repos 10 s) : aucun chiffre sauté (${band.length} valeurs vues)`, band.length >= 15 && skips(band, -1, blind(0)).length === 0, JSON.stringify(skips(band, -1, blind(0))) + ' | ' + band.join(','));
  check(`Chrono de la séance (en haut) : aucune seconde sautée (${head.length} valeurs vues)`, head.length >= 15 && skips(head, 1, blind(1)).length === 0, JSON.stringify(skips(head, 1, blind(1))));
  check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune');
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
