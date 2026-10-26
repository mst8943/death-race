const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for AI & Race Combat Test...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_ai'),
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

  console.log("Waiting 3s for models and AI opponents to initialize...");
  await new Promise(r => setTimeout(r, 3000));

  // Initial Check
  const eval1 = await send('Runtime.evaluate', {
    expression: `({
      aiCount: window.__DBG.aiCount,
      ai0: window.__DBG.ai0,
      ai1: window.__DBG.ai1,
      playerPos: window.__DBG.pos,
      viewers: window.__DBG.viewers,
      rank: window.__DBG.rank
    })`,
    returnByValue: true
  });
  console.log("Initial Race State:", JSON.stringify(eval1.result.value, null, 2));

  // Drive forward and fire for 3.5 seconds
  console.log("Driving forward and firing miniguns at rivals...");
  await send('Runtime.evaluate', { expression: `window.KEYS['w'] = true; window.KEYS['j'] = true;` });
  await new Promise(r => setTimeout(r, 3500));
  await send('Runtime.evaluate', { expression: `window.KEYS['w'] = false; window.KEYS['j'] = false;` });

  // State after race action
  const eval2 = await send('Runtime.evaluate', {
    expression: `({
      playerPos: window.__DBG.pos,
      playerSpeed: Math.round(window.__DBG.vel.length() * 3.6),
      playerHealth: window.__DBG.carHealth,
      ai0: window.__DBG.ai0,
      ai1: window.__DBG.ai1,
      viewers: window.__DBG.viewers,
      rank: window.__DBG.rank
    })`,
    returnByValue: true
  });
  console.log("State After 3.5s Combat:", JSON.stringify(eval2.result.value, null, 2));

  // Capture screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(__dirname, '..', 'browser_ai_race.png');
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`Saved screenshot to ${outPath}`);

  edge.kill();
  console.log("AI Race Test Finished Successfully!");
  process.exit(0);
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
