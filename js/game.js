// Death Race — Three.js + cannon-es + Silahlar + Hasar/Parçalanma + Terminal Island Pisti & Zemin Plakaları + Yapay Zeka + Reyting + Cephanelik + Nitro + Drift + Telsiz + Yıkılabilir Kuleler + THE DREADNOUGHT Boss Tankı + Asit Yağmuru / Gece + Weyland Haber Helikopteri + Garaj Yükseltmeleri + Eleme Modu + Endüstriyel Müzik Motoru
const T = THREE;
const CANNON = window.CANNON;
const canvas = document.getElementById('cv');
const dbg = document.getElementById('dbg');
const spdEl = document.getElementById('spd');
const ammoFill = document.getElementById('ammo-fill');
const nitroFill = document.getElementById('nitro-fill');
const nitroText = document.getElementById('nitro-text');
const armorFill = document.getElementById('armor-fill');
const armorText = document.getElementById('armor-text');
const lapNumEl = document.getElementById('lap-num');
const lapTimeEl = document.getElementById('lap-time');
const bestTimeEl = document.getElementById('best-time');
const bannerEl = document.getElementById('banner');
const buffBoxEl = document.getElementById('buff-box');
const radioBoxEl = document.getElementById('radio-box');
const radioTextEl = document.getElementById('radio-text');
let eliminationTimerEl = document.getElementById('elimination-timer');
const eliminationHudEl = document.getElementById('elimination-hud');

// Reyting & Liderlik Tablosu DOM Elementleri
const viewersValEl = document.getElementById('viewers-val');
const currencyValEl = document.getElementById('currency-val');
const posValEl = document.getElementById('pos-val');
const playerHpTxt = document.getElementById('player-hp-txt');
const playerRivalFill = document.getElementById('player-rival-fill');

// Dreadnought Boss Bar DOM
const bossHudEl = document.getElementById('boss-hud');
const bossHpTxt = document.getElementById('boss-hp-txt');
const bossFillEl = document.getElementById('boss-fill');

// Garaj Modalı DOM
const garageModalEl = document.getElementById('garage-modal');
const garageCreditsEl = document.getElementById('garage-credits');

// İkincil Silah Yuvaları
const slotRPG = document.getElementById('slot-rpg');
const slotOil = document.getElementById('slot-oil');
const slotCaltrop = document.getElementById('slot-caltrop');

/* ==========================================================
   WEB AUDIO API SYNTHESIZER & ENDÜSTRİYEL MÜZİK MOTORU
   ========================================================== */
// Number.prototype.toLocaleString her çağrıda yeni bir Intl.NumberFormat kurar (çağrı başına ~0.1-1 ms).
// Her mermi isabetinde addViewers() bunu çağırıyordu; tek bir önbellekli formatlayıcı kullanılır.
const TR_NUMBER_FORMAT = new Intl.NumberFormat('tr-TR');
// Kayıtlı ilerleme geri yüklenirken garaj fonksiyonlarının banner/telsiz/ses üretmesini engeller
let silentRestore = false;
function fmtTR(n) { return TR_NUMBER_FORMAT.format(n); }

const Snd = {
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

 // Gürültü buffer önbelleği: her atış/patlamada binlerce örneklik AudioBuffer üretmek yerine
 // anahtar başına birkaç varyant bir kez üretilir ve yeniden kullanılır (sıfır GC, sıfır CPU spike).
 _noiseCache: {},
 noiseBuffer(key, dur, fn) {
  let variants = this._noiseCache[key];
  if (!variants) variants = this._noiseCache[key] = [];
  if (variants.length < 3) {
   const n = Math.floor(this.ctx.sampleRate * dur);
   const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
   const d = buf.getChannelData(0);
   for (let i = 0; i < n; i++) d[i] = fn(i, n);
   variants.push(buf);
   return buf;
  }
  return variants[(Math.random() * variants.length) | 0];
 },

 // Aynı efektin aynı anda onlarca kez çalınmasını engeller (4 AI + oyuncu minigun'ı saniyede ~50 atış).
 _lastPlay: {},
 gate(key, minIntervalMs) {
  const t = performance.now();
  if (t - (this._lastPlay[key] || 0) < minIntervalMs) return false;
  this._lastPlay[key] = t;
  return true;
 },

 get destSFX() { return this.sfxGain || this.masterGain || (this.ctx ? this.ctx.destination : null); },
 get destMusic() { return this.musicGain || this.masterGain || (this.ctx ? this.ctx.destination : null); },
 get destVoice() { return this.voiceGain || this.masterGain || (this.ctx ? this.ctx.destination : null); },

 init() {
  if (silentRestore) return;
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
  // Not: önceden this.destSFX'e bağlanıyordu; o anda sfxGain null olduğu için masterGain kendine
  // bağlanıp (gecikmesiz döngü = sessizlik) hiçbir ses hoparlöre ulaşmıyordu.
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
   const slider = document.getElementById(`slider-audio-${ch}`);
   const valTxt = document.getElementById(`val-audio-${ch}`);
   if (slider) slider.value = this.settings[ch];
   if (valTxt) valTxt.textContent = `${this.settings[ch]}%`;

   const gSlider = document.getElementById(`garage-audio-${ch}`);
   const gValTxt = document.getElementById(`garage-val-audio-${ch}`);
   if (gSlider) gSlider.value = this.settings[ch];
   if (gValTxt) gValTxt.textContent = `${this.settings[ch]}%`;
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
  // Her karede (165 Hz) 4 AudioParam'a setTargetAtTime eklemek otomasyon zaman çizelgesini şişirir;
  // 20 Hz güncelleme kulakta farksızdır (zaman sabiti zaten 80 ms).
  const tNow = performance.now();
  if (tNow - (this._lastEngineUpdate || 0) < 50) return;
  this._lastEngineUpdate = tNow;
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
    const buf = this.noiseBuffer('0.1|(Math.random() * 2 - 1) * Math.exp(-i / (n * 0.25))', 0.1, (i, n) => (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.25)));
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
 },
 playThunder() {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  const buf = this.noiseBuffer('1.5|(Math.random() * 2 - 1) * Math.exp(-i / (n * 0.4))', 1.5, (i, n) => (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.4)));
  const noise = this.ctx.createBufferSource();
  noise.buffer = buf;
  const lpf = this.ctx.createBiquadFilter();
  lpf.type = 'lowpass'; lpf.frequency.setValueAtTime(280, now);
  lpf.frequency.exponentialRampToValueAtTime(35, now + 1.5);
  const g = this.ctx.createGain();
  g.gain.setValueAtTime(0.85, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
  noise.connect(lpf).connect(g).connect(this.destSFX);
  noise.start(now);
 },
 playGunshot(isEnemy = false) {
  this.init();
  if (!this.ctx) return;
  if (!this.gate(isEnemy ? 'gunE' : 'gunP', isEnemy ? 45 : 30)) return;
  const now = this.ctx.currentTime;
  const buf = this.noiseBuffer('0.08|(Math.random() * 2 - 1) * Math.exp(-i / (n * 0.3))', 0.08, (i, n) => (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.3)));
  const noise = this.ctx.createBufferSource();
  noise.buffer = buf;

  const bpf = this.ctx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.setValueAtTime(isEnemy ? 1900 : 2600, now);
  bpf.frequency.exponentialRampToValueAtTime(isEnemy ? 220 : 320, now + 0.08);
  bpf.Q.value = 2.5;

  const nGain = this.ctx.createGain();
  nGain.gain.setValueAtTime(isEnemy ? 0.25 : 0.45, now);
  nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

  noise.connect(bpf).connect(nGain).connect(this.destSFX);
  noise.start(now);

  const osc = this.ctx.createOscillator();
  const oGain = this.ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(isEnemy ? 130 : 160, now);
  osc.frequency.exponentialRampToValueAtTime(35, now + 0.09);
  oGain.gain.setValueAtTime(isEnemy ? 0.3 : 0.5, now);
  oGain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
  osc.connect(oGain).connect(this.destSFX);
  osc.start(now); osc.stop(now + 0.09);
 },
 playRocketLaunch() {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  const buf = this.noiseBuffer('0.45|(Math.random() * 2 - 1)', 0.45, (i, n) => (Math.random() * 2 - 1));
  const src = this.ctx.createBufferSource(); src.buffer = buf;
  const bpf = this.ctx.createBiquadFilter();
  bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(400, now);
  bpf.frequency.exponentialRampToValueAtTime(1400, now + 0.45);
  const g = this.ctx.createGain();
  g.gain.setValueAtTime(0.7, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
  src.connect(bpf).connect(g).connect(this.destSFX);
  src.start(now);
 },
 playCannonShot() {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  const osc = this.ctx.createOscillator();
  const g = this.ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(25, now + 0.4);
  g.gain.setValueAtTime(0.9, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
  osc.connect(g).connect(this.destSFX);
  osc.start(now); osc.stop(now + 0.45);
 },
 playNitroSound() {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  const osc = this.ctx.createOscillator();
  const g = this.ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
  g.gain.setValueAtTime(0.2, now);
  g.gain.linearRampToValueAtTime(0.01, now + 0.25);
  osc.connect(g).connect(this.destSFX);
  osc.start(now); osc.stop(now + 0.25);
 },
 playTireScreech() {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  const buf = this.noiseBuffer('0.2|(Math.random() * 2 - 1)', 0.2, (i, n) => (Math.random() * 2 - 1));
  const src = this.ctx.createBufferSource(); src.buffer = buf;
  const bpf = this.ctx.createBiquadFilter();
  bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(1800 + Math.random() * 400, now);
  bpf.Q.value = 4.0;
  const g = this.ctx.createGain();
  g.gain.setValueAtTime(0.18, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
  src.connect(bpf).connect(g).connect(this.destSFX);
  src.start(now);
 },
 playRadioChirp() {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  const osc = this.ctx.createOscillator();
  const g = this.ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(950, now);
  osc.frequency.setValueAtTime(1300, now + 0.04);
  g.gain.setValueAtTime(0.3, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
  osc.connect(g).connect(this.destVoice);
  osc.start(now); osc.stop(now + 0.12);
 },
 playImpact() {
  this.init();
  if (!this.ctx) return;
  if (!this.gate('impact', 35)) return;
  const now = this.ctx.currentTime;
  const osc = this.ctx.createOscillator();
  const g = this.ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(900 + Math.random() * 400, now);
  osc.frequency.exponentialRampToValueAtTime(140, now + 0.05);
  g.gain.setValueAtTime(0.2, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
  osc.connect(g).connect(this.destSFX);
  osc.start(now); osc.stop(now + 0.05);
 },
 playExplosion() {
  this.init();
  if (!this.ctx) return;
  if (!this.gate('explosion', 70)) return;
  const now = this.ctx.currentTime;
  const buf = this.noiseBuffer('0.9|(Math.random() * 2 - 1) * Math.exp(-i / (n * 0.35))', 0.9, (i, n) => (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.35)));
  const noise = this.ctx.createBufferSource(); noise.buffer = buf;
  const lpf = this.ctx.createBiquadFilter();
  lpf.type = 'lowpass'; lpf.frequency.setValueAtTime(700, now);
  lpf.frequency.exponentialRampToValueAtTime(45, now + 0.85);
  const nGain = this.ctx.createGain();
  nGain.gain.setValueAtTime(0.95, now);
  nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
  noise.connect(lpf).connect(nGain).connect(this.destSFX);
  noise.start(now);

  const sub = this.ctx.createOscillator();
  const subG = this.ctx.createGain();
  sub.type = 'sine'; sub.frequency.setValueAtTime(95, now);
  sub.frequency.exponentialRampToValueAtTime(22, now + 0.8);
  subG.gain.setValueAtTime(0.7, now);
  subG.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
  sub.connect(subG).connect(this.destSFX);
  sub.start(now); sub.stop(now + 0.8);
 },
 playMetalSnap() {
  this.init();
  if (!this.ctx) return;
  if (!this.gate('snap', 45)) return;
  const now = this.ctx.currentTime;
  const osc = this.ctx.createOscillator();
  const g = this.ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(1400, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
  g.gain.setValueAtTime(0.6, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
  osc.connect(g).connect(this.destSFX);
  osc.start(now); osc.stop(now + 0.18);
 },
 playMenuClick() {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  const osc = this.ctx.createOscillator();
  const g = this.ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(650, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
  g.gain.setValueAtTime(0.35, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
  osc.connect(g).connect(this.destSFX);
  osc.start(now); osc.stop(now + 0.08);
 },
 playCrash(intensity = 0.5) {
  this.init();
  if (!this.ctx) return;
  if (!this.gate('crash', 50)) return;
  const now = this.ctx.currentTime;
  const buf = this.noiseBuffer('0.35|(Math.random() * 2 - 1) * Math.exp(-i / (n * 0.25))', 0.35, (i, n) => (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.25)));
  const noise = this.ctx.createBufferSource(); noise.buffer = buf;
  const bpf = this.ctx.createBiquadFilter();
  bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(800, now);
  bpf.frequency.exponentialRampToValueAtTime(120, now + 0.35);
  const g = this.ctx.createGain();
  g.gain.setValueAtTime(Math.min(1.0, 0.3 + intensity * 0.6), now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
  noise.connect(bpf).connect(g).connect(this.destSFX);
  noise.start(now);
 },
 playHiss() {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  const buf = this.noiseBuffer('1.2|(Math.random() * 2 - 1)', 1.2, (i, n) => (Math.random() * 2 - 1));
  const src = this.ctx.createBufferSource(); src.buffer = buf;
  const bpf = this.ctx.createBiquadFilter();
  bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(1100, now);
  bpf.Q.value = 1.2;
  const g = this.ctx.createGain();
  g.gain.setValueAtTime(0.4, now);
  g.gain.linearRampToValueAtTime(0.01, now + 1.2);
  src.connect(bpf).connect(g).connect(this.destSFX);
  src.start(now);
 },
 
  playRadioStatic() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   const buf = this.noiseBuffer('0.14|(Math.random() * 2 - 1) * 0.35', 0.14, (i, n) => (Math.random() * 2 - 1) * 0.35);
   const src = this.ctx.createBufferSource(); src.buffer = buf;
   const bpf = this.ctx.createBiquadFilter();
   bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(1750, now);
   const g = this.ctx.createGain();
   g.gain.setValueAtTime(0.25, now);
   g.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
   src.connect(bpf).connect(g).connect(this.destVoice);
   src.start(now);
  },
  
  playEMPDischarge() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   const osc = this.ctx.createOscillator();
   const g = this.ctx.createGain();
   osc.type = 'sawtooth';
   osc.frequency.setValueAtTime(2400, now);
   osc.frequency.exponentialRampToValueAtTime(110, now + 0.45);
   g.gain.setValueAtTime(0.7, now);
   g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
   osc.connect(g).connect(this.destSFX);
   osc.start(now); osc.stop(now + 0.5);

   const buf = this.noiseBuffer('0.35|(Math.random() * 2 - 1) * Math.sin(i * 0.1)', 0.35, (i, n) => (Math.random() * 2 - 1) * Math.sin(i * 0.1));
   const src = this.ctx.createBufferSource(); src.buffer = buf;
   const bpf = this.ctx.createBiquadFilter();
   bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(3200, now);
   const ng = this.ctx.createGain();
   ng.gain.setValueAtTime(0.4, now);
   ng.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
   src.connect(bpf).connect(ng).connect(this.destSFX);
   src.start(now);
  },
  playMineBeep() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   const osc = this.ctx.createOscillator();
   const g = this.ctx.createGain();
   osc.type = 'sine';
   osc.frequency.setValueAtTime(1800, now);
   g.gain.setValueAtTime(0.25, now);
   g.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
   osc.connect(g).connect(this.destSFX);
   osc.start(now); osc.stop(now + 0.08);
  },
  playPneumaticPiston() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   const buf = this.noiseBuffer('0.4|(Math.random() * 2 - 1)', 0.4, (i, n) => (Math.random() * 2 - 1));
   const src = this.ctx.createBufferSource(); src.buffer = buf;
   const lpf = this.ctx.createBiquadFilter();
   lpf.type = 'lowpass'; lpf.frequency.setValueAtTime(1400, now);
   lpf.frequency.exponentialRampToValueAtTime(100, now + 0.35);
   const g = this.ctx.createGain();
   g.gain.setValueAtTime(0.6, now);
   g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
   src.connect(lpf).connect(g).connect(this.destSFX);
   src.start(now);
  },
  playComboChime() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   for (let [idx, freq] of [440, 554, 659, 880].entries()) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.06);
    g.gain.setValueAtTime(0.3, now + idx * 0.06);
    g.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.3);
    osc.connect(g).connect(this.destVoice);
    osc.start(now + idx * 0.06); osc.stop(now + idx * 0.06 + 0.3);
   }
  },
  playTakedownSting() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   const sub = this.ctx.createOscillator();
   const subG = this.ctx.createGain();
   sub.type = 'sawtooth';
   sub.frequency.setValueAtTime(140, now);
   sub.frequency.exponentialRampToValueAtTime(28, now + 0.7);
   subG.gain.setValueAtTime(0.85, now);
   subG.gain.exponentialRampToValueAtTime(0.01, now + 0.75);
   sub.connect(subG).connect(this.destSFX);
   sub.start(now); sub.stop(now + 0.75);
   for (let f of [220, 277, 330, 440]) {
    const o = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, now);
    og.gain.setValueAtTime(0.16, now);
    og.gain.exponentialRampToValueAtTime(0.01, now + 0.85);
    o.connect(og).connect(this.destSFX);
    o.start(now); o.stop(now + 0.85);
   }
  },
  playAirRaidSiren() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   const osc = this.ctx.createOscillator();
   const g = this.ctx.createGain();
   osc.type = 'triangle';
   osc.frequency.setValueAtTime(380, now);
   osc.frequency.linearRampToValueAtTime(740, now + 0.8);
   osc.frequency.linearRampToValueAtTime(360, now + 1.6);
   g.gain.setValueAtTime(0.35, now);
   g.gain.exponentialRampToValueAtTime(0.01, now + 1.8);
   osc.connect(g).connect(this.destSFX);
   osc.start(now); osc.stop(now + 1.8);
  },
  playPadChime() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   for (let [i, f] of [523, 659, 783, 1046].entries()) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now + i * 0.05);
    g.gain.setValueAtTime(0.2, now + i * 0.05);
    g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.35);
    osc.connect(g).connect(this.destVoice);
    osc.start(now + i * 0.05); osc.stop(now + i * 0.05 + 0.35);
   }
  },
  playPowerup(type) {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  if (type === 'sword') {
   for (let [idx, freq] of [330, 440, 660].entries()) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + idx * 0.06);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.4);
    g.gain.setValueAtTime(0.25, now + idx * 0.06);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    osc.connect(g).connect(this.destVoice);
    osc.start(now + idx * 0.06); osc.stop(now + 0.45);
   }
  } else if (type === 'shield') {
   const osc = this.ctx.createOscillator();
   const g = this.ctx.createGain();
   osc.type = 'sine'; osc.frequency.setValueAtTime(220, now);
   osc.frequency.exponentialRampToValueAtTime(880, now + 0.45);
   g.gain.setValueAtTime(0.4, now);
   g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
   osc.connect(g).connect(this.destVoice);
   osc.start(now); osc.stop(now + 0.5);
  }
 },
 playFlameJet() {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  const buf = this.noiseBuffer('0.8|(Math.random() * 2 - 1)', 0.8, (i, n) => (Math.random() * 2 - 1));
  const src = this.ctx.createBufferSource(); src.buffer = buf;
  const bpf = this.ctx.createBiquadFilter();
  bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(650, now);
  bpf.Q.value = 1.0;
  const g = this.ctx.createGain();
  g.gain.setValueAtTime(0.65, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
  src.connect(bpf).connect(g).connect(this.destSFX);
  src.start(now);
 },
 playCheckpoint() {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  for (let [idx, freq] of [587, 880, 1174].entries()) {
   const osc = this.ctx.createOscillator();
   const g = this.ctx.createGain();
   osc.type = 'sine';
   osc.frequency.setValueAtTime(freq, now + idx * 0.07);
   g.gain.setValueAtTime(0.25, now + idx * 0.07);
   g.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
   osc.connect(g).connect(this.destVoice);
   osc.start(now + idx * 0.07); osc.stop(now + 0.35);
  }
 },
 playPAChime() {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  const notes = [659.25, 880.0];
  notes.forEach((freq, i) => {
   const osc = this.ctx.createOscillator();
   const g = this.ctx.createGain();
   osc.type = 'sine';
   osc.frequency.setValueAtTime(freq, now + i * 0.16);
   g.gain.setValueAtTime(0.35, now + i * 0.16);
   g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.16 + 0.38);
   osc.connect(g).connect(this.destVoice);
   osc.start(now + i * 0.16); osc.stop(now + i * 0.16 + 0.38);
  });
 },
 playHydraulicSlam(vol = 1.0) {
  this.init();
  if (!this.ctx || vol <= 0.01) return;
  const now = this.ctx.currentTime;
  const osc = this.ctx.createOscillator();
  const g = this.ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, now);
  osc.frequency.exponentialRampToValueAtTime(18, now + 0.45);
  g.gain.setValueAtTime(0.9, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  osc.connect(g).connect(this.destSFX);
  osc.start(now); osc.stop(now + 0.5);

  const buf = this.noiseBuffer('0.5|(Math.random() * 2 - 1) * Math.exp(-i / (n * 0.2))', 0.5, (i, n) => (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.2)));
  const noise = this.ctx.createBufferSource(); noise.buffer = buf;
  const bpf = this.ctx.createBiquadFilter();
  bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(850, now);
  const ng = this.ctx.createGain();
  ng.gain.setValueAtTime(0.6 * vol, now);
  ng.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  noise.connect(bpf).connect(ng).connect(this.destSFX);
  noise.start(now);
 },
 playHeavyGunshot() {
  this.init();
  if (!this.ctx) return;
  if (!this.gate('gunH', 30)) return;
  const now = this.ctx.currentTime;
  const osc = this.ctx.createOscillator();
  const og = this.ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(95, now);
  osc.frequency.exponentialRampToValueAtTime(28, now + 0.12);
  og.gain.setValueAtTime(0.65, now);
  og.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
  osc.connect(og).connect(this.destSFX);
  osc.start(now); osc.stop(now + 0.12);

  const buf = this.noiseBuffer('0.1|(Math.random() * 2 - 1) * Math.exp(-i / (n * 0.25))', 0.1, (i, n) => (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.25)));
  const noise = this.ctx.createBufferSource(); noise.buffer = buf;
  const bpf = this.ctx.createBiquadFilter();
  bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(2100, now);
  bpf.Q.value = 1.8;
  const ng = this.ctx.createGain();
  ng.gain.setValueAtTime(0.55, now);
  ng.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  noise.connect(bpf).connect(ng).connect(this.destSFX);
  noise.start(now);
 },
 playCraneSnap() {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  const osc = this.ctx.createOscillator();
  const g = this.ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(2600, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.22);
  g.gain.setValueAtTime(0.7, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
  osc.connect(g).connect(this.destSFX);
  osc.start(now); osc.stop(now + 0.25);
 },
 
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
   const buf = this.noiseBuffer('0.35|(Math.random() * 2 - 1) * Math.exp(-i / (n * 0.4))', 0.35, (i, n) => (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.4)));
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

  playWiperSound() {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  const osc = this.ctx.createOscillator();
  const g = this.ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1100, now);
  osc.frequency.linearRampToValueAtTime(1400, now + 0.08);
  g.gain.setValueAtTime(0.12, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  osc.connect(g).connect(this.destSFX);
  osc.start(now); osc.stop(now + 0.1);
 },
 updateCrowd(vol, speed) {
  if (!this.ctx) return;
  if (!this.crowdSource) {
   const buf = this.noiseBuffer('2.0|(Math.random() * 2 - 1) * 0.4', 2.0, (i, n) => (Math.random() * 2 - 1) * 0.4);
   this.crowdSource = this.ctx.createBufferSource();
   this.crowdSource.buffer = buf;
   this.crowdSource.loop = true;
   const bpf = this.ctx.createBiquadFilter();
   bpf.type = 'bandpass'; bpf.frequency.value = 750; bpf.Q.value = 1.0;
   this.crowdGain = this.ctx.createGain();
   this.crowdGain.gain.value = 0;
   this.crowdSource.connect(bpf).connect(this.crowdGain).connect(this.destSFX);
   try { this.crowdSource.start(); } catch (e) {}
  }
  if (this.crowdGain) {
   const tNow = performance.now();
   if (tNow - (this._lastCrowdUpdate || 0) < 100) return;
   this._lastCrowdUpdate = tNow;
   const targetGain = Math.min(0.35, (vol * (speed / 30)) * 0.35);
   this.crowdGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.2);
  }
 }
};

/* ==========================================================
   GARAJ & YÜKSELTMELER SİSTEMİ (UPGRADE SYSTEM)
   ========================================================== */
let playerCredits = 150000;
const upgrades = {
 engine: 1, // 1..3
 armor: 1,  // 1..3
 gun: 1,    // 1..3
 rocket: 1  // 1..3
};

let savedRaceState = null;
const GARAGE_POS = { x: -3200, z: -3200 };
let garageFromMenu = false;
function toggleGarage() {
 const isOpen = garageModalEl.classList.toggle('open');
 garageModeActive = isOpen;
 document.body.classList.toggle('garage-open', isOpen);
 const modeModal = document.getElementById('mode-select-modal');
 if (isOpen) {
  // Menüden girildiyse yarış başlamış sayılmaz; menü kapanır, garajdan çıkınca menüye dönülür
  garageFromMenu = !isGameStarted;
  if (garageFromMenu && modeModal) modeModal.classList.remove('open', 'closing');
  // 1. Yarış konumunu ve hızını kaydet
  savedRaceState = {
   pos: chassisBody.position.clone(),
   quat: chassisBody.quaternion.clone(),
   vel: chassisBody.velocity.clone()
  };

  // 2. Aracı Showroom Turntable zeminine (Y = -350) ışınla
  chassisBody.position.set(GARAGE_POS.x, 0.85, GARAGE_POS.z);
  chassisBody.quaternion.set(0, 0, 0, 1);
  chassisBody.velocity.set(0, 0, 0);
  chassisBody.angularVelocity.set(0, 0, 0);
  carGroup.position.copy(chassisBody.position);
  carGroup.quaternion.copy(chassisBody.quaternion);

  // 3. Showroom atölye ortamını ve ışıklarını aktif et
  if (typeof garageShowroomGroup !== 'undefined') {
   garageShowroomGroup.visible = true;
  }

  // 4. Kamerayı genel bakış açısına ayarla
  setGarageCameraPreset('overview');

  // 5. Ses efektleri & arayüz güncellemesi
  Snd.playGarageShutter();
  Snd.playPneumaticHiss();
  updateGarageStatsUI();
  updateCarVisualUpgrades();

  garageCreditsEl.textContent = fmtTR(playerCredits);
  showRadioMessage('Weyland Motorworks atölyesine hoş geldin! Frankenstein lifte alındı, modifiye için hazır!', 'case');
 } else {
  // Garajdan Çıkış: Piste geri dön
  if (savedRaceState) {
   chassisBody.position.copy(savedRaceState.pos);
   chassisBody.quaternion.copy(savedRaceState.quat);
   chassisBody.velocity.set(0, 0, 0);
   chassisBody.angularVelocity.set(0, 0, 0);
   carGroup.position.copy(chassisBody.position);
   carGroup.quaternion.copy(chassisBody.quaternion);
  }

  if (typeof garageShowroomGroup !== 'undefined') {
   garageShowroomGroup.visible = false;
  }
  if (garageFromMenu) {
   garageFromMenu = false;
   if (modeModal) modeModal.classList.add('open');
  }

  Snd.playGarageShutter();
  Snd.playEngineRev();
  showBanner('ATÖLYEDEN ÇIKILDI! PİSTE DÖNÜLDÜ!', 'buff-sword');
 }
}
window.toggleGarage = toggleGarage;

const UPGRADE_COSTS = {
 engine: [0, 50000, 120000, 200000, 350000],
 armor: [0, 60000, 130000, 220000, 380000],
 gun: [0, 55000, 110000, 190000, 320000],
 rocket: [0, 75000, 150000, 250000, 420000]
};

// Garajdaki seviye/fiyat etiketlerini mevcut yükseltmelere göre yeniler (kayıt yüklenince de kullanılır)
function refreshUpgradeUI() {
 for (const type of Object.keys(UPGRADE_COSTS)) {
  const lvlEl = document.getElementById(`lvl-${type}`);
  const costEl = document.getElementById(`cost-${type}`);
  if (lvlEl) lvlEl.textContent = `SEVİYE ${upgrades[type]}/5`;
  if (costEl) costEl.textContent = upgrades[type] < 5 ? `${fmtTR(UPGRADE_COSTS[type][upgrades[type]])} PTS` : 'MAKSİMUM';
 }
 if (garageCreditsEl) garageCreditsEl.textContent = fmtTR(playerCredits);
 if (currencyValEl) currencyValEl.textContent = fmtTR(playerCredits);
}

function upgradeItem(type) {
 const costs = UPGRADE_COSTS;
 const curLvl = upgrades[type];
 if (curLvl >= 5) { showBanner('BU YÜKSELTMEDE MAKSİMUM SEVİYEYE ULAŞILDI!'); return; }
 const cost = costs[type][curLvl];
 if (playerCredits < cost) { showBanner('YETERSİZ PUAN / BAKİYE!'); return; }

 playerCredits -= cost;
 upgrades[type]++;
 Snd.playAirWrench();
 Snd.playPowerup('sword');
 spawnSparks(chassisBody.position, new T.Vector3(0, 1, 0), 22);
 updateCarVisualUpgrades();
 updateGarageStatsUI();

 if (type === 'engine') {
  document.getElementById('lvl-engine').textContent = `SEVİYE ${upgrades.engine}/5`;
  document.getElementById('cost-engine').textContent = upgrades.engine < 5 ? `${fmtTR(costs.engine[upgrades.engine])} PTS` : 'MAKSİMUM';
 } else if (type === 'armor') {
  document.getElementById('lvl-armor').textContent = `SEVİYE ${upgrades.armor}/5`;
  document.getElementById('cost-armor').textContent = upgrades.armor < 5 ? `${fmtTR(costs.armor[upgrades.armor])} PTS` : 'MAKSİMUM';
  carHealth = Math.min(100 + (upgrades.armor - 1) * 35, carHealth + 35);
  updateArmorVisuals();
 } else if (type === 'gun') {
  document.getElementById('lvl-gun').textContent = `SEVİYE ${upgrades.gun}/5`;
  document.getElementById('cost-gun').textContent = upgrades.gun < 5 ? `${fmtTR(costs.gun[upgrades.gun])} PTS` : 'MAKSİMUM';
 } else if (type === 'rocket') {
  document.getElementById('lvl-rocket').textContent = `SEVİYE ${upgrades.rocket}/5`;
  document.getElementById('cost-rocket').textContent = upgrades.rocket < 5 ? `${fmtTR(costs.rocket[upgrades.rocket])} PTS` : 'MAKSİMUM';
 }

 garageCreditsEl.textContent = fmtTR(playerCredits);
 currencyValEl.textContent = fmtTR(playerCredits);
 showBanner(`YÜKSELTME TAMAMLANDI! (${type.toUpperCase()} LVL ${upgrades[type]})`, 'buff-sword');
 showRadioMessage('Yükseltme uygulandı Frankenstein! Canavar artık daha da ölümcül!');
}
window.upgradeItem = upgradeItem;

/* ==========================================================
   GÖVDE BOYASI & DİSTOPİK KAMUFLAJ (SKIN SEÇİMİ)
   ========================================================== */
const CAR_SKINS = {
 classic_black: { name: 'ÖLÜM MELEĞİ', bodyColor: '#161618', metalness: 0.88, roughness: 0.32 },
 blood_carnage: { name: 'KAN BANYOSU', bodyColor: '#8a0000', metalness: 0.72, roughness: 0.28 },
 desert_scorpion: { name: 'ÇÖL AKREBİ', bodyColor: '#b58a43', metalness: 0.45, roughness: 0.68 },
 weyland_enforcer: { name: 'WEYLAND GÜVENLİK', bodyColor: '#dcdde1', metalness: 0.95, roughness: 0.18 }
};
let currentSkin = 'classic_black';

// Gövde boyası malzeme adına göre uygulanır: 'T_Govde' ana boya, 'GovdeKoyu' aynı rengin koyu tonu.
// (Önceden mesh adı 'chassis' aranıyordu; GLTFLoader çok-malzemeli parçaları 'Cube_1' gibi alt mesh'lere
// böldüğü için boya ve rakip renkleri hiç uygulanmıyordu.)
const PAINT_MAT = 'T_Govde';
const PAINT_MAT_DARK = 'GovdeKoyu';
function paintCarBody(root, colorStyle, metalness = null, roughness = null) {
 root.traverse(o => {
  if (!o.isMesh || !o.material) return;
  const n = o.material.name;
  if (n !== PAINT_MAT && n !== PAINT_MAT_DARK) return;
  o.material.color.setStyle(colorStyle);
  if (n === PAINT_MAT_DARK) o.material.color.multiplyScalar(0.45);
  if (metalness !== null) o.material.metalness = metalness;
  if (roughness !== null) o.material.roughness = roughness;
 });
}

function applyCarSkin(skinId) {
 const skin = CAR_SKINS[skinId];
 if (!skin) return;
 currentSkin = skinId;
 if (carBodyMesh) paintCarBody(carBodyMesh, skin.bodyColor, skin.metalness, skin.roughness);
 document.querySelectorAll('.skin-card').forEach(el => el.classList.remove('active'));
 const activeEl = document.getElementById(`skin-${skinId}`);
 if (activeEl) activeEl.classList.add('active');
 Snd.playPowerup('shield');
 showBanner(`YENİ BOYA UYGULANDI: ${skin.name}`, 'buff-shield');
 showRadioMessage(`Yeni kamuflaj uygulandı Frankenstein! Görünüşümüz kusursuz!`, 'case', 'New paint job applied Frankenstein!');
}
window.applyCarSkin = applyCarSkin;

let ramBumperMesh = null;
function updateArmorVisuals() {
 if (upgrades.armor >= 2 && !ramBumperMesh) {
  const plowGeo = new T.ConeGeometry(1.05, 1.3, 4);
  plowGeo.rotateX(Math.PI / 2);
  plowGeo.rotateY(Math.PI / 4);
  const plowMat = new T.MeshStandardMaterial({ color: '#2a2d34', roughness: 0.4, metalness: 0.9 });
  ramBumperMesh = new T.Mesh(plowGeo, plowMat);
  ramBumperMesh.position.set(0, 0.25, 2.35);
  ramBumperMesh.scale.set(1.4, 0.45, 0.85);
  ramBumperMesh.castShadow = true;
  carGroup.add(ramBumperMesh);
 }
}

/* ---------- Three.js sahne ---------- */
const renderer = new T.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = T.SRGBColorSpace;

const scene = new T.Scene();
scene.background = new T.Color('#0e1014');
scene.fog = new T.Fog('#0e1014', 150, 1300);

const camera = new T.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 4000);
const camPos = new T.Vector3(0, 6, -10);
const camLook = new T.Vector3();
let cameraShake = 0;
let cameraMode = 0;
let targetFOV = 60;
let timeScale = 1.0;

function resize() {
 const w = innerWidth, h = innerHeight;
 renderer.setSize(w, h, false);
 camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const hemi = new T.HemisphereLight('#70809b', '#12100d', 1.1);
scene.add(hemi);
const sun = new T.DirectionalLight('#ffe2b0', 2.3);
sun.position.set(40, 50, -30);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.bias = -0.0005;
sun.shadow.camera.left = -160; sun.shadow.camera.right = 160;
sun.shadow.camera.top = 160; sun.shadow.camera.bottom = -160;
sun.shadow.camera.far = 380;
scene.add(sun);

/* ==========================================================
   DİNAMİK HAVA DURUMU (ASİT YAĞMURU, ŞİMŞEK & GECE MODU)
   ========================================================== */
let weatherMode = 0; // 0: Gündüz Bulutlu, 1: Asit Yağmuru, 2: Zifiri Gece

// Yağmur Parçacık Sistemi
const RAIN_COUNT = 900;
const rainGeo = new T.BufferGeometry();
const rainPos = new Float32Array(RAIN_COUNT * 3);
for (let i = 0; i < RAIN_COUNT; i++) {
 rainPos[i * 3] = (Math.random() - 0.5) * 160;
 rainPos[i * 3 + 1] = Math.random() * 35;
 rainPos[i * 3 + 2] = (Math.random() - 0.5) * 160;
}
rainGeo.setAttribute('position', new T.BufferAttribute(rainPos, 3));
const rainMat = new T.PointsMaterial({ color: '#7ab8cc', size: 0.18, transparent: true, opacity: 0.65 });
const rainPoints = new T.Points(rainGeo, rainMat);
rainPoints.frustumCulled = false; // konumlar her karede oyuncunun etrafında yeniden üretiliyor; ilk bounding sphere yanlış kırpıyordu
scene.add(rainPoints);
rainPoints.visible = false;

// Hava durumunun sürüşe etkisi: tutuş çarpanı ve görüş mesafesi (sis)
const WEATHER_FX = {
 0: { grip: 1.0, fogNear: 150, fogFar: 1300, chip: '' },
 1: { grip: 0.78, fogNear: 90, fogFar: 700, chip: '🌧 ISLAK ZEMİN · TUTUŞ −%22' },
 2: { grip: 1.0, fogNear: 40, fogFar: 420, chip: '🌙 GECE · GÖRÜŞ KISITLI' },
 3: { grip: 0.95, fogNear: 120, fogFar: 900, chip: '🌆 DUMANLI · TUTUŞ −%5' }
};
function weatherGrip() { return (WEATHER_FX[weatherMode] || WEATHER_FX[0]).grip; }

function setWeather(mode) {
 weatherMode = mode;
 const wfx = WEATHER_FX[mode] || WEATHER_FX[0];
 scene.fog.near = wfx.fogNear;
 scene.fog.far = wfx.fogFar;
 const chip = document.getElementById('weather-chip');
 if (chip) { chip.textContent = wfx.chip; chip.style.display = wfx.chip ? 'inline-block' : 'none'; }
 if (mode === 0) {
  // Gündüz
  scene.background.set('#0e1014');
  scene.fog.color.set('#0e1014');
  sun.intensity = 2.3;
  hemi.intensity = 1.1;
  rainPoints.visible = false;
  if (typeof leftHeadlight !== 'undefined' && leftHeadlight) { leftHeadlight.intensity = 0; rightHeadlight.intensity = 0; }
  showBanner('HAVA DURUMU: DİSTOPİK GÜNDÜZ [H]');
 } else if (mode === 1) {
  // Asit Yağmuru
  scene.background.set('#0a0d12');
  scene.fog.color.set('#0a0d12');
  sun.intensity = 1.2;
  hemi.intensity = 0.8;
  rainPoints.visible = true;
  if (typeof leftHeadlight !== 'undefined' && leftHeadlight) { leftHeadlight.intensity = 2.5; rightHeadlight.intensity = 2.5; }
  showBanner('HAVA DURUMU: ŞİDDETLİ ASİT YAĞMURU [H]');
  showRadioMessage('Silecekleri aç Frankenstein! Asit yağmuru başladı!', 'case', 'Acid rain warning! Wipers engaged!');
 } else if (mode === 2) {
  // Zifiri Gece
  scene.background.set('#030406');
  scene.fog.color.set('#030406');
  sun.intensity = 0.25;
  hemi.intensity = 0.35;
  rainPoints.visible = false;
  if (typeof leftHeadlight !== 'undefined' && leftHeadlight) { leftHeadlight.intensity = 6.0; rightHeadlight.intensity = 6.0; }
  showBanner('HAVA DURUMU: ZİFİRİ SİSLİ GECE [H]');} else if (mode === 3) {
   // Kızıl Endüstriyel Gün Batımı & Duman (Industrial Dusk)
   scene.background.set('#241219');
   scene.fog.color.set('#2b151e');
   sun.color.set('#ff6622');
   sun.intensity = 2.6;
   hemi.color.set('#ff8844');
   hemi.groundColor.set('#1a0d14');
   hemi.intensity = 1.3;
   rainPoints.visible = false;
   if (typeof leftHeadlight !== 'undefined' && leftHeadlight) { leftHeadlight.intensity = 3.5; rightHeadlight.intensity = 3.5; }
   showBanner('HAVA DURUMU: KIZIL ENDÜSTRİYEL GÜN BATIMI [H]', 'buff-sword');
   showRadioMessage('Kızıl gün batımı çöktü Frankenstein! Endüstriyel duman görüşü kısıtlıyor, farları açtık!', 'case');
  }
}

function triggerLightning() {
 if (weatherMode !== 1) return;
 sun.intensity = 12.0;
 hemi.intensity = 6.0;
 setTimeout(() => {
  sun.intensity = 1.2;
  hemi.intensity = 0.8;
  Snd.playThunder();
  cameraShake = Math.max(cameraShake, 0.3);
 }, 80);
}

/* ---------- cannon-es fizik dünyası ---------- */
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
world.allowSleep = true;
world.solver.iterations = 7;
world.solver.tolerance = 0.001;
world.broadphase = new CANNON.SAPBroadphase(world);
world.defaultContactMaterial.friction = 0.35;

const groundMat = new CANNON.Material('ground');
const wheelMat = new CANNON.Material('wheel');
const debrisMat = new CANNON.Material('debris');

const wheelGroundCM = new CANNON.ContactMaterial(wheelMat, groundMat, {
 friction: 1.45, restitution: 0, contactEquationStiffness: 1e8,
});
world.addContactMaterial(wheelGroundCM);

const debrisGroundCM = new CANNON.ContactMaterial(debrisMat, groundMat, {
 friction: 0.6, restitution: 0.3,
});
world.addContactMaterial(debrisGroundCM);

const groundBody = new CANNON.Body({ mass: 0, material: groundMat });
groundBody.addShape(new CANNON.Plane());
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

const arenaFloor = new T.Mesh(new T.PlaneGeometry(4500, 4500), new T.MeshStandardMaterial({ color: '#16181d', roughness: 0.95 }));
arenaFloor.position.set(253.5, 0, 288.75);
arenaFloor.rotation.x = -Math.PI / 2;
arenaFloor.receiveShadow = true;
scene.add(arenaFloor);

// Çevre Okyanus Suyu (Terminal Island Ada Görünümü)
const oceanFloor = new T.Mesh(new T.PlaneGeometry(11000, 11000), new T.MeshStandardMaterial({ color: '#091524', roughness: 0.15, metalness: 0.85 }));
oceanFloor.position.set(253.5, -1.2, 288.75);
oceanFloor.rotation.x = -Math.PI / 2;
scene.add(oceanFloor);

/* ==========================================================
   TERMINAL ISLAND 3X MEGA SERPENTINE PİSTİ (18 VİRAJLI ~6,829M)
   ========================================================== */
const TRACK_WAYPOINTS = [
 new T.Vector3(   0.0, 0,    0.0), // SF (Start/Finish Takı & Ana Düzlük)
 new T.Vector3(   0.0, 0,  420.0), // T1_pre (Güney Düzlüğü Hızlanma)
 new T.Vector3(   0.0, 0,  798.0), // T1 (Doğu Kalesi Frenaj Girişi)
 new T.Vector3(  39.0, 0, 1008.0), // T2 (Kale Tırmanışı Sağ Viraj)
 new T.Vector3( 195.0, 0, 1144.5), // T3 (Fener Burnu Kavisli Viraj)
 new T.Vector3( 370.5, 0, 1113.0), // T4 (Uçurum Saçtokası)
 new T.Vector3( 468.0, 0,  966.0), // T5 (Kale Çıkışı Sol Şikan)
 new T.Vector3( 503.1, 0,  735.0), // T6_pre (Kuzey Sahil Otobanı Girişi)
 new T.Vector3( 507.0, 0,  252.0), // T6 (Kuzey Vinç Düzlüğü - 250 km/h)
 new T.Vector3( 503.1, 0, -210.0), // T7_pre (Kuzey Düzlüğü Sonu)
 new T.Vector3( 477.6, 0, -420.0), // T7 (Tersane Girişi Sert Fren)
 new T.Vector3( 370.5, 0, -556.5), // T8 (Tersane Havuzu S-İnişi)
 new T.Vector3( 253.5, 0, -567.0), // T9 (Kuru Havuz Saçtokası - Drift & Ramming)
 new T.Vector3( 191.1, 0, -462.0), // T10 (Fabrika Koridoruna Giriş)
 new T.Vector3( 195.0, 0, -126.0), // T11_pre (Merkez Hangar Düzlüğü)
 new T.Vector3( 198.9, 0,  252.0), // T11 (Merkez Sanayi & Pres Koridoru)
 new T.Vector3( 195.0, 0,  630.0), // T12_pre (Doğu Depo Yaklaşımı)
 new T.Vector3( 185.4, 0,  885.0), // T12 (Doğu Rafineri Girişi)
 new T.Vector3( 165.0, 0,  975.0), // T13_a (Rafineri Tankları Saçtokası)
 new T.Vector3( 126.0, 0,  990.0), // T13_apex (Yakıt Kulesi Dönüşü)
 new T.Vector3(  96.0, 0,  954.0), // T13_b
 new T.Vector3(  89.7, 0,  855.0), // T14 (Alt Sanayi Yoluna Çıkış)
 new T.Vector3(  91.8, 0,  525.0), // T15_pre (Konteyner Deposu Koridoru)
 new T.Vector3(  93.6, 0,  105.0), // T15 (Tren Hattı Düzlüğü)
 new T.Vector3(  87.6, 0, -168.0), // T16_pre (Batı Dok Yaklaşımı)
 new T.Vector3(  78.0, 0, -315.0), // T16 (Rıhtım Giriş Şikanı)
 new T.Vector3(  54.0, 0, -435.0), // T17 (Batı Rıhtım Saçtokası)
 new T.Vector3(  24.0, 0, -456.0), // T17_apex
 new T.Vector3(   7.5, 0, -435.0), // T18_a (Son Viraj Kompleksi)
 new T.Vector3(   1.5, 0, -360.0), // T18_b
 new T.Vector3(   0.0, 0, -210.0), // T19 (Ana Düzlüğe Bağlanış)
];

const trackCurve = new T.CatmullRomCurve3(TRACK_WAYPOINTS, true);
const TRACK_WIDTH = 26;
const NUM_TRACK_STEPS = 1200;
const TRACK_LENGTH = trackCurve.getLength();

const TRACK_POINTS = [];
for (let i = 0; i < NUM_TRACK_STEPS; i++) {
 TRACK_POINTS.push(trackCurve.getPointAt(i / NUM_TRACK_STEPS));
}

function getTrackDistance(pos, hintIndex = -1) {
 const total = TRACK_POINTS.length;
 let minD = Infinity;
 let bestIdx = 0;

 if (hintIndex >= 0 && hintIndex < total) {
  const searchRadius = 35;
  for (let offset = -searchRadius; offset <= searchRadius; offset++) {
   const i = (hintIndex + offset + total) % total;
   const p = TRACK_POINTS[i];
   const dx = pos.x - p.x;
   const dz = pos.z - p.z;
   const d = dx * dx + dz * dz;
   if (d < minD) { minD = d; bestIdx = i; }
  }
  if (minD < 3600) {
   return { index: bestIdx, distance: (bestIdx / total) * TRACK_LENGTH, point: TRACK_POINTS[bestIdx] };
  }
 }

 minD = Infinity;
 for (let i = 0; i < total; i++) {
  const p = TRACK_POINTS[i];
  const dx = pos.x - p.x;
  const dz = pos.z - p.z;
  const d = dx * dx + dz * dz;
  if (d < minD) { minD = d; bestIdx = i; }
 }
 return { index: bestIdx, distance: (bestIdx / total) * TRACK_LENGTH, point: TRACK_POINTS[bestIdx] };
}

// Yol yüzeyi
const roadGeo = new T.BufferGeometry();
const roadVerts = [], roadNorms = [], roadUvs = [], roadIndices = [];
for (let i = 0; i <= NUM_TRACK_STEPS; i++) {
 const t = i / NUM_TRACK_STEPS;
 const pt = trackCurve.getPointAt(t);
 const tangent = trackCurve.getTangentAt(t).normalize();
 const binormal = new T.Vector3().crossVectors(tangent, new T.Vector3(0, 1, 0)).normalize();
 const leftPt = pt.clone().addScaledVector(binormal, -TRACK_WIDTH / 2);
 const rightPt = pt.clone().addScaledVector(binormal, TRACK_WIDTH / 2);
 roadVerts.push(leftPt.x, 0.015, leftPt.z);
 roadVerts.push(rightPt.x, 0.015, rightPt.z);
 roadNorms.push(0, 1, 0, 0, 1, 0);
 roadUvs.push(0, t * 250, 1, t * 250);
 if (i < NUM_TRACK_STEPS) {
  const row = i * 2;
  roadIndices.push(row, row + 1, row + 2);
  roadIndices.push(row + 1, row + 3, row + 2);
 }
}
roadGeo.setAttribute('position', new T.Float32BufferAttribute(roadVerts, 3));
roadGeo.setAttribute('normal', new T.Float32BufferAttribute(roadNorms, 3));
roadGeo.setAttribute('uv', new T.Float32BufferAttribute(roadUvs, 2));
roadGeo.setIndex(roadIndices);
const roadMat = new T.MeshStandardMaterial({ color: '#252930', roughness: 0.9, metalness: 0.1 });
const roadMesh = new T.Mesh(roadGeo, roadMat);
roadMesh.receiveShadow = true;
scene.add(roadMesh);

// Merkez Çizgisi
const lineGeo = new T.BufferGeometry();
const lineVerts = [];
for (let i = 0; i < 1400; i++) {
 if (i % 2 === 0) continue;
 const p1 = trackCurve.getPointAt(i / 1400);
 const p2 = trackCurve.getPointAt((i + 0.6) / 1400);
 lineVerts.push(p1.x, 0.02, p1.z, p2.x, 0.02, p2.z);
}
lineGeo.setAttribute('position', new T.Float32BufferAttribute(lineVerts, 3));
scene.add(new T.LineSegments(lineGeo, new T.LineBasicMaterial({ color: '#f1c40f', linewidth: 2 })));

// YIKILABİLİR AYDINLATMA KULELERİ & BARİYERLER (INSTANCED VE UBER-HIZLI)
const barrierGeo = new T.BoxGeometry(1.2, 1.3, 17.5);
const barrierMat = new T.MeshStandardMaterial({ color: '#5a606a', roughness: 0.8, metalness: 0.15 });
const destructiblePoles = [];
const poleBulbMat = new T.MeshBasicMaterial({ color: '#fff2d4' });
const poleBulbGeo = new T.SphereGeometry(0.35, 8, 6);
const poleGeo = new T.CylinderGeometry(0.25, 0.3, 11, 8);

function createBarrierWall() {
 const BARRIER_STEPS = 400;
 const totalBarriers = BARRIER_STEPS * 2;
 const instancedBarriers = new T.InstancedMesh(barrierGeo, barrierMat, totalBarriers);
 const BARRIER_CHUNK = 10;
 const barrierShape = new CANNON.Box(new CANNON.Vec3(0.6, 0.65, 8.75)); // tüm segmentler aynı şekli paylaşır
 const chunkBodies = [null, null];
 instancedBarriers.castShadow = true;
 instancedBarriers.receiveShadow = true;
 const dummy = new T.Object3D();
 let instanceIdx = 0;

 for (let i = 0; i < BARRIER_STEPS; i++) {
  const t = i / BARRIER_STEPS;
  const pt = trackCurve.getPointAt(t);
  const tangent = trackCurve.getTangentAt(t).normalize();
  const binormal = new T.Vector3().crossVectors(tangent, new T.Vector3(0, 1, 0)).normalize();
  const angle = Math.atan2(tangent.x, tangent.z);

  for (let side of [-1, 1]) {
   const bPos = pt.clone().addScaledVector(binormal, side * (TRACK_WIDTH / 2 + 0.65));
   // 800 ayrı statik gövde yerine her 10 segment tek bir bileşik (compound) gövdede toplanır:
   // broadphase/raycast'in taradığı gövde sayısı 800'den 80'e iner, çarpışma geometrisi birebir aynı kalır.
   const sideKey = side < 0 ? 0 : 1;
   if (i % BARRIER_CHUNK === 0) {
    const chunk = new CANNON.Body({ mass: 0, material: groundMat });
    chunk.position.set(bPos.x, 0.65, bPos.z);
    world.addBody(chunk);
    chunkBodies[sideKey] = chunk;
   }
   const cb = chunkBodies[sideKey];
   const shapeQuat = new CANNON.Quaternion();
   shapeQuat.setFromEuler(0, angle, 0);
   cb.addShape(barrierShape, new CANNON.Vec3(bPos.x - cb.position.x, 0, bPos.z - cb.position.z), shapeQuat);

   dummy.position.set(bPos.x, 0.65, bPos.z);
   dummy.rotation.set(0, angle, 0);
   dummy.updateMatrix();
   instancedBarriers.setMatrixAt(instanceIdx++, dummy.matrix);
  }

  if (i % 10 === 0) {
   const polePos = pt.clone().addScaledVector(binormal, (TRACK_WIDTH / 2 + 5.5));
   const poleMesh = new T.Mesh(poleGeo, barrierMat);
   poleMesh.position.set(polePos.x, 5.0, polePos.z);
   poleMesh.castShadow = true;
   scene.add(poleMesh);

   // Emissive lamba armatürü (Her direkte parlar, 0 shader yükü)
   const bulb = new T.Mesh(poleBulbGeo, poleBulbMat);
   bulb.position.set(0, 5.2, 0);
   poleMesh.add(bulb);

   // Gerçek dinamik SpotLight sadece start düzlüğü ve kritik virajdaki ilk 3 direkte aktif kalır
   let light = null;
   if (i <= 36) {
    light = new T.SpotLight('#ffe8c0', 4.5, 60, Math.PI / 4, 0.4);
    light.position.set(polePos.x, 9.8, polePos.z);
    light.target.position.copy(pt);
    scene.add(light);
    scene.add(light.target);
   }

   const poleBody = new CANNON.Body({ mass: 0, material: groundMat });
   poleBody.addShape(new CANNON.Cylinder(0.25, 0.25, 10, 8));
   poleBody.position.set(polePos.x, 5.0, polePos.z);
   poleBody.sleep();
   world.addBody(poleBody);

   const poleItem = {
    mesh: poleMesh, body: poleBody, light, bulb, hp: 45, isCollapsed: false,
    onHit(dmg) {
     if (this.isCollapsed) return;
     this.hp -= dmg;
     if (this.hp <= 0) {
      this.isCollapsed = true;
      Snd.playMetalSnap();
      spawnSparks(poleBody.position, new T.Vector3(0, 1, 0), 25);
      if (this.light) this.light.intensity = 0;
      if (this.bulb) this.bulb.visible = false;

      world.removeBody(this.body);
      const dynBody = new CANNON.Body({ mass: 1400, material: debrisMat });
      dynBody.addShape(new CANNON.Cylinder(0.25, 0.25, 10, 8));
      dynBody.position.copy(this.body.position);
      dynBody.quaternion.copy(this.body.quaternion);
      dynBody.velocity.set(0, 0, 0);

      const toRoad = pt.clone().sub(polePos).normalize();
      dynBody.angularVelocity.set(toRoad.z * 2.5, 0, -toRoad.x * 2.5);
      world.addBody(dynBody);
      this.body = dynBody;

      showBanner('AYDINLATMA KULESİ YOLA DEVRİLDİ!', 'buff-sword');
      showRadioMessage('Kuleyi devirdin, yolu kapattık! Arkadakilere engel olacak!');
      addViewers(60000);
     }
    }
   };
   poleBody.targetData = poleItem;
   destructiblePoles.push(poleItem);
  }
 }
 instancedBarriers.instanceMatrix.needsUpdate = true;
 scene.add(instancedBarriers);
}
createBarrierWall();

// Start/Finish Takı
const archMat = new T.MeshStandardMaterial({ color: '#1a1c20', roughness: 0.5, metalness: 0.8 });
const gantryLeft = new T.Mesh(new T.BoxGeometry(0.8, 7.5, 0.8), archMat);
gantryLeft.position.set(-TRACK_WIDTH / 2 - 0.5, 3.75, 0); scene.add(gantryLeft);
const gantryRight = new T.Mesh(new T.BoxGeometry(0.8, 7.5, 0.8), archMat);
gantryRight.position.set(TRACK_WIDTH / 2 + 0.5, 3.75, 0); scene.add(gantryRight);
const gantryTop = new T.Mesh(new T.BoxGeometry(TRACK_WIDTH + 3, 1.2, 0.8), archMat);
gantryTop.position.set(0, 7.0, 0); scene.add(gantryTop);

const finishLine = new T.Mesh(new T.PlaneGeometry(TRACK_WIDTH, 2.5), new T.MeshBasicMaterial({ color: '#f39c12' }));
finishLine.rotation.x = -Math.PI / 2; finishLine.position.set(0, 0.025, 0); scene.add(finishLine);

/* ==========================================================
   ASİT YAĞMURU DAMLALARI & SİLECEK SİMÜLASYONU (2D OVERLAY)
   ========================================================== */
const rainCanvas = document.getElementById('rain-canvas');
let rainCtx = null;
const screenDrops = [];
let wiperAngle = -1.2;
let wiperDirection = 0;
let wiperTimer = 0;

function initRainCanvas() {
 if (!rainCanvas) return;
 rainCanvas.width = window.innerWidth;
 rainCanvas.height = window.innerHeight;
 rainCtx = rainCanvas.getContext('2d');
 for (let i = 0; i < 70; i++) {
  screenDrops.push({
   x: Math.random() * window.innerWidth,
   y: Math.random() * window.innerHeight,
   len: 8 + Math.random() * 16,
   speed: 260 + Math.random() * 400
  });
 }
}
window.addEventListener('resize', () => {
 if (rainCanvas) {
  rainCanvas.width = window.innerWidth;
  rainCanvas.height = window.innerHeight;
 }
});

function updateRainCanvas(dt) {
 if (!rainCtx || weatherMode !== 1) {
  if (rainCtx) rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
  return;
 }
 rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);

 wiperTimer += dt;
 if (wiperTimer > 4.2 && wiperDirection === 0) {
  wiperDirection = 1;
  wiperTimer = 0;
  Snd.playWiperSound();
 }
 if (wiperDirection !== 0) {
  wiperAngle += wiperDirection * 4.2 * dt;
  if (wiperAngle > 1.2) { wiperDirection = -1; wiperAngle = 1.2; }
  else if (wiperAngle < -1.2) { wiperDirection = 0; wiperAngle = -1.2; }
 }

 rainCtx.strokeStyle = 'rgba(160, 215, 240, 0.45)';
 rainCtx.lineWidth = 1.6;
 rainCtx.beginPath();
 for (let drop of screenDrops) {
  drop.y += drop.speed * dt;
  if (drop.y > rainCanvas.height) {
   drop.y = -20;
   drop.x = Math.random() * rainCanvas.width;
  }
  if (wiperDirection !== 0 && Math.abs(drop.x - rainCanvas.width / 2) < 320 && drop.y > rainCanvas.height * 0.3) {
   drop.y = -10;
  }
  rainCtx.moveTo(drop.x, drop.y);
  rainCtx.lineTo(drop.x + (chassisBody.velocity.x * -0.1), drop.y + drop.len);
 }
 rainCtx.stroke();

 if (wiperDirection !== 0) {
  const cx = rainCanvas.width / 2;
  const cy = rainCanvas.height + 40;
  const r = rainCanvas.height * 0.85;
  const wx = cx + Math.sin(wiperAngle) * r;
  const wy = cy - Math.cos(wiperAngle) * r;

  rainCtx.save();
  rainCtx.strokeStyle = 'rgba(25, 28, 35, 0.85)';
  rainCtx.lineWidth = 5;
  rainCtx.beginPath();
  rainCtx.moveTo(cx, cy);
  rainCtx.lineTo(wx, wy);
  rainCtx.stroke();
  rainCtx.restore();
 }
}

/* ==========================================================
   BÖLÜM 1: ÜZERİ KAPALI BOŞ FABRİKA İŞLETMESİ (COVERED FACTORY HANGAR)
   Merkez Sanayi Koridoru (Katman 3, X ≈ 65.5, Z = -30 .. 160)
   ========================================================== */
const HANGAR_CRUSHERS = []; window.HANGAR_CRUSHERS = HANGAR_CRUSHERS;
let insideHangarState = false;

function createCoveredFactoryHangar() {
 const hangarGroup = new T.Group();
 scene.add(hangarGroup);
 hangarGroup.userData.staticBatch = true;

 const wallMat = new T.MeshStandardMaterial({ color: '#252c37', roughness: 0.85, metalness: 0.3 });
 const concreteMat = new T.MeshStandardMaterial({ color: '#383f4b', roughness: 0.95, metalness: 0.1 });
 const roofMat = new T.MeshStandardMaterial({ color: '#1a1f26', roughness: 0.8, metalness: 0.4 });
 const trussMat = new T.MeshStandardMaterial({ color: '#14181f', roughness: 0.5, metalness: 0.85 });
 const hazardMat = new T.MeshStandardMaterial({ color: '#f39c12', roughness: 0.5 });
 const portalMat = new T.MeshStandardMaterial({ color: '#c0392b', roughness: 0.5, metalness: 0.4 });

 const centerX = 196.5;
 const zStart = -90.0;
 const zEnd = 480.0;
 const len = zEnd - zStart; // 570 meters long mega-facility!
 const zMid = zStart + len * 0.5;
 const width = 34.0; // 6m clearance on both sides of 22m road!
 const height = 12.0; // 12m high industrial ceiling

 // 1. Sol ve Sağ Ana Duvarlar (Fiziksel Çarpışma Gövdesi & Mesh)
 for (let side of [-1, 1]) {
  const wallX = centerX + side * (width / 2);
  const wallBody = new CANNON.Body({ mass: 0, material: groundMat });
  wallBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, height / 2, len / 2)));
  wallBody.position.set(wallX, height / 2, zMid);
  world.addBody(wallBody);

  // Duvar Meshi
  const wallMesh = new T.Mesh(new T.BoxGeometry(0.8, height, len), wallMat);
  wallMesh.position.copy(wallBody.position);
  wallMesh.castShadow = wallMesh.receiveShadow = true;
  hangarGroup.add(wallMesh);

  // Sarı-Siyah Güvenlik Taban Bordürü
  const curbMesh = new T.Mesh(new T.BoxGeometry(0.6, 0.4, len), hazardMat);
  curbMesh.position.set(wallX - side * 0.5, 0.2, zMid);
  hangarGroup.add(curbMesh);
 }

 // 2. Üzeri Kapalı Çift Eğimli Çatı (Pitched Steel Roof - Yağmuru & Işığı Keser)
 const roofSlopeL = new T.Mesh(new T.BoxGeometry(width / 2 + 1.5, 0.4, len), roofMat);
 roofSlopeL.position.set(centerX - width / 4, height + 0.6, zMid);
 roofSlopeL.rotation.z = 0.08;
 roofSlopeL.castShadow = true;
 hangarGroup.add(roofSlopeL);

 const roofSlopeR = new T.Mesh(new T.BoxGeometry(width / 2 + 1.5, 0.4, len), roofMat);
 roofSlopeR.position.set(centerX + width / 4, height + 0.6, zMid);
 roofSlopeR.rotation.z = -0.08;
 roofSlopeR.castShadow = true;
 hangarGroup.add(roofSlopeR);

 // 3. Çelik Çatı Makasları & Kirişler (Trusses & Cross Beams every 18m)
 const trussSpacing = 24.0;
 const numTrusses = Math.floor(len / trussSpacing);
 for (let i = 0; i <= numTrusses; i++) {
  const tz = zStart + i * trussSpacing;

  // Yatay Ana Kiriş
  const beam = new T.Mesh(new T.BoxGeometry(width + 0.5, 0.7, 0.7), trussMat);
  beam.position.set(centerX, height - 0.4, tz);
  beam.castShadow = true;
  hangarGroup.add(beam);

  // Dikey Yan Destek Kolonları
  for (let side of [-1, 1]) {
   const col = new T.Mesh(new T.BoxGeometry(0.8, height, 0.8), concreteMat);
   col.position.set(centerX + side * (width / 2 - 0.4), height / 2, tz);
   col.castShadow = true;
   hangarGroup.add(col);
  }

  // Sıcak & Güçlü Endüstriyel Tavan Lambaları (High-Bay Sodium Warehouse Lamps)
  const lampFixture = new T.Mesh(new T.ConeGeometry(0.6, 0.5, 8), trussMat);
  lampFixture.position.set(centerX, height - 0.9, tz);
  lampFixture.rotation.x = Math.PI;
  hangarGroup.add(lampFixture);

  const bulb = new T.Mesh(new T.SphereGeometry(0.2, 8, 8), new T.MeshBasicMaterial({ color: '#ffcc66' }));
  bulb.position.set(centerX, height - 1.2, tz);
  hangarGroup.add(bulb);

  const warehouseLight = new T.PointLight('#ffb355', 5.5, 55);
  // Yan duvar floresan aydınlatması
  for (let s of [-1, 1]) {
   const wallLamp = new T.PointLight('#ffa033', 2.6, 26);
   wallLamp.position.set(centerX + s * (width / 2 - 2.0), 4.5, tz);
   hangarGroup.add(wallLamp);
  }
  warehouseLight.position.set(centerX, height - 1.3, tz);
  hangarGroup.add(warehouseLight);
 }

 // 4. Giriş ve Çıkış Kapı Takları (Industrial Portals)
 for (let [pz, isEntry] of [[zStart, true], [zEnd, false]]) {
  // Üst Başlık Takı
  const portalHeader = new T.Mesh(new T.BoxGeometry(width + 2, 2.2, 1.2), portalMat);
  portalHeader.position.set(centerX, height + 0.6, pz);
  portalHeader.castShadow = true;
  hangarGroup.add(portalHeader);

  // Yan Kapı Sütunları
  for (let s of [-1, 1]) {
   const pCol = new T.Mesh(new T.BoxGeometry(1.6, height + 1.8, 1.2), hazardMat);
   pCol.position.set(centerX + s * (width / 2 + 0.6), (height + 1.8) / 2, pz);
   pCol.castShadow = true;
   hangarGroup.add(pCol);
  }

  // Portal Tabelası & Uyarı Lambaları
  const signLight = new T.PointLight(isEntry ? '#ff9900' : '#00e1ff', 3.0, 18);
  signLight.position.set(centerX, height + 1.2, pz + (isEntry ? -1.5 : 1.5));
  hangarGroup.add(signLight);
 }

 // 5. Yan Boş İşletme Ekipmanları (Tersane & Fabrika Makineleri - Yoldan 4.5m Dışarıda)
 const propZList = [-50, 10, 70, 130, 190, 250, 310, 370, 430];
 for (let pz of propZList) {
  // Sol taraf: Ağır pres makineleri ve elektrik panoları
  const machineMesh = new T.Mesh(new T.BoxGeometry(2.4, 3.2, 4.0), trussMat);
  machineMesh.position.set(centerX - (width / 2 - 2.0), 1.6, pz);
  machineMesh.castShadow = true;
  hangarGroup.add(machineMesh);

  // Sağ taraf: Metal depolama rafları & paletler
  const rackMesh = new T.Mesh(new T.BoxGeometry(2.0, 4.5, 5.0), wallMat);
  rackMesh.position.set(centerX + (width / 2 - 1.8), 2.25, pz + 4);
  rackMesh.castShadow = true;
  hangarGroup.add(rackMesh);
 }

 // 6. 3 Adet Dev Hidrolik Ezici Pres (Tavana Monte)
 const crusherMat = new T.MeshStandardMaterial({ color: '#181d24', roughness: 0.3, metalness: 0.9 });
 const pistonShaftMat = new T.MeshStandardMaterial({ color: '#d0d4dc', roughness: 0.1, metalness: 0.95 });
 const hazardLightMat = new T.MeshBasicMaterial({ color: '#ff2200' });

 const crusherZs = [30.0, 195.0, 360.0];
 for (let idx = 0; idx < 3; idx++) {
  const cZ = crusherZs[idx];
  const cPos = new T.Vector3(centerX, height - 1.5, cZ);

  const group = new T.Group();
  group.position.copy(cPos);
  group.userData.dynamic = true; // hidrolik pres: animasyonlu, birleştirilmez
  hangarGroup.add(group);

  const hammer = new T.Mesh(new T.BoxGeometry(14.0, 3.2, 4.5), crusherMat);
  hammer.castShadow = true;
  group.add(hammer);

  // Sivri ezici çiviler
  for (let spx = -4.2; spx <= 4.2; spx += 1.4) {
   for (let spz = -1.2; spz <= 1.2; spz += 1.2) {
    const spike = new T.Mesh(new T.ConeGeometry(0.2, 0.7, 6), crusherMat);
    spike.position.set(spx, -1.6, spz);
    spike.rotation.x = Math.PI;
    group.add(spike);
   }
  }

  // Dikey çift piston milleri
  for (let sx of [-3.5, 3.5]) {
   const shaft = new T.Mesh(new T.CylinderGeometry(0.18, 0.18, 6.0, 12), pistonShaftMat);
   shaft.position.set(sx, 3.5, 0);
   group.add(shaft);
  }

  // Kırmızı tehlike flaşörü
  const strobe = new T.Mesh(new T.SphereGeometry(0.3, 8, 8), hazardLightMat);
  strobe.position.set(0, -1.3, 1.9);
  group.add(strobe);

  const crusherLight = new T.PointLight('#ff2200', 0, 14);
  crusherLight.position.set(0, -1.3, 2.1);
  group.add(crusherLight);

  HANGAR_CRUSHERS.push({
   group, strobe, light: crusherLight,
   pos: new T.Vector3(centerX, 0, cZ),
   baseY: height - 1.5,
   phaseOffset: idx * 1.35,
   lastSlamTime: 0
  });
 }
}

function updateHangarCrushers(dt) {
 const time = performance.now() * 0.001;
 const pPos = chassisBody.position;
 const inHangarRegion = (pPos.x > 175 && pPos.x < 218 && pPos.z > -90 && pPos.z < 480);

 if (inHangarRegion && !insideHangarState) {
  insideHangarState = true;
  showBanner('🏭 KAPALI FABRİKA HANGARINA GİRİLDİ!', 'buff-sword');
  showRadioMessage('Boş fabrika işletmesine girdik Frankenstein! Preslerin zamanlamasına dikkat et!', 'case', 'Entered covered factory facility! Watch the crushers!');
  addViewers(55000);
 } else if (!inHangarRegion && insideHangarState) {
  insideHangarState = false;
  showBanner('🏭 FABRİKA HANGARINDAN ÇIKILDI! AÇIK YOLA DEVAM!', 'buff-sword');
  showRadioMessage('Temiz çıktık Frankenstein! Önümüz açık, gaza bas!', 'case', 'Exited factory facility, clear open track ahead!');
  addViewers(85000);
 }

 for (let c of HANGAR_CRUSHERS) {
  const cycle = (time + c.phaseOffset) % 3.6;
  let yPos = c.baseY;

  if (cycle < 1.8) {
   yPos = c.baseY;
   c.light.intensity = 0;
   c.strobe.material.color.set('#551100');
  } else if (cycle < 2.4) {
   yPos = c.baseY;
   const strobeOn = Math.sin(time * 25) > 0;
   c.light.intensity = strobeOn ? 4.5 : 0;
   c.strobe.material.color.set(strobeOn ? '#ff2200' : '#440000');
  } else if (cycle < 2.65) {
   const dropProgress = (cycle - 2.4) / 0.25;
   yPos = c.baseY - dropProgress * (c.baseY - 1.2);
   c.light.intensity = 6.0;
   c.strobe.material.color.set('#ff0000');

   if (cycle >= 2.6 && (time - c.lastSlamTime > 1.5)) {
    c.lastSlamTime = time;
    const distToCar = Math.hypot(pPos.x - c.pos.x, pPos.z - c.pos.z);

    // Sadece prese çok yaklaşınca (16m altı) çok hafif zemin titreşimi ve ses
    if (distToCar < 16.0) {
     const proximity = Math.max(0, 1 - distToCar / 16.0);
     Snd.playHydraulicSlam(proximity * 0.65);
     spawnSparks(new T.Vector3(c.pos.x, 0.2, c.pos.z), new T.Vector3(0, 1, 0), 18);
     cameraShake = Math.max(cameraShake, 0.04 * proximity); // Sadece çok hafif zemin sarsıntısı
    }
    if (distToCar < 5.0 && pPos.y < 2.5) {
     applyCarDamage(45, pPos, new T.Vector3(0, -1, 0));
     showBanner('HİDROLİK PRESE YAKALANDIN!', 'buff-sword');
     showRadioMessage('Kahretsin! Pres aracın tavanını ezdi!', 'case', 'Warning! Direct crusher impact!');
     cameraShake = 0.8;
     detachArmorPart('part_roof');
    }

    for (let ai of aiOpponents) {
     if (ai.isDead) continue;
     const aPos = ai.chassisBody.position;
     const distToAI = Math.hypot(aPos.x - c.pos.x, aPos.z - c.pos.z);
     if (distToAI < 5.0 && aPos.y < 2.5) {
      applyAIDamage(ai, 50, aPos, new T.Vector3(0, 1, 0), 'crusher');
      showBanner(`${ai.name} HİDROLİK PRESE YAKALANDI!`, 'buff-sword');
      showRadioMessage(`${ai.name} presin altında kaldı, ezildi!`, 'hennessey', 'Racer crushed by the hydraulic press!');
     }
    }
   }
  } else if (cycle < 3.1) {
   yPos = 1.2;
   c.light.intensity = 2.0;
  } else {
   const retractProgress = (cycle - 3.1) / 0.5;
   yPos = 1.2 + retractProgress * (c.baseY - 1.2);
   c.light.intensity = 0;
   c.strobe.material.color.set('#220000');
  }

  c.group.position.y = yPos;
 }
}

/* ==========================================================
   BÖLÜM 2: AÇIK HAVA KONTEYNER LİMANI (CONTAINER PORT TERMINAL)
   Kuzey Sahil Düzlüğü (X ≈ 169.0, Z = -60 .. 220)
   ========================================================== */
function createContainerYard() {
 const yardGroup = new T.Group();
 scene.add(yardGroup);
 yardGroup.userData.staticBatch = true;

 const containerColors = ['#1b4f72', '#922b21', '#145a32', '#d68910', '#2c3e50'];
 const containerMats = [];
 const containerGeo20 = new T.BoxGeometry(2.6, 2.6, 6.0);
 const containerGeo40 = new T.BoxGeometry(2.6, 2.6, 12.0);

 const trackX = 507.0;
 const stackZList = [-180, -90, 0, 90, 180, 270, 360, 450, 540, 630];

 stackZList.forEach((sz, idx) => {
  // Yolun her iki yanına (Sol: X=154.5, Sağ: X=183.5 - Yoldan 4.5m açıkta!)
  for (let side of [-1, 1]) {
   const sx = trackX + side * 17.0;
   const stackHeight = (idx % 2 === 0) ? 3 : 2;
   const is40ft = (idx + side) % 2 === 0;
   const geo = is40ft ? containerGeo40 : containerGeo20;

   for (let h = 0; h < stackHeight; h++) {
    const colIdx = (idx * 3 + side + h) % containerColors.length;
    // Renk başına tek materyal (önceden her konteynere ayrı materyal = ayrı program durumu/draw call)
    const cMat = containerMats[colIdx] || (containerMats[colIdx] = new T.MeshStandardMaterial({
     color: containerColors[colIdx],
     roughness: 0.65,
     metalness: 0.4
    }));

    const cMesh = new T.Mesh(geo, cMat);
    cMesh.position.set(sx, 1.3 + h * 2.6, sz + (h % 2) * 0.4);
    cMesh.castShadow = cMesh.receiveShadow = true;
    yardGroup.add(cMesh);

    // Fiziksel CANNON çarpışma gövdesi
    const halfZ = is40ft ? 6.0 : 3.0;
    const cBody = new CANNON.Body({ mass: 0, material: groundMat });
    cBody.addShape(new CANNON.Box(new CANNON.Vec3(1.3, 1.3, halfZ)));
    cBody.position.copy(cMesh.position);
    world.addBody(cBody);
   }
  }
 });

 // Yüksek Deniz Feneri / Projektör Kuleleri (Harbor Floodlight Masts)
 const mastPositions = [
  [485.0, -120.0],
  [529.0, 60.0],
  [485.0, 240.0],
  [529.0, 420.0],
  [485.0, 600.0]
 ];

 const mastMat = new T.MeshStandardMaterial({ color: '#566573', roughness: 0.7, metalness: 0.6 });
 for (let [mx, mz] of mastPositions) {
  const mast = new T.Mesh(new T.CylinderGeometry(0.3, 0.4, 18, 8), mastMat);
  mast.position.set(mx, 9.0, mz);
  mast.castShadow = true;
  yardGroup.add(mast);

  const head = new T.Mesh(new T.BoxGeometry(2.0, 0.8, 1.2), mastMat);
  head.position.set(mx, 18.0, mz);
  yardGroup.add(head);

  // Güçlü Deniz Limanı Projektörü
  const spot = new T.SpotLight('#eaf2f8', 3.2, 55, Math.PI / 4, 0.35);
  spot.position.set(mx, 17.5, mz);
  spot.target.position.set(trackX, 0, mz);
  yardGroup.add(spot);
  yardGroup.add(spot.target);
 }
}


/* ==========================================================
   YIKILABİLİR KONTEYNER VİNCİ (DESTUCTIBLE GANTRY CRANE)
   ========================================================== */
let craneStructure = null;

function createContainerCrane() {
 const craneGroup = new T.Group();
 const cranePos = new T.Vector3(507.0, 0, 252.0);
 craneGroup.position.copy(cranePos);
 scene.add(craneGroup);

 const steelMat = new T.MeshStandardMaterial({ color: '#f39c12', roughness: 0.5, metalness: 0.8 });
 const trussMat = new T.MeshStandardMaterial({ color: '#2c3e50', roughness: 0.6, metalness: 0.7 });
 const containerMat = new T.MeshStandardMaterial({ color: '#a93226', roughness: 0.7, metalness: 0.3 });

 for (let side of [-1, 1]) {
  const legX = side * 16.0;
  const legA = new T.Mesh(new T.BoxGeometry(0.8, 14.0, 0.8), steelMat);
  legA.position.set(legX, 7.0, -2.5);
  legA.rotation.x = -0.12 * side;
  legA.castShadow = true;
  craneGroup.add(legA);

  const legB = new T.Mesh(new T.BoxGeometry(0.8, 14.0, 0.8), steelMat);
  legB.position.set(legX, 7.0, 2.5);
  legB.rotation.x = 0.12 * side;
  legB.castShadow = true;
  craneGroup.add(legB);

  const legBody = new CANNON.Body({ mass: 0, material: groundMat });
  legBody.addShape(new CANNON.Box(new CANNON.Vec3(0.6, 7.0, 3.2)));
  legBody.position.set(cranePos.x + legX, 7.0, cranePos.z);
  world.addBody(legBody);
 }

 const truss = new T.Mesh(new T.BoxGeometry(36.0, 2.2, 4.5), trussMat);
 truss.position.set(0, 13.5, 0);
 truss.castShadow = true;
 craneGroup.add(truss);

 const winch = new T.Mesh(new T.BoxGeometry(3.0, 1.2, 2.5), steelMat);
 winch.position.set(2.5, 12.0, 0);
 craneGroup.add(winch);

 const cableMat = new T.MeshBasicMaterial({ color: '#111' });
 const cableL = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 4.2), cableMat);
 cableL.position.set(0.5, 9.8, 0);
 craneGroup.add(cableL);
 const cableR = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 4.2), cableMat);
 cableR.position.set(4.5, 9.8, 0);
 craneGroup.add(cableR);

 const containerMesh = new T.Mesh(new T.BoxGeometry(11.0, 2.8, 2.8), containerMat);
 containerMesh.position.set(2.5, 7.6, 0);
 containerMesh.castShadow = true;
 craneGroup.add(containerMesh);

 const jointBody = new CANNON.Body({ mass: 0, material: groundMat });
 jointBody.addShape(new CANNON.Box(new CANNON.Vec3(2.5, 1.5, 2.0)));
 jointBody.position.set(cranePos.x + 2.5, 11.5, cranePos.z);
 world.addBody(jointBody);

 craneStructure = {
  group: craneGroup,
  containerMesh,
  cables: [cableL, cableR],
  jointBody,
  hp: 60,
  isCollapsed: false,
  containerBody: null,
  onHit(dmg) {
   if (this.isCollapsed) return;
   this.hp -= dmg;
   spawnSparks(jointBody.position, new T.Vector3(0, 1, 0), 16);
   if (this.hp <= 0) {
    this.collapse();
   }
  },
  collapse() {
   if (this.isCollapsed) return;
   this.isCollapsed = true;
   Snd.playCraneSnap();
   Snd.playMetalSnap();
   world.removeBody(this.jointBody);

   cableL.visible = false;
   cableR.visible = false;
   craneGroup.remove(containerMesh);
   scene.add(containerMesh);

   const cBody = new CANNON.Body({ mass: 6000, material: debrisMat });
   cBody.addShape(new CANNON.Box(new CANNON.Vec3(5.5, 1.4, 1.4)));
   cBody.position.set(cranePos.x + 2.5, 7.6, cranePos.z);
   cBody.angularVelocity.set((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5);
   world.addBody(cBody);
   this.containerBody = cBody;

   showBanner('VİNÇ VURULDU! DEV KONTEYNER YOLA ÇÖKTÜ!', 'buff-sword');
   showRadioMessage('Konteyner yola indi! Pist tıkandı, manevra yap!', 'case', 'Gantry crane collapsed! Watch out for the container!');
   addViewers(150000);

   setTimeout(() => {
    Snd.playExplosion();
    cameraShake = 0.9;
    spawnSparks(cBody.position, new T.Vector3(0, 1, 0), 40);

    const dPlayer = chassisBody.position.vsub(cBody.position).length();
    if (dPlayer < 6.5) {
     applyCarDamage(70, chassisBody.position, new T.Vector3(0, 1, 0));
    }
    for (let ai of aiOpponents) {
     if (!ai.isDead && ai.chassisBody.position.vsub(cBody.position).length() < 6.5) {
      applyAIDamage(ai, 85, ai.chassisBody.position, new T.Vector3(0, 1, 0), 'trap');
     }
    }
   }, 700);
  }
 };

 jointBody.targetData = craneStructure;
}

/* ==========================================================
   PİST KENARI TRİBÜN MAHKUMLARI & GARDİYAN KULELERİ
   ========================================================== */
const CROWD_INMATES = [];
const GUARD_SEARCHLIGHTS = [];

function createGrandstandsAndGuards() {
 const standGroup = new T.Group();
 scene.add(standGroup);
 standGroup.userData.staticBatch = true;

 const concreteMat = new T.MeshStandardMaterial({ color: '#252830', roughness: 0.9, metalness: 0.1 });
 const steelMat = new T.MeshStandardMaterial({ color: '#3b404a', roughness: 0.6, metalness: 0.7 });
 const fenceMat = new T.MeshStandardMaterial({ color: '#888d96', roughness: 0.4, metalness: 0.85, wireframe: true });
 const orangeUniformMat = new T.MeshStandardMaterial({ color: '#e67e22', roughness: 0.8 });
 const headMat = new T.MeshStandardMaterial({ color: '#d5c4a1', roughness: 0.8 });

 for (let tier = 0; tier < 3; tier++) {
  const tierMesh = new T.Mesh(new T.BoxGeometry(3.5, 1.4, 180), concreteMat);
  tierMesh.position.set(-18.5 - tier * 2.8, 0.7 + tier * 1.4, 140);
  tierMesh.receiveShadow = true;
  standGroup.add(tierMesh);
 }

 const fence = new T.Mesh(new T.BoxGeometry(0.2, 6.0, 184), fenceMat);
 fence.position.set(-15.5, 3.0, 140);
 standGroup.add(fence);

 for (let i = 0; i < 40; i++) {
  const tier = i % 3;
  const zPos = 18 + (i / 40) * 64 + (Math.random() - 0.5) * 1.5;
  const xPos = -15.5 - tier * 2.5 + (Math.random() - 0.5) * 0.8;
  const yPos = 1.2 + tier * 1.2;

  const inmateGroup = new T.Group();
  inmateGroup.position.set(xPos, yPos, zPos);
  inmateGroup.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
  standGroup.add(inmateGroup);

  const torso = new T.Mesh(new T.BoxGeometry(0.5, 0.7, 0.3), orangeUniformMat);
  torso.position.y = 0.75;
  inmateGroup.add(torso);

  const head = new T.Mesh(new T.SphereGeometry(0.18, 6, 6), headMat);
  head.position.y = 1.25;
  inmateGroup.add(head);

  const armL = new T.Mesh(new T.BoxGeometry(0.12, 0.55, 0.12), orangeUniformMat);
  armL.position.set(-0.32, 1.1, 0);
  armL.userData.dynamic = true;
  inmateGroup.add(armL);

  const armR = new T.Mesh(new T.BoxGeometry(0.12, 0.55, 0.12), orangeUniformMat);
  armR.position.set(0.32, 1.1, 0);
  armR.userData.dynamic = true;
  inmateGroup.add(armR);

  CROWD_INMATES.push({
   group: inmateGroup,
   armL, armR,
   phase: i * 0.35 + Math.random(),
   speed: 4.5 + Math.random() * 3.0
  });
 }

 for (let zT of [40, 240]) {
  const towerGroup = new T.Group();
  towerGroup.position.set(-16.0, 0, zT);
  scene.add(towerGroup);

  for (let sx of [-1, 1]) {
   for (let sz of [-1, 1]) {
    const leg = new T.Mesh(new T.CylinderGeometry(0.15, 0.2, 11, 8), steelMat);
    leg.position.set(sx * 1.8, 5.5, sz * 1.8);
    towerGroup.add(leg);
   }
  }

  const cabin = new T.Mesh(new T.BoxGeometry(4.2, 2.5, 4.2), steelMat);
  cabin.position.set(0, 11.5, 0);
  towerGroup.add(cabin);

  const sniper = new T.Mesh(new T.BoxGeometry(0.4, 0.9, 0.3), new T.MeshBasicMaterial({ color: '#111' }));
  sniper.position.set(1.5, 13.0, 0);
  towerGroup.add(sniper);

  const light = new T.SpotLight('#ffffff', 5.0, 65, Math.PI / 6, 0.4);
  light.position.set(0, 11.0, 0);
  const targetObj = new T.Object3D();
  targetObj.position.set(16, 0, 0);
  towerGroup.add(light);
  towerGroup.add(targetObj);
  light.target = targetObj;

  GUARD_SEARCHLIGHTS.push({ light, targetObj, baseZ: zT, phase: zT * 0.1 });
 }
}

function updateCrowdAndGuards(dt) {
 const time = performance.now() * 0.001;

 for (let inmate of CROWD_INMATES) {
  const wave = Math.sin(time * inmate.speed + inmate.phase);
  inmate.armL.rotation.x = wave * 0.8;
  inmate.armR.rotation.x = -wave * 0.8;
 }
 if (crowdArmsIM) {
  // 80 ayrı kol mesh'i yerine tek InstancedMesh: kolların dünya matrisleri buraya yazılır
  for (let i = 0; i < CROWD_INMATES.length; i++) {
   const inmate = CROWD_INMATES[i];
   for (let k = 0; k < 2; k++) {
    const arm = k === 0 ? inmate.armL : inmate.armR;
    arm.updateMatrix();
    arm.matrixWorld.multiplyMatrices(arm.parent.matrixWorld, arm.matrix);
    crowdArmsIM.setMatrixAt(i * 2 + k, arm.matrixWorld);
   }
  }
  crowdArmsIM.instanceMatrix.needsUpdate = true;
 }

 for (let sl of GUARD_SEARCHLIGHTS) {
  const sweep = Math.sin(time * 0.8 + sl.phase);
  sl.targetObj.position.x = 16 + sweep * 6;
  sl.targetObj.position.z = sweep * 14;
 }

 const pPos = chassisBody.position;
 const inStraight = pPos.z > 20 && pPos.z < 350 && Math.abs(pPos.x) < 22;
 const speed = chassisBody.velocity.length();
 if (inStraight && speed > 8.0) {
  Snd.updateCrowd(1.0, speed);
 } else {
  Snd.updateCrowd(0.0, 0);
 }
}

createCoveredFactoryHangar();
 createContainerYard();
createContainerCrane();
createGrandstandsAndGuards();
initRainCanvas();


/* ==========================================================
   DEATH RACE ZEMİN AKTİVASYON PLAKALARI (PRESSURE PADS)
   ========================================================== */
const activationPlates = [];
window.activationPlates = activationPlates;
let overdriveTimer = 0;
let shieldTimer = 0;
let bannerTimer = 0;
let radioTimer = 0;

// Duyurular art arda gelince birbirini anında eziyordu; şimdi kısa bir sıraya alınıp okunabilir sürede gösterilir
const bannerQueue = [];
let bannerShownAt = 0;
function displayBanner(text, cssClass) {
 bannerEl.textContent = text;
 bannerEl.className = 'show ' + cssClass;
 bannerTimer = 2.4;
 bannerShownAt = performance.now();
}
function showBanner(text, cssClass = '') {
 if (silentRestore) return;
 if (bannerTimer > 0 && performance.now() - bannerShownAt < 1200) {
  if (bannerEl.textContent !== text && !bannerQueue.some(b => b.text === text)) {
   if (bannerQueue.length >= 3) bannerQueue.shift();
   bannerQueue.push({ text, cssClass });
  }
  return;
 }
 displayBanner(text, cssClass);
}
function updateBannerQueue() {
 if (bannerQueue.length && performance.now() - bannerShownAt > 1200) {
  const b = bannerQueue.shift();
  displayBanner(b.text, b.cssClass);
 }
}

// speechSynthesis.getVoices()/cancel()/speak() bazı platformlarda (özellikle Windows'ta ilk çağrıda)
// ana thread'i yüzlerce ms bloklayabilir. Ses listesi bir kez önbelleklenir, konuşma çağrısı
// mevcut görevden (tıklama / çarpışma karesi) ayrılıp ertelenir ve art arda gelen satırlar birleştirilir.
let cachedVoices = null;
let pendingSpeech = null;
let speechTimer = 0;
function getCachedVoices() {
 if (!cachedVoices || cachedVoices.length === 0) cachedVoices = window.speechSynthesis.getVoices() || [];
 return cachedVoices;
}
if ('speechSynthesis' in window) {
 window.speechSynthesis.addEventListener?.('voiceschanged', () => { cachedVoices = null; });
}

let lastSpeechTime = 0;
const SPEECH_COOLDOWN_MS = 4000;
function speakVoice(text, speaker = 'case') {
 if (!('speechSynthesis' in window)) return;
 // Telsiz mesajları sıralama değişimi, hasar, hangar girişi vb. ile birkaç saniyede bir tetikleniyordu;
 // her biri speechSynthesis.cancel()+speak() demekti. Sesli okuma 4 sn'de en fazla bir kez yapılır,
 // aradaki mesajlar yalnızca yazı olarak gösterilir.
 const tNow = performance.now();
 if (tNow - lastSpeechTime < SPEECH_COOLDOWN_MS) return;
 lastSpeechTime = tNow;
 // Sadece en son istenen satır okunur; aynı karede gelen 2-3 telsiz mesajı tek bir konuşmaya iner.
 pendingSpeech = { text, speaker };
 if (speechTimer) return;
 const run = () => {
  speechTimer = 0;
  const job = pendingSpeech;
  pendingSpeech = null;
  if (!job) return;
  try {
   const synth = window.speechSynthesis;
   if (synth.speaking || synth.pending) synth.cancel();
   const utter = new SpeechSynthesisUtterance(job.text);
   const voices = getCachedVoices();
   if (job.speaker === 'hennessey') {
    utter.pitch = 0.82;
    utter.rate = 1.05;
    utter.volume = 1.0;
    const v = voices.find(vo => vo.lang.includes('tr') || vo.lang.includes('en'));
    if (v) utter.voice = v;
   } else {
    utter.pitch = 1.1;
    utter.rate = 1.15;
    utter.volume = 0.95;
    const v = voices.find(vo => vo.lang.includes('tr') || (vo.name.includes('Female') || vo.name.includes('Zira') || vo.lang.includes('en')));
    if (v) utter.voice = v;
   }
   synth.speak(utter);
  } catch (e) {}
 };
 speechTimer = window.requestIdleCallback ? requestIdleCallback(run, { timeout: 300 }) : setTimeout(run, 60);
}

const radioSpeakerLabelEl = document.getElementById('radio-speaker-label');

function showRadioMessage(text, speaker = 'case', voiceLine = null) {
 if (silentRestore) return;
  Snd.playRadioStatic();
 if (!radioBoxEl) return;
 radioTextEl.textContent = `"${text}"`;
 if (radioSpeakerLabelEl) {
  radioSpeakerLabelEl.textContent = speaker === 'hennessey' ? 'WEYLAND TV · MÜDÜR HENNESSEY' : 'TELSİZ · CASE';
 }
 radioBoxEl.className = 'show ' + speaker;
 radioTimer = 4.2;
 if (speaker === 'hennessey') {
  Snd.playPAChime();
 } else {
  Snd.playRadioChirp();
 }
 speakVoice(voiceLine || text, speaker);
}

const shieldSphereGeo = new T.SphereGeometry(2.6, 20, 16);
const shieldSphereMat = new T.MeshBasicMaterial({ color: '#00d2ff', transparent: true, opacity: 0.35, wireframe: true });
const shieldMesh = new T.Mesh(shieldSphereGeo, shieldSphereMat);
shieldMesh.visible = false;
scene.add(shieldMesh);

const activeFlameJets = [];
const flameGeo = new T.CylinderGeometry(0.3, 1.2, 8.0, 8);
flameGeo.translate(0, 4.0, 0);
const flameMat = new T.MeshBasicMaterial({ color: '#ff4500', transparent: true, opacity: 0.9 });

function triggerFlameJet(x, z) {
 Snd.playFlameJet();
 const m = new T.Mesh(flameGeo, flameMat.clone());
 m.position.set(x, 0.02, z);
 scene.add(m);
 activeFlameJets.push({ mesh: m, life: 1.1, maxLife: 1.1 });
}


// 3D Hologram Rozetleri (Kılıç, Kalkan, Kafatası)
function createHologramMesh(type) {
 const grp = new T.Group();
 const col = type === 'sword' ? 0xff6600 : (type === 'shield' ? 0x00d2ff : 0x9b59b6);
 const mat = new T.MeshBasicMaterial({ color: col, wireframe: true });
 if (type === 'sword') {
  const blade1 = new T.Mesh(new T.BoxGeometry(0.12, 1.8, 0.08), mat);
  blade1.rotation.z = 0.4; grp.add(blade1);
  const blade2 = new T.Mesh(new T.BoxGeometry(0.12, 1.8, 0.08), mat);
  blade2.rotation.z = -0.4; grp.add(blade2);
 } else if (type === 'shield') {
  const hex = new T.Mesh(new T.CylinderGeometry(0.8, 0.8, 0.15, 6), mat);
  hex.rotation.x = Math.PI / 2; grp.add(hex);
 } else {
  const skull = new T.Mesh(new T.OctahedronGeometry(0.75), mat);
  grp.add(skull);
 }
 return grp;
}

function createPlate(type, pos) {
 const size = 4.2;
 const plateGroup = new T.Group();
 plateGroup.position.set(pos[0], 0.025, pos[1]);
 const color = type === 'sword' ? '#ff6600' : (type === 'shield' ? '#00bfff' : '#e74c3c');
 const base = new T.Mesh(new T.BoxGeometry(size, 0.04, size), new T.MeshStandardMaterial({ color: '#111215', roughness: 0.6, metalness: 0.8 }));
 plateGroup.add(base);
 const inner = new T.Mesh(new T.BoxGeometry(size * 0.75, 0.05, size * 0.75), new T.MeshBasicMaterial({ color }));
 plateGroup.add(inner);
 const beam = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, 5, 8), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 }));
  beam.position.y = 2.5; plateGroup.add(beam);

  const holo = createHologramMesh(type);
  holo.position.y = 2.2;
  plateGroup.add(holo);

  const pLight = new T.PointLight(color, 1.8, 14);
  pLight.position.y = 1.8;
  plateGroup.add(pLight);

  scene.add(plateGroup);
  activationPlates.push({ type, x: pos[0], z: pos[1], radius: 3.5, cooldown: 0, innerMesh: inner, beamMesh: beam, holoMesh: holo, pLight });
}


createPlate('sword', [0, 420]);
createPlate('shield', [0, 680]);
createPlate('skull', [97.5, 540]);
createPlate('sword', [97.5, -200]);
createPlate('shield', [196.5, -50]);
createPlate('skull', [196.5, 200]);
createPlate('sword', [196.5, 430]);
createPlate('shield', [507.0, -100]);
createPlate('skull', [507.0, 250]);
createPlate('sword', [507.0, 550]);
createPlate('skull', [380.0, 950]);
createPlate('shield', [80.0, -150]);


/* ==========================================================
   TUR & ELEME MODU (ELIMINATION MODE) SİSTEMİ
   ========================================================== */
let lapCount = 1;
let MAX_LAPS = 3; // kariyer etabına göre değişebilir
let lapStartTime = performance.now();
let currentLapTime = 0;
let bestLapTime = null;
let currentCheckpoint = 0;
let eliminationTimer = 75.0; // Her 45 saniyede sonuncu araç elenir!


/* ==========================================================
   DEEP GAMEPLAY SİSTEMLERİ: ETAPLAR, TOMBSTONE, NEMESIS, PİT & KAÇIŞ
   ========================================================== */
let currentStage = 1; // 1: Pure Speed & Ramming, 2: Full Combat, 3: Dreadnought & Escape
let lastStage1WarnTime = 0;
let isTombstoneDetached = false;
let tombstoneHealth = 60;
const tombstoneMaxHealth = 60;
let isEscaped = false;
let garageModeActive = false;
let garageCamAngle = 0;

// DOM Referansları
const stageDisplayEl = document.getElementById('stage-display');
const nemesisHudEl = document.getElementById('nemesis-hud');
const nemesisTextEl = document.getElementById('nemesis-text');
const pitHudEl = document.getElementById('pit-hud');
const tombstoneBarEl = document.getElementById('tombstone-bar');
const tombstoneFillEl = document.getElementById('tombstone-fill');
const tombstoneTextEl = document.getElementById('tombstone-text');
const escapeVictoryModalEl = document.getElementById('escape-victory-modal');

function updateStageHUD() {
 if (!stageDisplayEl) return;
 if (currentStage === 1) {
  stageDisplayEl.className = 'stage-tag stage-1';
  stageDisplayEl.textContent = 'ETAP 1: SAF SÜRÜŞ & RAMMING (SİLAHLAR KİLİTLİ)';
 } else if (currentStage === 2) {
  stageDisplayEl.className = 'stage-tag stage-2';
  stageDisplayEl.textContent = 'ETAP 2: TAM SAVAŞ (⚔ 🛡 ☠ PLAKALAR AKTİF)';
 } else {
  stageDisplayEl.className = 'stage-tag stage-3';
  stageDisplayEl.textContent = 'ETAP 3: THE DREADNOUGHT & KALE KAPISI KAÇIŞI';
 }
}

/* ==========================================================
   CEPHANELİK (FİLMDEKİ GİBİ PLAKA İLE SİLAH AKTİVASYONU)
   ==========================================================
   1. etapta tüm silahlar kilitlidir. 2. etaptan itibaren silahlar yalnızca plakaların üzerinden
   geçilince dolar: ⚔ Kılıç → minigun mermisi, roket, EMP · 🛡 Kalkan → yağ, mayın, diken, duman
   (+ kalkan ve onarım) · ☠ Kafatası → tuzaklar + hava saldırısı. Rakipler de aynı kurala tabidir.
   Barışçıl test modunda oyuncunun silahları sınırsızdır. */
const ARMORY_CAPS = { gun: 300, rockets: 4, emp: 2, mines: 3, oil: 3, spikes: 3, smoke: 3, strike: 1 };
const ARMORY_LABELS = { gun: 'MİNİGUN MERMİSİ', rockets: 'ROKET', emp: 'EMP', mines: 'MAYIN', oil: 'YAĞ', spikes: 'DİKEN', smoke: 'DUMAN', strike: 'HAVA SALDIRISI' };
const ARMORY_PLATE = { gun: '⚔ KILIÇ', rockets: '⚔ KILIÇ', emp: '⚔ KILIÇ', mines: '🛡 KALKAN', oil: '🛡 KALKAN', spikes: '🛡 KALKAN', smoke: '🛡 KALKAN', strike: '☠ KAFATASI' };
const armory = { gun: 0, rockets: 0, emp: 0, mines: 0, oil: 0, spikes: 0, smoke: 0, strike: 0 };
let lastLockHint = 0;

function weaponsUnlimited() { return currentGameMode === 'peaceful'; }
function weaponsLocked() { return !weaponsUnlimited() && currentStage < 2; }
function lockHint(text) {
 const now = performance.now();
 if (now - lastLockHint < 2500) return;
 lastLockHint = now;
 showBanner(text, 'buff-shield');
}
// Silah kullanılabilir mi? Değilse oyuncuya nedenini (kilit / boş) gösterir
function canUseWeapon(kind) {
 if (weaponsUnlimited()) return true;
 if (currentStage < 2) { lockHint('🔒 1. ETAPTA SİLAHLAR KİLİTLİ · SADECE SÜRÜŞ & ÇARPIŞMA'); return false; }
 if (armory[kind] <= 0) { lockHint(`🔒 ${ARMORY_LABELS[kind]} YOK · ${ARMORY_PLATE[kind]} PLAKASINDAN GEÇ`); return false; }
 return true;
}
function consumeWeapon(kind) { if (!weaponsUnlimited()) armory[kind] = Math.max(0, armory[kind] - 1); }
function addArmory(kind, n) { armory[kind] = Math.min(ARMORY_CAPS[kind], armory[kind] + n); }

function dropTombstone() {
 if (isTombstoneDetached) return;
 isTombstoneDetached = true;
 detachArmorPart('part_tombstone', new CANNON.Vec3(0, 1.8, -12.0));
 if (tombstoneFillEl) {
  tombstoneFillEl.style.width = '0%';
  tombstoneFillEl.style.background = '#444';
 }
 if (tombstoneTextEl) tombstoneTextEl.textContent = 'TOMBSTONE DÜŞTÜ';
 Snd.playMetalSnap();
 showBanner('TOMBSTONE BIRAKILDI! PEŞİNDEKİLERE ENGEL!', 'buff-sword');
 showRadioMessage('Tombstone kalkanını arkaya fırlattık! Peşimizdekiler fena çarpacak!', 'case');
}
window.dropTombstone = dropTombstone;

const CHECKPOINTS = [
 { pos: new T.Vector3(0, 0, 0), radius: 38 },
 { pos: new T.Vector3(195.0, 0, 1144.5), radius: 45 },
 { pos: new T.Vector3(507.0, 0, 252.0), radius: 45 },
 { pos: new T.Vector3(253.5, 0, -567.0), radius: 45 },
 { pos: new T.Vector3(198.9, 0, 252.0), radius: 45 },
 { pos: new T.Vector3(126.0, 0, 990.0), radius: 45 },
 { pos: new T.Vector3(93.6, 0, 105.0), radius: 45 },
 { pos: new T.Vector3(24.0, 0, -456.0), radius: 45 },
];

function formatTime(ms) {
 const totalSec = ms / 1000;
 const min = Math.floor(totalSec / 60);
 const sec = Math.floor(totalSec % 60);
 const dec = Math.floor((totalSec * 10) % 10);
 return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${dec}`;
}

/* ==========================================================
   REYTİNG (VIEWERS) & SIRALAMA (POSITION) SİSTEMİ
   ========================================================== */
let currentViewers = 14250000;
let targetViewers = 14250000;
let playerRank = 1;

function addViewers(amount, reason = '') {
 targetViewers += amount;
 playerCredits += Math.round(amount * 0.15); // Her izleyici artışında puan kazanılır!
 if (currencyValEl) currencyValEl.textContent = fmtTR(playerCredits);
 if (reason) showBanner(`+${fmtTR(amount)} İZLEYİCİ: ${reason}`, 'buff-sword');
}

/* ==========================================================
   ARAÇ KASASI (ŞASİ) & SÜRÜŞ FİZİĞİ PARAMETRELERİ
   ========================================================== */
const chassisSize = new CANNON.Vec3(0.95, 0.4, 2.1);
const wheelOptions = {
 radius: 0.38,
 directionLocal: new CANNON.Vec3(0, -1, 0),
 suspensionStiffness: 46,
 suspensionRestLength: 0.39,
 maxSuspensionTravel: 0.24,
 frictionSlip: 3.8,
 dampingRelaxation: 3.6,
 dampingCompression: 5.6,
 maxSuspensionForce: 120000,
 rollInfluence: 0.02,
 axleLocal: new CANNON.Vec3(-1, 0, 0),
 chassisConnectionPointLocal: new CANNON.Vec3(),
 useCustomSlidingRotationalSpeed: false,
};

const wheelX = 1.0, wheelFz = 1.45, wheelY = -0.05;
const wheelPositions = [
 [-wheelX, wheelY, wheelFz],
 [wheelX, wheelY, wheelFz],
 [-wheelX, wheelY, -wheelFz],
 [wheelX, wheelY, -wheelFz],
];

const MAX_FORCE = 5200;

function createVehiclePhysics(startPos, startEulerY = 0) {
 const cBody = new CANNON.Body({
  mass: 1750,
  position: new CANNON.Vec3(startPos[0], startPos[1], startPos[2]),
  material: debrisMat,
 });
 cBody.addShape(new CANNON.Box(chassisSize), new CANNON.Vec3(0, 0.12, 0));
 if (startEulerY !== 0) cBody.quaternion.setFromEuler(0, startEulerY, 0);
 cBody.angularVelocity.set(0, 0, 0);
 cBody.linearDamping = 0.04;
 cBody.angularDamping = 0.88;

 const veh = new CANNON.RaycastVehicle({
  chassisBody: cBody,
  indexRightAxis: 0, indexUpAxis: 1, indexForwardAxis: 2,
 });

 for (const p of wheelPositions) {
  wheelOptions.chassisConnectionPointLocal.set(...p);
  veh.addWheel({ ...wheelOptions });
 }
 veh.addToWorld(world);
 veh.wheelInfos.forEach(w => { w.suspensionLength = 0; });

 return { chassisBody: cBody, vehicle: veh };
}

const { chassisBody, vehicle } = createVehiclePhysics([0, 0.85, 0], 0);


/* ==========================================================
   GENİŞLETİLMİŞ GARAJ, 3D VİTRİN & ÖZELLEŞTİRME SİSTEMİ
   ========================================================== */
const customization = {
 difficulty: 'normal',
 quality: 'high',
 skin: 'classic_black',
 decal: 'none',
 wheelBlades: 'none',
 bumperKit: 'standard',
 roofKit: 'none',
 nitroFlame: 'cyan',
 ammoType: 'fmj',
 aiAggression: 'normal',
 elimination: '45s'
};

function switchGarageTab(tabId) {
 document.querySelectorAll('.garage-tab').forEach(b => b.classList.remove('active'));
 document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
 const btn = document.getElementById(`tab-btn-${tabId}`);
 const pane = document.getElementById(`tab-pane-${tabId}`);
 if (btn) btn.classList.add('active');
 if (pane) pane.classList.add('active');
}
window.switchGarageTab = switchGarageTab;

// 1. DÖNEN JANT BIÇAKLARI (WHEEL BLADES)
const wheelBladeGroups = [];
function ensureWheelBladeGroups() {
 if (wheelBladeGroups.length === 4) return;
 for (let i = 0; i < 4; i++) {
  const bg = new T.Group();
  if (typeof wheelMeshes !== 'undefined' && wheelMeshes[i]) wheelMeshes[i].add(bg);
  wheelBladeGroups.push(bg);
 }
}

const bladeMat = new T.MeshStandardMaterial({ color: '#d0d4dc', roughness: 0.2, metalness: 0.95 });
const sawMat = new T.MeshStandardMaterial({ color: '#888d95', roughness: 0.35, metalness: 0.9 });

function applyWheelBlades(type) {
 ensureWheelBladeGroups();
 customization.wheelBlades = type;
 for (let i = 0; i < wheelBladeGroups.length; i++) {
  const g = wheelBladeGroups[i];
  while (g.children.length > 0) g.remove(g.children[0]);

  if (type === 'ben_hur') {
   const hub = new T.Mesh(new T.ConeGeometry(0.12, 0.3, 8), bladeMat);
   hub.rotation.z = (i % 2 === 0 ? -1 : 1) * Math.PI / 2;
   hub.position.x = (i % 2 === 0 ? -0.22 : 0.22);
   g.add(hub);

   for (let b = 0; b < 4; b++) {
    const blade = new T.Mesh(new T.BoxGeometry(0.03, 0.46, 0.08), bladeMat);
    const angle = b * (Math.PI / 2);
    blade.position.set((i % 2 === 0 ? -0.26 : 0.26), Math.sin(angle) * 0.22, Math.cos(angle) * 0.22);
    blade.rotation.x = angle;
    g.add(blade);
   }
  } else if (type === 'sawblade') {
   const disc = new T.Mesh(new T.CylinderGeometry(0.44, 0.44, 0.03, 16), sawMat);
   disc.rotation.z = Math.PI / 2;
   disc.position.x = (i % 2 === 0 ? -0.22 : 0.22);
   g.add(disc);
  }
 }

 document.querySelectorAll('#tab-pane-bodykits .custom-section:nth-child(1) .custom-card').forEach(el => el.classList.remove('active'));
 const activeEl = document.getElementById(`blades-${type}`);
 if (activeEl) activeEl.classList.add('active');

 Snd.playMetalSnap();
 showBanner(type === 'none' ? 'JANT: STANDART KAPAK' : `JANT BIÇAĞI TAKILDI: ${type.toUpperCase()}`, 'buff-sword');
 if (type !== 'none') showRadioMessage('Çelik jant bıçakları bağlandı Frankenstein! Yanımıza yanaşanın zırhını doğrarız!', 'case');
}
window.applyWheelBlades = applyWheelBlades;

// 2. ÖN TAMPON & KOÇBAŞI KİTLERİ (BUMPER KITS)
let bumperGroup = null;
function getBumperGroup() {
 if (!bumperGroup) {
  bumperGroup = new T.Group();
  if (typeof carGroup !== 'undefined') carGroup.add(bumperGroup);
 }
 return bumperGroup;
}
const bumperSteelMat = new T.MeshStandardMaterial({ color: '#252930', roughness: 0.5, metalness: 0.85 });

function applyBumperKit(kitId) {
 customization.bumperKit = kitId;
 const bg = getBumperGroup();
 while (bg.children.length > 0) bg.remove(bg.children[0]);

 if (kitId === 'twin_spikes') {
  for (let s of [-0.55, 0.55]) {
   const spike = new T.Mesh(new T.ConeGeometry(0.14, 1.3, 8), bladeMat);
   spike.rotation.x = Math.PI / 2;
   spike.position.set(s, 0.26, 2.45);
   spike.castShadow = true;
   bg.add(spike);
  }
 } else if (kitId === 'cowcatcher') {
  const plowGeo = new T.ConeGeometry(1.05, 1.3, 4);
  plowGeo.rotateX(Math.PI / 2); plowGeo.rotateY(Math.PI / 4);
  const plow = new T.Mesh(plowGeo, bumperSteelMat);
  plow.position.set(0, 0.25, 2.35);
  plow.scale.set(1.4, 0.45, 0.85);
  plow.castShadow = true;
  bg.add(plow);
 } else if (kitId === 'grate') {
  const grate = new T.Mesh(new T.BoxGeometry(1.9, 0.65, 0.3), bumperSteelMat);
  grate.position.set(0, 0.25, 2.2);
  grate.castShadow = true;
  bg.add(grate);
 }

 document.querySelectorAll('#tab-pane-bodykits .custom-section:nth-child(2) .custom-card').forEach(el => el.classList.remove('active'));
 const activeEl = document.getElementById(`bumper-${kitId}`);
 if (activeEl) activeEl.classList.add('active');

 Snd.playMetalSnap();
 showBanner(`TAMPON KİTİ GÜNCELLENDİ: ${kitId.toUpperCase()}`, 'buff-shield');
}
window.applyBumperKit = applyBumperKit;

// 3. TAVAN EKLENTİSİ (ROOF KITS)
let roofGroup = null;
function getRoofGroup() {
 if (!roofGroup) {
  roofGroup = new T.Group();
  if (typeof carGroup !== 'undefined') carGroup.add(roofGroup);
 }
 return roofGroup;
}

let strobeRed = null, strobeBlue = null;
// Her karede '#ff2200' gibi string renk ayrıştırmamak için önceden oluşturulmuş renkler
const STROBE_RED_ON = new T.Color('#ff2200'), STROBE_RED_OFF = new T.Color('#440000');
const STROBE_BLUE_ON = new T.Color('#0088ff'), STROBE_BLUE_OFF = new T.Color('#001144');
let strobeLightR = null, strobeLightB = null;

function applyRoofKit(kitId) {
 customization.roofKit = kitId;
 const rg = getRoofGroup();
 while (rg.children.length > 0) rg.remove(rg.children[0]);
 strobeRed = null; strobeBlue = null; strobeLightR = null; strobeLightB = null;

 if (kitId === 'strobe') {
  const bar = new T.Mesh(new T.BoxGeometry(0.9, 0.12, 0.25), bumperSteelMat);
  bar.position.set(0, 1.15, -0.4);
  rg.add(bar);

  strobeRed = new T.Mesh(new T.BoxGeometry(0.35, 0.14, 0.22), new T.MeshBasicMaterial({ color: '#ff1100' }));
  strobeRed.position.set(-0.25, 1.18, -0.4);
  rg.add(strobeRed);

  strobeBlue = new T.Mesh(new T.BoxGeometry(0.35, 0.14, 0.22), new T.MeshBasicMaterial({ color: '#0066ff' }));
  strobeBlue.position.set(0.25, 1.18, -0.4);
  rg.add(strobeBlue);

  strobeLightR = new T.PointLight('#ff1100', 0, 12);
  strobeLightR.position.set(-0.25, 1.3, -0.4);
  poolLight(strobeLightR);
  rg.add(strobeLightR);

  strobeLightB = new T.PointLight('#0066ff', 0, 12);
  strobeLightB.position.set(0.25, 1.3, -0.4);
  poolLight(strobeLightB);
  rg.add(strobeLightB);
 } else if (kitId === 'safari') {
  const bar = new T.Mesh(new T.BoxGeometry(1.4, 0.08, 0.08), bumperSteelMat);
  bar.position.set(0, 1.18, 0.2);
  rg.add(bar);

  for (let s of [-0.5, -0.17, 0.17, 0.5]) {
   const lamp = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 0.08, 12), new T.MeshBasicMaterial({ color: '#ffeecc' }));
   lamp.rotation.x = Math.PI / 2; lamp.position.set(s, 1.25, 0.2);
   rg.add(lamp);
  }
 } else if (kitId === 'cage') {
  const cage = new T.Mesh(new T.BoxGeometry(1.6, 0.45, 1.6), new T.MeshStandardMaterial({ color: '#333', roughness: 0.6, wireframe: true }));
  cage.position.set(0, 1.25, -0.3);
  rg.add(cage);
 }

 document.querySelectorAll('#tab-pane-bodykits .custom-section:nth-child(3) .custom-card').forEach(el => el.classList.remove('active'));
 const activeEl = document.getElementById(`roof-${kitId}`);
 if (activeEl) activeEl.classList.add('active');

 Snd.playPowerup('shield');
 showBanner(`TAVAN EKLENTİSİ: ${kitId.toUpperCase()}`, 'buff-shield');
}
window.applyRoofKit = applyRoofKit;

// 4. NİTRO ALEV RENGİ (NITRO FLAME COLOR)
const NITRO_COLORS = {
 cyan: { hex: '#00e1ff', name: 'NEON CYAN' },
 fire: { hex: '#ff3300', name: 'CEHENNEM ATEŞİ' },
 purple: { hex: '#b026ff', name: 'PLAZMA MORU' },
 acid: { hex: '#2ecc71', name: 'TOKSİK ASİT' }
};

function applyNitroFlame(colorId) {
 const cfg = NITRO_COLORS[colorId] || NITRO_COLORS.cyan;
 customization.nitroFlame = colorId;
 if (typeof nitroLight !== 'undefined' && nitroLight) nitroLight.color.setStyle(cfg.hex);

 const fillEl = document.getElementById('nitro-fill');
 if (fillEl) fillEl.style.background = `linear-gradient(90deg, ${cfg.hex}, #fff)`;

 document.querySelectorAll('#tab-pane-bodykits .custom-section:nth-child(4) .custom-card').forEach(el => el.classList.remove('active'));
 const activeEl = document.getElementById(`flame-${colorId}`);
 if (activeEl) activeEl.classList.add('active');

 Snd.playNitroSound();
 showBanner(`NİTRO ALEVİ: ${cfg.name}`, 'buff-sword');
}
window.applyNitroFlame = applyNitroFlame;

// 5. YARIŞ GRAFİTİSİ & ÇIKARTMALAR (LIVERY)
function applyDecal(decalId) {
 customization.decal = decalId;

 document.querySelectorAll('#tab-pane-paint .custom-section:nth-child(2) .custom-card').forEach(el => el.classList.remove('active'));
 const activeEl = document.getElementById(`decal-${decalId}`);
 if (activeEl) activeEl.classList.add('active');

 Snd.playPowerup('shield');
 showBanner(`GRAFİTİ ÇIKARTMA: ${decalId.toUpperCase()}`, 'buff-shield');
 showRadioMessage('Yeni çıkartma kaportaya işlendi Frankenstein! Şık görünüyoruz!', 'case');
}
window.applyDecal = applyDecal;

// 6. MÜHİMMAT TİPİ SEÇİMİ (AMMO TYPES)
function applyAmmoType(typeId) {
 customization.ammoType = typeId;

 document.querySelectorAll('#tab-pane-performance .custom-section .custom-card').forEach(el => el.classList.remove('active'));
 const activeEl = document.getElementById(`ammo-${typeId}`);
 if (activeEl) activeEl.classList.add('active');

 Snd.playHeavyGunshot();
 showBanner(`MÜHİMMAT DEĞİŞTİRİLDİ: ${typeId.toUpperCase()}`, 'buff-sword');
 showRadioMessage(`Minigun mermileri ${typeId.toUpperCase()} ile dolduruldu!`, 'case');
}
window.applyAmmoType = applyAmmoType;

// 7. YARIŞ & MAÇ AYARLARI
// Zorluk: rakip hızı, ateş hızı, isabet açısı/menzili ve oyuncuya verdiği hasar çarpanları
const DIFFICULTY = {
 easy: { name: 'KOLAY', speed: 0.86, fireMul: 1.6, aimDot: 0.94, range: 30, dmg: 0.6 },
 normal: { name: 'NORMAL', speed: 1.0, fireMul: 1.0, aimDot: 0.88, range: 40, dmg: 1.0 },
 hard: { name: 'ZOR', speed: 1.12, fireMul: 0.72, aimDot: 0.82, range: 52, dmg: 1.35 }
};
// Kariyer etabı aktifken etabın ayarları, değilse garajda seçilenler geçerlidir
function raceSetting(key) {
 if (activeCareerEvent && activeCareerEvent[key] !== undefined) return activeCareerEvent[key];
 return customization[key];
}
function diffCfg() { return DIFFICULTY[raceSetting('difficulty')] || DIFFICULTY.normal; }

function applyMatchSetting(key, val) {
 customization[key] = val;

 if (key === 'difficulty' || key === 'quality') {
  const prefix = key === 'difficulty' ? 'diff-' : 'qual-';
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(el => el.classList.toggle('active', el.id === prefix + val));
  if (key === 'quality') applyQuality(val);
  if (key === 'difficulty') showBanner(`ZORLUK: ${(DIFFICULTY[val] || DIFFICULTY.normal).name}`, 'buff-sword');
  return;
 }

 if (key === 'aiAggression') {
  document.querySelectorAll('[id^="ai-agg-"]').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`ai-agg-${val}`);
  if (activeEl) activeEl.classList.add('active');
  showBanner(`AI SALDIRGANLIĞI: ${val.toUpperCase()}`, 'buff-sword');
  showRadioMessage(val === 'brutal' ? 'Dikkat Frankenstein! Rakipler gözünü kararttı, ölümüne saldıracaklar!' : 'AI dengeli taktiksel yarış moduna geçti.', 'case');
 } else if (key === 'elimination') {
  document.querySelectorAll('[id^="elim-"]').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`elim-${val}`);
  if (activeEl) activeEl.classList.add('active');

  const elimEl = document.getElementById('elimination-hud');
  if (val === 'off') {
   if (elimEl) elimEl.style.display = 'none';
   showBanner('ELEME SAYACI: KAPALI');
  } else {
   if (elimEl) elimEl.style.display = 'block';
   eliminationTimer = val === '30s' ? 30.0 : 45.0;
   showBanner(`ELEME SAYACI: ${val.toUpperCase()}`);
  }
 }
}
window.applyMatchSetting = applyMatchSetting;

function loadGLTFModel(name) {
 return new Promise((resolve, reject) => {
  if (!T.GLTFLoader) { reject(new Error('GLTFLoader bulunamadı')); return; }
  const ld = new T.GLTFLoader();

  if (window.GLB && window.GLB[name]) {
   try {
    const bin = atob(window.GLB[name]);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    ld.parse(u.buffer, '', gltf => resolve(gltf.scene), err => reject(err));
    return;
   } catch (e) {
    console.warn('GLB decode hatası:', name, e);
   }
  }
  ld.load('models/' + name + '.glb', gltf => resolve(gltf.scene), undefined, err => reject(err));
 });
}

/* ==========================================================
   SİLAHLAR & ÇATIŞMA MESH YARDIMCILARI
   ========================================================== */
const gunMatDark = new T.MeshStandardMaterial({ color: '#15171a', roughness: 0.45, metalness: 0.8 });
const gunMatSteel = new T.MeshStandardMaterial({ color: '#444850', roughness: 0.35, metalness: 0.9 });
const flashMat = new T.MeshBasicMaterial({ color: '#ffee66', transparent: true, opacity: 0.9 });

function createMinigunMesh() {
 const gun = new T.Group();
 const receiver = new T.Mesh(new T.BoxGeometry(0.14, 0.14, 0.32), gunMatDark);
 receiver.castShadow = true; gun.add(receiver);

 const barrelGroup = new T.Group();
 barrelGroup.position.set(0, 0, 0.16);
 for (let i = 0; i < 4; i++) {
  const a = i * Math.PI / 2;
  const barrel = new T.Mesh(new T.CylinderGeometry(0.016, 0.016, 0.46, 8), gunMatSteel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0.23);
  barrel.castShadow = true; barrelGroup.add(barrel);
 }
 for (let z of [0.15, 0.38]) {
  const ring = new T.Mesh(new T.CylinderGeometry(0.065, 0.065, 0.02, 10), gunMatDark);
  ring.rotation.x = Math.PI / 2; ring.position.z = z; barrelGroup.add(ring);
 }
 gun.add(barrelGroup);

 const flash = new T.Mesh(new T.ConeGeometry(0.1, 0.28, 6), flashMat);
 flash.rotation.x = -Math.PI / 2; flash.position.set(0, 0, 0.52); flash.visible = false; gun.add(flash);

 return { root: gun, barrelGroup, flash };
}

function createRocketPodMesh() {
 const pod = new T.Group();
 const box = new T.Mesh(new T.BoxGeometry(0.36, 0.22, 0.65), gunMatDark);
 box.castShadow = true; pod.add(box);
 for (let x of [-0.1, 0.1]) {
  for (let y of [-0.05, 0.05]) {
   const tube = new T.Mesh(new T.CylinderGeometry(0.038, 0.038, 0.68, 8), gunMatSteel);
   tube.rotation.x = Math.PI / 2; tube.position.set(x, y, 0.02); pod.add(tube);
  }
 }
 return pod;
}

/* ---------- Oyuncu araç görseli (GLTF) ---------- */
const carGroup = new T.Group();
scene.add(carGroup);

const BODY_Y_OFFSET = -0.68;
let carBodyMesh = null;

const leftGun = createMinigunMesh(); leftGun.root.position.set(-0.38, 0.46, 0.42); carGroup.add(leftGun.root);
const rightGun = createMinigunMesh(); rightGun.root.position.set(0.38, 0.46, 0.42); carGroup.add(rightGun.root);
const rocketPod = createRocketPodMesh(); rocketPod.position.set(0, 0.98, -0.2); carGroup.add(rocketPod);

const muzzleLight = new T.PointLight('#ff9922', 0, 12); muzzleLight.position.set(0, 0.6, 1.2); carGroup.add(muzzleLight);
const nitroLight = new T.PointLight('#00d2ff', 0, 15); nitroLight.position.set(0, 0.2, -2.4); carGroup.add(nitroLight);
const engineFireLight = new T.PointLight('#ff4400', 0, 10); engineFireLight.position.set(0, 0.5, 0.8); carGroup.add(engineFireLight);

const leftHeadlight = new T.SpotLight('#fff0d0', 0, 80, Math.PI / 5, 0.35);
leftHeadlight.position.set(-0.65, 0.35, 2.1);
const leftHeadlightTarget = new T.Object3D();
leftHeadlightTarget.position.set(-0.65, 0.1, 30);
carGroup.add(leftHeadlight);
carGroup.add(leftHeadlightTarget);
leftHeadlight.target = leftHeadlightTarget;

const rightHeadlight = new T.SpotLight('#fff0d0', 0, 80, Math.PI / 5, 0.35);
rightHeadlight.position.set(0.65, 0.35, 2.1);
const rightHeadlightTarget = new T.Object3D();
rightHeadlightTarget.position.set(0.65, 0.1, 30);
carGroup.add(rightHeadlight);
carGroup.add(rightHeadlightTarget);
rightHeadlight.target = rightHeadlightTarget;

const wheelMeshes = [];
for (let i = 0; i < 4; i++) {
 const wGroup = new T.Group(); scene.add(wGroup); wheelMeshes.push(wGroup);
}

/* ==========================================================
   WEYLAND MOTORWORKS — 3D ATÖLYE & GARAJ SHOWROOM SİSTEMİ
   ========================================================== */
const garageShowroomGroup = new T.Group();
// Garaj önceden y = -350'deydi: ana zemin sonsuz bir CANNON.Plane olduğu için onun altındaki araç
// "yere gömülmüş" sayılıp gökyüzüne fırlatılıyordu (garajda araç karanlıkta süzülüyordu).
// Artık zemin seviyesinde, pistten ~4.5 km uzakta (sis mesafesinin çok dışında).
garageShowroomGroup.position.set(GARAGE_POS.x, 0, GARAGE_POS.z);
garageShowroomGroup.visible = false;
scene.add(garageShowroomGroup);
garageShowroomGroup.userData.staticBatch = true;

// 1. Showroom Parlak Epoksi Zemin (Y=-350)
const garageFloorGeo = new T.PlaneGeometry(65, 65);
const garageFloorMat = new T.MeshStandardMaterial({
 color: '#13161c',
 roughness: 0.22,
 metalness: 0.75
});
const garageFloorMesh = new T.Mesh(garageFloorGeo, garageFloorMat);
garageFloorMesh.rotation.x = -Math.PI / 2;
garageFloorMesh.receiveShadow = true;
garageShowroomGroup.add(garageFloorMesh);

// Showroom Fiziksel Zemin Gövdesi (Cannon-es)
// Garaj zemini için ayrı fizik gövdesi gerekmez: ana zemin düzlemi (y = 0) garajın altında da var.

// 2. Dönen Hidrolik Lift & Döner Platform (Turntable)
const turntableGroup = new T.Group();
const ttBaseGeo = new T.CylinderGeometry(4.6, 4.8, 0.2, 48);
const ttBaseMat = new T.MeshStandardMaterial({ color: '#1f242d', roughness: 0.35, metalness: 0.85 });
const ttBase = new T.Mesh(ttBaseGeo, ttBaseMat);
ttBase.position.y = 0.1;
ttBase.receiveShadow = true;
turntableGroup.add(ttBase);

// Turntable Sarı-Siyah Güvenlik Çemberi
const ttHazardGeo = new T.RingGeometry(4.35, 4.6, 32);
const ttHazardMat = new T.MeshBasicMaterial({ color: '#f39c12', side: T.DoubleSide });
const ttHazard = new T.Mesh(ttHazardGeo, ttHazardMat);
ttHazard.rotation.x = -Math.PI / 2;
ttHazard.position.y = 0.21;
turntableGroup.add(ttHazard);

// Turntable Neon Kehribar Zemin Aydınlatması (Underglow)
const ttUnderglow = new T.PointLight('#ff8800', 3.5, 14);
ttUnderglow.position.set(0, 0.35, 0);
turntableGroup.add(ttUnderglow);
turntableGroup.userData.dynamic = true;
garageShowroomGroup.add(turntableGroup);

// 3. Ağır Sanayi 4-Direkli Hidrolik Araç Lifti (4-Post Hydraulic Car Lift)
const liftMat = new T.MeshStandardMaterial({ color: '#1e3799', roughness: 0.45, metalness: 0.65 });
const liftArmMat = new T.MeshStandardMaterial({ color: '#f1c40f', roughness: 0.5, metalness: 0.5 });
const liftPostGeo = new T.BoxGeometry(0.42, 4.8, 0.42);
const liftArmGeo = new T.BoxGeometry(1.2, 0.18, 0.25);

const liftPositions = [
 [-3.4, 2.4, -2.8],
 [ 3.4, 2.4, -2.8],
 [-3.4, 2.4,  2.8],
 [ 3.4, 2.4,  2.8]
];
for (let lp of liftPositions) {
 const post = new T.Mesh(liftPostGeo, liftMat);
 post.position.set(lp[0], lp[1], lp[2]);
 post.castShadow = true;
 garageShowroomGroup.add(post);

 const arm = new T.Mesh(liftArmGeo, liftArmMat);
 arm.position.set(lp[0] * 0.85, 0.65, lp[2]);
 garageShowroomGroup.add(arm);
}

// 4. Endüstriyel Çelik Duvarlar & Garaj Kepenk Kapısı (Corrugated Metal Walls)
const wallMat = new T.MeshStandardMaterial({ color: '#181b22', roughness: 0.7, metalness: 0.45 });
const wallRibMat = new T.MeshStandardMaterial({ color: '#252932', roughness: 0.6, metalness: 0.5 });

// Arka Duvar (Z = -13m)
const backWall = new T.Mesh(new T.BoxGeometry(38, 14, 0.5), wallMat);
backWall.position.set(0, 7.0, -13.0);
backWall.receiveShadow = true;
garageShowroomGroup.add(backWall);

// Motorlu Çelik Sarmal Kepenk Kapı
const shutterDoor = new T.Mesh(new T.BoxGeometry(14, 7.8, 0.35), new T.MeshStandardMaterial({ color: '#2c3e50', roughness: 0.5, metalness: 0.6 }));
shutterDoor.position.set(0, 3.9, -12.7);
garageShowroomGroup.add(shutterDoor);

// Sarı-Siyah İkaz Çizgisi
const shutterHazard = new T.Mesh(new T.BoxGeometry(14, 0.45, 0.38), new T.MeshBasicMaterial({ color: '#f1c40f' }));
shutterHazard.position.set(0, 0.23, -12.65);
garageShowroomGroup.add(shutterHazard);

// Atölye Tabela / Banner
const signMesh = new T.Mesh(new T.BoxGeometry(18, 1.6, 0.2), new T.MeshStandardMaterial({ color: '#0f1115', roughness: 0.8 }));
signMesh.position.set(0, 9.5, -12.7);
garageShowroomGroup.add(signMesh);

const signGlowLight = new T.PointLight('#ffaa00', 2.0, 18);
signGlowLight.position.set(0, 9.5, -12.0);
garageShowroomGroup.add(signGlowLight);

// Yan Duvarlar (X = ±17m)
for (let side of [-1, 1]) {
 const sideWall = new T.Mesh(new T.BoxGeometry(0.5, 14, 30), wallMat);
 sideWall.position.set(side * 17.0, 7.0, 0);
 garageShowroomGroup.add(sideWall);

 // Çatı Makasları (Trusses)
 for (let z = -10; z <= 10; z += 5) {
  const truss = new T.Mesh(new T.BoxGeometry(34, 0.4, 0.4), wallRibMat);
  truss.position.set(0, 12.5, z);
  garageShowroomGroup.add(truss);
 }
}

// 5. Atölye Ekipmanları & Detay Propları (Workshop Props)
// Kırmızı Snap-On Tarzı Takım Sandıkları (Toolchests)
const toolMat = new T.MeshStandardMaterial({ color: '#c0392b', roughness: 0.35, metalness: 0.4 });
const chromeMat = new T.MeshStandardMaterial({ color: '#ecf0f1', roughness: 0.1, metalness: 0.95 });

for (let side of [-1, 1]) {
 const toolChest = new T.Mesh(new T.BoxGeometry(2.4, 2.2, 1.2), toolMat);
 toolChest.position.set(side * 7.5, 1.1, -9.5);
 toolChest.castShadow = true;
 garageShowroomGroup.add(toolChest);

 for (let h = 0.4; h < 1.9; h += 0.35) {
  const handle = new T.Mesh(new T.BoxGeometry(1.6, 0.06, 0.08), chromeMat);
  handle.position.set(side * 7.5, h, -8.85);
  garageShowroomGroup.add(handle);
 }
}

// Yarış Lastiği Yığınları (Tire Stacks)
const tireMat = new T.MeshStandardMaterial({ color: '#111215', roughness: 0.9 });
for (let side of [-1, 1]) {
 for (let i = 0; i < 4; i++) {
  const tire = new T.Mesh(new T.CylinderGeometry(0.52, 0.52, 0.36, 16), tireMat);
  tire.position.set(side * 9.5 + (i % 2) * 0.15, 0.18 + i * 0.36, 4.5);
  tire.castShadow = true;
  garageShowroomGroup.add(tire);
 }
}

// Oksi-Asetilen Kaynak Tüpleri & Mavi Pilot Alevi
const weldingGroup = new T.Group();
weldingGroup.position.set(-6.8, 0, 1.5);
const tankO2 = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 2.0, 12), new T.MeshStandardMaterial({ color: '#27ae60', roughness: 0.4 }));
tankO2.position.set(-0.25, 1.0, 0); weldingGroup.add(tankO2);
const tankAc = new T.Mesh(new T.CylinderGeometry(0.25, 0.25, 1.5, 12), new T.MeshStandardMaterial({ color: '#2c3e50', roughness: 0.4 }));
tankAc.position.set(0.25, 0.75, 0); weldingGroup.add(tankAc);
const torchFlameLight = new T.PointLight('#00d2ff', 1.8, 6);
torchFlameLight.position.set(0, 1.2, 0.6); weldingGroup.add(torchFlameLight);
garageShowroomGroup.add(weldingGroup);

// Motor Vinç Desteği & Asılı V8 Bloğu (Engine Hoist)
const hoistCrane = new T.Mesh(new T.BoxGeometry(0.25, 3.2, 0.25), liftArmMat);
hoistCrane.position.set(7.5, 1.6, 0); garageShowroomGroup.add(hoistCrane);
const hoistBoom = new T.Mesh(new T.BoxGeometry(2.2, 0.2, 0.2), liftArmMat);
hoistBoom.position.set(6.6, 3.2, 0); garageShowroomGroup.add(hoistBoom);
const chain = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 1.2, 6), chromeMat);
chain.position.set(5.6, 2.5, 0); garageShowroomGroup.add(chain);
const engineBlock = new T.Mesh(new T.BoxGeometry(0.85, 0.65, 0.95), new T.MeshStandardMaterial({ color: '#7f8c8d', roughness: 0.4, metalness: 0.8 }));
engineBlock.position.set(5.6, 1.6, 0); engineBlock.castShadow = true; garageShowroomGroup.add(engineBlock);

// 6. Profesyonel Showroom Aydınlatması (Studio High-Bay Lights)
// Tavandaki 4 beyaz floresan armatür
const flSpot1 = new T.SpotLight('#ffffff', 4.5, 30, Math.PI / 4, 0.35);
flSpot1.position.set(-3.5, 9.5, -2.5); flSpot1.target = ttBase; garageShowroomGroup.add(flSpot1); garageShowroomGroup.add(flSpot1.target);

const flSpot2 = new T.SpotLight('#ffffff', 4.5, 30, Math.PI / 4, 0.35);
flSpot2.position.set( 3.5, 9.5, -2.5); flSpot2.target = ttBase; garageShowroomGroup.add(flSpot2); garageShowroomGroup.add(flSpot2.target);

const flSpot3 = new T.SpotLight('#ffffff', 4.5, 30, Math.PI / 4, 0.35);
flSpot3.position.set(-3.5, 9.5,  2.5); flSpot3.target = ttBase; garageShowroomGroup.add(flSpot3); garageShowroomGroup.add(flSpot3.target);

const flSpot4 = new T.SpotLight('#ffffff', 4.5, 30, Math.PI / 4, 0.35);
flSpot4.position.set( 3.5, 9.5,  2.5); flSpot4.target = ttBase; garageShowroomGroup.add(flSpot4); garageShowroomGroup.add(flSpot4.target);

// Arka Soğuk Cyan Rim Işığı (Tombstone kenarlarını parlatır)
const rimLight = new T.PointLight('#00b4d8', 4.0, 24);
rimLight.position.set(0, 3.5, 7.5);
garageShowroomGroup.add(rimLight);

// Ön Sıcak Kehribar Key Işığı (Izgara ve Supercharger'ı aydınlatır)
const keyLight = new T.SpotLight('#ffb703', 4.2, 28, Math.PI / 3, 0.4);
keyLight.position.set(-5.5, 4.5, -6.5);
keyLight.target = ttBase;
garageShowroomGroup.add(keyLight);
garageShowroomGroup.add(keyLight.target);

/* ==========================================================
   İNTERAKTİF GARAJ KAMERASI, ORBİT VE AÇI ÖNAYARLARI
   ========================================================== */
let garageOrbitYaw = 0.55;
let garageOrbitPitch = 0.32;
let garageOrbitDist = 5.8;
let targetOrbitDist = 5.8;
let targetOrbitPitch = 0.32;
let targetOrbitYaw = 0.55;
let targetLookY = 0.75;
let garageAutoSpin = true;
let isDraggingOrbit = false;
let prevMouseX = 0, prevMouseY = 0;

// Mouse & Touch Orbit Listener
canvas.addEventListener('pointerdown', (e) => {
 if (!garageModeActive) return;
 isDraggingOrbit = true;
 prevMouseX = e.clientX;
 prevMouseY = e.clientY;
});

window.addEventListener('pointermove', (e) => {
 if (!garageModeActive || !isDraggingOrbit) return;
 const dx = e.clientX - prevMouseX;
 const dy = e.clientY - prevMouseY;
 prevMouseX = e.clientX;
 prevMouseY = e.clientY;

 targetOrbitYaw -= dx * 0.007;
 targetOrbitPitch += dy * 0.006;
 targetOrbitPitch = Math.max(0.08, Math.min(1.15, targetOrbitPitch));

 garageAutoSpin = false;
 const spinBtn = document.getElementById('btn-turntable-toggle');
 if (spinBtn) spinBtn.textContent = '🔄 DÖNDÜR: KAPALI';
});

window.addEventListener('pointerup', () => { isDraggingOrbit = false; });

canvas.addEventListener('wheel', (e) => {
 if (!garageModeActive) return;
 e.preventDefault();
 targetOrbitDist += Math.sign(e.deltaY) * 0.45;
 targetOrbitDist = Math.max(3.0, Math.min(9.2, targetOrbitDist));
}, { passive: false });

function setGarageCameraPreset(name) {
 if (name === 'overview') {
  targetOrbitDist = 5.8; targetOrbitPitch = 0.35; targetOrbitYaw = 0.7; targetLookY = 0.75;
 } else if (name === 'weapons') {
  targetOrbitDist = 3.2; targetOrbitPitch = 0.48; targetOrbitYaw = 0.28; targetLookY = 1.05;
 } else if (name === 'tombstone') {
  targetOrbitDist = 3.8; targetOrbitPitch = 0.25; targetOrbitYaw = Math.PI - 0.2; targetLookY = 0.85;
 } else if (name === 'engine') {
  targetOrbitDist = 3.1; targetOrbitPitch = 0.58; targetOrbitYaw = 0.12; targetLookY = 0.95;
 } else if (name === 'wheels') {
  targetOrbitDist = 3.5; targetOrbitPitch = 0.12; targetOrbitYaw = 1.35; targetLookY = 0.35;
 }

 document.querySelectorAll('.g-view-btn').forEach(b => b.classList.remove('active'));
 const activeBtn = document.getElementById(`btn-preset-${name}`);
 if (activeBtn) activeBtn.classList.add('active');
 Snd.playHiss();
}
window.setGarageCameraPreset = setGarageCameraPreset;

function toggleGarageTurntable() {
 garageAutoSpin = !garageAutoSpin;
 const spinBtn = document.getElementById('btn-turntable-toggle');
 if (spinBtn) spinBtn.textContent = garageAutoSpin ? '🔄 DÖNDÜR: AÇIK' : '🔄 DÖNDÜR: KAPALI';
 Snd.playMetalSnap();
}
window.toggleGarageTurntable = toggleGarageTurntable;

function triggerTestEngineRev() {
 Snd.playEngineRev();
 spawnSparks(new CANNON.Vec3(carGroup.position.x - 0.6, carGroup.position.y + 0.3, carGroup.position.z - 2.1), new T.Vector3(0, 0, -1), 16);
 spawnSparks(new CANNON.Vec3(carGroup.position.x + 0.6, carGroup.position.y + 0.3, carGroup.position.z - 2.1), new T.Vector3(0, 0, -1), 16);
 showBanner('V8 MOTOR KÜKREDİ! (TEST REV)', 'buff-sword');
}
window.triggerTestEngineRev = triggerTestEngineRev;

/* ==========================================================
   DİNAMİK 3D GÖRSEL YÜKSELTMELER (FRANKENSTEIN MODEL MODLARI)
   ========================================================== */
const visualUpgradeGroup = new T.Group();
carGroup.add(visualUpgradeGroup);

// 1. Chrome Twin Supercharger Blower (Engine Upgrade)
const blowerGroup = new T.Group();
const blowerMat = new T.MeshStandardMaterial({ color: '#ecf0f1', roughness: 0.12, metalness: 0.95 });
const blowerBody = new T.Mesh(new T.BoxGeometry(0.38, 0.22, 0.55), blowerMat);
blowerBody.position.set(0, 0.65, 0.55);
blowerGroup.add(blowerBody);

const scoopL = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.22, 14), blowerMat);
scoopL.position.set(-0.11, 0.8, 0.62); scoopL.rotation.x = Math.PI / 2; blowerGroup.add(scoopL);
const scoopR = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.22, 14), blowerMat);
scoopR.position.set(0.11, 0.8, 0.62); scoopR.rotation.x = Math.PI / 2; blowerGroup.add(scoopR);

// Kırmızı kelebek valfleri
const valveMat = new T.MeshBasicMaterial({ color: '#e74c3c' });
const valveL = new T.Mesh(new T.CircleGeometry(0.075, 12), valveMat);
valveL.position.set(-0.11, 0.8, 0.74); blowerGroup.add(valveL);
const valveR = new T.Mesh(new T.CircleGeometry(0.075, 12), valveMat);
valveR.position.set(0.11, 0.8, 0.74); blowerGroup.add(valveR);

blowerGroup.visible = false;
visualUpgradeGroup.add(blowerGroup);

// 2. Çelik Dikenli Koçbaşı & Ön Koruma (Armor Upgrade)
const armorVisualGroup = new T.Group();
const ramBarMat = new T.MeshStandardMaterial({ color: '#2c3e50', roughness: 0.4, metalness: 0.85 });
const ramCrossbar = new T.Mesh(new T.BoxGeometry(1.85, 0.18, 0.2), ramBarMat);
ramCrossbar.position.set(0, 0.24, 2.25);
armorVisualGroup.add(ramCrossbar);

for (let s of [-0.65, -0.22, 0.22, 0.65]) {
 const spike = new T.Mesh(new T.ConeGeometry(0.07, 0.35, 8), chromeMat);
 spike.rotation.x = Math.PI / 2;
 spike.position.set(s, 0.24, 2.45);
 armorVisualGroup.add(spike);
}

// Yan Cam Zırh Çelik Panelleri (Window Louvers)
for (let s of [-0.98, 0.98]) {
 const louver = new T.Mesh(new T.BoxGeometry(0.04, 0.35, 1.1), ramBarMat);
 louver.position.set(s, 0.75, -0.1);
 armorVisualGroup.add(louver);
}
armorVisualGroup.visible = false;
visualUpgradeGroup.add(armorVisualGroup);

// 3. Minigun Soğutma Ceketleri & Kırmızı Lazer Nişangahı (Gun Upgrade)
const gunVisualGroup = new T.Group();
const laserMat = new T.MeshBasicMaterial({ color: '#ff0033', transparent: true, opacity: 0.65 });
const laserBeamL = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 14, 6), laserMat);
laserBeamL.rotation.x = Math.PI / 2; laserBeamL.position.set(-0.38, 0.46, 7.5); gunVisualGroup.add(laserBeamL);
const laserBeamR = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 14, 6), laserMat);
laserBeamR.rotation.x = Math.PI / 2; laserBeamR.position.set(0.38, 0.46, 7.5); gunVisualGroup.add(laserBeamR);
gunVisualGroup.visible = false;
visualUpgradeGroup.add(gunVisualGroup);

// 4. Quad Salvo Ekstra Roket Podları (Rocket Upgrade)
const rocketVisualGroup = new T.Group();
const podExtMat = new T.MeshStandardMaterial({ color: '#273c75', roughness: 0.4, metalness: 0.7 });
const rTubeL = new T.Mesh(new T.CylinderGeometry(0.065, 0.065, 0.75, 8), podExtMat);
rTubeL.rotation.x = Math.PI / 2; rTubeL.position.set(-0.25, 1.15, -0.2); rocketVisualGroup.add(rTubeL);
const rTubeR = new T.Mesh(new T.CylinderGeometry(0.065, 0.065, 0.75, 8), podExtMat);
rTubeR.rotation.x = Math.PI / 2; rTubeR.position.set(0.25, 1.15, -0.2); rocketVisualGroup.add(rTubeR);

// Kırmızı parlayan roket uçları
const tipL = new T.Mesh(new T.ConeGeometry(0.065, 0.15, 8), new T.MeshBasicMaterial({ color: '#ff2200' }));
tipL.rotation.x = -Math.PI / 2; tipL.position.set(-0.25, 1.15, 0.22); rocketVisualGroup.add(tipL);
const tipR = new T.Mesh(new T.ConeGeometry(0.065, 0.15, 8), new T.MeshBasicMaterial({ color: '#ff2200' }));
tipR.rotation.x = -Math.PI / 2; tipR.position.set(0.25, 1.15, 0.22); rocketVisualGroup.add(tipR);
rocketVisualGroup.visible = false;
visualUpgradeGroup.add(rocketVisualGroup);

function updateCarVisualUpgrades() {
 if (blowerGroup) blowerGroup.visible = upgrades.engine >= 2;
 if (armorVisualGroup) armorVisualGroup.visible = upgrades.armor >= 2;
 if (gunVisualGroup) gunVisualGroup.visible = upgrades.gun >= 2;
 if (rocketVisualGroup) rocketVisualGroup.visible = upgrades.rocket >= 2;
}
window.updateCarVisualUpgrades = updateCarVisualUpgrades;

function updateGarageStatsUI() {
 const spdVal = 245 + (upgrades.engine - 1) * 35;
 const armVal = 100 + (upgrades.armor - 1) * 35;
 const gunDps = 45 + (upgrades.gun - 1) * 20;
 const rktSalvo = upgrades.rocket >= 2 ? (upgrades.rocket >= 3 ? '4X GÜDÜMLÜ' : '3X KÜME') : '2X SALVO';

 const elSpd = document.getElementById('stat-val-speed');
 if (elSpd) elSpd.textContent = `${spdVal} KM/SA`;
 const barSpd = document.getElementById('stat-bar-speed');
 if (barSpd) barSpd.style.width = `${Math.min(100, (spdVal / 380) * 100)}%`;

 const elArm = document.getElementById('stat-val-armor');
 if (elArm) elArm.textContent = `${armVal} HP`;
 const barArm = document.getElementById('stat-bar-armor');
 if (barArm) barArm.style.width = `${Math.min(100, (armVal / 240) * 100)}%`;

 const elGun = document.getElementById('stat-val-firepower');
 if (elGun) elGun.textContent = `${gunDps} DPS (${upgrades.gun >= 2 ? '.50 CAL HEAVY' : '7.62MM'})`;
 const barGun = document.getElementById('stat-bar-firepower');
 if (barGun) barGun.style.width = `${Math.min(100, (gunDps / 110) * 100)}%`;

 const elRkt = document.getElementById('stat-val-rockets');
 if (elRkt) elRkt.textContent = rktSalvo;
 const barRkt = document.getElementById('stat-bar-rockets');
 if (barRkt) barRkt.style.width = `${Math.min(100, (upgrades.rocket / 3) * 100)}%`;
}
window.updateGarageStatsUI = updateGarageStatsUI;


/* ==========================================================
   BÖLGESEL HASAR & MODÜLER PARÇALANMA SİSTEMİ
   ========================================================== */
let carHealth = 100;
let nitroAmount = 100;
const detachedParts = new Set();
const debrisList = [];

const MODULAR_PARTS = {
 'part_spikes': { name: 'Ön Mahmuzlar', mass: 35, impulse: new CANNON.Vec3(0, 2.5, 7.0), hpThreshold: 80 },
 'part_armor_l': { name: 'Sol Zırh Plakası', mass: 25, impulse: new CANNON.Vec3(-6.0, 2.0, 0), hpThreshold: 60 },
 'part_armor_r': { name: 'Sağ Zırh Plakası', mass: 25, impulse: new CANNON.Vec3(6.0, 2.0, 0), hpThreshold: 45 },
 'part_roof': { name: 'Tavan Projektörleri', mass: 20, impulse: new CANNON.Vec3(0, 5.0, -1.0), hpThreshold: 30 },
 'part_tombstone': { name: 'Tombstone Kalkanı', mass: 160, impulse: new CANNON.Vec3(0, 1.8, -9.0), hpThreshold: 15 },
};

function detachArmorPart(partKey, customImpulse = null) {
 if (detachedParts.has(partKey)) return;
 const mesh = carGroup.getObjectByName(partKey);
 if (!mesh) return;

 detachedParts.add(partKey);
 mesh.visible = false;
 updatePartsHUD();

 const cfg = MODULAR_PARTS[partKey] || { mass: 30, impulse: new CANNON.Vec3(0, 2, 0) };
 mesh.updateMatrixWorld(true);
 const worldPos = new T.Vector3(); mesh.getWorldPosition(worldPos);
 const worldQuat = new T.Quaternion(); mesh.getWorldQuaternion(worldQuat);

 const debrisMesh = mesh.clone(true);
 debrisMesh.position.copy(worldPos); debrisMesh.quaternion.copy(worldQuat);
 debrisMesh.visible = true; scene.add(debrisMesh);

 const bbox = new T.Box3().setFromObject(debrisMesh);
 const sz = bbox.getSize(new T.Vector3());
 const halfExt = new CANNON.Vec3(Math.max(0.12, sz.x / 2), Math.max(0.08, sz.y / 2), Math.max(0.12, sz.z / 2));

 const debrisBody = new CANNON.Body({
  mass: cfg.mass, material: debrisMat, position: new CANNON.Vec3(worldPos.x, worldPos.y, worldPos.z),
 });
 debrisBody.addShape(new CANNON.Box(halfExt));
 debrisBody.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);

 debrisBody.velocity.copy(chassisBody.velocity);
 const ejectVec = customImpulse || cfg.impulse.clone();
 const ejectWorld = new CANNON.Vec3();
 chassisBody.vectorToWorldFrame(ejectVec, ejectWorld);
 debrisBody.velocity.vadd(ejectWorld, debrisBody.velocity);

 debrisBody.angularVelocity.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 12);
 debrisBody.linearDamping = 0.08; debrisBody.angularDamping = 0.2;
 world.addBody(debrisBody);

 debrisList.push({ mesh: debrisMesh, body: debrisBody, life: 18 });
 spawnSparks(worldPos, new T.Vector3(0, 1, 0), 22);
 Snd.playMetalSnap();
 cameraShake = Math.max(cameraShake, 0.25);
 addViewers(65000, `${cfg.name.toUpperCase()} KOPTU!`);
}



/* ==========================================================
   OYUN MODU YÖNETİCİSİ (DEATH RACE / BARIŞÇIL TEST MODU)
   ========================================================== */
let currentGameMode = 'deathrace'; // 'deathrace' veya 'peaceful'
let aiFireEnabled = true;
let godMode = false;
let isGameStarted = false;
window.isGameStarted = false;

function setGameMode(mode, closeModal = false) {
 if (!isGameStarted) {
  raceCountdown = 3.0; // yarış 3-2-1 geri sayımla başlar; bu sürede tüm araçlar frende bekler
  raceStartCredits = playerCredits;
  // Önceden tur zamanlayıcısı sayfa açılınca başlıyordu; ilk tura menüde geçen süre ekleniyordu
  lapStartTime = performance.now();
  resetGhostRecording();
 }
 isGameStarted = true;
 activeCareerEvent = mode === 'career' ? (CAREER_EVENTS[careerProgress.event] || CAREER_EVENTS[CAREER_EVENTS.length - 1]) : null;
 if (activeCareerEvent) startCareerEvent(activeCareerEvent);
 if (mode === 'career') mode = 'deathrace';
 window.isGameStarted = true;
 currentGameMode = mode;
 if (Snd && Snd.playMenuClick) Snd.playMenuClick();

 const btnDeath = document.getElementById('btn-mode-deathrace');
 const btnPeace = document.getElementById('btn-mode-peaceful');
 const elimHud = document.getElementById('elimination-hud');

 if (mode === 'peaceful') {
  aiFireEnabled = false;
  godMode = true;
  carHealth = 100 + (upgrades.armor - 1) * 35;

  if (btnPeace) {
   btnPeace.className = 'mode-pill-btn active peaceful';
  }
  if (btnDeath) {
   btnDeath.className = 'mode-pill-btn';
  }
  if (elimHud) {
   elimHud.innerHTML = '🕊️ BARIŞÇIL TEST MODU: <b>HİÇBİR ARAÇ VURMAZ & HASAR KAPALI</b>';
   elimHud.style.borderColor = '#2ecc71';
   elimHud.style.color = '#2ecc71';
  }

  showBanner('🕊️ BARIŞÇIL TEST MODU AKTİF! KİMSE SANA ATEŞ ETMEZ', 'buff-shield');
  showRadioMessage('Barışçıl test modu devrede Frankenstein! Kimse bize ateş açamaz, 18 virajlı pistin tadını çıkar!', 'case', 'Peaceful test drive active, all enemy fire locked!');
 } else {
  aiFireEnabled = true;
  godMode = false;

  if (btnDeath) {
   btnDeath.className = 'mode-pill-btn active combat';
  }
  if (btnPeace) {
   btnPeace.className = 'mode-pill-btn';
  }
  if (elimHud) {
   elimHud.innerHTML = '☠ ELEME SAYACI: <span id="elimination-timer">' + Math.max(0, eliminationTimer).toFixed(1) + 's</span> (SONUNCU İMHA EDİLİR!)';
   // innerHTML eski <span>'ı DOM'dan kopardı; referans yenilenmezse sayaç ekranda hiç güncellenmez
   eliminationTimerEl = document.getElementById('elimination-timer');
   elimHud.style.borderColor = 'rgba(231,76,60,0.6)';
   elimHud.style.color = '#fff';
  }

  showBanner('💀 ÖLÜM YARIŞI AKTİF! TÜM SİLAHLAR SERBEST', 'buff-sword');
  showRadioMessage('Ölüm Yarışı başladı! Ateş serbest, arkana dikkat et Frankenstein!', 'case', 'Death Race engaged! Enemy weapons online!');
 }

 if (closeModal) {
  const m = document.getElementById('mode-select-modal');
  if (m) {
   m.classList.add('closing');
   setTimeout(() => {
    m.classList.remove('open');
    m.classList.remove('closing');
   }, 160);
  }
 }
}
window.setGameMode = setGameMode;
window.__realSetGameMode = setGameMode;

function openModeModal() {
 const m = document.getElementById('mode-select-modal');
 if (m) {
  m.classList.remove('closing');
  m.classList.add('open');
 }
}
window.openModeModal = openModeModal;
window.__realOpenModeModal = openModeModal;

function closeModeModal() {
 isGameStarted = true;
 window.isGameStarted = true;
 const m = document.getElementById('mode-select-modal');
 if (m) {
  m.classList.add('closing');
  setTimeout(() => {
   m.classList.remove('open');
   m.classList.remove('closing');
  }, 160);
 }
}
window.closeModeModal = closeModeModal;
window.__realCloseModeModal = closeModeModal;
window.__realToggleGarage = toggleGarage;

function toggleAIFire() {
 if (currentGameMode === 'peaceful') {
  setGameMode('deathrace');
 } else {
  setGameMode('peaceful');
 }
}
window.toggleAIFire = toggleAIFire;


function toggleGodMode() {
 godMode = !godMode;
 showBanner(godMode ? '🛡️ ÖLÜMSÜZLÜK / GODMODE: AÇIK [O]' : 'ÖLÜMSÜZLÜK: KAPALI [O]', 'buff-shield');
 showRadioMessage(godMode ? 'Frankenstein hasar almaz kalkanı devrede!' : 'Normal hasar modu devrede!', 'case', godMode ? 'Godmode activated!' : 'Normal damage mode restored.');
 if (godMode) {
  carHealth = 100 + (upgrades.armor - 1) * 35;
 }
}
window.toggleGodMode = toggleGodMode;

// Kopan zırh parçalarının oyuncuya etkisi: yan plakalar/tavan gidince alınan hasar artar
function playerDamageTakenMul() {
 return 1 + (detachedParts.has('part_armor_l') ? 0.15 : 0) + (detachedParts.has('part_armor_r') ? 0.15 : 0) + (detachedParts.has('part_roof') ? 0.1 : 0);
}
// Can %50'nin altına inince motor gücü/azami hız düşer (%0 canda %80)
function healthSpeedFactor(hp, maxHp) {
 const r = Math.max(0, hp / maxHp);
 return r >= 0.5 ? 1 : 0.8 + 0.4 * r;
}

function applyCarDamage(dmg, contactPoint = null, normal = null) {
 if (carHealth <= 0 || godMode || raceFinished) return;
 dmg *= playerDamageTakenMul();

 if (shieldTimer > 0) {
  if (contactPoint) spawnSparks(new T.Vector3(contactPoint.x, contactPoint.y, contactPoint.z), new T.Vector3(0, 1, 0), 15);
  Snd.playImpact();
  return;
 }

 // Arka Tombstone Kalkanı Darbe Emme Kontrolü
 if (contactPoint && !isTombstoneDetached) {
  const localPt = chassisBody.pointToLocalFrame(new CANNON.Vec3(contactPoint.x, contactPoint.y, contactPoint.z));
  if (localPt.z < -0.75) {
   tombstoneHealth -= dmg;
   if (tombstoneFillEl) {
    const pct = Math.max(0, Math.round((tombstoneHealth / tombstoneMaxHealth) * 100));
    tombstoneFillEl.style.width = pct + '%';
   }
   if (tombstoneTextEl) {
    const pct = Math.max(0, Math.round((tombstoneHealth / tombstoneMaxHealth) * 100));
    tombstoneTextEl.textContent = 'TOMBSTONE %' + pct + ' [T]';
   }
   Snd.playMetalSnap();
   spawnSparks(new T.Vector3(contactPoint.x, contactPoint.y, contactPoint.z), new T.Vector3(0, 1, 0), 18);
   if (tombstoneHealth <= 0) {
    dropTombstone();
   }
   return; // Darbe Tombstone tarafından tamamen emildi!
  }
 }


 carHealth = Math.max(0, carHealth - dmg);
 Snd.playCrash(dmg / 35);
 rumble(0.25 + dmg / 40);
 cameraShake = Math.max(cameraShake, Math.min(0.7, dmg * 0.022));

 if (carHealth < 40 && Math.random() < 0.35) {
  showRadioMessage('Frankenstein, zırh kritik seviyede! Kalkan plakasına yönel!');
 }

 if (contactPoint) {
  const norm = normal || new T.Vector3(0, 1, 0);
  spawnSparks(new T.Vector3(contactPoint.x, contactPoint.y, contactPoint.z), norm, 14);

  const localPt = chassisBody.pointToLocalFrame(new CANNON.Vec3(contactPoint.x, contactPoint.y, contactPoint.z));
  if (localPt.z > 0.9 && Math.abs(localPt.x) < 0.8) detachArmorPart('part_spikes');
  else if (localPt.x < -0.6) detachArmorPart('part_armor_l');
  else if (localPt.x > 0.6) detachArmorPart('part_armor_r');
  else if (localPt.z < -0.9) detachArmorPart('part_tombstone');
  else if (localPt.y > 0.8) detachArmorPart('part_roof');
 }

 for (let [key, cfg] of Object.entries(MODULAR_PARTS)) {
  if (carHealth <= cfg.hpThreshold) detachArmorPart(key);
 }

 if (carHealth <= 0) {
  createExplosion(chassisBody.position, 11, 4000);
  for (let key of Object.keys(MODULAR_PARTS)) detachArmorPart(key);
  showBanner('FRANKENSTEIN İMHA EDİLDİ! [R İLE YENİDEN BAŞLA]', 'buff-sword');
  showRadioMessage('Sistemler çöktü! Araç imha edildi!');
 }
}

let lastCrashTime = 0;
chassisBody.addEventListener('collide', e => {
 const now = performance.now();
 if (now - lastCrashTime < 140) return;
 const relVel = e.contact.getImpactVelocityAlongNormal();
 if (Math.abs(relVel) < 4.5) return;
 lastCrashTime = now;

 // Barikat / Varil / Silo çarpışma hasarı (Hedefleri ezerek parçala)
 const otherBody = e.contact.bi === chassisBody ? e.contact.bj : e.contact.bi;
 const ramImpact = Math.abs(relVel);
 if (otherBody && otherBody.targetData && otherBody.targetData.onHit) {
  const ramMult = (customization.bumperKit === 'ram_plow' ? 3.0 : (customization.bumperKit === 'reinforced_grate' ? 2.0 : 1.3)) * (detachedParts.has('part_spikes') ? 0.6 : 1);
  otherBody.targetData.onHit(ramImpact * 12 * ramMult, null, null, 'ram');
 }

 const dmgReduction = (customization.bumperKit === 'ram_plow' ? 0.35 : (customization.bumperKit === 'reinforced_grate' ? 0.6 : 1.0));
 const dmg = Math.min(35, (ramImpact - 4.0) * 3.2) * dmgReduction;
 const cp = e.contact.bi === chassisBody ? e.contact.ri : e.contact.rj;
 const worldContact = new CANNON.Vec3();
 chassisBody.pointToWorldFrame(cp, worldContact);
 applyCarDamage(dmg, worldContact, new T.Vector3(0, 1, 0));
});

/* ==========================================================
   MERMİLER, ROKETLER, KIVILCIMLAR, PATLAMALAR & DUMAN
   ========================================================== */
const activeBullets = [];
const activeRockets = [];
const bulletGeo = new T.CylinderGeometry(0.02, 0.02, 0.9, 5);
bulletGeo.rotateX(Math.PI / 2);
const bulletMatPlayer = new T.MeshBasicMaterial({ color: '#ffea60' });
const bulletMatPlayerLvl2 = new T.MeshBasicMaterial({ color: '#ffaa00' });
const bulletMatPlayerLvl3 = new T.MeshBasicMaterial({ color: '#ff2200' });
const bulletMatEnemy = new T.MeshBasicMaterial({ color: '#ff4422' });
const bulletMatCannon = new T.MeshBasicMaterial({ color: '#ff2200' });

const rocketGeo = new T.CylinderGeometry(0.06, 0.06, 0.85, 8);
rocketGeo.rotateX(Math.PI / 2);
const rocketMat = new T.MeshStandardMaterial({ color: '#2c3e50', roughness: 0.4, metalness: 0.8 });

/* ---------- Nesne havuzları (Object Pooling) ----------
   Mermi/duman/patlama mesh'leri her atışta new T.Mesh + scene.add/remove yapmak yerine bir kez
   oluşturulup görünürlükleri açılıp kapatılır: GC baskısı ve scene.children splice maliyeti sıfırlanır,
   ayrıca havuzdaki örnekler sahnede durduğu için shader'ları açılışta önceden derlenir. */
function createMeshPool(geo, defaultMat, prewarm = 0) {
 const free = [];
 const make = () => {
  const m = new T.Mesh(geo, defaultMat);
  m.visible = false;
  scene.add(m);
  return m;
 };
 for (let i = 0; i < prewarm; i++) free.push(make());
 return {
  acquire(mat) {
   const m = free.pop() || make();
   m.material = mat || defaultMat;
   m.position.set(0, 0, 0);
   m.quaternion.identity();
   m.scale.set(1, 1, 1);
   m.visible = true;
   return m;
  },
  release(m) {
   if (!m.visible) return;
   m.visible = false;
   free.push(m);
  }
 };
}

const bulletPool = createMeshPool(bulletGeo, bulletMatPlayer, 64);
function acquireBulletMesh(mat) { return bulletPool.acquire(mat); }
function releaseBulletMesh(m) { bulletPool.release(m); }

// Kıvılcımlar: nesne başına {x,y,z...} objesi + sparks.shift() (O(n)) yerine sabit boyutlu
// typed-array halka tamponu. Tek draw call, sıfır tahsis.
const sparkMax = 350;
const sparkGeo = new T.BufferGeometry();
const sparkPos = new Float32Array(sparkMax * 3);
const sparkVel = new Float32Array(sparkMax * 3);
const sparkLife = new Float32Array(sparkMax);
for (let i = 0; i < sparkMax; i++) sparkPos[i * 3 + 1] = -999;
let sparkHead = 0;
let sparksAlive = 0;
sparkGeo.setAttribute('position', new T.BufferAttribute(sparkPos, 3));
const sparkMat = new T.PointsMaterial({ color: '#ffcc44', size: 0.18, transparent: true, opacity: 0.95 });
const sparkPoints = new T.Points(sparkGeo, sparkMat);
sparkPoints.frustumCulled = false; // bounding sphere ilk karedeki (boş) konumlardan hesaplanıp kıvılcımları yanlışlıkla kırpıyordu
scene.add(sparkPoints);

function spawnSparks(pos, normal, count = 10) {
 for (let i = 0; i < count; i++) {
  const idx = sparkHead;
  sparkHead = (sparkHead + 1) % sparkMax;
  if (sparkLife[idx] <= 0) sparksAlive++;

  const dx = normal.x + (Math.random() - 0.5) * 1.2;
  const dy = normal.y + Math.random() * 1.5 + 0.3;
  const dz = normal.z + (Math.random() - 0.5) * 1.2;
  const sp = (4 + Math.random() * 8) / (Math.sqrt(dx * dx + dy * dy + dz * dz) || 1);

  const o = idx * 3;
  sparkPos[o] = pos.x; sparkPos[o + 1] = pos.y; sparkPos[o + 2] = pos.z;
  sparkVel[o] = dx * sp; sparkVel[o + 1] = dy * sp; sparkVel[o + 2] = dz * sp;
  sparkLife[idx] = 0.3 + Math.random() * 0.25;
 }
}

function updateSparks(dt) {
 if (sparksAlive === 0) return;
 for (let i = 0; i < sparkMax; i++) {
  if (sparkLife[i] <= 0) continue;
  const o = i * 3;
  sparkLife[i] -= dt;
  if (sparkLife[i] <= 0) {
   sparkPos[o + 1] = -999;
   sparksAlive--;
   continue;
  }
  sparkVel[o + 1] -= 9.8 * dt;
  sparkPos[o] += sparkVel[o] * dt;
  sparkPos[o + 1] += sparkVel[o + 1] * dt;
  sparkPos[o + 2] += sparkVel[o + 2] * dt;
  if (sparkPos[o + 1] < 0.05) { sparkPos[o + 1] = 0.05; sparkVel[o + 1] = -sparkVel[o + 1] * 0.4; }
 }
 sparkGeo.attributes.position.needsUpdate = true;
}

// Patlamalar: her patlamada expMat.clone() + dispose() yerine kendi materyaline sahip sabit bir havuz.
// (dispose edilen son materyal shader programını da silebiliyor ve bir sonraki patlama yeniden derletiyordu.)
const explosions = [];
const expSphereGeo = new T.SphereGeometry(1, 12, 10);
const expMat = new T.MeshBasicMaterial({ color: '#ff5511', transparent: true, opacity: 0.9 });
const explosionFree = [];
for (let i = 0; i < 8; i++) {
 const m = new T.Mesh(expSphereGeo, expMat.clone());
 m.visible = false;
 scene.add(m);
 explosionFree.push(m);
}
const _explosionUp = new T.Vector3(0, 1, 0);

function createExplosion(pos, maxRadius = 8, shockImpulse = 2400) {
 Snd.playExplosion();
 cameraShake = Math.max(cameraShake, 0.55);

 let expMesh = explosionFree.pop();
 if (!expMesh) {
  // Havuz boşsa en eski patlamayı yeniden kullan
  const oldest = explosions.shift();
  expMesh = oldest.mesh;
 }
 expMesh.position.set(pos.x, pos.y, pos.z);
 expMesh.scale.setScalar(0.5);
 expMesh.material.opacity = 0.9;
 expMesh.visible = true;
 explosions.push({ mesh: expMesh, curScale: 0.5, maxScale: maxRadius, life: 0.5, maxLife: 0.5 });
 spawnSparks(pos, _explosionUp, 40);

 for (let b of world.bodies) {
  if (b.mass <= 0) continue;
  const dx = b.position.x - pos.x;
  const dy = b.position.y - pos.y;
  const dz = b.position.z - pos.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < maxRadius * 2.2 && dist > 0.05) {
   const force = Math.min(1000, (1 - dist / (maxRadius * 2.2)) * shockImpulse);
   const dir = new CANNON.Vec3(dx / dist, Math.max(0.4, dy / dist), dz / dist);
   b.applyImpulse(dir.scale(force), b.position);
   if (b === chassisBody) {
    applyCarDamage(Math.min(30, Math.round(force * 0.015)), pos);
   }
  }
 }
}

const smokePuffs = [];
const smokeGeo = new T.SphereGeometry(0.5, 8, 6);
const smokeMat = new T.MeshBasicMaterial({ color: '#2a2c30', transparent: true, opacity: 0.55, depthWrite: false });
const tireSmokeMat = new T.MeshBasicMaterial({ color: '#eef0f4', transparent: true, opacity: 0.38, depthWrite: false });
const damageSmokeFireMat = new T.MeshBasicMaterial({ color: '#ff5500', transparent: true, opacity: 0.8, depthWrite: false });
const damageSmokeDarkMat = new T.MeshBasicMaterial({ color: '#222222', transparent: true, opacity: 0.55, depthWrite: false });
const smokePool = createMeshPool(smokeGeo, tireSmokeMat, 48);
const _smokeOffset = new T.Vector3();

function spawnTireSmoke(pos) {
 if (smokePuffs.length > 40) return;
 const m = smokePool.acquire(tireSmokeMat);
 m.position.set(pos.x + (Math.random() - 0.5) * 0.3, pos.y, pos.z + (Math.random() - 0.5) * 0.3);
 m.scale.setScalar(0.35 + Math.random() * 0.2);
 smokePuffs.push({
  mesh: m, vx: (Math.random() - 0.5) * 1.5, vy: 1.2 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 1.5,
  grow: 3.5, life: 0.8, maxLife: 0.8
 });
}

function tryDropSmoke() {
 const now = performance.now();
 if (now - lastSmokeTime < 3000 || carHealth <= 0) return;
 if (!canUseWeapon('smoke')) return;
 lastSmokeTime = now;
 consumeWeapon('smoke');
 dropSmokeScreen();
}

function dropSmokeScreen() {
 Snd.playHiss();
 const rearPos = new T.Vector3(0, 0.3, -2.2).applyQuaternion(carGroup.quaternion).add(carGroup.position);
 for (let i = 0; i < 7; i++) {
  const m = smokePool.acquire(smokeMat);
  m.position.set(rearPos.x + (Math.random() - 0.5) * 1.5, rearPos.y + Math.random() * 0.5, rearPos.z + (Math.random() - 0.5) * 1.5);
  m.scale.setScalar(1.2 + Math.random() * 0.8);
  smokePuffs.push({
   mesh: m, vx: (Math.random() - 0.5) * 2.5, vy: 1.0 + Math.random() * 1.5, vz: (Math.random() - 0.5) * 2.5,
   grow: 4.5, life: 4.0, maxLife: 4.0
  });
 }
}

function spawnDamageSmokePuff(isFire = false) {
 if (smokePuffs.length > 40) return;
 const hoodPos = _smokeOffset.set(0, 0.5, 0.9).applyQuaternion(carGroup.quaternion).add(carGroup.position);
 const mat = isFire ? damageSmokeFireMat : damageSmokeDarkMat;
 const m = smokePool.acquire(mat);
 m.position.set(hoodPos.x + (Math.random() - 0.5) * 0.4, hoodPos.y, hoodPos.z + (Math.random() - 0.5) * 0.4);
 m.scale.setScalar(0.4 + Math.random() * 0.3);
 smokePuffs.push({
  mesh: m, vx: (Math.random() - 0.5) * 1.2, vy: 2.2 + Math.random() * 1.8, vz: (Math.random() - 0.5) * 1.2,
  grow: isFire ? 2.5 : 3.8, life: isFire ? 0.7 : 1.8, maxLife: isFire ? 0.7 : 1.8
 });
}

/* ==========================================================
   YOLA YAĞ DÖKME & ÇİVİ TUZAKLARI (OIL SLICK & CALTROPS)
   ========================================================== */
const activeOilSlicks = [];
function checkOilIgnition(hitPos, radius = 3.8) {
 for (let oil of activeOilSlicks) {
  if (oil.isIgnited) continue;
  const dist = Math.hypot(hitPos.x - oil.pos.x, hitPos.z - oil.pos.z);
  if (dist < oil.radius + radius) {
   oil.isIgnited = true;
   triggerFlameJet(oil.pos.x - 1.2, oil.pos.z - 1.2);
   triggerFlameJet(oil.pos.x + 1.2, oil.pos.z + 1.2);
   triggerFlameJet(oil.pos.x, oil.pos.z);
   oil.mesh.material.color.setHex(0xff3300);
   showBanner('🔥 MOTOR YAĞI ALEV ALDI! ALEV DUVARI PARLADI!', 'buff-sword');
   Snd.playImpact();
   break;
  }
 }
}
const oilGeo = new T.CylinderGeometry(2.4, 2.4, 0.03, 14);
const oilMat = new T.MeshStandardMaterial({ color: '#07080a', roughness: 0.15, metalness: 0.9 });

function spawnOilSlick(rearPos, owner) {
 const m = new T.Mesh(oilGeo, oilMat);
 m.position.set(rearPos.x, 0.03, rearPos.z);
 scene.add(m);
 activeOilSlicks.push({ mesh: m, pos: new T.Vector3(rearPos.x, 0, rearPos.z), radius: 2.5, life: 25.0, owner });
}

function deployOilSlick() {
 const now = performance.now();
 if (now - lastOilTime < 5000 || carHealth <= 0) return;
 if (!canUseWeapon('oil')) return;
 lastOilTime = now;
 consumeWeapon('oil');
 const rearPos = new T.Vector3(0, 0.03, -2.4).applyQuaternion(carGroup.quaternion).add(carGroup.position);
 spawnOilSlick(rearPos, null);
 Snd.playHiss();
 showBanner('YOLA MOTOR YAĞI DÖKÜLDÜ!', 'buff-sword');
 showRadioMessage('Arkamıza siyah yağ bıraktım, basan kayıp savrulacak!');
 addViewers(35000);
}

const activeCaltrops = [];
const caltropGeo = new T.BoxGeometry(2.2, 0.12, 1.2);
const caltropMat = new T.MeshStandardMaterial({ color: '#888d95', roughness: 0.3, metalness: 0.95 });

function deployCaltrops() {
 const rearPos = new T.Vector3(0, 0.05, -2.4).applyQuaternion(carGroup.quaternion).add(carGroup.position);
 const m = new T.Mesh(caltropGeo, caltropMat);
 m.position.set(rearPos.x, 0.05, rearPos.z);
 m.rotation.y = carGroup.rotation.y;
 scene.add(m);
 activeCaltrops.push({ mesh: m, pos: new T.Vector3(rearPos.x, 0, rearPos.z), radius: 2.0, life: 25.0 });
 Snd.playMetalSnap();
 showBanner('YOLA ÇELİK ÇİVİ TUZAĞI ATILDI!', 'buff-sword');
 showRadioMessage('Dikenli tuzak döşendi, arkamızdakilerin lastiği patlayacak!');
 addViewers(40000);
}

/* ==========================================================
   GÜDÜMLÜ ROKET MEKANİĞİ (RPG)
   ========================================================== */
let lastRPGTime = -99999;
let lastOilTime = -99999;
let lastCaltropTime = -99999;

function fireRocket() {
 const now = performance.now();
 if (now - lastRPGTime < 4500 || carHealth <= 0) return;
 if (!canUseWeapon('rockets')) return;
 lastRPGTime = now;
 consumeWeapon('rockets');

 const podWorld = new T.Vector3();
 rocketPod.getWorldPosition(podWorld);
 const fwd = new T.Vector3(0, 0, 1).applyQuaternion(carGroup.quaternion);

 let targetEntity = null;
 let closestDist = 140;

 if (dreadnought && dreadnought.isActive && !dreadnought.isDead) {
  const toBoss = dreadnought.body.position.vsub(chassisBody.position);
  if (toBoss.length() < closestDist && fwd.dot(new T.Vector3(toBoss.x, toBoss.y, toBoss.z).normalize()) > 0.4) {
   targetEntity = dreadnought;
   closestDist = toBoss.length();
  }
 }

 for (let ai of aiOpponents) {
  if (ai.isDead) continue;
  const toAI = ai.chassisBody.position.vsub(chassisBody.position);
  const dist = toAI.length();
  const dir = new T.Vector3(toAI.x, toAI.y, toAI.z).normalize();
  if (dist < closestDist && fwd.dot(dir) > 0.5) {
   closestDist = dist;
   targetEntity = ai;
  }
 }

 // Roket Salvo Sayısı: Yükseltme seviyesi 2+ ise çiftli fırlatır!
 const count = upgrades.rocket >= 2 ? 2 : 1;
 for (let s = 0; s < count; s++) {
  const offset = s === 0 ? -0.2 : 0.2;
  const spawnPos = podWorld.clone().add(new T.Vector3(offset, 0, 0).applyQuaternion(carGroup.quaternion));
  const rMesh = new T.Mesh(rocketGeo, rocketMat);
  rMesh.position.copy(spawnPos);
  rMesh.quaternion.copy(carGroup.quaternion);
  scene.add(rMesh);

  activeRockets.push({
   mesh: rMesh, pos: spawnPos.clone(), vel: fwd.clone().multiplyScalar(90),
   target: targetEntity, life: 3.5,
  });
 }

 Snd.playRocketLaunch();
 cameraShake = Math.max(cameraShake, 0.35);
 showBanner(count > 1 ? 'ÇİFTLİ SALVO ROKET ATEŞLENDİ!' : 'GÜDÜMLÜ ROKET ATEŞLENDİ!', 'buff-sword');
 showRadioMessage(targetEntity ? `${targetEntity.name} kilitlendi, roket yola çıktı!` : 'Roket fırlatıldı!');
 addViewers(50000);
}

/* ==========================================================
   WEYLAND HABER HELİKOPTERİ (NEWS CHOPPER)
   ========================================================== */
function createNewsChopper() {
 const chopper = new T.Group();
 const bodyMat = new T.MeshStandardMaterial({ color: '#161920', roughness: 0.5, metalness: 0.8 });
 const darkMat = new T.MeshStandardMaterial({ color: '#090a0d', roughness: 0.7 });

 const cab = new T.Mesh(new T.BoxGeometry(1.8, 1.6, 4.2), bodyMat);
 cab.castShadow = true; chopper.add(cab);

 const tail = new T.Mesh(new T.BoxGeometry(0.3, 0.4, 4.5), bodyMat);
 tail.position.set(0, 0.3, -3.8); chopper.add(tail);

 const rotor = new T.Mesh(new T.BoxGeometry(7.5, 0.06, 0.4), darkMat);
 rotor.position.set(0, 1.2, 0.3); chopper.add(rotor);

 const tailRotor = new T.Mesh(new T.BoxGeometry(0.04, 1.2, 0.2), darkMat);
 tailRotor.position.set(0.2, 0.4, -5.8); chopper.add(tailRotor);

 const spot = new T.SpotLight('#ffffff', 6.0, 90, Math.PI / 5, 0.45);
 spot.position.set(0, -0.6, 1.2);
 chopper.add(spot);
 chopper.add(spot.target);

 chopper.position.set(0, 24, 0);
 scene.add(chopper);

 return { root: chopper, rotor, tailRotor, spot, hp: 60, isDead: false, angle: 0 };
}

const chopper = createNewsChopper();

function updateChopper(dt) {
 if (chopper.isDead) return;

 chopper.rotor.rotation.y += 38 * dt;
 chopper.tailRotor.rotation.x += 38 * dt;

 chopper.angle += 0.25 * dt;
 const leadPos = chassisBody.position;
 chopper.root.position.x = leadPos.x + Math.cos(chopper.angle) * 32;
 chopper.root.position.z = leadPos.z + Math.sin(chopper.angle) * 32;
 chopper.root.position.y = 25 + Math.sin(performance.now() * 0.001) * 2;

 chopper.root.lookAt(leadPos.x, leadPos.y + 2, leadPos.z);
 chopper.spot.target.position.copy(leadPos);
}

/* ==========================================================
   "THE DREADNOUGHT" — DEV BOSS TANKI
   ========================================================== */
function createDreadnoughtMesh() {
 const root = new T.Group();
 const armorMat = new T.MeshStandardMaterial({ color: '#181b20', roughness: 0.6, metalness: 0.85 });
 const darkMat = new T.MeshStandardMaterial({ color: '#0d0e12', roughness: 0.7, metalness: 0.6 });
 const redMat = new T.MeshStandardMaterial({ color: '#c0392b', roughness: 0.4, metalness: 0.4 });

 const chassis = new T.Mesh(new T.BoxGeometry(3.6, 2.2, 10.5), armorMat);
 chassis.position.y = 1.6; chassis.castShadow = true; root.add(chassis);

 const cab = new T.Mesh(new T.BoxGeometry(3.4, 1.6, 3.5), armorMat);
 cab.position.set(0, 2.8, 2.8); cab.rotation.x = -0.15; cab.castShadow = true; root.add(cab);

 const plow = new T.Mesh(new T.ConeGeometry(2.4, 2.5, 4), darkMat);
 plow.rotation.x = Math.PI / 2; plow.rotation.y = Math.PI / 4;
 plow.position.set(0, 1.2, 6.0); plow.castShadow = true; root.add(plow);

 const turretBase = new T.Mesh(new T.CylinderGeometry(1.2, 1.4, 0.6, 16), darkMat);
 turretBase.position.set(0, 3.0, -0.8); root.add(turretBase);

 const turretGuns = new T.Group();
 turretGuns.position.set(0, 3.2, -0.8);
 for (let x of [-0.45, 0.45]) {
  const barrel = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 3.8, 12), gunMatSteel);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(x, 0, 1.9); barrel.castShadow = true;
  turretGuns.add(barrel);
 }
 root.add(turretGuns);

 for (let x of [-1.1, 1.1]) {
  const tank = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 2.2, 12), redMat);
  tank.rotation.z = Math.PI / 2; tank.position.set(x, 2.0, -5.2); tank.castShadow = true;
  root.add(tank);
 }

 const wheelGeo = new T.CylinderGeometry(0.75, 0.75, 0.6, 16);
 wheelGeo.rotateZ(Math.PI / 2);
 const wheelMat = new T.MeshStandardMaterial({ color: '#111', roughness: 0.85 });
 for (let side of [-1.95, 1.95]) {
  for (let z of [3.5, 1.2, -1.2, -3.5]) {
   const w = new T.Mesh(wheelGeo, wheelMat);
   w.position.set(side, 0.75, z); w.castShadow = true; root.add(w);
  }
 }

 const alarmLight = new T.PointLight('#ff0000', 0, 30);
 alarmLight.position.set(0, 4.2, 1.5);
 root.add(alarmLight);

 return { root, turretGuns, alarmLight };
}

const dreadnoughtMeshObj = createDreadnoughtMesh();
scene.add(dreadnoughtMeshObj.root);
dreadnoughtMeshObj.root.visible = false;

const dreadnoughtBody = new CANNON.Body({
 mass: 18000, material: debrisMat, position: new CANNON.Vec3(507.0, 2.2, 360)
});
dreadnoughtBody.addShape(new CANNON.Box(new CANNON.Vec3(1.8, 1.4, 5.5)), new CANNON.Vec3(0, 1.4, 0));
dreadnoughtBody.linearDamping = 0.05;
dreadnoughtBody.angularDamping = 0.8;

const dreadnought = {
 name: 'THE DREADNOUGHT',
 mesh: dreadnoughtMeshObj.root,
 turret: dreadnoughtMeshObj.turretGuns,
 alarm: dreadnoughtMeshObj.alarmLight,
 body: dreadnoughtBody,
 health: 500,
 maxHealth: 500,
 isActive: false,
 isDead: false,
 lastShotTime: 0,
 speed: 62 / 3.6,
 trackStep: 60,
};

dreadnoughtBody.targetData = {
 type: 'boss',
 onHit(dmg, hitPt) {
  if (dreadnought.isDead || !dreadnought.isActive) return;

  const localPt = dreadnoughtBody.pointToLocalFrame(new CANNON.Vec3(hitPt.x, hitPt.y, hitPt.z));
  const isWeakpoint = localPt.z < -4.2;
  const finalDmg = isWeakpoint ? dmg * 3 : dmg;

  dreadnought.health = Math.max(0, dreadnought.health - finalDmg);
  Snd.playImpact();
  spawnSparks(new T.Vector3(hitPt.x, hitPt.y, hitPt.z), new T.Vector3(0, 1, 0), isWeakpoint ? 30 : 12);

  if (isWeakpoint) {
   createExplosion(new T.Vector3(hitPt.x, hitPt.y, hitPt.z), 6, 2500);
   showBanner('KRİTİK VURUŞ! DREADNOUGHT YAKIT DEPOSU VURULDU!', 'buff-sword');
   showRadioMessage('Tam isabet! Yakıt tankına vurdun, oradan devam et!');
   addViewers(200000);
  } else {
   addViewers(Math.round(finalDmg * 1200));
  }

  if (bossHudEl && bossHpTxt && bossFillEl) {
   bossHpTxt.textContent = `${Math.round(dreadnought.health)} / 500 HP`;
   bossFillEl.style.width = `${Math.round((dreadnought.health / dreadnought.maxHealth) * 100)}%`;
  }

  if (dreadnought.health <= 0) {
   dreadnought.isDead = true;
   dreadnought.alarm.intensity = 0;
   createExplosion(dreadnoughtBody.position, 16, 7500);
   setTimeout(() => createExplosion(dreadnoughtBody.position.vadd(new CANNON.Vec3(2, 0, 3)), 14, 6000), 400);
   setTimeout(() => createExplosion(dreadnoughtBody.position.vadd(new CANNON.Vec3(-2, 0, -3)), 15, 6500), 800);

   timeScale = 0.28;
   setTimeout(() => { timeScale = 1.0; }, 1600);

   showBanner('★ THE DREADNOUGHT İMHA EDİLDİ! ★', 'buff-sword');
   showRadioMessage('BAŞARDIK! DREADNOUGHT YIKILDI! HENNESSEY ŞİMDİ GÖRSÜN!');
   addViewers(5000000, '★ DREADNOUGHT İMHA EDİLDİ! ★');
   if (bossHudEl) bossHudEl.className = '';
  }
 }
};

function activateDreadnought() {
 if (dreadnought.isActive) return;
 dreadnought.isActive = true;
 dreadnought.mesh.visible = true;
 world.addBody(dreadnoughtBody);
 dreadnought.alarm.intensity = 5.0;

 if (bossHudEl) bossHudEl.className = 'show';
 showBanner('DİKKAT: THE DREADNOUGHT PİSTE GİRDİ!', 'buff-sword');
 showRadioMessage('DİKKAT FRANKENSTEIN! HENNESSEY DREADNOUGHT\'U SAHAYA SALDI! DAĞILIN!');
 addViewers(3500000, 'DREADNOUGHT SAHADA!');
}

function updateDreadnought(dt) {
 if (!dreadnought.isActive) {
  if (lapCount >= 2 || currentLapTime > 45000) activateDreadnought();
  return;
 }
 if (dreadnought.isDead) {
  dreadnoughtBody.velocity.set(0, 0, 0);
  return;
 }

 const curPos = dreadnoughtBody.position;

 // EMP Felç Durumu Kontrolü (Dreadnought 3 Saniye Donar)
 if (dreadnought.empStunTimer > 0) {
  dreadnought.empStunTimer -= dt;
  dreadnoughtBody.velocity.set(0, dreadnoughtBody.velocity.y, 0);
  if (Math.random() < 0.25) spawnSparks(curPos, new T.Vector3(0, 1, 0), 6);
  return;
 }

 dreadnought.alarm.intensity = (Math.sin(performance.now() * 0.01) > 0) ? 6.0 : 0.5;

 dreadnought.lastTrackIndex = (dreadnought.lastTrackIndex !== undefined) ? dreadnought.lastTrackIndex : 0;
 const trackInfo = getTrackDistance(curPos, dreadnought.lastTrackIndex);
 dreadnought.lastTrackIndex = trackInfo.index;
 const targetIdx = (trackInfo.index + 5) % NUM_TRACK_STEPS;
 const targetPt = TRACK_POINTS[targetIdx];

 const dx = targetPt.x - curPos.x;
 const dz = targetPt.z - curPos.z;
 const targetAngle = Math.atan2(dx, dz);

 dreadnoughtBody.quaternion.setFromEuler(0, targetAngle, 0);
 const fwd = new T.Vector3(0, 0, 1).applyQuaternion(dreadnoughtMeshObj.root.quaternion);
 dreadnoughtBody.velocity.set(fwd.x * dreadnought.speed, dreadnoughtBody.velocity.y, fwd.z * dreadnought.speed);

 const now = performance.now();
 if (now - dreadnought.lastShotTime > 2400) {
  dreadnought.lastShotTime = now;
  const toPlayer = chassisBody.position.vsub(curPos);
  const dist = toPlayer.length();

  if (dist < 75 && fwd.dot(new T.Vector3(toPlayer.x, toPlayer.y, toPlayer.z).normalize()) > 0.4 && carHealth > 0 && aiFireEnabled) {
   Snd.playCannonShot();
   if (dist < 20.0) cameraShake = Math.max(cameraShake, 0.08 * (1.0 - dist / 20.0));

   const muzzlePos = new T.Vector3(0, 3.2, 3.0).applyQuaternion(dreadnoughtMeshObj.root.quaternion).add(dreadnoughtMeshObj.root.position);
   const aimDir = new T.Vector3(toPlayer.x, toPlayer.y + 0.5, toPlayer.z).normalize();

   const cannonBall = acquireBulletMesh(bulletMatCannon);
   cannonBall.scale.set(3, 3, 3);
   cannonBall.position.copy(muzzlePos);

   activeBullets.push({
    mesh: cannonBall, pos: muzzlePos.clone(), vel: aimDir.multiplyScalar(140),
    life: 1.8, isEnemy: true, isHeavyCannon: true
   });
  }
 }

 const distToP = curPos.distanceTo(chassisBody.position);
 if (distToP < 14 && Math.random() < 0.2 && aiFireEnabled) {
  triggerFlameJet(curPos.x + (Math.random() < 0.5 ? -3 : 3), curPos.z);
 }
}

/* ==========================================================
   YAPAY ZEKA (4 ADET RAKİP YARIŞÇI: JOE, GRIMM, 14K, PACHENKO)
   ========================================================== */
const AI_CONFIGS = [
 { id: 'ai0', name: 'M.G. JOE', bodyColor: '#343840', startPos: [-4.2, 0.85, 22], maxSpeed: 130 },
 { id: 'ai1', name: 'GRIMM', bodyColor: '#5e1b17', startPos: [4.2, 0.85, 22], maxSpeed: 135 },
 { id: 'ai2', name: '14K', bodyColor: '#d4ac0d', startPos: [-4.2, 0.85, -22], maxSpeed: 140 },
 { id: 'ai3', name: 'PACHENKO', bodyColor: '#21618c', startPos: [4.2, 0.85, -22], maxSpeed: 125 }
];

const aiOpponents = []; window.aiOpponents = aiOpponents;

function createAIOpponent(cfg) {
 const { chassisBody: cBody, vehicle: veh } = createVehiclePhysics(cfg.startPos, 0);
 const aiGroup = new T.Group(); scene.add(aiGroup);

 const aiWheels = [];
 for (let i = 0; i < 4; i++) {
  const wg = new T.Group(); scene.add(wg); aiWheels.push(wg);
 }

 const lg = createMinigunMesh(); lg.root.position.set(-0.38, 0.46, 0.42); aiGroup.add(lg.root);
 const rg = createMinigunMesh(); rg.root.position.set(0.38, 0.46, 0.42); aiGroup.add(rg.root);

 const ai = {
  id: cfg.id, name: cfg.name, cfg, chassisBody: cBody, vehicle: veh,
  meshGroup: aiGroup, wheelMeshes: aiWheels, carBodyMesh: null,
  leftGun: lg, rightGun: rg, health: 100, isDead: false,
  detachedParts: new Set(), overdriveTimer: 0, shieldTimer: 0,
  lastShotTime: 0, lapCount: 1, trackDist: 0, stuckTimer: 0, steer: 0,
  oilSpinTimer: 0, flatTireTimer: 0
 };

 cBody.targetData = {
  type: 'ai', ai,
  onHit: (dmg, hitPt, hitNorm, source) => { applyAIDamage(ai, dmg, hitPt, hitNorm, source || 'misc'); }
 };

 let lastAIImpact = 0;
 cBody.addEventListener('collide', e => {
  const now = performance.now();
  if (now - lastAIImpact < 140) return;
  const relVel = e.contact.getImpactVelocityAlongNormal();
  if (Math.abs(relVel) < 4.5) return;
  lastAIImpact = now;

  const dmg = Math.min(30, (Math.abs(relVel) - 4.0) * 2.8);
  const cp = e.contact.bi === cBody ? e.contact.ri : e.contact.rj;
  const worldPt = new CANNON.Vec3();
  cBody.pointToWorldFrame(cp, worldPt);
  // Çarpışma kaynağı: oyuncuya çarpma = ram; oyuncu son 2.5 sn'de vurduysa duvara/engele sıkıştırma; yoksa kendi kazası
  const other = e.contact.bi === cBody ? e.contact.bj : e.contact.bi;
  let src = 'crash';
  if (other === chassisBody) { src = 'ram'; ai.lastPlayerHitTime = now; }
  else if (now - (ai.lastPlayerHitTime || -1e9) < 2500) src = 'wall';
  applyAIDamage(ai, dmg, worldPt, new T.Vector3(0, 1, 0), src);
 });

 aiOpponents.push(ai);
 return ai;
}

for (const cfg of AI_CONFIGS) createAIOpponent(cfg);

function detachAIPart(ai, partKey, customImpulse = null, quiet = false) {
 if (ai.detachedParts.has(partKey) || !ai.carBodyMesh) return;
 const mesh = ai.carBodyMesh.getObjectByName(partKey);
 if (!mesh) return;

 ai.detachedParts.add(partKey);
 mesh.visible = false;

 const cfg = MODULAR_PARTS[partKey] || { mass: 30, impulse: new CANNON.Vec3(0, 2, 0) };
 mesh.updateMatrixWorld(true);
 const worldPos = new T.Vector3(); mesh.getWorldPosition(worldPos);
 const worldQuat = new T.Quaternion(); mesh.getWorldQuaternion(worldQuat);

 const debrisMesh = mesh.clone(true);
 debrisMesh.position.copy(worldPos); debrisMesh.quaternion.copy(worldQuat);
 debrisMesh.visible = true; scene.add(debrisMesh);

 const bbox = new T.Box3().setFromObject(debrisMesh);
 const sz = bbox.getSize(new T.Vector3());
 const halfExt = new CANNON.Vec3(Math.max(0.12, sz.x / 2), Math.max(0.08, sz.y / 2), Math.max(0.12, sz.z / 2));

 const debrisBody = new CANNON.Body({
  mass: cfg.mass, material: debrisMat, position: new CANNON.Vec3(worldPos.x, worldPos.y, worldPos.z),
 });
 debrisBody.addShape(new CANNON.Box(halfExt));
 debrisBody.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);

 debrisBody.velocity.copy(ai.chassisBody.velocity);
 const ejectVec = customImpulse || cfg.impulse.clone();
 const ejectWorld = new CANNON.Vec3();
 ai.chassisBody.vectorToWorldFrame(ejectVec, ejectWorld);
 debrisBody.velocity.vadd(ejectWorld, debrisBody.velocity);

 debrisBody.angularVelocity.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 12);
 debrisBody.linearDamping = 0.08; debrisBody.angularDamping = 0.2;
 world.addBody(debrisBody);

 debrisList.push({ mesh: debrisMesh, body: debrisBody, life: 16 });
 spawnSparks(worldPos, new T.Vector3(0, 1, 0), 20);
 Snd.playMetalSnap();
 if (!quiet) addViewers(150000, `${ai.name}'İN ${cfg.name.toUpperCase()} KOPTU!`);
}


/* ==========================================================
   BURNOUT-TARZI TAKEDOWN & PIP KÖŞE KAMERASI & RAKİP SESLERİ
   ========================================================== */
let takedownVictimAI = null;
let takedownPipActive = false;
let takedownPipTimer = 0;
let lastRivalTauntTime = 0;

// PiP artık ikinci bir WebGLRenderer (= ikinci WebGL context) kullanmıyor. Ayrı context, ilk takedown
// anında sahnedeki TÜM geometri/doku/shader'ları o context için yeniden yükleyip derliyordu (saniyelerce donma).
// Bunun yerine ana renderer, #pip-canvas'ın ekrandaki dikdörtgenine scissor/viewport ile ikinci bir geçiş çizer.
const pipCamera = new T.PerspectiveCamera(46, 280 / 158, 0.5, 450);
const pipCanvasEl = document.getElementById('pip-canvas');
let pipRect = null; // CSS piksel cinsinden; ilk PiP karesinde bir kez okunur, resize'da sıfırlanır
addEventListener('resize', () => { pipRect = null; });

function triggerRivalTaunt(ai, eventType = 'attack') {
 const now = performance.now();
 if (now - lastRivalTauntTime < 16000) return;
 lastRivalTauntTime = now;

 const taunts = {
  ai0: [
   "O maskenin altındaki yüzü parçalayacağım Frankenstein!",
   "Arkana bak Frankenstein! Joe ensende!",
   "Bu adadan tek bir şampiyon çıkacak, o da benim!"
  ],
  ai1: [
   "Cehennem ateşi seni bekliyor Frankenstein!",
   "Grimm seni mezara gömmeye geliyor!",
   "Zırhını un ufak edeceğim!"
  ],
  ai2: [
   "Hennessey kellen için milyonlar koydu Frankenstein!",
   "Altın mermilerim zırhını delecek!",
   "Kaçamazsın Frankenstein!"
  ],
  ai3: [
   "Seni ezip geçeceğim Amerikan hurdası!",
   "Asfalta yapışacaksın!",
   "Hahaha! Minigunlarım hazır!"
  ]
 };

 const lines = taunts[ai.id] || ["Görüşürüz Frankenstein!"];
 const line = lines[Math.floor(Math.random() * lines.length)];
 showRadioMessage(`${ai.name}: ${line}`, ai.name);
}
window.triggerRivalTaunt = triggerRivalTaunt;

function triggerTakedown(victimAI, td = TAKEDOWN_TYPES.ram) {
 // ANA KAMERA ASLA OYUNCUDAN AYRILMAZ! Oyuncu tam kontrolde ve tam hızda kalır.
 takedownVictimAI = victimAI;
 takedownPipActive = true;
 takedownPipTimer = 2.6; // 2.6 saniye boyunca köşe PiP ekranda canlı yayın olarak gösterilir

 const pipContainer = document.getElementById('takedown-pip-container');
 const pipTitle = document.getElementById('pip-victim-title');
 if (pipContainer) pipContainer.classList.add('active');
 if (pipTitle) pipTitle.textContent = `${td.name}: ${victimAI.name.toUpperCase()}`;

 // Rakip araca sinematik takla ve fırlama darbesi uygula
 victimAI.chassisBody.velocity.y += 6.8;
 victimAI.chassisBody.velocity.x += (Math.random() - 0.5) * 5.0;
 victimAI.chassisBody.angularVelocity.set(
  (Math.random() < 0.5 ? 4.8 : -4.8),
  (Math.random() - 0.5) * 3.5,
  (Math.random() < 0.5 ? 4.2 : -4.2)
 );

 nitroAmount = 100;
 Snd.playTakedownSting();
 const tdReward = Math.round(65000 * td.mul);
 addViewers(Math.round(2000000 * td.mul));
 playerCredits += tdReward;
 const pipPts = document.querySelector('#takedown-pip-container .pip-pts');
 if (pipPts) pipPts.textContent = `+${fmtTR(tdReward)} PTS`;
 if (currencyValEl) currencyValEl.textContent = fmtTR(playerCredits);
 showBanner(`☠ ${td.name}! ${victimAI.name} PARÇALANDI! (x${td.mul})`, 'buff-sword');

 const lastWords = {
  ai0: "Hennessey beni aldattı... lanet olsun!",
  ai1: "Mezarıma senin adını yazacağım Frankenstein...",
  ai2: "Arabam! Paramparça oldu!",
  ai3: "Kahretsin! Motor patladı!"
 };
 const victimWords = lastWords[victimAI.id] || "Arabam havaya uçtu!";
 showRadioMessage(`${victimAI.name}: ${victimWords}`, victimAI.name);

 if (victimAI.isNemesis) {
  victimAI.isNemesis = false;
  if (nemesisHudEl) nemesisHudEl.style.display = 'none';
  showBanner('NEMESIS İNTİKAMI ALINDI!', 'buff-shield');
 }
}

/* ---------- Takedown çeşitleri ----------
   Rakibin ölüm anındaki hasar kaynağına göre takedown adı ve ödül çarpanı belirlenir.
   Kendi kazası, başka rakibin ateşi ve eleme sayacı artık oyuncuya takedown olarak yazılmaz. */
const TAKEDOWN_TYPES = {
 ram: { name: 'ÇARPIŞMA TAKEDOWN', mul: 1.0 },
 wall: { name: 'DUVARA SIKIŞTIRMA', mul: 1.5 },
 flip: { name: 'TAKLA TAKEDOWN', mul: 1.4 },
 gun: { name: 'MİNİGUN İNFAZI', mul: 0.8 },
 rocket: { name: 'ROKET İSABETİ', mul: 1.0 },
 mine: { name: 'MAYIN TUZAĞI', mul: 1.3 },
 oil: { name: 'YAĞ KAYDIRMASI', mul: 1.6 },
 fire: { name: 'ALEVLER İÇİNDE', mul: 1.2 },
 trap: { name: 'TUZAK TAKEDOWN', mul: 1.5 },
 crusher: { name: 'PRES EZMESİ', mul: 2.0 },
 airstrike: { name: 'HAVA SALDIRISI', mul: 0.8 },
 blades: { name: 'JANT BIÇAĞI', mul: 1.5 }
};
const NON_PLAYER_DEATHS = { crash: 'KAZA YAPTI', ai: 'RAKİP ATEŞİYLE DÜŞTÜ', elimination: 'ELENDİ', misc: 'İMHA OLDU' };
const _aiUp = new T.Vector3();
function resolveTakedownType(ai, source) {
 _aiUp.set(0, 1, 0).applyQuaternion(ai.meshGroup.quaternion);
 const flipped = _aiUp.y < 0.3;
 const playerRecent = performance.now() - (ai.lastPlayerHitTime || -1e9) < 3000;
 if (source === 'elimination' || source === 'ai') return source;
 if (ai.oilSpinTimer > 0 && ai.oilByPlayer && (source === 'crash' || source === 'misc' || source === 'wall')) return 'oil';
 if (source === 'crash' || source === 'misc') return playerRecent ? (flipped ? 'flip' : 'wall') : 'crash';
 if ((source === 'ram' || source === 'wall') && flipped) return 'flip';
 return source;
}

function applyAIDamage(ai, dmg, hitPt = null, hitNorm = null, source = 'misc') {
 if (ai.isDead) return;
 if (TAKEDOWN_TYPES[source]) ai.lastPlayerHitTime = performance.now();

 if (ai.shieldTimer > 0) {
  if (hitPt) spawnSparks(new T.Vector3(hitPt.x, hitPt.y, hitPt.z), new T.Vector3(0, 1, 0), 12);
  Snd.playImpact();
  return;
 }

 dmg *= 1 + (ai.detachedParts.has('part_armor_l') ? 0.15 : 0) + (ai.detachedParts.has('part_armor_r') ? 0.15 : 0) + (ai.detachedParts.has('part_roof') ? 0.1 : 0);
 ai.health = Math.max(0, ai.health - dmg);
 if (!ai.isNemesis && ai.health > 0 && Math.random() < 0.7) {
  ai.isNemesis = true;
  if (nemesisHudEl && nemesisTextEl) {
   nemesisHudEl.style.display = 'block';
   nemesisTextEl.textContent = '⚠️ NEMESIS KİLİTLENDİ: ' + ai.name + ' İNTİKAM ARIYOR!';
  }
  showRadioMessage(ai.name + ': Frankenstein! Peşini bırakmayacağım, bu pist mezarın olacak!', 'hennessey');
 }

 Snd.playCrash(dmg / 35);
 const byPlayer = !!TAKEDOWN_TYPES[source];
 // İzleyici/puan yalnızca oyuncunun verdiği hasar için (kaza, rakip ateşi ve eleme puan getirmez)
 if (byPlayer) addViewers(Math.round(Math.min(dmg, 100) * 800));

 if (hitPt) {
  const norm = hitNorm || new T.Vector3(0, 1, 0);
  spawnSparks(new T.Vector3(hitPt.x, hitPt.y, hitPt.z), norm, 12);
 }

 if (ai.health <= 80) detachAIPart(ai, 'part_spikes', null, !byPlayer);
 if (ai.health <= 60) detachAIPart(ai, 'part_armor_l', null, !byPlayer);
 if (ai.health <= 40) detachAIPart(ai, 'part_armor_r', null, !byPlayer);
 if (ai.health <= 25) detachAIPart(ai, 'part_roof', null, !byPlayer);

 if (ai.health <= 0) {
  ai.isDead = true;
  const tdType = resolveTakedownType(ai, source);
  const td = TAKEDOWN_TYPES[tdType];
  ai.deathType = tdType;
   detachAIPart(ai, 'part_tombstone', null, true);
  if (!td) {
   // Oyuncunun payı olmayan ölüm: takedown ödülü / kombo / kelle avı yok
   createExplosion(ai.chassisBody.position, 12, 4500);
   for (let key of Object.keys(MODULAR_PARTS)) detachAIPart(ai, key, null, true);
   for (let i = 0; i < 4; i++) { ai.vehicle.applyEngineForce(0, i); ai.vehicle.setBrake(60, i); }
   showBanner(`${ai.name} ${NON_PLAYER_DEATHS[tdType] || 'İMHA OLDU'}!`, 'buff-sword');
   return;
  }
  raceStats.takedownTypes = raceStats.takedownTypes || {};
  raceStats.takedownTypes[tdType] = (raceStats.takedownTypes[tdType] || 0) + 1;
   triggerTakedown(ai, td);
   registerKillCombo();
   if (bountyTargetAI && bountyTargetAI.id === ai.id) {
    bountyTargetAI = null;
    if (bountyHudEl) bountyHudEl.style.display = 'none';
    playerCredits += 100000;
    overdriveTimer = 12.0;
    showBanner('🎯 KELLE AVI TAMAMLANDI! +100.000 PTS & OVERDRIVE!', 'buff-sword');
    showRadioMessage('Kelle avı ödülünü kaptık Frankenstein! 100.000 Puan hesapta!', 'case');
   }
  createExplosion(ai.chassisBody.position, 12, 4500);
  for (let key of Object.keys(MODULAR_PARTS)) detachAIPart(ai, key, null, true);

  for (let i = 0; i < 4; i++) {
   ai.vehicle.applyEngineForce(0, i);
   ai.vehicle.setBrake(60, i);
  }

  timeScale = 0.32;
  setTimeout(() => { timeScale = 1.0; }, 1200);

  addViewers(1500000);
  showRadioMessage(`${td.name}! ${ai.name} yarış dışı kaldı!`);
 }
}

function applyAmmoEffect(ai) {
 if (!ai || ai.isDead) return;
 const ammo = customization.ammoType;
 if (ammo === 'incendiary') ai.burnTimer = 3.0;
 else if (ammo === 'acid') ai.acidTimer = 3.0;
}

function shootAIBullet(ai) {
 if (ai.isDead || !aiFireEnabled || currentStage < 2 || !(ai.gunAmmo > 0)) return;
 const now = performance.now();
 const cooldown = (ai.overdriveTimer > 0 ? 70 : 130) * diffCfg().fireMul * (raceSetting('aiAggression') === 'brutal' ? 0.8 : 1);
 if (now - ai.lastShotTime < cooldown) return;
 ai.lastShotTime = now;
 ai.gunAmmo--;

 const muzzlePos = new T.Vector3(0, 0, 0.55);
 ai.leftGun.root.localToWorld(muzzlePos);

 const fwd = new T.Vector3(0, 0, 1).applyQuaternion(ai.meshGroup.quaternion);
 fwd.x += (Math.random() - 0.5) * 0.05; fwd.y += (Math.random() - 0.5) * 0.03; fwd.z += (Math.random() - 0.5) * 0.05;
 fwd.normalize();

 const bMesh = acquireBulletMesh(bulletMatEnemy);
 bMesh.position.copy(muzzlePos); bMesh.quaternion.copy(ai.meshGroup.quaternion);

 activeBullets.push({
  mesh: bMesh, pos: muzzlePos.clone(), vel: fwd.clone().multiplyScalar(220),
  life: 1.3, isEnemy: true, ownerAI: ai
 });

 ai.leftGun.flash.visible = true;
 setTimeout(() => { if (ai.leftGun) ai.leftGun.flash.visible = false; }, 40);
 Snd.playGunshot(true);
}

const _upNormalAI = new T.Vector3(0, 1, 0);
function updateAIOpponents(dt) {
 const playerPos = chassisBody.position;

 for (let ai of aiOpponents) {
  if (ai.isDead || raceCountdown > 0 || !isGameStarted) { // yarış başlamadan (ör. menüden garaja girildiğinde) rakipler bekler
   for (let i = 0; i < 4; i++) { ai.vehicle.applyEngineForce(0, i); ai.vehicle.setBrake(ai.isDead ? 50 : 80, i); }
   continue;
  }

  const aiPos = ai.chassisBody.position;
  const speed = ai.chassisBody.velocity.length();

  // EMP Felç Durumu Kontrolü (Motor ve Silahlar Donar)
  if (ai.empStunTimer > 0) {
   ai.empStunTimer -= dt;
   for (let i = 0; i < 4; i++) {
    ai.vehicle.applyEngineForce(0, i);
    ai.vehicle.setBrake(85, i);
   }
   if (Math.random() < 0.25) spawnSparks(aiPos, new T.Vector3(0, 1, 0), 4);
   continue;
  }

  for (let oil of activeOilSlicks) {
   if (oil.owner === ai) continue; // kendi döktüğü yağda savrulmasın
   const dx = aiPos.x - oil.pos.x;
   const dz = aiPos.z - oil.pos.z;
   if (Math.sqrt(dx * dx + dz * dz) < oil.radius && ai.oilSpinTimer <= 0) {
    ai.oilSpinTimer = 2.5;
    ai.oilByPlayer = !oil.owner;
    ai.chassisBody.angularVelocity.y += (Math.random() < 0.5 ? 6 : -6);
    showBanner(`${ai.name} MOTOR YAĞINA BASTI VE SAVRULUYOR!`, 'buff-sword');
    addViewers(45000);
   }
  }

  for (let cal of activeCaltrops) {
   const dx = aiPos.x - cal.pos.x;
   const dz = aiPos.z - cal.pos.z;
   if (Math.sqrt(dx * dx + dz * dz) < cal.radius && ai.flatTireTimer <= 0) {
    ai.flatTireTimer = 4.0;
    spawnSparks(aiPos, new T.Vector3(0, 1, 0), 20);
    showBanner(`${ai.name}'İN LASTİĞİ PATLADI!`, 'buff-sword');
    addViewers(50000);
   }
  }

  if (ai.oilSpinTimer > 0) {
   ai.oilSpinTimer -= dt;
   for (let i = 0; i < 4; i++) ai.vehicle.wheelInfos[i].frictionSlip = 0.15;
   continue;
  } else {
   for (let i = 0; i < 4; i++) ai.vehicle.wheelInfos[i].frictionSlip = 2.6 * weatherGrip();
  }

  if (ai.flatTireTimer > 0) {
   ai.flatTireTimer -= dt;
   if (Math.random() < 0.3) spawnSparks(aiPos, new T.Vector3(0, 1, 0), 6);
  }

  // Mühimmat etkileri: alevli mermi yanma hasarı, asit yavaşlatması
  if (ai.burnTimer > 0) {
   ai.burnTimer -= dt;
   ai.burnTick = (ai.burnTick || 0) + dt;
   if (ai.burnTick >= 0.5) { ai.burnTick = 0; applyAIDamage(ai, 3, null, null, 'fire'); }
   if (Math.random() < 0.35) spawnSparks(aiPos, _upNormalAI, 3);
   if (ai.isDead) continue;
  }
  if (ai.acidTimer > 0) ai.acidTimer -= dt;

  ai.lastTrackIndex = (ai.lastTrackIndex !== undefined) ? ai.lastTrackIndex : 0;
  const trackInfo = getTrackDistance(aiPos, ai.lastTrackIndex);
  ai.lastTrackIndex = trackInfo.index;
  ai.trackDist = trackInfo.distance;
  const targetStepOffset = 18;
  const targetIdx = (trackInfo.index + targetStepOffset) % NUM_TRACK_STEPS;
  const targetPt = TRACK_POINTS[targetIdx];

  const dx = targetPt.x - aiPos.x;
  const dz = targetPt.z - aiPos.z;
  const targetAngle = Math.atan2(dx, dz);

  const fwd = new T.Vector3(0, 0, 1).applyQuaternion(ai.meshGroup.quaternion);
  const curAngle = Math.atan2(fwd.x, fwd.z);

  let angleDiff = targetAngle - curAngle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  ai.steer = Math.max(-1, Math.min(1, angleDiff * 2.0));

  // Mermisi azalan rakip yakındaki aktif kılıç/kalkan plakasına yönelir (filmdeki gibi)
  if (currentStage >= 2 && aiFireEnabled && ((ai.gunAmmo || 0) < 40 || !(ai.defense > 0))) {
   for (const p of activationPlates) {
    if (p.cooldown > 0 || p.type === 'skull') continue;
    const pdx = p.x - aiPos.x, pdz = p.z - aiPos.z;
    const pd = Math.sqrt(pdx * pdx + pdz * pdz);
    if (pd > 80 || pd < 2) continue;
    if ((fwd.x * pdx + fwd.z * pdz) / pd < 0.75) continue;
    let pDiff = Math.atan2(pdx, pdz) - curAngle;
    while (pDiff > Math.PI) pDiff -= Math.PI * 2;
    while (pDiff < -Math.PI) pDiff += Math.PI * 2;
    ai.steer = Math.max(-1, Math.min(1, ai.steer * 0.4 + pDiff * 1.2));
    break;
   }
  }

  // Nemesis AI: Oyuncuya Kilitlenip Doğrudan Çarpışma Rotasına Girer
  // "Vahşi Katliam" saldırganlığında tüm rakipler yakındaki oyuncuya çarpmaya çalışır
  if (ai.isNemesis || raceSetting('aiAggression') === 'brutal') {
   const toPlayer = playerPos.vsub(aiPos);
   const distToP = toPlayer.length();
   if (distToP < 45.0 && distToP > 3.0) {
    const pAngle = Math.atan2(toPlayer.x, toPlayer.z);
    let pDiff = pAngle - curAngle;
    while (pDiff > Math.PI) pDiff -= Math.PI * 2;
    while (pDiff < -Math.PI) pDiff += Math.PI * 2;
    ai.steer = Math.max(-1, Math.min(1, ai.steer * 0.35 + pDiff * 0.65));
   }
  }

  ai.vehicle.setSteeringValue(ai.steer * MAX_STEER, 0);
  ai.vehicle.setSteeringValue(ai.steer * MAX_STEER, 1);

  const isSharpTurn = Math.abs(angleDiff) > 0.45;
  let targetSpeedMs = isSharpTurn ? (ai.cfg.maxSpeed * 0.55) / 3.6 : (ai.cfg.maxSpeed) / 3.6;
  if (ai.isNemesis) targetSpeedMs *= 1.15; // Nemesis daha hızlı takip eder!
  if (ai.flatTireTimer > 0) targetSpeedMs *= 0.6;
  if (ai.acidTimer > 0) targetSpeedMs *= 0.65;
  targetSpeedMs *= diffCfg().speed * healthSpeedFactor(ai.health, 100) * (weatherMode === 1 ? 0.94 : 1);

  if (speed < targetSpeedMs) {
   const forcePct = Math.max(0, 1 - speed / targetSpeedMs);
   const force = MAX_FORCE * 0.72 * forcePct;
   ai.vehicle.applyEngineForce(-force, 2);
   ai.vehicle.applyEngineForce(-force, 3);
   for (let i = 0; i < 4; i++) ai.vehicle.setBrake(0, i);
  } else {
   ai.vehicle.applyEngineForce(0, 2);
   ai.vehicle.applyEngineForce(0, 3);
   for (let i = 0; i < 4; i++) ai.vehicle.setBrake(isSharpTurn ? 35 : 10, i);
  }

  const up = new T.Vector3(0, 1, 0).applyQuaternion(ai.meshGroup.quaternion);
  if (speed < 0.6 || up.y < 0.25) {
   ai.stuckTimer += dt;
   if (ai.stuckTimer > 2.2) {
    ai.chassisBody.position.set(targetPt.x, 1.6, targetPt.z);
    ai.chassisBody.quaternion.set(0, 0, 0, 1);
    ai.chassisBody.velocity.set(0, 0, 0);
    ai.chassisBody.angularVelocity.set(0, 0, 0);
    ai.stuckTimer = 0;
   }
  } else {
   ai.stuckTimer = Math.max(0, ai.stuckTimer - dt * 2);
  }

  const distToPlayer = aiPos.distanceTo(playerPos);
  const toPlayer = new T.Vector3(playerPos.x - aiPos.x, playerPos.y - aiPos.y, playerPos.z - aiPos.z).normalize();
  const aimDot = fwd.dot(toPlayer);

  const dc = diffCfg();
  if (distToPlayer < dc.range && aimDot > dc.aimDot && carHealth > 0 && aiFireEnabled && !raceFinished) {
   shootAIBullet(ai);
   ai.leftGun.barrelGroup.rotation.z += 40 * dt;
   ai.rightGun.barrelGroup.rotation.z += 40 * dt;
  }

  updateAIWeapons(ai, dt, distToPlayer, aimDot, fwd);

  if (ai.overdriveTimer > 0) ai.overdriveTimer -= dt;
  if (ai.shieldTimer > 0) ai.shieldTimer -= dt;
 }
 updatePlayerHazards(dt);
}

/* ---------- Rakip özel silahları (mayın, yağ, güdümlü roket) ---------- */
const AI_WEAPON_COOLDOWN = { easy: 24, normal: 15, hard: 9 };
const PLAYER_TARGET = { name: 'FRANKENSTEIN', get chassisBody() { return chassisBody; }, get isDead() { return carHealth <= 0; } };
const _aiToPlayer = new T.Vector3();

function updateAIWeapons(ai, dt, distToPlayer, aimDot, fwd) {
 if (!aiFireEnabled || raceFinished || carHealth <= 0 || ai.empStunTimer > 0 || currentStage < 2) return;
 if (ai.weaponTimer === undefined) ai.weaponTimer = 6 + Math.random() * 8;
 ai.weaponTimer -= dt;
 if (ai.weaponTimer > 0) return;

 const diff = raceSetting('difficulty');
 const cooldown = (AI_WEAPON_COOLDOWN[diff] || 15) * (raceSetting('aiAggression') === 'brutal' ? 0.75 : 1);
 const pPos = chassisBody.position, aPos = ai.chassisBody.position;
 _aiToPlayer.set(pPos.x - aPos.x, 0, pPos.z - aPos.z).normalize();
 const behind = fwd.x * _aiToPlayer.x + fwd.z * _aiToPlayer.z < -0.5;

 if (behind && distToPlayer < 35 && ai.defense > 0) {
  ai.defense--;
  const rear = new T.Vector3(0, 0.15, -2.6).applyQuaternion(ai.meshGroup.quaternion).add(ai.meshGroup.position);
  if (Math.random() < 0.5) {
   spawnMine(rear, ai);
   Snd.playMineBeep();
   showBanner(`💣 ${ai.name} ARKASINA MAYIN BIRAKTI!`, 'buff-sword');
  } else {
   spawnOilSlick(rear, ai);
   Snd.playHiss();
   showBanner(`🛢️ ${ai.name} YOLA YAĞ DÖKTÜ!`, 'buff-sword');
  }
  ai.weaponTimer = cooldown * (0.8 + Math.random() * 0.4);
 } else if (diff !== 'easy' && ai.rockets > 0 && aimDot > 0.85 && distToPlayer > 20 && distToPlayer < 90) {
  ai.rockets--;
  fireAIRocket(ai, fwd);
  ai.weaponTimer = cooldown * (0.8 + Math.random() * 0.4);
 } else {
  ai.weaponTimer = 1.0; // uygun pozisyon yok, kısa süre sonra tekrar dene
 }
}

function fireAIRocket(ai, fwd) {
 const spawnPos = new T.Vector3(0, 1.0, 1.4).applyQuaternion(ai.meshGroup.quaternion).add(ai.meshGroup.position);
 const rMesh = new T.Mesh(rocketGeo, rocketMat);
 rMesh.position.copy(spawnPos);
 rMesh.quaternion.copy(ai.meshGroup.quaternion);
 scene.add(rMesh);
 activeRockets.push({
  mesh: rMesh, pos: spawnPos.clone(), vel: new T.Vector3(fwd.x, fwd.y, fwd.z).multiplyScalar(70),
  target: PLAYER_TARGET, life: 3.2, ownerBody: ai.chassisBody, homing: 1.6, speed: 78, fromAI: ai
 });
 Snd.playRocketLaunch();
 showBanner(`🚀 ${ai.name} SANA ROKET KİLİTLEDİ! KAÇ!`, 'buff-sword');
 rumble(0.3, 150);
}

// Rakiplerin döktüğü yağ oyuncuyu da kaydırır (önceden oyuncu için yağ kayması hiç tanımlı değildi)
function updatePlayerHazards(dt) {
 if (playerOilTimer > 0) return;
 const pPos = chassisBody.position;
 for (const oil of activeOilSlicks) {
  if (!oil.owner) continue;
  const dx = pPos.x - oil.pos.x, dz = pPos.z - oil.pos.z;
  if (dx * dx + dz * dz < oil.radius * oil.radius) {
   playerOilTimer = 1.8;
   chassisBody.angularVelocity.y += (Math.random() < 0.5 ? 3.5 : -3.5);
   showBanner('🛢️ YAĞA BASTIN! SAVRULUYORSUN!', 'buff-sword');
   rumble(0.6, 300);
   break;
  }
 }
}

/* ---------- 3D Model Bağlama ---------- */
loadGLTFModel('car_body').then(model => {
 model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
 model.position.set(0, BODY_Y_OFFSET, 0);
 carBodyMesh = model;
 carGroup.add(model);

 for (let ai of aiOpponents) {
  const aiModel = model.clone(true);
  // Rakip boyası: yalnızca boya malzemeleri kopyalanır (oyuncunun boyası rakiplere bulaşmasın)
  aiModel.traverse(o => {
   if (o.isMesh && o.material && (o.material.name === PAINT_MAT || o.material.name === PAINT_MAT_DARK)) {
    o.material = o.material.clone();
   }
  });
  paintCarBody(aiModel, ai.cfg.bodyColor);
  aiModel.position.set(0, BODY_Y_OFFSET, 0);
  ai.carBodyMesh = aiModel;
  ai.meshGroup.add(aiModel);
 }
 // Hayalet araç: gövdenin yarı saydam kopyası
 const ghostBody = model.clone(true);
 ghostBody.traverse(o => { if (o.isMesh) { o.material = ghostMat; o.castShadow = false; o.receiveShadow = false; } });
 ghostBody.position.set(0, BODY_Y_OFFSET, 0);
 ghostMesh = new T.Group();
 ghostMesh.add(ghostBody);
 ghostMesh.visible = false;
 scene.add(ghostMesh);
 // Kayıttan gelen boya model yüklenince uygulanır (model asenkron yüklendiği için)
 if (currentSkin !== 'classic_black') {
  silentRestore = true;
  try { applyCarSkin(currentSkin); } finally { silentRestore = false; }
 }
 if (renderer && scene && camera) {
  try { renderer.compileAsync(scene, camera); } catch (e) {}
 }
}).catch(() => {
 const bodyMat = new T.MeshStandardMaterial({ color: '#c0392b', roughness: 0.4, metalness: 0.3 });
 const chassisMesh = new T.Mesh(new T.BoxGeometry(chassisSize.x * 2, chassisSize.y * 2, chassisSize.z * 2), bodyMat);
 chassisMesh.position.y = 0.3; carGroup.add(chassisMesh);
});

loadGLTFModel('wheel').then(wheelModel => {
 wheelModel.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
 // Görsel tekerlek, fizik tekerleğinin yarıçapına ölçeklenir (model farklı boyutta gelse bile yere gömülmez/havada durmaz)
 const wheelBox = new T.Box3().setFromObject(wheelModel);
 const modelRadius = (wheelBox.max.y - wheelBox.min.y) / 2;
 if (modelRadius > 0.01) wheelModel.scale.setScalar(wheelOptions.radius / modelRadius);
 for (let i = 0; i < 4; i++) wheelMeshes[i].add(wheelModel.clone(true));
 for (let ai of aiOpponents) {
  for (let i = 0; i < 4; i++) ai.wheelMeshes[i].add(wheelModel.clone(true));
 }
}).catch(() => {
 const wheelGeo = new T.CylinderGeometry(wheelOptions.radius, wheelOptions.radius, 0.3, 20);
 wheelGeo.rotateZ(Math.PI / 2);
 const wheelMeshMat = new T.MeshStandardMaterial({ color: '#111', roughness: 0.8 });
 for (let i = 0; i < 4; i++) wheelMeshes[i].add(new T.Mesh(wheelGeo, wheelMeshMat));
 for (let ai of aiOpponents) {
  for (let i = 0; i < 4; i++) ai.wheelMeshes[i].add(new T.Mesh(wheelGeo, wheelMeshMat));
 }
});

/* ==========================================================
   HEDEFLER, PATLAYICI VARİLLER & RAMPA KÖPRÜSÜ
   ========================================================== */
const targets = [];
const barrelMat = new T.MeshStandardMaterial({ color: '#c0291d', roughness: 0.4, metalness: 0.3 });
const crateMat = new T.MeshStandardMaterial({ color: '#6d4c33', roughness: 0.85, metalness: 0.1 });
const obstacleMat = new T.MeshStandardMaterial({ color: '#4d535e', roughness: 0.6, metalness: 0.2 });

function addBarrel(pos) {
 const radius = 0.42, height = 1.1, mass = 30;
 const body = new CANNON.Body({ mass, material: groundMat });
 body.addShape(new CANNON.Cylinder(radius, radius, height, 12));
 body.position.set(pos[0], pos[1] + height / 2, pos[2]);
 body.linearDamping = 0.05;
 world.addBody(body);

 const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, height, 14), barrelMat);
 mesh.castShadow = mesh.receiveShadow = true;
 scene.add(mesh);

 const target = {
  body, mesh, hp: 40, isBarrel: true, isDead: false,
  onHit(dmg) {
   if (this.isDead) return;
   this.hp -= dmg;
   Snd.playImpact();
   if (this.hp <= 0) {
    this.isDead = true;
    createExplosion(body.position, 8.5, 3200);
    addViewers(45000, 'VARİL PATLATILDI!');
    world.removeBody(body);
    scene.remove(mesh);
   }
  }
 };
 body.targetData = target; targets.push(target); return target;
}

function addCrate(size, pos, mass = 70) {
 const body = new CANNON.Body({ mass, material: groundMat });
 body.addShape(new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2)));
 body.position.set(pos[0], pos[1], pos[2]);
 body.linearDamping = 0.04;
 world.addBody(body);

 const mesh = new T.Mesh(new T.BoxGeometry(...size), crateMat);
 mesh.castShadow = mesh.receiveShadow = true;
 scene.add(mesh);

 const target = {
  body, mesh, hp: 70, isBarrel: false, isDead: false,
  onHit(dmg) {
   if (this.isDead) return;
   this.hp -= dmg;
   Snd.playImpact();
   if (this.hp <= 0) {
    this.isDead = true;
    spawnSparks(body.position, new T.Vector3(0, 1, 0), 18);
    createExplosion(body.position, 5, 4000);
    addViewers(20000, 'BARİKAT YIKILDI!');
    world.removeBody(body);
    scene.remove(mesh);
   }
  }
 };
 body.targetData = target; targets.push(target); return target;
}


/* ==========================================================
   FİZİKSEL TÜMSEKLER & ATLAMA RAMPALARI (REAL CANNON-ES BODIES)
   ========================================================== */
const activeTrackRamps = [];

function createPhysicalRamp(width, length, height, pos, rotY = 0, name = 'ramp') {
 const angle = Math.atan2(height, length);
 const rampBody = new CANNON.Body({ mass: 0, material: groundMat });
 
 // Cannon Box half extents
 const halfExtents = new CANNON.Vec3(width / 2, 0.45, length / 2);
 rampBody.addShape(new CANNON.Box(halfExtents));
 
 // Position: center Y calculated so entrance edge is exactly flush with asphalt at Y = pos[1]
 const centerY = pos[1] + (length / 2) * Math.sin(angle) - 0.45 * Math.cos(angle);
 rampBody.position.set(pos[0], centerY, pos[2]);

 const qPitch = new CANNON.Quaternion();
 qPitch.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -angle);
 const qYaw = new CANNON.Quaternion();
 qYaw.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotY);
 rampBody.quaternion = qYaw.mult(qPitch);
 world.addBody(rampBody);

 // Visual Three.js Group
 const rampGroup = new T.Group();
 rampGroup.position.copy(rampBody.position);
 rampGroup.quaternion.copy(rampBody.quaternion);

 // Deck surface
 const deckMat = new T.MeshStandardMaterial({ color: '#e67e22', roughness: 0.35, metalness: 0.85 });
 const deckGeo = new T.BoxGeometry(width, 0.9, length);
 const deck = new T.Mesh(deckGeo, deckMat);
 deck.castShadow = deck.receiveShadow = true;
 rampGroup.add(deck);

 // Side hazard rails (Sarı / Siyah Reflektörlü Korkuluklar)
 const railMat = new T.MeshStandardMaterial({ color: '#1a1c22', roughness: 0.5, metalness: 0.8 });
 const railL = new T.Mesh(new T.BoxGeometry(0.7, 1.8, length), railMat);
 railL.position.set(-width / 2 + 0.35, 0.65, 0); rampGroup.add(railL);
 const railR = new T.Mesh(new T.BoxGeometry(0.7, 1.8, length), railMat);
 railR.position.set(width / 2 - 0.35, 0.65, 0); rampGroup.add(railR);

 // Işıklı Sarı Oklar (Chevron Glow Arrows)
 for (let k = -length / 2 + 3.5; k < length / 2 - 2; k += 4.5) {
  const arrow = new T.Mesh(new T.PlaneGeometry(width * 0.38, 1.4), new T.MeshBasicMaterial({ color: '#ffcc00' }));
  arrow.rotation.x = -Math.PI / 2;
  arrow.position.set(0, 0.46, k);
  rampGroup.add(arrow);
 }

 // Gece / Sis için Ramp Işığı
 const rLight = new T.PointLight('#ff9900', 2.5, 25);
 rLight.position.set(0, 2.0, 0);
 rampGroup.add(rLight);

 scene.add(rampGroup);
 rampGroup.userData.staticBatch = true;
 activeTrackRamps.push({ body: rampBody, group: rampGroup, name, pos });
 return { body: rampBody, group: rampGroup };
}

/* ==========================================================
   FİZİKSEL HIZ TÜMSEKLERİ (GENUINE SPEED BUMPS)
   ========================================================== */
const activeSpeedBumps = []; window.activeSpeedBumps = activeSpeedBumps;
function createSpeedBump(width, length, height, pos, rotY = 0, name = 'bump') {
 const bumpBody = new CANNON.Body({ mass: 0, material: groundMat });
 bumpBody.addShape(new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, length / 2)));
 bumpBody.position.set(pos[0], pos[1] + height / 2, pos[2]);
 if (rotY) bumpBody.quaternion.setFromEuler(0, rotY, 0);
 world.addBody(bumpBody);

 const bumpGroup = new T.Group();
 bumpGroup.position.copy(bumpBody.position);
 bumpGroup.quaternion.copy(bumpBody.quaternion);

 // Sarı-Siyah Çizgili Hız Tümseği
 const bumpMat = new T.MeshStandardMaterial({ color: '#f39c12', roughness: 0.6, metalness: 0.3 });
 const bumpGeo = new T.CylinderGeometry(height, height, width, 16, 1, false, 0, Math.PI);
 bumpGeo.rotateZ(Math.PI / 2);
 const bumpMesh = new T.Mesh(bumpGeo, bumpMat);
 bumpMesh.scale.set(1, 1, length / (height * 2));
 bumpMesh.castShadow = bumpMesh.receiveShadow = true;
 bumpGroup.add(bumpMesh);

 scene.add(bumpGroup);
 activeSpeedBumps.push({ body: bumpBody, group: bumpGroup, name, pos });
 return { body: bumpBody, group: bumpGroup };
}

function addStaticBox(size, pos, rotY = 0) {
 const body = new CANNON.Body({ mass: 0, material: groundMat });
 body.addShape(new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2)));
 body.position.set(pos[0], pos[1], pos[2]);
 if (rotY) body.quaternion.setFromEuler(0, rotY, 0);
 world.addBody(body);

 const mesh = new T.Mesh(new T.BoxGeometry(...size), obstacleMat);
 mesh.position.copy(body.position); mesh.quaternion.copy(body.quaternion);
 mesh.castShadow = mesh.receiveShadow = true;
 scene.add(mesh);
 return { body, mesh };
}

// addStaticBox at 507, 360 kaldırıldı - Doğu Konteyner Otobanı tamamen açık!

// 1. Start/Finish Düzlüğü Atlama Rampası (SF Straight - Z=320, Patlayıcı Varillerin Üstünden Uçar)
createPhysicalRamp(18, 26, 4.2, [0, 0, 320], 0, 'ramp_sf');

// 2. Konteyner Limanı Otoyolu Mega Rampası (Layer 4 - X=507.0, Z=100 - Trafik Yönü: -Z)
createPhysicalRamp(18, 28, 4.8, [507.0, 0, 100], Math.PI, 'ramp_container');

// 3. Doğu Kalesi Geri Dönüş Rampası (Layer 2 East - X=97.5, Z=180 - Trafik Yönü: -Z)
createPhysicalRamp(18, 24, 3.8, [97.5, 0, 180], Math.PI, 'ramp_layer2');

// 4. Liman / Okyanus Atlama Rampası (Pistin tamamen dışında, batı kıyısında X=-70'te okyanusa doğru!)
const escapeRampObj = createPhysicalRamp(18, 30, 5.5, [-70.0, 0, 800.0], -Math.PI / 2, 'ramp_escape');

// 5. Fabrika Koridoru Giriş Tümseği (X=195.0, Z=-110, Süspansiyonu Zıplatan Katı Tümsek)
createSpeedBump(26, 3.2, 0.45, [195.0, 0, -110], 0, 'bump_factory');

// 6. Batı Rıhtım Saçtokası Öncesi Tümsek (X=54.0, Z=-420)
createSpeedBump(26, 3.2, 0.45, [54.0, 0, -420], Math.PI / 2, 'bump_docks');


addBarrel([0, 0, 150]);
addBarrel([-1.2, 0, 151]);
addBarrel([1.2, 0, 151]);
addBarrel([0, 1.2, 150.5]);

addBarrel([126.0, 0, 975]);
addBarrel([127.5, 0, 976]);
addBarrel([126.0, 1.2, 975.5]);

addBarrel([253.5, 0, -540]);
addBarrel([255.0, 0, -541]);

addCrate([3.5, 2.4, 3.5], [93.6, 1.2, 360]);
addCrate([3.5, 2.4, 3.5], [507.0, 1.2, 30]);
addCrate([3.0, 2.0, 3.0], [54.0, 1.0, -405]);

/* ==========================================================
   YIKILABİLİR KISAYOL BARİKATLARI & PATLAYABİLİR RAFİNERİ SİLOLARI
   ========================================================== */
// 1. Rafineri Kısayol Barikatı (Refinery Bypass Barricade)
addCrate([3.8, 2.5, 1.2], [370.5, 1.25, 1050], 90);
addCrate([3.8, 2.5, 1.2], [374.0, 1.25, 1050], 90);

// 2. Fabrika İçi Fırın Kısayol Kapısı (Factory Furnace Gate)
addCrate([4.5, 3.0, 1.2], [212.0, 1.5, 120], 85);

// 3. Rafineri Patlayabilir Yakıt Siloları (Exploding Fuel Silos)
const siloMat = new T.MeshStandardMaterial({ color: '#e74c3c', roughness: 0.35, metalness: 0.7 });
const siloPositions = [
 [340.0, 6.0, 920.0],
 [365.0, 6.0, 940.0],
 [390.0, 6.0, 920.0],
 [415.0, 6.0, 950.0]
];

for (let sPos of siloPositions) {
 const sRadius = 4.8, sHeight = 12.0;
 const sBody = new CANNON.Body({ mass: 0, material: groundMat });
 sBody.addShape(new CANNON.Cylinder(sRadius, sRadius, sHeight, 14));
 sBody.position.set(sPos[0], sPos[1], sPos[2]);
 world.addBody(sBody);

 const sMesh = new T.Mesh(new T.CylinderGeometry(sRadius, sRadius, sHeight, 16), siloMat);
 sMesh.position.copy(sBody.position);
 sMesh.castShadow = sMesh.receiveShadow = true;
 scene.add(sMesh);

 const siloTarget = {
  body: sBody, mesh: sMesh, hp: 80, isDead: false,
  onHit(dmg) {
   if (this.isDead) return;
   this.hp -= dmg;
   spawnSparks(sBody.position, new T.Vector3(0, 1, 0), 15);
   Snd.playImpact();
   if (this.hp <= 0) {
    this.isDead = true;
    createExplosion(sBody.position, 18, 7000);
    setTimeout(() => createExplosion(sBody.position.vadd(new CANNON.Vec3(2, 4, 2)), 14, 5000), 200);
    setTimeout(() => createExplosion(sBody.position.vadd(new CANNON.Vec3(-2, 3, -2)), 15, 5500), 450);
    triggerFlameJet(sPos[0], sPos[2]);
    showBanner('💥 DEV RAFİNERİ TANKI PATLADI!', 'buff-sword');
    showRadioMessage('Rafineri tankını patlattın Frankenstein! Her yer alevler içinde!', 'case');
    addViewers(1200000, 'RAFİNERİ SİLOSU İMHA EDİLDİ!');
    world.removeBody(sBody);
    scene.remove(sMesh);
   }
  }
 };
 sBody.targetData = siloTarget;
 targets.push(siloTarget);
}


/* ==========================================================
   KONTROLLER, NİTRO, DRİFT & ATEŞ MEKANİĞİ
   ========================================================== */
const KEYS = {};
window.KEYS = KEYS;
let isMouseDown = false;
let gunHeat = 0;
let isOverheated = false;
let lastShotTime = 0;
let gunToggle = 0;
let lastSmokeTime = 0;
let isDrifting = false;
let playerOilTimer = 0;

addEventListener('keydown', e => {
 if (e.key === 'F1') { e.preventDefault(); document.body.classList.toggle('show-keys'); return; }
 if (e.key === 'Escape') { handleEscape(); return; }
 if (isPaused) {
  // Menüde ok tuşları + Enter ile gezinme
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); movePauseFocus(e.key === 'ArrowDown' ? 1 : -1); }
  else if (e.key === 'Enter') { e.preventDefault(); activatePauseItem(); }
  return;
 }
 const k = e.key.toLowerCase();
 // Mod menüsü açıkken 1-4 ile mod seçimi
 const modeModal = document.getElementById('mode-select-modal');
 if (!isGameStarted && modeModal && modeModal.classList.contains('open') && ['1', '2', '3', '4'].includes(k)) {
  Snd.init();
  const modes = { '1': 'deathrace', '2': 'peaceful', '3': 'career', '4': 'garage' };
  window.handleCardSelect(null, modes[k]);
  return;
 }
 KEYS[k] = true;
 Snd.init();
 handleKeyAction(k);
});

// Tek seferlik tuş eylemleri (klavye ve gamepad ortak kullanır)
function handleKeyAction(k) {
 if (k === 'g') { toggleGarage(); }
 if (k === 'j') { toggleAudioModal(); }
 if (k === 'y') { toggleGhost(); }
 if (k === 'l') tryDropSmoke();

  if (k === 'e') { triggerEMPBlast(); }
  if (k === 'b') { deployStickyMine(); }
  if (k === 'x') { deploySpikeStrip(); }
  if (k === 'z') { performSideShunt('left'); }
  if (k === 'c') { performSideShunt('right'); }
  if (k === 'f') { toggleBulletTime(); }
  if (k === 'u') { callHelicopterStrike(); }

 if (k === 'p') { toggleAIFire(); }
 if (k === 'o') { toggleGodMode(); }
 if (k === 'h') { setWeather((weatherMode + 1) % 3); }
 if (k === 'm') { Snd.toggleMusic(); }
 if (k === 'n') {
  cameraMode = (cameraMode + 1) % 4;
  const modes = ['3. ŞAHIS (TPS)', 'ÖN TAMPON / HIZ', 'KOKPİT / VİZÖR', 'GERİ GÖRÜŞ'];
  showBanner(`KAMERA: ${modes[cameraMode]}`);
 }
 if (k === 'q' || k === '1') deployOilSlick();
 if (k === '2') {
  deploySpikeStrip();
 }
 if (k === 'k') { fireRocket(); }
}

addEventListener('keyup', e => { KEYS[e.key.toLowerCase()] = false; });
addEventListener('mousedown', e => {
 Snd.init();
 if (e.button === 0) isMouseDown = true;
 if (e.button === 2) { e.preventDefault(); fireRocket(); }
});
addEventListener('mouseup', e => {
 if (e.button === 0) isMouseDown = false;
});
addEventListener('contextmenu', e => e.preventDefault());

function bindTouchButton(id, keyName, isAction = null) {
 const btn = document.getElementById(id);
 if (!btn) return;
 const press = (e) => {
  e.preventDefault();
  Snd.init();
  if (keyName) KEYS[keyName] = true;
  if (isAction === 'fire') isMouseDown = true;
  if (isAction === 'nitro') KEYS['shift'] = true;
  if (isAction === 'rpg') fireRocket();
  if (isAction === 'oil') deployOilSlick();
  if (isAction === 'tombstone') detachArmorPart('part_tombstone');
  if (isAction === 'smoke') tryDropSmoke();
 };
 const release = (e) => {
  e.preventDefault();
  if (keyName) KEYS[keyName] = false;
  if (isAction === 'fire') isMouseDown = false;
  if (isAction === 'nitro') KEYS['shift'] = false;
 };
 btn.addEventListener('pointerdown', press);
 btn.addEventListener('pointerup', release);
 btn.addEventListener('pointercancel', release);
 btn.addEventListener('pointerleave', release);
}
bindTouchButton('btn-gas', 'w');
bindTouchButton('btn-brake', 's');
bindTouchButton('btn-left', 'a');
bindTouchButton('btn-right', 'd');
bindTouchButton('btn-fire', null, 'fire');
bindTouchButton('btn-nitro', null, 'nitro');
bindTouchButton('btn-rpg', null, 'rpg');
bindTouchButton('btn-oil', null, 'oil');
bindTouchButton('btn-tombstone', null, 'tombstone');
bindTouchButton('btn-smoke', null, 'smoke');

const MAX_BRAKE = 85;
const MAX_STEER = 0.42;

// R: yalnızca oyuncu. Araç sağlamsa en yakın pist noktasına geri konur; imha olduysa
// tam canla, parçaları yerinde olarak orada yeniden doğar. Rakipler ve yarış durumu etkilenmez.
function respawnPlayer() {
 if (garageModeActive || raceFinished) return;
 if (carHealth <= 0) {
  carHealth = 100 + (upgrades.armor - 1) * 35;
  nitroAmount = 100;
  shieldTimer = 0;
  detachedParts.clear();
  for (const key of Object.keys(MODULAR_PARTS)) {
   const m = carGroup.getObjectByName(key);
   if (m) m.visible = true;
  }
  updatePartsHUD();
  engineFireLight.intensity = 0;
 }
 recoverCar();
}

// Tüm yarışı başlangıç konumlarına döndürür (artık R tuşuna bağlı değil)
function resetCar() {
 chassisBody.position.set(0, 0.85, 0);
 chassisBody.quaternion.set(0, 0, 0, 1);
 chassisBody.velocity.set(0, 0, 0);
 chassisBody.angularVelocity.set(0, 0, 0);

 const maxHP = 100 + (upgrades.armor - 1) * 35;
 carHealth = maxHP;
 nitroAmount = 100;
 overdriveTimer = 0;
 shieldTimer = 0;
 eliminationTimer = 45.0;
 shieldMesh.visible = false;

 for (let d of debrisList) { world.removeBody(d.body); scene.remove(d.mesh); }
 debrisList.length = 0;
 detachedParts.clear();
 updatePartsHUD();

 if (carGroup) {
  for (let key of Object.keys(MODULAR_PARTS)) {
   const m = carGroup.getObjectByName(key);
   if (m) m.visible = true;
  }
 }
 engineFireLight.intensity = 0;

 for (let ai of aiOpponents) {
  ai.chassisBody.position.set(ai.cfg.startPos[0], ai.cfg.startPos[1], ai.cfg.startPos[2]);
  ai.chassisBody.quaternion.set(0, 0, 0, 1);
  ai.chassisBody.velocity.set(0, 0, 0);
  ai.chassisBody.angularVelocity.set(0, 0, 0);
  ai.health = 100;
  ai.isDead = false;
  ai.detachedParts.clear();
  if (ai.carBodyMesh) {
   for (let key of Object.keys(MODULAR_PARTS)) {
    const m = ai.carBodyMesh.getObjectByName(key);
    if (m) m.visible = true;
   }
  }
 }

 if (dreadnought.isActive) {
  dreadnought.health = 500;
  dreadnought.isDead = false;
  dreadnoughtBody.position.set(507.0, 2.2, 360);
  dreadnoughtBody.velocity.set(0, 0, 0);
 }

 showBanner('YARIŞ SIFIRLANDI! GAZA BAS!', 'buff-sword');
 showRadioMessage('Hazırız Frankenstein! Bu kez affetmek yok!');
}

function shootBullet() {
 if ((isOverheated && overdriveTimer <= 0) || carHealth <= 0) return;

 const now = performance.now();
 const cooldown = overdriveTimer > 0 ? 35 : (upgrades.gun >= 2 ? 55 : 65);
 if (now - lastShotTime < cooldown) return;
 if (!canUseWeapon('gun')) return;
 lastShotTime = now;
 consumeWeapon('gun');

 if (overdriveTimer <= 0) {
  gunHeat = Math.min(1.0, gunHeat + (upgrades.gun >= 3 ? 0.016 : 0.024));
  if (gunHeat >= 0.98) isOverheated = true;
 } else {
  gunHeat = 0;
 }

 const activeGun = (gunToggle++ % 2 === 0) ? leftGun : rightGun;
 const muzzlePos = new T.Vector3(0, 0, 0.55);
 activeGun.root.localToWorld(muzzlePos);

 const fwd = new T.Vector3(0, 0, 1).applyQuaternion(carGroup.quaternion);
 fwd.x += (Math.random() - 0.5) * 0.02;
 fwd.y += (Math.random() - 0.5) * 0.015;
 fwd.z += (Math.random() - 0.5) * 0.02;
 fwd.normalize();

 const bMat = upgrades.gun >= 3 ? bulletMatPlayerLvl3 : (upgrades.gun >= 2 ? bulletMatPlayerLvl2 : bulletMatPlayer);
 const bMesh = acquireBulletMesh(bMat);
 bMesh.position.copy(muzzlePos);
 bMesh.quaternion.copy(carGroup.quaternion);
 if (upgrades.gun >= 2) bMesh.scale.set(1.5, 1.5, 1.5);

 const ammo = customization.ammoType;
 // AP: +%40 hasar · Alevli/Asit: biraz daha az doğrudan hasar ama yan etki uygular
 const dmg = (25 + (upgrades.gun - 1) * 16) * (ammo === 'ap' ? 1.4 : (ammo === 'fmj' ? 1 : 0.85));

 activeBullets.push({
  mesh: bMesh, pos: muzzlePos.clone(), vel: fwd.clone().multiplyScalar(240),
  life: 1.4, isEnemy: false, damage: dmg, isIncendiary: upgrades.gun >= 3
 });

 activeGun.flash.visible = true;
 muzzleLight.intensity = overdriveTimer > 0 ? 5.0 : 3.6;
 cameraShake = Math.max(cameraShake, 0.06);
 if (upgrades.gun >= 2) Snd.playHeavyGunshot();
 else Snd.playGunshot(false);
}

let smoothSteer = 0;


/* ==========================================================
   HOLLYWOOD GÖRSEL EFEKTLERİ: LASTİK DUMANI & EGZOZ BACKFIRE
   ========================================================== */
// 1. Egzoz Alev Patlamaları (Backfire)
const backfireFlameL = new T.Mesh(new T.ConeGeometry(0.12, 0.75, 8), new T.MeshBasicMaterial({ color: '#ff5500', transparent: true, opacity: 0 }));
backfireFlameL.rotation.x = -Math.PI / 2;
backfireFlameL.position.set(-0.55, 0.28, -2.4);
carGroup.add(backfireFlameL);

const backfireFlameR = new T.Mesh(new T.ConeGeometry(0.12, 0.75, 8), new T.MeshBasicMaterial({ color: '#00ccff', transparent: true, opacity: 0 }));
backfireFlameR.rotation.x = -Math.PI / 2;
backfireFlameR.position.set(0.55, 0.28, -2.4);
carGroup.add(backfireFlameR);

let backfireTimer = 0;
function triggerExhaustBackfire() {
 backfireTimer = 0.22;
 backfireFlameL.material.opacity = 0.95;
 backfireFlameR.material.opacity = 0.95;
 spawnSparks(new CANNON.Vec3(carGroup.position.x - 0.55, carGroup.position.y + 0.3, carGroup.position.z - 2.2), new T.Vector3(0, 0, -1), 8);
 spawnSparks(new CANNON.Vec3(carGroup.position.x + 0.55, carGroup.position.y + 0.3, carGroup.position.z - 2.2), new T.Vector3(0, 0, -1), 8);
 if (Snd && Snd.playMetalSnap) Snd.playMetalSnap();
}
window.triggerExhaustBackfire = triggerExhaustBackfire;

// 2. Drift Lastik Dumanı (Tire Smoke Particles)
const smokeParticles = [];
const driftSmokeGeo = new T.SphereGeometry(0.35, 6, 6);
const driftSmokeMat = new T.MeshBasicMaterial({ color: '#888888', transparent: true, opacity: 0.35, depthWrite: false });
const driftSmokePool = createMeshPool(driftSmokeGeo, driftSmokeMat, 26);

function spawnDriftSmoke(pos) {
 if (smokeParticles.length > 25) return;
 const m = driftSmokePool.acquire(driftSmokeMat);
 m.position.copy(pos);
 smokeParticles.push({ mesh: m, life: 0.65, maxLife: 0.65 });
}

/* ==========================================================
   GAMEPAD DESTEĞİ (Xbox / PlayStation standart düzen)
   ==========================================================
   RT gaz · LT fren/geri · Sol çubuk direksiyon · A el freni · B nitro · X minigun · Y roket
   LB yağ · RB mayın · D-pad ↑ EMP · ↓ diken · ←/→ yan shunt · L3 odak · R3 hava saldırısı
   Back/Select kamera · Start duraklat. Menüde A = Ölüm Yarışı, X = Kariyer.
   Duraklatma menüsünde: D-pad ↑↓ gezin, A seç, B/Start devam. */
const GP = { active: false, steer: 0, throttle: 0, brake: 0, handbrake: false, nitro: false, fire: false, prev: [], pad: null };
const GP_ACTIONS = { 3: 'k', 4: 'q', 5: 'b', 8: 'n', 10: 'f', 11: 'u', 12: 'e', 13: 'x', 14: 'z', 15: 'c' };
function pollGamepad() {
 const pads = navigator.getGamepads ? navigator.getGamepads() : [];
 let gp = null;
 for (const p of pads) { if (p && p.connected) { gp = p; break; } }
 if (!gp) {
  if (GP.active) { GP.active = false; GP.steer = GP.throttle = GP.brake = 0; GP.handbrake = GP.nitro = GP.fire = false; GP.pad = null; }
  return;
 }
 if (!GP.active) { GP.active = true; showBanner('🎮 GAMEPAD BAĞLANDI'); }
 GP.pad = gp;
 const b = gp.buttons;
 const val = i => (b[i] ? (typeof b[i].value === 'number' ? b[i].value : (b[i].pressed ? 1 : 0)) : 0);
 const pressed = i => !!(b[i] && b[i].pressed);
 const ax = gp.axes[0] || 0;
 if (isPaused) { GP.throttle = GP.brake = 0; GP.handbrake = GP.nitro = GP.fire = false; }
 GP.steer = Math.abs(ax) > 0.12 ? Math.sign(ax) * (Math.abs(ax) - 0.12) / 0.88 : 0;
 if (!isPaused) {
  GP.throttle = val(7);
  GP.brake = val(6);
  GP.handbrake = pressed(0);
  GP.nitro = pressed(1);
  GP.fire = pressed(2);
 }
 for (let i = 0; i < b.length; i++) {
  const now = pressed(i);
  if (now && !GP.prev[i]) {
   Snd.init();
   if (isPaused) {
    if (i === 12) movePauseFocus(-1);
    else if (i === 13) movePauseFocus(1);
    else if (i === 0) activatePauseItem();
    else if (i === 1 || i === 9) setPaused(false);
   } else if (i === 9 && isGameStarted && !garageModeActive) {
    setPaused(true);
   } else if (!isGameStarted && !garageModeActive) {
    if (i === 0) setGameMode('deathrace', true);
    if (i === 2) setGameMode('career', true);
   } else if (GP_ACTIONS[i]) {
    handleKeyAction(GP_ACTIONS[i]);
   }
  }
  GP.prev[i] = now;
 }
}
function rumble(strength, ms = 120) {
 const act = GP.pad && GP.pad.vibrationActuator;
 if (!act || !act.playEffect) return;
 try { act.playEffect('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strength), weakMagnitude: Math.min(1, strength * 0.6) }); } catch (e) {}
}
addEventListener('gamepadconnected', () => Snd.init());

function updateControls(dt) {
 if (raceCountdown > 0 && !garageModeActive) {
  for (let i = 0; i < 4; i++) { vehicle.applyEngineForce(0, i); vehicle.setBrake(80, i); }
  return;
 }
 if (garageModeActive) {
  for (let i = 0; i < 4; i++) { vehicle.applyEngineForce(0, i); vehicle.setBrake(65, i); }
  return;
 }

 if (carHealth <= 0) {
  for (let i = 0; i < 4; i++) { vehicle.applyEngineForce(0, i); vehicle.setBrake(45, i); }
  if (KEYS['r']) { respawnPlayer(); KEYS['r'] = false; }
  return;
 }

 const v = chassisBody.velocity;
 const speed = v.length();
 const speedKmh = speed * 3.6;

 // 1. Hıza duyarlı dinamik FOV (Hız arttıkça görüş açısı açılarak müthiş bir hız hissi verir)
 const speedRatio = Math.min(1.0, speedKmh / 230);
 const isPressingForward = (KEYS['w'] || KEYS['arrowup'] || GP.throttle > 0.12);
 const isPressingBrake = (KEYS['s'] || KEYS['arrowdown'] || GP.brake > 0.12);
 const isPressingHandbrake = KEYS[' '] || GP.handbrake;
 const usingNitro = (KEYS['shift'] || GP.nitro) && nitroAmount > 5 && isPressingForward;
 targetFOV = 62 + speedRatio * 18 + (usingNitro ? 12 : 0);
 Snd.updateEngine(speedKmh, isPressingForward);

 // Backfire kontrolü (Yüksek hızda gaz bırakıldığında veya Nitro basıldığında)
 if (typeof wasPressingForward === 'undefined') window.wasPressingForward = false;
 if (wasPressingForward && !isPressingForward && speedKmh > 85.0 && Math.random() < 0.4) {
  triggerExhaustBackfire();
 }
 window.wasPressingForward = isPressingForward;

 // Backfire timer güncellemesi
 if (backfireTimer > 0) {
  backfireTimer -= dt;
  if (backfireTimer <= 0) {
   backfireFlameL.material.opacity = 0;
   backfireFlameR.material.opacity = 0;
  }
 }

 // Duman partikül yaşam döngüsü
 for (let i = smokeParticles.length - 1; i >= 0; i--) {
  const sp = smokeParticles[i];
  sp.life -= dt;
  sp.mesh.position.y += dt * 1.5;
  const progress = 1 - (sp.life / sp.maxLife);
  const scale = 1.0 + progress * 2.8;
  sp.mesh.scale.set(scale, scale, scale);
  if (sp.life <= 0) {
   driftSmokePool.release(sp.mesh);
   smokeParticles.splice(i, 1);
  }
 }


 // 2. Akıllı Gaz & Fren (S tuşu ile savrulmayan, düz hatlı ayak freni)

 // Aracın kendi ileri yönündeki hız bileşeni
 const fwdVec = new T.Vector3(0, 0, 1).applyQuaternion(carGroup.quaternion);
 const forwardSpeed = v.x * fwdVec.x + v.z * fwdVec.z;

 // Drift ve sert fren lastik dumanı
 if (isPressingHandbrake || (Math.abs(forwardSpeed) > 15 && isPressingBrake)) {
  if (Math.random() < 0.55) {
   const leftWheelPos = new T.Vector3(-0.9, 0.1, -1.3).applyQuaternion(carGroup.quaternion).add(carGroup.position);
   const rightWheelPos = new T.Vector3(0.9, 0.1, -1.3).applyQuaternion(carGroup.quaternion).add(carGroup.position);
   spawnDriftSmoke(leftWheelPos);
   spawnDriftSmoke(rightWheelPos);
  }
 }

 let forward = 0;
 let brakeForce = 0;

 if (isPressingForward) {
  // Gamepad tetiği analog gaz verir; klavye tam gaz
  forward = (KEYS['w'] || KEYS['arrowup']) ? 1 : Math.min(1, GP.throttle * 1.1);
  // Kritik Hasar Motor Boğulması (<25 HP)
  if (carHealth > 0 && carHealth < 25) {
   if (Math.random() < 0.05) {
    forward *= 0.15; // Motor öksürür / gaz keser
    if (Math.random() < 0.015) {
     showRadioMessage('Motor tekliyor Frankenstein! Acil fabrikadaki yeşil pit şeridine girip zırhı onar!', 'case');
     showBanner('⚠️ MOTOR BOĞULUYOR! ACİL PİT-STOP GİRİŞİ YAP!', 'buff-sword');
    }
   }
  }
 } else if (isPressingBrake) {
  if (forwardSpeed > 1.8) {
   // Araç ileri giderken S'ye basıldığında güçlü 4 tekerlek freni yapar (kesinlikle savrulmaz)
   forward = 0;
   brakeForce = 75;
  } else {
   // Araç durduğunda veya geri gitmek istendiğinde yumuşak geri vites
   forward = -0.55;
  }
 }

 if (isPressingHandbrake) {
  brakeForce = Math.max(brakeForce, 25);
 }

 // 3. Ağırlık, Yol Tutuşu & Kontrollü Arcade Drift
 const isDrifting = isPressingHandbrake && speedKmh > 18;
 if (playerOilTimer > 0) {
  playerOilTimer -= dt;
  for (let i = 0; i < 4; i++) vehicle.wheelInfos[i].frictionSlip = 0.3;
 } else if (isDrifting) {
  // Drift esnasında abartılı savrulmayan, yön verilebilir kontrollü drift sürtünmesi (1.85)
  const wg = weatherGrip();
  vehicle.wheelInfos[0].frictionSlip = 3.8 * wg;
  vehicle.wheelInfos[1].frictionSlip = 3.8 * wg;
  vehicle.wheelInfos[2].frictionSlip = 1.85 * wg;
  vehicle.wheelInfos[3].frictionSlip = 1.85 * wg;

  nitroAmount = Math.min(100, nitroAmount + 24 * dt);
  const rearLeft = carGroup.position.clone().add(new T.Vector3(-1.0, 0.1, -1.5).applyQuaternion(carGroup.quaternion));
  const rearRight = carGroup.position.clone().add(new T.Vector3(1.0, 0.1, -1.5).applyQuaternion(carGroup.quaternion));
  spawnTireSmoke(rearLeft);
  spawnTireSmoke(rearRight);
  if (Math.random() < 0.25) Snd.playTireScreech();
  addViewers(Math.round(8000 * dt));
 } else {
  // Normal sürüşte sağlam yol tutuşu (3.8) - tok, oturaklı ve ağırlıklı sürüş hissi
  for (let i = 0; i < 4; i++) vehicle.wheelInfos[i].frictionSlip = 3.8 * weatherGrip();
 }

 // 4. Direksiyon: Hıza duyarlı ağırbaşlı dönüş (Yüksek hızda ani savrulmayı önler)
 let steerRaw = (KEYS['a'] || KEYS['arrowleft']) ? 1 : (KEYS['d'] || KEYS['arrowright']) ? -1 : 0;
 if (steerRaw === 0 && GP.steer !== 0) steerRaw = -GP.steer; // analog çubuk
 const speedSteerScale = Math.max(0.35, 1.0 - (speedKmh / 240) * 0.65);
 const targetSteer = steerRaw * MAX_STEER * speedSteerScale;
 smoothSteer = T.MathUtils.lerp(smoothSteer, targetSteer, 1 - Math.exp(-18 * dt));
 vehicle.setSteeringValue(smoothSteer, 0);
 vehicle.setSteeringValue(smoothSteer, 1);

 // 5. Stabilite Kontrolü (ESP - Aracın kontrolden çıkıp kendi etrafında fırıldak olmasını önler)
 if (Math.abs(chassisBody.angularVelocity.y) > 2.0 && !isPressingHandbrake) {
  chassisBody.angularVelocity.y *= 0.88;
 }

 // 6. AWD (4 Çeker) Motor Torku - Güçlü ve Dolu Dolu Hızlanma
 if (usingNitro) {
  nitroAmount = Math.max(0, nitroAmount - 26 * dt);
  nitroLight.intensity = 3.5;
  if (Math.random() < 0.4) Snd.playNitroSound();
 } else {
  nitroLight.intensity = 0;
  nitroAmount = Math.min(100, nitroAmount + 5.0 * dt);
 }

 const hpFactor = healthSpeedFactor(carHealth, 100 + (upgrades.armor - 1) * 35);
 const baseTopSpeed = (72 + (upgrades.engine - 1) * 12) * hpFactor; // 72 m/s = 260 km/h taban, nitro ile 365+ km/h
 const topSpeed = usingNitro ? baseTopSpeed * 1.45 : baseTopSpeed;
 const falloff = Math.max(0, 1 - speed / topSpeed);
 const baseEngineForce = 9600 * (1 + (upgrades.engine - 1) * 0.25) * hpFactor;
 const engineMultiplier = usingNitro ? 1.85 : 1.0;
 const engineForce = forward * baseEngineForce * falloff * engineMultiplier;

 // AWD Çekiş Dağılımı: Ön %40, Arka %60 (Tekerlek patinajını önler, doğrudan hızlandırır)
 vehicle.applyEngineForce(-engineForce * 0.4, 0);
 vehicle.applyEngineForce(-engineForce * 0.4, 1);
 vehicle.applyEngineForce(-engineForce * 0.6, 2);
 vehicle.applyEngineForce(-engineForce * 0.6, 3);

 for (let i = 0; i < 4; i++) {
  vehicle.setBrake(brakeForce, i);
 }

 // Not: önceden 'j' (ses menüsü) ve 'f' (odak) tuşları da minigunu ateşliyordu
 const firing = KEYS['control'] || KEYS['enter'] || isMouseDown || GP.fire;
 if (firing) {
  shootBullet();
  const spinSpeed = overdriveTimer > 0 ? 80 : 40;
  leftGun.barrelGroup.rotation.z += spinSpeed * dt;
  rightGun.barrelGroup.rotation.z += spinSpeed * dt;
 } else {
  leftGun.flash.visible = false;
  rightGun.flash.visible = false;
  muzzleLight.intensity *= 0.7;
 }

 if (!firing) {
  gunHeat = Math.max(0, gunHeat - 0.35 * dt);
  if (isOverheated && gunHeat < 0.35) isOverheated = false;
 }

 // Duman perdesi 'L' tuşuna taşındı (önceden 'E' basılı tutulunca EMP ile birlikte tetikleniyordu)

 if (KEYS['t']) { dropTombstone(); KEYS['t'] = false; }
 if (KEYS['r']) { respawnPlayer(); KEYS['r'] = false; }
}

/* ==========================================================
   PİST PLAKALARI & TUR KONTROL MANTIĞI
   ========================================================== */

/* ==========================================================
   SEYİRCİ REYTİNGİ HAVA İKMAL SANDIĞI (AIRDROP SUPPLY CRATE)
   ========================================================== */
const activeAirdrops = [];
// Önceden her duman puf'u için yeni (ve hiç dispose edilmeyen) bir MeshStandardMaterial oluşturuluyordu.
const crateSmokeMat = new T.MeshStandardMaterial({ color: '#2ecc71', roughness: 0.9, transparent: true, opacity: 0.75 });
function spawnCrateGreenSmoke(pos) {
 if (smokePuffs.length > 60) return;
 const m = smokePool.acquire(crateSmokeMat);
 m.position.set(pos.x + (Math.random() - 0.5) * 0.8, pos.y + 0.8, pos.z + (Math.random() - 0.5) * 0.8);
 m.scale.setScalar(0.7 + Math.random() * 0.4);
 smokePuffs.push({
  mesh: m, vx: (Math.random() - 0.5) * 0.8, vy: 1.8 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 0.8,
  grow: 2.2, life: 1.2, maxLife: 1.2
 });
}
let nextAirdropThreshold = 18000000;

const airdropCrateGeo = new T.BoxGeometry(2.2, 1.8, 2.2);
const airdropCrateMat = new T.MeshStandardMaterial({ color: '#27ae60', roughness: 0.5, metalness: 0.7 });
const parachuteMat = new T.MeshStandardMaterial({ color: '#ecf0f1', roughness: 0.8, side: T.DoubleSide });
const airdropChuteGeo = new T.SphereGeometry(3.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);

function spawnAirdropCrate() {
 const playerInfo = getTrackDistance(chassisBody.position);
 const dropIdx = (playerInfo.index + 55) % NUM_TRACK_STEPS;
 const dropPt = TRACK_POINTS[dropIdx];

 const dropGroup = new T.Group();
 dropGroup.position.set(dropPt.x, 24.0, dropPt.z);

 const crate = new T.Mesh(airdropCrateGeo, airdropCrateMat);
 crate.castShadow = true;
 dropGroup.add(crate);

 // Paraşüt Kubbesi
 const chute = new T.Mesh(airdropChuteGeo, parachuteMat);
 chute.position.y = 4.2;
 dropGroup.add(chute);

 // Yeşil Flare Işığı
 const flare = new T.PointLight('#2ecc71', 4.0, 25);
 flare.position.y = 1.5;
 poolLight(flare);
 dropGroup.add(flare);

 scene.add(dropGroup);
 activeAirdrops.push({ group: dropGroup, pos: dropPt, currentY: 24.0, isLanded: false, collected: false });

 Snd.playPadChime();
 showBanner('📦 WEYLAND İZLEYİCİLERİ HAVA İKMAL SANDIĞI İNDİRDİ!', 'buff-shield');
 showRadioMessage('İzleyiciler hava desteği indirdi Frankenstein! İlerideki yeşil sandığı kap!', 'case');
}

function updateAirdrops(dt) {
 for (let i = activeAirdrops.length - 1; i >= 0; i--) {
  const ad = activeAirdrops[i];
  if (ad.collected) continue;

  if (!ad.isLanded) {
   ad.currentY -= 6.5 * dt;
   if (ad.currentY <= 1.0) {
    ad.currentY = 1.0;
    ad.isLanded = true;
   }
   ad.group.position.y = ad.currentY;
  }

  // Yeşil sinyal dumanı
  if (Math.random() < 0.25) {
   spawnCrateGreenSmoke(ad.group.position);
  }

  // Oyuncu çarpışma kontrolü
  const pPos = chassisBody.position;
  const dist = Math.hypot(pPos.x - ad.pos.x, pPos.z - ad.pos.z);
  if (dist < 3.8 && Math.abs(pPos.y - ad.currentY) < 3.2) {
   ad.collected = true;
   scene.remove(ad.group);
   activeAirdrops.splice(i, 1);

   // Ödül: Full Zırh + Tombstone Onarımı + Mega Nitro + Puan
   const maxHP = 100 + (upgrades.armor - 1) * 35;
   carHealth = maxHP;
   tombstoneHealth = tombstoneMaxHealth;
   if (tombstoneFillEl) { tombstoneFillEl.style.width = '100%'; tombstoneFillEl.style.background = 'linear-gradient(90deg, #7f8c8d, #bdc3c7)'; }
   if (tombstoneTextEl) tombstoneTextEl.textContent = 'TOMBSTONE %100 [T]';
   nitroAmount = 100;
   overdriveTimer = 10.0;
   playerCredits += 75000;
   if (currencyValEl) currencyValEl.textContent = fmtTR(playerCredits);

   Snd.playPowerup('shield');
   createExplosion(pPos, 8, 2000);
   showBanner('📦 HAVA SANDIĞI ALINDI! FULL ONARIM & SINIRSIZ NİTRO!', 'buff-shield');
   showRadioMessage('Sandık alındı Frankenstein! Sistemler tamamen onarıldı, canavar hazır!', 'case');
   addViewers(2000000, 'HAVA İKMALİ ALINDI!');
  }
 }
}


/* ==========================================================
   KIL PAYI GEÇİŞ (NEAR MISS) & DRIFT COMBO PUANLAMASI
   ========================================================== */
let lastNearMissTime = 0;
let driftComboScore = 0;

function updateCombosAndNearMiss(dt) {
 const pPos = chassisBody.position;
 const pSpeedKmh = chassisBody.velocity.length() * 3.6;

 // 1. Near Miss Kontrolü (>100 km/sa hızda rakiplere çok yakın teğet geçme)
 if (pSpeedKmh > 95) {
  const now = performance.now();
  if (now - lastNearMissTime > 2800) {
   for (let ai of aiOpponents) {
    if (ai.isDead) continue;
    const dist = pPos.distanceTo(ai.chassisBody.position);
    if (dist > 2.6 && dist < 4.2) {
     lastNearMissTime = now; raceStats.nearMisses++;
     playerCredits += 12000;
     if (currencyValEl) currencyValEl.textContent = fmtTR(playerCredits);
     addViewers(300000, 'KIL PAYI GEÇİŞ!');
     showBanner('⚡ KIL PAYI GEÇİŞ (NEAR MISS)! +12.000 PTS', 'buff-sword');
     Snd.playImpact();
     break;
    }
   }
  }
 }

 // 2. Drift Puan Biriktirme
 if (isDrifting && pSpeedKmh > 50) {
  driftComboScore += dt * 450; raceStats.driftScore += dt * 450;
  if (driftComboScore > 300) {
   playerCredits += Math.round(driftComboScore * 0.1);
   addViewers(Math.round(driftComboScore * 10));
   driftComboScore = 0;
  }
 } else {
  driftComboScore = 0;
 }

 // 3. İzleyici Eşiği Airdrop Kontrolü
 if (currentViewers >= nextAirdropThreshold) {
  nextAirdropThreshold += 7000000;
  spawnAirdropCrate();
 }
}


/* ==========================================================
   22 GELİŞMİŞ OYUN MEKANİĞİ SİSTEMLERİ
   ========================================================== */

// 1. İSTATİSTİK TAKİBİ (POST-RACE STATS)
const raceStats = window.raceStats = {
 takedowns: 0,
 maxSpeed: 0,
 nearMisses: 0,
 driftScore: 0,
 creditsEarned: 0,
 peakViewers: 0
};

// 2. SLIPSTREAM (RÜZGAR KORİDORU) SİSTEMİ
let isSlipstreaming = false;
const slipstreamHudEl = document.getElementById('slipstream-hud');
const slipLinesGeo = new T.BufferGeometry();
const slipLinesPos = [];
for (let i = 0; i < 40; i++) {
 slipLinesPos.push((Math.random() - 0.5) * 3.5, Math.random() * 1.5, (Math.random() - 0.5) * 6);
}
slipLinesGeo.setAttribute('position', new T.Float32BufferAttribute(slipLinesPos, 3));
const slipLinesMat = new T.PointsMaterial({ color: '#00f0ff', size: 0.18, transparent: true, opacity: 0.8 });
const slipParticles = new T.Points(slipLinesGeo, slipLinesMat);
slipParticles.frustumCulled = false;
slipParticles.visible = false;
carGroup.add(slipParticles);

function updateSlipstream(dt) {
 const pPos = chassisBody.position;
 const pVel = chassisBody.velocity;
 const pSpeedKmh = pVel.length() * 3.6;
 const fwd = new T.Vector3(0, 0, 1).applyQuaternion(carGroup.quaternion);

 let inWake = false;
 if (pSpeedKmh > 75) {
  for (let ai of aiOpponents) {
   if (ai.isDead) continue;
   const toAI = ai.chassisBody.position.vsub(pPos);
   const dist = toAI.length();
   if (dist > 4.5 && dist < 22.0) {
    const dir = new T.Vector3(toAI.x, toAI.y, toAI.z).normalize();
    if (fwd.dot(dir) > 0.92) {
     inWake = true;
     break;
    }
   }
  }
 }

 isSlipstreaming = inWake;
 if (slipstreamHudEl) slipstreamHudEl.style.display = inWake ? 'block' : 'none';
 slipParticles.visible = inWake;

 if (inWake) {
  // Rüzgar tüneli çizgilerini geriye doğru akıt
  const posAttr = slipLinesGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
   let z = posAttr.getZ(i);
   z -= 45.0 * dt;
   if (z < -4.5) z = 4.5;
   posAttr.setZ(i, z);
  }
  posAttr.needsUpdate = true;

  // +2600N ekstra rüzgar koridoru itme kuvveti
  const boost = fwd.clone().multiplyScalar(2600);
  chassisBody.applyForce(new CANNON.Vec3(boost.x, 0, boost.z), chassisBody.position);
 }
}

// 3. EMP ŞOK DALGASI SİSTEMİ (E TUŞU)
let lastEMPTime = -99999;
window.resetCooldowns = () => { lastEMPTime = -99999; lastMineTime = -99999; lastSpikeTime = -99999; lastShuntTime = -99999; lastBulletTime = -99999; lastAirstrikeTime = -99999; lastRPGTime = -99999; lastOilTime = -99999; };
const empRingGeo = new T.RingGeometry(0.5, 1.8, 32);
empRingGeo.rotateX(-Math.PI / 2);
const empRingMat = new T.MeshBasicMaterial({ color: '#00f0ff', transparent: true, opacity: 0.85, side: T.DoubleSide });
const empMesh = new T.Mesh(empRingGeo, empRingMat);
empMesh.visible = false;
scene.add(empMesh);
let empAnimTimer = 0;

function triggerEMPBlast() {
 const now = performance.now();
 if (now - lastEMPTime < 14000 || carHealth <= 0) return;
 if (!canUseWeapon('emp')) return;
 lastEMPTime = now;
 consumeWeapon('emp');
 empAnimTimer = 0.55;
 empMesh.position.set(chassisBody.position.x, 0.25, chassisBody.position.z);
 empMesh.scale.set(1, 1, 1);
 empMesh.visible = true;
 Snd.playEMPDischarge();

 let hitCount = 0;
 for (let ai of aiOpponents) {
  if (ai.isDead) continue;
  const dist = chassisBody.position.distanceTo(ai.chassisBody.position);
  if (dist < 32.0) {
   ai.empStunTimer = 3.8;
   ai.vehicle.applyEngineForce(0, 0);
   ai.vehicle.applyEngineForce(0, 1);
   ai.vehicle.applyEngineForce(0, 2);
   ai.vehicle.applyEngineForce(0, 3);
   ai.vehicle.setBrake(80, 0); ai.vehicle.setBrake(80, 1);
   spawnSparks(ai.chassisBody.position, new T.Vector3(0, 1, 0), 20);
   hitCount++;
  }
 }

 if (dreadnought && dreadnought.isActive && !dreadnought.isDead) {
  if (chassisBody.position.distanceTo(dreadnoughtBody.position) < 32.0) {
   dreadnought.empStunTimer = 3.0;
   hitCount++;
  }
 }

 showBanner(`⚡ EMP ŞOK DALGASI! ${hitCount} ARAÇ FELÇ EDİLDİ!`, 'buff-shield');
 showRadioMessage('EMP şok dalgası patladı! Rakiplerin elektronik aksamı 4 saniye dondu!', 'case');
 addViewers(120000, 'EMP PATLAMASI!');
}
window.triggerEMPBlast = triggerEMPBlast;

// 4. MANYETİK YAPISKAN MAYINLAR (B TUŞU)
let lastMineTime = -99999;
const activeMines = []; window.activeMines = activeMines;
const mineGeo = new T.CylinderGeometry(0.65, 0.65, 0.18, 12);
const mineMat = new T.MeshStandardMaterial({ color: '#161920', roughness: 0.4, metalness: 0.9 });

function deployStickyMine() {
 const now = performance.now();
 if (now - lastMineTime < 8000 || carHealth <= 0) return;
 if (!canUseWeapon('mines')) return;
 lastMineTime = now;
 consumeWeapon('mines');

 const rearPos = new T.Vector3(0, 0.15, -2.4).applyQuaternion(carGroup.quaternion).add(carGroup.position);
 spawnMine(rearPos, null);

 Snd.playMineBeep();
 showBanner('💣 MANYETİK YAPISKAN MAYIN BIRAKILDI!', 'buff-sword');
 showRadioMessage('Manyetik mayın yola bırakıldı! Yaklaşan araca yapışıp patlayacak!', 'case');
}
window.deployStickyMine = deployStickyMine;

// owner: null = oyuncunun mayını (rakiplere yapışır), ai = rakibin mayını (oyuncuya yapışır)
function spawnMine(rearPos, owner) {
 const mineGroup = new T.Group();
 mineGroup.position.copy(rearPos);

 const mMesh = new T.Mesh(mineGeo, mineMat);
 mineGroup.add(mMesh);

 const led = new T.PointLight('#ff1100', 3.0, 8);
 led.position.y = 0.2;
 poolLight(led); // sahneye gerçek ışık eklemek tüm shader'ları yeniden derletirdi
 mineGroup.add(led);

 scene.add(mineGroup);
 activeMines.push({ group: mineGroup, pos: rearPos.clone(), led, life: 30.0, owner, armTime: 0.8 });
}

function updateMines(dt) {
 for (let i = activeMines.length - 1; i >= 0; i--) {
  const m = activeMines[i];
  m.life -= dt;
  m.led.intensity = Math.sin(performance.now() * 0.02) > 0 ? 4.0 : 0.4;

  if (m.life <= 0) {
   scene.remove(m.group);
   activeMines.splice(i, 1);
   continue;
  }

  if (m.armTime > 0) { m.armTime -= dt; continue; } // bırakan araç uzaklaşana kadar pasif

  // Rakip mayını: oyuncuya yapışır
  if (m.owner) {
   const pPos = chassisBody.position;
   const dist = m.pos.distanceTo(pPos);
   if (dist < 6.8 && carHealth > 0) {
    const pull = new T.Vector3().subVectors(pPos, m.pos).normalize().multiplyScalar(14 * dt);
    m.pos.add(pull);
    m.group.position.copy(m.pos);
    if (dist < 2.2) {
     createExplosion(m.pos, 9, 3600);
     applyCarDamage(22 * diffCfg().dmg, m.pos, new T.Vector3(0, 1, 0));
     rumble(1, 350);
     scene.remove(m.group);
     activeMines.splice(i, 1);
     showBanner(`💣 ${m.owner.name} MAYININA BASTIN!`, 'buff-sword');
    }
   }
   continue;
  }

  // AI yaklaşma ve manyetik çekim kontrolü
  for (let ai of aiOpponents) {
   if (ai.isDead) continue;
   const dist = m.pos.distanceTo(ai.chassisBody.position);
   if (dist < 6.8) {
    // Manyetik olarak hedefe doğru kay
    const pull = new T.Vector3().subVectors(ai.chassisBody.position, m.pos).normalize().multiplyScalar(14 * dt);
    m.pos.add(pull);
    m.group.position.copy(m.pos);

    if (dist < 2.2) {
     // Patla!
     createExplosion(m.pos, 11, 4200);
     applyAIDamage(ai, 55, m.pos, new T.Vector3(0, 1, 0), 'mine');
     scene.remove(m.group);
     activeMines.splice(i, 1);
     showBanner(`💣 MAYIN İSABETİ: ${ai.name} HAVAYA UÇTU!`, 'buff-sword');
     break;
    }
   }
  }
 }
}

// 5. DİKENLİ TEL & ÇİVİ TUZAĞI (X TUŞU)
let lastSpikeTime = -99999;
const activeSpikeStrips = []; window.activeSpikeStrips = activeSpikeStrips;
const spikeStripGeo = new T.BoxGeometry(4.2, 0.12, 1.2);
const spikeStripMat = new T.MeshStandardMaterial({ color: '#7f8c8d', roughness: 0.3, metalness: 0.95 });

function deploySpikeStrip() {
 const now = performance.now();
 if (now - lastSpikeTime < 7000 || carHealth <= 0) return;
 if (!canUseWeapon('spikes')) return;
 lastSpikeTime = now;
 consumeWeapon('spikes');

 const rearPos = new T.Vector3(0, 0.06, -2.6).applyQuaternion(carGroup.quaternion).add(carGroup.position);
 const sMesh = new T.Mesh(spikeStripGeo, spikeStripMat);
 sMesh.position.copy(rearPos);
 sMesh.rotation.y = carGroup.rotation.y;
 scene.add(sMesh);

 activeSpikeStrips.push({ mesh: sMesh, pos: rearPos.clone(), life: 25.0 });
 Snd.playMetalSnap();
 showBanner('📌 YOLA DİKENLİ TEL TUZAĞI SERİLDİ!', 'buff-sword');
 showRadioMessage('Dikenli tel şeridi arkamıza serildi! Üzerinden geçen lastiklerini bırakır!', 'case');
}
window.deploySpikeStrip = deploySpikeStrip;

function updateSpikeStrips(dt) {
 for (let i = activeSpikeStrips.length - 1; i >= 0; i--) {
  const st = activeSpikeStrips[i];
  st.life -= dt;
  if (st.life <= 0) {
   scene.remove(st.mesh);
   activeSpikeStrips.splice(i, 1);
   continue;
  }

  for (let ai of aiOpponents) {
   if (ai.isDead) continue;
   const dist = Math.hypot(ai.chassisBody.position.x - st.pos.x, ai.chassisBody.position.z - st.pos.z);
   if (dist < 2.8) {
    ai.flatTireTimer = 4.5;
    ai.chassisBody.angularVelocity.y += (Math.random() < 0.5 ? 5.5 : -5.5);
    spawnSparks(ai.chassisBody.position, new T.Vector3(0, 1, 0), 22);
    Snd.playMetalSnap();
    showBanner(`📌 ${ai.name} DİKENLİ TELE BASTI! LASTİĞİ PATLADI!`, 'buff-sword');
    scene.remove(st.mesh);
    activeSpikeStrips.splice(i, 1);
    break;
   }
  }
 }
}

// 6. HİDROLİK YAN DARBE (SHUNT - Z / C TUŞLARI)
let lastShuntTime = -99999;
function performSideShunt(dir) {
 const now = performance.now();
 if (now - lastShuntTime < 2400 || carHealth <= 0) return;
 lastShuntTime = now;

 const sideDir = new T.Vector3(dir === 'left' ? -1 : 1, 0, 0).applyQuaternion(carGroup.quaternion);
 // Kontrollü Yanal Hız Artışı (Aracı Takla Attırmayan Oturaklı Shunt)
  chassisBody.velocity.x += sideDir.x * 6.2;
  chassisBody.velocity.z += sideDir.z * 6.2;
  chassisBody.angularVelocity.y += (dir === 'left' ? -0.8 : 0.8);

 spawnTireSmoke(carGroup.position);
 Snd.playCrash(0.8);

 // Yanımızdaki araca hasar vur
 for (let ai of aiOpponents) {
  if (ai.isDead) continue;
  const toAI = ai.chassisBody.position.vsub(chassisBody.position);
  if (toAI.length() < 3.4) {
   const aiDir = new T.Vector3(toAI.x, 0, toAI.z).normalize();
   if (sideDir.dot(aiDir) > 0.5) {
    applyAIDamage(ai, 42, ai.chassisBody.position, new T.Vector3(0, 1, 0), 'ram');
    const aiShunt = sideDir.clone().multiplyScalar(18000);
    ai.chassisBody.applyImpulse(new CANNON.Vec3(aiShunt.x, 500, aiShunt.z), ai.chassisBody.position);
    showBanner(`💥 YAN DARBE (SHUNT)! ${ai.name} BİÇİLDİ!`, 'buff-sword');
    showRadioMessage('Tam isabet Frankenstein! Yandan gömdük, duvara yapıştı!', 'case');
    break;
   }
  }
 }
}
window.performSideShunt = performSideShunt;

// 7. SLOW-MOTION ADRENALİN BULLET-TIME (F TUŞU)
let lastBulletTime = -99999;
let bulletTimeActive = false;
let bulletTimeRemaining = 0;
const bulletTimeHudEl = document.getElementById('bullet-time-hud');

function toggleBulletTime() {
 const now = performance.now();
 if (now - lastBulletTime < 18000 || carHealth <= 0) return;
 lastBulletTime = now;
 bulletTimeActive = true;
 bulletTimeRemaining = 4.0;
 timeScale = 0.32;
 if (bulletTimeHudEl) bulletTimeHudEl.style.display = 'block';
 Snd.playPowerup('shield');
 showBanner('⏱️ ADRENALİN BULLET-TIME DEVREDE!', 'buff-shield');
 showRadioMessage('Zaman yavaşladı! Hedeflerini tek tek indir!', 'case');
}
window.toggleBulletTime = toggleBulletTime;

// 8. WEYLAND HELİKOPTERİ HAVA SALDIRISI (U TUŞU)
let lastAirstrikeTime = -99999;
function callHelicopterStrike() {
 const now = performance.now();
 if (now - lastAirstrikeTime < 35000 || carHealth <= 0) return;
 if (!canUseWeapon('strike')) return;
 lastAirstrikeTime = now;
 consumeWeapon('strike');

 // Lider AI'ı bul
 let leaderAI = null;
 let maxDist = -99999;
 for (let ai of aiOpponents) {
  if (ai.isDead) continue;
  if (ai.trackDist > maxDist) { maxDist = ai.trackDist; leaderAI = ai; }
 }

 Snd.playAirRaidSiren();
 showBanner('🚁 WEYLAND SALDIRI HELİKOPTERİ HEDEFE KİLİTLENDİ!', 'buff-sword');
 showRadioMessage('Hava desteği çağrıldı! Weyland helikopteri füzeleri ateşliyor!', 'case');

 setTimeout(() => {
  if (leaderAI && !leaderAI.isDead) {
   createExplosion(leaderAI.chassisBody.position, 14, 5500);
   applyAIDamage(leaderAI, 75, leaderAI.chassisBody.position, new T.Vector3(0, 1, 0), 'airstrike');
   showBanner(`💥 HAVA SALDIRISI İSABETİ! ${leaderAI.name} VURULDU!`, 'buff-sword');
  } else if (dreadnought && dreadnought.isActive && !dreadnought.isDead) {
   createExplosion(dreadnoughtBody.position, 16, 6000);
   dreadnought.health = Math.max(0, dreadnought.health - 90);
   showBanner('💥 HAVA SALDIRISI DREADNOUGHT\'U VURDU!', 'buff-sword');
  }
 }, 2200);
}
window.callHelicopterStrike = callHelicopterStrike;

// 9. KELLE AVI (BOUNTY TARGET) SİSTEMİ
let bountyTargetAI = null;
let bountyTimer = 45.0;
const bountyHudEl = document.getElementById('bounty-hud');

// 3D Kelle Avı (Bounty) Dönen Hedef Göstergesi
const bountyMarkerMat = new T.MeshBasicMaterial({ color: '#ffcc00', wireframe: true });
const bountyMarkerMesh = new T.Mesh(new T.OctahedronGeometry(1.4), bountyMarkerMat);
bountyMarkerMesh.visible = false;
scene.add(bountyMarkerMesh);

const bountyMarkerLight = new T.PointLight('#ffcc00', 3.0, 16);
bountyMarkerMesh.add(bountyMarkerLight);

const bountyNameEl = document.getElementById('bounty-name');

function selectNewBountyTarget() {
 const aliveAIs = aiOpponents.filter(a => !a.isDead);
 if (aliveAIs.length === 0) return;
 bountyTargetAI = aliveAIs[Math.floor(Math.random() * aliveAIs.length)];
 if (bountyHudEl && bountyNameEl) {
  bountyNameEl.textContent = bountyTargetAI.name;
  bountyHudEl.style.display = 'block';
 }
 Snd.playPAChime();
 showBanner(`🎯 YENİ KELLE AVI: ${bountyTargetAI.name}! (+100.000 PTS)`, 'buff-sword');
 showRadioMessage(`Hennessey anonsu: ${bountyTargetAI.name} başına ödül kondu! Onu yok eden zengin olur!`, 'hennessey');
}

// 10. ÇOKLU TAKEDOWN (CHAIN MULTI-KILL COMBO)
let lastTakedownTime = 0;
let comboCount = 0;
const comboHudEl = document.getElementById('combo-hud');
const comboTextEl = document.getElementById('combo-text');

function registerKillCombo() {
 const now = performance.now();
 if (now - lastTakedownTime < 4500) {
  comboCount++;
 } else {
  comboCount = 1;
 }
 lastTakedownTime = now;
 raceStats.takedowns++;

 if (comboCount >= 2) {
  Snd.playComboChime();
  const title = comboCount === 2 ? 'DOUBLE TAKEDOWN! x2 CARNAGE' : (comboCount === 3 ? 'TRIPLE CARNAGE! x3 REYTİNG!' : 'MONSTER RACER! KATLİAM!');
  if (comboHudEl && comboTextEl) {
   comboTextEl.textContent = title;
   comboHudEl.style.display = 'block';
   setTimeout(() => { if (comboHudEl) comboHudEl.style.display = 'none'; }, 2800);
  }
  addViewers(2000000 * comboCount, title);
  playerCredits += 35000 * comboCount;
 }
}

// 11. ARAÇ TAKLA DÜZELTİCİ (ROLL-OVER SELF-RIGHTING)
let upsideDownTimer = 0;
function updateRollOverRecovery(dt) {
 const up = new T.Vector3(0, 1, 0).applyQuaternion(carGroup.quaternion);
 if (up.y < -0.15) {
  upsideDownTimer += dt;
  if (upsideDownTimer > 1.0) {
   upsideDownTimer = 0;
   const curEuler = new T.Euler().setFromQuaternion(carGroup.quaternion, 'YXZ');
   chassisBody.quaternion.setFromEuler(0, curEuler.y, 0);
   chassisBody.position.y = Math.max(chassisBody.position.y + 1.8, 2.2);
   chassisBody.angularVelocity.set(0, 0, 0);
   chassisBody.velocity.set(0, 3.5, 0);
   Snd.playPneumaticPiston();
   showBanner('PNEUMATİK TAKLA DÜZELTİCİ AKTİF!', 'buff-shield');
  }
 } else {
  upsideDownTimer = 0;
 }
}

// 12. DİNAMİK TUR HAVA DÖNGÜSÜ (LAP WEATHER TRANSITION)
function updateLapWeather(newLap) {
 if (newLap === 1) setWeather(3); // 1. Tur: Kızıl Gün Batımı (Dusk)
 else if (newLap === 2) setWeather(2); // 2. Tur: Zifiri Sisli Gece (Night)
 else if (newLap >= 3) setWeather(1); // 3. Tur: Şiddetli Asit Yağmuru (Acid Rain & Dreadnought)
}

// 13. DREADNOUGHT 3-FAZLI PATRON MEKANİĞİ
function updateDreadnoughtPhases() {
 if (!dreadnought.isActive || dreadnought.isDead) return;

 // Faz 2: Can < 350 -> Arka Alevler ve Deniz Mayınları
 if (dreadnought.health < 350 && dreadnought.health >= 150 && !dreadnought.phase2Active) {
  dreadnought.phase2Active = true;
  showBanner('⚠️ DREADNOUGHT FAZ 2: ARKA ALEVLER VE MAYINLAR AÇILDI!', 'buff-sword');
  showRadioMessage('Dikkat Frankenstein! Dreadnought arka alev püskürtücülerini açtı, arkasına yanaşma!', 'case');
 }

 // Faz 3: Can < 150 -> Enraged Ramming Berserk Mode
 if (dreadnought.health < 150 && !dreadnought.phase3Active) {
  dreadnought.phase3Active = true;
  dreadnought.speed = 120 / 3.6; // Hızı artır
  Snd.playAirRaidSiren();
  showBanner('☠ DREADNOUGHT FAZ 3: KUDURMA MODU (ENRAGED)!', 'buff-sword');
  showRadioMessage('Hennessey çıldırdı! Dreadnought tam gaz koçbaşıyla geliyor, kaçın!', 'hennessey');
 }
}

// 14. YARIŞ SONU RAPORU (POST-RACE MODAL)
function showPostRaceStats(isEscape = false) {
 const modal = document.getElementById('post-race-modal');
 if (!modal) return;
 modal.style.display = 'flex';

 document.getElementById('stat-takedowns').textContent = raceStats.takedowns;
 document.getElementById('stat-max-speed').textContent = Math.round(raceStats.maxSpeed) + ' km/sa';
 document.getElementById('stat-nearmiss').textContent = raceStats.nearMisses;
 document.getElementById('stat-drift').textContent = Math.round(raceStats.driftScore) + ' PTS';
 document.getElementById('stat-credits').textContent = '+' + fmtTR(Math.max(0, playerCredits - raceStartCredits)) + ' PTS';
 const tdEl = document.getElementById('stat-td-types');
 if (tdEl) {
  const tt = raceStats.takedownTypes || {};
  const parts = Object.keys(tt).map(k => `${TAKEDOWN_TYPES[k] ? TAKEDOWN_TYPES[k].name : k} ×${tt[k]}`);
  tdEl.textContent = parts.length ? parts.join(' · ') : '—';
 }
 const rankEl = document.getElementById('stat-rank');
 if (rankEl) rankEl.textContent = isEscape ? 'KAÇTI' : `${raceStats.finishRank || playerRank}. SIRA (+${fmtTR(raceStats.finishReward || 0)})`;
 const nextBtn = document.getElementById('post-race-next');
 const careerPassed = !!(activeCareerEvent && raceStats.careerText && raceStats.careerText.startsWith('✅'));
 if (nextBtn) nextBtn.style.display = careerPassed ? 'inline-block' : 'none';
 const retryBtn = document.getElementById('post-race-retry');
 // Kariyerde etap geçildiyse "yeniden başlat" sıradaki etabı açar; ayrı "tekrar" düğmesi gizlenir
 if (retryBtn) retryBtn.style.display = careerPassed ? 'none' : 'inline-block';
 const careerEl = document.getElementById('post-race-career');
 if (careerEl) { careerEl.textContent = raceStats.careerText || ''; careerEl.style.display = raceStats.careerText ? 'block' : 'none'; }
 document.getElementById('stat-viewers').textContent = fmtTR(currentViewers);

 const titleEl = document.getElementById('post-race-mvp-title');
 if (titleEl) {
  if (isEscape) titleEl.textContent = 'MVP: ÖZGÜRLÜK SAVAŞÇISI (ADADAN KAÇTI)';
  else if ((raceStats.finishRank || playerRank) === 1) titleEl.textContent = '🏆 ŞAMPİYON: FRANKENSTEIN (1. SIRA)';
  else if (raceStats.takedowns >= 3) titleEl.textContent = 'MVP: TERMINAL ISLAND KASABI (3+ TAKEDOWN)';
  else titleEl.textContent = 'MVP: FRANKENSTEIN (ARENA ŞAMPİYONU)';
 }
}
window.showPostRaceStats = showPostRaceStats;

function setPlateVisualActive(p, active) {
 if (p.visualActive === active) return; // her karede renk yazmamak için
 p.visualActive = active;
 const col = p.type === 'sword' ? 0xff6600 : (p.type === 'shield' ? 0x00bfff : 0xe74c3c);
 p.innerMesh.material.color.setHex(active ? col : 0x333333);
 p.beamMesh.visible = active;
 if (p.holoMesh) p.holoMesh.visible = active;
 if (p.pLight) p.pLight.intensity = active ? 1.8 : 0;
}

function updateActivationPlates(dt) {
 const carP = chassisBody.position;
 const platesLive = weaponsUnlimited() || currentStage >= 2;

 for (let p of activationPlates) {
  if (!platesLive) { setPlateVisualActive(p, false); continue; } // 1. etapta plakalar sönük ve etkisiz
  if (p.cooldown > 0) {
   p.cooldown -= dt;
   setPlateVisualActive(p, false);
   continue;
  } else {
   setPlateVisualActive(p, true);
  }

  const dx = carP.x - p.x;
  const dz = carP.z - p.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < p.radius) {
   p.cooldown = 12.0;
   if (p.type === 'sword') {
    addArmory('gun', 150); addArmory('rockets', 2); addArmory('emp', 1);
    overdriveTimer = 4.0; gunHeat = 0;
    Snd.playPowerup('sword');
    showBanner('⚔ SİLAHLAR AKTİF: +150 MERMİ · +2 ROKET · +1 EMP', 'buff-sword');
    showRadioMessage('Kılıç aktif! Ateş hızımız iki katına çıktı, tara şunları!');
    addViewers(80000, 'KILIÇ AKTİF!');
   } else if (p.type === 'shield') {
    addArmory('oil', 1); addArmory('mines', 1); addArmory('spikes', 1); addArmory('smoke', 1);
    shieldTimer = 9.0;
    const maxHP = 100 + (upgrades.armor - 1) * 35;
    carHealth = Math.min(maxHP, carHealth + 45);
    shieldMesh.visible = true;
    Snd.playPowerup('shield');
    showBanner('🛡 SAVUNMA AKTİF: +45 ZIRH · YAĞ · MAYIN · DİKEN · DUMAN', 'buff-shield');
    showRadioMessage('Kalkan devrede! Zırh onarıldı, güvenle dalabiliriz!');
    addViewers(60000, 'KALKAN AKTİF!');
   
    } else if (p.type === 'skull') {
     triggerFlameJet(p.x - 3, p.z - 3); triggerFlameJet(p.x + 3, p.z - 3);
     triggerFlameJet(p.x - 3, p.z + 3); triggerFlameJet(p.x + 3, p.z + 3);
     // Fabrika preslerini anında yere indir
     for (let c of HANGAR_CRUSHERS) { c.group.position.y = 1.8; c.lastSlamTime = performance.now(); }
     // Konteyner vinci hasar alıp sarsılsın
     if (craneStructure && !craneStructure.isCollapsed) craneStructure.onHit(40);
     Snd.playImpact();
     addArmory('strike', 1);
     showBanner('☠ TUZAKLAR TETİKLENDİ · +1 HAVA SALDIRISI [U]', 'buff-sword');
     showRadioMessage('Kafatası tuzağı tetiklendi! Arkamızdaki yol cehenneme döndü!', 'case');
     addViewers(150000, 'TUZAK TETİKLENDİ!');
    }

   continue;
  }

  for (let ai of aiOpponents) {
   if (ai.isDead) continue;
   const adx = ai.chassisBody.position.x - p.x;
   const adz = ai.chassisBody.position.z - p.z;
   if (Math.sqrt(adx * adx + adz * adz) < p.radius) {
    p.cooldown = 12.0;
    if (p.type === 'sword') {
     ai.gunAmmo = Math.min(300, (ai.gunAmmo || 0) + 150);
     ai.rockets = Math.min(2, (ai.rockets || 0) + 1);
     ai.overdriveTimer = 4.0;
     showBanner(`${ai.name} KILIÇ PLAKASINI ALDI!`, 'buff-sword');
     showRadioMessage(`Dikkat! ${ai.name} kılıç plakasını aldı, saklan!`);
    } else if (p.type === 'shield') {
     ai.shieldTimer = 8.0; ai.health = Math.min(100, ai.health + 40);
     ai.defense = Math.min(4, (ai.defense || 0) + 2);
     showBanner(`${ai.name} KALKANLA KORUNDU!`, 'buff-shield');
    } else if (p.type === 'skull') {
     triggerFlameJet(p.x - 2, p.z - 2); triggerFlameJet(p.x + 2, p.z - 2);
     applyAIDamage(ai, 30, ai.chassisBody.position, new T.Vector3(0, 1, 0), 'trap');
     showBanner(`${ai.name} ALEV TUZAĞINA YAKALANDI!`, 'buff-sword');
     showRadioMessage(`Güzel! ${ai.name} alev tuzağına düştü!`);
    }
    break;
   }
  }
 }

 if (overdriveTimer > 0) overdriveTimer -= dt;
 if (shieldTimer > 0) {
  shieldTimer -= dt;
  shieldMesh.visible = true;
  shieldMesh.position.copy(chassisBody.position);
  shieldMesh.rotation.y += 2.5 * dt;
 } else {
  shieldMesh.visible = false;
 }

 for (let i = activeFlameJets.length - 1; i >= 0; i--) {
  const f = activeFlameJets[i];
  f.life -= dt;
  if (f.life <= 0) { scene.remove(f.mesh); activeFlameJets.splice(i, 1); }
  else { f.mesh.material.opacity = f.life / f.maxLife; }
 }

 if (bannerTimer > 0) {
  bannerTimer -= dt;
  if (bannerTimer <= 0) bannerEl.className = '';
 }
 updateBannerQueue();

 if (radioTimer > 0) {
  radioTimer -= dt;
  if (radioTimer <= 0) radioBoxEl.className = '';
 }

 // Önceden her karede innerHTML = '' + += ile HTML yeniden ayrıştırılıp layout tetikleniyordu.
 // Artık yalnızca gösterilen metin (0.1 sn çözünürlükte) değiştiğinde DOM'a yazılır.
 let buffHtml = '';
 if (overdriveTimer > 0) buffHtml += `<div class="buff-tag buff-sword">OVERDRIVE: ${overdriveTimer.toFixed(1)}s</div>`;
 if (shieldTimer > 0) buffHtml += `<div class="buff-tag buff-shield">KALKAN: ${shieldTimer.toFixed(1)}s</div>`;
 if (buffHtml !== lastBuffHtml) { lastBuffHtml = buffHtml; buffBoxEl.innerHTML = buffHtml; }
}
let lastBuffHtml = null;


/* ==========================================================
   HARİTA GENİŞLETMESİ: FABRİKA PİT ALANI & KALE KAÇIŞ KAPISI
   ========================================================== */
// 1. FABRİKA PİT ALANI (PIT-STOP & REPAIR BAY)
const pitBayGroup = new T.Group();
const pitFloorGeo = new T.PlaneGeometry(16, 90);
const pitFloorMat = new T.MeshStandardMaterial({ color: '#0d1512', roughness: 0.7, metalness: 0.6 });
const pitFloor = new T.Mesh(pitFloorGeo, pitFloorMat);
pitFloor.rotation.x = -Math.PI / 2;
pitFloor.position.set(215.0, 0.022, 160.0);
pitBayGroup.add(pitFloor);

// Pit Bay Neon Bordür Çizgileri
const pitBorderMat = new T.MeshBasicMaterial({ color: '#2ecc71' });
const pitBorderL = new T.Mesh(new T.BoxGeometry(0.5, 0.1, 90), pitBorderMat);
pitBorderL.position.set(207.0, 0.04, 160.0);
pitBayGroup.add(pitBorderL);
const pitBorderR = new T.Mesh(new T.BoxGeometry(0.5, 0.1, 90), pitBorderMat);
pitBorderR.position.set(223.0, 0.04, 160.0);
pitBayGroup.add(pitBorderR);

// Pit Stop Takı & Tabelası
const pitArchMat = new T.MeshStandardMaterial({ color: '#1a241d', roughness: 0.5, metalness: 0.8 });
const pitArchLeft = new T.Mesh(new T.BoxGeometry(0.8, 8, 0.8), pitArchMat);
pitArchLeft.position.set(207.0, 4.0, 115.0); pitBayGroup.add(pitArchLeft);
const pitArchRight = new T.Mesh(new T.BoxGeometry(0.8, 8, 0.8), pitArchMat);
pitArchRight.position.set(223.0, 4.0, 115.0); pitBayGroup.add(pitArchRight);
const pitArchTop = new T.Mesh(new T.BoxGeometry(16.8, 1.4, 0.8), pitArchMat);
pitArchTop.position.set(215.0, 8.0, 115.0); pitBayGroup.add(pitArchTop);

const pitSignMesh = new T.Mesh(new T.PlaneGeometry(14, 1.1), new T.MeshBasicMaterial({ color: '#2ecc71' }));
pitSignMesh.position.set(215.0, 8.0, 114.5);
pitBayGroup.add(pitSignMesh);

const pitLight = new T.PointLight('#2ecc71', 2.5, 30);
pitLight.position.set(215.0, 5.0, 160.0);
pitBayGroup.add(pitLight);
scene.add(pitBayGroup);
pitBayGroup.userData.staticBatch = true;

// 2. DOĞU KALESİ GİRİŞ TAKI & OKYANUS KARGO GEMİSİ (AÇIK PİST GEÇİŞİ)
const fortressGateGroup = new T.Group();
const gatePillarMat = new T.MeshStandardMaterial({ color: '#1e222b', roughness: 0.6, metalness: 0.8 });
const gateDoorMat = new T.MeshStandardMaterial({ color: '#8a1f11', roughness: 0.5, metalness: 0.7 });

// Yan Sütunlar (Pist genişliği 26m, sütunlar X=-16 ve +16'da - yoldan tamamen dışarıda)
const gPillarL = new T.Mesh(new T.BoxGeometry(2.5, 12, 2.5), gatePillarMat);
gPillarL.position.set(-16.0, 6.0, 810.0); fortressGateGroup.add(gPillarL);
const gPillarR = new T.Mesh(new T.BoxGeometry(2.5, 12, 2.5), gatePillarMat);
gPillarR.position.set(16.0, 6.0, 810.0); fortressGateGroup.add(gPillarR);

// Yüksek Üst Kiriş (Y=11.5m - araçların üzerinden yüksekte, ferah geçiş)
const gBeamTop = new T.Mesh(new T.BoxGeometry(34.5, 2.2, 2.5), gatePillarMat);
gBeamTop.position.set(0, 11.5, 810.0); fortressGateGroup.add(gBeamTop);

// Kale Giriş Kapıları: Yolu ASLA kapatmaz, yan sütunlara 90 derece sonuna kadar açık monte edilmiştir!
const gateDoorL = new T.Mesh(new T.BoxGeometry(11.5, 8.5, 0.6), gateDoorMat);
gateDoorL.position.set(-15.5, 5.0, 810.0);
gateDoorL.rotation.y = -Math.PI / 2;
fortressGateGroup.add(gateDoorL);

const gateDoorR = new T.Mesh(new T.BoxGeometry(11.5, 8.5, 0.6), gateDoorMat);
gateDoorR.position.set(15.5, 5.0, 810.0);
gateDoorR.rotation.y = Math.PI / 2;
fortressGateGroup.add(gateDoorR);

// Yeşil Güvenli Geçiş Portalı Işığı
const gateAlarmLight = new T.PointLight('#00ff66', 3.0, 45);
gateAlarmLight.position.set(0, 13.0, 810.0); fortressGateGroup.add(gateAlarmLight);

// Okyanustaki Kargo Gemisi (Pistin dışında, batı okyanusunda X=-120, Z=800'de demirli)
const cargoShipGroup = new T.Group();
cargoShipGroup.position.set(-120.0, 0, 800.0);
const shipHull = new T.Mesh(new T.BoxGeometry(36, 12, 110), new T.MeshStandardMaterial({ color: '#1a1f26', roughness: 0.8, metalness: 0.5 }));
shipHull.position.set(0, 1.0, 0); cargoShipGroup.add(shipHull);
const shipDeck = new T.Mesh(new T.BoxGeometry(32, 1.2, 95), new T.MeshStandardMaterial({ color: '#c0392b', roughness: 0.6 }));
shipDeck.position.set(0, 7.2, 0); cargoShipGroup.add(shipDeck);
fortressGateGroup.add(cargoShipGroup);

scene.add(fortressGateGroup);
fortressGateGroup.userData.staticBatch = true;

// Sütunlar için yan fizik gövdeleri (Yolun tamamen dışarısında, X=±16m)
const gatePillarBodyL = new CANNON.Body({ mass: 0, material: groundMat });
gatePillarBodyL.addShape(new CANNON.Box(new CANNON.Vec3(1.25, 6.0, 1.25)));
gatePillarBodyL.position.set(-16.0, 6.0, 810.0);
world.addBody(gatePillarBodyL);

const gatePillarBodyR = new CANNON.Body({ mass: 0, material: groundMat });
gatePillarBodyR.addShape(new CANNON.Box(new CANNON.Vec3(1.25, 6.0, 1.25)));
gatePillarBodyR.position.set(16.0, 6.0, 810.0);
world.addBody(gatePillarBodyR);

// Kargo Gemisi Güverte Fizik Gövdesi (Batı Okyanusunda X=-120, Z=800)
const shipDeckBody = new CANNON.Body({ mass: 0, material: groundMat });
shipDeckBody.addShape(new CANNON.Box(new CANNON.Vec3(16.0, 1.0, 48.0)));
shipDeckBody.position.set(-120.0, 7.0, 800.0);
world.addBody(shipDeckBody);

// NOT: gateDoorBody (yolu kapatan kırmızı duvar) KALDIRILDI! Yol 7/24 tamamen açıktır.
let isGateBreached = true;
function breachFortressGate() {
 showBanner('KALE GEÇİŞİ VE LİMAN AÇIK! ADADAN KAÇIŞ MÜMKÜN!', 'buff-sword');
}
window.breachFortressGate = breachFortressGate;

function triggerEscapeVictory() {
 if (isEscaped) return;
 isEscaped = true;
 timeScale = 0.2;
 Snd.playTakedownSting();
 createExplosion(chassisBody.position, 16, 6000);
 if (escapeVictoryModalEl) escapeVictoryModalEl.style.display = 'flex';
 showBanner('ADADAN KAÇIŞ BAŞARILI! ÖZGÜRLÜK!', 'buff-shield');
 showRadioMessage('BAŞARDIK! Kargo gemisine indik! Terminal Island cehennemi bitti!', 'case');
 addViewers(25000000, 'ADADAN KAÇIŞ ZAFERİ!');
 playerCredits += 500000; // modalda vaat edilen ödül önceden hiç verilmiyordu
 if (activeCareerEvent) careerResult(1); // limandan kaçış etabı birincilikle geçmiş sayılır
 if (currencyValEl) currencyValEl.textContent = fmtTR(playerCredits);
 saveProgress();
}

let lastLapTxt = '';
let lastElimTxt = '';
let raceFinished = false;
let raceCountdown = 0;
let lastCountdownShown = -1;
const countdownEl = document.getElementById('countdown');
function updateCountdown(dt) {
 if (raceCountdown <= 0) return;
 raceCountdown -= dt;
 const n = Math.ceil(raceCountdown);
 if (n !== lastCountdownShown) {
  lastCountdownShown = n;
  if (countdownEl) {
   countdownEl.textContent = n > 0 ? String(n) : 'BAŞLA!';
   countdownEl.className = 'show' + (n > 0 ? '' : ' go');
  }
  if (n > 0) Snd.playCheckpoint(); else Snd.playPowerup('sword');
 }
 if (raceCountdown <= 0) {
  // Tur süresi ve hayalet kaydı yeşil ışıkla başlar
  lapStartTime = performance.now();
  resetGhostRecording();
  setTimeout(() => { if (countdownEl && raceCountdown <= 0) countdownEl.className = ''; }, 700);
 }
}
let raceStartCredits = 150000;
const FINISH_REWARDS = [300000, 150000, 75000, 40000, 20000];

function finishRace() {
 if (raceFinished) return;
 raceFinished = true;
 // Bitiş anındaki gerçek sıralamayı hesapla
 ratingsThrottleTimer = 1;
 updateRatingsAndRanks(0);
 const reward = Math.round((FINISH_REWARDS[playerRank - 1] || 20000) * (activeCareerEvent ? activeCareerEvent.reward : 1));
 playerCredits += reward;
 raceStats.careerText = activeCareerEvent ? careerResult(playerRank) : '';
 if (currencyValEl) currencyValEl.textContent = fmtTR(playerCredits);
 raceStats.finishRank = playerRank;
 raceStats.finishReward = reward;
 saveProgress();
 Snd.playTakedownSting();
 showBanner(playerRank === 1 ? '🏆 YARIŞI BİRİNCİ BİTİRDİN!' : `🏁 YARIŞ BİTTİ! ${playerRank}. SIRA`, 'buff-shield');
 showRadioMessage(playerRank === 1 ? 'Kazandık Frankenstein! Terminal Island şampiyonu sensin!' : `Yarış bitti, ${playerRank}. sıradayız. Garajda güçlenip tekrar deneyelim!`, 'case');
 timeScale = 0.35;
 setTimeout(() => { timeScale = 1.0; showPostRaceStats(false); }, 1600);
}

function updateCheckpoints(dt) {
 if (raceFinished || raceCountdown > 0 || !isGameStarted) return;
 const carP = chassisBody.position;
 const cp = CHECKPOINTS[currentCheckpoint];
 const dx = carP.x - cp.pos.x;
 const dz = carP.z - cp.pos.z;
 const dist = Math.sqrt(dx * dx + dz * dz);

 if (dist < cp.radius) {
  if (currentCheckpoint === 0 && currentLapTime > 10000) {
   const lapMs = currentLapTime;
   if (!bestLapTime || lapMs < bestLapTime) {
    bestLapTime = lapMs;
    bestTimeEl.textContent = formatTime(bestLapTime);
   }
   showBanner(`TUR ${lapCount} TAMAMLANDI! (${formatTime(lapMs)})`);
   showRadioMessage(`Tur ${lapCount} bitti! Harika sürüyorsun Frankenstein!`);
   addViewers(250000, `TUR ${lapCount} TAMAMLANDI!`);
   Snd.playCheckpoint();
   // Önceden 3. turdan sonra sayaç 1'e dönüyor ve yarış hiç bitmiyordu
   onGhostLapCompleted(lapMs);
   if (lapCount >= MAX_LAPS) { finishRace(); return; }
   lapCount = lapCount + 1;
   updateLapWeather(lapCount);
   lapNumEl.textContent = lapCount;
   lapStartTime = performance.now();
   resetGhostRecording();

   
    // Çok Aşamalı Yarış & Senaryo Geçişleri
    if (lapCount === 2) {
     currentStage = 2;
     updateStageHUD();
     showBanner('2. ETAP: SİLAH PLAKALARI AKTİF! ⚔ PLAKADAN GEÇ, SİLAHLAN!', 'buff-sword');
     showRadioMessage('Plakalar açıldı Frankenstein! Kılıç plakası silah, kalkan plakası savunma verir. Üzerinden geç!', 'case');
     Snd.playPowerup('sword');
    } else if (lapCount >= 3) {
     currentStage = 3;
     updateStageHUD();
     if (!dreadnought.isActive) activateDreadnought();
     breachFortressGate();
     Snd.playAirRaidSiren();
     showBanner('3. ETAP: THE DREADNOUGHT SAHADA! KALE KAPISI AÇILDI!', 'buff-sword');
     showRadioMessage('Dreadnought sahada! İster yarışı 1. bitir, ister limandaki kale kapısından atlayıp adadan kaç!', 'hennessey');
    }

  } else if (currentCheckpoint > 0) {
   Snd.playCheckpoint();
  }
  currentCheckpoint = (currentCheckpoint + 1) % CHECKPOINTS.length;
 }

 currentLapTime = performance.now() - lapStartTime;
 const lapTxt = formatTime(currentLapTime);
 if (lapTxt !== lastLapTxt) { lastLapTxt = lapTxt; lapTimeEl.textContent = lapTxt; }

 // Eleme Modu Sayacı Güncellemesi
 if (!aiFireEnabled || raceSetting('elimination') === 'off' || raceFinished) { return; }
 eliminationTimer -= dt;
 if (eliminationTimerEl) {
  const elimTxt = `${Math.max(0, eliminationTimer).toFixed(1)}s`;
  if (elimTxt !== lastElimTxt) { lastElimTxt = elimTxt; eliminationTimerEl.textContent = elimTxt; }
 }

 if (eliminationTimer <= 0) {
  eliminationTimer = raceSetting('elimination') === '30s' ? 30.0 : 45.0; // Sayacı seçili ayara göre sıfırla

  // O anki en son sıradaki aracı bul ve patlat! (sıralama sistemiyle aynı tur-farkındalıklı mesafe)
  const racers = [{ id: 'player', name: 'FRANKENSTEIN', totalDist: playerRankState.raceDist || 0, isPlayer: true, health: carHealth }];

  for (let ai of aiOpponents) {
   if (ai.isDead) continue;
   racers.push({ id: ai.id, name: ai.name, totalDist: ai.raceDist || 0, isPlayer: false, ai });
  }

  racers.sort((a, b) => b.totalDist - a.totalDist);
  const lastRacer = racers[racers.length - 1];

  if (lastRacer) {
   if (lastRacer.isPlayer) {
    showBanner('SÜRE BİTTİ! SONUNCU OLDUN VE ELENDİN!', 'buff-sword');
    applyCarDamage(999);
   } else {
    showBanner(`ELEME! ${lastRacer.name} SONUNCU KALDI VE ELENDİ!`, 'buff-sword');
    showRadioMessage(`${lastRacer.name} süresi doldu ve havaya uçtu!`);
    applyAIDamage(lastRacer.ai, 999, null, null, 'elimination');
   }
  }
 }
}

/* ==========================================================
   LİDER TABLOSU, REYTİNG & SIRALAMA GÜNCELLEMESİ
   ========================================================== */
let ratingsThrottleTimer = 0;
const rivalHudEls = [];
let lastPlayerTrackIndex = 0;

// Pist ilerlemesi başlangıç çizgisinde TRACK_LENGTH'ten 0'a sarar. Önceden rakiplerin lapCount'u hiç
// artmadığı için çizgiyi geçen rakip sıralamada en sona düşüyordu. Artık her araç için sarma algılanıp
// tur sayısı (rankLaps) tutulur; çizginin gerisinde başlayan araçlar -1. turda başlar.
function updateRaceDistance(state, progressDist) {
 if (state.rankPrev === undefined) {
  state.rankLaps = progressDist > TRACK_LENGTH * 0.5 ? -1 : 0;
 } else if (state.rankPrev > TRACK_LENGTH * 0.75 && progressDist < TRACK_LENGTH * 0.25) {
  state.rankLaps++;
 } else if (state.rankPrev < TRACK_LENGTH * 0.25 && progressDist > TRACK_LENGTH * 0.75) {
  state.rankLaps--;
 }
 state.rankPrev = progressDist;
 state.raceDist = state.rankLaps * TRACK_LENGTH + progressDist;
 return state.raceDist;
}
const playerRankState = {};
let lastRankMsgTime = 0;

function updateRatingsAndRanks(dt) {
 ratingsThrottleTimer += dt;
 if (ratingsThrottleTimer < 0.2) return;
 ratingsThrottleTimer = 0;

 targetViewers += (Math.random() - 0.49) * 1200 * 0.2;
 currentViewers = Math.round(currentViewers + (targetViewers - currentViewers) * 0.08);
 if (viewersValEl) viewersValEl.textContent = fmtTR(currentViewers);

 const playerProgress = getTrackDistance(chassisBody.position, lastPlayerTrackIndex);
 lastPlayerTrackIndex = playerProgress.index;
 const playerTotalDist = updateRaceDistance(playerRankState, playerProgress.distance);

 const racers = [
  { id: 'player', name: 'FRANKENSTEIN', totalDist: playerTotalDist, isPlayer: true }
 ];

 for (let ai of aiOpponents) {
  ai.lastTrackIndex = (ai.lastTrackIndex !== undefined) ? ai.lastTrackIndex : 0;
  const aiProgress = getTrackDistance(ai.chassisBody.position, ai.lastTrackIndex);
  ai.lastTrackIndex = aiProgress.index;
  const aiRaceDist = updateRaceDistance(ai, aiProgress.distance);
  const aiTotalDist = ai.isDead ? -9999 : aiRaceDist;
  racers.push({ id: ai.id, name: ai.name, totalDist: aiTotalDist, isPlayer: false });
 }

 racers.sort((a, b) => b.totalDist - a.totalDist);
 const newRank = racers.findIndex(r => r.isPlayer) + 1;

 if (newRank !== playerRank) {
  // Rakiple yan yana giderken sıra sürekli değişip her seferinde telsiz mesajı çıkıyordu: 8 sn bekleme
  const tNow = performance.now();
  if (newRank < playerRank && tNow - lastRankMsgTime > 8000) {
   lastRankMsgTime = tNow;
   showBanner(`${newRank}. SIRAYA YÜKSELDİN!`, 'buff-sword');
   showRadioMessage(newRank === 1 ? 'Lideriz Frankenstein! Yerimizi koru!' : `${newRank}. sıraya çıktık, öndekini avla!`);
   addViewers(75000);
  }
  playerRank = newRank;
 }

 if (posValEl) posValEl.textContent = playerRank;
 updatePartsSpeedHUD();

 const maxHP = 100 + (upgrades.armor - 1) * 35;
 const hpPct = Math.round((carHealth / maxHP) * 100);
 if (playerHpTxt) playerHpTxt.textContent = `${hpPct}%`;
 if (playerRivalFill) playerRivalFill.style.width = `${hpPct}%`;

 for (let i = 0; i < 4; i++) {
  const ai = aiOpponents[i];
  const els = rivalHudEls[i] || (rivalHudEls[i] = { hp: document.getElementById(`ai${i}-hp-txt`), fill: document.getElementById(`ai${i}-rival-fill`), last: '' });
  if (ai && els.hp && els.fill) {
   const key = ai.isDead ? 'dead' : String(Math.round(ai.health));
   if (key === els.last) continue;
   els.last = key;
   els.hp.textContent = ai.isDead ? 'İMHA' : `${key}%`;
   els.fill.style.width = `${ai.isDead ? 0 : key}%`;
   els.fill.style.background = ai.isDead ? '#555' : '#e74c3c';
  }
 }

 updateWeaponsHUD();
}

// Silah yuvaları: kilit (1. etap), boş (plakadan doldur), bekleme ve hazır durumları + kalan cephane
const WEAPON_SLOTS = [
 { kind: 'gun', icon: '🔫', key: 'SOL TIK', name: 'MİNİGUN' },
 { kind: 'rockets', icon: '🚀', key: 'K', name: 'ROKET', cd: () => [lastRPGTime, 4500] },
 { kind: 'emp', icon: '⚡', key: 'E', name: 'EMP', cd: () => [lastEMPTime, 14000] },
 { kind: 'mines', icon: '💣', key: 'B', name: 'MAYIN', cd: () => [lastMineTime, 8000] },
 { kind: 'oil', icon: '🛢️', key: 'Q', name: 'YAĞ', cd: () => [lastOilTime, 5000] },
 { kind: 'spikes', icon: '📌', key: 'X', name: 'DİKEN', cd: () => [lastSpikeTime, 7000] },
 { kind: 'smoke', icon: '💨', key: 'L', name: 'DUMAN', cd: () => [lastSmokeTime, 3000] },
 { kind: 'strike', icon: '🚁', key: 'U', name: 'HAVA SALDIRISI', cd: () => [lastAirstrikeTime, 35000] },
 { kind: null, icon: '⏱️', key: 'F', name: 'ODAK', cd: () => [lastBulletTime, 18000] },
 { kind: null, icon: '💥', key: 'Z/C', name: 'YAN DARBE', cd: () => [lastShuntTime, 2400] }
];
let lastWeaponsHudHtml = '';
function updateWeaponsHUD() {
 const el = document.getElementById('weapons-hud');
 if (!el) return;
 const now = performance.now();
 const locked = weaponsLocked();
 let html = '';
 for (const w of WEAPON_SLOTS) {
  let state = 'ready', count = '';
  if (w.kind) {
   if (locked) state = 'locked';
   else if (!weaponsUnlimited() && armory[w.kind] <= 0) state = 'empty';
   if (!weaponsUnlimited() && !locked) count = ` <b class="wep-count">${armory[w.kind]}</b>`;
  }
  if (state === 'ready' && w.cd) {
   const [t0, dur] = w.cd();
   if (now - t0 < dur) state = 'cooling';
  }
  const icon = state === 'locked' ? '🔒' : w.icon;
  // Sabit etiketler + sayı (kullanıcı girdisi yok) — innerHTML güvenli
  html += `<div class="wep-slot ${state}" title="${w.name} [${w.key}]">${icon} <span class="wep-key">${w.key}</span> <span class="wep-name">${w.name}</span>${count}</div>`;
 }
 if (html !== lastWeaponsHudHtml) { lastWeaponsHudHtml = html; el.innerHTML = html; }
}

/* ==========================================================
   GRAFİK KALİTESİ (DÜŞÜK / ORTA / YÜKSEK / OTOMATİK)
   ==========================================================
   Düşük: 0.75x çözünürlük, gölge yok · Orta: 1x, gölge · Yüksek: ekran DPR'si (en fazla 2x), gölge
   Otomatik: Yüksek ile başlar, kare süresi 20 ms'yi aşarsa çözünürlüğü kademeli düşürür, rahatlarsa geri yükseltir. */
const QUALITY_PRESETS = {
 low: { pr: 0.75, shadows: false },
 medium: { pr: 1.0, shadows: true },
 high: { pr: 2.0, shadows: true },
 auto: { pr: 2.0, shadows: true }
};
let qualityMaxPR = 1;
let qualityPR = 1;
let autoResTimer = 0, autoResSum = 0, autoResFrames = 0, autoResCalm = 0;
function applyQuality(q) {
 const p = QUALITY_PRESETS[q] || QUALITY_PRESETS.high;
 const dpr = window.devicePixelRatio || 1;
 qualityMaxPR = q === 'low' ? Math.min(1, dpr) * p.pr : Math.min(p.pr, dpr);
 qualityPR = qualityMaxPR;
 renderer.setPixelRatio(qualityPR);
 resize();
 // Gölge açma/kapama ışık durumunu değiştirdiği için tek seferlik shader yeniden derlemesi olur (yalnızca ayar değişiminde)
 if (sun.castShadow !== p.shadows) {
  sun.castShadow = p.shadows;
  try { renderer.compileAsync(scene, camera); } catch (e) {}
 }
 autoResTimer = autoResSum = autoResFrames = autoResCalm = 0;
}
function updateAutoResolution(frameMs) {
 if (customization.quality !== 'auto') return;
 autoResSum += frameMs; autoResFrames++; autoResTimer += frameMs;
 if (autoResTimer < 2000) return;
 const avg = autoResSum / autoResFrames;
 autoResTimer = autoResSum = autoResFrames = 0;
 if (avg > 20 && qualityPR > 0.6) {
  qualityPR = Math.max(0.6, qualityPR - 0.15);
  renderer.setPixelRatio(qualityPR); resize();
  autoResCalm = 0;
 } else if (avg < 12 && qualityPR < qualityMaxPR) {
  if (++autoResCalm >= 3) {
   qualityPR = Math.min(qualityMaxPR, qualityPR + 0.1);
   renderer.setPixelRatio(qualityPR); resize();
   autoResCalm = 0;
  }
 } else {
  autoResCalm = 0;
 }
}

/* ==========================================================
   KARİYER MODU
   ==========================================================
   5 etaplık seri. Her etap kendi tur sayısı, zorluğu, saldırganlığı ve eleme ayarıyla oynanır;
   gereken sıraya girilirse sonraki etap açılır. Ödül çarpanı etap ilerledikçe artar. */
const CAREER_EVENTS = [
 { name: 'ÇAYLAK TURU', laps: 2, difficulty: 'easy', aiAggression: 'normal', elimination: 'off', needRank: 3, reward: 1.0 },
 { name: 'KAN KOKUSU', laps: 3, difficulty: 'normal', aiAggression: 'normal', elimination: '45s', needRank: 3, reward: 1.25 },
 { name: 'KASAP PİSTİ', laps: 3, difficulty: 'normal', aiAggression: 'brutal', elimination: '45s', needRank: 2, reward: 1.5 },
 { name: 'DREADNOUGHT AVI', laps: 3, difficulty: 'hard', aiAggression: 'normal', elimination: '30s', needRank: 2, reward: 1.75 },
 { name: 'FİNAL: TERMINAL ISLAND', laps: 3, difficulty: 'hard', aiAggression: 'brutal', elimination: '30s', needRank: 1, reward: 2.5 }
];
let careerProgress = { event: 0, done: false };
let activeCareerEvent = null;

function careerEventIndex(ev) { return CAREER_EVENTS.indexOf(ev); }
function startCareerEvent(ev) {
 const idx = careerEventIndex(ev);
 const goalEl = document.getElementById('career-goal');
 if (goalEl) { goalEl.textContent = `🏆 KARİYER ${idx + 1}/${CAREER_EVENTS.length}: ${ev.name} · HEDEF: EN AZ ${ev.needRank}.`; goalEl.style.display = 'inline-block'; }
 MAX_LAPS = ev.laps;
 const totalEl = document.getElementById('lap-total');
 if (totalEl) totalEl.textContent = ev.laps;
 eliminationTimer = ev.elimination === '30s' ? 30.0 : 45.0;
 const elimEl = document.getElementById('elimination-hud');
 if (elimEl) elimEl.style.display = ev.elimination === 'off' ? 'none' : 'block';
 setTimeout(() => {
  showBanner(`🏆 KARİYER ETAP ${idx + 1}/${CAREER_EVENTS.length}: ${ev.name} — EN AZ ${ev.needRank}. OL!`, 'buff-shield');
 }, 2600);
}
// Etap sonucunu işler, ilerlemeyi kaydeder ve sonuç ekranı için açıklama döndürür
function careerResult(rank) {
 const ev = activeCareerEvent;
 if (!ev) return '';
 const idx = careerEventIndex(ev);
 let text;
 if (rank <= ev.needRank) {
  if (idx + 1 >= CAREER_EVENTS.length) {
   careerProgress.done = true;
   careerProgress.event = CAREER_EVENTS.length - 1;
   text = '🏆 KARİYER TAMAMLANDI! TERMINAL ISLAND EFSANESİ OLDUN!';
  } else {
   careerProgress.event = Math.max(careerProgress.event, idx + 1);
   text = `✅ ETAP GEÇİLDİ! SIRADAKİ: ${CAREER_EVENTS[idx + 1].name}`;
  }
 } else {
  text = `❌ ETAP GEÇİLEMEDİ: EN AZ ${ev.needRank}. OLMALISIN. GARAJDA GÜÇLENİP TEKRAR DENE!`;
 }
 saveProgress();
 updateCareerCard();
 return text;
}
function updateCareerCard() {
 const el = document.getElementById('career-card-desc');
 if (!el) return;
 const ev = CAREER_EVENTS[careerProgress.event] || CAREER_EVENTS[0];
 const steps = CAREER_EVENTS.map((_, i) => i < careerProgress.event || careerProgress.done ? '●' : (i === careerProgress.event ? '◉' : '○')).join(' ');
 // Sabit metinler (kullanıcı girdisi yok) — innerHTML güvenli
 el.innerHTML = careerProgress.done
  ? `<span style="letter-spacing:3px;color:#c39bd3">${steps}</span><br><b>Kariyer tamamlandı!</b> Final etabını istediğin kadar tekrar oynayabilirsin.`
  : `<span style="letter-spacing:3px;color:#c39bd3">${steps}</span><br><b>Etap ${careerProgress.event + 1}/${CAREER_EVENTS.length}: ${ev.name}</b><br>${ev.laps} tur · ${(DIFFICULTY[ev.difficulty] || DIFFICULTY.normal).name} · ${ev.elimination === 'off' ? 'eleme yok' : 'eleme ' + ev.elimination} · <b>en az ${ev.needRank}. ol</b>`;
}

/* ==========================================================
   HAYALET ARAÇ (EN İYİ TUR KAYDI)
   ==========================================================
   Her tur 0.1 sn aralıkla konum/rotasyon kaydedilir. En iyi tur localStorage'a yazılır ve sonraki
   turlarda yarı saydam bir araç olarak oynatılır. [Y] ile açılıp kapanır. */
const GHOST_KEY = 'death_race_ghost_v1';
const GHOST_STEP_MS = 100;
const ghostMat = new T.MeshBasicMaterial({ color: '#9fe7ff', transparent: true, opacity: 0.32, depthWrite: false });
let ghostMesh = null;
let ghostEnabled = true;
let ghostBest = null; // { lapMs, s: [x,y,z,qx,qy,qz,qw, ...] }
let ghostRec = [];
let ghostNextSample = 0;
try { ghostBest = JSON.parse(localStorage.getItem(GHOST_KEY) || 'null'); } catch (e) {}
const _gq1 = new T.Quaternion(), _gq2 = new T.Quaternion();

function resetGhostRecording() { ghostRec = []; ghostNextSample = 0; }
function toggleGhost() {
 ghostEnabled = !ghostEnabled;
 showBanner(ghostEnabled ? '👻 HAYALET ARAÇ: AÇIK [Y]' : '👻 HAYALET ARAÇ: KAPALI [Y]');
}
function onGhostLapCompleted(lapMs) {
 if (ghostRec.length < 20) return;
 if (!ghostBest || lapMs < ghostBest.lapMs) {
  ghostBest = { lapMs, s: ghostRec.map(v => Math.round(v * 1000) / 1000) };
  try { localStorage.setItem(GHOST_KEY, JSON.stringify(ghostBest)); } catch (e) {}
  showBanner('👻 YENİ EN İYİ TUR! HAYALET KAYDEDİLDİ', 'buff-shield');
 }
}
function updateGhost() {
 const racing = isGameStarted && !garageModeActive && !raceFinished;
 const t = performance.now() - lapStartTime;
 // Kayıt
 if (racing && carHealth > 0) {
  while (ghostNextSample <= t) {
   const p = chassisBody.position, q = chassisBody.quaternion;
   ghostRec.push(p.x, p.y, p.z, q.x, q.y, q.z, q.w);
   ghostNextSample += GHOST_STEP_MS;
  }
 }
 // Oynatma
 if (!ghostMesh) return;
 const s = ghostBest && ghostBest.s;
 const n = s ? s.length / 7 : 0;
 const f = t / GHOST_STEP_MS;
 const i = Math.floor(f);
 if (!ghostEnabled || !racing || n < 2 || i >= n - 1) { ghostMesh.visible = false; return; }
 const a = i * 7, b = a + 7, k = f - i;
 ghostMesh.visible = true;
 ghostMesh.position.set(s[a] + (s[b] - s[a]) * k, s[a + 1] + (s[b + 1] - s[a + 1]) * k, s[a + 2] + (s[b + 2] - s[a + 2]) * k);
 _gq1.set(s[a + 3], s[a + 4], s[a + 5], s[a + 6]);
 _gq2.set(s[b + 3], s[b + 4], s[b + 5], s[b + 6]);
 ghostMesh.quaternion.copy(_gq1).slerp(_gq2, k);
}

/* ==========================================================
   STATİK GEOMETRİ BİRLEŞTİRME (STATIC BATCHING)
   ==========================================================
   Hangar, konteyner sahası, tribün, rampalar, pit, kale kapısı ve garaj hiç hareket etmeyen yüzlerce
   ayrı mesh'ten oluşuyordu (kare başına ~900 draw call: 613 ana + 280 gölge geçişi). Burada her
   staticBatch grubunun yaprak mesh'leri materyal + gölge bayrakları + 160 m'lik bölge hücresi bazında
   tek BufferGeometry'de birleştirilir. Bölge hücresi frustum culling'in çalışmaya devam etmesini sağlar.
   userData.dynamic işaretli alt ağaçlar (presler, seyirci kolları, döner tabla) dokunulmadan kalır. */
const STATIC_BATCH_CELL = 160;
// Aynı görünen fakat ayrı ayrı `new MeshStandardMaterial(...)` ile oluşturulmuş materyaller aynı
// anahtarı alır, böylece birlikte birleştirilebilirler (birleşik mesh ilk materyali kullanır).
function staticMaterialKey(mat) {
 const c = mat.color ? mat.color.getHexString() : '';
 const e = mat.emissive ? mat.emissive.getHexString() + ':' + mat.emissiveIntensity : '';
 return [mat.type, c, e, mat.roughness, mat.metalness, mat.side, mat.wireframe, mat.flatShading,
  mat.vertexColors, mat.opacity, mat.fog, mat.depthWrite, mat.map ? mat.map.uuid : '',
  mat.emissiveMap ? mat.emissiveMap.uuid : '', mat.normalMap ? mat.normalMap.uuid : ''].join('/');
}
function bakeStaticGroup(root) {
 root.updateMatrixWorld(true);
 const invRoot = new T.Matrix4().copy(root.matrixWorld).invert();
 const buckets = new Map();
 const wp = new T.Vector3();

 const walk = (o, parentVisible) => {
  if (o !== root && o.userData.dynamic) return;
  const vis = o === root ? true : (parentVisible && o.visible);
  if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && vis && o.children.length === 0 &&
      !Array.isArray(o.material) && !o.material.transparent &&
      o.geometry.attributes.position && !o.geometry.attributes.position.isInterleavedBufferAttribute &&
      o.matrixWorld.determinant() > 0) {
   const g = o.geometry;
   const sig = Object.keys(g.attributes).sort().join(',') + (g.index ? '|i' : '|n');
   o.getWorldPosition(wp);
   const cell = Math.floor(wp.x / STATIC_BATCH_CELL) + ',' + Math.floor(wp.z / STATIC_BATCH_CELL);
   const key = staticMaterialKey(o.material) + '|' + o.castShadow + o.receiveShadow + '|' + sig + '|' + cell;
   let b = buckets.get(key);
   if (!b) buckets.set(key, b = []);
   b.push(o);
  }
  for (const c of o.children.slice()) walk(c, vis);
 };
 walk(root, true);

 const m = new T.Matrix4();
 const nm = new T.Matrix3();
 const v = new T.Vector3();
 let removed = 0, added = 0;
 for (const list of buckets.values()) {
  if (list.length < 2) continue;
  const first = list[0].geometry;
  const names = Object.keys(first.attributes);
  let vCount = 0, iCount = 0;
  for (const mesh of list) {
   vCount += mesh.geometry.attributes.position.count;
   iCount += mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count;
  }
  const arrays = {};
  for (const n of names) arrays[n] = new Float32Array(vCount * first.attributes[n].itemSize);
  const index = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);

  let vOff = 0, iOff = 0;
  for (const mesh of list) {
   const g = mesh.geometry;
   m.multiplyMatrices(invRoot, mesh.matrixWorld);
   nm.getNormalMatrix(m);
   const cnt = g.attributes.position.count;
   for (const n of names) {
    const src = g.attributes[n];
    const size = src.itemSize;
    const dst = arrays[n];
    for (let i = 0; i < cnt; i++) {
     if (n === 'position') {
      v.fromBufferAttribute(src, i).applyMatrix4(m);
      dst[(vOff + i) * 3] = v.x; dst[(vOff + i) * 3 + 1] = v.y; dst[(vOff + i) * 3 + 2] = v.z;
     } else if (n === 'normal') {
      v.fromBufferAttribute(src, i).applyMatrix3(nm).normalize();
      dst[(vOff + i) * 3] = v.x; dst[(vOff + i) * 3 + 1] = v.y; dst[(vOff + i) * 3 + 2] = v.z;
     } else {
      for (let c = 0; c < size; c++) dst[(vOff + i) * size + c] = src.array[i * size + c];
     }
    }
   }
   if (g.index) {
    for (let i = 0; i < g.index.count; i++) index[iOff + i] = g.index.getX(i) + vOff;
    iOff += g.index.count;
   } else {
    for (let i = 0; i < cnt; i++) index[iOff + i] = vOff + i;
    iOff += cnt;
   }
   vOff += cnt;
  }

  const merged = new T.BufferGeometry();
  for (const n of names) merged.setAttribute(n, new T.BufferAttribute(arrays[n], first.attributes[n].itemSize));
  merged.setIndex(new T.BufferAttribute(index, 1));
  merged.computeBoundingSphere();
  merged.computeBoundingBox();

  const bm = new T.Mesh(merged, list[0].material);
  bm.castShadow = list[0].castShadow;
  bm.receiveShadow = list[0].receiveShadow;
  bm.matrixAutoUpdate = false;
  bm.updateMatrix();
  root.add(bm);
  for (const mesh of list) mesh.parent.remove(mesh);
  removed += list.length; added++;
 }
 return { removed, added };
}

{
 const batchStats = { removed: 0, added: 0 };
 for (const child of scene.children.slice()) {
  if (!child.userData.staticBatch) continue;
  const r = bakeStaticGroup(child);
  batchStats.removed += r.removed; batchStats.added += r.added;
 }
 window.__staticBatchStats = batchStats;
}

// Seyirci kolları: animasyonlu 80 mesh tek bir InstancedMesh ile çizilir (asıl kol objeleri sadece
// transform hesabı için hiyerarşide görünmez olarak kalır).
let crowdArmsIM = null;
if (CROWD_INMATES.length > 0) {
 const a0 = CROWD_INMATES[0].armL;
 crowdArmsIM = new T.InstancedMesh(a0.geometry, a0.material, CROWD_INMATES.length * 2);
 crowdArmsIM.frustumCulled = false;
 for (const inmate of CROWD_INMATES) { inmate.armL.visible = false; inmate.armR.visible = false; }
 scene.add(crowdArmsIM);
 scene.updateMatrixWorld(true);
 updateCrowdAndGuards(0);
}

/* ==========================================================
   IŞIK HAVUZU (LIGHT POOL)
   ==========================================================
   Sahnede ~104 PointLight + ~19 SpotLight vardı. Three.js her ışığı her MeshStandardMaterial'ın
   fragment shader'ına açılmış (unrolled) döngü olarak gömer: (1) her pikselde 120+ ışık hesabı,
   (2) shader derlemesi saniyeler sürer, (3) sahneye ışık eklenip çıkarıldığında (mayın LED'i,
   airdrop flare'i, tavan çakarı) ışık sayısı değiştiği için TÜM lit materyaller yeniden derlenir.
   Çözüm: dekoratif ışıklar "sanal" yapılır (visible=false, render listesine girmez) ve kameraya en
   yakın olanlar her karede sabit sayıdaki gerçek ışık slotuna kopyalanır. Shader'daki ışık sayısı
   oyun boyunca sabit kalır -> çalışma zamanında asla yeniden derleme olmaz. */
const POINT_LIGHT_SLOTS = 8;
const SPOT_LIGHT_SLOTS = 5;
const pooledLights = new Set();
const realLights = new Set([hemi, sun, muzzleLight, nitroLight, engineFireLight, leftHeadlight, rightHeadlight]);
const pointSlots = [];
const spotSlots = [];
const _lpPos = new T.Vector3();
const _lpCandPoint = [];
const _lpCandSpot = [];

function poolLight(light) {
 if (realLights.has(light) || light.userData.isLightSlot) return;
 light.visible = false;
 light.userData.pooled = true;
 pooledLights.add(light);
}

for (let i = 0; i < POINT_LIGHT_SLOTS; i++) {
 const l = new T.PointLight('#ffffff', 0, 10);
 l.userData.isLightSlot = true;
 l.userData.src = null; l.userData.fade = 0;
 scene.add(l);
 pointSlots.push(l);
}
for (let i = 0; i < SPOT_LIGHT_SLOTS; i++) {
 const l = new T.SpotLight('#ffffff', 0, 10, Math.PI / 4, 0.3);
 l.userData.isLightSlot = true;
 l.userData.src = null; l.userData.fade = 0;
 scene.add(l);
 scene.add(l.target);
 spotSlots.push(l);
}

function scanSceneLights() {
 scene.traverse(o => {
  if ((o.isPointLight || o.isSpotLight) && !realLights.has(o) && !o.userData.isLightSlot) {
   if (o.visible || o.userData.pooled) poolLight(o);
  }
 });
}
scanSceneLights();

function isLightActiveInScene(o) {
 if (o.intensity <= 0.001) return false;
 let p = o.parent;
 while (p) {
  if (!p.visible) return false;
  if (p === scene) return true;
  p = p.parent;
 }
 return false; // sahneden çıkarılmış (ör. patlamış mayın)
}

function assignSlots(slots, cands, limit) {
 for (const slot of slots) {
  const src = slot.userData.src;
  if (src && src.userData.lpSelected !== true) { src.userData.lpSlot = null; slot.userData.src = null; }
 }
 let si = 0;
 for (let c = 0; c < cands.length && c < limit; c++) {
  const l = cands[c];
  if (l.userData.lpSlot) continue;
  while (si < slots.length && slots[si].userData.src) si++;
  if (si >= slots.length) break;
  slots[si].userData.src = l;
  slots[si].userData.fade = 0;
  l.userData.lpSlot = slots[si];
 }
}

function reselectPooledLights(camPos) {
 _lpCandPoint.length = 0;
 _lpCandSpot.length = 0;
 for (const l of pooledLights) {
  l.userData.lpSelected = false;
  let root = l;
  while (root.parent) root = root.parent;
  if (root !== scene) {
   // Sahneden çıkarılmış (patlayan mayın, toplanan sandık). Yeniden eklenirse 1 sn'lik tarama geri alır.
   pooledLights.delete(l);
   if (l.userData.lpSlot) { l.userData.lpSlot.userData.src = null; l.userData.lpSlot = null; }
   continue;
  }
  if (!isLightActiveInScene(l)) continue;
  _lpPos.setFromMatrixPosition(l.matrixWorld);
  const range = l.distance > 0 ? l.distance : 200;
  // Kamera ışığın etki küresine ne kadar yakınsa o kadar öncelikli; atanmış ışığa küçük histerezis
  const score = _lpPos.distanceTo(camPos) - range - (l.userData.lpSlot ? 6 : 0);
  if (score > 140) continue;
  l.userData.lpScore = score;
  (l.isSpotLight ? _lpCandSpot : _lpCandPoint).push(l);
 }
 const byScore = (a, b) => a.userData.lpScore - b.userData.lpScore;
 _lpCandPoint.sort(byScore);
 _lpCandSpot.sort(byScore);
 for (let i = 0; i < _lpCandPoint.length && i < POINT_LIGHT_SLOTS; i++) _lpCandPoint[i].userData.lpSelected = true;
 for (let i = 0; i < _lpCandSpot.length && i < SPOT_LIGHT_SLOTS; i++) _lpCandSpot[i].userData.lpSelected = true;
 assignSlots(pointSlots, _lpCandPoint, POINT_LIGHT_SLOTS);
 assignSlots(spotSlots, _lpCandSpot, SPOT_LIGHT_SLOTS);
}

function syncLightSlots(slots, dt) {
 for (const slot of slots) {
  const src = slot.userData.src;
  if (!src || !isLightActiveInScene(src)) { slot.intensity = 0; continue; }
  slot.userData.fade = Math.min(1, slot.userData.fade + dt * 6);
  slot.position.setFromMatrixPosition(src.matrixWorld);
  slot.color.copy(src.color);
  slot.distance = src.distance;
  slot.decay = src.decay;
  slot.intensity = src.intensity * slot.userData.fade;
  if (slot.isSpotLight) {
   slot.angle = src.angle;
   slot.penumbra = src.penumbra;
   slot.target.position.setFromMatrixPosition(src.target.matrixWorld);
  }
 }
}

let lightPoolTimer = 0;
let lightScanTimer = 0;
function updateLightPool(dt, cam) {
 lightScanTimer -= dt;
 if (lightScanTimer <= 0) { lightScanTimer = 1.0; scanSceneLights(); }
 lightPoolTimer -= dt;
 if (lightPoolTimer <= 0) { lightPoolTimer = 0.1; reselectPooledLights(cam.position); }
 syncLightSlots(pointSlots, dt);
 syncLightSlots(spotSlots, dt);
}

/* ==========================================================
   SHADER ÖN DERLEME (ZERO-JANK WARMUP)
   ==========================================================
   Sahnede başlangıçta bulunmayan (oyun içinde ilk kez görünen) materyaller görünmez bir grupta
   sahneye eklenir; ardından renderer.compileAsync() KHR_parallel_shader_compile ile tüm programları
   ana thread'i bloklamadan derler. Derleme bitene kadar 3D çizim beklenir, menü anında tıklanabilir. */
const shaderWarmupGroup = new T.Group();
{
 const warmGeo = new T.BoxGeometry(0.1, 0.1, 0.1);
 const warmMats = [
  rocketMat, oilMat, caltropMat, mineMat, spikeStripMat, airdropCrateMat, parachuteMat, crateSmokeMat,
  flameMat, bladeMat, sawMat, bumperSteelMat, bulletMatPlayerLvl2, bulletMatPlayerLvl3, bulletMatEnemy,
  bulletMatCannon, smokeMat, damageSmokeFireMat, damageSmokeDarkMat, expMat, ghostMat
 ];
 for (const m of warmMats) {
  if (!m) continue;
  const mesh = new T.Mesh(warmGeo, m);
  mesh.castShadow = true; mesh.receiveShadow = true;
  shaderWarmupGroup.add(mesh);
 }
 shaderWarmupGroup.visible = false;
 scene.add(shaderWarmupGroup);
}

let shadersReady = false;
function warmupShaders() {
 const done = () => { shadersReady = true; };
 try {
  renderer.compileAsync(scene, camera).then(done, done);
 } catch (e) {
  done();
 }
 setTimeout(done, 5000); // emniyet: uzantı/sürücü sorunu olsa bile oyun asla kilitli kalmaz
}
warmupShaders();

function renderPipView() {
 if (!pipCanvasEl) return;
 if (!pipRect) {
  const r = pipCanvasEl.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return;
  pipRect = { x: r.left, y: innerHeight - r.bottom, w: r.width, h: r.height };
  pipCamera.aspect = r.width / r.height;
  pipCamera.updateProjectionMatrix();
 }
 const prevShadowAuto = renderer.shadowMap.autoUpdate;
 renderer.shadowMap.autoUpdate = false; // gölge haritası ana geçişte zaten güncellendi
 renderer.setScissorTest(true);
 renderer.setScissor(pipRect.x, pipRect.y, pipRect.w, pipRect.h);
 renderer.setViewport(pipRect.x, pipRect.y, pipRect.w, pipRect.h);
 renderer.render(scene, pipCamera);
 renderer.setScissorTest(false);
 renderer.setViewport(0, 0, innerWidth, innerHeight);
 renderer.shadowMap.autoUpdate = prevShadowAuto;
}

/* ==========================================================
   ANA DÖNGÜ & SENKRONİZASYON
   ========================================================== */
const FIXED_DT = 1 / 60;
let last = performance.now();

// Fizik çözücüsü bir aracı NaN konuma fırlatırsa (aşırı iç içe geçme vb.) oyunu kurtar:
// aracı son sağlam konumuna geri al. Sağlam durumda kare başına yalnızca birkaç kopyalama yapar.
const _lastGoodPlayer = new CANNON.Vec3(0, 0.85, 0);
function guardBody(body, lastGood) {
 const p = body.position, v = body.velocity;
 if (Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z) && Number.isFinite(v.x)) {
  lastGood.copy(p);
  return;
 }
 body.position.set(lastGood.x, lastGood.y + 1.0, lastGood.z);
 body.quaternion.set(0, 0, 0, 1);
 body.velocity.set(0, 0, 0);
 body.angularVelocity.set(0, 0, 0);
 body.force.set(0, 0, 0);
 body.torque.set(0, 0, 0);
}
function guardPhysicsNaN() {
 guardBody(chassisBody, _lastGoodPlayer);
 for (const ai of aiOpponents) {
  if (!ai.lastGoodPos) ai.lastGoodPos = new CANNON.Vec3().copy(ai.chassisBody.position);
  guardBody(ai.chassisBody, ai.lastGoodPos);
 }
}

function syncMeshes() {
 carGroup.position.set(chassisBody.position.x, chassisBody.position.y, chassisBody.position.z);
 carGroup.quaternion.set(chassisBody.quaternion.x, chassisBody.quaternion.y, chassisBody.quaternion.z, chassisBody.quaternion.w);

 for (let i = 0; i < vehicle.wheelInfos.length; i++) {
  vehicle.updateWheelTransform(i);
  const t = vehicle.wheelInfos[i].worldTransform;
  wheelMeshes[i].position.set(t.position.x, t.position.y, t.position.z);
  wheelMeshes[i].quaternion.set(t.quaternion.x, t.quaternion.y, t.quaternion.z, t.quaternion.w);
 }

 for (let ai of aiOpponents) {
  ai.meshGroup.position.set(ai.chassisBody.position.x, ai.chassisBody.position.y, ai.chassisBody.position.z);
  ai.meshGroup.quaternion.set(ai.chassisBody.quaternion.x, ai.chassisBody.quaternion.y, ai.chassisBody.quaternion.z, ai.chassisBody.quaternion.w);

  for (let i = 0; i < ai.vehicle.wheelInfos.length; i++) {
   ai.vehicle.updateWheelTransform(i);
   const t = ai.vehicle.wheelInfos[i].worldTransform;
   ai.wheelMeshes[i].position.set(t.position.x, t.position.y, t.position.z);
   ai.wheelMeshes[i].quaternion.set(t.quaternion.x, t.quaternion.y, t.quaternion.z, t.quaternion.w);
  }
 }

 if (dreadnought.isActive) {
  dreadnought.mesh.position.set(dreadnoughtBody.position.x, dreadnoughtBody.position.y, dreadnoughtBody.position.z);
  dreadnought.mesh.quaternion.set(dreadnoughtBody.quaternion.x, dreadnoughtBody.quaternion.y, dreadnoughtBody.quaternion.z, dreadnoughtBody.quaternion.w);

  const toPlayer = chassisBody.position.vsub(dreadnoughtBody.position);
  const fwd = new T.Vector3(0, 0, 1).applyQuaternion(dreadnought.mesh.quaternion);
  const aimAngle = Math.atan2(toPlayer.x, toPlayer.z) - Math.atan2(fwd.x, fwd.z);
  dreadnought.turret.rotation.y = aimAngle;
 }

 for (let t of targets) {
  if (t.isDead) continue;
  t.mesh.position.copy(t.body.position);
  t.mesh.quaternion.copy(t.body.quaternion);
 }

 for (let p of destructiblePoles) {
  if (p.isCollapsed) {
   p.mesh.position.copy(p.body.position);
   p.mesh.quaternion.copy(p.body.quaternion);
  }
 }

 for (let i = debrisList.length - 1; i >= 0; i--) {
  const d = debrisList[i];
  d.mesh.position.copy(d.body.position);
  d.mesh.quaternion.copy(d.body.quaternion);
 }

 if (craneStructure && craneStructure.isCollapsed && craneStructure.containerBody) {
  craneStructure.containerMesh.position.copy(craneStructure.containerBody.position);
  craneStructure.containerMesh.quaternion.copy(craneStructure.containerBody.quaternion);
 }
}

// Mermi/roket raycast'leri için kare başına tahsis yapılmayan ortak scratch nesneleri
const _rayFrom = new CANNON.Vec3();
const _rayTo = new CANNON.Vec3();
const _rayResult = new CANNON.RaycastResult();
const _rayOpts = { skipBackfaces: true };
const _tmpV3a = new T.Vector3();
const _tmpV3b = new T.Vector3();
const _zAxis = new T.Vector3(0, 0, 1);

function updateBulletsAndFX(dt) {
 for (let i = activeBullets.length - 1; i >= 0; i--) {
  const b = activeBullets[i];
  b.life -= dt;
  if (b.life <= 0) { releaseBulletMesh(b.mesh); activeBullets.splice(i, 1); continue; }

  _rayFrom.set(b.pos.x, b.pos.y, b.pos.z);
  b.pos.addScaledVector(b.vel, dt);
  b.mesh.position.copy(b.pos);

  _rayTo.set(b.pos.x, b.pos.y, b.pos.z);
  const result = _rayResult;
  world.raycastClosest(_rayFrom, _rayTo, _rayOpts, result);

  if (result.hasHit) {
   const hitBody = result.body;
   const hitPt = new T.Vector3(result.hitPointWorld.x, result.hitPointWorld.y, result.hitPointWorld.z);
   const hitNorm = new T.Vector3(result.hitNormalWorld.x, result.hitNormalWorld.y, result.hitNormalWorld.z);

   if (b.isEnemy) {
     if (hitBody === chassisBody) {
      if (shieldTimer > 0) {
       spawnSparks(hitPt, hitNorm, 20);
       Snd.playImpact();
       // Mermiyi düşmana geri yansıt!
       b.isEnemy = false;
       b.vel.multiplyScalar(-1.15);
       b.life = 0.9;
       continue;
      }
     spawnSparks(hitPt, hitNorm, 12);
     applyCarDamage((b.isHeavyCannon ? 40 : 15 + Math.random() * 8) * diffCfg().dmg, hitPt, hitNorm);
     if (b.isHeavyCannon) createExplosion(hitPt, 7, 3500);
     releaseBulletMesh(b.mesh);
     activeBullets.splice(i, 1);
     continue;
    }
   } else {
    if (hitBody === chassisBody) continue;
   }

   spawnSparks(hitPt, hitNorm, 6); checkOilIgnition(hitPt);

   if (hitBody !== groundBody) {
    hitBody.applyImpulse(new CANNON.Vec3(b.vel.x * 0.4, b.vel.y * 0.4, b.vel.z * 0.4), result.hitPointWorld);
    if (hitBody.targetData && hitBody.targetData.onHit) {
     hitBody.targetData.onHit(b.damage || (b.isHeavyCannon ? 45 : 25), hitPt, hitNorm, b.isEnemy ? 'ai' : 'gun');
     if (!b.isEnemy && hitBody.targetData.type === 'ai') applyAmmoEffect(hitBody.targetData.ai);
    }
   }

   releaseBulletMesh(b.mesh);
   activeBullets.splice(i, 1);
  }
 }

 for (let i = activeRockets.length - 1; i >= 0; i--) {
  const r = activeRockets[i];
  r.life -= dt;
  if (r.life <= 0 || !Number.isFinite(r.pos.x)) { scene.remove(r.mesh); activeRockets.splice(i, 1); continue; }

  if (r.target && !r.target.isDead) {
   const targetPos = r.target.body ? r.target.body.position : r.target.chassisBody.position;
   const toTarget = _tmpV3a.set(targetPos.x - r.pos.x, targetPos.y - r.pos.y, targetPos.z - r.pos.z).normalize();
   r.vel.lerp(toTarget.multiplyScalar(r.speed || 100), (r.homing || 4.5) * dt);
   r.mesh.quaternion.setFromUnitVectors(_zAxis, _tmpV3b.copy(r.vel).normalize());
  }

  _rayFrom.set(r.pos.x, r.pos.y, r.pos.z);
  r.pos.addScaledVector(r.vel, dt);
  r.mesh.position.copy(r.pos);
  spawnTireSmoke(r.pos);

  _rayTo.set(r.pos.x, r.pos.y, r.pos.z);
  const result = _rayResult;
  world.raycastClosest(_rayFrom, _rayTo, _rayOpts, result);

  if (result.hasHit && result.body !== (r.ownerBody || chassisBody)) {
   const hitPt = new T.Vector3(result.hitPointWorld.x, result.hitPointWorld.y, result.hitPointWorld.z);
   createExplosion(hitPt, r.fromAI ? 8 : 11, r.fromAI ? 3600 : 5200);
   if (r.fromAI && result.body === chassisBody) { applyCarDamage(28 * diffCfg().dmg, hitPt); rumble(1, 400); }

   if (result.body.targetData && result.body.targetData.onHit) {
    result.body.targetData.onHit(65, hitPt, new T.Vector3(0, 1, 0), r.fromAI ? 'ai' : 'rocket');
   }
   scene.remove(r.mesh);
   activeRockets.splice(i, 1);
  }
 }

 for (let i = activeOilSlicks.length - 1; i >= 0; i--) {
  const o = activeOilSlicks[i];
  o.life -= dt;
  if (o.life <= 0) { scene.remove(o.mesh); activeOilSlicks.splice(i, 1); }
 }
 for (let i = activeCaltrops.length - 1; i >= 0; i--) {
  const c = activeCaltrops[i];
  c.life -= dt;
  if (c.life <= 0) { scene.remove(c.mesh); activeCaltrops.splice(i, 1); }
 }

 // Yağmur Parçacıkları Güncellemesi
 if (weatherMode === 1) {
  const rArr = rainGeo.attributes.position.array;
  const cPos = chassisBody.position;
  for (let i = 0; i < RAIN_COUNT; i++) {
   rArr[i * 3 + 1] -= 32 * dt;
   if (rArr[i * 3 + 1] < 0.1) {
    rArr[i * 3] = cPos.x + (Math.random() - 0.5) * 120;
    rArr[i * 3 + 1] = 28 + Math.random() * 8;
    rArr[i * 3 + 2] = cPos.z + (Math.random() - 0.5) * 120;
   }
  }
  rainGeo.attributes.position.needsUpdate = true;
  if (Math.random() < 0.005) triggerLightning();
 }

 if (carHealth < 60 && Math.random() < 0.25) spawnDamageSmokePuff(false);
 if (carHealth < 30) {
  if (Math.random() < 0.45) spawnDamageSmokePuff(true);
  engineFireLight.intensity = 2.0 + Math.random() * 2.5;
 } else {
  engineFireLight.intensity = 0;
 }

 updateSparks(dt);

 for (let i = explosions.length - 1; i >= 0; i--) {
  const exp = explosions[i];
  exp.life -= dt;
  if (exp.life <= 0) {
   exp.mesh.visible = false;
   explosionFree.push(exp.mesh);
   explosions.splice(i, 1);
   continue;
  }
  const prog = 1 - exp.life / exp.maxLife;
  exp.curScale = T.MathUtils.lerp(exp.curScale, exp.maxScale, 0.25);
  exp.mesh.scale.setScalar(exp.curScale);
  exp.mesh.material.opacity = Math.max(0, 1 - prog * 1.3);
 }

 for (let i = smokePuffs.length - 1; i >= 0; i--) {
  const sm = smokePuffs[i];
  sm.life -= dt;
  if (sm.life <= 0) { smokePool.release(sm.mesh); smokePuffs.splice(i, 1); continue; }
  const prog = 1 - sm.life / sm.maxLife;
  sm.mesh.position.x += sm.vx * dt; sm.mesh.position.y += sm.vy * dt; sm.mesh.position.z += sm.vz * dt;
  const s = sm.mesh.scale.x + sm.grow * dt;
  sm.mesh.scale.setScalar(s);
 }

 for (let i = debrisList.length - 1; i >= 0; i--) {
  const d = debrisList[i];
  d.life -= dt;
  if (d.life <= 0) { world.removeBody(d.body); scene.remove(d.mesh); debrisList.splice(i, 1); }
 }
}

let smoothCamYaw = 0;
let smoothCamY = 2.4;

function updateCamera(dt) {
 if (KEYS['v']) {
  // 180° Geri Görüş Kamerası: Aracın arkasından geriye doğru bakış
  const rearEye = new T.Vector3(0, 2.2, -2.5).applyQuaternion(carGroup.quaternion).add(carGroup.position);
  const lookBack = new T.Vector3(0, 1.2, -35.0).applyQuaternion(carGroup.quaternion).add(carGroup.position);
  camera.position.copy(rearEye);
  camera.lookAt(lookBack);
  return;
 }

 sun.position.set(chassisBody.position.x + 80, 110, chassisBody.position.z - 60);
 sun.target.position.set(chassisBody.position.x, chassisBody.position.y, chassisBody.position.z);
 sun.target.updateMatrixWorld();
 const newFov = T.MathUtils.lerp(camera.fov, targetFOV, 0.12);
 if (Math.abs(newFov - camera.fov) > 0.02) {
  camera.fov = newFov;
  camera.updateProjectionMatrix();
 }

 if (cameraMode === 0) {
  // Üçüncü Şahıs Takip Kamerası: Süspansiyon sarsıntısından tamamen izole, zemin yaw açısına kilitli pürüzsüz takip
  const fwd = new T.Vector3(0, 0, 1).applyQuaternion(carGroup.quaternion);
  const targetYaw = Math.atan2(fwd.x, fwd.z);

  let diffYaw = targetYaw - smoothCamYaw;
  while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
  while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
  smoothCamYaw += diffYaw * (1 - Math.exp(-14 * dt));

  const camDist = 6.8;
  const camHeight = 2.3;
  const targetCamX = carGroup.position.x - Math.sin(smoothCamYaw) * camDist;
  const targetCamZ = carGroup.position.z - Math.cos(smoothCamYaw) * camDist;
  const targetCamY = carGroup.position.y + camHeight;

  smoothCamY = T.MathUtils.lerp(smoothCamY, targetCamY, 1 - Math.exp(-16 * dt));

  camPos.set(targetCamX, smoothCamY, targetCamZ);
  camLook.set(carGroup.position.x, carGroup.position.y + 1.1, carGroup.position.z);
 } else if (cameraMode === 1) {
  const relPos = new T.Vector3(0, 0.95, 1.6);
  const relLook = new T.Vector3(0, 0.9, 12);
  const targetP = carGroup.position.clone().add(relPos.applyQuaternion(carGroup.quaternion));
  const targetL = carGroup.position.clone().add(relLook.applyQuaternion(carGroup.quaternion));
  camPos.lerp(targetP, 1 - Math.exp(-25 * dt));
  camLook.lerp(targetL, 1 - Math.exp(-30 * dt));
 } else if (cameraMode === 2) {
  const relPos = new T.Vector3(-0.35, 1.15, -0.2);
  const relLook = new T.Vector3(-0.35, 1.1, 8);
  const targetP = carGroup.position.clone().add(relPos.applyQuaternion(carGroup.quaternion));
  const targetL = carGroup.position.clone().add(relLook.applyQuaternion(carGroup.quaternion));
  camPos.lerp(targetP, 1 - Math.exp(-25 * dt));
  camLook.lerp(targetL, 1 - Math.exp(-30 * dt));
 } else if (cameraMode === 3) {
  const relPos = new T.Vector3(0, 2.8, 6.5);
  const relLook = new T.Vector3(0, 1.0, -8);
  const targetP = carGroup.position.clone().add(relPos.applyQuaternion(carGroup.quaternion));
  const targetL = carGroup.position.clone().add(relLook.applyQuaternion(carGroup.quaternion));
  camPos.lerp(targetP, 1 - Math.exp(-25 * dt));
  camLook.lerp(targetL, 1 - Math.exp(-30 * dt));
 }

 camera.position.copy(camPos);
 camera.lookAt(camLook);

 if (cameraShake > 0.001) {
  camera.position.x += (Math.random() - 0.5) * cameraShake * 1.5;
  camera.position.y += (Math.random() - 0.5) * cameraShake * 1.5;
  camera.position.z += (Math.random() - 0.5) * cameraShake * 1.5;
  cameraShake *= 0.88;
 }
}


/* ==========================================================
   TAKTİKSEL RADAR (MINIMAP) ÇİZİM SİSTEMİ
   ========================================================== */
const radarCanvas = document.getElementById('radar-canvas');
const radarCtx = radarCanvas ? radarCanvas.getContext('2d') : null;

function worldToRadar(x, z) {
 return {
  rx: 12 + ((z + 620) / 1850) * 156,
  ry: 124 - ((x + 30) / 580) * 114
 };
}

let staticRadarCanvas = null;
function initStaticRadar() {
 staticRadarCanvas = document.createElement('canvas');
 staticRadarCanvas.width = 180;
 staticRadarCanvas.height = 135;
 const sCtx = staticRadarCanvas.getContext('2d');
 if (!sCtx) return;

 // Pist yolu
 sCtx.strokeStyle = 'rgba(0, 200, 255, 0.35)';
 sCtx.lineWidth = 5;
 sCtx.lineCap = 'round';
 sCtx.lineJoin = 'round';
 sCtx.beginPath();
 for (let i = 0; i <= NUM_TRACK_STEPS; i++) {
  const pt = TRACK_POINTS[i % NUM_TRACK_STEPS];
  const { rx, ry } = worldToRadar(pt.x, pt.z);
  if (i === 0) sCtx.moveTo(rx, ry);
  else sCtx.lineTo(rx, ry);
 }
 sCtx.stroke();

 // İnce yarış çizgisi
 sCtx.strokeStyle = 'rgba(255, 60, 60, 0.7)';
 sCtx.lineWidth = 1.5;
 sCtx.stroke();

 // Üzeri Kapalı Fabrika İşletmesi (Altın Amber Vurgu)
 const facS = worldToRadar(196.5, -90.0);
 const facE = worldToRadar(196.5, 480.0);
 sCtx.strokeStyle = 'rgba(255, 170, 68, 0.9)';
 sCtx.lineWidth = 6;
 sCtx.beginPath();
 sCtx.moveTo(facS.rx, facS.ry);
 sCtx.lineTo(facE.rx, facE.ry);
 sCtx.stroke();

 // Konteyner Limanı (Cyan Vurgu)
 const cS = worldToRadar(507.0, -180.0);
 const cE = worldToRadar(507.0, 650.0);
 sCtx.strokeStyle = 'rgba(0, 225, 255, 0.7)';
 sCtx.lineWidth = 4;
 sCtx.beginPath();
 sCtx.moveTo(cS.rx, cS.ry);
 sCtx.lineTo(cE.rx, cE.ry);
 sCtx.stroke();

 // Start/Finish Takı
 const sf = worldToRadar(0, 0);
 sCtx.strokeStyle = '#f1c40f';
 sCtx.lineWidth = 3;
 sCtx.beginPath();
 sCtx.moveTo(sf.rx - 4, sf.ry);
 sCtx.lineTo(sf.rx + 4, sf.ry);
 sCtx.stroke();
}

let radarThrottleTimer = 0;
function updateRadar(dt = 0.016) {
 if (!radarCtx) return;
 radarThrottleTimer += dt;
 if (radarThrottleTimer < 0.033) return;
 radarThrottleTimer = 0;
 if (!staticRadarCanvas) initStaticRadar();
 radarCtx.clearRect(0, 0, 180, 135);
 if (staticRadarCanvas) radarCtx.drawImage(staticRadarCanvas, 0, 0);

 // Silah / Savunma Plakaları
 for (let p of activationPlates) {
  const pr = worldToRadar(p.x, p.z);
  radarCtx.fillStyle = p.type === 'sword' ? '#ff4400' : (p.type === 'shield' ? '#00bfff' : '#9b59b6');
  radarCtx.beginPath();
  radarCtx.arc(pr.rx, pr.ry, 2, 0, Math.PI * 2);
  radarCtx.fill();
 }

 // AI Araçları (Kırmızı Blip)
 for (let ai of aiOpponents) {
  if (ai.isDead) continue;
  const ar = worldToRadar(ai.chassisBody.position.x, ai.chassisBody.position.z);
  radarCtx.fillStyle = '#e74c3c';
  radarCtx.beginPath();
  radarCtx.arc(ar.rx, ar.ry, 3, 0, Math.PI * 2);
  radarCtx.fill();
 }

 // Pit alanı (yeşil P)
 const pitR = worldToRadar(215.0, 160.0);
 radarCtx.fillStyle = '#2ecc71';
 radarCtx.font = 'bold 9px monospace';
 radarCtx.fillText('P', pitR.rx - 3, pitR.ry + 3);

 // Hava ikmal sandıkları (yanıp sönen yeşil kare)
 const blink = (performance.now() % 600) < 350;
 for (const ad of activeAirdrops) {
  if (ad.collected || !blink) continue;
  const dr = worldToRadar(ad.pos.x, ad.pos.z);
  radarCtx.fillStyle = '#7dff9a';
  radarCtx.fillRect(dr.rx - 3, dr.ry - 3, 6, 6);
 }

 // Mayınlar
 radarCtx.fillStyle = '#ff5533';
 for (const m of activeMines) {
  const mr = worldToRadar(m.pos.x, m.pos.z);
  radarCtx.fillRect(mr.rx - 1, mr.ry - 1, 2, 2);
 }

 // Kelle avı hedefi (altın halka)
 if (bountyTargetAI && !bountyTargetAI.isDead) {
  const br = worldToRadar(bountyTargetAI.chassisBody.position.x, bountyTargetAI.chassisBody.position.z);
  radarCtx.strokeStyle = '#ffcc00';
  radarCtx.lineWidth = 1.5;
  radarCtx.beginPath();
  radarCtx.arc(br.rx, br.ry, 6, 0, Math.PI * 2);
  radarCtx.stroke();
 }

 // Hayalet araç (beyaz)
 if (ghostMesh && ghostMesh.visible) {
  const gr = worldToRadar(ghostMesh.position.x, ghostMesh.position.z);
  radarCtx.fillStyle = 'rgba(200,240,255,0.85)';
  radarCtx.beginPath();
  radarCtx.arc(gr.rx, gr.ry, 2.5, 0, Math.PI * 2);
  radarCtx.fill();
 }

 // The Dreadnought (Mor / Kuru Kafa Blip)
 if (dreadnought.isActive && !dreadnought.isDead) {
  const dr = worldToRadar(dreadnoughtBody.position.x, dreadnoughtBody.position.z);
  radarCtx.fillStyle = '#9b59b6';
  radarCtx.beginPath();
  radarCtx.arc(dr.rx, dr.ry, 4.5, 0, Math.PI * 2);
  radarCtx.fill();
 }

 // Oyuncu (Frankenstein - Yeşil Ok / Blip)
 const pr = worldToRadar(chassisBody.position.x, chassisBody.position.z);
 const fwd = new T.Vector3(0, 0, 1).applyQuaternion(carGroup.quaternion);
 const heading = Math.atan2(fwd.z, fwd.x);

 radarCtx.save();
 radarCtx.translate(pr.rx, pr.ry);
 radarCtx.rotate(-heading + Math.PI / 2);
 radarCtx.fillStyle = '#2ecc71';
 radarCtx.beginPath();
 radarCtx.moveTo(0, -5);
 radarCtx.lineTo(4, 4);
 radarCtx.lineTo(0, 2);
 radarCtx.lineTo(-4, 4);
 radarCtx.closePath();
 radarCtx.fill();
 radarCtx.restore();
}

let cachedSpd = -1;
let cachedNitro = -1;
let cachedArmor = -1;
let cachedHeat = -1;
let cachedHeatColor = '';
let cachedPitVisible = null;
let dbgThrottleTimer = 0;

let lastMenuRender = 0;
function loop(now) {
 requestAnimationFrame(loop);
 const rawDt = Math.min(0.033, (now - last) / 1000);
 const realDt = Math.min(0.25, (now - last) / 1000); // geri sayım gibi gerçek zamanlı sayaçlar için
 last = now;
 const dt = rawDt * timeScale;

 // Shader'lar arka planda (paralel) derlenirken hiçbir şey çizilmez: ilk render'ın senkron derleme
 // yapıp ana thread'i saniyelerce kilitlemesi ve menü tıklamalarını geciktirmesi engellenir.
 if (!shadersReady) { last = now; return; }
 pollGamepad();
 // Duraklatıldığında simülasyon ve çizim durur; canvas son kareyi göstermeye devam eder
 if (isPaused) { last = now; return; }
 if (isGameStarted && !garageModeActive) updateCountdown(realDt);
 updateAutoResolution(rawDt * 1000);

 // Başlangıç mod seçim penceresi açıkken ve garajda değilken:
 // Ağır simülasyonu beklet, kamerayı başlangıç çizgisine odakla. Arka plan modalın altında kaldığı
 // için 30 FPS yeterli; GPU'yu modal animasyonları ve tıklama yanıtı için serbest bırakır.
 if (!isGameStarted && !garageModeActive) {
  if (now - lastMenuRender < 33) return;
  lastMenuRender = now;
  camera.position.set(chassisBody.position.x - 7.5, 3.2, chassisBody.position.z - 9.0);
  camera.lookAt(chassisBody.position.x, chassisBody.position.y + 1.2, chassisBody.position.z);
  updateLightPool(rawDt, camera);
  renderer.render(scene, camera);
  return;
 }

 updateControls(dt);
 updateRadar(dt);
 updateAIOpponents(dt);
 updateChopper(dt);
 updateHangarCrushers(dt);

 // Dönen Jant Bıçakları ile Yan Hasar (Grinding Damage)
 if (customization.wheelBlades !== 'none') {
  const pSpeed = chassisBody.velocity.length();
  if (pSpeed > 6.0) {
   const pPos = chassisBody.position;
   for (let ai of aiOpponents) {
    if (ai.isDead) continue;
    const distToAI = pPos.distanceTo(ai.chassisBody.position);
    if (distToAI < 2.55) {
     const grindDmg = 25 * dt;
     applyAIDamage(ai, grindDmg, ai.chassisBody.position, null, 'blades');
     spawnSparks(ai.chassisBody.position, new T.Vector3(0, 1, 0), 4);
     if (Math.random() < 0.15) Snd.playMetalSnap();
     if (Math.random() < 0.05) detachAIPart(ai, Math.random() < 0.5 ? 'part_armor_l' : 'part_armor_r');
    }
   }
  }
 }

 // Tavan Tepe Lambası Animasyonu (Strobe flashing)
 if (strobeLightR && strobeLightB) {
  const sTime = performance.now() * 0.008;
  const flashR = Math.sin(sTime * 6) > 0.2;
  const flashB = Math.sin(sTime * 6 + Math.PI) > 0.2;
  strobeLightR.intensity = flashR ? 4.5 : 0;
  strobeLightB.intensity = flashB ? 4.5 : 0;
  if (strobeRed) strobeRed.material.color.copy(flashR ? STROBE_RED_ON : STROBE_RED_OFF);
  if (strobeBlue) strobeBlue.material.color.copy(flashB ? STROBE_BLUE_ON : STROBE_BLUE_OFF);
 }
 updateCrowdAndGuards(dt);
 updateRainCanvas(dt);
 // 165Hz / 144Hz / 60Hz monitörlerde sıfır tekleme için dinamik senkron fizik adımı
 const physicsDt = Math.min(0.02, dt);
 world.step(physicsDt);
 guardPhysicsNaN();
 syncMeshes();
 updateGhost();
 updateThreats(rawDt);
 updateBulletsAndFX(dt);
 updateActivationPlates(dt);
  updateAirdrops(dt);
  updateCombosAndNearMiss(dt);
 updateCheckpoints(dt);
 updateRatingsAndRanks(dt);
 updateCamera(dt);

  updateSlipstream(dt);
  updateMines(dt);
  updateSpikeStrips(dt);
  updateRollOverRecovery(dt);
  updateDreadnoughtPhases();

  // Kelle Avı 3D Göstergesi Takibi
  if (bountyTargetAI && !bountyTargetAI.isDead) {
   bountyMarkerMesh.visible = true;
   bountyMarkerMesh.position.set(
    bountyTargetAI.chassisBody.position.x,
    bountyTargetAI.chassisBody.position.y + 3.8,
    bountyTargetAI.chassisBody.position.z
   );
   bountyMarkerMesh.rotation.y += dt * 3.5;
  } else {
   bountyMarkerMesh.visible = false;
  }


  // Bullet Time Zaman Sayacı
  if (bulletTimeActive) {
   bulletTimeRemaining -= dt;
   if (bulletTimeRemaining <= 0) {
    bulletTimeActive = false;
    timeScale = 1.0;
    if (bulletTimeHudEl) bulletTimeHudEl.style.display = 'none';
   }
  }

  // EMP Halka Büyüme Animasyonu
  if (empAnimTimer > 0) {
   empAnimTimer -= dt;
   const sc = (1.0 - empAnimTimer / 0.55) * 32.0;
   empMesh.scale.set(sc, sc, sc);
   empMesh.material.opacity = empAnimTimer / 0.55;
   if (empAnimTimer <= 0) empMesh.visible = false;
  }

  // Kelle Avı Sayacı
  bountyTimer -= dt;
  if (bountyTimer <= 0) {
   bountyTimer = 55.0;
   selectNewBountyTarget();
  }

  // İstatistik Hız Takibi
  const curSpd = chassisBody.velocity.length() * 3.6;
  if (curSpd > raceStats.maxSpeed) raceStats.maxSpeed = curSpd;


  // Pit-Stop Bay Kontrolü (Fabrika İçi Onarım & İkmal)
  const distToPit = Math.hypot(chassisBody.position.x - 215.0, chassisBody.position.z - 160.0);
  const pSpeedKmh = chassisBody.velocity.length() * 3.6;
  const inPit = distToPit < 22.0 && pSpeedKmh < 85.0;
  if (pitHudEl && inPit !== cachedPitVisible) { cachedPitVisible = inPit; pitHudEl.style.display = inPit ? 'block' : 'none'; }
  if (inPit) {
   const maxHP = 100 + (upgrades.armor - 1) * 35;
   carHealth = Math.min(maxHP, carHealth + 30 * dt);
   if (!isTombstoneDetached) tombstoneHealth = Math.min(tombstoneMaxHealth, tombstoneHealth + 25 * dt);
   lastRPGTime = 0; // Roket anında dolduruldu
   if (Math.random() < 0.15) spawnSparks(chassisBody.position, new T.Vector3(0, 1, 0), 3);
  }

  // Okyanus Kargo Gemisine Kaçış Atlama Kontrolü (Sadece pist dışındaki batı kargo gemisine uçanlar için)
  if (!isEscaped) {
   const pPos = chassisBody.position;
   if (pPos.x < -95.0 && pPos.z > 740.0 && pPos.z < 860.0 && pPos.y > 3.0) {
    triggerEscapeVictory();
   }
  }

  // Garaj İnteraktif Orbit & Showroom Kamera Kontrolü
  if (garageModeActive) {
   for (let i = 0; i < 4; i++) { vehicle.applyEngineForce(0, i); vehicle.setBrake(80, i); }
   if (typeof turntableGroup !== 'undefined' && garageAutoSpin) {
    turntableGroup.rotation.y += dt * 0.25;
   }
   if (garageAutoSpin && !isDraggingOrbit) {
    targetOrbitYaw += dt * 0.25;
   }
   garageOrbitYaw += (targetOrbitYaw - garageOrbitYaw) * (1 - Math.exp(-12 * dt));
   garageOrbitPitch += (targetOrbitPitch - garageOrbitPitch) * (1 - Math.exp(-12 * dt));
   garageOrbitDist += (targetOrbitDist - garageOrbitDist) * (1 - Math.exp(-12 * dt));

   const cx = carGroup.position.x;
   const cy = carGroup.position.y + targetLookY;
   const cz = carGroup.position.z;

   camera.position.set(
    cx + Math.sin(garageOrbitYaw) * Math.cos(garageOrbitPitch) * garageOrbitDist,
    cy + Math.sin(garageOrbitPitch) * garageOrbitDist,
    cz + Math.cos(garageOrbitYaw) * Math.cos(garageOrbitPitch) * garageOrbitDist
   );
   camera.lookAt(cx, cy, cz);
  }

  // Dönen Hologram Rozetleri Animasyonu
  for (let p of activationPlates) {
   if (p.holoMesh) {
    p.holoMesh.rotation.y += dt * 2.2;
    p.holoMesh.position.y = 2.2 + Math.sin(performance.now() * 0.004 + p.x) * 0.2;
   }
  }


 const v = chassisBody.velocity;
 const speedKmh = Math.sqrt(v.x * v.x + v.z * v.z) * 3.6;
 const rSpeed = Math.round(speedKmh);
 if (rSpeed !== cachedSpd) {
  cachedSpd = rSpeed;
  spdEl.textContent = rSpeed;
 }

 if (ammoFill) {
  const heatPct = Math.round((1 - gunHeat) * 100);
  const heatColor = isOverheated ? '#ff2200' : (gunHeat > 0.7 ? '#ff7700' : '#ffcc44');
  if (heatPct !== cachedHeat) { cachedHeat = heatPct; ammoFill.style.width = `${heatPct}%`; }
  if (heatColor !== cachedHeatColor) { cachedHeatColor = heatColor; ammoFill.style.background = heatColor; }
 }

 if (nitroFill && nitroText) {
  const rNitro = Math.round(nitroAmount);
  if (rNitro !== cachedNitro) {
   cachedNitro = rNitro;
   nitroFill.style.width = `${rNitro}%`;
   nitroText.textContent = `NITRO %${rNitro}`;
  }
 }

 const maxHP = 100 + (upgrades.armor - 1) * 35;
 if (armorFill && armorText) {
  const rArmor = Math.round((carHealth / maxHP) * 100);
  if (rArmor !== cachedArmor) {
   cachedArmor = rArmor;
   armorFill.style.width = `${rArmor}%`;
   if (shieldTimer > 0) {
    armorFill.style.background = 'linear-gradient(90deg, #00d2ff, #3a7bd5)';
    armorText.textContent = `KALKAN %${Math.round(carHealth)}`;
   } else if (carHealth > maxHP * 0.6) {
    armorFill.style.background = 'linear-gradient(90deg, #27ae60, #2ecc71)';
    armorText.textContent = `ZIRH %${Math.round(carHealth)}`;
   } else if (carHealth > maxHP * 0.3) {
    armorFill.style.background = 'linear-gradient(90deg, #e67e22, #f39c12)';
    armorText.textContent = `ZIRH %${Math.round(carHealth)}`;
   } else {
    armorFill.style.background = 'linear-gradient(90deg, #c0392b, #e74c3c)';
    armorText.textContent = carHealth <= 0 ? 'ARAÇ İMHA EDİLDİ!' : `ZIRH %${Math.round(carHealth)}`;
   }
  }
 }

 dbgThrottleTimer += dt;
 if (dbgThrottleTimer > 0.2) {
  dbgThrottleTimer = 0;
  dbg.textContent = `Konum: ${chassisBody.position.x.toFixed(1)}, ${chassisBody.position.z.toFixed(1)}${isDrifting ? ' · [DRIFT!]' : ''}${KEYS['shift'] ? ' · [NITRO BOOST!]' : ''}`;
 }

 updateLightPool(rawDt, camera);
 renderer.render(scene, camera);

 // Takedown PiP (Picture-in-Picture) Köşe Ekranı Render Pass'i
 if (takedownPipActive && takedownVictimAI) {
  takedownPipTimer -= rawDt;
  if (takedownPipTimer <= 0) {
   takedownPipActive = false;
   takedownVictimAI = null;
   const pipEl = document.getElementById('takedown-pip-container');
   if (pipEl) pipEl.classList.remove('active');
  } else {
   const vp = takedownVictimAI.chassisBody.position;
   const elapsed = 2.6 - takedownPipTimer;
   const orbitAngle = elapsed * 1.5;
   const camDist = 6.8 + elapsed * 0.8;
   pipCamera.position.set(
    vp.x + Math.sin(orbitAngle) * camDist,
    vp.y + 2.2 + elapsed * 0.4,
    vp.z + Math.cos(orbitAngle) * camDist
   );
   pipCamera.lookAt(vp.x, vp.y + 0.6, vp.z);
   renderPipView();
  }
 }
}

/* ==========================================================
   TELSİZ UYARILARI & TEHDİT GÖSTERGESİ
   ==========================================================
   Case tehlikeleri önceden haber verir: sana kilitlenen roket, önündeki rakip yağı/mayını,
   arkadan hızla yaklaşan rakip, eleme sayacında sonunculuk, silahsızken öndeki kılıç plakası,
   yakındaki Dreadnought. Roket ve önündeki tuzak için ekranda yön oklu gösterge çıkar. */
const caseWarnTimes = {};
function caseWarn(key, text, cooldownMs) {
 const now = performance.now();
 if (now - (caseWarnTimes[key] || -1e9) < cooldownMs) return;
 caseWarnTimes[key] = now;
 showRadioMessage(text, 'case');
}
const threatEl = document.getElementById('threat-hud');
const threatArrowEl = document.getElementById('threat-arrow');
const threatTextEl = document.getElementById('threat-text');
const _thInv = new T.Quaternion();
const _thLocal = new T.Vector3();
let threatTimer = 0;
let lastThreatHtmlKey = '';

// Bir dünya noktasının oyuncuya göre yönü (derece, 0 = ileri, saat yönü) ve mesafesi
function relativeBearing(x, y, z) {
 const p = chassisBody.position;
 _thLocal.set(x - p.x, y - p.y, z - p.z).applyQuaternion(_thInv.copy(carGroup.quaternion).invert());
 return { deg: Math.atan2(-_thLocal.x, _thLocal.z) * 180 / Math.PI, dist: Math.hypot(_thLocal.x, _thLocal.z), ahead: _thLocal.z, lateral: Math.abs(_thLocal.x) };
}

function updateThreats(dt) {
 threatTimer -= dt;
 if (threatTimer > 0) return;
 threatTimer = 0.1;
 if (!isGameStarted || garageModeActive || raceFinished || carHealth <= 0) { setThreat(null); return; }

 let top = null; // en acil tehdit (gösterge için)

 // 1. Sana kilitlenen roketler
 for (const r of activeRockets) {
  if (r.target !== PLAYER_TARGET) continue;
  const b = relativeBearing(r.pos.x, r.pos.y, r.pos.z);
  if (b.dist > 130) continue;
  if (!r.warned) { r.warned = true; caseWarn('rocket', `${r.fromAI ? r.fromAI.name : 'Biri'} roket ateşledi! Sert kır, kaç!`, 2500); }
  if (!top || b.dist < top.dist) top = { kind: 'rocket', label: `🚀 ROKET ${Math.round(b.dist)} m`, deg: b.deg, dist: b.dist };
 }

 // 2. Önündeki rakip yağı / mayını
 const checkHazard = (h, label, warnText) => {
  if (!h.owner) return;
  const b = relativeBearing(h.pos.x, 0.3, h.pos.z);
  if (b.ahead < 0 || b.ahead > 70 || b.lateral > 7) return;
  if (!h.warned) { h.warned = true; caseWarn('hazard', warnText, 3000); }
  if (!top) top = { kind: 'hazard', label: `${label} ${Math.round(b.dist)} m`, deg: b.deg, dist: b.dist };
 };
 for (const o of activeOilSlicks) checkHazard(o, '🛢️ YAĞ', 'Önünde yağ var! Direksiyonu sabit tut!');
 for (const m of activeMines) checkHazard(m, '💣 MAYIN', 'Önünde mayın! Şerit değiştir!');

 // 3. Arkadan hızla yaklaşan rakip
 const pv = chassisBody.velocity;
 for (const ai of aiOpponents) {
  if (ai.isDead) continue;
  const ap = ai.chassisBody.position;
  const b = relativeBearing(ap.x, ap.y, ap.z);
  if (b.ahead > -4 || b.dist > 30) continue;
  const av = ai.chassisBody.velocity;
  const closing = Math.hypot(av.x, av.z) - Math.hypot(pv.x, pv.z);
  if (closing > 6 || ai.isNemesis) caseWarn('behind', `${ai.name} arkandan geliyor, dikkat!`, 18000);
 }

 // 4. Eleme sayacında sonuncu
 if (aiFireEnabled && raceSetting('elimination') !== 'off' && eliminationTimer < 10 && eliminationTimer > 0) {
  const alive = aiOpponents.filter(a => !a.isDead).length + 1;
  if (playerRank >= alive) caseWarn('elim', 'Sonuncusun! 10 saniyen var, birini geç yoksa patlarsın!', 40000);
  if (eliminationHudEl) eliminationHudEl.classList.toggle('danger', playerRank >= alive);
 } else if (eliminationHudEl) eliminationHudEl.classList.remove('danger');

 // 5. Silahsızken öndeki kılıç plakası
 if (!weaponsLocked() && !weaponsUnlimited() && armory.gun <= 0) {
  for (const p of activationPlates) {
   if (p.type !== 'sword' || p.cooldown > 0) continue;
   const b = relativeBearing(p.x, 0, p.z);
   if (b.ahead > 0 && b.ahead < 150 && b.lateral < 15) { caseWarn('plate', 'Önde kılıç plakası var, üzerinden geç ve silahlan!', 30000); break; }
  }
 }

 // 6. Dreadnought yakında
 if (dreadnought.isActive && !dreadnought.isDead) {
  const dp = dreadnoughtBody.position;
  if (relativeBearing(dp.x, dp.y, dp.z).dist < 70) caseWarn('dread', 'Dreadnought çok yakın! Topunun önünde durma!', 25000);
 }

 setThreat(top);
}

function setThreat(t) {
 if (!threatEl) return;
 if (!t) {
  if (lastThreatHtmlKey) { threatEl.className = ''; lastThreatHtmlKey = ''; }
  return;
 }
 const key = t.label;
 if (key !== lastThreatHtmlKey) { threatTextEl.textContent = t.label; lastThreatHtmlKey = key; }
 threatEl.className = 'show ' + t.kind;
 threatArrowEl.style.transform = `rotate(${Math.round(t.deg)}deg)`;
}

/* ==========================================================
   DURAKLATMA MENÜSÜ (ESC / gamepad Start)
   ========================================================== */
let isPaused = false;
let pauseStartedAt = 0;
let pauseFocus = 0;
const pauseMenuEl = document.getElementById('pause-menu');
const MODE_NAMES = { deathrace: 'ÖLÜM YARIŞI', peaceful: 'BARIŞÇIL TEST', career: 'KARİYER' };

function pauseItems() { return pauseMenuEl ? [...pauseMenuEl.querySelectorAll('.pause-item')] : []; }
function movePauseFocus(dir) {
 const items = pauseItems();
 if (!items.length) return;
 pauseFocus = (pauseFocus + dir + items.length) % items.length;
 items.forEach((el, i) => el.classList.toggle('focused', i === pauseFocus));
 items[pauseFocus].focus({ preventScroll: true });
}
function activatePauseItem() {
 const items = pauseItems();
 if (items[pauseFocus]) items[pauseFocus].click();
}

function setPaused(p) {
 if (p === isPaused) return;
 if (p && (!isGameStarted || garageModeActive || raceFinished)) return;
 isPaused = p;
 document.body.classList.toggle('paused', p);
 if (p) {
  pauseStartedAt = performance.now();
  try { if (Snd.ctx && Snd.ctx.state === 'running') Snd.ctx.suspend(); } catch (e) {}
  try { if ('speechSynthesis' in window) speechSynthesis.pause(); } catch (e) {}
  const info = document.getElementById('pause-info');
  if (info) {
   const mode = activeCareerEvent ? `KARİYER · ${activeCareerEvent.name}` : (MODE_NAMES[currentGameMode] || currentGameMode);
   info.textContent = `${mode} · TUR ${lapCount}/${MAX_LAPS} · ${playerRank}. SIRA · ${formatTime(performance.now() - lapStartTime)}`;
  }
  const ctl = document.getElementById('pause-controls');
  if (ctl) ctl.style.display = 'none';
  pauseFocus = 0;
  movePauseFocus(0);
 } else {
  // Duraklamada geçen süre tur süresine ve hayalet kaydına eklenmesin
  lapStartTime += performance.now() - pauseStartedAt;
  try { if (Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume(); } catch (e) {}
  try { if ('speechSynthesis' in window) speechSynthesis.resume(); } catch (e) {}
  for (const k in KEYS) KEYS[k] = false;
  isMouseDown = false;
 }
}
window.setPaused = setPaused;

function handleEscape() {
 const audio = document.getElementById('audio-modal');
 if (audio && getComputedStyle(audio).display !== 'none') { closeAudioModal(); return; }
 if (garageModeActive) { toggleGarage(); return; }
 if (isPaused) {
  const ctl = document.getElementById('pause-controls');
  if (ctl && ctl.style.display !== 'none') { ctl.style.display = 'none'; return; }
  setPaused(false);
  return;
 }
 setPaused(true);
}

// Aracı en yakın pist noktasına, pist yönüne bakacak şekilde geri koyar (yarış durumu korunur)
function recoverCar() {
 const info = getTrackDistance(chassisBody.position);
 const p = TRACK_POINTS[info.index];
 const n = TRACK_POINTS[(info.index + 3) % TRACK_POINTS.length];
 chassisBody.position.set(p.x, 1.2, p.z);
 chassisBody.quaternion.setFromEuler(0, Math.atan2(n.x - p.x, n.z - p.z), 0);
 chassisBody.velocity.set(0, 0, 0);
 chassisBody.angularVelocity.set(0, 0, 0);
 showBanner('🛟 ARAÇ PİSTE GERİ KONULDU', 'buff-shield');
}
window.recoverCar = recoverCar;

function pauseAction(action) {
 if (action === 'resume') setPaused(false);
 else if (action === 'recover') { recoverCar(); setPaused(false); }
 else if (action === 'restart') {
  saveProgress();
  const mode = activeCareerEvent ? 'career' : currentGameMode;
  location.href = location.pathname + '?start=' + encodeURIComponent(mode) + (/[?&]perf\b/.test(location.search) ? '&perf' : '');
 }
 else if (action === 'audio') toggleAudioModal();
 else if (action === 'controls') {
  const ctl = document.getElementById('pause-controls');
  if (ctl) ctl.style.display = ctl.style.display === 'none' ? 'block' : 'none';
 }
 else if (action === 'menu') { saveProgress(); location.href = location.pathname; }
}
window.pauseAction = pauseAction;

// Sekme/pencere arka plana geçince yarış otomatik duraklar
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });

/* ---------- Araç parça durumu göstergesi ---------- */
const PART_HUD = [['part_spikes', 'ÖN'], ['part_armor_l', 'SOL'], ['part_armor_r', 'SAĞ'], ['part_roof', 'TAVAN'], ['part_tombstone', 'ARKA']];
function updatePartsHUD() {
 const el = document.getElementById('parts-hud');
 if (!el) return;
 // Sabit etiketler (kullanıcı girdisi yok) — innerHTML güvenli
 el.innerHTML = PART_HUD.map(([k, label]) => `<span class="part-chip${detachedParts.has(k) ? ' lost' : ''}">${label}</span>`).join('') +
  `<span id="parts-effect">${partsEffectText()}</span>`;
}
function partsEffectText() {
 const dm = Math.round((playerDamageTakenMul() - 1) * 100);
 const parts = [];
 if (dm > 0) parts.push(`HASAR +%${dm}`);
 if (detachedParts.has('part_spikes')) parts.push('ÇARPMA −%40');
 return parts.join(' · ');
}
let lastPartsSpeedTxt = '';
function updatePartsSpeedHUD() {
 const f = healthSpeedFactor(carHealth, 100 + (upgrades.armor - 1) * 35);
 const txt = f < 0.995 ? `MOTOR %${Math.round(f * 100)}` : '';
 if (txt === lastPartsSpeedTxt) return;
 lastPartsSpeedTxt = txt;
 const el = document.getElementById('engine-state');
 if (el) { el.textContent = txt; el.style.display = txt ? 'inline-block' : 'none'; }
}

/* ==========================================================
   PERFORMANS TEŞHİS PANELİ (?perf)
   ==========================================================
   index.html?perf ile açıldığında sol üstte FPS, kare süresi ve son donmalar gösterilir.
   Her 50 ms üstü kare için: rAF aralığı, JS süresi, fizik, render ve o karede olan olaylar
   (telsiz/TTS, patlama, takedown) kaydedilir. window.__perfLog konsoldan da okunabilir.
   Eğer "aralık" büyük ama "JS" küçükse donma GPU sürücüsü / GC / tarayıcı kaynaklıdır. */
if (/[?&]perf\b/.test(location.search)) {
 document.body.classList.add('perf');
 const perfEl = document.createElement('div');
 perfEl.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999;background:rgba(0,0,0,.78);color:#0f0;font:11px/1.35 monospace;padding:6px 8px;border-radius:4px;pointer-events:none;white-space:pre;max-width:46vw';
 document.body.appendChild(perfEl);
 window.__perfLog = [];
 let cur = null, lastStamp = performance.now(), frames = 0, fpsT = performance.now(), fps = 0, worst = 0;
 const timeIt = (obj, key, label) => {
  const f = obj[key].bind(obj);
  obj[key] = function (...a) { const t = performance.now(); const r = f(...a); if (cur) cur[label] = (cur[label] || 0) + performance.now() - t; return r; };
 };
 timeIt(world, 'step', 'fizik');
 timeIt(renderer, 'render', 'render');
 const tagIt = (name, label) => {
  const f = eval(name);
  eval(name + ' = function (...a) { if (cur) cur.olay = (cur.olay ? cur.olay + "," : "") + label; return f.apply(this, a); }');
 };
 tagIt('showRadioMessage', 'telsiz');
 tagIt('createExplosion', 'patlama');
 tagIt('triggerTakedown', 'takedown');
 tagIt('deployStickyMine', 'mayin');
 tagIt('spawnAirdropCrate', 'airdrop');
 const innerLoop = loop;
 loop = function (now) {
  const gap = now - lastStamp; lastStamp = now;
  cur = {};
  const t0 = performance.now();
  innerLoop(now);
  const js = performance.now() - t0;
  frames++;
  if (gap > 50 && isGameStarted) {
   const e = { t: (now / 1000).toFixed(1) + 's', aralik: gap.toFixed(0), js: js.toFixed(1), fizik: (cur.fizik || 0).toFixed(1), render: (cur.render || 0).toFixed(1), olay: cur.olay || '-' };
   window.__perfLog.push(e);
   if (window.__perfLog.length > 12) window.__perfLog.shift();
  }
  worst = Math.max(worst, gap);
  if (now - fpsT > 1000) {
   fps = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now;
   perfEl.textContent = `FPS ${fps}  en kötü kare ${worst.toFixed(0)} ms  draw ${renderer.info.render.calls}\n` +
    'DONMALAR (>50ms): zaman | aralık | JS | fizik | render | olay\n' +
    window.__perfLog.map(x => `${x.t} | ${x.aralik} | ${x.js} | ${x.fizik} | ${x.render} | ${x.olay}`).join('\n');
   worst = 0;
  }
  cur = null;
 };
}
requestAnimationFrame(loop);

window.world = world;
window.camera = camera;
window.chassisBody = chassisBody;
window.carGroup = carGroup;
window.targets = targets;
window.activeTrackRamps = activeTrackRamps;
window.updateCamera = updateCamera;
window.updateRollOverRecovery = updateRollOverRecovery;

window.__DBG = {
 setStageNow: (s) => { currentStage = s; updateStageHUD(); },
 triggerEMPNow: () => triggerEMPBlast(),
 deployMineNow: () => deployStickyMine(),
 deploySpikesNow: () => deploySpikeStrip(),
 performShuntNow: (d) => performSideShunt(d),
 toggleBulletTimeNow: () => toggleBulletTime(),
 callAirstrikeNow: () => callHelicopterStrike(),
 showStatsNow: (e) => showPostRaceStats(e),
 raceStats,
 get currentStage() { return currentStage; },
 get tombstoneHealth() { return tombstoneHealth; },
 get isTombstoneDetached() { return isTombstoneDetached; },
 get isGateBreached() { return isGateBreached; },
 get isEscaped() { return isEscaped; },
 breachGateNow: () => breachFortressGate(),
 dropTombstoneNow: () => dropTombstone(),
 triggerEscapeNow: () => triggerEscapeVictory(),
 triggerTakedownNow: (ai) => triggerTakedown(ai),
 get pos() { return chassisBody.position; },
 get carHealth() { return carHealth; },
 get nitroAmount() { return nitroAmount; }, set nitroAmount(v) { nitroAmount = v; },
 get isDrifting() { return isDrifting; },
 get lapCount() { return lapCount; },
 get checkpoint() { return currentCheckpoint; },
 get aiCount() { return aiOpponents.length; },
 get dreadnought() { return { isActive: dreadnought.isActive, health: dreadnought.health, isDead: dreadnought.isDead }; },
 get viewers() { return currentViewers; },
 get playerCredits() { return playerCredits; },
 get rank() { return playerRank; },
 get weatherMode() { return weatherMode; },
 get eliminationTimer() { return eliminationTimer; },
 get upgrades() { return upgrades; },
 get currentSkin() { return currentSkin; },
 get crushersCount() { return HANGAR_CRUSHERS.length; },
 get craneCollapsed() { return craneStructure ? craneStructure.isCollapsed : false; },
 setWeatherNow: (m) => setWeather(m),
 get aiFireEnabled() { return aiFireEnabled; },
 customization,
 applyWheelBladesNow: (t) => applyWheelBlades(t),
 applyBumperKitNow: (k) => applyBumperKit(k),
 applyRoofKitNow: (k) => applyRoofKit(k),
 applyNitroFlameNow: (c) => applyNitroFlame(c),
 applyAmmoTypeNow: (a) => applyAmmoType(a),
 applyMatchSettingNow: (k, v) => applyMatchSetting(k, v),
 get godMode() { return godMode; },
 toggleAIFireNow: () => toggleAIFire(),
 toggleGodModeNow: () => toggleGodMode(),
 toggleGarageNow: () => toggleGarage(),
 upgradeItemNow: (t) => upgradeItem(t),
 applyCarSkinNow: (s) => applyCarSkin(s),
 collapseCraneNow: () => { if (craneStructure) craneStructure.collapse(); },
 activateDreadnoughtNow: () => activateDreadnought()
};


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

/* ==========================================================
   İLERLEME KAYDI (KREDİ, YÜKSELTME, BOYA, MODİFİYE)
   ========================================================== */
const SAVE_KEY = 'death_race_progress_v1';
let lastSaveJson = '';
function saveProgress() {
 try {
  const json = JSON.stringify({ credits: playerCredits, upgrades, skin: currentSkin, customization, career: careerProgress });
  if (json === lastSaveJson) return;
  localStorage.setItem(SAVE_KEY, json);
  lastSaveJson = json;
 } catch (e) {}
}
window.saveProgress = saveProgress;

function loadProgress() {
 let data = null;
 try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) {}
 if (!data || typeof data !== 'object') return;
 silentRestore = true;
 try {
  if (Number.isFinite(data.credits) && data.credits >= 0) playerCredits = Math.floor(data.credits);
  if (data.upgrades) {
   for (const k of Object.keys(upgrades)) {
    const v = data.upgrades[k];
    if (Number.isInteger(v) && v >= 1 && v <= 5) upgrades[k] = v;
   }
  }
  const c = data.customization || {};
  if (c.wheelBlades && c.wheelBlades !== 'none') applyWheelBlades(c.wheelBlades);
  if (c.bumperKit && c.bumperKit !== 'standard') applyBumperKit(c.bumperKit);
  if (c.roofKit && c.roofKit !== 'none') applyRoofKit(c.roofKit);
  if (c.nitroFlame && c.nitroFlame !== 'cyan') applyNitroFlame(c.nitroFlame);
  if (c.decal && c.decal !== 'none') applyDecal(c.decal);
  if (c.ammoType && c.ammoType !== 'fmj') applyAmmoType(c.ammoType);
  if (c.aiAggression && c.aiAggression !== 'normal') applyMatchSetting('aiAggression', c.aiAggression);
  if (c.elimination && c.elimination !== '45s') applyMatchSetting('elimination', c.elimination);
  if (c.difficulty && DIFFICULTY[c.difficulty]) applyMatchSetting('difficulty', c.difficulty);
  if (c.quality && QUALITY_PRESETS[c.quality] && c.quality !== 'high') applyMatchSetting('quality', c.quality);
  if (data.career && Number.isInteger(data.career.event)) {
   careerProgress.event = Math.max(0, Math.min(CAREER_EVENTS.length - 1, data.career.event));
   careerProgress.done = !!data.career.done;
  }
  if (data.skin && CAR_SKINS[data.skin]) {
   currentSkin = data.skin;
   if (carBodyMesh) applyCarSkin(data.skin);
  }
  updateCarVisualUpgrades();
  updateArmorVisuals();
  updateGarageStatsUI();
  carHealth = 100 + (upgrades.armor - 1) * 35;
 } catch (e) {
  console.warn('Kayıt yüklenemedi:', e);
 } finally {
  silentRestore = false;
 }
 refreshUpgradeUI();
 lastSaveJson = JSON.stringify({ credits: playerCredits, upgrades, skin: currentSkin, customization, career: careerProgress });
}
loadProgress();
refreshUpgradeUI();
updateCareerCard();
raceStartCredits = playerCredits;
// Garaj seçimleri, krediler ve yükseltmeler her değiştiğinde (5 sn içinde) ve sayfa kapanırken kaydedilir
setInterval(saveProgress, 5000);
addEventListener('pagehide', saveProgress);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveProgress(); });

updatePartsHUD();

window.isGameReady = true;
// "Yarışı yeniden başlat" ?start=<mod> ile gelir: menüyü atlayıp doğrudan başlat
{
 const startMode = new URLSearchParams(location.search).get('start');
 if (startMode && ['deathrace', 'peaceful', 'career'].includes(startMode) && !window.pendingGameMode) {
  window.pendingGameMode = { mode: startMode, close: true };
 }
}
if (window.pendingGameMode) {
 const p = window.pendingGameMode;
 window.pendingGameMode = null;
 if (p.mode === 'garage') toggleGarage();
 else setGameMode(p.mode, p.close);
}
