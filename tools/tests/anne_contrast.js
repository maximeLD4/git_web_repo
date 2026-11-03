const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8837'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
const AUDIT = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map((x) => parseFloat(x)); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = (el) => { const chain = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) chain.push(c); if (c && c.a >= 1) break; } let col = { r: 255, g: 255, b: 255, a: 1 }; for (let i = chain.length - 1; i >= 0; i--) col = over(chain[i], col); return col; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const out = [];
  document.querySelectorAll('#app *').forEach((el) => {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (!own) return; const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
    let op = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
    const bg = bgOf(el); let fg = parse(cs.color); fg = over({ ...fg, a: fg.a * op }, bg);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700; const large = size >= 24 || (size >= 18.66 && bold);
    const cr = ratio(fg, bg); out.push({ t: own.slice(0, 28), cls: (el.className || '').toString().split(' ')[0], cr: Math.round(cr * 100) / 100, need: large ? 3 : 4.5 });
  });
  return out;
};
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
  await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  await p.goto(`http://localhost:${PORT}/${DIR}/index.html`); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
  const SCREENS = {
    accueil: () => { currentApp = 'home'; render(); },
    'salle-liste': () => { currentApp = 'gym'; tab = 'history'; gymTopMode = 'session'; openHistoryIds = { s1: true }; renderGymApp(); },
    'salle-form': () => { currentApp = 'gym'; tab = 'log'; draft = { kind: 'plan', date: todayISO(), label: 'Jambes', exercises: [{ id: 'e1', name: 'Squat', exType: 'muscu', category: 'jambes', restSec: 60, sets: [{ id: 'a', weight: 60, reps: 10 }, { id: 'b', weight: 70, reps: 8 }] }] }; gymTopMode = 'plan'; openExerciseIds = { e1: true }; renderGymApp(); },
    'reglage-exo': () => { currentApp = 'settings-gym'; gymSettingsFormOpen = false; gainageSettingsFormOpen = false; gymSettingsMode = 'muscu'; render(); document.querySelector('[data-edit-config="c"]').click(); },
    'reglage-liste': () => { currentApp = 'settings-gym'; gymSettingsFormOpen = false; render(); },
    'direct-serie': () => { liveSession = null; liveStep = 'category'; liveDraftType = 'muscu'; currentApp = 'live'; render(); document.querySelector('[data-live-pick-plan=""]')?.click(); document.querySelector('[data-live-category="jambes"]').click(); document.querySelector('[data-live-exercise="Squat"]').click(); },
    'direct-plan': () => { liveSession = null; liveStep = 'category'; currentApp = 'live'; render(); document.querySelector('[data-live-pick-plan="P"]').click(); },
    calendrier: () => { currentApp = 'calendar'; render(); },
    reglages: () => { currentApp = 'settings'; render(); },
  };
  const res = {};
  for (const m of ['day', 'night', 'anne']) {
    res[m] = {};
    for (const [name, fn] of Object.entries(SCREENS)) {
      await p.evaluate((m) => { applyShowHints(true); applyColorMode(m); currentUser = { uid: 'u' }; gymExerciseConfigs = [{ id: 'c', name: 'Squat', category: 'jambes', baseWeights: [60, 70], maxIncrement: 2.5 }]; sessions = [{ id: 's1', date: todayISO(), label: 'Jambes', exercises: [{ id: 'e', name: 'Squat', exType: 'muscu', category: 'jambes', sets: [{ id: 'a', weight: 60, reps: 10 }] }] }]; sessionPlans = [{ id: 'P', label: 'Jambes', exercises: [{ id: 'p1', name: 'Squat', exType: 'muscu', category: 'jambes', sets: [{ id: 'a', weight: 60, reps: 10 }] }] }]; }, m);
      await p.evaluate(`(${fn.toString()})()`); await p.waitForTimeout(250);
      res[m][name] = (await p.evaluate(AUDIT)).filter((x) => x.cr < x.need);
    }
  }
  const count = (m) => Object.values(res[m]).flat().length;
  console.log(`Textes sous le seuil WCAG — jour ${count('day')}, nuit ${count('night')}, Anne ${count('anne')}`);
  check('Mode Anne : pas plus de textes peu lisibles que le mode Jour (9 écrans)', count('anne') <= count('day'), `${count('anne')} / ${count('day')}`);
  // Textes à la couleur d'accent (retours, liens d'action, puce choisie, ajout) : au moins 4,5:1 en mode Anne.
  const ACCENT = ['back-btn-text', 'edit-link', 'add-exercise-btn', 'add-set-btn', 'gym-import-link', 'home-tile-sub-plain', 'live-plan-row-sum', 'history-label', 'header-sub', 'live-stepper-label'];
  const weak = Object.entries(res.anne).flatMap(([n, l]) => l.filter((x) => ACCENT.includes(x.cls)).map((x) => `${n}:${x.cls}:${x.cr}`));
  check('Mode Anne : retours, liens d\'action, sous-titres et étiquettes à 4,5:1 au moins', weak.length === 0, JSON.stringify(weak));
  const chips = Object.entries(res.anne).flatMap(([n, l]) => l.filter((x) => x.cls === 'ex-type-btn' && !['Pecs', 'Dos', 'Épaules', 'Bras', 'Fessiers', 'Abdos'].includes(x.t)).map((x) => `${n}:${x.t}:${x.cr}`));
  check('Mode Anne : puces de choix (hors catégories sans exercice, grisées exprès) au-dessus de 4:1', chips.every((c) => parseFloat(c.split(':').pop()) >= 4), JSON.stringify(chips));
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
