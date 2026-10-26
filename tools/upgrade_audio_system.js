const fs = require('fs');

let code = fs.readFileSync('js/game.js', 'utf8');

// 1. Replace Snd definition (lines 45 through 130)
const oldSndHead = `const Snd = {
 ctx: null,
 isMusicPlaying: false,
 musicTimer: null,
 musicStep: 0,
 init() {
  if (!this.ctx) {
   const AudioContext = window.AudioContext || window.webkitAudioContext;
   if (AudioContext) this.ctx = new AudioContext();
  }
  if (this.ctx && this.ctx.state === 'suspended') {
   this.ctx.resume();
  }
 },
 toggleMusic() {
  this.init();
  if (!this.ctx) return;
  this.isMusicPlaying = !this.isMusicPlaying;
  if (this.isMusicPlaying) {
   showBanner('ENDÜSTRİYEL METAL MÜZİK: AÇIK [M]');
   this.startMusicLoop();
  } else {
   showBanner('MÜZİK: KAPALI [M]');
   if (this.musicTimer) clearInterval(this.musicTimer);
  }
 },
 startMusicLoop() {
  if (this.musicTimer) clearInterval(this.musicTimer);
  // 130 BPM = ~115ms 16'lık adım
  const baseBassFreqs = [55, 55, 65, 55, 73, 55, 65, 49];
  this.musicTimer = setInterval(() => {
   if (!this.isMusicPlaying || !this.ctx) return;
   const now = this.ctx.currentTime;
   const step = this.musicStep++ % 16;

   // Kick Davul (Her 4 adımda)
   if (step % 4 === 0) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.08);
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.1);
   }

   // Snare / Metalik Çarpma (8 ve 12. adımlarda)
   if (step === 4 || step === 12) {
    const bufLen = Math.floor(this.ctx.sampleRate * 0.1);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.25));
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bpf = this.ctx.createBiquadFilter();
    bpf.type = 'highpass'; bpf.frequency.value = 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    noise.connect(bpf).connect(g).connect(this.ctx.destination);
    noise.start(now);
   }

   // Doom Tarzı Testere Dişi Synth Bass
   if (step % 2 === 0) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    const note = baseBassFreqs[(step / 2) % baseBassFreqs.length];
    osc.frequency.setValueAtTime(note, now);

    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(380, now);
    lpf.frequency.exponentialRampToValueAtTime(140, now + 0.14);
    lpf.Q.value = 4.0;

    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(lpf).connect(g).connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.14);
   }
  }, 115);
 },`;

const newSndHead = `const Snd = {
 ctx: null,
 masterGain: null,
 sfxGain: null,
 musicGain: null,
 voiceGain: null,
 engineGain: null,

 // V8 Kasap Motoru Sentezleyici Düğümleri
 engineOsc1: null,
 engineOsc2: null,
 engineFilter: null,
 engineGainNode: null,
 isEngineRunning: false,

 isMusicPlaying: false,
 musicTimer: null,
 musicStep: 0,

 settings: {
  master: 85,
  sfx: 90,
  engine: 75,
  music: 65,
  voice: 85,
  muted: false,
  engineEnabled: true,
  isMusicPlaying: false
 },

 get destSFX() { return this.sfxGain || this.masterGain || (this.ctx ? this.ctx.destination : null); },
 get destMusic() { return this.musicGain || this.masterGain || (this.ctx ? this.ctx.destination : null); },
 get destVoice() { return this.voiceGain || this.masterGain || (this.ctx ? this.ctx.destination : null); },

 init() {
  if (!this.ctx) {
   const AudioContext = window.AudioContext || window.webkitAudioContext;
   if (AudioContext) {
    this.ctx = new AudioContext();
    this.setupGainNodes();
    this.loadSettings();
   }
  }
  if (this.ctx && this.ctx.state === 'suspended') {
   this.ctx.resume();
  }
 },

 setupGainNodes() {
  if (!this.ctx || this.masterGain) return;
  this.masterGain = this.ctx.createGain();
  this.masterGain.connect(this.ctx.destination);

  this.sfxGain = this.ctx.createGain();
  this.sfxGain.connect(this.masterGain);

  this.musicGain = this.ctx.createGain();
  this.musicGain.connect(this.masterGain);

  this.voiceGain = this.ctx.createGain();
  this.voiceGain.connect(this.masterGain);

  this.engineGain = this.ctx.createGain();
  this.engineGain.connect(this.masterGain);

  this.applyGains();
 },

 applyGains() {
  if (!this.ctx || !this.masterGain) return;
  const now = this.ctx.currentTime;
  const m = this.settings.muted ? 0 : (this.settings.master / 100);
  this.masterGain.gain.setValueAtTime(m, now);
  this.sfxGain.gain.setValueAtTime(this.settings.sfx / 100, now);
  this.musicGain.gain.setValueAtTime(this.settings.music / 100, now);
  this.voiceGain.gain.setValueAtTime(this.settings.voice / 100, now);
  this.engineGain.gain.setValueAtTime((this.settings.engineEnabled ? this.settings.engine : 0) / 100, now);
 },

 loadSettings() {
  try {
   const saved = localStorage.getItem('death_race_audio_settings');
   if (saved) {
    const parsed = JSON.parse(saved);
    Object.assign(this.settings, parsed);
    this.isMusicPlaying = !!this.settings.isMusicPlaying;
   }
  } catch(e) {}
  this.applyGains();
  this.syncUI();
 },

 saveSettings() {
  try {
   this.settings.isMusicPlaying = this.isMusicPlaying;
   localStorage.setItem('death_race_audio_settings', JSON.stringify(this.settings));
  } catch(e) {}
  this.applyGains();
  this.syncUI();
 },

 setVolume(channel, val) {
  this.init();
  this.settings[channel] = Math.max(0, Math.min(100, parseInt(val, 10)));
  this.saveSettings();
 },

 toggleMute() {
  this.init();
  this.settings.muted = !this.settings.muted;
  this.saveSettings();
  showBanner(this.settings.muted ? '🔇 TÜM SESLER SUSTURULDU' : '🔊 SESLER AÇILDI');
 },

 toggleMusic() {
  this.init();
  this.isMusicPlaying = !this.isMusicPlaying;
  this.settings.isMusicPlaying = this.isMusicPlaying;
  this.saveSettings();
  if (this.isMusicPlaying) {
   showBanner('ENDÜSTRİYEL METAL MÜZİK: AÇIK [M]');
   this.startMusicLoop();
  } else {
   showBanner('MÜZİK: KAPALI [M]');
   if (this.musicTimer) clearInterval(this.musicTimer);
  }
 },

 toggleEngine() {
  this.init();
  this.settings.engineEnabled = !this.settings.engineEnabled;
  this.saveSettings();
  showBanner(this.settings.engineEnabled ? '🏎️ V8 MOTOR SESİ: AÇIK' : '🏎️ V8 MOTOR SESİ: KAPALI');
 },

 resetDefaults() {
  this.settings = {
   master: 85,
   sfx: 90,
   engine: 75,
   music: 65,
   voice: 85,
   muted: false,
   engineEnabled: true,
   isMusicPlaying: this.isMusicPlaying
  };
  this.saveSettings();
  showBanner('SES AYARLARI VARSAYILANLARA SIFIRLANDI');
 },

 syncUI() {
  const channels = ['master', 'sfx', 'engine', 'music', 'voice'];
  for (let ch of channels) {
   const slider = document.getElementById(\`slider-audio-\${ch}\`);
   const valTxt = document.getElementById(\`val-audio-\${ch}\`);
   if (slider) slider.value = this.settings[ch];
   if (valTxt) valTxt.textContent = \`\${this.settings[ch]}%\`;

   const gSlider = document.getElementById(\`garage-audio-\${ch}\`);
   const gValTxt = document.getElementById(\`garage-val-audio-\${ch}\`);
   if (gSlider) gSlider.value = this.settings[ch];
   if (gValTxt) gValTxt.textContent = \`\${this.settings[ch]}%\`;
  }

  const muteBtn = document.getElementById('btn-audio-mute');
  if (muteBtn) {
   muteBtn.textContent = this.settings.muted ? '🔊 AÇ' : '🔇 SUSTUR';
   muteBtn.classList.toggle('muted', this.settings.muted);
  }

  const musicBtn = document.getElementById('btn-audio-music');
  if (musicBtn) {
   musicBtn.textContent = this.isMusicPlaying ? '🎵 AÇIK [M]' : '🎵 KAPALI [M]';
   musicBtn.classList.toggle('active', this.isMusicPlaying);
  }

  const engineBtn = document.getElementById('btn-audio-engine');
  if (engineBtn) {
   engineBtn.textContent = this.settings.engineEnabled ? '🏎️ DEVREDE' : '🏎️ KAPALI';
   engineBtn.classList.toggle('active', this.settings.engineEnabled);
  }

  const topIcon = document.getElementById('top-audio-icon');
  if (topIcon) {
   topIcon.textContent = this.settings.muted ? '🔇' : (this.settings.master < 40 ? '🔉' : '🔊');
  }
 },

 startEngineAudio() {
  if (this.engineOsc1 || !this.ctx) return;
  const now = this.ctx.currentTime;
  
  const osc1 = this.ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(36, now);

  const osc2 = this.ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(72, now);

  const lpf = this.ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.setValueAtTime(240, now);
  lpf.Q.value = 2.5;

  const g = this.ctx.createGain();
  g.gain.setValueAtTime(0.2, now);

  osc1.connect(lpf);
  osc2.connect(lpf);
  lpf.connect(g);
  g.connect(this.engineGain || this.masterGain || this.ctx.destination);

  try {
   osc1.start(now);
   osc2.start(now);
  } catch(e) {}

  this.engineOsc1 = osc1;
  this.engineOsc2 = osc2;
  this.engineFilter = lpf;
  this.engineGainNode = g;
  this.isEngineRunning = true;
 },

 updateEngine(speedKmh, isThrottle) {
  if (!this.ctx || carHealth <= 0) {
   if (this.engineGainNode) this.engineGainNode.gain.setValueAtTime(0, this.ctx ? this.ctx.currentTime : 0);
   return;
  }
  if (!this.engineOsc1) {
   this.startEngineAudio();
   return;
  }
  const now = this.ctx.currentTime;
  const ratio = Math.min(1.0, Math.max(0, speedKmh / 240));
  const throttleBoost = isThrottle ? 22 : 0;
  const baseFreq = 38 + ratio * 135 + throttleBoost;

  this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
  this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.08);
  this.engineFilter.frequency.setTargetAtTime(220 + ratio * 600 + (isThrottle ? 160 : 0), now, 0.08);
  
  const targetGain = this.settings.engineEnabled ? (0.16 + ratio * 0.14 + (isThrottle ? 0.07 : 0)) : 0;
  this.engineGainNode.gain.setTargetAtTime(targetGain, now, 0.08);
 },

 startMusicLoop() {
  if (this.musicTimer) clearInterval(this.musicTimer);
  const baseBassFreqs = [55, 55, 65, 55, 73, 55, 65, 49];
  this.musicTimer = setInterval(() => {
   if (!this.isMusicPlaying || !this.ctx) return;
   const now = this.ctx.currentTime;
   const step = this.musicStep++ % 16;

   // Kick Davul
   if (step % 4 === 0) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.08);
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(g).connect(this.destMusic);
    osc.start(now); osc.stop(now + 0.1);
   }

   // Snare
   if (step === 4 || step === 12) {
    const bufLen = Math.floor(this.ctx.sampleRate * 0.1);
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.25));
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const bpf = this.ctx.createBiquadFilter();
    bpf.type = 'highpass'; bpf.frequency.value = 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    noise.connect(bpf).connect(g).connect(this.destMusic);
    noise.start(now);
   }

   // Doom Bass
   if (step % 2 === 0) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    const note = baseBassFreqs[(step / 2) % baseBassFreqs.length];
    osc.frequency.setValueAtTime(note, now);

    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(380, now);
    lpf.frequency.exponentialRampToValueAtTime(140, now + 0.14);
    lpf.Q.value = 4.0;

    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(lpf).connect(g).connect(this.destMusic);
    osc.start(now); osc.stop(now + 0.14);
   }
  }, 115);
 },`;

if (code.includes('const Snd = {')) {
  // Normalize line endings for replacement
  const cleanOld = oldSndHead.replace(/\r\n/g, '\n');
  const cleanCode = code.replace(/\r\n/g, '\n');
  if (cleanCode.includes(cleanOld)) {
    code = cleanCode.replace(cleanOld, newSndHead);
  } else {
    console.error('Warning: exact oldSndHead match failed. Doing regex replacement...');
    code = cleanCode.replace(/const Snd = \{[\s\S]*?startMusicLoop\(\) \{[\s\S]*?\}, 115\);\s*\},/, newSndHead);
  }
}

// 2. Route voice/radio methods to this.destVoice
const voiceMethods = [
  'playRadioChirp', 'playRadioStatic', 'playPAChime', 'playComboChime',
  'playPadChime', 'playPowerup', 'playCheckpoint'
];
for (let vm of voiceMethods) {
  const reg = new RegExp(`(${vm}\\([\\s\\S]*?\\{)([\\s\\S]*?)(^\\s*\\},)`, 'm');
  code = code.replace(reg, (match, head, body, tail) => {
    return head + body.replace(/\.connect\(this\.ctx\.destination\)/g, '.connect(this.destVoice)') + tail;
  });
}

// 3. Route all remaining methods in Snd to this.destSFX
const sndBlockMatch = code.match(/const Snd = \{([\s\S]*?)\n\};/);
if (sndBlockMatch) {
  const sndBody = sndBlockMatch[1];
  const updatedSndBody = sndBody.replace(/\.connect\(this\.ctx\.destination\)/g, '.connect(this.destSFX)');
  code = code.replace(sndBody, updatedSndBody);
}

// 4. Hook Snd.updateEngine into updateControls
if (!code.includes('Snd.updateEngine(')) {
  code = code.replace(
    'targetFOV = 62 + speedRatio * 18 + (usingNitro ? 12 : 0);',
    'targetFOV = 62 + speedRatio * 18 + (usingNitro ? 12 : 0);\n Snd.updateEngine(speedKmh, isPressingForward);'
  );
}

// 5. Add Key listeners for J (Audio modal) and Escape
if (!code.includes("k === 'j'")) {
  code = code.replace(
    "if (k === 'g') { toggleGarage(); }",
    "if (k === 'g') { toggleGarage(); }\n if (k === 'j') { toggleAudioModal(); }\n if (e.key === 'Escape') { closeAudioModal(); }"
  );
}

// 6. Expose Audio modal functions on window
if (!code.includes('window.toggleAudioModal')) {
  code += `\n
/* ==========================================================
   SES & MÜZİK AYARLARI KULLANICI ARAYÜZÜ FONKSİYONLARI
   ========================================================== */
function toggleAudioModal() {
 const el = document.getElementById('audio-modal');
 if (!el) return;
 const isOpen = el.classList.toggle('open');
 if (isOpen) {
  Snd.init();
  Snd.syncUI();
 }
}
window.toggleAudioModal = toggleAudioModal;

function closeAudioModal() {
 const el = document.getElementById('audio-modal');
 if (el) el.classList.remove('open');
}
window.closeAudioModal = closeAudioModal;

function setAudioVolume(channel, val) {
 Snd.setVolume(channel, val);
}
window.setAudioVolume = setAudioVolume;

function toggleAudioMute() {
 Snd.toggleMute();
}
window.toggleAudioMute = toggleAudioMute;

function toggleAudioMusic() {
 Snd.toggleMusic();
}
window.toggleAudioMusic = toggleAudioMusic;

function toggleEngineSound() {
 Snd.toggleEngine();
}
window.toggleEngineSound = toggleEngineSound;

function resetAudioDefaults() {
 Snd.resetDefaults();
}
window.resetAudioDefaults = resetAudioDefaults;

function testAudioSound(type) {
 Snd.init();
 if (type === 'sfx') {
  Snd.playExplosion();
  setTimeout(() => Snd.playMetalSnap(), 140);
 } else if (type === 'voice') {
  Snd.playRadioStatic();
  setTimeout(() => Snd.playRadioChirp(), 150);
  setTimeout(() => showRadioMessage('Telsiz kontrol! Case devrede, sinyal net Frankenstein!', 'case'), 280);
 }
}
window.testAudioSound = testAudioSound;
window.Snd = Snd;
`;
}

fs.writeFileSync('js/game.js', code, 'utf8');
console.log('Audio system upgrade applied successfully.');
