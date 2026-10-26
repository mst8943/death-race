const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for Damage & Destruction Test...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_damage'),
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
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      console.log(`BROWSER [${msg.params.type}]:`, text);
    }
  };

  await send('Runtime.enable');
  await send('Page.enable');

  console.log("Waiting 2s for initial load...");
  await new Promise(r => setTimeout(r, 2000));

  const initCheck = await send('Runtime.evaluate', {
    expression: `({
      carHealth: window.__DBG.carHealth,
      detachedCount: window.__DBG.detachedCount,
      debrisCount: window.__DBG.debrisCount
    })`,
    returnByValue: true
  });
  console.log("Initial status:", initCheck.result.value);

  // 1. Manually drop the Tombstone plate with 'T' key!
  console.log("Pressing 'T' to drop Tombstone plate onto the track...");
  await send('Runtime.evaluate', { expression: `window.KEYS['t'] = true;` });
  await new Promise(r => setTimeout(r, 400));

  const afterTombCheck = await send('Runtime.evaluate', {
    expression: `({
      detachedCount: window.__DBG.detachedCount,
      debrisCount: window.__DBG.debrisCount
    })`,
    returnByValue: true
  });
  console.log("After Tombstone drop:", afterTombCheck.result.value);

  // 2. Drive forward at full throttle (W) into barrels and crash to test ramming damage!
  console.log("Driving forward at full speed into obstacle crates/barrels...");
  await send('Runtime.evaluate', { expression: `window.KEYS['w'] = true;` });
  await new Promise(r => setTimeout(r, 2200));
  await send('Runtime.evaluate', { expression: `window.KEYS['w'] = false;` });

  const crashCheck = await send('Runtime.evaluate', {
    expression: `({
      carHealth: window.__DBG.carHealth,
      detachedCount: window.__DBG.detachedCount,
      debrisCount: window.__DBG.debrisCount,
      carPos: [window.__DBG.pos.x, window.__DBG.pos.y, window.__DBG.pos.z],
      speedKmh: Math.round(Math.sqrt(window.__DBG.vel.x**2 + window.__DBG.vel.z**2) * 3.6)
    })`,
    returnByValue: true
  });
  console.log("Status after high-speed crash:", crashCheck.result.value);

  // Screenshot of damaged car and scattered debris
  const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(__dirname, '..', 'browser_damage_test.png');
  fs.writeFileSync(outPath, Buffer.from(screenshotRes.data, 'base64'));
  console.log("Saved damage test screenshot to:", outPath);

  // 3. Test Reset with 'R'
  console.log("Pressing 'R' to reset car...");
  await send('Runtime.evaluate', { expression: `window.KEYS['r'] = true;` });
  await new Promise(r => setTimeout(r, 400));

  const resetCheck = await send('Runtime.evaluate', {
    expression: `({
      carHealth: window.__DBG.carHealth,
      detachedCount: window.__DBG.detachedCount,
      debrisCount: window.__DBG.debrisCount,
      carPos: [window.__DBG.pos.x, window.__DBG.pos.y, window.__DBG.pos.z]
    })`,
    returnByValue: true
  });
  console.log("Status after reset:", resetCheck.result.value);

  ws.close();
  edge.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
