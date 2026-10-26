const fs = require('fs');
const path = require('path');

const GAME_JS_PATH = path.join(__dirname, '../js/game.js');
let code = fs.readFileSync(GAME_JS_PATH, 'utf8');

// Backup
fs.writeFileSync(GAME_JS_PATH + '.bak_pre_map', code, 'utf8');
console.log('Backup saved to js/game.js.bak_pre_map');

// 1. Replace arenaFloor & add ocean water
const oldArenaPattern = /const arenaFloor = new T\.Mesh\(new T\.PlaneGeometry\(600, 600\), new T\.MeshStandardMaterial\(\{ color: '#16181d', roughness: 0\.95 \}\)\);[\s\S]*?scene\.add\(arenaFloor\);/;
const newArenaCode = `const arenaFloor = new T.Mesh(new T.PlaneGeometry(1200, 1200), new T.MeshStandardMaterial({ color: '#16181d', roughness: 0.95 }));
arenaFloor.position.set(85, 0, 90);
arenaFloor.rotation.x = -Math.PI / 2;
arenaFloor.receiveShadow = true;
scene.add(arenaFloor);

// Çevre Okyanus Suyu (Terminal Island Ada Görünümü)
const oceanFloor = new T.Mesh(new T.PlaneGeometry(2500, 2500), new T.MeshStandardMaterial({ color: '#091524', roughness: 0.15, metalness: 0.85 }));
oceanFloor.position.set(85, -1.2, 90);
oceanFloor.rotation.x = -Math.PI / 2;
scene.add(oceanFloor);`;

if (!oldArenaPattern.test(code)) {
  console.error('ERROR: oldArenaPattern not found!');
  process.exit(1);
}
code = code.replace(oldArenaPattern, newArenaCode);
console.log('1. arenaFloor updated.');

// 2. Replace TRACK_WAYPOINTS and track geometry
const oldTrackPattern = /\/\* ==========================================================\s+TERMINAL ISLAND YARIŞ PİSTİ \(CIRCUIT & BETON BARİYERLER\)[\s\S]*?const roadMesh = new T\.Mesh\(roadGeo, roadMat\);[\s\S]*?scene\.add\(roadMesh\);[\s\S]*?\/\/ Merkez Çizgisi[\s\S]*?scene\.add\(new T\.LineSegments\(lineGeo, new T\.LineBasicMaterial\(\{ color: '#f1c40f', linewidth: 2 \}\)\)\);/;

const newTrackCode = `/* ==========================================================
   TERMINAL ISLAND 3X SERPENTINE PİSTİ (18 VİRAJLI ~2,266M)
   ========================================================== */
const TRACK_WAYPOINTS = [
 new T.Vector3(   0.0, 0,    0.0), // SF (Start/Finish Takı & Ana Düzlük)
 new T.Vector3(   0.0, 0,  140.0), // T1_pre (Güney Düzlüğü Hızlanma)
 new T.Vector3(   0.0, 0,  266.0), // T1 (Doğu Kalesi Frenaj Girişi)
 new T.Vector3(  13.0, 0,  336.0), // T2 (Kale Tırmanışı Sağ Viraj)
 new T.Vector3(  65.0, 0,  381.5), // T3 (Fener Burnu Kavisli Viraj)
 new T.Vector3( 123.5, 0,  371.0), // T4 (Uçurum Saçtokası)
 new T.Vector3( 156.0, 0,  322.0), // T5 (Kale Çıkışı Sol Şikan)
 new T.Vector3( 167.7, 0,  245.0), // T6_pre (Kuzey Sahil Otobanı Girişi)
 new T.Vector3( 169.0, 0,   84.0), // T6 (Kuzey Vinç Düzlüğü - 235 km/h)
 new T.Vector3( 167.7, 0,  -70.0), // T7_pre (Kuzey Düzlüğü Sonu)
 new T.Vector3( 159.2, 0, -140.0), // T7 (Tersane Girişi Sert Fren)
 new T.Vector3( 123.5, 0, -185.5), // T8 (Tersane Havuzu S-İnişi)
 new T.Vector3(  84.5, 0, -189.0), // T9 (Kuru Havuz Saçtokası - Drift & Ramming)
 new T.Vector3(  63.7, 0, -154.0), // T10 (Fabrika Koridoruna Giriş)
 new T.Vector3(  65.0, 0,  -42.0), // T11_pre (Merkez Hangar Düzlüğü)
 new T.Vector3(  66.3, 0,   84.0), // T11 (Merkez Sanayi & Pres Koridoru)
 new T.Vector3(  65.0, 0,  210.0), // T12_pre (Doğu Depo Yaklaşımı)
 new T.Vector3(  61.8, 0,  295.0), // T12 (Doğu Rafineri Girişi)
 new T.Vector3(  55.0, 0,  325.0), // T13_a (Rafineri Tankları Saçtokası)
 new T.Vector3(  42.0, 0,  330.0), // T13_apex (Yakıt Kulesi Dönüşü)
 new T.Vector3(  32.0, 0,  318.0), // T13_b
 new T.Vector3(  29.9, 0,  285.0), // T14 (Alt Sanayi Yoluna Çıkış)
 new T.Vector3(  30.6, 0,  175.0), // T15_pre (Konteyner Deposu Koridoru)
 new T.Vector3(  31.2, 0,   35.0), // T15 (Tren Hattı Düzlüğü)
 new T.Vector3(  29.2, 0,  -56.0), // T16_pre (Batı Dok Yaklaşımı)
 new T.Vector3(  26.0, 0, -105.0), // T16 (Rıhtım Giriş Şikanı)
 new T.Vector3(  18.0, 0, -145.0), // T17 (Batı Rıhtım Saçtokası)
 new T.Vector3(   8.0, 0, -152.0), // T17_apex
 new T.Vector3(   2.5, 0, -145.0), // T18_a (Son Viraj Kompleksi)
 new T.Vector3(   0.5, 0, -120.0), // T18_b
 new T.Vector3(   0.0, 0,  -70.0), // T19 (Ana Düzlüğe Bağlanış)
];

const trackCurve = new T.CatmullRomCurve3(TRACK_WAYPOINTS, true);
const TRACK_WIDTH = 18;
const NUM_TRACK_STEPS = 500;
const TRACK_LENGTH = trackCurve.getLength();

const TRACK_POINTS = [];
for (let i = 0; i < NUM_TRACK_STEPS; i++) {
 TRACK_POINTS.push(trackCurve.getPointAt(i / NUM_TRACK_STEPS));
}

function getTrackDistance(pos) {
 let minD = Infinity;
 let bestIdx = 0;
 for (let i = 0; i < TRACK_POINTS.length; i++) {
  const p = TRACK_POINTS[i];
  const dx = pos.x - p.x;
  const dz = pos.z - p.z;
  const d = dx * dx + dz * dz;
  if (d < minD) { minD = d; bestIdx = i; }
 }
 return { index: bestIdx, distance: (bestIdx / TRACK_POINTS.length) * TRACK_LENGTH, point: TRACK_POINTS[bestIdx] };
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
 roadUvs.push(0, t * 85, 1, t * 85);
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
for (let i = 0; i < 240; i++) {
 if (i % 2 === 0) continue;
 const p1 = trackCurve.getPointAt(i / 240);
 const p2 = trackCurve.getPointAt((i + 0.6) / 240);
 lineVerts.push(p1.x, 0.02, p1.z, p2.x, 0.02, p2.z);
}
lineGeo.setAttribute('position', new T.Float32BufferAttribute(lineVerts, 3));
scene.add(new T.LineSegments(lineGeo, new T.LineBasicMaterial({ color: '#f1c40f', linewidth: 2 })));`;

if (!oldTrackPattern.test(code)) {
  console.error('ERROR: oldTrackPattern not found!');
  process.exit(1);
}
code = code.replace(oldTrackPattern, newTrackCode);
console.log('2. TRACK_WAYPOINTS and track geometry updated.');

// 3. Replace Barrier wall steps
const oldBarrierDefPattern = /const barrierGeo = new T\.BoxGeometry\(1\.0, 1\.25, 4\.2\);[\s\S]*?const bBody = new CANNON\.Body\(\{ mass: 0, material: groundMat \}\);[\s\S]*?bBody\.addShape\(new CANNON\.Box\(new CANNON\.Vec3\(0\.5, 0\.65, 2\.1\)\)\);/;
const newBarrierDef = `const barrierGeo = new T.BoxGeometry(1.0, 1.25, 6.8);
const barrierMat = new T.MeshStandardMaterial({ color: '#5a606a', roughness: 0.8, metalness: 0.15 });
const destructiblePoles = [];

function createBarrierWall() {
 const BARRIER_STEPS = 340;
 for (let i = 0; i < BARRIER_STEPS; i++) {
  const t = i / BARRIER_STEPS;
  const pt = trackCurve.getPointAt(t);
  const tangent = trackCurve.getTangentAt(t).normalize();
  const binormal = new T.Vector3().crossVectors(tangent, new T.Vector3(0, 1, 0)).normalize();
  const angle = Math.atan2(tangent.x, tangent.z);

  for (let side of [-1, 1]) {
   const bPos = pt.clone().addScaledVector(binormal, side * (TRACK_WIDTH / 2 + 0.6));
   const bBody = new CANNON.Body({ mass: 0, material: groundMat });
   bBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.65, 3.4)));`;

const oldBarrierFullPattern = /const barrierGeo = new T\.BoxGeometry\(1\.0, 1\.25, 4\.2\);[\s\S]*?const BARRIER_STEPS = 90;[\s\S]*?bBody\.addShape\(new CANNON\.Box\(new CANNON\.Vec3\(0\.5, 0\.65, 2\.1\)\)\);/;
if (!oldBarrierFullPattern.test(code)) {
  console.error('ERROR: oldBarrierFullPattern not found!');
  process.exit(1);
}
code = code.replace(oldBarrierFullPattern, newBarrierDef);

// Replace barrier pole frequency: i % 9 === 0 -> i % 10 === 0
code = code.replace(/if \(i % 9 === 0\) \{/g, 'if (i % 10 === 0) {');
console.log('3. createBarrierWall updated to 340 steps.');

// 4. Update createHangarShortcut & updateHangarCrushers
const oldHangarStartPattern = /function createHangarShortcut\(\) \{[\s\S]*?const pStart = new T\.Vector3\(63, 0, 58\);[\s\S]*?const pEnd = new T\.Vector3\(29, 0, -28\);/;
const newHangarStart = `function createHangarShortcut() {
 const pStart = new T.Vector3(159.2, 0, -140.0);
 const pEnd = new T.Vector3(61.8, 0, 295.0);`;

if (!oldHangarStartPattern.test(code)) {
  console.error('ERROR: oldHangarStartPattern not found!');
  process.exit(1);
}
code = code.replace(oldHangarStartPattern, newHangarStart);

const oldHangarUpdatePattern = /function updateHangarCrushers\(dt\) \{[\s\S]*?const inHangarRegion = pPos\.x > 26 && pPos\.x < 65 && pPos\.z > -30 && pPos\.z < 60;/;
const newHangarUpdate = `function updateHangarCrushers(dt) {
 const time = performance.now() * 0.001;
 const pPos = chassisBody.position;
 const pStart = new T.Vector3(159.2, 0, -140.0);
 const pEnd = new T.Vector3(61.8, 0, 295.0);
 const dir = pEnd.clone().sub(pStart);
 const len = dir.length();
 const fwd = dir.clone().normalize();
 const proj = (pPos.x - pStart.x) * fwd.x + (pPos.z - pStart.z) * fwd.z;
 const perpDist = Math.abs((pPos.x - pStart.x) * -fwd.z + (pPos.z - pStart.z) * fwd.x);
 const inHangarRegion = perpDist < 9.0 && proj > 0 && proj < len;`;

if (!oldHangarUpdatePattern.test(code)) {
  console.error('ERROR: oldHangarUpdatePattern not found!');
  process.exit(1);
}
code = code.replace(oldHangarUpdatePattern, newHangarUpdate);
console.log('4. createHangarShortcut and updateHangarCrushers updated.');

// 5. Update Container Crane position
code = code.replace(/const cranePos = new T\.Vector3\(68, 0, 110\);/, 'const cranePos = new T.Vector3(169.0, 0, 84.0);');
console.log('5. Container Crane moved to North straight (169, 0, 84).');

// 6. Update activation plates
const oldPlatesPattern = /createPlate\('sword', \[0, 55\]\);[\s\S]*?createPlate\('skull', \[-16, -55\]\);/;
const newPlatesCode = `createPlate('sword', [0, 100]);
createPlate('sword', [66.3, 84]);
createPlate('sword', [168.0, 0]);
createPlate('shield', [123.5, 371]);
createPlate('shield', [84.5, -189]);
createPlate('shield', [31.2, 35]);
createPlate('skull', [65.0, 0]);
createPlate('skull', [42.0, 330]);
createPlate('skull', [18.0, -145]);`;

if (!oldPlatesPattern.test(code)) {
  console.error('ERROR: oldPlatesPattern not found!');
  process.exit(1);
}
code = code.replace(oldPlatesPattern, newPlatesCode);
console.log('6. Activation plates updated.');

// 7. Update CHECKPOINTS
const oldCPPattern = /const CHECKPOINTS = \[[\s\S]*?\{ pos: new T\.Vector3\(0, 0, -60\), radius: 20 \},[\s\S]*?\];/;
const newCPCode = `const CHECKPOINTS = [
 { pos: new T.Vector3(0, 0, 0), radius: 24 },
 { pos: new T.Vector3(65.0, 0, 381.5), radius: 26 },
 { pos: new T.Vector3(169.0, 0, 84.0), radius: 26 },
 { pos: new T.Vector3(84.5, 0, -189.0), radius: 26 },
 { pos: new T.Vector3(66.3, 0, 84.0), radius: 26 },
 { pos: new T.Vector3(42.0, 0, 330.0), radius: 26 },
 { pos: new T.Vector3(31.2, 0, 35.0), radius: 26 },
 { pos: new T.Vector3(8.0, 0, -152.0), radius: 26 },
];`;

if (!oldCPPattern.test(code)) {
  console.error('ERROR: oldCPPattern not found!');
  process.exit(1);
}
code = code.replace(oldCPPattern, newCPCode);
console.log('7. CHECKPOINTS updated to 8 sectors.');

// 8. Update Dreadnought spawn position & AI_CONFIGS
code = code.replace(
  /mass: 18000, material: debrisMat, position: new CANNON\.Vec3\(68, 1\.8, 160\)/,
  'mass: 18000, material: debrisMat, position: new CANNON.Vec3(169.0, 2.2, 120)'
);
code = code.replace(
  /dreadnoughtBody\.position\.set\(68, 1\.8, 160\);/,
  'dreadnoughtBody.position.set(169.0, 2.2, 120);'
);

const oldAIConfigs = `const AI_CONFIGS = [
 { id: 'ai0', name: 'M.G. JOE', bodyColor: '#343840', startPos: [-3.8, 1.8, 14], maxSpeed: 48 },
 { id: 'ai1', name: 'GRIMM', bodyColor: '#5e1b17', startPos: [3.8, 1.8, -14], maxSpeed: 51 },
 { id: 'ai2', name: '14K', bodyColor: '#d4ac0d', startPos: [-3.8, 1.8, -25], maxSpeed: 54 },
 { id: 'ai3', name: 'PACHENKO', bodyColor: '#21618c', startPos: [3.8, 1.8, 25], maxSpeed: 47 }
];`;

const newAIConfigs = `const AI_CONFIGS = [
 { id: 'ai0', name: 'M.G. JOE', bodyColor: '#343840', startPos: [-4.2, 1.8, 22], maxSpeed: 48 },
 { id: 'ai1', name: 'GRIMM', bodyColor: '#5e1b17', startPos: [4.2, 1.8, 22], maxSpeed: 51 },
 { id: 'ai2', name: '14K', bodyColor: '#d4ac0d', startPos: [-4.2, 1.8, -22], maxSpeed: 54 },
 { id: 'ai3', name: 'PACHENKO', bodyColor: '#21618c', startPos: [4.2, 1.8, -22], maxSpeed: 47 }
];`;

if (code.includes(oldAIConfigs)) {
  code = code.replace(oldAIConfigs, newAIConfigs);
  console.log('8. AI_CONFIGS grid positions updated.');
} else {
  console.log('Warning: AI_CONFIGS exact string not matched, checking regex');
}

// 9. Update obstacles (barrels, boxes, crates)
const oldObstaclesPattern = /addStaticBox\(\[8, 1\.2, 14\], \[68, 0\.6, 100\], 0\);[\s\S]*?addCrate\(\[1\.8, 1\.2, 1\.8\], \[15, 0\.6, -55\]\);/;
const newObstaclesCode = `addStaticBox([8, 1.2, 14], [169.0, 0.6, 120], 0);

addBarrel([0, 0, 50]);
addBarrel([-1.2, 0, 51]);
addBarrel([1.2, 0, 51]);
addBarrel([0, 1.2, 50.5]);

addBarrel([42.0, 0, 325]);
addBarrel([43.5, 0, 326]);
addBarrel([42.0, 1.2, 325.5]);

addBarrel([84.5, 0, -180]);
addBarrel([86.0, 0, -181]);

addCrate([2.5, 1.8, 2.5], [31.2, 0.9, 120]);
addCrate([2.5, 1.8, 2.5], [169.0, 0.9, 10]);
addCrate([2.0, 1.4, 2.0], [18.0, 0.7, -135]);`;

if (!oldObstaclesPattern.test(code)) {
  console.error('ERROR: oldObstaclesPattern not found!');
  process.exit(1);
}
code = code.replace(oldObstaclesPattern, newObstaclesCode);
console.log('9. Obstacles updated.');

// Save updated game.js
fs.writeFileSync(GAME_JS_PATH, code, 'utf8');
console.log('Successfully wrote updated js/game.js!');
