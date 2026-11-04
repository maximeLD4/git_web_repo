// Réglages > exercice, « Poids possibles » (3.9.0) : trois niveaux distincts — poids déjà saisis, LE champ où
// l'on tape (encadré, « kg » dedans, « Ajouter » plein collé à droite), l'autre façon (« ou » + Scanner, en
// secondaire) —, dans les 4 apparences. Et en Mono : un seul gros bouton blanc par écran du direct, menus sombres.
// Usage : node tools/tests/weights_entry.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8841'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' })).newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
  const LUM = `const parse = (c) => (c.match(/[\\d.]+/g) || []).map(Number); const lum = (c) => { const [r, g, b] = parse(c); return [r, g, b].map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }).reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0); }; const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };`;
  for (const mode of ['day', 'night', 'anne', 'mono']) {
    console.log(`\n=== ${mode} ===`);
    await p.evaluate((m) => { applyShowHints(false); applyColorMode(m); currentUser = { uid: 'u' }; gymExerciseConfigs = [{ id: 'c', name: 'Leg extension', category: 'jambes', baseWeights: [] }]; gymSettingsFormOpen = false; gainageSettingsFormOpen = false; gymSettingsMode = 'muscu'; currentApp = 'settings-gym'; render(); document.querySelector('[data-edit-config="c"]').click(); }, mode);
    await p.waitForTimeout(200);
    const s = await p.evaluate(new Function(`${LUM} const blk = document.querySelector('.weights-block'); const kids = [...blk.children].map((e) => e.className.split(' ').find((c) => /^weights-|weight-chip-row|secondary-btn/.test(c)) || e.className);
      const field = document.querySelector('.input-group-field'), fcs = getComputedStyle(field), card = getComputedStyle(document.querySelector('.exercise-form')).backgroundColor;
      const btn = document.getElementById('config-add-base-weight-btn'), bcs = getComputedStyle(btn), scan = getComputedStyle(document.getElementById('config-scan-weights-btn'));
      const fr = field.getBoundingClientRect(), br = btn.getBoundingClientRect();
      return { order: kids.join(' > '), empty: !!document.querySelector('.weights-empty'), suffix: field.querySelector('.input-group-suffix').textContent, label: document.querySelector('.weights-add-label').textContent,
        border: Math.round(cr(fcs.borderTopColor, card) * 10) / 10, borderW: fcs.borderTopWidth, btnFill: Math.round(cr(bcs.backgroundColor, card) * 10) / 10, btnText: Math.round(cr(bcs.color, bcs.backgroundColor) * 10) / 10,
        side: Math.abs(fr.top - br.top) < 2 && br.left > fr.right, scanBg: scan.backgroundColor, or: !!document.querySelector('.weights-or') };`));
    check('Ordre : poids saisis > champ > « ou » > Scanner', /weight-chip-row.* > weights-add > weights-or > .*secondary-btn/.test(s.order), s.order);
    check('Rien de saisi : un message dit quoi faire (pas une ligne grise anonyme)', s.empty);
    check('Le champ se voit : encadré (contour net sur la carte), « kg » dedans, intitulé « Ajouter un poids »', s.border >= 1.5 && parseFloat(s.borderW) >= 1 && s.suffix === 'kg' && /Ajouter un poids/i.test(s.label), JSON.stringify({ border: s.border, w: s.borderW }));
    check('« Ajouter » plein, collé à droite du champ, texte lisible', s.side && s.btnFill >= 1.5 && s.btnText >= 4.5, JSON.stringify({ fill: s.btnFill, text: s.btnText }));
    check('« Scanner » en secondaire (pas plein), sous un « ou »', s.or && /rgba\(0, 0, 0, 0\)|transparent/.test(s.scanBg), s.scanBg);
    await p.fill('#config-new-base-weight', '42,5'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    await p.fill('#config-new-base-weight', '50'); await p.click('#config-add-base-weight-btn'); await p.waitForTimeout(150);
    check('Saisir puis Entrée ou « Ajouter » : les poids s\'ajoutent en pastilles, le message vide disparaît', await p.evaluate(() => gymSettingsFormDraft.baseWeights.join(',') === '42.5,50' && !document.querySelector('.weights-empty') && document.querySelectorAll('#config-base-weights-row .weight-chip').length === 2), await p.evaluate(() => gymSettingsFormDraft.baseWeights.join(',')));
  }
  console.log('\n=== Mono : hiérarchie en Séance en direct ===');
  await p.evaluate(() => { applyColorMode('mono'); gymExerciseConfigs = [{ id: 'c', name: 'Squat', category: 'jambes', baseWeights: [60, 70], unilateral: true }]; liveSession = null; liveStep = 'category'; liveDraftType = 'muscu'; currentApp = 'live'; render(); document.querySelector('[data-live-pick-plan=""]')?.click(); document.querySelector('[data-live-category="jambes"]').click(); document.querySelector('[data-live-exercise="Squat"]').click(); });
  await p.waitForTimeout(200);
  const big = await p.evaluate(new Function(`${LUM} return [...document.querySelectorAll('#live-content button, #live-content select')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 250 && r.height >= 40; }).map((e) => ({ t: e.textContent.trim().slice(0, 18), light: lum(getComputedStyle(e).backgroundColor) > 0.6 }));`));
  const lightBig = big.filter((x) => x.light).map((x) => x.t);
  check('Un seul grand bouton blanc : « Lancer » (le menu des poids n\'est plus un 2e aplat blanc)', lightBig.length === 1 && /Lancer/.test(lightBig[0]), JSON.stringify(big));
  check('Menu des poids : sombre, contour clair, texte et chevron clairs', await p.evaluate(new Function(`${LUM} const s = getComputedStyle(document.querySelector('select')); return lum(s.backgroundColor) < 0.05 && lum(s.color) > 0.8 && /inset/.test(s.boxShadow);`)));
  check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune');
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
