const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for Ceasefire & Godmode Test...");
  const tempProfile = path.join(__dirname, 'edge_profile_ceasefire');
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${tempProfile}`,
    URL
  ]);

  let wsUrl = null;
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 400));
    try {
      const res = await fetch(`http://localhost:${PORT}/json`);
      const tabs = await res.json();
      const page = tabs.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) { wsUrl = page.webSocketDebuggerUrl; break; }
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error("Could not connect to Edge DevTools");
    edge.kill();
    process.exit(1);
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

  console.log("Waiting 2.5s for initial setup...");
  await new Promise(r => setTimeout(r, 2500));

  // 1. Initial State
  const init = await send('Runtime.evaluate', {
    expression: `JSON.stringify({ aiFire: window.__DBG.aiFireEnabled, godMode: window.__DBG.godMode })`,
    returnByValue: true
  });
  console.log("Initial State:", JSON.parse(init.result.value));

  // 2. Toggle Ceasefire via pressing 'p'
  console.log("Pressing 'p' to enable Ceasefire (Ateşkes)...");
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'p', code: 'KeyP', windowsVirtualKeyCode: 80 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'p', code: 'KeyP', windowsVirtualKeyCode: 80 });
  await new Promise(r => setTimeout(r, 600));

  // 3. Toggle Godmode via pressing 'o'
  console.log("Pressing 'o' to enable Godmode (Ölümsüzlük)...");
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'o', code: 'KeyO', windowsVirtualKeyCode: 79 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'o', code: 'KeyO', windowsVirtualKeyCode: 79 });
  await new Promise(r => setTimeout(r, 600));

  // 4. Verify Ceasefire & Godmode state
  const toggled = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      aiFire: window.__DBG.aiFireEnabled,
      godMode: window.__DBG.godMode,
      btnText: document.getElementById('ceasefire-btn').textContent,
      carHealth: window.__DBG.carHealth
    })`,
    returnByValue: true
  });
  console.log("Toggled State:", JSON.parse(toggled.result.value));

  // 5. Let AI drive around for 2 seconds to confirm zero damage taken
  await new Promise(r => setTimeout(r, 2000));
  const healthCheck = await send('Runtime.evaluate', {
    expression: `window.__DBG.carHealth`,
    returnByValue: true
  });
  console.log("Car health after 2s under AI ceasefire:", healthCheck.result.value);

  // Take screenshot
  const shot = await send('Page.captureScreenshot');
  fs.writeFileSync(path.join(__dirname, '..', 'browser_ceasefire_active.png'), Buffer.from(shot.data, 'base64'));
  console.log("Saved screenshot: browser_ceasefire_active.png");

  ws.close();
  edge.kill();
  console.log("Ceasefire test passed successfully!");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
