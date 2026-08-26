
async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function renderPasswordGate() {
  app.className = "";
  app.innerHTML = `
    <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; gap:22px; background:#F7F1E3;">
      <div style="width:64px; height:64px; border-radius:20px; background:#00B899; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 8px 20px rgba(0,184,153,0.25);">${ICONS.dumbbell}</div>
      <div style="text-align:center;">
        <div style="font-family:-apple-system,system-ui,sans-serif; font-weight:800; font-size:24px; letter-spacing:-0.3px; color:#3A3229;">GymLog</div>
        <div style="font-family:-apple-system,system-ui,sans-serif; font-size:13px; color:#8A7F6C; margin-top:2px;">Entre ton mot de passe pour continuer</div>
      </div>
      <form id="password-form" style="display:flex; flex-direction:column; gap:10px; width:100%; max-width:280px;">
        <input type="password" id="password-input" placeholder="Mot de passe" autocomplete="current-password"
          style="padding:14px 16px; border-radius:12px; border:1px solid #E7DCC3; background:#FFFDF8; color:#3A3229; font-size:16px; width:100%; box-sizing:border-box;">
        <button type="submit" style="width:100%; background:#00B899; color:#fff; border:none; border-radius:999px; padding:15px; font-size:15.5px; font-weight:700; font-family:-apple-system,system-ui,sans-serif; cursor:pointer; box-shadow:0 4px 14px rgba(0,184,153,0.3);">Entrer</button>
        <div id="password-error" style="color:#C1443C; font-size:13px; text-align:center; min-height:16px; font-family:-apple-system,system-ui,sans-serif;"></div>
      </form>
    </div>
  `;
  const form = document.getElementById("password-form");
  const input = document.getElementById("password-input");
  const errorEl = document.getElementById("password-error");
  input.focus();
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const hash = await sha256Hex(input.value);
    if (hash === PASSWORD_HASH) {
      setUnlocked();
      render();
    } else {
      errorEl.textContent = "Mot de passe incorrect.";
      input.value = "";
      input.focus();
    }
  });
}

function isUnlocked() {
  try {
    return sessionStorage.getItem("gymlog:unlocked") === "1";
  } catch (e) {
    return false;
  }
}
function setUnlocked() {
  try {
    sessionStorage.setItem("gymlog:unlocked", "1");
  } catch (e) {}
}
