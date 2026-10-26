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
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_sound_test2'),
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

  // Enable Peaceful Test Mode
  await send('Runtime.evaluate', { expression: 'window.setGameMode("peaceful", true)' });

  // Wait 4 seconds for crushers to slam in the background
  await new Promise(r => setTimeout(r, 4000));

  const resAtStart = await send('Runtime.evaluate', {
    expression: 'cameraShake',
    returnByValue: true
  });
  console.log('Camera shake at start line with crushers cycling in background:', resAtStart.result.value);

  // Now teleport to 10m from a crusher (X=196.5, Z=30)
  await send('Runtime.evaluate', {
    expression: 'chassisBody.position.set(196.5, 1.8, 38)' // 8 meters away from Z=30 crusher
  });

  // Wait for crusher slam cycle
  await new Promise(r => setTimeout(r, 3600));
  const resNear = await send('Runtime.evaluate', {
    expression: 'cameraShake',
    returnByValue: true
  });
  console.log('Camera shake 8m away from crusher (should be small vibration ~0.01 - 0.04):', resNear.result.value);

  ws.close();
  edge.kill();
  console.log("Verification finished successfully!");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
