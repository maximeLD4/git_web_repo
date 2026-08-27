/* ---------- Firebase : initialisation (chargé avant tout le reste) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDLZdbKU4ooR0JVpEgyX6p1_6gc_7am-nY",
  authDomain: "gymlog-e4862.firebaseapp.com",
  databaseURL: "https://gymlog-e4862-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gymlog-e4862",
  storageBucket: "gymlog-e4862.firebasestorage.app",
  messagingSenderId: "899160712021",
  appId: "1:899160712021:web:ad9b3c3bfd89d183ea05dc",
  measurementId: "G-TPWZZ1JLXC",
};
firebase.initializeApp(firebaseConfig);
// Persiste la session de connexion sur cet appareil/navigateur : on ne
// redemande pas les identifiants à chaque ouverture, seulement la première
// fois sur un nouvel appareil (ou après déconnexion explicite).
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

/* ---------- Numéro de version : seule source de vérité = le fichier VERSION ---------- */
// Pas de constante dupliquée dans le JS : on lit directement le fichier à la
// racine du projet. S'il n'a pas pu être lu au moment du premier affichage
// (chargement en cours, ou hors connexion la toute première fois), on met à
// jour l'élément affiché dès que la lecture aboutit, sans re-render complet.
let appVersion = "";
fetch("./VERSION")
  .then((res) => (res.ok ? res.text() : Promise.reject(new Error("VERSION introuvable"))))
  .then((text) => {
    appVersion = text.trim();
    const label = document.getElementById("app-version-label");
    if (label) label.textContent = "v" + appVersion;
  })
  .catch(() => {
    // Pas grave : on laisse simplement l'espace vide plutôt que d'afficher
    // un numéro de version faux ou périmé.
  });
