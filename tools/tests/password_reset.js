// Écran de connexion : « Mot de passe oublié ? » — e-mail de réinitialisation via Firebase, message neutre
// (ne révèle jamais si un compte existe). Usage : node tools/tests/password_reset.js <dossier> [port]
const { chromium } = require('playwright');
const DIR = process.argv[2] || 'gymlog', PORT = process.argv[3] || '8825'; let ok = 0, ko = 0;
const check = (l, c, d) => { console.log(`${c ? '✓' : '✗'} ${l}${d !== undefined ? '  → ' + d : ''}`); c ? ok++ : ko++; };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage(); await p.route('**/gstatic.com/**', (r) => r.abort());
  // Firebase factice : enregistre les demandes ; window.__resetError simule une réponse d'erreur.
  await p.addInitScript(() => { const noop = () => {}; window.__resets = []; window.__resetError = null;
    const authObj = { onAuthStateChanged: noop, signOut: noop, setPersistence: () => Promise.resolve(), signInWithEmailAndPassword: () => Promise.reject({ code: 'auth/wrong-password' }),
      sendPasswordResetEmail: (email) => { window.__resets.push({ email, lang: authObj.languageCode }); return window.__resetError ? Promise.reject({ code: window.__resetError }) : Promise.resolve(); } };
    const a = () => authObj; a.Auth = { Persistence: { LOCAL: 'local' } };
    window.firebase = { initializeApp: noop, auth: a, database: () => ({ ref: () => ({ once: () => Promise.resolve({ val: () => null }), set: () => Promise.resolve() }) }) }; });
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); await p.goto(`http://localhost:${PORT}/${DIR}/index.html`, { waitUntil: 'load' }); await p.waitForFunction(() => typeof renderLoginScreen === 'function');
  const fresh = async () => { await p.evaluate(() => { window.__resets = []; window.__resetError = null; renderLoginScreen(); }); };
  const msgs = () => p.evaluate(() => ({ err: document.getElementById('login-error').textContent.trim(), info: document.getElementById('login-info').textContent.trim(), disabled: document.getElementById('login-forgot-btn').disabled, sent: window.__resets.slice() }));
  await fresh();
  check('Bouton « Mot de passe oublié ? » sous « Se connecter »', await p.evaluate(() => { const f = document.getElementById('login-forgot-btn'), s = document.querySelector('.auth-submit'); return !!f && f.textContent.trim() === 'Mot de passe oublié ?' && f.getBoundingClientRect().top > s.getBoundingClientRect().bottom && f.type === 'button'; }));
  await p.click('#login-forgot-btn'); await p.waitForTimeout(100); let m = await msgs();
  check('Sans e-mail : rien n\'est envoyé, on demande de le saisir', m.sent.length === 0 && /Saisis d'abord ton e-mail/.test(m.err) && await p.evaluate(() => document.activeElement.id === 'login-email'), m.err);
  await p.fill('#login-email', 'pas-un-email'); await p.click('#login-forgot-btn'); await p.waitForTimeout(100); m = await msgs();
  check('E-mail mal formé : rien n\'est envoyé', m.sent.length === 0 && /Saisis d'abord/.test(m.err), m.err);
  await fresh(); await p.fill('#login-email', '  moi@exemple.com '); await p.click('#login-forgot-btn'); await p.waitForTimeout(150); m = await msgs();
  check('Envoi demandé à Firebase pour l\'adresse saisie (sans espaces), e-mail en français', m.sent.length === 1 && m.sent[0].email === 'moi@exemple.com' && m.sent[0].lang === 'fr', JSON.stringify(m.sent));
  check('Message neutre : « Si un compte existe pour… »', /^Si un compte existe pour moi@exemple\.com, un e-mail/.test(m.info) && !m.err, m.info);
  check('Bouton désactivé un moment (pas d\'envois en rafale)', m.disabled);
  await fresh(); await p.evaluate(() => { window.__resetError = 'auth/user-not-found'; }); await p.fill('#login-email', 'inconnu@exemple.com'); await p.click('#login-forgot-btn'); await p.waitForTimeout(150); m = await msgs();
  check('Compte inexistant : MÊME message neutre (rien de révélé), aucun message d\'erreur', /^Si un compte existe pour inconnu@exemple\.com/.test(m.info) && !m.err, `${m.info} | ${m.err}`);
  for (const [code, re] of [['auth/too-many-requests', /Trop de demandes/], ['auth/network-request-failed', /Pas de connexion/], ['auth/invalid-email', /invalide/], ['auth/internal-error', /Envoi impossible/]]) {
    await fresh(); await p.evaluate((c) => { window.__resetError = c; }, code); await p.fill('#login-email', 'moi@exemple.com'); await p.click('#login-forgot-btn'); await p.waitForTimeout(150); m = await msgs();
    check(`Erreur ${code} : message clair, pas le message « envoyé »`, re.test(m.err) && !m.info, m.err);
  }
  await fresh(); await p.fill('#login-email', '<img src=x onerror=alert(1)>@x.fr'); await p.evaluate(() => { document.getElementById('login-email').type = 'text'; }); await p.click('#login-forgot-btn'); await p.waitForTimeout(150);
  check('Adresse piégée affichée comme du texte, jamais comme du HTML', await p.evaluate(() => !document.querySelector('#login-info img')));
  await fresh(); await p.fill('#login-email', 'moi@exemple.com'); await p.fill('#login-password', 'x'); await p.click('.auth-submit'); await p.waitForTimeout(150);
  check('La connexion normale marche toujours (échec : message d\'identifiants)', /Identifiants incorrects/.test((await msgs()).err));
  check('    aucune erreur JS', p.errs.length === 0, p.errs.join(' | ') || 'aucune');
  console.log(`\n${ok} réussis, ${ko} échoués`); await b.close(); process.exit(ko ? 1 : 0); })();
