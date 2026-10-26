const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for Deep Customization Suite Test...");
  const tempProfile = path.join(__dirname, 'edge_profile_custom');
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

  console.log("Waiting 2.5s for initial assets...");
  await new Promise(r => setTimeout(r, 2500));

  // 1. Open Garage Modal
  console.log("Opening Garage...");
  await send('Runtime.evaluate', {
    expression: `window.__DBG.toggleGarageNow();`
  });
  await new Promise(r => setTimeout(r, 800));

  // 2. Switch to Bodykits tab and apply items
  console.log("Switching to Body & Jantlar Tab...");
  await send('Runtime.evaluate', {
    expression: `
      window.switchGarageTab('bodykits');
      window.__DBG.applyWheelBladesNow('ben_hur');
      window.__DBG.applyBumperKitNow('twin_spikes');
      window.__DBG.applyRoofKitNow('strobe');
      window.__DBG.applyNitroFlameNow('purple');
    `
  });
  await new Promise(r => setTimeout(r, 800));

  // Screenshot 1: Garage Bodykits Tab open
  const shot1 = await send('Page.captureScreenshot');
  fs.writeFileSync(path.join(__dirname, '..', 'browser_garage_bodykits.png'), Buffer.from(shot1.data, 'base64'));
  console.log("Saved screenshot: browser_garage_bodykits.png");

  // 3. Switch to Paint & Decals tab
  console.log("Switching to Boya & Grafiti Tab...");
  await send('Runtime.evaluate', {
    expression: `
      window.switchGarageTab('paint');
      window.__DBG.applyCarSkinNow('desert_scorpion');
      window.applyDecal('skull');
    `
  });
  await new Promise(r => setTimeout(r, 800));

  // Screenshot 2: Garage Paint Tab with Desert Scorpion
  const shot2 = await send('Page.captureScreenshot');
  fs.writeFileSync(path.join(__dirname, '..', 'browser_garage_paint.png'), Buffer.from(shot2.data, 'base64'));
  console.log("Saved screenshot: browser_garage_paint.png");

  // 4. Close Garage and drive onto track with customized beast
  console.log("Closing Garage and returning to track...");
  await send('Runtime.evaluate', {
    expression: `window.__DBG.toggleGarageNow();`
  });
  await new Promise(r => setTimeout(r, 1200));

  // Verify customization state
  const custState = await send('Runtime.evaluate', {
    expression: `JSON.stringify(window.__DBG.customization)`,
    returnByValue: true
  });
  console.log("Verified Customization State:", JSON.parse(custState.result.value));

  // Screenshot 3: On Track with full customization
  const shot3 = await send('Page.captureScreenshot');
  fs.writeFileSync(path.join(__dirname, '..', 'browser_customized_track.png'), Buffer.from(shot3.data, 'base64'));
  console.log("Saved screenshot: browser_customized_track.png");

  ws.close();
  edge.kill();
  console.log("Deep Customization test finished successfully!");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
