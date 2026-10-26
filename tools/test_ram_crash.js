const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_ram'),
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

  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((res, rej) => {
      const curId = id++;
      pending.set(curId, { res, rej });
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  await new Promise(res => { ws.onopen = res; });
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { res } = pending.get(msg.id);
      pending.delete(msg.id);
      res(msg.result);
    }
  };

  await send('Runtime.enable');
  await send('Page.enable');

  await new Promise(r => setTimeout(r, 2000));

  // Drive forward at full throttle for 3.8s to ram straight into the barrels at Z=30!
  console.log("Ramming into barrels at full throttle...");
  await send('Runtime.evaluate', { expression: `window.KEYS['w'] = true;` });
  await new Promise(r => setTimeout(r, 3800));
  await send('Runtime.evaluate', { expression: `window.KEYS['w'] = false;` });

  const status = await send('Runtime.evaluate', {
    expression: `({
      carHealth: window.__DBG.carHealth,
      detachedCount: window.__DBG.detachedCount,
      debrisCount: window.__DBG.debrisCount,
      carPos: [window.__DBG.pos.x, window.__DBG.pos.y, window.__DBG.pos.z],
      speedKmh: Math.round(Math.sqrt(window.__DBG.vel.x**2 + window.__DBG.vel.z**2) * 3.6)
    })`,
    returnByValue: true
  });
  console.log("Status after ramming through barrels:", status.result.value);

  const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(__dirname, '..', 'browser_ram_crash.png');
  fs.writeFileSync(outPath, Buffer.from(screenshotRes.data, 'base64'));
  console.log("Saved ram crash screenshot to:", outPath);

  ws.close();
  edge.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
