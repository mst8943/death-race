const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', 'js', 'game.js');
let gameJs = fs.readFileSync(gameJsPath, 'utf8');

// Replace the customization block with lazy group initialization
const oldCustStart = `/* ==========================================================
   GENİŞLETİLMİŞ GARAJ, 3D VİTRİN & ÖZELLEŞTİRME SİSTEMİ
   ========================================================== */`;
const oldCustEnd = `window.applyMatchSetting = applyMatchSetting;`;

const newCustBlock = `/* ==========================================================
   GENİŞLETİLMİŞ GARAJ, 3D VİTRİN & ÖZELLEŞTİRME SİSTEMİ
   ========================================================== */
const customization = {
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
 const btn = document.getElementById(\`tab-btn-\${tabId}\`);
 const pane = document.getElementById(\`tab-pane-\${tabId}\`);
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
 const activeEl = document.getElementById(\`blades-\${type}\`);
 if (activeEl) activeEl.classList.add('active');

 Snd.playMetalSnap();
 showBanner(type === 'none' ? 'JANT: STANDART KAPAK' : \`JANT BIÇAĞI TAKILDI: \${type.toUpperCase()}\`, 'buff-sword');
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
 const activeEl = document.getElementById(\`bumper-\${kitId}\`);
 if (activeEl) activeEl.classList.add('active');

 Snd.playMetalSnap();
 showBanner(\`TAMPON KİTİ GÜNCELLENDİ: \${kitId.toUpperCase()}\`, 'buff-shield');
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
  rg.add(strobeLightR);

  strobeLightB = new T.PointLight('#0066ff', 0, 12);
  strobeLightB.position.set(0.25, 1.3, -0.4);
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
 const activeEl = document.getElementById(\`roof-\${kitId}\`);
 if (activeEl) activeEl.classList.add('active');

 Snd.playPowerup('shield');
 showBanner(\`TAVAN EKLENTİSİ: \${kitId.toUpperCase()}\`, 'buff-shield');
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
 if (fillEl) fillEl.style.background = \`linear-gradient(90deg, \${cfg.hex}, #fff)\`;

 document.querySelectorAll('#tab-pane-bodykits .custom-section:nth-child(4) .custom-card').forEach(el => el.classList.remove('active'));
 const activeEl = document.getElementById(\`flame-\${colorId}\`);
 if (activeEl) activeEl.classList.add('active');

 Snd.playNitroSound();
 showBanner(\`NİTRO ALEVİ: \${cfg.name}\`, 'buff-sword');
}
window.applyNitroFlame = applyNitroFlame;

// 5. YARIŞ GRAFİTİSİ & ÇIKARTMALAR (LIVERY)
function applyDecal(decalId) {
 customization.decal = decalId;

 document.querySelectorAll('#tab-pane-paint .custom-section:nth-child(2) .custom-card').forEach(el => el.classList.remove('active'));
 const activeEl = document.getElementById(\`decal-\${decalId}\`);
 if (activeEl) activeEl.classList.add('active');

 Snd.playPowerup('shield');
 showBanner(\`GRAFİTİ ÇIKARTMA: \${decalId.toUpperCase()}\`, 'buff-shield');
 showRadioMessage('Yeni çıkartma kaportaya işlendi Frankenstein! Şık görünüyoruz!', 'case');
}
window.applyDecal = applyDecal;

// 6. MÜHİMMAT TİPİ SEÇİMİ (AMMO TYPES)
function applyAmmoType(typeId) {
 customization.ammoType = typeId;

 document.querySelectorAll('#tab-pane-performance .custom-section .custom-card').forEach(el => el.classList.remove('active'));
 const activeEl = document.getElementById(\`ammo-\${typeId}\`);
 if (activeEl) activeEl.classList.add('active');

 Snd.playHeavyGunshot();
 showBanner(\`MÜHİMMAT DEĞİŞTİRİLDİ: \${typeId.toUpperCase()}\`, 'buff-sword');
 showRadioMessage(\`Minigun mermileri \${typeId.toUpperCase()} ile dolduruldu!\`, 'case');
}
window.applyAmmoType = applyAmmoType;

// 7. YARIŞ & MAÇ AYARLARI
function applyMatchSetting(key, val) {
 customization[key] = val;

 if (key === 'aiAggression') {
  document.querySelectorAll('#tab-pane-match .custom-section:nth-child(1) .custom-card').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(\`ai-agg-\${val}\`);
  if (activeEl) activeEl.classList.add('active');
  showBanner(\`AI SALDIRGANLIĞI: \${val.toUpperCase()}\`, 'buff-sword');
  showRadioMessage(val === 'brutal' ? 'Dikkat Frankenstein! Rakipler gözünü kararttı, ölümüne saldıracaklar!' : 'AI dengeli taktiksel yarış moduna geçti.', 'case');
 } else if (key === 'elimination') {
  document.querySelectorAll('#tab-pane-match .custom-section:nth-child(2) .custom-card').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(\`elim-\${val}\`);
  if (activeEl) activeEl.classList.add('active');

  const elimEl = document.getElementById('elimination-hud');
  if (val === 'off') {
   if (elimEl) elimEl.style.display = 'none';
   showBanner('ELEME SAYACI: KAPALI');
  } else {
   if (elimEl) elimEl.style.display = 'block';
   eliminationTimer = val === '30s' ? 30.0 : 45.0;
   showBanner(\`ELEME SAYACI: \${val.toUpperCase()}\`);
  }
 }
}
window.applyMatchSetting = applyMatchSetting;`;

const sIdx = gameJs.indexOf(oldCustStart);
const eIdx = gameJs.indexOf(oldCustEnd, sIdx);
if (sIdx !== -1 && eIdx !== -1) {
  gameJs = gameJs.slice(0, sIdx) + newCustBlock + gameJs.slice(eIdx + oldCustEnd.length);
  fs.writeFileSync(gameJsPath, gameJs, 'utf8');
  console.log("Updated js/game.js with lazy group initialization.");
} else {
  console.error("Could not find customization block in game.js");
}
