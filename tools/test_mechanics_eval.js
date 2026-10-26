const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9231;
const URL = "http://localhost:8766/index.html";

async function run() {
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_eval_v2'),
    URL
  ]);

  let wsUrl = null;
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 400));
    try {
      const res = await fetch(`http://localhost:${PORT}/json`);
      const tabs = await res.json();
      const page = tabs.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) { wsUrl = page.webSocketDebuggerUrl; break; }
    } catch (e) {}
  }

  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  const errs = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === "Runtime.exceptionThrown") {
      errs.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception ? msg.params.exceptionDetails.exception.description : ''));
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send("Page.enable");
  await send("Runtime.enable");

  await new Promise(r => setTimeout(r, 3500));

  const testReport = await send("Runtime.evaluate", {
    expression: `(() => {
      const report = {};
      window.resetCooldowns();

      // 1. Skull Plate Activation
      try {
        const skullPlate = window.activationPlates.find(p => p.type === 'skull');
        window.chassisBody.position.set(skullPlate.x, 0.85, skullPlate.z);
        window.updateActivationPlates(0.02);
        report.skullPlate = {
          ok: true,
          cooldown: skullPlate.cooldown,
          crushersCount: window.HANGAR_CRUSHERS.length,
          crusher0Y: window.HANGAR_CRUSHERS[0] ? window.HANGAR_CRUSHERS[0].group.position.y : null
        };
      } catch(e) { report.skullPlate = { ok: false, error: e.message }; }

      // 2. EMP Shockwave Stun
      try {
        window.resetCooldowns();
        const ai = window.aiOpponents[0];
        ai.chassisBody.position.set(0, 0.85, 10);
        window.chassisBody.position.set(0, 0.85, 0);
        window.triggerEMPBlast();
        report.emp = { ok: true, aiStunTimer: ai.empStunTimer, isStunned: ai.empStunTimer > 2.0 };
      } catch(e) { report.emp = { ok: false, error: e.message }; }

      // 3. Sticky Mine
      try {
        window.resetCooldowns();
        window.deployStickyMine();
        const mine = window.activeMines[window.activeMines.length - 1];
        report.mine = { ok: true, activeCount: window.activeMines.length, hasLed: !!(mine && mine.led) };
      } catch(e) { report.mine = { ok: false, error: e.message }; }

      // 4. Spike Strip
      try {
        window.resetCooldowns();
        window.deploySpikeStrip();
        report.spikes = { ok: true, count: window.activeSpikeStrips.length };
      } catch(e) { report.spikes = { ok: false, error: e.message }; }

      // 5. Side Shunt
      try {
        window.resetCooldowns();
        window.performSideShunt('left');
        window.resetCooldowns();
        window.performSideShunt('right');
        report.shunt = { ok: true };
      } catch(e) { report.shunt = { ok: false, error: e.message }; }

      // 6. Bullet Time
      try {
        window.resetCooldowns();
        window.toggleBulletTime();
        report.bulletTime = { ok: true, timeScale: window.timeScale, remaining: window.bulletTimeRemaining };
        window.timeScale = 1.0;
      } catch(e) { report.bulletTime = { ok: false, error: e.message }; }

      // 7. Airstrike
      try {
        window.resetCooldowns();
        window.callHelicopterStrike();
        report.airstrike = { ok: true };
      } catch(e) { report.airstrike = { ok: false, error: e.message }; }

      // 8. Ramps & Speed Bumps
      try {
        report.ramps = { count: window.activeTrackRamps.length };
        report.speedBumps = { count: window.activeSpeedBumps.length };
      } catch(e) { report.ramps = { ok: false, error: e.message }; }

      // 9. Post Race Stats
      try {
        window.showPostRaceStats(false);
        const modal = document.getElementById('post-race-modal');
        report.postRace = { ok: true, displayed: modal.style.display === 'flex' };
        modal.style.display = 'none';
      } catch(e) { report.postRace = { ok: false, error: e.message }; }

      return report;
    })()`,
    returnByValue: true
  });

  console.log("=== COMPREHENSIVE MECHANICS EVALUATION REPORT ===");
  console.log(JSON.stringify(testReport.result.value, null, 2));

  // Take screenshot
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_full_mechanics_audit.png", Buffer.from(shot.data, "base64"));
  console.log("Saved screenshot: browser_full_mechanics_audit.png");

  console.log("Exceptions caught:", errs.length);
  if (errs.length > 0) console.error(errs);

  ws.close();
  edge.kill();
  process.exit(errs.length > 0 ? 1 : 0);
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
