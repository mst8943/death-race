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
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_smooth_test'),
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
  await new Promise(r => setTimeout(r, 2000));

  await send('Runtime.evaluate', { expression: 'window.setGameMode("peaceful", true)' });

  // Drive forward and record 20 frames of movement deltas
  const evalRes = await send('Runtime.evaluate', {
    expression: `new Promise(resolve => {
      window.KEYS['w'] = true;
      const deltas = [];
      let count = 0;
      let lastZ = chassisBody.position.z;
      function onFrame() {
        const curZ = chassisBody.position.z;
        const dz = curZ - lastZ;
        lastZ = curZ;
        deltas.push({ frame: count, z: Math.round(curZ * 1000) / 1000, dz: Math.round(dz * 1000) / 1000 });
        count++;
        if (count < 20) {
          requestAnimationFrame(onFrame);
        } else {
          window.KEYS['w'] = false;
          resolve(deltas);
        }
      }
      // Give 0.5s to get rolling
      setTimeout(() => requestAnimationFrame(onFrame), 600);
    })`,
    awaitPromise: true,
    returnByValue: true
  });

  const deltas = evalRes.result.value;
  console.log("Movement per frame (dz should be consistently positive and non-zero):");
  deltas.slice(1).forEach(d => {
    console.log(`Frame ${d.frame}: z = ${d.z}, dz = ${d.dz}`);
  });

  // Count frozen frames (where dz === 0)
  const frozenCount = deltas.slice(1).filter(d => d.dz === 0).length;
  console.log("Frozen/stutter frames count (should be 0):", frozenCount);

  ws.close();
  edge.kill();
  if (frozenCount > 0) {
    console.error("Test failed: Stutter detected!");
    process.exit(1);
  }
  console.log("Motion smoothness verified! Zero stutters!");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
