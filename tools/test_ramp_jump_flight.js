const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9228;
const URL = "http://localhost:8766/index.html";

async function run() {
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_jump_flight'),
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

  await new Promise(r => setTimeout(r, 3500));

  console.log("Simulating full ramp climb and airborne ballistic launch...");
  const flightRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const chassis = window.chassisBody;
      chassis.position.set(0, 0.85, 305); // Just entering ramp at 307
      chassis.velocity.set(0, 0, 36.0); // 130 km/h forward
      chassis.quaternion.set(0, 0, 0, 1);
      chassis.angularVelocity.set(0, 0, 0);

      const samples = [];
      for (let f = 0; f < 55; f++) {
        window.world.step(0.02);
        samples.push({
          frame: f,
          z: parseFloat(chassis.position.z.toFixed(2)),
          y: parseFloat(chassis.position.y.toFixed(2)),
          vy: parseFloat(chassis.velocity.y.toFixed(2))
        });
      }

      return {
        initialY: 0.85,
        peakY: Math.max(...samples.map(s => s.y)),
        samples: samples.filter((_, i) => i % 5 === 0)
      };
    })()`,
    returnByValue: true
  });
  console.log("Flight trajectory samples:", JSON.stringify(flightRes.result.value, null, 2));

  // Capture Screenshot of airborne car
  const jumpShot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_airborne_jump.png", Buffer.from(jumpShot.data, "base64"));
  console.log("Saved browser_airborne_jump.png");

  ws.close();
  edge.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
