const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for 3X Mega Scale Track Test...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_mega_test'),
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

  // Wait for game init
  await new Promise(r => setTimeout(r, 2500));

  // Select Peaceful Test Mode
  await send("Runtime.evaluate", {
    expression: `window.setGameMode('peaceful', true)`
  });

  await new Promise(r => setTimeout(r, 1000));

  // 1. Inspect Track Statistics
  const trackStatsRes = await send("Runtime.evaluate", {
    expression: `(() => {
      return {
        trackWaypointsCount: TRACK_WAYPOINTS.length,
        trackSteps: NUM_TRACK_STEPS,
        trackWidth: TRACK_WIDTH,
        trackLength: Math.round(TRACK_LENGTH),
        checkpointsCount: CHECKPOINTS.length,
        platesCount: activationPlates.length,
        destructiblePolesCount: destructiblePoles.length,
        aiCount: aiOpponents.length,
        playerPos: { x: Math.round(chassisBody.position.x), y: Math.round(chassisBody.position.y * 10)/10, z: Math.round(chassisBody.position.z) },
        fogFar: scene.fog.far,
        cameraFar: camera.far
      };
    })()`,
    returnByValue: true
  });
  console.log("3X Mega Scale Track Stats:", JSON.stringify(trackStatsRes.result.value, null, 2));

  // Screenshot 1: Start Line
  const ss1 = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, '..', 'browser_mega_scale_start.png'), Buffer.from(ss1.data, 'base64'));
  console.log("Saved browser_mega_scale_start.png");

  // 2. Drive down the 800m straight at high speed for 3 seconds
  console.log("Pressing 'W' + 'Shift' (Nitro) to blast down the 800m Straightaway...");
  await send("Runtime.evaluate", {
    expression: `(() => {
      window.KEYS['w'] = true;
      window.KEYS['shift'] = true;
    })()`
  });

  await new Promise(r => setTimeout(r, 3000));

  const driveStatsRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const v = chassisBody.velocity;
      const speedKmh = Math.round(Math.sqrt(v.x * v.x + v.z * v.z) * 3.6);
      return {
        x: Math.round(chassisBody.position.x * 10) / 10,
        y: Math.round(chassisBody.position.y * 10) / 10,
        z: Math.round(chassisBody.position.z * 10) / 10,
        speedKmh: speedKmh,
        aiPositions: aiOpponents.map(a => ({ name: a.name, speed: Math.round(a.chassisBody.velocity.length() * 3.6), z: Math.round(a.chassisBody.position.z * 10) / 10 }))
      };
    })()`,
    returnByValue: true
  });
  console.log("Driving Stats along 800m Straight:", JSON.stringify(driveStatsRes.result.value, null, 2));

  // Release keys
  await send("Runtime.evaluate", {
    expression: `(() => {
      window.KEYS['w'] = false;
      window.KEYS['shift'] = false;
    })()`
  });

  const ss2 = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, '..', 'browser_mega_scale_driving.png'), Buffer.from(ss2.data, 'base64'));
  console.log("Saved browser_mega_scale_driving.png");

  // 3. Teleport into Covered Mega-Factory Hangar (X=196.5, Z=150)
  console.log("Teleporting inside the 570m Covered Mega-Factory (X=196.5, Z=150)...");
  await send("Runtime.evaluate", {
    expression: `(() => {
      chassisBody.position.set(196.5, 1.8, 150);
      chassisBody.quaternion.set(0, 0, 0, 1); // facing +Z
      chassisBody.velocity.set(0, 0, 0);
      chassisBody.angularVelocity.set(0, 0, 0);
    })()`
  });

  await new Promise(r => setTimeout(r, 1500));

  const factoryRes = await send("Runtime.evaluate", {
    expression: `(() => {
      return {
        pos: { x: Math.round(chassisBody.position.x), y: Math.round(chassisBody.position.y), z: Math.round(chassisBody.position.z) },
        insideHangarState: window.insideHangarState,
        crushersCount: HANGAR_CRUSHERS.length
      };
    })()`,
    returnByValue: true
  });
  console.log("Inside Mega Factory State:", factoryRes.result.value);

  const ss3 = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, '..', 'browser_mega_scale_factory.png'), Buffer.from(ss3.data, 'base64'));
  console.log("Saved browser_mega_scale_factory.png");

  // 4. Teleport into North Container Port Yard (X=507.0, Z=200)
  console.log("Teleporting into North Container Port Terminal (X=507.0, Z=200)...");
  await send("Runtime.evaluate", {
    expression: `(() => {
      chassisBody.position.set(507.0, 1.8, 200);
      chassisBody.quaternion.set(0, 0, 0, 1); // facing +Z
      chassisBody.velocity.set(0, 0, 0);
      chassisBody.angularVelocity.set(0, 0, 0);
    })()`
  });

  await new Promise(r => setTimeout(r, 1500));

  const yardRes = await send("Runtime.evaluate", {
    expression: `(() => {
      return {
        pos: { x: Math.round(chassisBody.position.x), y: Math.round(chassisBody.position.y), z: Math.round(chassisBody.position.z) },
        craneExists: !!window.craneStructure,
        dreadnoughtPos: { x: Math.round(dreadnoughtBody.position.x), z: Math.round(dreadnoughtBody.position.z) }
      };
    })()`,
    returnByValue: true
  });
  console.log("Container Yard State:", yardRes.result.value);

  const ss4 = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, '..', 'browser_mega_scale_container.png'), Buffer.from(ss4.data, 'base64'));
  console.log("Saved browser_mega_scale_container.png");

  ws.close();
  edge.kill();
  console.log("Test finished successfully!");
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
