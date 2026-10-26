const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9246;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for performance profiling...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_perf'),
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

  await new Promise(r => ws.onopen = r);
  await send("Page.enable");
  await send("Runtime.enable");

  await new Promise(r => setTimeout(r, 2000));

  // Dismiss start launcher
  await send("Runtime.evaluate", {
    expression: `if (typeof selectGameMode === 'function') selectGameMode('peaceful');`
  });

  await new Promise(r => setTimeout(r, 1000));

  // Profile 120 consecutive frames of the game loop
  const profileRes = await send("Runtime.evaluate", {
    expression: `(() => {
      return new Promise(resolve => {
        const timings = {
          physics: [],
          render: [],
          radar: [],
          ai: [],
          bullets: [],
          totalFrame: [],
          fpsList: []
        };

        let frames = 0;
        let lastT = performance.now();

        function sample() {
          const frameStart = performance.now();
          const frameDt = frameStart - lastT;
          lastT = frameStart;

          if (frameDt > 0) timings.fpsList.push(1000 / frameDt);

          // Measure physics
          const t0 = performance.now();
          world.step(0.016);
          timings.physics.push(performance.now() - t0);

          // Measure radar
          const t1 = performance.now();
          updateRadar();
          timings.radar.push(performance.now() - t1);

          // Measure AI
          const t2 = performance.now();
          updateAIOpponents(0.016);
          timings.ai.push(performance.now() - t2);

          // Measure render
          const t3 = performance.now();
          renderer.render(scene, camera);
          timings.render.push(performance.now() - t3);

          timings.totalFrame.push(performance.now() - frameStart);

          frames++;
          if (frames < 60) {
            requestAnimationFrame(sample);
          } else {
            const avg = arr => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
            const max = arr => Math.max(...arr).toFixed(2);
            resolve({
              avgTotalMs: avg(timings.totalFrame),
              maxTotalMs: max(timings.totalFrame),
              avgRenderMs: avg(timings.render),
              maxRenderMs: max(timings.render),
              avgPhysicsMs: avg(timings.physics),
              maxPhysicsMs: max(timings.physics),
              avgRadarMs: avg(timings.radar),
              maxRadarMs: max(timings.radar),
              avgAiMs: avg(timings.ai),
              maxAiMs: max(timings.ai),
              avgFps: avg(timings.fpsList),
              minFps: Math.min(...timings.fpsList).toFixed(1),
              numSceneObjects: scene.children.length,
              numWorldBodies: world.bodies.length
            });
          }
        }
        requestAnimationFrame(sample);
      });
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log("Performance Profile:", JSON.stringify(profileRes.result.value, null, 2));

  ws.close();
  edge.kill();
}

run().catch(e => { console.error("Profile failed:", e); process.exit(1); });
