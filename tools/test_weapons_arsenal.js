const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for Weapons Arsenal, Nitro & Drift Test...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_arsenal'),
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

  // 1. Test Nitro Boost
  console.log("Testing Nitro Boost (W + Shift)...");
  await send('Runtime.evaluate', { expression: `window.KEYS['w'] = true; window.KEYS['shift'] = true;` });
  await new Promise(r => setTimeout(r, 1800));
  const evalNitro = await send('Runtime.evaluate', {
    expression: `({
      speed: Math.round(window.__DBG.vel.length() * 3.6),
      nitro: Math.round(window.__DBG.nitroAmount)
    })`,
    returnByValue: true
  });
  console.log("Nitro Boost State:", JSON.stringify(evalNitro.result.value));
  await send('Runtime.evaluate', { expression: `window.KEYS['shift'] = false;` });

  // 2. Test Rocket Launch (K)
  console.log("Testing Guided Rocket Launch (K)...");
  await send('Runtime.evaluate', { expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));` });
  await new Promise(r => setTimeout(r, 400));
  const evalRocket = await send('Runtime.evaluate', {
    expression: `({ activeRockets: window.__DBG.activeRockets })`,
    returnByValue: true
  });
  console.log("Rocket State:", JSON.stringify(evalRocket.result.value));

  // 3. Test Oil Slick (Q) and Caltrops (X)
  console.log("Testing Oil Slick (Q) and Caltrops (X)...");
  await send('Runtime.evaluate', { expression: `
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
  ` });
  await new Promise(r => setTimeout(r, 300));
  const evalTraps = await send('Runtime.evaluate', {
    expression: `({
      oil: window.__DBG.activeOilSlicks,
      caltrops: window.__DBG.activeCaltrops
    })`,
    returnByValue: true
  });
  console.log("Traps Deployed:", JSON.stringify(evalTraps.result.value));

  // 4. Test Drift (Space)
  console.log("Testing Drift Mode (Space + A)...");
  await send('Runtime.evaluate', { expression: `window.KEYS[' '] = true; window.KEYS['a'] = true;` });
  await new Promise(r => setTimeout(r, 1000));
  const evalDrift = await send('Runtime.evaluate', {
    expression: `({ isDrifting: window.__DBG.isDrifting })`,
    returnByValue: true
  });
  console.log("Drift State:", JSON.stringify(evalDrift.result.value));
  await send('Runtime.evaluate', { expression: `window.KEYS[' '] = false; window.KEYS['a'] = false;` });

  // Let rocket travel and hit
  await new Promise(r => setTimeout(r, 1500));
  await send('Runtime.evaluate', { expression: `window.KEYS['w'] = false;` });

  const finalCheck = await send('Runtime.evaluate', {
    expression: `({
      viewers: window.__DBG.viewers,
      rank: window.__DBG.rank,
      ai0: window.__DBG.ai0,
      ai1: window.__DBG.ai1
    })`,
    returnByValue: true
  });
  console.log("Final State:", JSON.stringify(finalCheck.result.value, null, 2));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(__dirname, '..', 'browser_arsenal_test.png');
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`Saved screenshot to ${outPath}`);

  edge.kill();
  console.log("Arsenal test finished successfully!");
  process.exit(0);
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
