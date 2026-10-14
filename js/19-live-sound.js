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
  // Le pic (0.22 à 100%) est mis à l'échelle du réglage de volume choisi
  // dans Réglages (voir soundVolume) — pensé pour pouvoir monter au-delà
  // de l'original, pas seulement baisser (de la musique dans les oreilles
  // peut couvrir le bip par défaut).
  const peak = 0.22 * (soundVolume / 100);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), ctx.currentTime + 0.015);
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

// Boucle (Gainage) : chaque changement de phase s'annonce par un DÉCOMPTE
// sur les 4 dernières secondes, en bips seulement — « 3, 2, 1, GO » avant
// l'effort, « 3, 2, 1, STOP » avant le repos — pour le voir venir plutôt
// que d'être surpris par un bip unique. Les trois bips du décompte sont
// identiques (courts, médium) ; le quatrième, au moment exact du
// changement, est long et dit lequel : aigu = GO, grave = STOP. Le
// calendrier des bips est tenu par 18-live.js (scheduleLiveLoopCountdown).
function playLiveCountdownTick() {
  playLiveBeep(660, 110);
  hapticPulse(40);
}
// « GO » : on (re)part dans l'effort — long et aigu.
function playLiveGoSignal() {
  playLiveBeep(1046, 520);
  hapticPulse([80, 60, 160]);
}
// « STOP » : fin de l'effort, place au repos — long et grave.
function playLiveStopSignal() {
  playLiveBeep(392, 520);
  hapticPulse(220);
}
// Aperçu dans Réglages > Son : le décompte complet, « 3, 2, 1, GO ».
function playLiveCountdownDemo() {
  [0, 1000, 2000].forEach((t) => setTimeout(playLiveCountdownTick, t));
  setTimeout(playLiveGoSignal, 3000);
}
// Signal de fin de boucle complète : petit arpège ascendant, façon "bravo".
function playLiveLoopDoneSignal() {
  const ctx = getLiveAudioContext();
  if (!ctx) return;
  [523, 659, 784].forEach((freq, i) => setTimeout(() => playLiveBeep(freq, 180), i * 130));
  hapticPulse([100, 60, 100, 60, 160]);
}
