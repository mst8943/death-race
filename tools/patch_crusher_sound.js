const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', 'js', 'game.js');
let src = fs.readFileSync(gameJsPath, 'utf8');

// 1. Update playHydraulicSlam to accept volume attenuation
const oldMethod = `  playHydraulicSlam() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   const osc = this.ctx.createOscillator();
   const g = this.ctx.createGain();
   osc.type = 'sine';
   osc.frequency.setValueAtTime(80, now);
   osc.frequency.exponentialRampToValueAtTime(18, now + 0.45);
   g.gain.setValueAtTime(0.9, now);
   g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
   osc.connect(g).connect(this.ctx.destination);
   osc.start(now); osc.stop(now + 0.5);

   const bufLen = Math.floor(this.ctx.sampleRate * 0.5);
   const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
   const d = buf.getChannelData(0);
   for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.2));
   const noise = this.ctx.createBufferSource(); noise.buffer = buf;
   const bpf = this.ctx.createBiquadFilter();
   bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(850, now);
   const ng = this.ctx.createGain();
   ng.gain.setValueAtTime(0.6, now);
   ng.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
   noise.connect(bpf).connect(ng).connect(this.ctx.destination);
   noise.start(now);
  },`;

const newMethod = `  playHydraulicSlam(vol = 1.0) {
   this.init();
   if (!this.ctx || vol <= 0.01) return;
   const now = this.ctx.currentTime;
   const osc = this.ctx.createOscillator();
   const g = this.ctx.createGain();
   osc.type = 'sine';
   osc.frequency.setValueAtTime(80, now);
   osc.frequency.exponentialRampToValueAtTime(18, now + 0.45);
   g.gain.setValueAtTime(0.9 * vol, now);
   g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
   osc.connect(g).connect(this.ctx.destination);
   osc.start(now); osc.stop(now + 0.5);

   const bufLen = Math.floor(this.ctx.sampleRate * 0.5);
   const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
   const d = buf.getChannelData(0);
   for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.2));
   const noise = this.ctx.createBufferSource(); noise.buffer = buf;
   const bpf = this.ctx.createBiquadFilter();
   bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(850, now);
   const ng = this.ctx.createGain();
   ng.gain.setValueAtTime(0.6 * vol, now);
   ng.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
   noise.connect(bpf).connect(ng).connect(this.ctx.destination);
   noise.start(now);
  },`;

if (src.includes(oldMethod)) {
  src = src.replace(oldMethod, newMethod);
  console.log("Updated playHydraulicSlam definition.");
} else {
  // Handle CRLF if needed
  src = src.replace(oldMethod.replace(/\n/g, '\r\n'), newMethod.replace(/\n/g, '\r\n'));
  console.log("Updated playHydraulicSlam with CRLF.");
}

// 2. Update updateHangarCrushers slam trigger with distance check & attenuation
const oldSlamTrigger = `    if (cycle >= 2.6 && (time - c.lastSlamTime > 1.5)) {
     c.lastSlamTime = time;
     Snd.playHydraulicSlam();
     spawnSparks(new T.Vector3(c.pos.x, 0.2, c.pos.z), new T.Vector3(0, 1, 0), 25);
     cameraShake = Math.max(cameraShake, 0.4);`;

const newSlamTrigger = `    if (cycle >= 2.6 && (time - c.lastSlamTime > 1.5)) {
     c.lastSlamTime = time;
     const distToCar = Math.hypot(pPos.x - c.pos.x, pPos.z - c.pos.z);
     if (distToCar < 85.0) {
      const vol = Math.max(0, 1 - distToCar / 85.0);
      Snd.playHydraulicSlam(vol);
      spawnSparks(new T.Vector3(c.pos.x, 0.2, c.pos.z), new T.Vector3(0, 1, 0), 25);
      cameraShake = Math.max(cameraShake, 0.45 * vol);
     }`;

if (src.includes(oldSlamTrigger)) {
  src = src.replace(oldSlamTrigger, newSlamTrigger);
  console.log("Updated updateHangarCrushers slam trigger.");
} else {
  src = src.replace(oldSlamTrigger.replace(/\n/g, '\r\n'), newSlamTrigger.replace(/\n/g, '\r\n'));
  console.log("Updated updateHangarCrushers with CRLF.");
}

fs.writeFileSync(gameJsPath, src, 'utf8');
console.log("Finished patching crusher sound.");
