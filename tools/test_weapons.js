const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for Weapons & Combat Test...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_test'),
    URL
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 400));
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
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('BROWSER EXCEPTION:', msg.params.exceptionDetails);
    }
  };

  await send('Runtime.enable');
  await send('Page.enable');

  console.log("Waiting 2.5s for initial load...");
  await new Promise(r => setTimeout(r, 2500));

  const initCheck = await send('Runtime.evaluate', {
    expression: `({
      targetsCount: window.__DBG.targetsCount,
      hasVehicle: !!window.__DBG.body
    })`,
    returnByValue: true
  });
  console.log("Initial status:", initCheck.result.value);

  // Press 'J' to fire machine guns for 1.5 seconds!
  console.log("Pressing 'J' to fire machine guns at target barrels...");
  await send('Runtime.evaluate', { expression: `window.KEYS['j'] = true;` });
  await new Promise(r => setTimeout(r, 1200));

  const midFireCheck = await send('Runtime.evaluate', {
    expression: `({
      bulletsCount: window.__DBG.bulletsCount,
      targetsCount: window.__DBG.targetsCount
    })`,
    returnByValue: true
  });
  console.log("Mid-fire status:", midFireCheck.result.value);

  // Wait another 1.2 seconds for bullets to impact and explode barrels
  await new Promise(r => setTimeout(r, 1200));
  await send('Runtime.evaluate', { expression: `window.KEYS['j'] = false;` });

  // Test smoke screen 'E' key
  console.log("Testing smoke screen ('E' key)...");
  await send('Runtime.evaluate', { expression: `window.KEYS['e'] = true;` });
  await new Promise(r => setTimeout(r, 300));
  await send('Runtime.evaluate', { expression: `window.KEYS['e'] = false;` });

  // Wait 1s and take screenshot
  await new Promise(r => setTimeout(r, 800));

  const finalCheck = await send('Runtime.evaluate', {
    expression: `({
      targetsCount: window.__DBG.targetsCount,
      bulletsCount: window.__DBG.bulletsCount,
      carPos: [window.__DBG.pos.x, window.__DBG.pos.y, window.__DBG.pos.z]
    })`,
    returnByValue: true
  });
  console.log("Final status after fire and explosion:", finalCheck.result.value);

  const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(__dirname, '..', 'browser_fire_test.png');
  fs.writeFileSync(outPath, Buffer.from(screenshotRes.data, 'base64'));
  console.log("Saved combat screenshot to:", outPath);

  ws.close();
  edge.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
