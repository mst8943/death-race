const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for Covered Factory & Container Yard Test...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_factory_test'),
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

  // Wait 2.5s for initial assets
  await new Promise(r => setTimeout(r, 2500));

  // Select Peaceful Test Mode
  await send("Runtime.evaluate", {
    expression: `window.setGameMode('peaceful', true)`
  });

  await new Promise(r => setTimeout(r, 1000));

  // 1. Teleport player into the COVERED FACTORY HANGAR
  console.log("Teleporting inside the Covered Factory Hangar (X=65.5, Z=0)...");
  await send("Runtime.evaluate", {
    expression: `(() => {
      chassisBody.position.set(65.5, 1.8, 0);
      chassisBody.quaternion.set(0, 0, 0, 1); // facing +Z
      chassisBody.velocity.set(0, 0, 0);
      chassisBody.angularVelocity.set(0, 0, 0);
    })()`
  });

  // Let Three.js render 1.5s
  await new Promise(r => setTimeout(r, 1500));

  // Inspect factory state
  const factoryRes = await send("Runtime.evaluate", {
    expression: `(() => {
      return {
        pos: { x: chassisBody.position.x, y: chassisBody.position.y, z: chassisBody.position.z },
        insideHangarState: window.insideHangarState,
        crushersCount: HANGAR_CRUSHERS.length
      };
    })()`,
    returnByValue: true
  });
  console.log("Inside Factory State:", factoryRes.result.value);

  // Capture screenshot: Inside the Covered Factory Hangar
  const snapFactory = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, 'browser_inside_covered_factory.png'), Buffer.from(snapFactory.data, 'base64'));
  console.log("Saved browser_inside_covered_factory.png");

  // Drive forward inside factory for 2 seconds
  await send("Runtime.evaluate", {
    expression: `window.KEYS['w'] = true;`
  });
  await new Promise(r => setTimeout(r, 2000));
  await send("Runtime.evaluate", {
    expression: `window.KEYS['w'] = false;`
  });

  // 2. Teleport to the CONTAINER YARD (North Straight)
  console.log("Teleporting to the Container Port Yard (X=169.0, Z=50)...");
  await send("Runtime.evaluate", {
    expression: `(() => {
      chassisBody.position.set(169.0, 1.8, 50);
      chassisBody.quaternion.setFromEuler(0, Math.PI, 0); // facing -Z along track
      chassisBody.velocity.set(0, 0, 0);
      chassisBody.angularVelocity.set(0, 0, 0);
    })()`
  });

  await new Promise(r => setTimeout(r, 1500));

  // Capture screenshot: Container Yard
  const snapContainers = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, 'browser_container_yard.png'), Buffer.from(snapContainers.data, 'base64'));
  console.log("Saved browser_container_yard.png");

  edge.kill();
  console.log("Test finished successfully!");
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
