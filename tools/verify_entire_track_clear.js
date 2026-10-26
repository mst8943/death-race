const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9241;
const URL = "http://localhost:8766/index.html";

async function run() {
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_clearance'),
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

  if (!wsUrl) throw new Error("Could not connect to Edge DevTools");

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
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send("Page.enable");
  await send("Runtime.enable");

  await new Promise(r => setTimeout(r, 2000));

  const result = await send("Runtime.evaluate", {
    expression: `(() => {
      const issues = [];
      const staticBodies = world.bodies.filter(b => b.mass === 0 && b !== groundBody);

      // Check every 2 steps along the 1200-step track
      for (let i = 0; i < TRACK_POINTS.length; i += 2) {
        const pt = TRACK_POINTS[i];
        if (!pt) continue;

        for (let b of staticBodies) {
          const bp = b.position;
          const distXZ = Math.hypot(bp.x - pt.x, bp.z - pt.z);

          // If a static body is right on or near the track center (distXZ < 9m)
          // and has height above 0.8m (solid wall/gate/obstacle)
          if (distXZ < 9.0 && bp.y > 0.8) {
            const duplicate = issues.some(iss => Math.hypot(iss.pos.x - bp.x, iss.pos.z - bp.z) < 5);
            if (!duplicate) {
              issues.push({
                step: i,
                pos: { x: +bp.x.toFixed(1), y: +bp.y.toFixed(1), z: +bp.z.toFixed(1) },
                distToCenter: +distXZ.toFixed(1),
                shapes: b.shapes.map(s => s.constructor.name)
              });
            }
          }
        }
      }

      return {
        totalStaticBodies: staticBodies.length,
        issues
      };
    })()`,
    returnByValue: true
  });

  console.log("Full Track Clearance Report:", JSON.stringify(result.result.value, null, 2));

  ws.close();
  edge.kill();
}

run().catch(e => { console.error(e); process.exit(1); });
