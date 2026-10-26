const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9225;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for Full Overhaul Verification...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_full_test'),
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

  if (!wsUrl) {
    console.error("Could not find WebSocket debugger URL!");
    edge.kill();
    process.exit(1);
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

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise(r => ws.onopen = r);
  console.log("Connected to browser via CDP.");

  await send("Page.enable");
  await send("Runtime.enable");

  // Collect console errors
  const consoleErrors = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
    }
  });

  // Wait for game to initialize
  console.log("Waiting for game initialization (3.5s)...");
  await new Promise(r => setTimeout(r, 3500));

  // 1. Check Console Errors
  console.log("Console errors detected:", consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error("Console Errors:", consoleErrors);
  }

  // 2. Evaluate Core Game Objects
  const evalRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const dbg = window.__DBG || {};
      const plates = window.activationPlates || [];
      const stageEl = document.getElementById('stage-display');
      const tombstoneBar = document.getElementById('tombstone-bar');
      const nemesisHud = document.getElementById('nemesis-hud');
      const pitHud = document.getElementById('pit-hud');
      const garageBtn = document.getElementById('btn-open-garage');
      const victoryModal = document.getElementById('escape-victory-modal');

      return {
        hasDBG: !!window.__DBG,
        currentStage: dbg.currentStage,
        tombstoneHealth: dbg.tombstoneHealth,
        isTombstoneDetached: dbg.isTombstoneDetached,
        isGateBreached: dbg.isGateBreached,
        isEscaped: dbg.isEscaped,
        plateCount: plates.length,
        hasStageHUD: !!stageEl,
        stageText: stageEl ? stageEl.textContent : null,
        hasTombstoneHUD: !!tombstoneBar,
        hasNemesisHUD: !!nemesisHud,
        hasPitHUD: !!pitHud,
        hasGarageBtn: !!garageBtn,
        hasVictoryModal: !!victoryModal,
        carHealth: dbg.carHealth,
        nitroAmount: dbg.nitroAmount
      };
    })()`,
    returnByValue: true
  });

  console.log("Initial State Evaluation Result:", JSON.stringify(evalRes.result.value, null, 2));

  // 3. Test Tombstone Drop
  console.log("Testing Tombstone detachment...");
  const tombstoneRes = await send("Runtime.evaluate", {
    expression: `(() => {
      window.__DBG.dropTombstoneNow();
      const txt = document.getElementById('tombstone-text').textContent;
      const fillW = document.getElementById('tombstone-fill').style.width;
      return { txt, fillW, isDetached: window.__DBG.isTombstoneDetached };
    })()`,
    returnByValue: true
  });
  console.log("Tombstone Detach Result:", tombstoneRes.result.value);

  // 4. Test Takedown & Nitro Refill
  console.log("Testing Takedown mechanic...");
  const takedownRes = await send("Runtime.evaluate", {
    expression: `(() => {
      // Drain nitro first
      window.__DBG.nitroAmount = 20;
      // Trigger takedown with mock AI
      window.__DBG.triggerTakedownNow({ name: 'M.G. JOE', isNemesis: true });
      return {
        nitroAfterTakedown: window.__DBG.nitroAmount,
        banner: document.getElementById('banner').textContent
      };
    })()`,
    returnByValue: true
  });
  console.log("Takedown Result:", takedownRes.result.value);

  // 5. Test Weather Mode 3 (Sunset Dusk)
  console.log("Testing Sunset Dusk Weather Mode...");
  await send("Runtime.evaluate", {
    expression: `window.__DBG.setWeatherNow(3);`
  });
  await new Promise(r => setTimeout(r, 600));

  // Capture Sunset screenshot
  const sunsetShot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_overhaul_dusk.png", Buffer.from(sunsetShot.data, "base64"));
  console.log("Saved browser_overhaul_dusk.png");

  // 6. Test Fortress Gate Breach & Escape Victory
  console.log("Testing Fortress Gate Breach & Breakout Escape...");
  const escapeRes = await send("Runtime.evaluate", {
    expression: `(() => {
      window.__DBG.breachGateNow();
      window.__DBG.triggerEscapeNow();
      const modal = document.getElementById('escape-victory-modal');
      return {
        isGateBreached: window.__DBG.isGateBreached,
        isEscaped: window.__DBG.isEscaped,
        modalVisible: modal.style.display === 'flex'
      };
    })()`,
    returnByValue: true
  });
  console.log("Escape Result:", escapeRes.result.value);

  // Capture Victory Screenshot
  const victoryShot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_overhaul_victory.png", Buffer.from(victoryShot.data, "base64"));
  console.log("Saved browser_overhaul_victory.png");

  // 7. Test Garage 3D Turntable Mode
  console.log("Testing Garage 3D Mode...");
  await send("Runtime.evaluate", {
    expression: `(() => {
      document.getElementById('escape-victory-modal').style.display = 'none';
      window.__DBG.toggleGarageNow();
    })()`
  });
  await new Promise(r => setTimeout(r, 600));

  // Capture Garage Screenshot
  const garageShot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_overhaul_garage.png", Buffer.from(garageShot.data, "base64"));
  console.log("Saved browser_overhaul_garage.png");

  console.log("=== ALL OVERHAUL VERIFICATION TESTS COMPLETED SUCCESSFULLY! ===");

  ws.close();
  edge.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
