
async function exportBackup() {
  const backup = {
    sessions, library, weights, gymExerciseConfigs,
    runSessions, runLibrary,
    swimSessions, swimLibrary,
    bikeSessions, bikeLibrary,
    exportedAt: new Date().toISOString(),
  };
  const json = JSON.stringify(backup, null, 2);
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const filename = `gymlog-historique-${todayISO()}-${hh}h${mm}.json`;

  const file = new File([json], filename, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      saveJSON(KEYS.lastExport, new Date().toISOString());
      return;
    } catch (e) {
      // annulé par l'utilisateur ou échec du partage : on retombe sur le téléchargement classique
    }
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  saveJSON(KEYS.lastExport, new Date().toISOString());
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function setActivitySessions(key, list) {
  if (key === "gym") { sessions = list; saveJSON(KEYS.sessions, sessions); }
  else if (key === "run") { runSessions = list; saveJSON(KEYS.runSessions, runSessions); }
  else if (key === "swim") { swimSessions = list; saveJSON(KEYS.swimSessions, swimSessions); }
  else { bikeSessions = list; saveJSON(KEYS.bikeSessions, bikeSessions); }
}

async function exportSingleSession(type, session) {
  const payload = { kind: "gymlog-single-session", type, session };
  const json = JSON.stringify(payload, null, 2);
  const filename = `gymlog-seance-${type}-${session.date}.json`;

  const file = new File([json], filename, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      // annulé par l'utilisateur ou échec du partage : on retombe sur le téléchargement classique
    }
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function mergeImportedSession(type, session) {
  const cloned = { ...session, id: uid() };
  setActivitySessions(type, [cloned, ...getActivitySessions(type)]);
}

function isValidImportPayload(data) {
  if (data && data.kind === "gymlog-single-session" && data.type && data.session) return true;
  return Array.isArray(data.sessions) || Array.isArray(data.runSessions) || Array.isArray(data.swimSessions) || Array.isArray(data.bikeSessions);
}

function validateSingleSessionForSection(data, expectedType) {
  if (!data || data.kind !== "gymlog-single-session" || !data.type || !data.session) {
    return { ok: false, message: "Ce fichier ne semble pas être une séance GymLog valide." };
  }
  if (data.type !== expectedType) {
    const gotMeta = ACTIVITY_META.find((a) => a.key === data.type);
    const wantMeta = ACTIVITY_META.find((a) => a.key === expectedType);
    const gotLabel = gotMeta ? gotMeta.label : data.type;
    const wantLabel = wantMeta ? wantMeta.label : expectedType;
    return { ok: false, message: `Ce fichier contient une séance de ${gotLabel}, pas de ${wantLabel}. Importe-le depuis la bonne section.` };
  }
  return { ok: true, session: data.session };
}

function handleImportedFile(data, rerender) {
  if (data.kind === "gymlog-single-session" && data.type && data.session) {
    const meta = ACTIVITY_META.find((a) => a.key === data.type);
    const label = meta ? meta.label : data.type;
    showConfirm(
      `Ajouter cette séance (${formatDateFR(data.session.date)} · ${label}) à ton historique ?`,
      () => {
        mergeImportedSession(data.type, data.session);
        rerender();
        showAlert("Séance ajoutée à ton historique.");
      },
      { confirmLabel: "Ajouter" }
    );
    return;
  }
  showConfirm(
    "Importer cette sauvegarde va remplacer toutes tes données actuelles. Continuer ?",
    () => {
      restoreFromBackupData(data);
      rerender();
      showAlert("Import réussi.");
    },
    { confirmLabel: "Importer" }
  );
}

function restoreFromBackupData(data) {
  sessions = data.sessions || [];
  library = data.library || [];
  weights = data.weights || [];
  gymExerciseConfigs = data.gymExerciseConfigs || [];
  runSessions = data.runSessions || [];
  runLibrary = data.runLibrary || [];
  swimSessions = data.swimSessions || [];
  swimLibrary = data.swimLibrary || [];
  bikeSessions = data.bikeSessions || [];
  bikeLibrary = data.bikeLibrary || [];
  saveJSON(KEYS.sessions, sessions);
  saveJSON(KEYS.library, library);
  saveJSON(KEYS.weights, weights);
  saveJSON(KEYS.gymExerciseConfigs, gymExerciseConfigs);
  saveJSON(KEYS.runSessions, runSessions);
  saveJSON(KEYS.runLibrary, runLibrary);
  saveJSON(KEYS.swimSessions, swimSessions);
  saveJSON(KEYS.swimLibrary, swimLibrary);
  saveJSON(KEYS.bikeSessions, bikeSessions);
  saveJSON(KEYS.bikeLibrary, bikeLibrary);
  saveJSON(KEYS.lastImport, new Date().toISOString());
}
