const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for Mode Launcher Test...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_mode_launcher'),
    URL
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
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
  console.log("Connected to browser via CDP!");

  await send("Page.enable");
  await send("Runtime.enable");

  // Catch console errors
  ws.addEventListener('message', e => {
    const d = JSON.parse(e.data);
    if (d.method === 'Runtime.consoleAPICalled') {
      const type = d.params.type;
      const text = d.params.args.map(a => a.value || a.description || '').join(' ');
      if (type === 'error') console.log('[BROWSER ERROR]', text);
    }
  });

  // Wait 2.5s for initial DOM setup
  await new Promise(r => setTimeout(r, 2500));

  // Verify modal is open on start
  const modalRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.getElementById('mode-select-modal');
      return {
        modalExists: !!modal,
        isOpen: modal ? modal.classList.contains('open') : false,
        gameModeHudExists: !!document.getElementById('game-mode-hud')
      };
    })()`,
    returnByValue: true
  });
  console.log("Start Modal State:", modalRes.result.value);

  // Capture screenshot of the Mode Start Modal
  const snapModal = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, 'browser_mode_start_modal.png'), Buffer.from(snapModal.data, 'base64'));
  console.log("Saved browser_mode_start_modal.png");

  // Select Peaceful Mode (Barışçıl Modla Başla)
  await send("Runtime.evaluate", {
    expression: `window.setGameMode('peaceful', true)`
  });

  await new Promise(r => setTimeout(r, 1000));

  // Check state in Peaceful Mode
  const peacefulRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.getElementById('mode-select-modal');
      const elim = document.getElementById('elimination-hud');
      return {
        currentGameMode: window.currentGameMode,
        aiFireEnabled: window.aiFireEnabled,
        godMode: window.godMode,
        carHealth: window.carHealth,
        modalClosed: modal ? !modal.classList.contains('open') : false,
        elimHudText: elim ? elim.textContent : ''
      };
    })()`,
    returnByValue: true
  });
  console.log("Peaceful Mode State:", peacefulRes.result.value);

  // Capture screenshot of Peaceful mode active on track
  const snapPeace = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, 'browser_mode_peaceful_active.png'), Buffer.from(snapPeace.data, 'base64'));
  console.log("Saved browser_mode_peaceful_active.png");

  // Drive forward in peaceful mode for 3 seconds near AI cars
  await send("Runtime.evaluate", {
    expression: `(() => {
      window.KEYS['w'] = true;
      window.KEYS['shift'] = true;
    })()`
  });

  await new Promise(r => setTimeout(r, 3000));

  const driveRes = await send("Runtime.evaluate", {
    expression: `(() => {
      return {
        speedKmh: Math.round(chassisBody.velocity.length() * 3.6),
        carHealth: window.carHealth,
        godMode: window.godMode,
        aiFireEnabled: window.aiFireEnabled,
        bulletsInFlight: activeBullets.length
      };
    })()`,
    returnByValue: true
  });
  console.log("Driving under Peaceful Mode:", driveRes.result.value);

  // Toggle back to Death Race mode via shortcut 'P'
  await send("Runtime.evaluate", {
    expression: `window.toggleAIFire()`
  });

  await new Promise(r => setTimeout(r, 500));

  const combatRes = await send("Runtime.evaluate", {
    expression: `(() => {
      return {
        currentGameMode: window.currentGameMode,
        aiFireEnabled: window.aiFireEnabled,
        godMode: window.godMode
      };
    })()`,
    returnByValue: true
  });
  console.log("Toggled back to Death Race State:", combatRes.result.value);

  // Release keys
  await send("Runtime.evaluate", {
    expression: `(() => {
      window.KEYS['w'] = false;
      window.KEYS['shift'] = false;
    })()`
  });

  edge.kill();
  console.log("Mode Launcher Test completed successfully!");
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
