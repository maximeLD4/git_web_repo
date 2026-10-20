// Détail d'une séance (Historique et Calendrier) : une ligne par série, dessinée selon le type d'exercice.
// Usage : node tools/tests/session_detail.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8817'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 414, height: 896 }, serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
  await p.evaluate(() => {
    currentUser = { uid: 'u' };
    gymExerciseConfigs = [
      { id: 'c1', name: 'Leg extension', category: 'jambes', baseWeights: [30, 35, 40, 45, 50, 55, 60], maxIncrement: 2.5 },
      { id: 'c2', name: 'Mollets', category: 'jambes', baseWeights: [40, 50, 60, 70, 80], maxIncrement: 0, unilateral: true, equipment: 'machine' },
      { id: 'c3', name: 'Squat', category: 'jambes', baseWeights: [80, 90, 100], maxIncrement: 0 },
      { id: 'c4', name: 'Élévations latérales', category: 'epaules', baseWeights: [8, 10], maxIncrement: 0 },
      { id: 'c5', name: 'Mollets assis', category: 'jambes', baseWeights: [16, 20, 24], maxIncrement: 0, unilateral: true, equipment: 'kettlebell' },
      { id: 'c6', name: 'Presse', category: 'jambes', baseWeights: [100, 120], maxIncrement: 0, equipment: 'nimportequoi' },
    ];
    sessions = [{ id: 's1', date: '2026-09-28', label: 'Jambes', exercises: [
      { id: 'e1', name: 'Leg extension', exType: 'muscu', category: 'jambes', sets: [
        { id: 'a', weight: 40, reps: 12, weightMode: 'off', restSec: 75 }, { id: 'b', weight: 42.5, reps: 12, weightMode: 'on' }, { id: 'c', weight: 52.5, reps: 10 } ] },
      { id: 'e2', name: 'Mollets', exType: 'muscu', category: 'jambes', sets: [
        { id: 'a', weight: 60, reps: 12, side: 'left' }, { id: 'b', weight: 60, reps: 12, side: 'right' }, { id: 'c', weight: 70, reps: 10, side: 'left' } ] },
      { id: 'e3', name: 'Tractions', exType: 'muscu', category: 'dos', sets: [{ id: 'a', weight: 0, reps: 8 }] },
      { id: 'e4', name: 'Rameur', exType: 'cardio', category: 'rameur', sets: [{ id: 'a', weight: 10, reps: 0 }, { id: 'b', weight: 5, reps: 1.2 }] },
      { id: 'e5', name: 'Planche', exType: 'cardio', category: 'gainage', sets: [], loop: { rounds: 6, workSec: 40, restSec: 15 } },
      { id: 'e6', name: 'Squat', exType: 'muscu', category: 'jambes', sets: [{ id: 'a', weight: 90, reps: 8 }] },
      { id: 'e7', name: 'Élévations latérales', exType: 'muscu', category: 'epaules', sets: [{ id: 'a', weight: 8, reps: 12 }] },
      { id: 'e8', name: 'Mollets assis', exType: 'muscu', category: 'jambes', sets: [{ id: 'a', weight: 20, reps: 12, side: 'right' }, { id: 'b', weight: 24, reps: 10 }] },
      { id: 'e9', name: 'Presse', exType: 'muscu', category: 'jambes', sets: [{ id: 'a', weight: 120, reps: 10 }] },
    ] }];
    currentApp = 'gym'; gymTopMode = 'session'; tab = 'history'; openHistoryIds = { s1: true }; render();
  }); await p.waitForTimeout(400);
  const ex = (i) => p.evaluate((i) => { const g = document.querySelectorAll('.history-body .gx-sets')[i]; return g ? [...g.querySelectorAll('.gx-row')].map((r) => ({ slats: r.querySelectorAll('.gx-slat').length, pin: [...r.querySelectorAll('.gx-slat')].findIndex((s) => s.classList.contains('pin')), plus: !!r.querySelector('.gx-slat.plus'), side: (r.querySelector('.gx-sides .on') || {}).textContent || '', big: r.querySelector('.gx-big').textContent, sub: (r.querySelector('.gx-sub') || {}).textContent || '', lane: (r.querySelector('.gx-lane-fill') || { style: {} }).style.width || '', label: r.querySelector('.gx-visual').getAttribute('aria-label') })) : null; }, i);
  console.log('=== Muscu : pile de la machine ===');
  const le = await ex(0);
  check('Une ligne par série', le && le.length === 3, le && le.length);
  check('Une plaque par palier de la config, broche sur le palier (40 → 3e)', le[0].slats === 7 && le[0].pin === 2, `${le[0].slats} plaques, broche ${le[0].pin}`);
  check('Chiffres : ×12 et 40kg', le[0].big === '×12' && le[0].sub === '40kg', `${le[0].big} / ${le[0].sub}`);
  check('Incrément (weightMode on) : broche sur le palier de base, petit poids posé', le[1].pin === 2 && le[1].plus && le[1].sub === '40 + 2,5kg', `${le[1].pin} ${le[1].plus} ${le[1].sub}`);
  check('Ancienne série sans weightMode : incrément déduit (52,5 = 50 + 2,5)', le[2].pin === 4 && le[2].plus, `${le[2].pin} ${le[2].plus}`);
  check('Aucune pastille de progression entre les séries', await p.evaluate(() => !document.querySelector('.gx-delta') && !/\+\d/.test([...document.querySelectorAll('.gx-figures')].map((f) => f.textContent.replace(/\d+(,\d+)? \+ \d/g, '')).join(' '))));
  check('Libellé accessible', /12 répétitions, machine à 40 kg/.test(le[0].label), le[0].label);
  console.log('\n=== Unilatéral ===');
  const mo = await ex(1);
  check('Côté travaillé affiché', mo[0].side === 'gauche' && mo[1].side === 'droite', `${mo[0].side} / ${mo[1].side}`);
  const tr = await ex(2);
  check('Poids du corps : pas de pile, texte à la place', tr[0].slats === 0 && /poids du corps/.test(tr[0].label), tr[0].label);
  console.log('\n=== Cardio et gainage ===');
  const ra = await ex(3);
  check('Couloir proportionnel à la durée (10 min plein, 5 min à moitié)', ra[0].lane === '100%' && ra[1].lane === '50%', `${ra[0].lane} / ${ra[1].lane}`);
  check('Durée en gros, distance seulement si saisie', ra[0].big === '10min' && ra[0].sub === '' && /1,2 km/.test(ra[1].sub), `${ra[0].big}|${ra[0].sub}|${ra[1].sub}`);
  const pl = await ex(4);
  check('Boucle de gainage : 6 tours, 40s / 15s', pl[0].big === '6 tours' && pl[0].sub === '40s / 15s');
  check('Frise : 6 temps de travail, 5 repos', await p.evaluate(() => { const g = document.querySelectorAll('.history-body .gx-sets')[4]; return g.querySelectorAll('.gx-loop-work').length === 6 && g.querySelectorAll('.gx-loop-rest').length === 5; }));
  console.log('\n=== Type de poids (Réglages > Exercices, déduit du nom par défaut) ===');
  const bar = await p.evaluate(() => { const g = document.querySelectorAll('.history-body .gx-sets')[5]; return [...g.querySelectorAll('.gx-barbell .gx-plate')].map((x) => x.className.replace('gx-plate ', '')); });
  check('Squat (jamais réglé) : barre, 90 kg = 25 + 10 de chaque côté', bar.join(',') === 'p10,p25,p25,p10', bar.join(','));
  const db = await p.evaluate(() => { const g = document.querySelectorAll('.history-body .gx-sets')[6]; return { n: g.querySelectorAll('.gx-dumbbell').length, sub: g.querySelector('.gx-sub').textContent }; });
  check('Élévations latérales (jamais réglé) : deux haltères, « 8kg chacun » (pas « 2 × 8kg », lu comme 16 kg)', db.n === 2 && db.sub === '8kg chacun', `${db.n} / ${db.sub}`);
  const sizes = await p.evaluate(() => [6, 8, 10, 20].map((kg) => { const d = document.createElement('div'); d.innerHTML = gxDumbbellHTML(kg); document.body.appendChild(d); const discs = d.querySelectorAll('.gx-db-disc'); const r = { discs: discs.length, h: Math.max(...[...discs].map((x) => x.getBoundingClientRect().height)), w: d.querySelector('.gx-dumbbell').getBoundingClientRect().width }; d.remove(); return r; }));
  check('Haltères : plus lourd = plus de disques (6 kg : 2/côté, 8 : 3, 10 : 4, 20 : 5 max)', sizes.map((x) => x.discs / 2).join(',') === '2,3,4,5', sizes.map((x) => x.discs / 2).join(','));
  check('…des disques plus hauts et un haltère plus long', sizes.every((x, i) => i === 0 || (x.h > sizes[i - 1].h && x.w > sizes[i - 1].w)), JSON.stringify(sizes));
  const kb = await p.evaluate(() => { const g = document.querySelectorAll('.history-body .gx-sets')[7]; const r = g.querySelectorAll('.gx-row'); return { uni: r[0].querySelectorAll('.gx-kb').length, ghost: r[0].querySelectorAll('.gx-ghost').length, on: r[0].querySelector('.gx-slot.on .gx-slot-label').textContent, color: r[0].querySelector('.gx-kb').className, both: r[1].querySelectorAll('.gx-kb').length, neutral: r[1].querySelector('.gx-kb').className, sub: r[1].querySelector('.gx-sub').textContent }; });
  check('Kettlebell unilatérale : une seule, côté droit, l\'autre main en pointillés', kb.uni === 1 && kb.ghost === 1 && kb.on === 'droite', JSON.stringify(kb));
  check('Kettlebell : couleur du poids (20 kg = celle du disque de 20), neutre sinon (24 kg), « 24kg chacune »', /p20/.test(kb.color) && /neutral/.test(kb.neutral) && kb.both === 2 && kb.sub === '24kg chacune', kb.sub);
  const pr = await p.evaluate(() => !!document.querySelectorAll('.history-body .gx-sets')[8].querySelector('.gx-stack'));
  check('Valeur inconnue (import) : ignorée, retour à la déduction (Presse → machine)', pr);
  const guesses = await p.evaluate(() => ['Squat', 'Développé couché', 'Développé haltères', 'Élévations latérales', 'Leg curl', 'Leg extension', 'Adducteurs', 'Mollets', 'Mollets machine', 'Hack squat', 'Kettlebell swing'].map((n) => n + '=' + guessGymEquipment(n)).join(' '));
  check('Déductions par défaut', guesses === 'Squat=barre Développé couché=barre Développé haltères=halteres Élévations latérales=halteres Leg curl=machine Leg extension=machine Adducteurs=machine Mollets=kettlebell Mollets machine=machine Hack squat=machine Kettlebell swing=kettlebell', guesses);
  check('Le repos entre les séries n\'est plus affiché', await p.evaluate(() => !document.querySelector('.history-body .history-set-rest')));
  check('Anciennes barres retirées', await p.evaluate(() => !document.querySelector('.set-bars-row') && typeof setBarsHTML === 'undefined'));
  console.log('\n=== Calendrier ===');
  await p.evaluate(() => { currentApp = 'calendar'; render(); sharedCalendarMonth = '2026-09'; sharedSelectedDate = '2026-09-28'; openSharedCalendarIds = { 'gym:s1': true }; renderSharedCalendarContent(); }); await p.waitForTimeout(400);
  const cal = await p.evaluate(() => { const g = document.querySelector('.gx-sets'); return g ? { rows: document.querySelectorAll('.gx-row').length, accent: g.style.getPropertyValue('--gx-accent').trim(), meta: ACTIVITY_META.find((a) => a.key === 'gym').color } : null; });
  check('Même affichage dans le calendrier', cal && cal.rows === 3 + 3 + 1 + 2 + 1 + 1 + 1 + 2 + 1, cal && cal.rows);
  check('…dans la couleur d\'activité du calendrier', cal && cal.accent === cal.meta, cal && `${cal.accent} / ${cal.meta}`);
  console.log('\n=== Réglages > Exercices : « Type de poids » ===');
  await p.evaluate(() => { currentApp = 'settings-gym'; render(); }); await p.waitForTimeout(300); await p.click('[data-edit-config="c3"]'); await p.waitForTimeout(350);
  const sel = () => p.evaluate(() => { const e = document.getElementById('config-equipment-select'); return [e.options[e.selectedIndex].textContent.trim()]; });
  check('Pas d\'option « Automatique » : 4 types dans le menu', await p.evaluate(() => { const o = [...document.querySelectorAll('#config-equipment-select option')]; return o.length === 4 && !o.some((b) => /auto/i.test(b.textContent)); }));
  check('Squat jamais réglé : « Barre » sélectionné d\'office', JSON.stringify(await sel()) === '["Barre"]', JSON.stringify(await sel()));
  await p.fill('#config-name-input', ''); await p.type('#config-name-input', 'Curl marteau'); check('La sélection suit la frappe (Curl marteau → Haltères)', JSON.stringify(await sel()) === '["Haltères"]', JSON.stringify(await sel()));
  await p.fill('#config-name-input', 'Squat'); await p.selectOption('#config-equipment-select', 'machine'); await p.waitForTimeout(250); check('Toucher Machine : le nom tapé est conservé, Machine sélectionné', (await p.inputValue('#config-name-input')) === 'Squat' && JSON.stringify(await sel()) === '["Machine"]');
  await p.fill('#config-name-input', ''); await p.type('#config-name-input', 'Élévations latérales'); check('…une fois touché, le choix ne suit plus le nom', JSON.stringify(await sel()) === '["Machine"]');
  await p.fill('#config-name-input', 'Squat');
  await p.click('#save-config-btn'); await p.waitForTimeout(300); check('…enregistré : equipment = machine', await p.evaluate(() => gymExerciseConfigs.find((c) => c.id === 'c3').equipment === 'machine'));
  check('…la liste l\'affiche', /Machine/.test(await p.evaluate(() => document.querySelector('[data-edit-config="c3"] .history-label').textContent)));
  await p.evaluate(() => { document.getElementById('add-config-btn').click(); }); await p.waitForTimeout(350);
  check('Nouvel exercice, nom vide : un type est quand même sélectionné (Machine)', JSON.stringify(await sel()) === '["Machine"]', JSON.stringify(await sel()));
  check('Nouvel exercice : AUCUNE catégorie par défaut (« Choisir… »), pas encore de suggestions', await p.evaluate(() => document.getElementById('config-category-select').value === '' && !document.getElementById('config-suggest-select')));
  await p.fill('#config-name-input', 'Test'); await p.fill('#config-new-base-weight', '20'); await p.click('#config-add-base-weight-btn'); await p.waitForTimeout(150); await p.click('#save-config-btn'); await p.waitForTimeout(200);
  check('Enregistrer sans catégorie : refusé, « Choisis une catégorie. »', /Choisis une catégorie/.test(await p.textContent('#config-form-error')) && await p.evaluate(() => !gymExerciseConfigs.some((c) => c.name === 'Test')));
  await p.fill('#config-name-input', ''); await p.selectOption('#config-category-select', 'pecs'); await p.waitForTimeout(250);
  check('Catégorie choisie : les suggestions de la catégorie apparaissent', await p.evaluate(() => !!document.getElementById('config-suggest-select')));
  await p.selectOption('#config-suggest-select', 'Développé haltères'); await p.waitForTimeout(150); check('Suggestion « Développé haltères » : Haltères sélectionné', JSON.stringify(await sel()) === '["Haltères"]', JSON.stringify(await sel()));
  check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune');
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
