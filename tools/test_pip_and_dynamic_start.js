const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9229;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("=== TESTING TAKEDOWN PIP CAM & DYNAMIC START ===");
  const profileDir = path.join(__dirname, 'edge_profile_pip');
  if (fs.existsSync(profileDir)) {
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}
  }

  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + profileDir,
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
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(msg.error);
      else p.resolve(msg.result);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send("Page.enable");
  await send("Runtime.enable");

  const errors = [];
  ws.addEventListener('message', e => {
    const d = JSON.parse(e.data);
    if (d.method === 'Runtime.consoleAPICalled') {
      const type = d.params.type;
      const text = d.params.args.map(a => a.value || a.description || '').join(' ');
      if (type === 'error') {
        console.error('[BROWSER ERROR]', text);
        errors.push(text);
      }
    }
  });

  // Step 1: Wait 1s and check modal dynamic response
  await new Promise(r => setTimeout(r, 1200));

  console.log("Checking modal cards and early readiness...");
  const initCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.getElementById('mode-select-modal');
      const cards = document.querySelectorAll('.mode-choice-card');
      return {
        modalOpen: modal && modal.classList.contains('open'),
        cardsCount: cards.length,
        isGameReady: window.isGameReady,
        hasPipContainer: !!document.getElementById('takedown-pip-container'),
        hasPipCanvas: !!document.getElementById('pip-canvas')
      };
    })()`,
    returnByValue: true
  });
  console.log("Init Check:", initCheck.result.value);

  // Step 2: Click card dynamically
  console.log("Clicking Death Race card...");
  const clickRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const card = document.querySelector('.mode-choice-card');
      handleCardSelect(card, 'deathrace');
      return {
        cardSelected: card.classList.contains('selected'),
        modalClosing: document.getElementById('mode-select-modal').classList.contains('closing'),
        isGameStarted: window.isGameStarted
      };
    })()`,
    returnByValue: true
  });
  console.log("Card Click Result:", clickRes.result.value);

  // Wait 300ms for modal closing transition
  await new Promise(r => setTimeout(r, 300));

  const modalClosedCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.getElementById('mode-select-modal');
      return {
        modalStillOpen: modal && modal.classList.contains('open')
      };
    })()`,
    returnByValue: true
  });
  console.log("Modal Closed Check:", modalClosedCheck.result.value);

  // Step 3: Trigger Takedown on an AI vehicle
  console.log("Triggering Takedown to test Corner PiP Camera & Main Camera Lock...");
  const takedownRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const victim = window.aiOpponents[0];
      const origCamPos = { x: window.camera.position.x, y: window.camera.position.y, z: window.camera.position.z };
      window.triggerTakedown(victim);

      const pipEl = document.getElementById('takedown-pip-container');
      const pipActive = pipEl ? pipEl.classList.contains('active') : false;
      const victimTitle = document.getElementById('pip-victim-title') ? document.getElementById('pip-victim-title').textContent : '';

      return {
        victimName: victim.name,
        pipActive,
        victimTitle,
        origCamPos,
        mainCamPos: { x: window.camera.position.x, y: window.camera.position.y, z: window.camera.position.z }
      };
    })()`,
    returnByValue: true
  });
  console.log("Takedown PiP Result:", takedownRes.result.value);

  // Let PiP camera render for 800ms
  await new Promise(r => setTimeout(r, 800));

  // Verify main camera is following Frankenstein and NOT switched to victim
  const camVerification = await send("Runtime.evaluate", {
    expression: `(() => {
      const playerPos = window.chassisBody.position;
      const camPos = window.camera.position;
      const distToPlayer = Math.hypot(camPos.x - playerPos.x, camPos.z - playerPos.z);

      const victimPos = window.aiOpponents[0].chassisBody.position;
      const distToVictim = Math.hypot(camPos.x - victimPos.x, camPos.z - victimPos.z);

      return {
        mainCamNearPlayer: distToPlayer < 25.0,
        distToPlayer: distToPlayer.toFixed(2),
        distToVictim: distToVictim.toFixed(2),
        takedownPipActive: window.takedownPipActive
      };
    })()`,
    returnByValue: true
  });
  console.log("Camera Verification:", camVerification.result.value);

  // Take screenshot while PiP camera is active in the corner
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_pip_takedown.png", Buffer.from(shot.data, 'base64'));
  console.log("Saved browser_pip_takedown.png");

  // Wait 2.2s for PiP timer to expire and auto-close
  await new Promise(r => setTimeout(r, 2200));

  const pipAutoCloseCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const pipEl = document.getElementById('takedown-pip-container');
      return {
        pipStillActive: pipEl && pipEl.classList.contains('active'),
        takedownPipActive: window.takedownPipActive
      };
    })()`,
    returnByValue: true
  });
  console.log("PiP Auto-Close Check:", pipAutoCloseCheck.result.value);

  console.log("\nTotal Console Errors:", errors.length);
  edge.kill();
  process.exit(errors.length > 0 ? 1 : 0);
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
