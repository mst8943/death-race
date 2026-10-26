const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9244;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for immersive garage verification...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_garage_test'),
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

  if (!wsUrl) throw new Error("Could not connect to Edge DevTools");

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

  const errors = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === "Runtime.exceptionThrown") {
      errors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception ? msg.params.exceptionDetails.exception.description : ''));
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

  await new Promise(r => setTimeout(r, 2000));

  console.log("=== STEP 1: DISMISS LAUNCHER & OPEN IMMERSIVE GARAGE ===");
  const openRes = await send("Runtime.evaluate", {
    expression: `(() => {
      if (typeof selectGameMode === 'function') selectGameMode('peaceful');
      window.toggleGarage();
      return {
        garageModeActive: garageModeActive,
        showroomVisible: garageShowroomGroup.visible,
        carPosY: +chassisBody.position.y.toFixed(2),
        modalOpen: document.getElementById('garage-modal').classList.contains('open'),
        hasStatsCard: !!document.getElementById('garage-stats-card'),
        hasBottomBar: !!document.getElementById('garage-bottom-bar')
      };
    })()`,
    returnByValue: true
  });
  console.log("Garage open check:", JSON.stringify(openRes.result.value, null, 2));

  console.log("=== STEP 2: TEST CAMERA PRESETS & TURNTABLE TOGGLE ===");
  const camRes = await send("Runtime.evaluate", {
    expression: `(() => {
      window.setGarageCameraPreset('weapons');
      const wDist = targetOrbitDist;
      window.setGarageCameraPreset('engine');
      const ePitch = targetOrbitPitch;
      window.setGarageCameraPreset('tombstone');
      const tYaw = targetOrbitYaw;
      window.setGarageCameraPreset('overview');
      window.toggleGarageTurntable();
      const autoSpin1 = garageAutoSpin;
      window.toggleGarageTurntable();
      const autoSpin2 = garageAutoSpin;
      return {
        wDist, ePitch, tYaw, autoSpin1, autoSpin2
      };
    })()`,
    returnByValue: true
  });
  console.log("Camera preset check:", JSON.stringify(camRes.result.value, null, 2));

  console.log("=== STEP 3: TEST UPGRADES & DYNAMIC 3D VISUAL MODS ===");
  const upgRes = await send("Runtime.evaluate", {
    expression: `(() => {
      // Add credits and purchase upgrades
      playerCredits = 500000;
      window.upgradeItem('engine');
      window.upgradeItem('armor');
      window.upgradeItem('gun');
      window.upgradeItem('rocket');
      window.triggerTestEngineRev();
      return {
        engineLvl: upgrades.engine,
        armorLvl: upgrades.armor,
        gunLvl: upgrades.gun,
        rocketLvl: upgrades.rocket,
        blowerVisible: blowerGroup.visible,
        armorVisualVisible: armorVisualGroup.visible,
        gunVisualVisible: gunVisualGroup.visible,
        rocketVisualVisible: rocketVisualGroup.visible,
        speedValText: document.getElementById('stat-val-speed').textContent,
        armorValText: document.getElementById('stat-val-armor').textContent
      };
    })()`,
    returnByValue: true
  });
  console.log("Upgrade and visual mods check:", JSON.stringify(upgRes.result.value, null, 2));

  // Let render loop catch up for 1 second
  await new Promise(r => setTimeout(r, 1200));

  console.log("=== STEP 4: CAPTURE HIGH-RES SCREENSHOT OF REALISTIC GARAGE ===");
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_realistic_garage.png", Buffer.from(shot.data, "base64"));
  console.log("Saved screenshot: browser_realistic_garage.png");

  console.log("=== STEP 5: TEST EXITING GARAGE & RETURNING TO TRACK ===");
  const exitRes = await send("Runtime.evaluate", {
    expression: `(() => {
      window.toggleGarage();
      return {
        garageModeActive: garageModeActive,
        showroomVisible: garageShowroomGroup.visible,
        carPosY: +chassisBody.position.y.toFixed(2),
        modalOpen: document.getElementById('garage-modal').classList.contains('open')
      };
    })()`,
    returnByValue: true
  });
  console.log("Garage exit check:", JSON.stringify(exitRes.result.value, null, 2));

  console.log("Total errors detected:", errors.length);
  if (errors.length > 0) {
    console.error("Errors:", errors);
  }

  ws.close();
  edge.kill();

  if (errors.length > 0) process.exit(1);
  console.log("ALL REALISTIC GARAGE TESTS PASSED WITH 0 ERRORS!");
  process.exit(0);
}

run().catch(e => { console.error("Test failed:", e); process.exit(1); });
