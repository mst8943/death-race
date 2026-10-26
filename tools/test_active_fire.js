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
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_fire'),
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

  // Start firing
  console.log("Starting gunfire...");
  await send('Runtime.evaluate', { expression: `window.KEYS['j'] = true;` });
  
  // Wait 400ms so bullets are in flight and muzzle flash is lit
  await new Promise(r => setTimeout(r, 400));

  // Capture screenshot during active fire!
  const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(__dirname, '..', 'browser_active_fire.png');
  fs.writeFileSync(outPath, Buffer.from(screenshotRes.data, 'base64'));
  console.log("Saved active fire screenshot to:", outPath);

  await send('Runtime.evaluate', { expression: `window.KEYS['j'] = false;` });
  ws.close();
  edge.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
