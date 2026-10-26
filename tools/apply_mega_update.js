const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', 'js', 'game.js');
let content = fs.readFileSync(gameJsPath, 'utf8');

function replaceBlock(name, startPattern, endPattern, newContent) {
  const startIdx = content.indexOf(startPattern);
  if (startIdx === -1) {
    console.error(`Start pattern not found for ${name}: "${startPattern}"`);
    process.exit(1);
  }
  const endIdx = content.indexOf(endPattern, startIdx);
  if (endIdx === -1) {
    console.error(`End pattern not found for ${name}: "${endPattern}"`);
    process.exit(1);
  }
  const fullEndIdx = endIdx + endPattern.length;
  content = content.slice(0, startIdx) + newContent + content.slice(fullEndIdx);
  console.log(`Successfully replaced: ${name}`);
}

// 1. Audio additions in Snd
const newAudioMethods = ` playCheckpoint() {
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
   osc.connect(g).connect(this.ctx.destination);
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
   osc.connect(g).connect(this.ctx.destination);
   osc.start(now + i * 0.16); osc.stop(now + i * 0.16 + 0.38);
  });
 },
 playHydraulicSlam() {
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
 },
 playHeavyGunshot() {
  this.init();
  if (!this.ctx) return;
  const now = this.ctx.currentTime;
  const osc = this.ctx.createOscillator();
  const og = this.ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(95, now);
  osc.frequency.exponentialRampToValueAtTime(28, now + 0.12);
  og.gain.setValueAtTime(0.65, now);
  og.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
  osc.connect(og).connect(this.ctx.destination);
  osc.start(now); osc.stop(now + 0.12);

  const bufLen = Math.floor(this.ctx.sampleRate * 0.1);
  const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.25));
  const noise = this.ctx.createBufferSource(); noise.buffer = buf;
  const bpf = this.ctx.createBiquadFilter();
  bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(2100, now);
  bpf.Q.value = 1.8;
  const ng = this.ctx.createGain();
  ng.gain.setValueAtTime(0.55, now);
  ng.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
  noise.connect(bpf).connect(ng).connect(this.ctx.destination);
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
  osc.connect(g).connect(this.ctx.destination);
  osc.start(now); osc.stop(now + 0.25);
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
  osc.connect(g).connect(this.ctx.destination);
  osc.start(now); osc.stop(now + 0.1);
 },
 updateCrowd(vol, speed) {
  if (!this.ctx) return;
  if (!this.crowdSource) {
   const bufLen = Math.floor(this.ctx.sampleRate * 2.0);
   const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
   const d = buf.getChannelData(0);
   for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
   this.crowdSource = this.ctx.createBufferSource();
   this.crowdSource.buffer = buf;
   this.crowdSource.loop = true;
   const bpf = this.ctx.createBiquadFilter();
   bpf.type = 'bandpass'; bpf.frequency.value = 750; bpf.Q.value = 1.0;
   this.crowdGain = this.ctx.createGain();
   this.crowdGain.gain.value = 0;
   this.crowdSource.connect(bpf).connect(this.crowdGain).connect(this.ctx.destination);
   try { this.crowdSource.start(); } catch (e) {}
  }
  if (this.crowdGain) {
   const targetGain = Math.min(0.35, (vol * (speed / 30)) * 0.35);
   this.crowdGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.2);
  }
 }
};`;

replaceBlock('1. Audio in Snd', ' playCheckpoint() {', '};\n\n/* ==========================================================', newAudioMethods + '\n\n/* ==========================================================');

// 2. Armor Visuals & Skin Selector
const newUpgradeItemBlock = `  carHealth = Math.min(100 + (upgrades.armor - 1) * 35, carHealth + 35);
  updateArmorVisuals();
 } else if (type === 'gun') {`;
replaceBlock('2. Armor upgrade visuals trigger', `  carHealth = Math.min(100 + (upgrades.armor - 1) * 35, carHealth + 35);\n } else if (type === 'gun') {`, ` } else if (type === 'gun') {`, newUpgradeItemBlock);

const newSkinsBlock = `window.upgradeItem = upgradeItem;

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

function applyCarSkin(skinId) {
 const skin = CAR_SKINS[skinId];
 if (!skin) return;
 currentSkin = skinId;
 if (carBodyMesh) {
  carBodyMesh.traverse(o => {
   if (o.isMesh && o.material) {
    if (o.name === 'chassis' || o.name.startsWith('part_')) {
     o.material.color.setStyle(skin.bodyColor);
     o.material.metalness = skin.metalness;
     o.material.roughness = skin.roughness;
    }
   }
  });
 }
 document.querySelectorAll('.skin-card').forEach(el => el.classList.remove('active'));
 const activeEl = document.getElementById(\`skin-\${skinId}\`);
 if (activeEl) activeEl.classList.add('active');
 Snd.playPowerup('shield');
 showBanner(\`YENİ BOYA UYGULANDI: \${skin.name}\`, 'buff-shield');
 showRadioMessage(\`Yeni kamuflaj uygulandı Frankenstein! Görünüşümüz kusursuz!\`, 'case', 'New paint job applied Frankenstein!');
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
}`;
replaceBlock('3. Skin and ram bumper logic', 'window.upgradeItem = upgradeItem;', 'window.upgradeItem = upgradeItem;', newSkinsBlock);

// 3. Weather Headlights
const newWeatherBlock = `function setWeather(mode) {
 weatherMode = mode;
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
  showBanner('HAVA DURUMU: ZİFİRİ SİSLİ GECE [H]');
  showRadioMessage('Karanlık çöktü! Farlarını ve projektörleri açık tut!', 'case', 'Pitch black night! Keep headlights on!');
 }
}`;
replaceBlock('4. Weather with Headlights', 'function setWeather(mode) {', 'function triggerLightning() {', newWeatherBlock + '\n\nfunction triggerLightning() {');

// 4. Speech Synthesis and Dual-Channel Radio
const newRadioBlock = `function speakVoice(text, speaker = 'case') {
 if (!('speechSynthesis' in window)) return;
 try {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices() || [];
  if (speaker === 'hennessey') {
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
  window.speechSynthesis.speak(utter);
 } catch (e) {}
}

const radioSpeakerLabelEl = document.getElementById('radio-speaker-label');

function showRadioMessage(text, speaker = 'case', voiceLine = null) {
 if (!radioBoxEl) return;
 radioTextEl.textContent = \`"\${text}"\`;
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
}`;
replaceBlock('5. Speech Synthesis & showRadioMessage', 'function showRadioMessage(text) {', 'Snd.playRadioChirp();\n}', newRadioBlock);

// 5. Mount Headlights to carGroup
const newHeadlightsMount = `const engineFireLight = new T.PointLight('#ff4400', 0, 10); engineFireLight.position.set(0, 0.5, 0.8); carGroup.add(engineFireLight);

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
rightHeadlight.target = rightHeadlightTarget;`;
replaceBlock('6. Headlights to carGroup', 'const engineFireLight = new T.PointLight(\'#ff4400\', 0, 10); engineFireLight.position.set(0, 0.5, 0.8); carGroup.add(engineFireLight);', 'carGroup.add(engineFireLight);', newHeadlightsMount);

// 6. Structures & Rain Canvas
const newStructuresDef = `
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
   GİZLİ KISAYOL: HANGAR DÖKÜMHANESİ & 3 DEV HİDROLİK PRES
   ========================================================== */
const HANGAR_CRUSHERS = [];
let insideHangarState = false;

function createHangarShortcut() {
 const pStart = new T.Vector3(63, 0, 58);
 const pEnd = new T.Vector3(29, 0, -28);
 const dir = pEnd.clone().sub(pStart);
 const len = dir.length();
 const forward = dir.clone().normalize();
 const angle = Math.atan2(forward.x, forward.z);
 const midPt = pStart.clone().addScaledVector(forward, len * 0.5);

 const hRoadGeo = new T.BoxGeometry(9.0, 0.08, len);
 const hRoadMat = new T.MeshStandardMaterial({ color: '#1a1c22', roughness: 0.9, metalness: 0.1 });
 const hRoadMesh = new T.Mesh(hRoadGeo, hRoadMat);
 hRoadMesh.position.set(midPt.x, 0.02, midPt.z);
 hRoadMesh.rotation.y = angle;
 hRoadMesh.receiveShadow = true;
 scene.add(hRoadMesh);

 const hCurbMat = new T.MeshStandardMaterial({ color: '#f39c12', roughness: 0.6 });
 for (let s of [-1, 1]) {
  const curb = new T.Mesh(new T.BoxGeometry(0.5, 0.2, len), hCurbMat);
  curb.position.set(midPt.x + Math.cos(angle) * (s * 4.6), 0.1, midPt.z - Math.sin(angle) * (s * 4.6));
  curb.rotation.y = angle;
  scene.add(curb);
 }

 const wallMat = new T.MeshStandardMaterial({ color: '#2b2f36', roughness: 0.8, metalness: 0.4 });
 for (let s of [-1, 1]) {
  const wallBody = new CANNON.Body({ mass: 0, material: groundMat });
  wallBody.addShape(new CANNON.Box(new CANNON.Vec3(0.4, 3.5, len * 0.5)));
  const perp = new T.Vector3(-forward.z, 0, forward.x).multiplyScalar(s * 4.8);
  wallBody.position.set(midPt.x + perp.x, 3.5, midPt.z + perp.z);
  wallBody.quaternion.setFromEuler(0, angle, 0);
  world.addBody(wallBody);

  const wallMesh = new T.Mesh(new T.BoxGeometry(0.6, 7.0, len), wallMat);
  wallMesh.position.copy(wallBody.position);
  wallMesh.quaternion.copy(wallBody.quaternion);
  wallMesh.castShadow = true;
  scene.add(wallMesh);
 }

 const numGirders = 8;
 for (let i = 0; i < numGirders; i++) {
  const gPos = pStart.clone().addScaledVector(forward, (i + 0.5) * (len / numGirders));
  const girder = new T.Mesh(new T.BoxGeometry(10.2, 0.6, 0.6), wallMat);
  girder.position.set(gPos.x, 7.2, gPos.z);
  girder.rotation.y = angle;
  scene.add(girder);

  if (i % 2 === 0) {
   const lamp = new T.PointLight('#ff9922', 2.8, 16);
   lamp.position.set(gPos.x, 6.4, gPos.z);
   scene.add(lamp);
  }
 }

 for (let [pos, rot] of [[pStart, angle], [pEnd, angle + Math.PI]]) {
  const signBar = new T.Mesh(new T.BoxGeometry(10.5, 1.2, 0.4), new T.MeshStandardMaterial({ color: '#c0392b', roughness: 0.5 }));
  signBar.position.set(pos.x, 5.8, pos.z);
  signBar.rotation.y = rot;
  scene.add(signBar);
 }

 const crusherMat = new T.MeshStandardMaterial({ color: '#1f242c', roughness: 0.3, metalness: 0.9 });
 const pistonShaftMat = new T.MeshStandardMaterial({ color: '#d0d4dc', roughness: 0.1, metalness: 0.95 });
 const hazardLightMat = new T.MeshBasicMaterial({ color: '#ff2200' });

 const ratios = [0.25, 0.50, 0.75];
 for (let idx = 0; idx < 3; idx++) {
  const cPos = pStart.clone().addScaledVector(forward, len * ratios[idx]);
  const group = new T.Group();
  group.position.set(cPos.x, 4.5, cPos.z);
  group.rotation.y = angle;
  scene.add(group);

  const hammer = new T.Mesh(new T.BoxGeometry(8.2, 2.4, 3.2), crusherMat);
  hammer.castShadow = true;
  group.add(hammer);

  for (let spx = -3.2; spx <= 3.2; spx += 1.6) {
   for (let spz = -1.0; spz <= 1.0; spz += 1.0) {
    const spike = new T.Mesh(new T.ConeGeometry(0.18, 0.6, 6), crusherMat);
    spike.position.set(spx, -1.5, spz);
    spike.rotation.x = Math.PI;
    group.add(spike);
   }
  }

  for (let sx of [-2.4, 2.4]) {
   const shaft = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 5.0, 12), pistonShaftMat);
   shaft.position.set(sx, 2.8, 0);
   group.add(shaft);
  }

  const strobe = new T.Mesh(new T.SphereGeometry(0.25, 8, 8), hazardLightMat);
  strobe.position.set(0, -1.2, 1.65);
  group.add(strobe);

  const crusherLight = new T.PointLight('#ff3300', 0, 10);
  crusherLight.position.set(0, -1.2, 1.8);
  group.add(crusherLight);

  HANGAR_CRUSHERS.push({
   group, strobe, light: crusherLight,
   pos: cPos,
   phaseOffset: idx * 1.35,
   lastSlamTime: 0
  });
 }
}

function updateHangarCrushers(dt) {
 const time = performance.now() * 0.001;
 const pPos = chassisBody.position;
 const inHangarRegion = pPos.x > 26 && pPos.x < 65 && pPos.z > -30 && pPos.z < 60;

 if (inHangarRegion && !insideHangarState) {
  insideHangarState = true;
  showBanner('TEHLİKELİ KISAYOL: HANGAR DÖKÜMHANESİ!', 'buff-sword');
  showRadioMessage('Preslerin zamanlamasına dikkat et Frankenstein! Altında ezilme!', 'case', 'Watch out for the hydraulic presses!');
  addViewers(45000);
 } else if (!inHangarRegion && insideHangarState) {
  insideHangarState = false;
  showBanner('HANGAR KISAYOLU TAMAMLANDI! (+4 SANİYE)', 'buff-sword');
  showRadioMessage('Temiz çıktık Frankenstein! Rakiplere 4 saniye fark attık!', 'case', 'Great driving, shortcut clear!');
  addViewers(80000);
 }

 for (let c of HANGAR_CRUSHERS) {
  const cycle = (time + c.phaseOffset) % 3.6;
  let yPos = 5.2;

  if (cycle < 1.8) {
   yPos = 5.2;
   c.light.intensity = 0;
   c.strobe.material.color.set('#551100');
  } else if (cycle < 2.4) {
   yPos = 5.2;
   const strobeOn = Math.sin(time * 25) > 0;
   c.light.intensity = strobeOn ? 4.0 : 0;
   c.strobe.material.color.set(strobeOn ? '#ff2200' : '#440000');
  } else if (cycle < 2.65) {
   const dropProgress = (cycle - 2.4) / 0.25;
   yPos = 5.2 - dropProgress * 4.4;
   c.light.intensity = 5.0;
   c.strobe.material.color.set('#ff0000');

   if (cycle >= 2.6 && (time - c.lastSlamTime > 1.5)) {
    c.lastSlamTime = time;
    Snd.playHydraulicSlam();
    spawnSparks(c.pos, new T.Vector3(0, 1, 0), 20);
    cameraShake = Math.max(cameraShake, 0.35);

    const distToCar = Math.hypot(pPos.x - c.pos.x, pPos.z - c.pos.z);
    if (distToCar < 4.2 && pPos.y < 2.2) {
     applyCarDamage(45, pPos, new T.Vector3(0, -1, 0));
     showBanner('HİDROLİK PRESE YAKALANDIN!', 'buff-sword');
     showRadioMessage('Kahretsin! Pres aracın tavanını ezdi!', 'case', 'Warning! Direct crusher impact!');
     cameraShake = 0.75;
     detachArmorPart('part_roof');
    }

    for (let ai of aiOpponents) {
     if (ai.isDead) continue;
     const aPos = ai.chassisBody.position;
     const distToAI = Math.hypot(aPos.x - c.pos.x, aPos.z - c.pos.z);
     if (distToAI < 4.2 && aPos.y < 2.2) {
      applyAIDamage(ai, 50, aPos, new T.Vector3(0, 1, 0));
      showBanner(\`\${ai.name} HİDROLİK PRESE YAKALANDI!\`, 'buff-sword');
      showRadioMessage(\`\${ai.name} presin altında kaldı, ezildi!\`, 'hennessey', 'Racer crushed by the hydraulic press!');
     }
    }
   }
  } else if (cycle < 3.1) {
   yPos = 0.8;
   c.light.intensity = 2.0;
  } else {
   const retractProgress = (cycle - 3.1) / 0.5;
   yPos = 0.8 + retractProgress * 4.4;
   c.light.intensity = 0;
   c.strobe.material.color.set('#220000');
  }

  c.group.position.y = yPos;
 }
}

/* ==========================================================
   YIKILABİLİR KONTEYNER VİNCİ (DESTUCTIBLE GANTRY CRANE)
   ========================================================== */
let craneStructure = null;

function createContainerCrane() {
 const craneGroup = new T.Group();
 const cranePos = new T.Vector3(68, 0, 110);
 craneGroup.position.copy(cranePos);
 scene.add(craneGroup);

 const steelMat = new T.MeshStandardMaterial({ color: '#f39c12', roughness: 0.5, metalness: 0.8 });
 const trussMat = new T.MeshStandardMaterial({ color: '#2c3e50', roughness: 0.6, metalness: 0.7 });
 const containerMat = new T.MeshStandardMaterial({ color: '#a93226', roughness: 0.7, metalness: 0.3 });

 for (let side of [-1, 1]) {
  const legX = side * 12.5;
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

 const truss = new T.Mesh(new T.BoxGeometry(27.0, 1.8, 4.0), trussMat);
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
      applyAIDamage(ai, 85, ai.chassisBody.position, new T.Vector3(0, 1, 0));
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

 const concreteMat = new T.MeshStandardMaterial({ color: '#252830', roughness: 0.9, metalness: 0.1 });
 const steelMat = new T.MeshStandardMaterial({ color: '#3b404a', roughness: 0.6, metalness: 0.7 });
 const fenceMat = new T.MeshStandardMaterial({ color: '#888d96', roughness: 0.4, metalness: 0.85, wireframe: true });
 const orangeUniformMat = new T.MeshStandardMaterial({ color: '#e67e22', roughness: 0.8 });
 const headMat = new T.MeshStandardMaterial({ color: '#d5c4a1', roughness: 0.8 });

 for (let tier = 0; tier < 3; tier++) {
  const tierMesh = new T.Mesh(new T.BoxGeometry(3.0, 1.2, 70), concreteMat);
  tierMesh.position.set(-15.5 - tier * 2.5, 0.6 + tier * 1.2, 50);
  tierMesh.receiveShadow = true;
  standGroup.add(tierMesh);
 }

 const fence = new T.Mesh(new T.BoxGeometry(0.2, 6.0, 74), fenceMat);
 fence.position.set(-13.5, 3.0, 50);
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
  inmateGroup.add(armL);

  const armR = new T.Mesh(new T.BoxGeometry(0.12, 0.55, 0.12), orangeUniformMat);
  armR.position.set(0.32, 1.1, 0);
  inmateGroup.add(armR);

  CROWD_INMATES.push({
   group: inmateGroup,
   armL, armR,
   phase: i * 0.35 + Math.random(),
   speed: 4.5 + Math.random() * 3.0
  });
 }

 for (let zT of [14, 86]) {
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

 for (let sl of GUARD_SEARCHLIGHTS) {
  const sweep = Math.sin(time * 0.8 + sl.phase);
  sl.targetObj.position.x = 16 + sweep * 6;
  sl.targetObj.position.z = sweep * 14;
 }

 const pPos = chassisBody.position;
 const inStraight = pPos.z > 10 && pPos.z < 90 && pPos.x < 15;
 const speed = chassisBody.velocity.length();
 if (inStraight && speed > 8.0) {
  Snd.updateCrowd(1.0, speed);
 } else {
  Snd.updateCrowd(0.0, 0);
 }
}
`;

const finishLineTrigger = `finishLine.rotation.x = -Math.PI / 2; finishLine.position.set(0, 0.025, 0); scene.add(finishLine);`;
replaceBlock('7. Instantiate Hangar, Crane, Grandstands, RainCanvas', finishLineTrigger, finishLineTrigger, finishLineTrigger + '\n' + newStructuresDef + '\ncreateHangarShortcut();\ncreateContainerCrane();\ncreateGrandstandsAndGuards();\ninitRainCanvas();\n');

// 7. Minigun upgrade visuals
const minigunStart = ` const bMesh = new T.Mesh(bulletGeo, bulletMatPlayer);`;
const minigunEnd = ` Snd.playGunshot(false);`;
const minigunReplacement = ` const bMat = upgrades.gun >= 3 ? new T.MeshBasicMaterial({ color: '#ff2200' }) : (upgrades.gun >= 2 ? new T.MeshBasicMaterial({ color: '#ffaa00' }) : bulletMatPlayer);
 const bMesh = new T.Mesh(bulletGeo, bMat);
 bMesh.position.copy(muzzlePos);
 bMesh.quaternion.copy(carGroup.quaternion);
 if (upgrades.gun >= 2) bMesh.scale.set(1.5, 1.5, 1.5);
 scene.add(bMesh);

 const dmg = 25 + (upgrades.gun - 1) * 16;

 activeBullets.push({
  mesh: bMesh, pos: muzzlePos.clone(), vel: fwd.clone().multiplyScalar(240),
  life: 1.4, isEnemy: false, damage: dmg, isIncendiary: upgrades.gun >= 3
 });

 activeGun.flash.visible = true;
 muzzleLight.intensity = overdriveTimer > 0 ? 5.0 : 3.6;
 cameraShake = Math.max(cameraShake, 0.06);
 if (upgrades.gun >= 2) Snd.playHeavyGunshot();
 else Snd.playGunshot(false);`;
replaceBlock('8. Minigun upgraded bullets and sounds', minigunStart, minigunEnd, minigunReplacement);

// 8. Container Sync in loop
const debrisLoopStart = ` for (let i = debrisList.length - 1; i >= 0; i--) {`;
const debrisLoopEnd = `  d.mesh.quaternion.copy(d.body.quaternion);\n }`;
const containerSyncReplacement = ` for (let i = debrisList.length - 1; i >= 0; i--) {
  const d = debrisList[i];
  d.mesh.position.copy(d.body.position);
  d.mesh.quaternion.copy(d.body.quaternion);
 }

 if (craneStructure && craneStructure.isCollapsed && craneStructure.containerBody) {
  craneStructure.containerMesh.position.copy(craneStructure.containerBody.position);
  craneStructure.containerMesh.quaternion.copy(craneStructure.containerBody.quaternion);
 }`;
replaceBlock('9. Container sync in loop', debrisLoopStart, debrisLoopEnd, containerSyncReplacement);

// 9. Loop update hooks
const loopHooksStart = ` updateAIOpponents(dt);`;
const loopHooksEnd = ` updateChopper(dt);`;
const loopHooksReplacement = ` updateAIOpponents(dt);
 updateChopper(dt);
 updateHangarCrushers(dt);
 updateCrowdAndGuards(dt);
 updateRainCanvas(dt);`;
replaceBlock('10. Loop update hooks', loopHooksStart, loopHooksEnd, loopHooksReplacement);

// 10. Debug hooks
const dbgStart = ` window.__DBG = {`;
const dbgEnd = `  upgradeItemNow: (t) => upgradeItem(t)\n };`;
const dbgReplacement = ` window.__DBG = {
  pos: chassisBody.position,
  carHealth,
  nitroAmount,
  isDrifting,
  lapCount,
  checkpoint: currentCheckpoint,
  aiCount: aiOpponents.length,
  dreadnought: { isActive: dreadnought.isActive, health: dreadnought.health, isDead: dreadnought.isDead },
  viewers: currentViewers,
  playerCredits,
  rank: playerRank,
  weatherMode,
  eliminationTimer,
  upgrades,
  currentSkin,
  crushersCount: HANGAR_CRUSHERS.length,
  craneCollapsed: craneStructure ? craneStructure.isCollapsed : false,
  setWeatherNow: (m) => setWeather(m),
  toggleGarageNow: () => toggleGarage(),
  upgradeItemNow: (t) => upgradeItem(t),
  applyCarSkinNow: (s) => applyCarSkin(s),
  collapseCraneNow: () => { if (craneStructure) craneStructure.collapse(); },
  activateDreadnoughtNow: () => activateDreadnought()
 };`;
replaceBlock('11. Debug exports', dbgStart, dbgEnd, dbgReplacement);

fs.writeFileSync(gameJsPath, content, 'utf8');
console.log('SUCCESS: All mega updates cleanly applied to js/game.js!');
