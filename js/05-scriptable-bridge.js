
// ---------- Scriptable bridge (lecture/écriture réelle du fichier historique) ----------
// Un script Scriptable externe appelle ces deux fonctions via evaluateJavaScript().
// Elles réutilisent restoreFromBackupData() / la même forme que exportBackup(),
// donc pas de logique dupliquée ni de risque de divergence.
window.__scriptableDirty = false;

window.__scriptableExport = function () {
  return JSON.stringify({
    sessions, library, weights,
    runSessions, runLibrary,
    swimSessions, swimLibrary,
    bikeSessions, bikeLibrary,
    exportedAt: new Date().toISOString(),
  });
};

window.__scriptableImport = function (jsonString) {
  try {
    const data = JSON.parse(jsonString);
    restoreFromBackupData(data);
    render();
    return true;
  } catch (e) {
    return false;
  }
};
