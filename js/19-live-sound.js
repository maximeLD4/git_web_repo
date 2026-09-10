/* ---------- Séance en direct : retour sonore + vibration ----------
   Bloc entièrement autonome (aucune dépendance vers le reste de
   18-live.js — seulement appelé PAR lui, aux transitions de la boucle
   Gainage) : sorti dans son propre fichier pour alléger 18-live.js, qui
   accumulait beaucoup de sujets différents au même endroit.

   Le son fonctionne partout (Web Audio API, aucune permission nécessaire).
   La vibration, elle, ne fonctionne que sur Android/Chrome — Safari iOS n'a
   jamais implémenté l'API de vibration web, même pour les apps "Sur l'écran
   d'accueil" : navigator.vibrate y est simplement absent, l'appel ci-dessous
   ne fait donc rien du tout, silencieusement, sur iPhone. */
let liveAudioCtx = null;
function getLiveAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!liveAudioCtx) liveAudioCtx = new AudioCtx();
  return liveAudioCtx;
}

// Joue effectivement le son sur un contexte confirmé "running" — jamais
// avant. C'est le cœur du correctif historique : reprendre un contexte
// suspendu (ctx.resume()) est ASYNCHRONE, donc le lancer sans attendre puis
// démarrer l'oscillateur dans la foulée revenait à le programmer sur un
// contexte encore suspendu la plupart du temps — silencieux sans la moindre
// erreur. Après un repos assez long (notamment sur iOS, qui suspend
// volontiers un contexte audio inactif), c'est exactement ce qui pouvait
// faire "sauter" le bip du passage repos → travail sans que rien ne le
// signale.
function scheduleLiveTone(ctx, frequency, durationMs) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  // Petite enveloppe (montée/descente en volume) plutôt qu'un aplat brut —
  // évite le "clic" désagréable d'un son qui démarre/s'arrête à volume plein.
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000 + 0.03);
}

function playLiveBeep(frequency, durationMs) {
  const ctx = getLiveAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume()
      .then(() => scheduleLiveTone(ctx, frequency, durationMs))
      .catch(() => {});
  } else {
    scheduleLiveTone(ctx, frequency, durationMs);
  }
}

function hapticPulse(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// Signal de fin de "travail" (on passe au repos) : un seul bip grave, plutôt
// posé — pas la peine d'être alarmant, on vient de finir un effort.
function playLiveRestSignal() {
  playLiveBeep(440, 160);
  hapticPulse(120);
}
// Signal de fin de "repos" (on relance un tour) : un bip plus aigu, un peu
// plus insistant — c'est le signal "c'est reparti".
function playLiveWorkSignal() {
  playLiveBeep(880, 160);
  hapticPulse([80, 60, 80]);
}
// Signal de fin de boucle complète : petit arpège ascendant, façon "bravo".
function playLiveLoopDoneSignal() {
  const ctx = getLiveAudioContext();
  if (!ctx) return;
  [523, 659, 784].forEach((freq, i) => setTimeout(() => playLiveBeep(freq, 180), i * 130));
  hapticPulse([100, 60, 100, 60, 160]);
}
