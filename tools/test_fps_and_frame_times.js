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
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_fps_test'),
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

  // Record 60 consecutive frame delta times and car z positions
  const evalRes = await send('Runtime.evaluate', {
    expression: `new Promise(resolve => {
      window.KEYS['w'] = true;
      const samples = [];
      let count = 0;
      let lastT = performance.now();
      function sampleFrame(now) {
        const dt = now - lastT;
        lastT = now;
        samples.push({
          dt: Math.round(dt * 10) / 10,
          z: Math.round(chassisBody.position.z * 100) / 100,
          vz: Math.round(chassisBody.velocity.z * 10) / 10
        });
        count++;
        if (count < 30) {
          requestAnimationFrame(sampleFrame);
        } else {
          window.KEYS['w'] = false;
          resolve(samples);
        }
      }
      requestAnimationFrame(sampleFrame);
    })`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log("Recorded 30 frame samples:");
  console.log(JSON.stringify(evalRes.result.value, null, 2));

  ws.close();
  edge.kill();
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
