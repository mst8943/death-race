const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9240;
const URL = "http://localhost:8766/index.html";

async function run() {
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_gate'),
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
      // Check track points near the gate position [0, 5, 810]
      const gatePos = new T.Vector3(0, 5, 810);
      const trackDist = getTrackDistance(gatePos);
      
      // Check nearest waypoint to [0, 0, 810]
      const nearestWaypoints = TRACK_WAYPOINTS.map((wp, idx) => ({
        idx,
        wp: { x: wp.x, y: wp.y, z: wp.z },
        dist: Math.hypot(wp.x - gatePos.x, wp.z - gatePos.z)
      })).sort((a, b) => a.dist - b.dist).slice(0, 5);

      // Check track curve points from step 100 to 250
      const curveSample = [];
      for (let s = 100; s <= 220; s += 5) {
        const pt = TRACK_POINTS[s];
        curveSample.push({ step: s, x: pt.x.toFixed(1), z: pt.z.toFixed(1) });
      }

      // Check all bodies in world that have position.z between 750 and 850 and position.x between -50 and 50
      const blockingBodies = [];
      for (let body of world.bodies) {
        if (Math.abs(body.position.x) < 40 && body.position.z >= 750 && body.position.z <= 850) {
          blockingBodies.push({
            pos: { x: body.position.x.toFixed(1), y: body.position.y.toFixed(1), z: body.position.z.toFixed(1) },
            shapes: body.shapes.map(s => s.constructor.name),
            isStatic: body.mass === 0
          });
        }
      }

      return {
        trackDistToGateCenter: Math.sqrt(trackDist.distance),
        gateIndex: trackDist.index,
        nearestWaypoints,
        curveSample,
        blockingBodies
      };
    })()`,
    returnByValue: true
  });

  console.log("Analysis Result:", JSON.stringify(result.result.value, null, 2));

  ws.close();
  edge.kill();
}

run().catch(e => { console.error(e); process.exit(1); });
