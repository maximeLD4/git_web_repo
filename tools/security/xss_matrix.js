const { chromium } = require('playwright'); const L = require('./xss_lib.js');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8808';
(async () => { const b = await chromium.launch(); const rows = {};
  for (const [path, label] of [['cloud', 'Cloud (pullFromFirebase)'], ['import-seance', 'Import d\'une séance partagée'], ['import-sauvegarde', 'Import d\'une sauvegarde']]) {
    for (const [pname, payload] of Object.entries(L.PAYLOADS)) for (const nt of [false, true]) {
      const { ctx, p } = await L.newPage(b, DIR, PORT); const r = await L.inject(p, path, L.mapLeaves(L.base(), payload, nt), L.base());
      (rows[label] ||= []).push({ pname: pname + (nt ? ' (+nombres)' : ''), hits: r.out.length, pwned: r.pwned, errors: r.errors, ex: r.out[0] }); await ctx.close(); } }
  for (const [label, rs] of Object.entries(rows)) {
    const bad = rs.filter((r) => r.hits), exe = rs.filter((r) => r.pwned);
    console.log(`\n### ${label} — ${rs.length} scénarios : ${bad.length} avec balise/attribut injecté, ${exe.length} avec EXÉCUTION de code`);
    if (bad.length) console.log('   charges : ' + bad.map((r) => r.pname).join(' | ') + '\n   exemple : ' + JSON.stringify(bad[0].ex));
    const errs = [...new Set(rs.flatMap((r) => r.errors))]; if (errs.length) console.log('   erreurs de rendu (disponibilité) : ' + errs.slice(0, 4).join(' | ')); }
  await b.close(); })();
