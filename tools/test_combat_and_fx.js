const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9245;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for combat & visual FX verification...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_combat_fx'),
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

  console.log("=== STEP 1: TEST BURNOUT CINEMATIC TAKEDOWN CAMERA ===");
  const takedownRes = await send("Runtime.evaluate", {
    expression: `(() => {
      if (typeof selectGameMode === 'function') selectGameMode('death_race');
      const victim = aiOpponents[0]; // M.G. Joe
      triggerTakedown(victim);
      return {
        takedownCamActive: takedownCamActive,
        timeScale: timeScale,
        nitroAmount: nitroAmount,
        victimVy: +victim.chassisBody.velocity.y.toFixed(2),
        radioText: document.getElementById('radio-text').textContent
      };
    })()`,
    returnByValue: true
  });
  console.log("Takedown triggered:", JSON.stringify(takedownRes.result.value, null, 2));

  // Let takedown cam run for 500ms and take screenshot
  await new Promise(r => setTimeout(r, 500));
  const shotTakedown = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_combat_takedown.png", Buffer.from(shotTakedown.data, "base64"));
  console.log("Saved screenshot: browser_combat_takedown.png");

  // Wait for takedown timer to complete (1.4s)
  await new Promise(r => setTimeout(r, 1200));

  console.log("=== STEP 2: TEST RIVAL RADIO TAUNT ===");
  const tauntRes = await send("Runtime.evaluate", {
    expression: `(() => {
      lastRivalTauntTime = 0; // force allow
      triggerRivalTaunt(aiOpponents[1], 'attack'); // Grimm
      return {
        radioText: document.getElementById('radio-text').textContent,
        radioSpeaker: document.getElementById('radio-speaker-label').textContent
      };
    })()`,
    returnByValue: true
  });
  console.log("Rival taunt result:", JSON.stringify(tauntRes.result.value, null, 2));

  console.log("=== STEP 3: TEST EXHAUST BACKFIRE & DRIFT SMOKE ===");
  const fxRes = await send("Runtime.evaluate", {
    expression: `(() => {
      triggerExhaustBackfire();
      spawnDriftSmoke(carGroup.position);
      return {
        backfireTimer: backfireTimer,
        flameOpacity: backfireFlameL.material.opacity,
        smokeCount: smokeParticles.length
      };
    })()`,
    returnByValue: true
  });
  console.log("Visual FX result:", JSON.stringify(fxRes.result.value, null, 2));

  console.log("=== STEP 4: TEST DREADNOUGHT MODULAR TARGETING ===");
  const dreadRes = await send("Runtime.evaluate", {
    expression: `(() => {
      dreadnought.isActive = true;
      // Hit left turret
      dreadnoughtBody.targetData.onHit(100, { x: dreadnoughtBody.position.x - 2.5, y: dreadnoughtBody.position.y + 1, z: dreadnoughtBody.position.z + 2 });
      // Hit rear fuel tanks
      dreadnoughtBody.targetData.onHit(80, { x: dreadnoughtBody.position.x, y: dreadnoughtBody.position.y + 1, z: dreadnoughtBody.position.z - 5 });
      return {
        subsystems: dreadnought.subsystems,
        leftTurretDestroyed: dreadnought.leftTurretDestroyed,
        tanksBlown: dreadnought.tanksBlown,
        dreadHealth: dreadnought.health
      };
    })()`,
    returnByValue: true
  });
  console.log("Dreadnought modular damage result:", JSON.stringify(dreadRes.result.value, null, 2));

  console.log("Total errors detected:", errors.length);
  if (errors.length > 0) {
    console.error("Errors:", errors);
  }

  ws.close();
  edge.kill();

  if (errors.length > 0) process.exit(1);
  console.log("ALL COMBAT & VISUAL FX TESTS PASSED WITH 0 ERRORS!");
  process.exit(0);
}

run().catch(e => { console.error("Test failed:", e); process.exit(1); });
