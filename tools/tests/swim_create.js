// Tests de l'écran Natation > Créer (taille du bassin saisie une seule fois par séance).
// Nécessite Node + Playwright. Usage : node tools/tests/swim_create.js <dossier-du-projet> [port]
// (le serveur est celui de tools/security/run.sh : python3 -m http.server depuis le dossier PARENT du projet)
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8813'; let ok = 0, ko = 0;
const check = (label, cond, detail) => { console.log(`${cond ? '✓' : '✗'} ${label}${detail !== undefined ? '  → ' + detail : ''}`); cond ? ok++ : ko++; };
const OLD = [{ id: 'old1', date: '2026-09-01', label: 'Technique', blocks: [{ id: 'ob1', label: 'Bloc 1', mode: 'pool', duration: '', distance: '', pace: '', poolLength: '50', lengths: '10', stroke: 'Crawl' }] }, { id: 'old0', date: '2026-08-01', label: 'Ancienne', blocks: [{ id: 'ob0', label: 'Bloc 1', mode: 'pool', duration: '', distance: '', pace: '', poolLength: '25', lengths: '8', stroke: '' }] }];
const open = async (b, sessions = OLD) => { const ctx = await b.newContext({ viewport: { width: 414, height: 896 }, serviceWorkers: 'block' }); const p = await ctx.newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  await p.addInitScript(() => { const noop = () => {}; const a = () => ({ onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve() }); a.Auth = { Persistence: { LOCAL: 'local' } }; window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } }); await p.waitForTimeout(250);
  await p.evaluate((s) => { currentUser = { uid: 'u', email: 'a@b.c' }; swimSessions = s; swimSessionPlans = []; swimLibrary = []; clearSwimDraft(); swimTopMode = 'session'; swimTab = 'log'; currentApp = 'swim'; renderSwimApp(); }, sessions); await p.waitForTimeout(300); return { ctx, p }; };
const cards = (p) => p.evaluate(() => [...document.querySelectorAll('#swim-blocks-container .exercise-card')].map((c) => ({ mode: c.dataset.mode, perBlockPool: c.querySelector('.swim-block-poollength')?.value ?? null, chip: c.querySelector('[data-pool-chip]')?.textContent.trim() ?? null, chipMissing: !!c.querySelector('.block-pool-chip-missing'), hint: c.querySelector('[data-total-hint]')?.textContent || '' })));
const saved = (p, id) => p.evaluate((id) => { const s = id ? swimSessions.find((x) => x.id === id) : swimSessions[0]; return s ? { blocks: s.blocks.map((b) => ({ mode: b.mode, pool: b.poolLength, lengths: b.lengths })) } : null; }, id);
(async () => { const b = await chromium.launch();
  { const { ctx, p } = await open(b);
    check('A1  « Bassin » prérempli avec le bassin de la dernière séance (50)', (await p.inputValue('#swim-pool-length')) === '50');
    await p.click('[data-block-type="pool"]'); await p.fill('#swim-blocks-container .exercise-card:nth-child(1) .swim-block-lengths', '10');
    await p.click('#add-swim-block-btn'); await p.waitForTimeout(300); await p.fill('#swim-blocks-container .exercise-card:nth-child(2) .swim-block-lengths', '20');
    await p.click('#add-swim-block-btn'); await p.waitForTimeout(300); await p.fill('#swim-blocks-container .exercise-card:nth-child(3) .swim-block-lengths', '30');
    let c = await cards(p);
    check('A2  Les blocs ajoutés restent en mode Bassin', c.length === 3 && c.every((x) => x.mode === 'pool'));
    check('A3  Aucun champ de taille dans les blocs', c.every((x) => x.perBlockPool === null));
    check('N1  Chaque bloc MONTRE la taille utilisée (« Bassin : 50 m »)', c.every((x) => /Bassin : 50 m/.test(x.chip)), JSON.stringify(c.map((x) => x.chip)));
    await p.fill('#swim-pool-length', '25'); await p.waitForTimeout(150); c = await cards(p);
    check('N2  Une saisie (25) : les rappels des 3 blocs se mettent à jour en direct', c.every((x) => /Bassin : 25 m/.test(x.chip)), JSON.stringify(c.map((x) => x.chip)));
    check('A4  …et les distances : 250 / 500 / 750 m', c[0].hint.includes('250 m') && c[1].hint.includes('500 m') && c[2].hint.includes('750 m'));
    check('A5  Total de la séance 1500 m', (await p.textContent('#swim-summary-bar')).includes('1500 m'));
    await p.click('#add-swim-block-btn'); await p.waitForTimeout(300);
    check('N3  Un 4e bloc ajouté affiche d\'emblée « Bassin : 25 m » (copié, rien à retaper)', /Bassin : 25 m/.test((await cards(p))[3].chip));
    await p.click('#save-swim-session-btn'); await p.waitForTimeout(900); const s = await saved(p);
    check('A6  Enregistré : 3 blocs (le 4e, vide, est écarté), tous à 25 m', s.blocks.length === 3 && s.blocks.every((x) => x.mode === 'pool' && x.pool === '25'), JSON.stringify(s.blocks));
    await p.evaluate(() => { swimTab = 'history'; renderSwimApp(); document.querySelector('[data-toggle], [data-swim-toggle]')?.click(); }); await p.waitForTimeout(300); const hist = await p.evaluate(() => document.getElementById('app').innerText);
    check('A7  Historique : « 10×25m », « 20×25m », « 30×25m »', /10×25m/.test(hist) && /20×25m/.test(hist) && /30×25m/.test(hist));
    await p.evaluate(() => { clearSwimDraft(); swimTab = 'log'; renderSwimApp(); }); await p.waitForTimeout(250);
    check('A8  Séance suivante : prérempli avec 25', (await p.inputValue('#swim-pool-length')) === '25');
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close(); }
  { const { ctx, p } = await open(b, []);   // toute première séance : aucun historique
    await p.click('[data-block-type="pool"]'); const c = await cards(p);
    check('N4  Première séance (aucun historique) : le bloc le dit — « Bassin à saisir »', c[0].chipMissing && /Bassin à saisir/.test(c[0].chip), JSON.stringify(c[0].chip));
    await p.click('#swim-blocks-container [data-pool-chip]'); await p.waitForTimeout(300);
    check('N5  Toucher le rappel amène sur la ligne « Bassin » du haut', await p.evaluate(() => document.activeElement && document.activeElement.id === 'swim-pool-length'));
    await p.keyboard.type('25'); await p.waitForTimeout(150);
    check('N6  Une fois saisie, le rappel du bloc passe à « Bassin : 25 m »', /Bassin : 25 m/.test((await cards(p))[0].chip));
    await p.evaluate(() => document.activeElement.blur()); await p.focus('#swim-blocks-container [data-pool-chip]'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
    check('N7  Le rappel est utilisable au clavier (Entrée)', await p.evaluate(() => document.activeElement && document.activeElement.id === 'swim-pool-length')); await ctx.close(); }
  { const { ctx, p } = await open(b, []); await p.click('[data-block-type="pool"]'); await p.fill('#swim-blocks-container .exercise-card:nth-child(1) .swim-block-lengths', '12'); await p.fill('#swim-pool-length', '33'); await p.waitForTimeout(700);
    await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } }); await p.evaluate(() => { currentUser = { uid: 'u' }; currentApp = 'swim'; swimTab = 'log'; renderSwimApp(); }); await p.waitForTimeout(300);
    check('B   Brouillon rechargé : bassin 33 et 12 longueurs conservés', (await p.inputValue('#swim-pool-length')) === '33' && (await p.inputValue('.swim-block-lengths')) === '12'); await ctx.close(); }
  { const { ctx, p } = await open(b);
    await p.evaluate(() => { swimSessions = [{ id: 'uni', date: '2026-09-02', label: 'Uniforme', blocks: [{ id: 'u1', label: 'A', mode: 'pool', duration: '', distance: '', pace: '', poolLength: '25', lengths: '10', stroke: '' }, { id: 'u2', label: 'B', mode: 'pool', duration: '', distance: '', pace: '', poolLength: '25.0', lengths: '20', stroke: 'Dos' }] },
      { id: 'mix', date: '2026-09-03', label: 'Mixte', blocks: [{ id: 'm1', label: 'A', mode: 'pool', duration: '', distance: '', pace: '', poolLength: '25', lengths: '10', stroke: '' }, { id: 'm2', label: 'B', mode: 'pool', duration: '', distance: '', pace: '', poolLength: '50', lengths: '4', stroke: '' }] }]; startEditSwimSession(swimSessions[0]); }); await p.waitForTimeout(300);
    let c = await cards(p);
    check('C1  Séance existante (25 et « 25.0 » : même bassin) : ligne = 25, pas de champ par bloc', (await p.inputValue('#swim-pool-length')) === '25' && c.every((x) => x.perBlockPool === null));
    await p.fill('#swim-pool-length', '50'); await p.click('#save-swim-session-btn'); await p.waitForTimeout(900); const s1 = await saved(p, 'uni');
    check('C2  Modifier le bassin une fois (50) met à jour tous les blocs', s1.blocks.every((x) => x.pool === '50'), JSON.stringify(s1.blocks.map((x) => x.pool)));
    await p.evaluate(() => { startEditSwimSession(swimSessions.find((s) => s.id === 'mix')); }); await p.waitForTimeout(300); c = await cards(p);
    check('D1  Ancienne séance à PLUSIEURS bassins : champs par bloc conservés (25 et 50), ligne « Plusieurs »', c.every((x) => x.perBlockPool !== null) && c[0].perBlockPool === '25' && c[1].perBlockPool === '50' && (await p.getAttribute('#swim-pool-length', 'placeholder')).includes('Plusieurs'));
    await p.click('#add-swim-block-btn'); await p.waitForTimeout(300); c = await cards(p);
    check('N8  …on ajoute un bloc : il COPIE la taille du bloc précédent (50), rien à retaper', c.length === 3 && c[2].perBlockPool === '50', JSON.stringify(c.map((x) => x.perBlockPool)));
    await p.click('#swim-blocks-container .exercise-card:nth-child(3) [data-block-type="both"]'); await p.waitForTimeout(250); await p.click('#swim-blocks-container .exercise-card:nth-child(3) [data-block-type="pool"]'); await p.waitForTimeout(250); c = await cards(p);
    check('N9  …un bloc repassé en Bassin copie aussi la taille du bloc précédent', c[2].perBlockPool === '50', JSON.stringify(c[2].perBlockPool));
    await p.evaluate(() => { startEditSwimSession(swimSessions.find((s) => s.id === 'mix')); }); await p.waitForTimeout(300); await p.click('#save-swim-session-btn'); await p.waitForTimeout(900); const s2 = await saved(p, 'mix');
    check('D2  Enregistrée SANS rien toucher : 25 et 50 intacts', s2.blocks[0].pool === '25' && s2.blocks[1].pool === '50', JSON.stringify(s2.blocks.map((x) => x.pool)));
    await p.evaluate(() => { startEditSwimSession(swimSessions.find((s) => s.id === 'mix')); }); await p.waitForTimeout(300); await p.fill('#swim-pool-length', '33'); await p.press('#swim-pool-length', 'Tab'); await p.waitForTimeout(500); c = await cards(p);
    check('D3  Saisir un bassin en haut unifie (champs par bloc masqués, rappel « 33 m »)', c.every((x) => x.perBlockPool === null && /Bassin : 33 m/.test(x.chip)));
    await p.click('#save-swim-session-btn'); await p.waitForTimeout(900); const s3 = await saved(p, 'mix'); check('D4  …enregistré à 33 pour tous les blocs', s3.blocks.every((x) => x.pool === '33'), JSON.stringify(s3.blocks.map((x) => x.pool)));
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close(); }
  { const { ctx, p } = await open(b);
    await p.click('[data-swim-top-mode="plan"]'); await p.waitForTimeout(300); check('E1  Plan : la ligne Bassin est présente', !!(await p.$('#swim-pool-length')));
    await p.fill('#swim-label', 'Plan 25 m'); await p.click('[data-block-type="pool"]'); await p.fill('.swim-block-lengths', '16'); await p.fill('#swim-pool-length', '25'); await p.click('#save-swim-session-btn'); await p.waitForTimeout(900);
    const plan = await p.evaluate(() => swimSessionPlans[0] && swimSessionPlans[0].blocks.map((x) => ({ pool: x.poolLength, lengths: x.lengths }))); check('E2  Plan enregistré avec le bassin sur son bloc', plan && plan[0].pool === '25' && plan[0].lengths === '16');
    await p.evaluate(() => { swimTopMode = 'session'; clearSwimDraft(); swimTab = 'log'; renderSwimApp(); }); await p.waitForTimeout(300);
    await p.fill('#swim-label', 'Eau libre'); await p.fill('.swim-block-duration', '30'); await p.fill('.swim-block-distance', '1500'); await p.click('#save-swim-session-btn'); await p.waitForTimeout(900); const ow = await saved(p);
    check('F   Eau libre (Distance + Durée) : enregistré sans bassin', ow.blocks[0].mode === 'both' && ow.blocks[0].pool === '');
    await p.evaluate(() => { clearSwimDraft(); swimTab = 'log'; renderSwimApp(); }); await p.waitForTimeout(300);
    await p.fill('#swim-label', 'Mixte'); await p.fill('.swim-block-duration', '20'); await p.fill('.swim-block-distance', '1000'); await p.click('#add-swim-block-btn'); await p.waitForTimeout(300); const second = await cards(p);
    await p.click('#swim-blocks-container .exercise-card:nth-child(2) [data-block-type="pool"]'); await p.waitForTimeout(300); await p.fill('#swim-blocks-container .exercise-card:nth-child(2) .swim-block-lengths', '10'); await p.fill('#swim-pool-length', '25'); await p.click('#save-swim-session-btn'); await p.waitForTimeout(900); const mx = await saved(p);
    check('G1  Après un bloc « Distance + Durée », le suivant reste « Distance + Durée »', second[1].mode === 'both' && second[1].chip === null);
    check('G2  Séance mixte : seul le bloc en Bassin reçoit le bassin', mx.blocks[0].pool === '' && mx.blocks[1].mode === 'pool' && mx.blocks[1].pool === '25');
    check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close(); }
  { const { ctx, p } = await open(b); await p.evaluate(() => { swimSessions = [{ id: 's', date: new Date().toISOString().slice(0, 10), label: 'x', blocks: [{ id: 'b', label: 'A', mode: 'pool', duration: '', distance: '', pace: '', poolLength: '25', lengths: '40', stroke: 'Crawl' }] }]; });
    for (const f of [() => { currentApp = 'calendar'; render(); }, () => { currentApp = 'performance'; render(); }, () => { currentApp = 'swim'; swimTab = 'history'; renderSwimApp(); }, () => { currentApp = 'home'; render(); }]) { await p.evaluate(f); await p.waitForTimeout(200); }
    check('J   Calendrier, Performance, Historique, Accueil : aucune erreur', p.errs.length === 0, p.errs.join(' | ') || 'aucune'); await ctx.close(); }
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
