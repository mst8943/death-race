const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for 3X Serpentine Track Test...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_new_track'),
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

  // Wait 3.5 seconds for game physics and road initialization
  await new Promise(r => setTimeout(r, 3500));

  // Inspect game track stats
  const trackStatsRes = await send("Runtime.evaluate", {
    expression: `(() => {
      return {
        trackWaypointsCount: typeof TRACK_WAYPOINTS !== 'undefined' ? TRACK_WAYPOINTS.length : 0,
        trackSteps: typeof NUM_TRACK_STEPS !== 'undefined' ? NUM_TRACK_STEPS : 0,
        trackLength: typeof TRACK_LENGTH !== 'undefined' ? Math.round(TRACK_LENGTH) : 0,
        checkpointsCount: typeof CHECKPOINTS !== 'undefined' ? CHECKPOINTS.length : 0,
        platesCount: typeof activationPlates !== 'undefined' ? activationPlates.length : 0,
        destructiblePolesCount: typeof destructiblePoles !== 'undefined' ? destructiblePoles.length : 0,
        aiCount: typeof aiOpponents !== 'undefined' ? aiOpponents.length : 0,
        playerPos: typeof chassisBody !== 'undefined' ? {
          x: Math.round(chassisBody.position.x * 10) / 10,
          y: Math.round(chassisBody.position.y * 10) / 10,
          z: Math.round(chassisBody.position.z * 10) / 10
        } : null,
        radarExists: !!document.getElementById('radar-canvas')
      };
    })()`,
    returnByValue: true
  });

  console.log("Track Stats:", JSON.stringify(trackStatsRes.result.value, null, 2));

  // Screenshot 1: At Start Line
  const snap1 = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, 'browser_new_3x_track_start.png'), Buffer.from(snap1.data, 'base64'));
  console.log("Saved browser_new_3x_track_start.png");

  // Drive forward with full throttle & nitro for 3.5 seconds
  await send("Runtime.evaluate", {
    expression: `(() => {
      window.KEYS['w'] = true;
      window.KEYS['shift'] = true;
    })()`
  });

  await new Promise(r => setTimeout(r, 3500));

  // Inspect driving stats
  const driveStatsRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const pos = chassisBody.position;
      const speed = Math.round(chassisBody.velocity.length() * 3.6);
      return {
        x: Math.round(pos.x * 10) / 10,
        y: Math.round(pos.y * 10) / 10,
        z: Math.round(pos.z * 10) / 10,
        speedKmh: speed,
        aiPositions: aiOpponents.map(ai => ({
          name: ai.name,
          speed: Math.round(ai.chassisBody.velocity.length() * 3.6),
          z: Math.round(ai.chassisBody.position.z * 10) / 10
        }))
      };
    })()`,
    returnByValue: true
  });

  console.log("Driving Stats after 3.5s:", JSON.stringify(driveStatsRes.result.value, null, 2));

  // Screenshot 2: Driving on the circuit
  const snap2 = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, 'browser_new_3x_track_driving.png'), Buffer.from(snap2.data, 'base64'));
  console.log("Saved browser_new_3x_track_driving.png");

  // Release keys
  await send("Runtime.evaluate", {
    expression: `(() => {
      window.KEYS['w'] = false;
      window.KEYS['shift'] = false;
    })()`
  });

  edge.kill();
  console.log("Test finished successfully!");
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
