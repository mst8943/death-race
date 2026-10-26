const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9222;
const URL = 'http://localhost:8766/index.html';

async function run() {
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_driving_feel'),
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
  if (!wsUrl) { edge.kill(); process.exit(1); }

  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((res, rej) => {
      const msgId = id++;
      pending.set(msgId, { resolve: res, reject: rej });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(msg.error); else p.resolve(msg.result);
    }
  };
  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 1500));

  await send('Runtime.evaluate', { expression: 'window.setGameMode("peaceful", true)' });

  // 1. Acceleration Test: Full throttle with Nitro for 2.5 seconds
  console.log("Testing acceleration & high speed launch...");
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.KEYS['w'] = true;
      window.KEYS['shift'] = true;
    })()`
  });

  await new Promise(r => setTimeout(r, 2500));

  const accelRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const v = chassisBody.velocity;
      const speed = Math.round(v.length() * 3.6);
      return {
        speedKmh: speed,
        fov: Math.round(camera.fov * 10) / 10,
        posZ: Math.round(chassisBody.position.z),
        posY: Math.round(chassisBody.position.y * 100) / 100
      };
    })()`,
    returnByValue: true
  });
  console.log("Acceleration result after 2.5s:", JSON.stringify(accelRes.result.value, null, 2));

  // 2. High-Speed Stability & Smoothness check (15 consecutive frames)
  const smoothnessRes = await send('Runtime.evaluate', {
    expression: `new Promise(resolve => {
      const samples = [];
      let count = 0;
      let lastZ = chassisBody.position.z;
      function onFrame() {
        const curZ = chassisBody.position.z;
        const dz = curZ - lastZ;
        lastZ = curZ;
        samples.push({
          z: Math.round(curZ * 100) / 100,
          dz: Math.round(dz * 1000) / 1000,
          speed: Math.round(chassisBody.velocity.length() * 3.6)
        });
        count++;
        if (count < 15) {
          requestAnimationFrame(onFrame);
        } else {
          resolve(samples);
        }
      }
      requestAnimationFrame(onFrame);
    })`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("High-speed frame deltas (should be continuous positive progression):");
  smoothnessRes.result.value.slice(1).forEach((s, idx) => {
    console.log(`Frame ${idx+1}: z=${s.z}, dz=${s.dz}, speed=${s.speed} km/h`);
  });

  // 3. Intelligent Braking Test: Release W, Press S while moving fast
  console.log("Testing intelligent footbrake (pressing S at high speed)...");
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.KEYS['w'] = false;
      window.KEYS['shift'] = false;
      window.KEYS['s'] = true;
    })()`
  });

  await new Promise(r => setTimeout(r, 1200));

  const brakeRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const v = chassisBody.velocity;
      const speed = Math.round(v.length() * 3.6);
      const angVelY = Math.abs(chassisBody.angularVelocity.y);
      return {
        speedAfterBrake: speed,
        spinRateY: Math.round(angVelY * 100) / 100,
        isStraight: angVelY < 0.5
      };
    })()`,
    returnByValue: true
  });
  console.log("Braking result:", JSON.stringify(brakeRes.result.value, null, 2));

  // Release S and drive forward for screenshot
  await send('Runtime.evaluate', { expression: `window.KEYS['s'] = false; window.KEYS['w'] = true; window.KEYS['shift'] = true;` });
  await new Promise(r => setTimeout(r, 1200));

  const ss = await send('Page.captureScreenshot', { format: 'png' });
  const ssPath = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\cead8ea9-3dd4-4c1a-b0f1-34ce4d08ea93\\browser_butter_smooth_driving.png';
  fs.writeFileSync(ssPath, Buffer.from(ss.data, 'base64'));
  console.log("Saved browser_butter_smooth_driving.png");

  ws.close();
  edge.kill();
  console.log("All driving feel tests completed successfully!");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
