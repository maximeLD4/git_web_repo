const { chromium } = require('playwright'); const L = require('./xss_lib.js');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8808';
(async () => { const b = await chromium.launch(); let n = 0, exec = 0, handlers = 0, tags = 0;
  for (const [pname, payload] of Object.entries(L.PAYLOADS)) for (const nt of [false, true]) {
    const { ctx, p } = await L.newPage(b, DIR, PORT); const r = await L.inject(p, 'local-brut', L.mapLeaves(L.base(), payload, nt), L.base());
    n++; if (r.pwned) exec++; const h = r.out.flatMap((o) => o.hits); if (h.some((x) => /\[on/.test(x))) handlers++; if (h.length) tags++; await ctx.close(); }
  console.log(`FILET DE SÉCURITÉ SEUL (données piégées injectées directement, sans aucune normalisation) — ${n} scénarios :\n  exécutions de code : ${exec}\n  scénarios où un attribut on*= subsiste dans l'interface : ${handlers}\n  scénarios avec une balise injectée (inerte, sans gestionnaire) : ${tags}`);
  await b.close(); })();
