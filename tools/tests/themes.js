// Apparences : une source unique (js/00-themes.js). Vérifie le contrat (chaque apparence définit tout), la
// lisibilité des paires fond / texte, qu'aucune apparence n'est écrite ailleurs (feuille de styles, scripts),
// et qu'une apparence ajoutée au registre apparaît et s'applique partout sans rien toucher d'autre.
// Usage : node tools/tests/themes.js <dossier> [port]
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8840'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
const ROOT = path.resolve(__dirname, '..', '..');
(async () => {
  console.log('=== Rien n\'est écrit ailleurs que dans le registre ===');
  const css = fs.readFileSync(path.join(ROOT, 'css/styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const modeSel = (css.match(/html\.mode-[a-z]+/g) || []);
  check('Feuille de styles : aucune règle « html.mode-xxx » (aucune apparence nommée)', modeSel.length === 0, modeSel.slice(0, 5).join(', '));
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const hexRules = rules.filter(([, sel, body]) => /#[0-9A-Fa-f]{3,8}\b/.test(body) && !/\.gx-(plate|kb)/.test(sel)).map(([, sel]) => sel.trim().slice(0, 50));
  check('Feuille de styles : aucune couleur écrite en dur (sauf les couleurs officielles des disques, une donnée)', hexRules.length === 0, hexRules.join(' | '));
  const themeVarsInCss = [...css.matchAll(/:root\s*\{([^}]*)\}/g)].flatMap((m) => [...m[1].matchAll(/--([\w-]+):/g)].map((x) => x[1]));
  const reg = fs.readFileSync(path.join(ROOT, 'js/00-themes.js'), 'utf8');
  const contract = [...reg.slice(reg.indexOf('const THEME_TOKENS'), reg.indexOf('};', reg.indexOf('const THEME_TOKENS'))).matchAll(/^\s*"?([\w-]+)"?:/gm)].map((m) => m[1]);
  const dup = themeVarsInCss.filter((v) => contract.includes(v));
  check('Aucune variable du contrat n\'est aussi définie dans la feuille de styles', dup.length === 0, dup.join(', '));
  const jsFiles = fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js') && f !== '00-themes.js');
  const leaks = [];
  jsFiles.forEach((f) => { const src = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    (src.match(/["'`](day|night|anne|mono)["'`]|mode-(day|night|anne|mono)/g) || []).forEach((m) => leaks.push(f + ':' + m));
    (src.match(/[:\s(]#[0-9A-Fa-f]{6}\b|[:\s(]#[0-9A-Fa-f]{3}\b/g) || []).filter((m) => !/#000\b/.test(m)).forEach((m) => leaks.push(f + ':' + m.trim())); });
  check('Scripts : aucune apparence nommée ni couleur écrite en dur hors du registre', leaks.length === 0, leaks.slice(0, 8).join(', '));

  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });

  console.log('\n=== Le contrat ===');
  const contr = await p.evaluate(() => THEME_ORDER.map((id) => { const t = THEMES[id]; const miss = Object.keys(THEME_TOKENS).filter((k) => !(k in t.tokens)); const extra = Object.keys(t.tokens).filter((k) => !(k in THEME_TOKENS)); const meta = ['label', 'icon', 'swatch', 'statusBar', 'presets', 'screens', 'activity'].filter((k) => !t[k]); const presets = Object.entries(THEME_PRESETS).filter(([k, v]) => !v.includes(t.presets[k])).map(([k]) => k); const screens = 12 - Object.keys(t.screens || {}).length; const act = ['gym', 'run', 'swim', 'bike', 'gainage'].filter((k) => !(t.activity || {})[k]); return { id, miss, extra, meta, presets, screens, act, icon: !!ICONS[t.icon] }; }));
  contr.forEach((c) => check(`${c.id} : toutes les variables (${Object.keys(contr).length ? '' : ''}contrat complet), nom, aperçu, barre d'état, préréglages valides, 12 écrans, 5 sports`, !c.miss.length && !c.extra.length && !c.meta.length && !c.presets.length && c.screens === 0 && !c.act.length && c.icon, JSON.stringify(c)));

  console.log('\n=== Lisibilité des paires fond / texte (valeurs réellement appliquées) ===');
  for (const id of await p.evaluate(() => THEME_ORDER)) {
    const res = await p.evaluate((id) => { applyColorMode(id); const probe = document.createElement('div'); document.body.appendChild(probe); const col = (v) => { probe.style.color = `var(--${v})`; return getComputedStyle(probe).color; }; const parse = (c) => c.match(/[\d.]+/g).map(Number); const lum = ([r, g, b]) => [r, g, b].map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }).reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0); const bgOf = () => parse(col('bg'));
      const out = THEME_CONTRAST_PAIRS.map(([fg, bg, min]) => { let f = parse(col(fg)), g = parse(col(bg)); if (f.length > 3 && f[3] < 1) { const B = bgOf(); f = f.slice(0, 3).map((v, i) => v * f[3] + B[i] * (1 - f[3])); } const a = lum(f), c = lum(g); const r = (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05); return { pair: `${fg}/${bg}`, r: Math.round(r * 10) / 10, min }; });
      const y = (() => { const a = lum(parse(col('on-yellow'))), c = lum(parse(col('yellow'))); return Math.round(((Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05)) * 10) / 10; })();
      probe.remove(); return { out, y }; }, id);
    const weak = res.out.filter((x) => x.r < x.min);
    check(`${id} : ${res.out.length} paires lisibles (${res.out.map((x) => x.r).join(' · ')})`, weak.length === 0, JSON.stringify(weak));
  }

  console.log('\n=== Application ===');
  const early = await p.evaluate(() => { const st = document.getElementById('theme-tokens'), link = document.querySelector('link[rel="stylesheet"][href*="styles.css"]'); return !!st && st.parentNode === document.head && !!(st.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING) && st.textContent.includes('html.mode-mono'); });
  check('Feuille des apparences générée dans <head>, avant la feuille de styles (pas d\'éclair d\'une autre apparence)', early);
  const cls = await p.evaluate(() => THEME_ORDER.map((id) => { applyColorMode(id); const c = document.documentElement.className; return id + ':' + ['type-', 'texture-', 'motion-'].map((k) => (c.match(new RegExp(k + '[a-z]+')) || ['?'])[0]).join(',') + ':' + document.getElementById('theme-color-meta').content; }));
  check('Chaque apparence pose sa classe, ses préréglages et sa barre d\'état ; aucune trace de la précédente', cls.join(' ') === 'day:type-athletic,texture-none,motion-rich:#F3ECE4 night:type-classic,texture-none,motion-calm:#1E1A17 anne:type-classic,texture-none,motion-calm:#FCE3EC mono:type-athletic,texture-gym,motion-rich:#0A0A0A', cls.join(' '));
  const persisted = await p.evaluate(() => { localStorage.setItem('gymlog:color-mode', JSON.stringify('night')); return true; });
  await p.reload(); await p.waitForFunction(() => { try { return typeof render === 'function'; } catch (e) { return false; } });
  check('Apparence enregistrée appliquée dès le chargement (avant les scripts de l\'app)', persisted && await p.evaluate(() => document.documentElement.classList.contains('mode-night') && getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() === '#1E1A17'));

  console.log('\n=== Ajouter une apparence = une entrée au registre ===');
  await p.evaluate(() => { currentUser = { uid: 'u' }; const base = JSON.parse(JSON.stringify(THEMES.day)); THEMES.test = { ...base, label: 'Essai', hint: 'Essai : apparence de test.', swatch: { bg: '#123456', fg: '#FFFFFF' }, statusBar: '#123456', tokens: { ...base.tokens, bg: '#123456', surface: '#1B4A73', text: '#FFFFFF', ink: '#FFFFFF', 'ink-rgb': '255,255,255', 'on-ink': '#123456', action: '#FFFFFF' } }; THEME_ORDER.push('test'); injectThemesCSS(); currentApp = 'settings-appearance'; render(); });
  check('Elle apparaît dans Réglages > Apparence, avec son nom et sa phrase', await p.evaluate(() => /Essai/.test(document.querySelector('[data-color-mode="test"]').textContent) && /Essai : apparence de test/.test(document.querySelector('.field-hint').textContent)));
  await p.click('[data-color-mode="test"]'); await p.waitForTimeout(200);
  check('La choisir l\'applique partout : fond, barre d\'état, nom affiché dans Réglages', await p.evaluate(() => getComputedStyle(document.getElementById('app')).getPropertyValue('--bg').trim() === '#123456' && document.getElementById('theme-color-meta').content === '#123456' && (currentApp = 'settings', render(), /Essai/.test(document.querySelector('[data-open-settings="appearance"]').textContent))));
  check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune');
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
