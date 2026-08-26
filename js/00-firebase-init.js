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
