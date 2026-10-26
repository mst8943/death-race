const { spawn } = require('child_process');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9222;
const URL = 'http://localhost:8766/index.html';

async function run() {
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_smooth_verify'),
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

  // Start driving
  await send('Runtime.evaluate', { expression: 'window.KEYS["w"] = true;' });
  await new Promise(r => setTimeout(r, 800)); // Accelerate for 0.8s

  // Sample 25 consecutive frames of movement
  const evalRes = await send('Runtime.evaluate', {
    expression: `new Promise(resolve => {
      const samples = [];
      let count = 0;
      let lastZ = chassisBody.position.z;
      function step() {
        const curZ = chassisBody.position.z;
        const dz = curZ - lastZ;
        lastZ = curZ;
        samples.push({
          frame: count,
          z: Math.round(curZ * 1000) / 1000,
          dz: Math.round(dz * 1000) / 1000,
          speedKmh: Math.round(chassisBody.velocity.length() * 3.6)
        });
        count++;
        if (count < 25) {
          requestAnimationFrame(step);
        } else {
          window.KEYS['w'] = false;
          resolve(samples);
        }
      }
      requestAnimationFrame(step);
    })`,
    awaitPromise: true,
    returnByValue: true
  });

  const samples = evalRes.result.value;
  console.log("Recorded 25 frame driving samples:");
  samples.slice(1).forEach(s => {
    console.log(`Frame ${s.frame}: z = ${s.z}, dz = ${s.dz}, speed = ${s.speedKmh} km/h`);
  });

  const zeroDeltas = samples.slice(1).filter(s => s.dz <= 0);
  console.log("Non-advancing frames count (must be 0):", zeroDeltas.length);

  ws.close();
  edge.kill();

  if (zeroDeltas.length > 0) {
    console.error("Test failed: Found stuttering frame!");
    process.exit(1);
  }

  console.log("SUCCESS! All frames advance with continuous, smooth velocity (yağ gibi)!");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
