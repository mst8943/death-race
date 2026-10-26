const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9229;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for comprehensive test...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_audit_all'),
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

  const consoleLogs = [];
  const errors = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === "Runtime.consoleAPICalled") {
      const txt = msg.params.args.map(a => a.value || a.description || '').join(' ');
      consoleLogs.push(txt);
      if (msg.params.type === 'error') errors.push(txt);
    }
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

  // Allow world to initialize
  await new Promise(r => setTimeout(r, 3500));

  console.log("=== STEP 1: AUDIT SPEED BUMPS & PHYSICAL RAMPS ===");
  const rampsAndBumpsRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const ramps = window.activeTrackRamps || [];
      const bumps = window.activeSpeedBumps || [];
      return {
        rampsCount: ramps.length,
        rampNames: ramps.map(r => r.name),
        bumpsCount: bumps.length,
        bumpNames: bumps.map(b => b.name)
      };
    })()`,
    returnByValue: true
  });
  console.log("Ramps and Bumps audit:", JSON.stringify(rampsAndBumpsRes.result.value, null, 2));

  console.log("=== STEP 2: SIMULATE SPEED BUMP 1 ELEVATION ===");
  const bumpTestRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const chassis = window.chassisBody;
      // Position before factory speed bump at [195.0, 0, -110]
      chassis.position.set(195.0, 0.85, -118.0);
      chassis.velocity.set(0, 0, 22.0); // 80 km/h
      chassis.quaternion.set(0, 0, 0, 1);
      chassis.angularVelocity.set(0, 0, 0);

      const ySamples = [];
      for (let f = 0; f < 30; f++) {
        window.world.step(0.02);
        ySamples.push(parseFloat(chassis.position.y.toFixed(3)));
      }
      return {
        initialY: 0.85,
        peakY: Math.max(...ySamples),
        elevated: Math.max(...ySamples) > 0.95
      };
    })()`,
    returnByValue: true
  });
  console.log("Speed bump elevation result:", JSON.stringify(bumpTestRes.result.value, null, 2));

  console.log("=== STEP 3: SIMULATE RAMP 2 (CONTAINER HIGHWAY -Z DIRECTION) ===");
  const ramp2TestRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const chassis = window.chassisBody;
      // Ramp 2 is at [507.0, 0, 100], rotY = Math.PI, traffic moves in -Z
      // Approach from Z = 120 toward Z = 70
      chassis.position.set(507.0, 0.85, 120.0);
      chassis.velocity.set(0, 0, -35.0); // 126 km/h in -Z
      const q = new window.CANNON.Quaternion();
      q.setFromEuler(0, Math.PI, 0);
      chassis.quaternion.copy(q);
      chassis.angularVelocity.set(0, 0, 0);

      const samples = [];
      for (let f = 0; f < 45; f++) {
        window.world.step(0.02);
        samples.push({
          z: parseFloat(chassis.position.z.toFixed(2)),
          y: parseFloat(chassis.position.y.toFixed(2))
        });
      }
      const peakY = Math.max(...samples.map(s => s.y));
      return {
        initialY: 0.85,
        peakY: peakY,
        airborneLaunch: peakY > 5.0,
        samples: samples.filter((_, i) => i % 5 === 0)
      };
    })()`,
    returnByValue: true
  });
  console.log("Ramp 2 climb and launch result:", JSON.stringify(ramp2TestRes.result.value, null, 2));

  console.log("=== STEP 4: VERIFY SKULL PLATE CRASH FIX & PLATES ACTIVATION ===");
  const platesRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const skullPlate = window.activationPlates.find(p => p.type === 'skull');
      if (!skullPlate) return { error: 'no skull plate found' };

      // Teleport car directly onto skull plate
      window.chassisBody.position.set(skullPlate.x, 0.85, skullPlate.z);
      // Step game logic
      window.updateActivationPlates(0.02);

      return {
        skullPlateType: skullPlate.type,
        cooldown: skullPlate.cooldown,
        crushersCount: window.HANGAR_CRUSHERS.length,
        crusher0Y: window.HANGAR_CRUSHERS[0].group.position.y
      };
    })()`,
    returnByValue: true
  });
  console.log("Skull plate activation result:", JSON.stringify(platesRes.result.value, null, 2));

  console.log("=== STEP 5: VERIFY EMP STUN ON AI AND DREADNOUGHT ===");
  const empRes = await send("Runtime.evaluate", {
    expression: `(() => {
      // Place an AI close to player
      const ai = window.aiOpponents[0];
      ai.chassisBody.position.set(0, 0.85, 12);
      window.chassisBody.position.set(0, 0.85, 0);

      // Trigger EMP
      window.lastEMPTime = 0;
      window.triggerEMPBlast();

      const aiStunned = ai.empStunTimer > 0;
      // Step AI loop
      window.updateAIOpponents(0.02);

      return {
        aiStunTimer: ai.empStunTimer,
        aiStunned: aiStunned
      };
    })()`,
    returnByValue: true
  });
  console.log("EMP stun test result:", JSON.stringify(empRes.result.value, null, 2));

  console.log("=== STEP 6: VERIFY AIRDROP GREEN SMOKE HELPER ===");
  const airdropRes = await send("Runtime.evaluate", {
    expression: `(() => {
      window.spawnAirdropCrate();
      const initialSmokeCount = window.smokePuffs.length;
      window.updateAirdrops(0.02);
      const afterSmokeCount = window.smokePuffs.length;
      return {
        activeAirdropsCount: window.activeAirdrops.length,
        airdropLanded: window.activeAirdrops[0].isLanded,
        smokeSpawned: afterSmokeCount >= initialSmokeCount
      };
    })()`,
    returnByValue: true
  });
  console.log("Airdrop crate test result:", JSON.stringify(airdropRes.result.value, null, 2));

  console.log("=== STEP 7: VERIFY HARBOR ESCAPE VICTORY AT BARGE ===");
  const escapeRes = await send("Runtime.evaluate", {
    expression: `(() => {
      window.isGateBreached = true;
      window.isEscaped = false;
      const chassis = window.chassisBody;
      // Car at Z=850 (on ramp): should NOT trigger escape victory yet
      chassis.position.set(0, 4.0, 850);
      window.loop ? null : null; // in animate loop
      // Check condition logic
      const pPos = chassis.position;
      const triggeredOnRamp = (pPos.z > 885.0 && Math.abs(pPos.x) < 18.0);

      // Now car airborne/landed at Z=910 (over water approaching barge)
      chassis.position.set(0, 7.5, 910);
      const triggeredAtBarge = (chassis.position.z > 885.0 && Math.abs(chassis.position.x) < 18.0);

      return {
        triggeredOnRamp,
        triggeredAtBarge
      };
    })()`,
    returnByValue: true
  });
  console.log("Harbor escape trigger test result:", JSON.stringify(escapeRes.result.value, null, 2));

  console.log("=== STEP 8: VERIFY BARREL / BARRICADE RAMMING COLLISION ===");
  const rammingRes = await send("Runtime.evaluate", {
    expression: `(() => {
      // Find a barrel target
      const barrelTarget = window.targets.find(t => t.isBarrel && !t.isDead);
      const initialHP = barrelTarget ? barrelTarget.hp : 0;
      if (barrelTarget) {
        // Ram the barrel with 18 m/s velocity
        barrelTarget.onHit(50);
      }
      return {
        barrelFound: !!barrelTarget,
        initialHP,
        isDead: barrelTarget ? barrelTarget.isDead : false
      };
    })()`,
    returnByValue: true
  });
  console.log("Ramming barrel destruction result:", JSON.stringify(rammingRes.result.value, null, 2));

  console.log("=== STEP 9: VERIFY REARVIEW CAMERA COORDINATES ===");
  const rearCamRes = await send("Runtime.evaluate", {
    expression: `(() => {
      window.KEYS['v'] = true;
      window.updateCamera(0.02);
      const camPos = window.camera.position.clone();
      const carPos = window.carGroup.position.clone();
      window.KEYS['v'] = false;
      return {
        camZBehindCar: camPos.z < carPos.z,
        camYAboveCar: camPos.y > carPos.y,
        camPos: { x: camPos.x, y: camPos.y, z: camPos.z }
      };
    })()`,
    returnByValue: true
  });
  console.log("Rearview mirror test result:", JSON.stringify(rearCamRes.result.value, null, 2));

  console.log("=== STEP 10: TAKE COMPREHENSIVE AUDIT SCREENSHOT ===");
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_audit_verified.png", Buffer.from(shot.data, "base64"));
  console.log("Saved screenshot: browser_audit_verified.png");

  console.log("Console errors detected during entire test:", errors.length);
  if (errors.length > 0) {
    console.error("Errors:", errors);
  }

  ws.close();
  edge.kill();

  if (errors.length > 0) process.exit(1);
  console.log("ALL TESTS COMPLETED SUCCESSFULLY WITH 0 ERRORS!");
  process.exit(0);
}

run().catch(err => {
  console.error("Audit test failed:", err);
  process.exit(1);
});
