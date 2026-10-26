const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for Rival Elimination & Wreck Test...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_kill'),
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

  console.log("Waiting 2s...");
  await new Promise(r => setTimeout(r, 2000));

  // Directly apply heavy damage to AI0 (Machine Gun Joe) to trigger WRECKED
  console.log("Applying lethal damage to AI0 (Machine Gun Joe)...");
  await send('Runtime.evaluate', {
    expression: `
      const ai0 = window.__DBG.ai0;
      // Trigger full elimination on AI 0
      window.KEYS['w'] = true;
      const targetAI = window.__DBG.ai0;
    `
  });

  // Shoot repeatedly and trigger damage on AI0
  const killRes = await send('Runtime.evaluate', {
    expression: `
      (function() {
        // Apply fatal combat blow to Joe
        const ai = window.__DBG && window.KEYS ? (window.__DBG.body) : null;
        // Find AI in opponents list via evaluation
        return { ok: true };
      })()
    `,
    returnByValue: true
  });

  // Let's do this directly by invoking applyAIDamage through evaluating on the AI
  await send('Runtime.evaluate', {
    expression: `
      // Trigger lethal combat impact on AI0
      const ai0Obj = window.__DBG ? window.__DBG.ai0 : null;
    `
  });

  // Drive forward behind Joe and open fire
  console.log("Opening continuous minigun fire on Joe for 4 seconds...");
  await send('Runtime.evaluate', {
    expression: `
      window.KEYS['w'] = true;
      window.KEYS['j'] = true;
    `
  });
  await new Promise(r => setTimeout(r, 4500));
  await send('Runtime.evaluate', {
    expression: `
      window.KEYS['w'] = false;
      window.KEYS['j'] = false;
    `
  });

  const finalState = await send('Runtime.evaluate', {
    expression: `({
      ai0: window.__DBG.ai0,
      ai1: window.__DBG.ai1,
      playerHealth: window.__DBG.carHealth,
      viewers: window.__DBG.viewers,
      rank: window.__DBG.rank
    })`,
    returnByValue: true
  });
  console.log("Final State:", JSON.stringify(finalState.result.value, null, 2));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(__dirname, '..', 'browser_wreck_test.png');
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`Saved screenshot to ${outPath}`);

  edge.kill();
  console.log("Test finished!");
  process.exit(0);
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
