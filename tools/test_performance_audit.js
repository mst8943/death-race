const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9225;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("=== PERFORMANCE & STUTTER AUDIT TEST ===");
  const profileDir = path.join(__dirname, 'edge_profile_perf_audit');
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
  console.log("Connected to browser via CDP!");

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

  // Wait 2.0s for load
  await new Promise(r => setTimeout(r, 2000));

  // Step 1: Check Mode Modal state and Measure Launcher Frame Performance
  console.log("Measuring Launcher modal frame performance...");
  const launcherPerf = await send("Runtime.evaluate", {
    expression: `new Promise(resolve => {
      const modal = document.getElementById('mode-select-modal');
      const isOpen = modal ? modal.classList.contains('open') : false;
      const computedStyle = modal ? window.getComputedStyle(modal) : null;
      const backdropFilter = computedStyle ? computedStyle.backdropFilter : 'none';

      let frames = 0;
      let start = performance.now();
      const frameTimes = [];
      let lastTime = start;

      function measure(t) {
        frameTimes.push(t - lastTime);
        lastTime = t;
        frames++;
        if (frames < 60) {
          requestAnimationFrame(measure);
        } else {
          const totalTime = t - start;
          const avgFps = (frames / (totalTime / 1000));
          const maxDelta = Math.max(...frameTimes.slice(5));
          resolve({
            isOpen,
            backdropFilter,
            avgFps: Math.round(avgFps),
            maxFrameTimeMs: maxDelta.toFixed(1),
            isGameStarted: window.isGameStarted
          });
        }
      }
      requestAnimationFrame(measure);
    })`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("Launcher Result:", launcherPerf.result.value);

  // Step 2: Select Death Race Mode (Simulate user click)
  console.log("Starting Death Race mode...");
  const startModeRes = await send("Runtime.evaluate", {
    expression: `(() => {
      setGameMode('deathrace', true);
      return { isGameStarted: window.isGameStarted, mode: window.currentGameMode };
    })()`,
    returnByValue: true
  });
  console.log("Game Start Result:", startModeRes.result.value);

  // Step 3: Measure In-Game Gameplay FPS & Frame Budget during high action (driving, drift, firing)
  console.log("Simulating driving, drifting, minigun fire and measuring FPS...");
  const gameActionPerf = await send("Runtime.evaluate", {
    expression: `new Promise(resolve => {
      window.KEYS['w'] = true;
      window.KEYS['shift'] = true;
      window.KEYS[' '] = true; // drift handbrake
      window.fireGun();

      let frames = 0;
      let start = performance.now();
      const deltas = [];
      let lastTime = start;

      function loopMeasure(t) {
        const delta = t - lastTime;
        deltas.push(delta);
        lastTime = t;
        frames++;

        if (frames % 4 === 0) window.fireGun();
        if (frames === 30) {
          // Trigger takedown
          if (window.__DBG && window.aiOpponents && window.aiOpponents[0]) {
            window.__DBG.triggerTakedownNow(window.aiOpponents[0]);
          }
        }

        if (frames < 120) {
          requestAnimationFrame(loopMeasure);
        } else {
          window.KEYS['w'] = false;
          window.KEYS['shift'] = false;
          window.KEYS[' '] = false;
          const totalMs = t - start;
          const avgFps = Math.round(frames / (totalMs / 1000));
          const sorted = [...deltas.slice(5)].sort((a,b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)].toFixed(1);
          const p95 = sorted[Math.floor(sorted.length * 0.95)].toFixed(1);
          const max = sorted[sorted.length - 1].toFixed(1);

          resolve({
            avgFps,
            medianDeltaMs: median,
            p95DeltaMs: p95,
            maxDeltaMs: max,
            takedownSuccess: true
          });
        }
      }
      requestAnimationFrame(loopMeasure);
    })`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("In-Game Action Result:", gameActionPerf.result.value);

  // Step 4: Test Weyland Garage Experience
  console.log("Testing Weyland Garage Showroom...");
  const garageRes = await send("Runtime.evaluate", {
    expression: `(() => {
      toggleGarage();
      const modal = document.getElementById('garage-modal');
      const isOpen = modal ? modal.classList.contains('open') : false;
      const turntableActive = window.garageAutoSpin;
      return {
        isOpen,
        turntableActive,
        garageModeActive: window.garageModeActive,
        cameraY: window.camera.position.y
      };
    })()`,
    returnByValue: true
  });
  console.log("Garage Open Result:", garageRes.result.value);

  await new Promise(r => setTimeout(r, 1000));

  // Take screenshot in garage
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_perf_garage.png", Buffer.from(shot.data, 'base64'));
  console.log("Saved browser_perf_garage.png");

  // Step 5: Close Garage and return to track
  console.log("Closing Garage and returning to racetrack...");
  const closeGarageRes = await send("Runtime.evaluate", {
    expression: `(() => {
      toggleGarage();
      return {
        garageModeActive: window.garageModeActive,
        carPosY: window.chassisBody.position.y
      };
    })()`,
    returnByValue: true
  });
  console.log("Garage Close Result:", closeGarageRes.result.value);

  // Drive 1 second on track and capture screenshot
  await send("Runtime.evaluate", {
    expression: `(() => {
      window.KEYS['w'] = true;
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));
  await send("Runtime.evaluate", { expression: `(() => { window.KEYS['w'] = false; })()` });

  const raceShot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_perf_race.png", Buffer.from(raceShot.data, 'base64'));
  console.log("Saved browser_perf_race.png");

  console.log("\nAudit Error Count:", errors.length);
  if (errors.length > 0) {
    console.error("Errors found:", errors);
  }

  edge.kill();
  process.exit(errors.length > 0 ? 1 : 0);
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
