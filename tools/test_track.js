const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for Track & Plaque Test...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_track'),
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

  if (!wsUrl) {
    console.error("Could not find WebSocket debugger URL!");
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
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      console.log(`BROWSER [${msg.params.type}]:`, text);
    }
  };

  await send('Runtime.enable');
  await send('Page.enable');

  console.log("Waiting 2.5s for track and models to load...");
  await new Promise(r => setTimeout(r, 2500));

  // Check state
  const eval1 = await send('Runtime.evaluate', {
    expression: `({
      plates: window.__DBG ? window.__DBG.plateCount : 0,
      carPos: window.__DBG ? window.__DBG.pos : null,
      lap: window.__DBG ? window.__DBG.lapCount : null,
      cp: window.__DBG ? window.__DBG.checkpoint : null
    })`,
    returnByValue: true
  });
  console.log("Initial state:", JSON.stringify(eval1.result.value));

  // Drive forward along track for 3 seconds
  console.log("Driving forward on track (W)...");
  await send('Runtime.evaluate', { expression: `window.KEYS['w'] = true;` });
  await new Promise(r => setTimeout(r, 3000));
  await send('Runtime.evaluate', { expression: `window.KEYS['w'] = false;` });

  const eval2 = await send('Runtime.evaluate', {
    expression: `({
      carPos: window.__DBG.pos,
      speed: Math.round(window.__DBG.vel.length() * 3.6),
      overdrive: window.__DBG.overdriveTimer,
      shield: window.__DBG.shieldTimer,
      lap: window.__DBG.lapCount,
      health: window.__DBG.carHealth
    })`,
    returnByValue: true
  });
  console.log("After driving:", JSON.stringify(eval2.result.value));

  // Capture screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(__dirname, '..', 'browser_track_test.png');
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`Saved screenshot to ${outPath}`);

  edge.kill();
  console.log("Test finished successfully.");
  process.exit(0);
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
