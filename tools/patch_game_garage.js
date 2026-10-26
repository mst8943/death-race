const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', 'js', 'game.js');
let code = fs.readFileSync(gameJsPath, 'utf8');

// 1. ADD GARAGE STATE & SHOWROOM INIT CODE
const showroomImplementation = `
/* ==========================================================
   WEYLAND MOTORWORKS — 3D ATÖLYE & GARAJ SHOWROOM SİSTEMİ
   ========================================================== */
const garageShowroomGroup = new T.Group();
garageShowroomGroup.position.set(0, -350, 0);
garageShowroomGroup.visible = false;
scene.add(garageShowroomGroup);

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
const garageFloorBody = new CANNON.Body({ mass: 0, material: groundMat });
garageFloorBody.addShape(new CANNON.Plane());
garageFloorBody.position.set(0, -350, 0);
garageFloorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(garageFloorBody);

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
 const activeBtn = document.getElementById(\`btn-preset-\${name}\`);
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
 if (elSpd) elSpd.textContent = \`\${spdVal} KM/S\`;
 const barSpd = document.getElementById('stat-bar-speed');
 if (barSpd) barSpd.style.width = \`\${Math.min(100, (spdVal / 380) * 100)}%\`;

 const elArm = document.getElementById('stat-val-armor');
 if (elArm) elArm.textContent = \`\${armVal} HP\`;
 const barArm = document.getElementById('stat-bar-armor');
 if (barArm) barArm.style.width = \`\${Math.min(100, (armVal / 240) * 100)}%\`;

 const elGun = document.getElementById('stat-val-firepower');
 if (elGun) elGun.textContent = \`\${gunDps} DPS (\${upgrades.gun >= 2 ? '.50 CAL HEAVY' : '7.62MM'})\`;
 const barGun = document.getElementById('stat-bar-firepower');
 if (barGun) barGun.style.width = \`\${Math.min(100, (gunDps / 110) * 100)}%\`;

 const elRkt = document.getElementById('stat-val-rockets');
 if (elRkt) elRkt.textContent = rktSalvo;
 const barRkt = document.getElementById('stat-bar-rockets');
 if (barRkt) barRkt.style.width = \`\${Math.min(100, (upgrades.rocket / 3) * 100)}%\`;
}
window.updateGarageStatsUI = updateGarageStatsUI;
`;

// Insert after wheelMeshes (line 2809)
const targetWheelPos = 'for (let i = 0; i < 4; i++) {\n const wGroup = new T.Group(); scene.add(wGroup); wheelMeshes.push(wGroup);\n}';
if (code.includes(targetWheelPos)) {
  code = code.replace(targetWheelPos, targetWheelPos + '\n' + showroomImplementation);
  console.log("Inserted showroomImplementation into js/game.js.");
} else {
  console.error("Could not find targetWheelPos in js/game.js!");
  process.exit(1);
}

// 2. OVERHAUL toggleGarage() WITH STATE SAVE/RESTORE, SOUNDS & ANIMATION
const oldToggleGarage = `function toggleGarage() {
 const isOpen = garageModalEl.classList.toggle('open');
 garageModeActive = isOpen;
 if (isOpen) {
  garageCreditsEl.textContent = playerCredits.toLocaleString('tr-TR');
  showRadioMessage('Weyland Motorworks atölyesine hoş geldin! Frankenstein burada modifiye edilir!', 'case');
 }
}`;

const newToggleGarage = `let savedRaceState = null;
function toggleGarage() {
 const isOpen = garageModalEl.classList.toggle('open');
 garageModeActive = isOpen;
 if (isOpen) {
  // 1. Yarış konumunu ve hızını kaydet
  savedRaceState = {
   pos: chassisBody.position.clone(),
   quat: chassisBody.quaternion.clone(),
   vel: chassisBody.velocity.clone()
  };

  // 2. Aracı Showroom Turntable zeminine (Y = -350) ışınla
  chassisBody.position.set(0, -349.15, 0);
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

  garageCreditsEl.textContent = playerCredits.toLocaleString('tr-TR');
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

  Snd.playGarageShutter();
  Snd.playEngineRev();
  showBanner('ATÖLYEDEN ÇIKILDI! PİSTE DÖNÜLDÜ!', 'buff-sword');
 }
}`;

if (code.includes(oldToggleGarage)) {
  code = code.replace(oldToggleGarage, newToggleGarage);
  console.log("Replaced old toggleGarage with new immersive showroom toggleGarage.");
} else {
  console.log("Warning: oldToggleGarage not found exactly; checking variations.");
}

// 3. UPDATE upgradeItem() TO CALL updateCarVisualUpgrades() & Snd.playAirWrench() & updateGarageStatsUI()
code = code.replace(
  "playerCredits -= cost;\n upgrades[type]++;\n Snd.playPowerup('sword');",
  "playerCredits -= cost;\n upgrades[type]++;\n Snd.playAirWrench();\n Snd.playPowerup('sword');\n spawnSparks(chassisBody.position, new T.Vector3(0, 1, 0), 22);\n updateCarVisualUpgrades();\n updateGarageStatsUI();"
);

// 4. OVERHAUL GARAGE CAMERA IN loop()
const oldGarageCamLoop = `  // Garaj 3D Vitrin Döner Kamera
  if (garageModeActive) {
   garageCamAngle += dt * 0.45;
   camera.position.set(
    carGroup.position.x + Math.sin(garageCamAngle) * 5.8,
    carGroup.position.y + 1.8,
    carGroup.position.z + Math.cos(garageCamAngle) * 5.8
   );
   camera.lookAt(carGroup.position.x, carGroup.position.y + 0.6, carGroup.position.z);
  }`;

const newGarageCamLoop = `  // Garaj İnteraktif Orbit & Showroom Kamera Kontrolü
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
  }`;

if (code.includes(oldGarageCamLoop)) {
  code = code.replace(oldGarageCamLoop, newGarageCamLoop);
  console.log("Replaced old garageCamLoop with newGarageCamLoop in loop().");
} else {
  console.log("Warning: oldGarageCamLoop not found exactly.");
}

fs.writeFileSync(gameJsPath, code);
console.log("Updated js/game.js successfully!");
