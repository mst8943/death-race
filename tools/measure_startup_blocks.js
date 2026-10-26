const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9228;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("=== MEASURING STARTUP BLOCKS & LATENCY ===");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_startup2'),
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
    console.error("Could not find WebSocket debugger URL!");
    edge.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(msg.error);
      else p.resolve(msg.result);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send("Page.enable");
  await send("Runtime.enable");

  // Wait 500ms
  await new Promise(r => setTimeout(r, 500));

  const res = await send("Runtime.evaluate", {
    expression: `(() => {
      return {
        hasSetGameMode: typeof window.setGameMode === 'function',
        hasWorld: !!window.world,
        bodiesCount: window.world ? window.world.bodies.length : 0,
        perfNow: performance.now()
      };
    })()`,
    returnByValue: true
  });
  console.log("Check at 500ms:", res.result.value);

  // Now measure long tasks if any
  const longTasks = await send("Runtime.evaluate", {
    expression: `(() => {
      const entries = performance.getEntriesByType('resource');
      return entries.map(e => ({ name: e.name.split('/').pop(), duration: Math.round(e.duration) }));
    })()`,
    returnByValue: true
  });
  console.log("Resource loading times:", longTasks.result.value);

  edge.kill();
}

run().catch(console.error);
