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
    '--user-data-dir=' + path.join(__dirname, 'edge_profile'),
    URL
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch(`http://localhost:${PORT}/json`);
      const tabs = await res.json();
      const page = tabs.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) {
        wsUrl = page.webSocketDebuggerUrl;
        break;
      }
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

  // Drive forward + steer right toward ramp at X=14, Z=20
  console.log("Driving forward and steering right toward the ramp...");
  await send('Runtime.evaluate', { expression: `window.KEYS['w'] = true; window.KEYS['d'] = true;` });
  await new Promise(r => setTimeout(r, 1200));
  await send('Runtime.evaluate', { expression: `window.KEYS['d'] = false;` });
  await new Promise(r => setTimeout(r, 1800));

  const status = await send('Runtime.evaluate', {
    expression: `({
      pos: [window.__DBG.pos.x, window.__DBG.pos.y, window.__DBG.pos.z],
      speedKmh: Math.round(Math.sqrt(window.__DBG.vel.x**2 + window.__DBG.vel.z**2) * 3.6),
      quat: [window.__DBG.quat.x, window.__DBG.quat.y, window.__DBG.quat.z, window.__DBG.quat.w]
    })`,
    returnByValue: true
  });
  console.log("Car status on/after ramp jump:", JSON.stringify(status.result.value, null, 2));

  const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(__dirname, '..', 'browser_ramp_jump.png');
  fs.writeFileSync(outPath, Buffer.from(screenshotRes.data, 'base64'));
  console.log("Saved screenshot to:", outPath);

  ws.close();
  edge.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
