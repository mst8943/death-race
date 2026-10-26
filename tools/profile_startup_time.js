const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9227;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("=== STARTUP TIME PROFILING ===");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_startup'),
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

  // Track console logs & performance timings
  await new Promise(r => setTimeout(r, 1000));

  const timings = await send("Runtime.evaluate", {
    expression: `(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        domInteractive: nav ? nav.domInteractive : 0,
        domComplete: nav ? nav.domComplete : 0,
        loadEventEnd: nav ? nav.loadEventEnd : 0,
        now: performance.now(),
        threeMeshes: window.scene ? window.scene.children.length : 0,
        cannonBodies: window.world ? window.world.bodies.length : 0
      };
    })()`,
    returnByValue: true
  });
  console.log("Navigation Timings:", timings.result.value);

  // Check how long a click handler or input takes right now:
  console.log("Measuring modal interaction latency...");
  const clickPerf = await send("Runtime.evaluate", {
    expression: `new Promise(resolve => {
      const t0 = performance.now();
      const card = document.querySelector('.mode-choice-card');
      if (card) {
        // dispatch mousemove / click
        card.dispatchEvent(new MouseEvent('mouseenter'));
        card.dispatchEvent(new MouseEvent('mousemove'));
      }
      requestAnimationFrame(() => {
        const t1 = performance.now();
        resolve({
          dispatchToRafMs: (t1 - t0).toFixed(2)
        });
      });
    })`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("Click / hover latency:", clickPerf.result.value);

  edge.kill();
}

run().catch(console.error);
