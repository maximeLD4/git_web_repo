const { chromium } = require('playwright'); const L = require('./xss_lib.js');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8808';
const CASES = {
  'pollution : __proto__ à la racine': '{"__proto__":{"polluted":"oui"},"sessions":[]}',
  'pollution : constructor.prototype': '{"constructor":{"prototype":{"polluted2":"oui"}},"sessions":[]}',
  'pollution : __proto__ dans une séance': '{"sessions":[{"id":"a","date":"2026-09-01","label":"x","exercises":[],"__proto__":{"polluted3":"oui"}}]}',
  'type : sessions = chaîne': '{"sessions":"pas une liste"}',
  'type : sessions = objet': '{"sessions":{"0":{"id":"a","date":"2026-09-01","label":"x","exercises":[]},"5":{"id":"b","date":"2026-09-02","label":"y","exercises":[]}}}',
  'type : éléments null/nombre/liste': '{"sessions":[null,1,"x",[],{}],"weights":[null,2,"y"],"gymExerciseConfigs":[null,{}]}',
  'type : exercises = chaîne': '{"sessions":[{"id":"a","date":"2026-09-01","label":"x","exercises":"oups"}]}',
  'type : sets = nombre': '{"sessions":[{"id":"a","date":"2026-09-01","label":"x","exercises":[{"id":"e","name":"Squat","exType":"muscu","category":"jambes","sets":5}]}]}',
  'type : date objet': '{"weights":[{"id":"w","date":{"a":1},"weight":70}]}',
  'type : poids texte': '{"weights":[{"id":"w","date":"2026-09-01","weight":"lourd"}]}',
  'type : configs sans baseWeights': '{"gymExerciseConfigs":[{"id":"c","name":"Squat","category":"jambes"}]}',
  'type : blocks = null': '{"runSessions":[{"id":"r","date":"2026-09-01","label":"x","blocks":null}]}',
  'volume : 3000 séances': 'GROS',
  'imbrication : profondeur 4000': 'PROFOND',
};
const build = (k) => { if (CASES[k] === 'GROS') return JSON.stringify({ sessions: Array.from({ length: 3000 }, (_, i) => ({ id: 'i' + i, date: '2026-09-01', label: 'S' + i, exercises: [{ id: 'e' + i, name: 'Squat', exType: 'muscu', category: 'jambes', sets: [{ id: 's' + i, weight: 60, reps: 10 }] }] })) });
  if (CASES[k] === 'PROFOND') { const n = 4000; return '{"sessions":[{"id":"a","date":"2026-09-01","label":"x","exercises":[],"deep":' + '['.repeat(n) + ']'.repeat(n) + '}]}'; } return CASES[k]; };
(async () => { const b = await chromium.launch(); const rows = [];
  for (const name of Object.keys(CASES)) {
    const { ctx, p } = await L.newPage(b, DIR, PORT); const text = build(name);
    const res = await p.evaluate(async ({ text }) => {
      const out = { parse: 'ok', restore: 'ok', pollue: [], t: 0 }; let data; const t0 = performance.now();
      try { data = JSON.parse(text); } catch (e) { out.parse = 'REFUSÉ (' + e.message.slice(0, 40) + ')'; return out; }
      try { out.valid = isValidImportPayload(data); } catch (e) { out.valid = 'exception: ' + e.message.slice(0, 50); }
      try { restoreFromBackupData(data); } catch (e) { out.restore = 'EXCEPTION: ' + e.message.slice(0, 70); }
      out.t = Math.round(performance.now() - t0);
      for (const k of ['polluted', 'polluted2', 'polluted3']) if (({})[k] !== undefined || Object.prototype[k] !== undefined) out.pollue.push(k);
      out.stored = Object.fromEntries(['sessions', 'weights'].map((k) => [k, (() => { try { return (JSON.parse(localStorage.getItem('gymlog:' + k)) || []).length; } catch (e) { return 'illisible'; } })()]));
      return out; }, { text });
    // « poison pill » : on recharge l'app (les données sont maintenant dans le stockage local) et on affiche tous les écrans
    await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } }, null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(250);
    const bootErr = []; p.on('pageerror', (e) => bootErr.push(e.message.slice(0, 90)));
    const booted = await p.evaluate(() => { try { currentUser; return typeof render === 'function'; } catch (e) { return false; } });
    let after = [];
    if (!booted) { after = ['⛔ L\'APP NE DÉMARRE PLUS (script interrompu au lancement)']; }
    else after = await p.evaluate(async (SCREENS_SRC) => { const errs = new Set(); window.addEventListener('error', (e) => errs.add(e.message.slice(0, 70)));
      currentUser = { uid: 'u1', email: 'a@b.c' }; const nSess = sessions.length;
      for (const [n, src] of SCREENS_SRC) { if (n === 'Salle > modifier une séance' && nSess === 0) continue; try { (new Function('return (' + src + ')'))()(); await new Promise((r) => setTimeout(r, 30)); } catch (e) { errs.add(n + ': ' + e.message.slice(0, 60)); } }
      return [...errs].slice(0, 3); }, L.SCREENS.map(([n, f]) => [n, f.toString()]));
    rows.push({ name, res, after, boot: booted }); await ctx.close(); }
  console.log('CAS'.padEnd(40), '| import'.padEnd(36), '| pollution | après redémarrage (tous les écrans)');
  for (const { name, res, after } of rows) console.log(name.padEnd(40), '|', (res.parse !== 'ok' ? res.parse : res.restore === 'ok' ? `ok (${res.t} ms)` : res.restore).padEnd(34), '|', (res.pollue.length ? '⚠ ' + res.pollue.join(',') : 'aucune').padEnd(9), '|', after.length ? '✗ ' + after.join(' ; ') : '✓ aucune erreur');
  await b.close(); })();
