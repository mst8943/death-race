const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge headless...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile'),
    URL
  ]);

  edge.stderr.on('data', d => {});

  // Wait for DevTools port to open
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

  if (!wsUrl) {
    console.error("Could not connect to Edge DevTools");
    edge.kill();
    process.exit(1);
  }

  console.log("Connected to DevTools via WebSocket:", wsUrl);
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

  const consoleLogs = [];
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { res } = pending.get(msg.id);
      pending.delete(msg.id);
      res(msg.result);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      consoleLogs.push(`[${msg.params.type}] ${text}`);
      console.log(`BROWSER CONSOLE [${msg.params.type}]:`, text);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('BROWSER EXCEPTION:', msg.params.exceptionDetails);
    }
  };

  await send('Runtime.enable');
  await send('Page.enable');

  console.log("Waiting 3 seconds for Three.js & Cannon loop to run...");
  await new Promise(r => setTimeout(r, 3000));

  // Check state from browser
  const evalRes = await send('Runtime.evaluate', {
    expression: `({
      hasThree: !!window.THREE,
      hasCannon: !!window.CANNON,
      hasVehicle: !!window.__DBG,
      carPos: window.__DBG ? [window.__DBG.pos.x, window.__DBG.pos.y, window.__DBG.pos.z] : null,
      carVel: window.__DBG ? [window.__DBG.vel.x, window.__DBG.vel.y, window.__DBG.vel.z] : null,
      wheelsCount: typeof vehicle !== 'undefined' ? vehicle.wheelInfos.length : 0,
      carGroupChildren: typeof carGroup !== 'undefined' ? carGroup.children.length : 0,
      wheelMeshesChildren: typeof wheelMeshes !== 'undefined' ? wheelMeshes.map(w => w.children.length) : []
    })`,
    returnByValue: true
  });

  console.log("Browser State Evaluation:", JSON.stringify(evalRes.result.value, null, 2));

  // Simulate pressing 'W' key to drive forward for 2 seconds
  console.log("Simulating 'W' key press (driving forward)...");
  await send('Runtime.evaluate', { expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));` });
  await new Promise(r => setTimeout(r, 2000));

  const driveRes = await send('Runtime.evaluate', {
    expression: `({
      carPos: [window.__DBG.pos.x, window.__DBG.pos.y, window.__DBG.pos.z],
      speedKmh: Math.round(Math.sqrt(window.__DBG.vel.x**2 + window.__DBG.vel.z**2) * 3.6)
    })`,
    returnByValue: true
  });
  console.log("After 2s driving:", JSON.stringify(driveRes.result.value, null, 2));

  // Release 'W'
  await send('Runtime.evaluate', { expression: `window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));` });

  // Take screenshot
  const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(__dirname, '..', 'browser_drive_test.png');
  fs.writeFileSync(outPath, Buffer.from(screenshotRes.data, 'base64'));
  console.log("Saved browser screenshot to:", outPath);

  ws.close();
  edge.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
