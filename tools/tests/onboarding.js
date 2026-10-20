// Guide de première utilisation : parcours complet (exercice → plan → lancement) en ne touchant QUE ce qui est
// éclairé ; tout le reste bloqué ; une seule fois ; pas pour un compte qui a déjà des données ; « Quitter » ;
// relance depuis Réglages. Usage : node tools/tests/onboarding.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8828'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
async function open(b, { seed } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript((seed) => { const noop = () => {}; const mk = (path) => ({ once: () => Promise.resolve({ val: () => (seed && path === 'gymExerciseConfigs' ? [{ id: 'x', name: 'Presse', category: 'jambes', baseWeights: [50] }] : null), exists: () => !!seed && path === 'gymExerciseConfigs' }), set: () => Promise.resolve(), update: () => Promise.resolve(), on: noop, off: noop, child: (c) => mk(c) }); const ref = mk('');
    const o = { onAuthStateChanged: (cb) => setTimeout(() => cb({ uid: 'u1', email: 'a@b.c' }), 30), signOut: noop, setPersistence: () => Promise.resolve() }; const a = () => o; a.Auth = { Persistence: { LOCAL: 'local' } };
    window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ref }) };
    if (seed && !localStorage.getItem('gymlog:last-uid')) { localStorage.setItem('gymlog:last-uid', JSON.stringify('u1')); localStorage.setItem('gymlog:gym-exercise-configs', JSON.stringify([{ id: 'x', name: 'Presse', category: 'jambes', baseWeights: [50] }])); } }, seed);
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(3800);
  return { ctx, p };
}
const bubble = (p) => p.evaluate(() => { const b = document.querySelector('.onb-bubble'); return b ? { part: b.querySelector('.onb-part').textContent, text: b.querySelector('.onb-text').textContent, next: b.querySelector('.onb-next').hidden ? null : b.querySelector('.onb-next').textContent, disabled: b.querySelector('.onb-next').disabled, prev: !b.querySelector('.onb-prev').hidden } : null; });
const next = async (p) => { await p.click('.onb-next'); await p.waitForTimeout(250); };
// Le point au centre de l'élément est-il bien l'élément (et pas une bande de blocage) ?
const touchable = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return 'absent'; const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e === hit || e.contains(hit) ? 'oui' : (hit && hit.className) || 'rien'; }, sel);
(async () => { const b = await chromium.launch();
  { const { ctx, p } = await open(b);
    console.log('=== Compte neuf : le guide démarre ===');
    let s = await bubble(p);
    check('Bulle d\'accueil, partie 1/3, bouton « C\'est parti », pas de « Précédent » à la première étape', s && /Bienvenue/.test(s.text) && /1\/3/.test(s.part) && s.next === "C'est parti" && !s.prev, JSON.stringify(s));
    check('Tout est bloqué : la tuile Salle de sport ne répond pas', (await touchable(p, '[data-open-app="gym"]')) !== 'oui', await touchable(p, '[data-open-app="gym"]'));
    await next(p);
    check('Étape Réglages : seul « Réglages » est touchable', (await touchable(p, '[data-open-app="settings"]')) === 'oui' && (await touchable(p, '[data-open-app="gym"]')) !== 'oui');
    s = await bubble(p); check('Étape « action » : « Précédent » ET « Suivant » visibles, « Suivant » grisé (c\'est l\'action qui fait avancer)', s.prev && s.next === 'Suivant' && s.disabled, JSON.stringify(s));
    await p.click('.onb-prev'); await p.waitForTimeout(200); s = await bubble(p);
    check('« Précédent » : retour à l\'étape d\'avant (Bienvenue)', /Bienvenue/.test(s.text), JSON.stringify(s));
    await next(p); s = await bubble(p); check('…et « C\'est parti » ramène à l\'étape Réglages', /Réglages/.test(s.text));
    await p.click('[data-open-app="settings"]'); await p.waitForTimeout(300);
    await p.click('[data-open-settings="gym"]'); await p.waitForTimeout(300);
    await p.click('#add-config-btn'); await p.waitForTimeout(400);
    s = await bubble(p); check('Formulaire : le nom d\'abord, « Suivant » grisé tant qu\'il est vide', /nom/.test(s.text) && s.disabled, JSON.stringify(s));
    check('…pendant ce temps, « Enregistrer » est bloqué', (await touchable(p, '#save-config-btn')) !== 'oui');
    await p.fill('#config-name-input', 'Leg extension'); await p.waitForTimeout(150);
    await p.click('.onb-prev'); await p.waitForTimeout(250); s = await bubble(p);
    check('« Précédent » depuis le nom : étape « Ajouter un exercice » revisitée, « Suivant » actif (action déjà faite), formulaire intact', /Ajouter un exercice/.test(s.text) && !s.disabled && await p.evaluate(() => document.getElementById('config-name-input').value === 'Leg extension'), JSON.stringify(s));
    await next(p); s = await bubble(p); check('« Suivant » : de retour au nom, saisie conservée', /nom/.test(s.text) && !s.disabled, JSON.stringify(s));
    await next(p);
    const seen = [];
    for (let i = 0; i < 8; i++) { s = await bubble(p); if (!s || !s.next || /Enregistrer/.test(s.text)) break; seen.push(s.text.slice(0, 22));
      if (/catégorie \(obligatoire\)/.test(s.text)) { check('Catégorie : rien par défaut (« Choisir… »), « Suivant » grisé tant qu\'elle n\'est pas choisie', s.disabled && await p.evaluate(() => document.getElementById('config-category-select').value === ''), JSON.stringify(s)); await p.selectOption('#config-category-select', 'jambes'); await p.waitForTimeout(250); }
      if (/poids possibles/i.test(s.text)) { check('Poids possibles : « Suivant » grisé sans palier', s.disabled); await p.fill('#config-new-base-weight', '40'); await p.click('#config-add-base-weight-btn'); await p.waitForTimeout(200); await p.fill('#config-new-base-weight', '45'); await p.click('#config-add-base-weight-btn'); await p.waitForTimeout(200); }
      await next(p); }
    check('Chaque option présentée : catégorie, suggestions, type de poids, poids, incréments, options avancées', seen.length >= 6 && /Astuce/.test(seen.join('|')) && /catégorie/.test(seen.join('|')) && /type de poids/i.test(seen.join('|')) && /Incrément auto/.test(seen.join('|')) && /Travail unilatéral/.test(seen.join('|')), JSON.stringify(seen));
    check('« Enregistrer » maintenant touchable', (await touchable(p, '#save-config-btn')) === 'oui');
    await p.click('#save-config-btn'); await p.waitForTimeout(500);
    s = await bubble(p); check('Exercice enregistré → partie 2/3', /2\/3/.test(s.part) && /Leg extension/.test(s.text) && await p.evaluate(() => gymExerciseConfigs.length === 1), JSON.stringify(s));
    console.log('\n=== Partie 2 : le plan ===');
    await next(p); await p.click('[data-open-app="gym"]'); await p.waitForTimeout(400);
    await p.click('[data-gym-top-mode="plan"]'); await p.waitForTimeout(400);
    s = await bubble(p); check('Nom du plan demandé', /nom à ton plan/.test(s.text) && s.disabled);
    await p.fill('#log-label', 'Jambes'); await p.waitForTimeout(150); await next(p);
    await p.click('#add-exercise-btn'); await p.waitForTimeout(400);
    s = await bubble(p); check('D\'abord « Muscu »', /Muscu/.test(s.text) && (await touchable(p, '.exercise-card:last-of-type [data-set-type="muscu"]')) === 'oui', JSON.stringify(s));
    await p.evaluate(() => [...document.querySelectorAll('.exercise-card')].pop().querySelector('[data-set-type="muscu"]').click()); await p.waitForTimeout(400);
    s = await bubble(p); check('Choisir la catégorie puis l\'exercice', /catégorie/.test(s.text));
    await p.evaluate(() => { const c = [...document.querySelectorAll('.exercise-card')].pop(); c.querySelector('[data-category-btn]:not(.needs-setup-btn)') && c.querySelector('[data-category-btn]:not(.needs-setup-btn)').click(); }); await p.waitForTimeout(300);
    await p.evaluate(() => { const c = [...document.querySelectorAll('.exercise-card')].pop(); const sel = c.querySelector('select.ex-name-input'); sel.value = 'Leg extension'; sel.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(400);
    s = await bubble(p); check('Séries présentées (répétitions, poids)', /série/.test(s.text) && s.next === 'Suivant', JSON.stringify(s)); await next(p);
    await p.click('.exercise-card:last-of-type [data-add-set]').catch(async () => { await p.evaluate(() => [...document.querySelectorAll('[data-add-set]')].pop().click()); }); await p.waitForTimeout(400);
    s = await bubble(p); check('Repos entre les séries : « Suivant » grisé tant qu\'il n\'est pas réglé', /repos entre les séries/i.test(s.text) && s.disabled, JSON.stringify(s));
    for (let i = 0; i < 4; i++) await p.evaluate(() => [...document.querySelectorAll('[data-plan-rest-plus]')].pop().click());
    await p.waitForTimeout(150); await next(p);
    s = await bubble(p); check('Repos propre à un écart présenté', /repos différent/.test(s.text)); await next(p);
    check('« Enregistrer le plan » touchable', (await touchable(p, '#save-session-btn')) === 'oui');
    await p.click('#save-session-btn'); await p.waitForTimeout(1500);
    s = await bubble(p); check('Plan enregistré → partie 3/3', /3\/3/.test(s.part) && await p.evaluate(() => sessionPlans.length === 1 && sessionPlans[0].exercises[0].restSec === 60), JSON.stringify(s));
    console.log('\n=== Partie 3 : lancer ===');
    await next(p); await p.click('[data-open-app="live"]'); await p.waitForTimeout(500);
    s = await bubble(p); check('Choisir le plan', /plan/.test(s.text), JSON.stringify(s));
    await p.evaluate(() => document.querySelector('[data-live-pick-plan]:not([data-live-pick-plan=""])').click()).catch(() => {}); await p.waitForTimeout(400);
    s = await bubble(p);
    if (/exercice/.test(s.text)) { await p.evaluate(() => document.querySelector('[data-live-plan-exercise]').click()); await p.waitForTimeout(400); }
    s = await bubble(p); check('Lancer la première série', /Lance ta première série/.test(s.text) && (await touchable(p, '[data-live-start-set]')) === 'oui', JSON.stringify(s));
    await p.click('[data-live-start-set]'); await p.waitForTimeout(400);
    s = await bubble(p); check('« Finir la série » demandé, seul touchable', /Finir la série/.test(s.text) && (await touchable(p, '[data-live-finish-set]')) === 'oui' && (await touchable(p, '[data-live-stop]')) !== 'oui', JSON.stringify(s));
    await p.click('[data-live-finish-set]'); await p.waitForTimeout(400); { const v = await p.$('[data-live-validate]'); if (v) { await v.click(); await p.waitForTimeout(300); } }
    s = await bubble(p); check('Le repos qui se décompte est présenté', /repos/i.test(s.text) && s.next === 'Suivant' && await p.evaluate(() => !!liveSession.restStartedAt && liveSession.plannedRestSec === 60), JSON.stringify(s)); await next(p);
    s = await bubble(p); check('« Terminer » la séance', /Terminer/.test(s.text) && (await touchable(p, '[data-live-stop]')) === 'oui');
    await p.click('[data-live-stop]'); await p.waitForTimeout(400);
    s = await bubble(p); check('Dans « Terminer l\'entraînement ? » : seul « Enregistrer la séance » est touchable', /Enregistre ta séance/.test(s.text) && (await touchable(p, '[data-end-save]')) === 'oui' && (await touchable(p, '[data-end-discard]')) !== 'oui' && (await touchable(p, '[data-end-continue]')) !== 'oui', JSON.stringify(s));
    await p.click('[data-end-save]'); await p.waitForTimeout(2200);
    s = await bubble(p); check('Séance enregistrée et affichée : la carte ouverte dans les séances, bouton « Terminer »', s && s.next === 'Terminer' && /La voici/.test(s.text) && await p.evaluate(() => sessions.length === 1 && currentApp === 'gym' && tab === 'history' && !!document.querySelector('.history-card .history-body')), JSON.stringify(s));
    check('…la carte est éclairée (exercice et séries visibles)', await p.evaluate(() => { const c = document.querySelector('.history-card'); const sp = document.querySelector('.onb-spot').getBoundingClientRect(), r = c.getBoundingClientRect(); return sp.top <= r.top + 8 && /Leg extension/.test(c.textContent); }));
    await next(p);
    check('Guide terminé : plus de voile, tout est libre', await p.evaluate(() => !document.getElementById('onb-root') && JSON.parse(localStorage.getItem('gymlog:onboarding')).done === true) && (await touchable(p, '[data-open-app="home"], .back-btn-text, [data-tab="log"]')) === 'oui');
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune');
    console.log('\n=== Une seule fois ===');
    await p.reload(); await p.waitForTimeout(3800);
    check('Au relancement : pas de guide', await p.evaluate(() => !document.getElementById('onb-root')));
    console.log('\n=== Relance depuis Réglages > Apparence ===');
    await p.evaluate(() => { liveSession = null; currentApp = 'settings-appearance'; render(); }); await p.click('#restart-onboarding-btn'); await p.waitForTimeout(400);
    s = await bubble(p); check('« Revoir » relance le guide depuis le début', s && /Bienvenue/.test(s.text));
    await p.evaluate(() => { onb.step = ONB_STEPS.findIndex((x) => x.target === '#add-config-btn'); onbStepStartedFor = -1; currentApp = 'home'; render(); }); await p.waitForTimeout(3200);
    s = await bubble(p); check('Garde-fou : élément introuvable → « Suivant » s\'active (le guide ne bloque jamais)', s && s.next === 'Suivant' && !s.disabled, JSON.stringify(s));
    const stepBefore = await p.evaluate(() => onb.step); await next(p);
    check('…et fait passer à l\'étape suivante', await p.evaluate((b) => onb.step > b, stepBefore));
    await p.click('.onb-quit'); await p.waitForTimeout(200);
    s = await bubble(p); check('« Quitter le guide » demande confirmation dans la bulle (« Rester » / « Quitter »)', /Quitter le guide \?/.test(s.text) && s.next === 'Quitter' && await p.evaluate(() => document.querySelector('.onb-quit').textContent === 'Rester'));
    await p.click('.onb-quit'); await p.waitForTimeout(200); s = await bubble(p);
    check('« Rester » : le guide continue', !!s && !/Quitter le guide \?/.test(s.text));
    await p.click('.onb-quit'); await p.waitForTimeout(200); await p.click('.onb-next'); await p.waitForTimeout(200);
    check('« Quitter le guide » (après confirmation) : libre, et marqué comme fait', await p.evaluate(() => !document.getElementById('onb-root') && JSON.parse(localStorage.getItem('gymlog:onboarding')).done === true));
    await ctx.close(); }
  console.log('\n=== Appareil où un AUTRE compte a déjà fait (ou quitté) le guide ===');
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
    await p.addInitScript(() => { const noop = () => {}; const mk = () => ({ once: () => Promise.resolve({ val: () => null, exists: () => false }), set: () => Promise.resolve(), update: () => Promise.resolve(), on: noop, off: noop, child: () => mk() });
      const o = { onAuthStateChanged: (cb) => setTimeout(() => cb({ uid: 'nouveau', email: 'n@b.c' }), 30), signOut: noop, setPersistence: () => Promise.resolve() }; const a = () => o; a.Auth = { Persistence: { LOCAL: 'local' } };
      window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => mk() }) };
      if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('gymlog:onboarding', JSON.stringify({ done: true, step: 0, uid: 'ancien' })); localStorage.setItem('gymlog:last-uid', JSON.stringify('ancien')); } });
    p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
    await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(3800);
    const s = await bubble(p); check('Nouveau compte sur cet appareil : le guide démarre quand même', s && /Bienvenue/.test(s.text), JSON.stringify(s));
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close(); }
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
    await p.addInitScript(() => { const noop = () => {}; const mk = () => ({ once: () => Promise.resolve({ val: () => null, exists: () => false }), set: () => Promise.resolve(), update: () => Promise.resolve(), on: noop, off: noop, child: () => mk() });
      const o = { onAuthStateChanged: (cb) => setTimeout(() => cb({ uid: 'nouveau', email: 'n@b.c' }), 30), signOut: noop, setPersistence: () => Promise.resolve() }; const a = () => o; a.Auth = { Persistence: { LOCAL: 'local' } };
      window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => mk() }) };
      if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('gymlog:onboarding', JSON.stringify({ done: true, step: 0 })); } });
    await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForTimeout(3800);
    const s = await bubble(p); check('Ancien format (sans compte noté) déjà « fait » : un compte neuf a quand même son guide', s && /Bienvenue/.test(s.text), JSON.stringify(s)); await ctx.close(); }
  console.log('\n=== Compte qui a déjà des données ===');
  { const { ctx, p } = await open(b, { seed: true });
    check('Pas de guide, marqué comme fait', await p.evaluate(() => !document.getElementById('onb-root') && JSON.parse(localStorage.getItem('gymlog:onboarding') || '{}').done === true));
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close(); }
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
