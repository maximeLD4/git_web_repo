// Réglages > Exercices : une seule grille (tout part du même bord) et un style de bouton par rôle,
// pour la liste et les deux formulaires (Muscu, Gainage). Usage : node tools/tests/settings_layout.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8822'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
(async () => { const b = await chromium.launch();
  for (const mode of ['day', 'night']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 1600 }, serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
    await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
    p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
    await p.evaluate((m) => { currentUser = { uid: 'u' }; applyColorMode(m); applyShowHints(m === 'night'); gymExerciseConfigs = [{ id: 'c3', name: 'Squat', category: 'jambes', baseWeights: [60, 70, 80], maxIncrement: 2.5 }, { id: 'c4', name: 'Leg curl', category: 'jambes', baseWeights: [20, 25] }]; gainageExerciseConfigs = [{ id: 'g', name: 'Planche', rounds: 6, workSec: 40, restSec: 15 }]; gymSettingsMode = 'muscu'; gymSettingsFormOpen = false; currentApp = 'settings-gym'; render(); }, mode);
    await p.waitForTimeout(250);
    console.log(`\n=== Mode ${mode === 'day' ? 'Jour, textes d\'aide masqués' : 'Nuit, textes d\'aide affichés'} ===`);
    const listEdges = await p.evaluate(() => { const c = document.getElementById('content'), x0 = c.getBoundingClientRect().left + parseFloat(getComputedStyle(c).paddingLeft); return [...c.querySelectorAll('.ex-type-toggle, .swipe-row')].map((e) => Math.round(e.getBoundingClientRect().left - x0)); });
    check('Liste : bascule, filtres et cartes partent du même bord', listEdges.every((x) => x === 0), JSON.stringify(listEdges));
    for (const [label, open, kind] of [['Muscu', () => document.querySelector('[data-edit-config="c3"]').click(), 'muscu'], ['Gainage', () => { gymSettingsFormOpen = false; gymSettingsMode = 'gainage'; renderGymSettingsContent(); document.querySelector('[data-edit-gainage-config="g"]').click(); }, 'gainage']]) {
      await p.evaluate(open); await p.waitForTimeout(300);
      const g = await p.evaluate(() => { const f = document.querySelector('.exercise-form'), r = f.getBoundingClientRect(), pad = parseFloat(getComputedStyle(f).paddingLeft), L = r.left + pad, R = r.right - pad, rd = (n) => Math.round(n);
        const lefts = [...f.querySelectorAll('.home-section-label, .field-hint, .exercise-form-actions > *')].filter((e) => e.offsetParent !== null).map((e) => rd(e.getBoundingClientRect().left - L))
          .concat([...f.querySelectorAll('.field-list-row')].map((e) => rd(e.firstElementChild.getBoundingClientRect().left - L)));
        const rights = [...f.querySelectorAll('.field-list-row:not(.weight-chip-row)')].map((e) => rd(R - e.lastElementChild.getBoundingClientRect().right)).concat([...f.querySelectorAll('.exercise-form-actions > *')].map((e) => rd(R - e.getBoundingClientRect().right)));
        const primary = f.querySelectorAll('.save-btn').length, secondary = [...f.querySelectorAll('.secondary-btn')].map((e) => e.id);
        const menus = [...f.querySelectorAll('select')].map((e) => e.id + ':' + e.className), chipH = new Set([...f.querySelectorAll('.ex-type-btn, .weight-chip')].map((e) => rd(e.getBoundingClientRect().height)));
        const save = getComputedStyle(f.querySelector('.save-btn')), cancel = getComputedStyle(f.querySelector('.secondary-btn[id^="cancel"]'));
        return { pad, lefts, rights, primary, secondary, menus, chipH: [...chipH], filled: save.backgroundColor, outlined: cancel.backgroundColor, cancelBorder: cancel.borderTopWidth, cancelColor: cancel.color, textColor: getComputedStyle(document.body).color }; });
      check(`${label} : titres, puces, lignes, aides et boutons partent du même bord (${g.pad}px)`, g.lefts.every((x) => x === 0), JSON.stringify(g.lefts));
      check(`${label} : les réglages de droite s'alignent sur le même bord droit`, g.rights.every((x) => x === 0), JSON.stringify(g.rights));
      check(`${label} : UNE action principale (Enregistrer, pleine)`, g.primary === 1 && g.filled !== 'rgba(0, 0, 0, 0)');
      check(`${label} : Annuler en action secondaire (contour, texte lisible)`, g.secondary.includes(kind === 'muscu' ? 'cancel-config-btn' : 'cancel-gainage-config-btn') && g.outlined === 'rgba(0, 0, 0, 0)' && g.cancelBorder === '1px' && g.cancelColor === g.textColor, `${g.cancelColor} / ${g.textColor}`);
      if (kind === 'muscu') check('Muscu : « Ajouter » (un poids) en action secondaire, plus en bouton plein', g.secondary.includes('config-add-base-weight-btn'));
      check(`${label} : suggestions${kind === 'muscu' ? ', catégorie et type de poids' : ''} en menus en bout de ligne, comme « Alterner avec »`, (kind === 'muscu' ? ['config-suggest-select', 'config-category-select', 'config-equipment-select', 'config-paired-exercise-select'] : ['gainage-suggest-select']).every((id) => g.menus.some((m) => m.startsWith(id + ':') && m.includes('app-select-row'))), JSON.stringify(g.menus));
      check(`${label} : chaque section = un titre puis des lignes « libellé | réglage » (plus de rangées de puces de choix)`, await p.evaluate(() => !document.querySelector('.exercise-form .ex-type-toggle, .exercise-form .suggest-chip')));
      if (kind === 'muscu') check(`${label} : les poids saisis, seules puces restantes, à la même hauteur`, g.chipH.length === 1, JSON.stringify(g.chipH));
    }
    await p.click('[data-gainage-loop-work-plus]'); await p.waitForTimeout(150);
    check('Gainage : les − / + de la boucle marchent toujours (40 → 45 s)', await p.evaluate(() => gainageSettingsFormDraft.workSec === 45 && /45 s/.test(document.querySelector('.exercise-form').textContent)));
    check('Gainage : la planche remplace le chronomètre (bascule et liste)', await p.evaluate(() => { gainageSettingsFormOpen = false; renderGymSettingsContent(); return !!document.querySelector('[data-gym-settings-mode="gainage"] svg[data-anim-icon="plank"]') && !!document.querySelector('.history-row-icon svg[data-anim-icon="plank"]'); }));
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close();
  }
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
