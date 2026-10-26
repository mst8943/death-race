const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9227;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("=== STARTING COMPREHENSIVE RAMP PHYSICS & ALL-MECHANICS VERIFICATION ===");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_ramp_verify'),
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

  const consoleErrors = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
    }
  });

  console.log("Waiting for game load (3.5s)...");
  await new Promise(r => setTimeout(r, 3500));

  console.log("Console errors detected:", consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error("Console Errors:", consoleErrors);
  }

  // 1. AUDIT PHYSICAL RAMPS & CANNON BODIES
  console.log("\n--- TEST 1: AUDITING PHYSICAL RAMPS & CANNON BODIES ---");
  const rampAudit = await send("Runtime.evaluate", {
    expression: `(() => {
      const ramps = window.activeTrackRamps || [];
      const worldBodies = window.world ? window.world.bodies.length : 0;
      
      // Check bodies near ramp 1 (Z=320) and ramp 4 (Z=835)
      const ramp1Body = window.world ? window.world.bodies.find(b => Math.abs(b.position.z - 320) < 5) : null;
      const ramp4Body = window.world ? window.world.bodies.find(b => Math.abs(b.position.z - 835) < 5) : null;
      
      // Check Fortress Gate bodies
      const pillarL = window.world ? window.world.bodies.find(b => Math.abs(b.position.x - -16) < 2 && Math.abs(b.position.z - 810) < 2) : null;
      const gateDoor = window.world ? window.world.bodies.find(b => Math.abs(b.position.x) < 2 && Math.abs(b.position.z - 810) < 2) : null;
      const shipDeck = window.world ? window.world.bodies.find(b => Math.abs(b.position.z - 940) < 5) : null;

      return {
        rampCount: ramps.length,
        totalWorldBodies: worldBodies,
        ramp1Exists: !!ramp1Body,
        ramp1ShapeCount: ramp1Body ? ramp1Body.shapes.length : 0,
        ramp4Exists: !!ramp4Body,
        pillarExists: !!pillarL,
        gateDoorExists: !!gateDoor,
        shipDeckExists: !!shipDeck
      };
    })()`,
    returnByValue: true
  });
  console.log("Ramp & Structure Physics Audit:", JSON.stringify(rampAudit.result.value, null, 2));

  // 2. TEST CAR ELEVATION ON RAMP (NO MORE PHASING THROUGH!)
  console.log("\n--- TEST 2: TESTING REAL VEHICLE ELEVATION & JUMP ON RAMP ---");
  // Teleport car right in front of Ramp 1 (Z = 295) with forward velocity of 120 km/h (33.3 m/s)
  const jumpTestRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const chassis = window.chassisBody;
      chassis.position.set(0, 0.85, 295);
      chassis.velocity.set(0, 0, 38.0); // 136 km/h forward
      chassis.quaternion.set(0, 0, 0, 1);
      chassis.angularVelocity.set(0, 0, 0);

      // Measure height over 15 frames as car travels up and launches off the ramp
      const samples = [];
      for (let f = 0; f < 18; f++) {
        // Step physics forward 0.02s
        window.world.step(0.02);
        samples.push({
          z: parseFloat(chassis.position.z.toFixed(2)),
          y: parseFloat(chassis.position.y.toFixed(2)),
          vy: parseFloat(chassis.velocity.y.toFixed(2))
        });
      }

      return {
        initialY: 0.85,
        peakY: Math.max(...samples.map(s => s.y)),
        elevated: Math.max(...samples.map(s => s.y)) > 2.8,
        samples: samples.filter((_, i) => i % 3 === 0)
      };
    })()`,
    returnByValue: true
  });
  console.log("Ramp Jump Elevation Result:", JSON.stringify(jumpTestRes.result.value, null, 2));

  // Capture Screenshot of Car on the Ramp
  const rampShot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_ramp_jump_verified.png", Buffer.from(rampShot.data, "base64"));
  console.log("Saved browser_ramp_jump_verified.png");

  // 3. TEST REARVIEW CAMERA (V KEY)
  console.log("\n--- TEST 3: REARVIEW CAMERA MATH VERIFICATION (V KEY) ---");
  const rearCamRes = await send("Runtime.evaluate", {
    expression: `(() => {
      window.KEYS['v'] = true;
      window.updateCamera(0.016);
      window.KEYS['v'] = false;
      const camPos = { x: window.camera.position.x, y: window.camera.position.y, z: window.camera.position.z };
      const carPos = { x: window.carGroup.position.x, y: window.carGroup.position.y, z: window.carGroup.position.z };
      // When car is facing +Z, rearview camera should be behind the car (z < carPos.z)
      const isBehindCar = camPos.z <= carPos.z + 0.1;
      return { camPos, carPos, isBehindCar };
    })()`,
    returnByValue: true
  });
  console.log("Rearview Camera Result:", rearCamRes.result.value);

  // 4. TEST ALL WEAPONS & SKILLS UNLOCKED
  console.log("\n--- TEST 4: VERIFYING ALL WEAPONS & SKILLS TRIGGER IMMEDIATELY ---");
  const weaponsRes = await send("Runtime.evaluate", {
    expression: `(() => {
      // Test EMP
      window.__DBG.triggerEMPNow();
      const empBanner = document.getElementById('banner').textContent;

      // Test Mine
      window.__DBG.deployMineNow();
      const mineBanner = document.getElementById('banner').textContent;

      // Test Spikes
      window.__DBG.deploySpikesNow();
      const spikesBanner = document.getElementById('banner').textContent;

      // Test Shunt
      window.__DBG.performShuntNow('left');

      // Test Bullet-time
      window.__DBG.toggleBulletTimeNow();
      const btBanner = document.getElementById('banner').textContent;

      // Test Airstrike
      window.__DBG.callAirstrikeNow();
      const airBanner = document.getElementById('banner').textContent;

      return {
        empBanner,
        mineBanner,
        spikesBanner,
        btBanner,
        airBanner,
        allUnlocked: !empBanner.includes('KİLİTLİ') && !mineBanner.includes('KİLİTLİ')
      };
    })()`,
    returnByValue: true
  });
  console.log("Weapons & Skills Unlocked Result:", weaponsRes.result.value);

  // 5. TEST REFINERY EXPLODING FUEL SILOS
  console.log("\n--- TEST 5: TESTING REFINERY EXPLODING SILOS ---");
  const siloRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const silo = window.targets.find(t => t.hp === 80);
      if (!silo) return { found: false };
      const initialHP = silo.hp;
      silo.onHit(85); // Deal lethal hit
      return {
        found: true,
        initialHP,
        isDead: silo.isDead,
        banner: document.getElementById('banner').textContent
      };
    })()`,
    returnByValue: true
  });
  console.log("Refinery Silo Detonation Result:", siloRes.result.value);

  // 6. TEST ROLL-OVER SELF-RIGHTING
  console.log("\n--- TEST 6: TESTING ROLL-OVER AUTO-RECOVERY ---");
  const rollRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const chassis = window.chassisBody;
      // Flip upside down: rotate 180 degrees around Z axis
      chassis.quaternion.setFromEuler(0, 0, Math.PI);
      chassis.velocity.set(0, 0, 0);
      
      // Simulate 1.2s upside down
      window.updateRollOverRecovery(1.3);

      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(window.carGroup.quaternion);
      return {
        recoveredUpY: up.y,
        isUpright: up.y > 0.7,
        posY: chassis.position.y
      };
    })()`,
    returnByValue: true
  });
  console.log("Roll-Over Recovery Result:", rollRes.result.value);

  // Capture final screenshot
  const finalShot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_full_physics_verified.png", Buffer.from(finalShot.data, "base64"));
  console.log("Saved browser_full_physics_verified.png");

  console.log("\n=== ALL RAMP PHYSICS, COLLISION & MECHANIC TESTS COMPLETED! ===");

  ws.close();
  edge.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
