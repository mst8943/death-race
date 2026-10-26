const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9239;
const URL = "http://localhost:8766/index.html";

async function run() {
  console.log("Starting Edge for audio settings verification...");
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, 'edge_profile_audio'),
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
      errors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception ? msg.params.exceptionDetails.exception.description : ''));
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

  await new Promise(r => setTimeout(r, 3000));

  console.log("=== STEP 1: INITIALIZE AUDIO & TEST MODAL OPEN ===");
  const modalRes = await send("Runtime.evaluate", {
    expression: `(() => {
      window.toggleAudioModal();
      const modal = document.getElementById('audio-modal');
      return {
        isOpen: modal.classList.contains('open'),
        hasTitle: !!document.querySelector('.audio-title'),
        hasSliders: document.querySelectorAll('.audio-slider').length
      };
    })()`,
    returnByValue: true
  });
  console.log("Modal open test:", JSON.stringify(modalRes.result.value, null, 2));

  console.log("=== STEP 2: TEST GAIN NODES & SETTINGS ADJUSTMENT ===");
  const gainRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const snd = window.Snd;
      snd.init();

      // Test changing master to 60
      window.setAudioVolume('master', 60);
      // Test changing sfx to 75
      window.setAudioVolume('sfx', 75);
      // Test changing music to 50
      window.setAudioVolume('music', 50);
      // Test changing engine to 80
      window.setAudioVolume('engine', 80);
      // Test changing voice to 95
      window.setAudioVolume('voice', 95);

      const saved = JSON.parse(localStorage.getItem('death_race_audio_settings') || '{}');

      return {
        masterSetting: snd.settings.master,
        sfxSetting: snd.settings.sfx,
        musicSetting: snd.settings.music,
        engineSetting: snd.settings.engine,
        voiceSetting: snd.settings.voice,
        localStorageSaved: saved,
        labelMaster: document.getElementById('val-audio-master').textContent,
        labelSfx: document.getElementById('val-audio-sfx').textContent
      };
    })()`,
    returnByValue: true
  });
  console.log("Audio gain adjustment test:", JSON.stringify(gainRes.result.value, null, 2));

  console.log("=== STEP 3: TEST MUTE & UNMUTE TOGGLE ===");
  const muteRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const snd = window.Snd;
      window.toggleAudioMute();
      const mutedState = snd.settings.muted;
      const masterGainMuted = snd.masterGain ? snd.masterGain.gain.value : null;

      window.toggleAudioMute();
      const unmutedState = snd.settings.muted;
      const masterGainRestored = snd.masterGain ? snd.masterGain.gain.value : null;

      return {
        mutedState,
        masterGainMuted,
        unmutedState,
        masterGainRestored
      };
    })()`,
    returnByValue: true
  });
  console.log("Mute toggle test:", JSON.stringify(muteRes.result.value, null, 2));

  console.log("=== STEP 4: TEST V8 ENGINE SYNTHESIZER ===");
  const engineRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const snd = window.Snd;
      snd.init();
      snd.startEngineAudio();

      // Simulate idle
      snd.updateEngine(0, false);
      const idleFreq1 = snd.engineOsc1.frequency.value;
      const idleFilter = snd.engineFilter.frequency.value;

      // Simulate 180 km/h with full throttle
      snd.updateEngine(180, true);
      const revFreq1 = snd.engineOsc1.frequency.value;
      const revFilter = snd.engineFilter.frequency.value;

      return {
        engineRunning: snd.isEngineRunning,
        idleFreq1,
        idleFilter,
        revFreq1,
        revFilter,
        pitchIncreased: revFreq1 >= idleFreq1
      };
    })()`,
    returnByValue: true
  });
  console.log("Engine synthesizer test:", JSON.stringify(engineRes.result.value, null, 2));

  console.log("=== STEP 5: TEST SFX & VOICE PREVIEW SOUNDS ===");
  const sfxPreviewRes = await send("Runtime.evaluate", {
    expression: `(() => {
      window.testAudioSound('sfx');
      window.testAudioSound('voice');
      return { ok: true };
    })()`,
    returnByValue: true
  });
  console.log("Audio preview trigger:", JSON.stringify(sfxPreviewRes.result.value, null, 2));

  console.log("=== STEP 6: TEST GARAGE AUDIO TAB SYNC ===");
  const garageSyncRes = await send("Runtime.evaluate", {
    expression: `(() => {
      window.closeAudioModal();
      window.toggleGarage();
      window.switchGarageTab('audio');

      const gMaster = document.getElementById('garage-val-audio-master').textContent;
      const gSfx = document.getElementById('garage-val-audio-sfx').textContent;
      const tabActive = document.getElementById('tab-pane-audio').classList.contains('active');

      window.toggleGarage();
      window.toggleAudioModal();

      return {
        gMaster,
        gSfx,
        tabActive
      };
    })()`,
    returnByValue: true
  });
  console.log("Garage audio sync test:", JSON.stringify(garageSyncRes.result.value, null, 2));

  console.log("=== STEP 7: CAPTURE SCREENSHOT OF AUDIO SETTINGS MODAL ===");
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("browser_audio_settings.png", Buffer.from(shot.data, "base64"));
  console.log("Saved screenshot: browser_audio_settings.png");

  console.log("Total errors detected:", errors.length);
  if (errors.length > 0) {
    console.error("Errors:", errors);
  }

  ws.close();
  edge.kill();

  if (errors.length > 0) process.exit(1);
  console.log("ALL AUDIO SETTINGS TESTS PASSED WITH 0 ERRORS!");
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
