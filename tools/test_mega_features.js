const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for Mega Features Suite Test...");
  const tempProfile = path.join(__dirname, 'edge_profile_mega');
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
    console.error("Could not connect to Edge DevTools WebSocket");
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

  console.log("Waiting 3.0s for game and 3D assets to load...");
  await new Promise(r => setTimeout(r, 3000));

  // 1. Initial State Check
  const initState = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      dbgReady: !!window.__DBG,
      crushersCount: window.__DBG ? window.__DBG.crushersCount : 0,
      skin: window.__DBG ? window.__DBG.currentSkin : null,
      weather: window.__DBG ? window.__DBG.weatherMode : null
    })`,
    returnByValue: true
  });
  console.log("Initial Game State:", JSON.parse(initState.result.value));

  // 2. Test Skin Application
  console.log("Testing Skin System...");
  await send('Runtime.evaluate', {
    expression: `window.__DBG.applyCarSkinNow('blood_carnage');`
  });
  await new Promise(r => setTimeout(r, 600));

  // 3. Test Upgrades Application
  console.log("Testing Upgrades (Engine, Gun, Armor)...");
  await send('Runtime.evaluate', {
    expression: `
      window.__DBG.upgradeItemNow('engine');
      window.__DBG.upgradeItemNow('gun');
      window.__DBG.upgradeItemNow('armor');
    `
  });
  await new Promise(r => setTimeout(r, 600));

  // 4. Test Weather (Mode 2: Night with Headlights)
  console.log("Switching Weather to Zifiri Gece (Night Mode)...");
  await send('Runtime.evaluate', {
    expression: `window.__DBG.setWeatherNow(2);`
  });
  await new Promise(r => setTimeout(r, 1000));

  // Screenshot 1: Night with high-beam headlights & searchlights
  const shot1 = await send('Page.captureScreenshot');
  fs.writeFileSync(path.join(__dirname, '..', 'browser_mega_night.png'), Buffer.from(shot1.data, 'base64'));
  console.log("Saved screenshot: browser_mega_night.png");

  // 5. Test Destructible Crane Collapse
  console.log("Testing Destructible Gantry Crane Collapse...");
  await send('Runtime.evaluate', {
    expression: `window.__DBG.collapseCraneNow();`
  });
  await new Promise(r => setTimeout(r, 1200));

  // Screenshot 2: Crane collapsed container on road
  const shot2 = await send('Page.captureScreenshot');
  fs.writeFileSync(path.join(__dirname, '..', 'browser_mega_crane.png'), Buffer.from(shot2.data, 'base64'));
  console.log("Saved screenshot: browser_mega_crane.png");

  // 6. Test Acid Rain & Wiper
  console.log("Switching Weather to Acid Rain (Mode 1)...");
  await send('Runtime.evaluate', {
    expression: `window.__DBG.setWeatherNow(1);`
  });
  await new Promise(r => setTimeout(r, 1200));

  // Verify full final state
  const finalState = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      skin: window.__DBG.currentSkin,
      upgrades: window.__DBG.upgrades,
      crushersCount: window.__DBG.crushersCount,
      craneCollapsed: window.__DBG.craneCollapsed,
      carHealth: window.__DBG.carHealth,
      viewers: window.__DBG.viewers,
      weatherMode: window.__DBG.weatherMode
    })`,
    returnByValue: true
  });
  console.log("Final Verified State:", JSON.parse(finalState.result.value));

  // Screenshot 3: Final verified state
  const shot3 = await send('Page.captureScreenshot');
  fs.writeFileSync(path.join(__dirname, '..', 'browser_mega_final.png'), Buffer.from(shot3.data, 'base64'));
  console.log("Saved screenshot: browser_mega_final.png");

  ws.close();
  edge.kill();
  console.log("Mega Features Test completed successfully!");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
