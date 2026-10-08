const { chromium } = require('playwright'); const L = require('./xss_lib.js');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8808';
(async () => { const b = await chromium.launch(); const paths = L.leafPaths(L.base());
  const run = async (pname) => { const { ctx, p } = await L.newPage(b, DIR, PORT); const bad = [];
    for (const lp of paths) { const data = L.setAt(L.base(), lp, L.PAYLOADS[pname]); const r = await L.inject(p, 'cloud', data, L.base());
      if (r.out.length || r.pwned) bad.push({ champ: lp.join('.'), exec: r.pwned > 0, ou: [...new Set(r.out.map((o) => o.where))].slice(0, 2).join(' ; '), balises: [...new Set(r.out.flatMap((o) => o.hits))].slice(0, 3).join(',') }); }
    await ctx.close(); return bad; };
  const [attr, tag] = await Promise.all([run('sortie d\'attribut "'), run('balise <img>')]);
  const norm = (c) => c.replace(/\.\d+/g, '[]');
  const group = (list) => { const m = new Map(); for (const x of list) { const k = norm(x.champ); if (!m.has(k)) m.set(k, x); } return [...m.values()]; };
  console.log(`\n=== Champs exploitables par SORTIE D'ATTRIBUT (guillemet) — ${group(attr).length} types de champ sur ${new Set(paths.map((p) => norm(p.join('.')))).size} ===`);
  for (const x of group(attr)) console.log(`  ${x.exec ? '⚠ EXEC' : '  inj '}  ${norm(x.champ).padEnd(46)} ${x.balises}  [${x.ou}]`);
  console.log(`\n=== Champs exploitables par BALISE <img> dans du texte — ${group(tag).length} types de champ ===`);
  for (const x of group(tag)) console.log(`  ${x.exec ? '⚠ EXEC' : '  inj '}  ${norm(x.champ).padEnd(46)} ${x.balises}  [${x.ou}]`);
  await b.close(); })();
