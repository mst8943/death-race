const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', 'js', 'game.js');
let gameCode = fs.readFileSync(gameJsPath, 'utf8');

// 1. ADD SOUND METHODS TO Snd OBJECT
const sndMethodsToAdd = `
  playGarageShutter() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   // Shutter rattle: fast metallic clatter
   for (let i = 0; i < 9; i++) {
    const t = now + i * 0.045;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160 + (i % 3) * 60, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.035);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.035);
    osc.connect(g).connect(this.destSFX);
    osc.start(t); osc.stop(t + 0.035);
   }
   // Heavy metal slam at the end
   const slamTime = now + 0.42;
   const slamOsc = this.ctx.createOscillator();
   const slamGain = this.ctx.createGain();
   slamOsc.type = 'sine';
   slamOsc.frequency.setValueAtTime(85, slamTime);
   slamOsc.frequency.exponentialRampToValueAtTime(25, slamTime + 0.3);
   slamGain.gain.setValueAtTime(0.35, slamTime);
   slamGain.gain.exponentialRampToValueAtTime(0.01, slamTime + 0.3);
   slamOsc.connect(slamGain).connect(this.destSFX);
   slamOsc.start(slamTime); slamOsc.stop(slamTime + 0.3);
  },
  playPneumaticHiss() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   const bufLen = Math.floor(this.ctx.sampleRate * 0.35);
   const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
   const d = buf.getChannelData(0);
   for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.4));
   const src = this.ctx.createBufferSource();
   src.buffer = buf;
   const bpf = this.ctx.createBiquadFilter();
   bpf.type = 'bandpass';
   bpf.frequency.setValueAtTime(2600, now);
   bpf.frequency.exponentialRampToValueAtTime(800, now + 0.35);
   bpf.Q.value = 3.0;
   const g = this.ctx.createGain();
   g.gain.setValueAtTime(0.25, now);
   g.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
   src.connect(bpf).connect(g).connect(this.destSFX);
   src.start(now);
  },
  playAirWrench() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   // Rapid pneumatic impact wrench clicks (trrrr-clack!)
   for (let i = 0; i < 11; i++) {
    const t = now + i * 0.032;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(820 + (i % 2) * 120, t);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.024);
    osc.connect(g).connect(this.destSFX);
    osc.start(t); osc.stop(t + 0.024);
   }
   // Underlying air motor hiss
   this.playPneumaticHiss();
  },
  playEngineRev() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   // V8 Throttle rev surge
   const osc1 = this.ctx.createOscillator();
   const osc2 = this.ctx.createOscillator();
   const filter = this.ctx.createBiquadFilter();
   const gain = this.ctx.createGain();
   osc1.type = 'sawtooth';
   osc2.type = 'triangle';
   // Low rumble surging up to screaming roar and settling
   osc1.frequency.setValueAtTime(45, now);
   osc1.frequency.linearRampToValueAtTime(195, now + 0.38);
   osc1.frequency.exponentialRampToValueAtTime(52, now + 0.95);
   osc2.frequency.setValueAtTime(90, now);
   osc2.frequency.linearRampToValueAtTime(390, now + 0.38);
   osc2.frequency.exponentialRampToValueAtTime(104, now + 0.95);
   filter.type = 'lowpass';
   filter.frequency.setValueAtTime(320, now);
   filter.frequency.linearRampToValueAtTime(1250, now + 0.38);
   filter.frequency.exponentialRampToValueAtTime(360, now + 0.95);
   filter.Q.value = 3.5;
   gain.gain.setValueAtTime(0.38, now);
   gain.gain.linearRampToValueAtTime(0.55, now + 0.38);
   gain.gain.exponentialRampToValueAtTime(0.01, now + 1.05);
   osc1.connect(filter);
   osc2.connect(filter);
   filter.connect(gain).connect(this.destEngine || this.destSFX);
   osc1.start(now); osc1.stop(now + 1.05);
   osc2.start(now); osc2.stop(now + 1.05);

   // Exhaust pop-bang crackles
   setTimeout(() => { if (Snd && Snd.playMetalSnap) Snd.playMetalSnap(); }, 380);
   setTimeout(() => { if (Snd && Snd.playMetalSnap) Snd.playMetalSnap(); }, 490);
  },
`;

const targetSndPos = 'playWiperSound() {';
if (!gameCode.includes('playGarageShutter')) {
  gameCode = gameCode.replace(targetSndPos, sndMethodsToAdd + '\n  ' + targetSndPos);
  console.log("Added garage sound synthesizers to Snd object.");
} else {
  console.log("Garage sound synthesizers already present.");
}

fs.writeFileSync(gameJsPath, gameCode);
console.log("Step 1 Complete: Snd upgraded.");
