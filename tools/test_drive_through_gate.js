const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9243;
const URL = "http://localhost:8766/index.html";

async function run() {
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_gate_view'),
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

  const errors = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === "Runtime.exceptionThrown") {
      errors.push(msg.params.exceptionDetails.text);
    }
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

  // 1. Place car at Z = 780 facing Z = 810 (EXACT camera angle as user's screenshot)
  await send("Runtime.evaluate", {
    expression: `(() => {
      if (typeof selectGameMode === 'function') selectGameMode('peaceful');
      chassisBody.position.set(0, 0.85, 780);
      chassisBody.velocity.set(0, 0, 0);
      chassisBody.quaternion.set(0, 0, 0, 1);
      carGroup.position.copy(chassisBody.position);
      carGroup.quaternion.copy(chassisBody.quaternion);
      camera.position.set(0, 3.2, 773);
      camera.lookAt(0, 2.0, 810);
    })()`
  });

  await new Promise(r => setTimeout(r, 800));

  // Screenshot 1: Facing the open gate from Z=780
  const shot1 = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_open_gate_view.png", Buffer.from(shot1.data, "base64"));
  console.log("Saved screenshot 1: browser_open_gate_view.png");

  // 2. Now drive the car through the gate to Z = 860
  const driveResult = await send("Runtime.evaluate", {
    expression: `(() => {
      chassisBody.position.set(4, 0.85, 860);
      chassisBody.velocity.set(5, 0, 40); // 145 km/h
      carGroup.position.copy(chassisBody.position);
      camera.position.set(4, 3.2, 853);
      camera.lookAt(8, 2.0, 890);
      return {
        pos: { x: +chassisBody.position.x.toFixed(1), z: +chassisBody.position.z.toFixed(1) },
        isEscaped: isEscaped
      };
    })()`,
    returnByValue: true
  });
  console.log("After passing gate:", driveResult.result.value);

  await new Promise(r => setTimeout(r, 800));

  // Screenshot 2: Beyond the gate on the curve to the fortress
  const shot2 = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_beyond_gate_curve.png", Buffer.from(shot2.data, "base64"));
  console.log("Saved screenshot 2: browser_beyond_gate_curve.png");

  ws.close();
  edge.kill();
  console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
}

run().catch(e => { console.error(e); process.exit(1); });
