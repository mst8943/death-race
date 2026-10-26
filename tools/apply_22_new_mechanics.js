const fs = require('fs');

console.log('=== STARTING 22+ ADVANCED GAMEPLAY MECHANICS INTEGRATION ===');

// ==========================================
// 1. UPDATE index.html WITH NEW HUD ELEMENTS
// ==========================================
let html = fs.readFileSync('index.html', 'utf8');

const newHudStyles = `
  /* === 22 YENİ MEKANİK HUD STİLLERİ === */
  #slipstream-hud {
    position: absolute;
    top: 138px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 168, 255, 0.88);
    border: 1.5px solid #00f0ff;
    border-radius: 6px;
    padding: 4px 16px;
    color: #fff;
    font-weight: 900;
    font-size: 12px;
    letter-spacing: 1.5px;
    text-shadow: 0 1px 3px #000;
    box-shadow: 0 0 18px rgba(0, 240, 255, 0.7);
    pointer-events: none;
    z-index: 90;
    animation: slipPulse 0.5s infinite alternate;
  }
  @keyframes slipPulse {
    from { opacity: 0.85; transform: translateX(-50%) scale(0.98); }
    to { opacity: 1; transform: translateX(-50%) scale(1.02); }
  }

  #bounty-hud {
    position: absolute;
    top: 68px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #d4ac0d, #f39c12);
    border: 2px solid #fff;
    border-radius: 6px;
    padding: 5px 18px;
    color: #111;
    font-weight: 900;
    font-size: 12px;
    letter-spacing: 1.5px;
    box-shadow: 0 0 22px rgba(243, 156, 18, 0.8);
    pointer-events: none;
    z-index: 92;
    animation: bountyPulse 0.8s infinite alternate;
  }
  @keyframes bountyPulse {
    from { box-shadow: 0 0 10px rgba(243, 156, 18, 0.5); }
    to { box-shadow: 0 0 25px rgba(243, 156, 18, 1); }
  }

  #combo-hud {
    position: absolute;
    top: 172px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #e67e22, #c0392b);
    border: 2px solid #ffcc44;
    border-radius: 6px;
    padding: 6px 22px;
    color: #fff;
    font-weight: 900;
    font-size: 14px;
    letter-spacing: 2px;
    box-shadow: 0 0 25px rgba(230, 126, 34, 0.9);
    pointer-events: none;
    z-index: 95;
    animation: comboPop 0.3s ease-out;
  }
  @keyframes comboPop {
    from { transform: translateX(-50%) scale(0.6); opacity: 0; }
    to { transform: translateX(-50%) scale(1); opacity: 1; }
  }

  #bullet-time-hud {
    position: absolute;
    inset: 0;
    box-shadow: inset 0 0 120px rgba(0, 140, 255, 0.5);
    pointer-events: none;
    z-index: 75;
    display: none;
  }
  .bullet-time-tag {
    position: absolute;
    bottom: 140px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 100, 220, 0.9);
    border: 1.5px solid #00d2ff;
    border-radius: 4px;
    padding: 4px 14px;
    color: #fff;
    font-weight: 900;
    font-size: 11px;
    letter-spacing: 1.5px;
    box-shadow: 0 0 15px rgba(0, 210, 255, 0.6);
  }

  /* Yarış Sonu MVP ve İstatistik Modalı */
  #post-race-modal {
    position: absolute;
    inset: 0;
    background: rgba(8, 10, 15, 0.94);
    backdrop-filter: blur(10px);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 500;
  }
  .post-race-card {
    background: linear-gradient(145deg, #101522, #182030);
    border: 2px solid #ffcc44;
    border-radius: 12px;
    padding: 28px;
    width: 580px;
    max-width: 90vw;
    color: #fff;
    box-shadow: 0 0 60px rgba(0,0,0,0.9);
    text-align: center;
  }
  .post-race-title {
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #ffcc44;
    margin-bottom: 4px;
  }
  .post-race-badge {
    display: inline-block;
    background: linear-gradient(135deg, #c0392b, #e74c3c);
    color: #fff;
    font-weight: 900;
    font-size: 11px;
    letter-spacing: 1.5px;
    padding: 3px 12px;
    border-radius: 4px;
    margin-bottom: 16px;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 20px;
    text-align: left;
  }
  .stat-item {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px;
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .stat-label { font-size: 11px; opacity: 0.8; font-weight: 700; }
  .stat-val { font-size: 14px; font-weight: 900; color: #ffcc44; font-family: monospace; }
`;

if (!html.includes('#slipstream-hud')) {
  html = html.replace('</style>', newHudStyles + '\n</style>');
}

// Add DOM overlays
const newDomElements = `
<!-- RÜZGAR KORİDORU (SLIPSTREAM) HUD -->
<div id="slipstream-hud" style="display:none;">
  ⚡ RÜZGAR KORİDORU &middot; SLIPSTREAM BOOST (+25% HIZ)
</div>

<!-- KELLE AVI (BOUNTY) HUD -->
<div id="bounty-hud" style="display:none;">
  🎯 KELLE AVI: <span id="bounty-name">M.G. JOE</span> (+100.000 PTS & OVERDRIVE)
</div>

<!-- ÇOKLU TAKEDOWN COMBO HUD -->
<div id="combo-hud" style="display:none;">
  🔥 <span id="combo-text">DOUBLE TAKEDOWN! x2 CARNAGE</span>
</div>

<!-- ADRENALİN BULLET TIME EFEKTİ -->
<div id="bullet-time-hud">
  <div class="bullet-time-tag">⏱️ ADRENALİN BULLET-TIME AKTİF [F]</div>
</div>

<!-- YARIŞ SONU İSTATİSTİK & ÖDÜL MODALI -->
<div id="post-race-modal">
  <div class="post-race-card">
    <div class="post-race-title">🏆 WEYLAND ÖLÜM YARIŞI RAPORU</div>
    <div class="post-race-badge" id="post-race-mvp-title">MVP: TERMINAL ISLAND CANAVARI</div>
    
    <div class="stats-grid">
      <div class="stat-item"><span class="stat-label">TOPLAM TAKEDOWN:</span><span class="stat-val" id="stat-takedowns">0</span></div>
      <div class="stat-item"><span class="stat-label">EN YÜKSEK HIZ:</span><span class="stat-val" id="stat-max-speed">0 km/s</span></div>
      <div class="stat-item"><span class="stat-label">KIL PAYI GEÇİŞ (NEAR MISS):</span><span class="stat-val" id="stat-nearmiss">0</span></div>
      <div class="stat-item"><span class="stat-label">TOPLAM DRIFT PUANI:</span><span class="stat-val" id="stat-drift">0 PTS</span></div>
      <div class="stat-item"><span class="stat-label">KAZANILAN ÖDÜL:</span><span class="stat-val" id="stat-credits">0 PTS</span></div>
      <div class="stat-item"><span class="stat-label">ZİRVE İZLEYİCİ:</span><span class="stat-val" id="stat-viewers">0</span></div>
    </div>

    <button onclick="location.reload()" style="background:#ffcc44;color:#111;font-weight:900;border:none;padding:12px 36px;border-radius:6px;font-size:14px;cursor:pointer;letter-spacing:1px;box-shadow:0 0 15px rgba(255,204,68,0.5)">YENİDEN YARIŞA GİR</button>
  </div>
</div>
`;

if (!html.includes('id="slipstream-hud"')) {
  html = html.replace('<div id="armor-bar">', newDomElements + '\n<div id="armor-bar">');
}

// Update weapons HUD with new slots
const expandedWeaponsHud = `
<div id="weapons-hud">
  <div class="wep-slot ready" id="slot-rpg">🚀 [SağTık/K] ROKET</div>
  <div class="wep-slot ready" id="slot-emp">⚡ [E] EMP ŞOKU</div>
  <div class="wep-slot ready" id="slot-mine">💣 [B] MAYIN</div>
  <div class="wep-slot ready" id="slot-oil">🛢️ [Q] YAĞ</div>
  <div class="wep-slot ready" id="slot-caltrop">📌 [X] DİKEN</div>
  <div class="wep-slot ready" id="slot-adrenaline">⏱️ [F] ODAK</div>
  <div class="wep-slot ready" id="slot-strike">🚁 [U] HAVA SALDIRISI</div>
</div>
`;

html = html.replace(/<div id="weapons-hud">[\s\S]*?<\/div>/, expandedWeaponsHud.trim());

// Update HUD keyboard legend
const updatedHudLegend = `
<div id="hud">
  <span class="key">WASD</span> Sür &middot; 
  <span class="key">Shift</span> Nitro &middot; 
  <span class="key">Space</span> Drift &middot; 
  <span class="key">Sol Tık</span> Minigun &middot; 
  <span class="key">Sağ Tık / K</span> Roket &middot; 
  <span class="key">E</span> EMP Şoku &middot; 
  <span class="key">B</span> Mayın &middot; 
  <span class="key">Q</span> Yağ &middot; 
  <span class="key">X</span> Diken &middot; 
  <span class="key">Z / C</span> Yan Darbe &middot; 
  <span class="key">F</span> Adrenalin &middot; 
  <span class="key">T</span> Tombstone &middot; 
  <span class="key">V</span> Arka Görüş &middot; 
  <span class="key">U</span> Hava Saldırısı &middot; 
  <span class="key">G</span> Garaj &middot; 
  <span class="key">H</span> Hava Durumu &middot; 
  <span class="key">P</span> Ateşkes &middot; 
  <span class="key">R</span> Sıfırla<br>
  <span id="dbg"></span>
</div>
`;

html = html.replace(/<div id="hud">[\s\S]*?<\/div>/, updatedHudLegend.trim());

fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html updated with 22 new mechanics HUD & styles!');

// ==========================================
// 2. UPDATE js/game.js WITH ALL 22 SYSTEMS
// ==========================================
let code = fs.readFileSync('js/game.js', 'utf8');

// Synthesized Audio Additions in Snd
const audioAdditions = `
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
   osc.connect(g).connect(this.ctx.destination);
   osc.start(now); osc.stop(now + 0.5);

   const bLen = Math.floor(this.ctx.sampleRate * 0.35);
   const buf = this.ctx.createBuffer(1, bLen, this.ctx.sampleRate);
   const d = buf.getChannelData(0);
   for (let i = 0; i < bLen; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.1);
   const src = this.ctx.createBufferSource(); src.buffer = buf;
   const bpf = this.ctx.createBiquadFilter();
   bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(3200, now);
   const ng = this.ctx.createGain();
   ng.gain.setValueAtTime(0.4, now);
   ng.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
   src.connect(bpf).connect(ng).connect(this.ctx.destination);
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
   osc.connect(g).connect(this.ctx.destination);
   osc.start(now); osc.stop(now + 0.08);
  },
  playPneumaticPiston() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   const bLen = Math.floor(this.ctx.sampleRate * 0.4);
   const buf = this.ctx.createBuffer(1, bLen, this.ctx.sampleRate);
   const d = buf.getChannelData(0);
   for (let i = 0; i < bLen; i++) d[i] = (Math.random() * 2 - 1);
   const src = this.ctx.createBufferSource(); src.buffer = buf;
   const lpf = this.ctx.createBiquadFilter();
   lpf.type = 'lowpass'; lpf.frequency.setValueAtTime(1400, now);
   lpf.frequency.exponentialRampToValueAtTime(100, now + 0.35);
   const g = this.ctx.createGain();
   g.gain.setValueAtTime(0.6, now);
   g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
   src.connect(lpf).connect(g).connect(this.ctx.destination);
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
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now + idx * 0.06); osc.stop(now + idx * 0.06 + 0.3);
   }
  },`;

if (!code.includes('playEMPDischarge()')) {
  code = code.replace(/playTakedownSting\(\) {/, audioAdditions + '\n  playTakedownSting() {');
}

// 22 MECHANICS STATE VARIABLES AND IMPLEMENTATIONS
const mechanicsCore = `
/* ==========================================================
   22 GELİŞMİŞ OYUN MEKANİĞİ SİSTEMLERİ
   ========================================================== */

// 1. İSTATİSTİK TAKİBİ (POST-RACE STATS)
const raceStats = {
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
  // +2800N ekstra rüzgar koridoru itme kuvveti
  const boost = fwd.clone().multiplyScalar(2800);
  chassisBody.applyForce(new CANNON.Vec3(boost.x, 0, boost.z), chassisBody.position);
 }
}

// 3. EMP ŞOK DALGASI SİSTEMİ (E TUŞU)
let lastEMPTime = 0;
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
 if (currentStage === 1) {
  showBanner('1. ETAP: SİLAHLAR & EMP KİLİTLİ!', 'buff-shield');
  return;
 }
 lastEMPTime = now;
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

 showBanner(\`⚡ EMP ŞOK DALGASI! \${hitCount} ARAÇ FELÇ EDİLDİ!\`, 'buff-shield');
 showRadioMessage('EMP şok dalgası patladı! Rakiplerin elektronik aksamı 4 saniye dondu!', 'case');
 addViewers(120000, 'EMP PATLAMASI!');
}
window.triggerEMPBlast = triggerEMPBlast;

// 4. MANYETİK YAPISKAN MAYINLAR (B TUŞU)
let lastMineTime = 0;
const activeMines = [];
const mineGeo = new T.CylinderGeometry(0.65, 0.65, 0.18, 12);
const mineMat = new T.MeshStandardMaterial({ color: '#161920', roughness: 0.4, metalness: 0.9 });

function deployStickyMine() {
 const now = performance.now();
 if (now - lastMineTime < 8000 || carHealth <= 0) return;
 if (currentStage === 1) {
  showBanner('1. ETAP: SİLAHLAR KİLİTLİ!', 'buff-shield');
  return;
 }
 lastMineTime = now;

 const rearPos = new T.Vector3(0, 0.15, -2.4).applyQuaternion(carGroup.quaternion).add(carGroup.position);
 const mineGroup = new T.Group();
 mineGroup.position.copy(rearPos);

 const mMesh = new T.Mesh(mineGeo, mineMat);
 mineGroup.add(mMesh);

 const led = new T.PointLight('#ff1100', 3.0, 8);
 led.position.y = 0.2;
 mineGroup.add(led);

 scene.add(mineGroup);
 activeMines.push({ group: mineGroup, pos: rearPos.clone(), led, life: 30.0 });

 Snd.playMineBeep();
 showBanner('💣 MANYETİK YAPISKAN MAYIN BIRAKILDI!', 'buff-sword');
 showRadioMessage('Manyetik mayın yola bırakıldı! Yaklaşan araca yapışıp patlayacak!', 'case');
}
window.deployStickyMine = deployStickyMine;

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
     applyAIDamage(ai, 55, m.pos, new T.Vector3(0, 1, 0));
     scene.remove(m.group);
     activeMines.splice(i, 1);
     showBanner(\`💣 MAYIN İSABETİ: \${ai.name} HAVAYA UÇTU!\`, 'buff-sword');
     break;
    }
   }
  }
 }
}

// 5. DİKENLİ TEL & ÇİVİ TUZAĞI (X TUŞU)
let lastSpikeTime = 0;
const activeSpikeStrips = [];
const spikeStripGeo = new T.BoxGeometry(4.2, 0.12, 1.2);
const spikeStripMat = new T.MeshStandardMaterial({ color: '#7f8c8d', roughness: 0.3, metalness: 0.95 });

function deploySpikeStrip() {
 const now = performance.now();
 if (now - lastSpikeTime < 7000 || carHealth <= 0) return;
 if (currentStage === 1) {
  showBanner('1. ETAP: SİLAHLAR KİLİTLİ!', 'buff-shield');
  return;
 }
 lastSpikeTime = now;

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
    showBanner(\`📌 \${ai.name} DİKENLİ TELE BASTI! LASTİĞİ PATLADI!\`, 'buff-sword');
    scene.remove(st.mesh);
    activeSpikeStrips.splice(i, 1);
    break;
   }
  }
 }
}

// 6. HİDROLİK YAN DARBE (SHUNT - Z / C TUŞLARI)
let lastShuntTime = 0;
function performSideShunt(dir) {
 const now = performance.now();
 if (now - lastShuntTime < 2400 || carHealth <= 0) return;
 lastShuntTime = now;

 const sideDir = new T.Vector3(dir === 'left' ? -1 : 1, 0, 0).applyQuaternion(carGroup.quaternion);
 const shuntForce = sideDir.clone().multiplyScalar(22000);
 chassisBody.applyImpulse(new CANNON.Vec3(shuntForce.x, 200, shuntForce.z), chassisBody.position);

 spawnTireSmoke(carGroup.position);
 Snd.playCrash(0.8);

 // Yanımızdaki araca hasar vur
 for (let ai of aiOpponents) {
  if (ai.isDead) continue;
  const toAI = ai.chassisBody.position.vsub(chassisBody.position);
  if (toAI.length() < 3.4) {
   const aiDir = new T.Vector3(toAI.x, 0, toAI.z).normalize();
   if (sideDir.dot(aiDir) > 0.5) {
    applyAIDamage(ai, 42, ai.chassisBody.position, new T.Vector3(0, 1, 0));
    const aiShunt = sideDir.clone().multiplyScalar(18000);
    ai.chassisBody.applyImpulse(new CANNON.Vec3(aiShunt.x, 500, aiShunt.z), ai.chassisBody.position);
    showBanner(\`💥 YAN DARBE (SHUNT)! \${ai.name} BİÇİLDİ!\`, 'buff-sword');
    showRadioMessage('Tam isabet Frankenstein! Yandan gömdük, duvara yapıştı!', 'case');
    break;
   }
  }
 }
}
window.performSideShunt = performSideShunt;

// 7. SLOW-MOTION ADRENALİN BULLET-TIME (F TUŞU)
let lastBulletTime = 0;
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
let lastAirstrikeTime = 0;
function callHelicopterStrike() {
 const now = performance.now();
 if (now - lastAirstrikeTime < 35000 || carHealth <= 0) return;
 if (currentStage === 1) {
  showBanner('1. ETAP: HAVA SALDIRISI KİLİTLİ!', 'buff-shield');
  return;
 }
 lastAirstrikeTime = now;

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
   applyAIDamage(leaderAI, 75, leaderAI.chassisBody.position, new T.Vector3(0, 1, 0));
   showBanner(\`💥 HAVA SALDIRISI İSABETİ! \${leaderAI.name} VURULDU!\`, 'buff-sword');
  } else if (dreadnought && dreadnought.isActive && !dreadnought.isDead) {
   createExplosion(dreadnoughtBody.position, 16, 6000);
   dreadnought.health = Math.max(0, dreadnought.health - 90);
   showBanner('💥 HAVA SALDIRISI DREADNOUGHT\\'U VURDU!', 'buff-sword');
  }
 }, 2200);
}
window.callHelicopterStrike = callHelicopterStrike;

// 9. KELLE AVI (BOUNTY TARGET) SİSTEMİ
let bountyTargetAI = null;
let bountyTimer = 45.0;
const bountyHudEl = document.getElementById('bounty-hud');
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
 showBanner(\`🎯 YENİ KELLE AVI: \${bountyTargetAI.name}! (+100.000 PTS)\`, 'buff-sword');
 showRadioMessage(\`Hennessey anonsu: \${bountyTargetAI.name} başına ödül kondu! Onu yok eden zengin olur!\`, 'hennessey');
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
  if (upsideDownTimer > 1.2) {
   upsideDownTimer = 0;
   chassisBody.position.y += 1.2;
   chassisBody.quaternion.set(0, carGroup.quaternion.y, 0, carGroup.quaternion.w);
   chassisBody.angularVelocity.set(0, 0, 0);
   chassisBody.velocity.set(0, 0, 0);
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
 document.getElementById('stat-max-speed').textContent = Math.round(raceStats.maxSpeed) + ' km/s';
 document.getElementById('stat-nearmiss').textContent = raceStats.nearMisses;
 document.getElementById('stat-drift').textContent = Math.round(raceStats.driftScore) + ' PTS';
 document.getElementById('stat-credits').textContent = playerCredits.toLocaleString('tr-TR') + ' PTS';
 document.getElementById('stat-viewers').textContent = currentViewers.toLocaleString('tr-TR');

 const titleEl = document.getElementById('post-race-mvp-title');
 if (titleEl) {
  if (isEscape) titleEl.textContent = 'MVP: ÖZGÜRLÜK SAVAŞÇISI (ADADAN KAÇTI)';
  else if (raceStats.takedowns >= 3) titleEl.textContent = 'MVP: TERMINAL ISLAND KASABI (3+ TAKEDOWN)';
  else titleEl.textContent = 'MVP: FRANKENSTEIN (ARENA ŞAMPİYONU)';
 }
}
window.showPostRaceStats = showPostRaceStats;
`;

if (!code.includes('updateSlipstream')) {
  code = code.replace(/function updateActivationPlates/, mechanicsCore + '\nfunction updateActivationPlates');
}

// Hook triggerTakedown to call registerKillCombo and check Bounty
code = code.replace(
  /triggerTakedown\(ai\);/,
  `triggerTakedown(ai);
   registerKillCombo();
   if (bountyTargetAI && bountyTargetAI.id === ai.id) {
    bountyTargetAI = null;
    if (bountyHudEl) bountyHudEl.style.display = 'none';
    playerCredits += 100000;
    overdriveTimer = 12.0;
    showBanner('🎯 KELLE AVI TAMAMLANDI! +100.000 PTS & OVERDRIVE!', 'buff-sword');
    showRadioMessage('Kelle avı ödülünü kaptık Frankenstein! 100.000 Puan hesapta!', 'case');
   }`
);

// Hook keyboard shortcuts for new mechanics: E (EMP), B (Mine), X (Spikes), Z/C (Shunt), F (Bullet Time), U (Air Strike), V (Rear Camera)
const newKeyHandlers = `
  if (k === 'e') { triggerEMPBlast(); }
  if (k === 'b') { deployStickyMine(); }
  if (k === 'x') { deploySpikeStrip(); }
  if (k === 'z') { performSideShunt('left'); }
  if (k === 'c') { performSideShunt('right'); }
  if (k === 'f') { toggleBulletTime(); }
  if (k === 'u') { callHelicopterStrike(); }
`;

if (!code.includes("if (k === 'e')")) {
  code = code.replace(
    /if \(k === 'g'\) { toggleGarage\(\); }/,
    `if (k === 'g') { toggleGarage(); }\n` + newKeyHandlers
  );
}

// Rearview camera handling with V key in updateCamera
const rearViewCam = `
 if (KEYS['v']) {
  // 180° Geri Görüş Kamerası
  const rearOffset = new T.Vector3(0, 2.2, 7.5).applyQuaternion(carGroup.quaternion);
  camera.position.copy(carGroup.position).add(rearOffset);
  camera.lookAt(carGroup.position.x, carGroup.position.y + 0.5, carGroup.position.z);
  return;
 }
`;

if (!code.includes("if (KEYS['v'])")) {
  code = code.replace(/function updateCamera\(dt\) {/, 'function updateCamera(dt) {\n' + rearViewCam);
}

// Hook loop updates for all 22 mechanics
const mechanicsLoopCalls = `
  updateSlipstream(dt);
  updateMines(dt);
  updateSpikeStrips(dt);
  updateRollOverRecovery(dt);
  updateDreadnoughtPhases();

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
`;

if (!code.includes('updateSlipstream(dt);')) {
  code = code.replace(/updateCamera\(dt\);/, 'updateCamera(dt);\n' + mechanicsLoopCalls);
}

// Hook lap weather transition to updateLapWeather
code = code.replace(
  /lapCount = \(lapCount % MAX_LAPS\) \+ 1;/,
  `lapCount = (lapCount % MAX_LAPS) + 1;
   updateLapWeather(lapCount);`
);

// Hook showPostRaceStats to victory and race end
code = code.replace(
  /function triggerEscapeVictory\(\) {/,
  `function triggerEscapeVictory() {
  showPostRaceStats(true);`
);

// Export new methods to __DBG
code = code.replace(
  /window\.__DBG = {/,
  `window.__DBG = {
   triggerEMPNow: () => triggerEMPBlast(),
   deployMineNow: () => deployStickyMine(),
   deploySpikesNow: () => deploySpikeStrip(),
   performShuntNow: (d) => performSideShunt(d),
   toggleBulletTimeNow: () => toggleBulletTime(),
   callAirstrikeNow: () => callHelicopterStrike(),
   showStatsNow: (e) => showPostRaceStats(e),
   raceStats,`
);

fs.writeFileSync('js/game.js', code, 'utf8');
console.log('=== ALL 22 ADVANCED MECHANICS SUCCESSFULLY CODED INTO js/game.js ===');
