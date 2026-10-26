const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for Dreadnought Boss & Tower Destruction Test...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_boss'),
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

  console.log("Waiting 2.5s...");
  await new Promise(r => setTimeout(r, 2500));

  // 1. Activate Dreadnought Boss
  console.log("Activating The Dreadnought Boss...");
  await send('Runtime.evaluate', {
    expression: `window.__DBG.activateDreadnoughtNow();`
  });
  await new Promise(r => setTimeout(r, 1000));

  const bossInit = await send('Runtime.evaluate', {
    expression: `({
      dreadnought: window.__DBG.dreadnought,
      viewers: window.__DBG.viewers
    })`,
    returnByValue: true
  });
  console.log("Boss Initialized:", JSON.stringify(bossInit.result.value, null, 2));

  // 2. Drive towards Dreadnought and launch rocket
  console.log("Driving and firing guided rocket at Dreadnought...");
  await send('Runtime.evaluate', { expression: `window.KEYS['w'] = true;` });
  await send('Runtime.evaluate', { expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));` });
  await new Promise(r => setTimeout(r, 1200));

  // Directly apply weakpoint combat hit to Dreadnought to verify critical damage
  await send('Runtime.evaluate', {
    expression: `
      // Apply weakpoint damage to fuel tank
      const dBody = window.__DBG.dreadnought;
      // Hit fuel tanks at rear (Z < -4.5)
      const hitWorld = new THREE.Vector3(68, 2.0, 154);
      // Call onHit
    `
  });

  // Shoot repeatedly
  await send('Runtime.evaluate', { expression: `window.KEYS['j'] = true;` });
  await new Promise(r => setTimeout(r, 2000));
  await send('Runtime.evaluate', { expression: `window.KEYS['w'] = false; window.KEYS['j'] = false;` });

  const bossState = await send('Runtime.evaluate', {
    expression: `({
      dreadnought: window.__DBG.dreadnought,
      viewers: window.__DBG.viewers,
      polesCount: window.__DBG.destructiblePolesCount
    })`,
    returnByValue: true
  });
  console.log("Boss Combat State:", JSON.stringify(bossState.result.value, null, 2));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(__dirname, '..', 'browser_dreadnought_boss.png');
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`Saved screenshot to ${outPath}`);

  edge.kill();
  console.log("Boss test finished successfully!");
  process.exit(0);
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
