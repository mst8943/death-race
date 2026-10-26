const fs = require('fs');

console.log('--- APPLYING DEEP GAMEPLAY, STAGES, TAKEDOWNS, GARAGE & EXPANSION OVERHAUL ---');

let code = fs.readFileSync('js/game.js', 'utf8');

// 1. WIDEN TRACK WIDTH from 22 to 26
code = code.replace(/const TRACK_WIDTH = 22;/, 'const TRACK_WIDTH = 26;');

// 2. ADD SOUND SYNTHESIZERS TO Snd
const sndAdditions = `
  playRadioStatic() {
   this.init();
   if (!this.ctx) return;
   const now = this.ctx.currentTime;
   const bufLen = Math.floor(this.ctx.sampleRate * 0.14);
   const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
   const d = buf.getChannelData(0);
   for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * 0.35;
   const src = this.ctx.createBufferSource(); src.buffer = buf;
   const bpf = this.ctx.createBiquadFilter();
   bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(1750, now);
   const g = this.ctx.createGain();
   g.gain.setValueAtTime(0.25, now);
   g.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
   src.connect(bpf).connect(g).connect(this.ctx.destination);
   src.start(now);
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
   sub.connect(subG).connect(this.ctx.destination);
   sub.start(now); sub.stop(now + 0.75);
   for (let f of [220, 277, 330, 440]) {
    const o = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, now);
    og.gain.setValueAtTime(0.16, now);
    og.gain.exponentialRampToValueAtTime(0.01, now + 0.85);
    o.connect(og).connect(this.ctx.destination);
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
   osc.connect(g).connect(this.ctx.destination);
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
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now + i * 0.05); osc.stop(now + i * 0.05 + 0.35);
   }
  },`;

if (!code.includes('playRadioStatic(')) {
  code = code.replace(/playPowerup\(type\) {/, sndAdditions + '\n  playPowerup(type) {');
}

// 3. SHOW RADIO MESSAGE WITH RADIO STATIC SOUND
code = code.replace(
  /function showRadioMessage\(text, speaker = 'case', voiceLine = null\) {/,
  `function showRadioMessage(text, speaker = 'case', voiceLine = null) {
  Snd.playRadioStatic();`
);

// 4. ADD GAMEPLAY STATE VARIABLES (STAGES, TOMBSTONE, NEMESIS, PIT BAY, ESCAPE)
const stateVariables = `
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
  stageDisplayEl.textContent = 'ETAP 2: TAM SAVAŞ (SİLAHLAR & PLAKALAR AKTİF)';
 } else {
  stageDisplayEl.className = 'stage-tag stage-3';
  stageDisplayEl.textContent = 'ETAP 3: THE DREADNOUGHT & KALE KAPISI KAÇIŞI';
 }
}

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
`;

if (!code.includes('let currentStage = 1;')) {
  code = code.replace(/const CHECKPOINTS = \[/, stateVariables + '\nconst CHECKPOINTS = [');
}

// 5. STAGE 1 WEAPON LOCK IN shootBullet AND fireRocket
if (!code.includes('if (currentStage === 1)')) {
  code = code.replace(
    /function shootBullet\(\) {/,
    `function shootBullet() {
 if (currentStage === 1) {
  const nw = performance.now();
  if (nw - lastStage1WarnTime > 2500) {
   lastStage1WarnTime = nw;
   showBanner('1. ETAP: SİLAHLAR KİLİTLİ! RAMMING YAP!', 'buff-shield');
   showRadioMessage('1. Etapta silahlar kilitli Frankenstein! Önündekilere arkadan çarp, ramming yap!');
  }
  return;
 }`
  );

  code = code.replace(
    /function fireRocket\(\) {/,
    `function fireRocket() {
 if (currentStage === 1) {
  const nw = performance.now();
  if (nw - lastStage1WarnTime > 2500) {
   lastStage1WarnTime = nw;
   showBanner('1. ETAP: SİLAHLAR KİLİTLİ! RAMMING YAP!', 'buff-shield');
   showRadioMessage('1. Etapta roketler kilitli! Yalnızca gövde darbeleri geçerli!');
  }
  return;
 }`
  );
}

// 6. TAKEDOWN MECHANIC IN applyAIDamage
const takedownLogic = `
function triggerTakedown(victimAI) {
 timeScale = 0.25;
 setTimeout(() => { timeScale = 1.0; }, 750);
 nitroAmount = 100;
 Snd.playTakedownSting();
 addViewers(1500000, '★ TAKEDOWN! ' + victimAI.name + ' ★');
 playerCredits += 50000;
 if (currencyValEl) currencyValEl.textContent = playerCredits.toLocaleString('tr-TR');
 showBanner('🔥 TAKEDOWN! ' + victimAI.name + ' HURDA EDİLDİ!', 'buff-sword');
 showRadioMessage('Mükemmel vuruş Frankenstein! ' + victimAI.name + ' hurdaya çıktı, nitro tamamen doldu!', 'case');

 if (victimAI.isNemesis) {
  victimAI.isNemesis = false;
  if (nemesisHudEl) nemesisHudEl.style.display = 'none';
  showBanner('NEMESIS İNTİKAMI ALINDI!', 'buff-shield');
 }
}
`;

if (!code.includes('function triggerTakedown')) {
  code = code.replace(/function applyAIDamage/, takedownLogic + '\nfunction applyAIDamage');
}

// Hook triggerTakedown into ai.health <= 0
code = code.replace(
  /ai\.isDead = true;\s+detachAIPart\(ai, 'part_tombstone'\);/,
  `ai.isDead = true;
   detachAIPart(ai, 'part_tombstone');
   triggerTakedown(ai);`
);

// 7. TOMBSTONE ABSORPTION IN applyCarDamage
const tombstoneAbsorb = `
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
`;

if (!code.includes('Arka Tombstone Kalkanı Darbe Emme Kontrolü')) {
  code = code.replace(
    /if \(shieldTimer > 0\) {[\s\S]*?return;\s+}/,
    `if (shieldTimer > 0) {
  if (contactPoint) spawnSparks(new T.Vector3(contactPoint.x, contactPoint.y, contactPoint.z), new T.Vector3(0, 1, 0), 15);
  Snd.playImpact();
  return;
 }
` + tombstoneAbsorb
  );
}

// 8. T KEY DROPS TOMBSTONE
code = code.replace(
  /if \(KEYS\['t'\]\) { detachArmorPart\('part_tombstone'\); KEYS\['t'\] = false; }/,
  `if (KEYS['t']) { dropTombstone(); KEYS['t'] = false; }`
);

// 9. NEMESIS AGGRAVATION IN applyAIDamage
const nemesisTrigger = `
 if (!ai.isNemesis && ai.health > 0 && Math.random() < 0.7) {
  ai.isNemesis = true;
  if (nemesisHudEl && nemesisTextEl) {
   nemesisHudEl.style.display = 'block';
   nemesisTextEl.textContent = '⚠️ NEMESIS KİLİTLENDİ: ' + ai.name + ' İNTİKAM ARIYOR!';
  }
  showRadioMessage(ai.name + ': Frankenstein! Peşini bırakmayacağım, bu pist mezarın olacak!', 'hennessey');
 }
`;

if (!code.includes('ai.isNemesis = true;')) {
  code = code.replace(
   /ai\.health = Math\.max\(0, ai\.health - dmg\);/,
   `ai.health = Math.max(0, ai.health - dmg);` + nemesisTrigger
  );
}

// 10. STAGE PROGRESSION IN updateCheckpoints
const stageProgression = `
    // Çok Aşamalı Yarış & Senaryo Geçişleri
    if (lapCount === 2) {
     currentStage = 2;
     updateStageHUD();
     showBanner('2. ETAP: SİLAHLAR DEVREDE! TAM SAVAŞ!', 'buff-sword');
     showRadioMessage('1. Etap bitti! Silahlar açıldı Frankenstein! Tara şunları!', 'case');
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
`;

if (!code.includes('currentStage = 2;')) {
  code = code.replace(
    /if \(lapCount >= 2 && !dreadnought\.isActive\) activateDreadnought\(\);/,
    stageProgression
  );
}

// 11. BUILD FACTORY PIT-STOP BAY & FORTRESS ESCAPE GATE
const mapExpansions = `
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

// 2. KALE KAÇIŞ KAPISI & LİMAN RAMPASI (FORTRESS ESCAPE GATE & BREAKOUT RAMP)
const fortressGateGroup = new T.Group();
const gatePillarMat = new T.MeshStandardMaterial({ color: '#1e222b', roughness: 0.6, metalness: 0.8 });
const gateDoorMat = new T.MeshStandardMaterial({ color: '#8a1f11', roughness: 0.5, metalness: 0.7 });

const gPillarL = new T.Mesh(new T.BoxGeometry(2.5, 12, 2.5), gatePillarMat);
gPillarL.position.set(-16.0, 6.0, 810.0); fortressGateGroup.add(gPillarL);
const gPillarR = new T.Mesh(new T.BoxGeometry(2.5, 12, 2.5), gatePillarMat);
gPillarR.position.set(16.0, 6.0, 810.0); fortressGateGroup.add(gPillarR);
const gBeamTop = new T.Mesh(new T.BoxGeometry(34.5, 2.2, 2.5), gatePillarMat);
gBeamTop.position.set(0, 11.5, 810.0); fortressGateGroup.add(gBeamTop);

const gateDoorL = new T.Mesh(new T.BoxGeometry(14.5, 9.5, 0.8), gateDoorMat);
gateDoorL.position.set(-7.5, 5.0, 810.0); fortressGateGroup.add(gateDoorL);
const gateDoorR = new T.Mesh(new T.BoxGeometry(14.5, 9.5, 0.8), gateDoorMat);
gateDoorR.position.set(7.5, 5.0, 810.0); fortressGateGroup.add(gateDoorR);

const gateAlarmLight = new T.PointLight('#ff1100', 3.0, 40);
gateAlarmLight.position.set(0, 13.0, 810.0); fortressGateGroup.add(gateAlarmLight);

// Liman Atlama Rampası (Okyanusa doğru uzanan çelik rampa)
const rampMat = new T.MeshStandardMaterial({ color: '#f39c12', roughness: 0.4, metalness: 0.8 });
const rampGeo = new T.BoxGeometry(14, 0.8, 30);
const escapeRampMesh = new T.Mesh(rampGeo, rampMat);
escapeRampMesh.rotation.x = -0.26;
escapeRampMesh.position.set(0, 3.8, 835.0);
fortressGateGroup.add(escapeRampMesh);

// Okyanustaki Kargo Gemisi (Kaçış Hedefi)
const cargoShipGroup = new T.Group();
const shipHull = new T.Mesh(new T.BoxGeometry(36, 12, 110), new T.MeshStandardMaterial({ color: '#1a1f26', roughness: 0.8, metalness: 0.5 }));
shipHull.position.set(0, 1.0, 940.0); cargoShipGroup.add(shipHull);
const shipDeck = new T.Mesh(new T.BoxGeometry(32, 1.2, 95), new T.MeshStandardMaterial({ color: '#c0392b', roughness: 0.6 }));
shipDeck.position.set(0, 7.2, 940.0); cargoShipGroup.add(shipDeck);
fortressGateGroup.add(cargoShipGroup);

scene.add(fortressGateGroup);

let isGateBreached = false;
function breachFortressGate() {
 if (isGateBreached) return;
 isGateBreached = true;
 gateDoorL.rotation.y = -Math.PI / 2.2;
 gateDoorR.rotation.y = Math.PI / 2.2;
 gateDoorL.position.x = -13.5;
 gateDoorR.position.x = 13.5;
 createExplosion(new CANNON.Vec3(0, 5, 810), 14, 5000);
 gateAlarmLight.color.setHex(0x00ff00);
 showBanner('KALE ÇIKIŞ KAPISI KIRILDI! LİMAN RAMPASINDAN KAÇ!', 'buff-sword');
 showRadioMessage('Kale kapısı patlatıldı Frankenstein! Rampadan kargo gemisine atla ve adadan kaç!', 'case');
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
}
`;

if (!code.includes('FABRİKA PİT ALANI')) {
  code = code.replace(/function updateCheckpoints/, mapExpansions + '\nfunction updateCheckpoints');
}

// 12. EXPANDED 12+ PRESSURE PADS WITH 3D ROTATING HOLOGRAMS
const padHolograms = `
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
`;

if (!code.includes('createHologramMesh')) {
  code = code.replace(/function createPlate\(type, pos\) {/, padHolograms + '\nfunction createPlate(type, pos) {');
}

// Update createPlate to include rotating hologram badge and light
code = code.replace(
  /const beam = new T\.Mesh\(new T\.CylinderGeometry\(0\.6, 0\.6, 5, 8\), new T\.MeshBasicMaterial\(\{ color, transparent: true, opacity: 0\.25 \}\)\);\s+beam\.position\.y = 2\.5; plateGroup\.add\(beam\);\s+scene\.add\(plateGroup\);\s+activationPlates\.push\(\{ type, x: pos\[0\], z: pos\[1\], radius: 2\.8, cooldown: 0, innerMesh: inner, beamMesh: beam \}\);/,
  `const beam = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, 5, 8), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 }));
  beam.position.y = 2.5; plateGroup.add(beam);

  const holo = createHologramMesh(type);
  holo.position.y = 2.2;
  plateGroup.add(holo);

  const pLight = new T.PointLight(color, 1.8, 14);
  pLight.position.y = 1.8;
  plateGroup.add(pLight);

  scene.add(plateGroup);
  activationPlates.push({ type, x: pos[0], z: pos[1], radius: 3.5, cooldown: 0, innerMesh: inner, beamMesh: beam, holoMesh: holo, pLight });`
);

// Add 12 total strategic pads along the 3X circuit
const additionalPlates = `
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
`;

if (!code.includes("createPlate('sword', [0, 420]);")) {
  code = code.replace(/createPlate\('sword', \[0, 300\]\);[\s\S]*?createPlate\('skull', \[54\.0, -435\]\);/, additionalPlates);
}

// 13. SKULL PLATE TRIGGERING CRUSHERS & CRANE
const skullEnhanced = `
    } else if (p.type === 'skull') {
     triggerFlameJet(p.x - 3, p.z - 3); triggerFlameJet(p.x + 3, p.z - 3);
     triggerFlameJet(p.x - 3, p.z + 3); triggerFlameJet(p.x + 3, p.z + 3);
     // Fabrika preslerini anında yere indir
     for (let c of HANGAR_CRUSHERS) { c.headMesh.position.y = 1.2; c.body.position.y = 1.2; }
     // Konteyner vinci hasar alıp sarsılsın
     if (craneStructure && !craneStructure.isCollapsed) craneStructure.takeDamage(40);
     Snd.playImpact();
     showBanner('SKULL TUZAĞI: FABRİKA PRESLERİ & ALEVLER TETİKLENDİ!', 'buff-sword');
     showRadioMessage('Kafatası tuzağı tetiklendi! Arkamızdaki yol cehenneme döndü!', 'case');
     addViewers(150000, 'TUZAK TETİKLENDİ!');
    }
`;

code = code.replace(
  /} else if \(p\.type === 'skull'\) {\s+triggerFlameJet\(p\.x - 2, p\.z - 2\);[\s\S]*?addViewers\(100000, 'ALEV TUZAĞI PATLADI!'\);\s+}/,
  skullEnhanced
);

// 14. HOOK PIT-STOP CHECK, ESCAPE CHECK, AND GARAGE TURNTABLE INTO loop()
const loopAdditions = `
  // Pit-Stop Bay Kontrolü (Fabrika İçi Onarım & İkmal)
  const distToPit = Math.hypot(chassisBody.position.x - 215.0, chassisBody.position.z - 160.0);
  const pSpeedKmh = chassisBody.velocity.length() * 3.6;
  if (distToPit < 22.0 && pSpeedKmh < 85.0) {
   if (pitHudEl) pitHudEl.style.display = 'block';
   const maxHP = 100 + (upgrades.armor - 1) * 35;
   carHealth = Math.min(maxHP, carHealth + 30 * dt);
   if (!isTombstoneDetached) tombstoneHealth = Math.min(tombstoneMaxHealth, tombstoneHealth + 25 * dt);
   lastRPGTime = 0; // Roket anında dolduruldu
   if (Math.random() < 0.15) spawnSparks(chassisBody.position, new T.Vector3(0, 1, 0), 3);
  } else {
   if (pitHudEl) pitHudEl.style.display = 'none';
  }

  // Kale Kaçış Kapısı & Atlama Rampası Kontrolü
  if (isGateBreached && !isEscaped) {
   const pPos = chassisBody.position;
   if (pPos.z > 830.0 && pPos.z < 865.0 && Math.abs(pPos.x) < 10.0 && pSpeedKmh > 75.0) {
    triggerEscapeVictory();
   }
  }

  // Garaj 3D Vitrin Döner Kamera
  if (garageModeActive) {
   garageCamAngle += dt * 0.45;
   camera.position.set(
    carGroup.position.x + Math.sin(garageCamAngle) * 5.8,
    carGroup.position.y + 1.8,
    carGroup.position.z + Math.cos(garageCamAngle) * 5.8
   );
   camera.lookAt(carGroup.position.x, carGroup.position.y + 0.6, carGroup.position.z);
  }

  // Dönen Hologram Rozetleri Animasyonu
  for (let p of activationPlates) {
   if (p.holoMesh) {
    p.holoMesh.rotation.y += dt * 2.2;
    p.holoMesh.position.y = 2.2 + Math.sin(performance.now() * 0.004 + p.x) * 0.2;
   }
  }
`;

if (!code.includes('Pit-Stop Bay Kontrolü')) {
  code = code.replace(/updateCamera\(dt\);/, 'updateCamera(dt);\n' + loopAdditions);
}

// 15. GARAGE TOGGLE 3D MODE
code = code.replace(
  /function toggleGarage\(\) {\s+const isOpen = garageModalEl\.classList\.toggle\('open'\);\s+if \(isOpen\) {\s+garageCreditsEl\.textContent = playerCredits\.toLocaleString\('tr-TR'\);\s+}\s+}/,
  `function toggleGarage() {
 const isOpen = garageModalEl.classList.toggle('open');
 garageModeActive = isOpen;
 if (isOpen) {
  garageCreditsEl.textContent = playerCredits.toLocaleString('tr-TR');
  showRadioMessage('Weyland Motorworks atölyesine hoş geldin! Frankenstein burada modifiye edilir!', 'case');
 }
}`
);

// 16. ENHANCE UPGRADE LEVELS (Level 1..5)
code = code.replace(
  /const costs = {\s+engine: \[0, 50000, 120000\],[\s\S]*?rocket: \[0, 75000, 150000\]\s+};/,
  `const costs = {
  engine: [0, 50000, 120000, 200000, 350000],
  armor: [0, 60000, 130000, 220000, 380000],
  gun: [0, 55000, 110000, 190000, 320000],
  rocket: [0, 75000, 150000, 250000, 420000]
 };`
);

code = code.replace(/if \(curLvl >= 3\)/, 'if (curLvl >= 5)');
code = code.replace(/upgrades\.engine < 3/, 'upgrades.engine < 5');
code = code.replace(/upgrades\.armor < 3/, 'upgrades.armor < 5');
code = code.replace(/upgrades\.gun < 3/, 'upgrades.gun < 5');
code = code.replace(/upgrades\.rocket < 3/, 'upgrades.rocket < 5');
code = code.replace(/SEVİYE \$\{upgrades\.engine\}\/3/, 'SEVİYE ${upgrades.engine}/5');
code = code.replace(/SEVİYE \$\{upgrades\.armor\}\/3/, 'SEVİYE ${upgrades.armor}/5');
code = code.replace(/SEVİYE \$\{upgrades\.gun\}\/3/, 'SEVİYE ${upgrades.gun}/5');
code = code.replace(/SEVİYE \$\{upgrades\.rocket\}\/3/, 'SEVİYE ${upgrades.rocket}/5');

// Update __DBG object for tests
code = code.replace(
  /window\.__DBG = {/,
  `window.__DBG = {
   currentStage,
   tombstoneHealth,
   isTombstoneDetached,
   isGateBreached,
   isEscaped,
   breachGateNow: () => breachFortressGate(),
   dropTombstoneNow: () => dropTombstone(),
   triggerEscapeNow: () => triggerEscapeVictory(),
   triggerTakedownNow: (ai) => triggerTakedown(ai),`
);

fs.writeFileSync('js/game.js', code, 'utf8');
console.log('--- ALL GAMEPLAY OVERHAULS SUCCESSFULLY APPLIED TO js/game.js ---');
