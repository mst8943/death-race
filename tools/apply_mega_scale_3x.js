const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', 'js', 'game.js');
let src = fs.readFileSync(gameJsPath, 'utf8');

console.log('Original game.js length:', src.length);

// 1. Update Camera Far, Fog, Arena Floor & Ocean Floor
src = src.replace(
  "scene.fog = new T.Fog('#0e1014', 45, 195);",
  "scene.fog = new T.Fog('#0e1014', 150, 1300);"
);

src = src.replace(
  "const camera = new T.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);",
  "const camera = new T.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 4000);"
);

src = src.replace(
  "sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;\nsun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;\nsun.shadow.camera.far = 220;",
  "sun.shadow.camera.left = -160; sun.shadow.camera.right = 160;\nsun.shadow.camera.top = 160; sun.shadow.camera.bottom = -160;\nsun.shadow.camera.far = 380;"
);

src = src.replace(
  "const arenaFloor = new T.Mesh(new T.PlaneGeometry(1200, 1200), new T.MeshStandardMaterial({ color: '#16181d', roughness: 0.95 }));\narenaFloor.position.set(85, 0, 90);",
  "const arenaFloor = new T.Mesh(new T.PlaneGeometry(4500, 4500), new T.MeshStandardMaterial({ color: '#16181d', roughness: 0.95 }));\narenaFloor.position.set(253.5, 0, 288.75);"
);

src = src.replace(
  "const oceanFloor = new T.Mesh(new T.PlaneGeometry(2500, 2500), new T.MeshStandardMaterial({ color: '#091524', roughness: 0.15, metalness: 0.85 }));\noceanFloor.position.set(85, -1.2, 90);",
  "const oceanFloor = new T.Mesh(new T.PlaneGeometry(11000, 11000), new T.MeshStandardMaterial({ color: '#091524', roughness: 0.15, metalness: 0.85 }));\noceanFloor.position.set(253.5, -1.2, 288.75);"
);

// Fog updates in setWeather
src = src.replace(
  "   scene.fog.color.set('#0e1014');\n   sun.intensity = 2.3;",
  "   scene.fog.color.set('#0e1014');\n   scene.fog.near = 150; scene.fog.far = 1300;\n   sun.intensity = 2.3;"
);
src = src.replace(
  "   scene.fog.color.set('#0a0d12');\n   sun.intensity = 1.2;",
  "   scene.fog.color.set('#0a0d12');\n   scene.fog.near = 80; scene.fog.far = 700;\n   sun.intensity = 1.2;"
);
src = src.replace(
  "   scene.fog.color.set('#030406');\n   sun.intensity = 0.25;",
  "   scene.fog.color.set('#030406');\n   scene.fog.near = 50; scene.fog.far = 480;\n   sun.intensity = 0.25;"
);

// 2. Scale TRACK_WAYPOINTS (x3)
const oldTrackWaypointsPattern = /const TRACK_WAYPOINTS = \[\s*new T\.Vector3\(\s*0\.0,\s*0,\s*0\.0\),[\s\S]*?new T\.Vector3\(\s*0\.0,\s*0,\s*-70\.0\),\s*\];/;

const newTrackWaypointsCode = `/* ==========================================================
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
];`;

src = src.replace(oldTrackWaypointsPattern, newTrackWaypointsCode);

// 3. Track width & steps & barriers
src = src.replace(
  "const TRACK_WIDTH = 18;\nconst NUM_TRACK_STEPS = 500;",
  "const TRACK_WIDTH = 22;\nconst NUM_TRACK_STEPS = 1200;"
);

src = src.replace(
  "roadUvs.push(0, t * 85, 1, t * 85);",
  "roadUvs.push(0, t * 250, 1, t * 250);"
);

src = src.replace(
  "for (let i = 0; i < 240; i++) {\n if (i % 2 === 0) continue;\n const p1 = trackCurve.getPointAt(i / 240);\n const p2 = trackCurve.getPointAt((i + 0.6) / 240);",
  "for (let i = 0; i < 600; i++) {\n if (i % 2 === 0) continue;\n const p1 = trackCurve.getPointAt(i / 600);\n const p2 = trackCurve.getPointAt((i + 0.6) / 600);"
);

// Barrier wall
src = src.replace(
  "const barrierGeo = new T.BoxGeometry(1.0, 1.25, 6.8);",
  "const barrierGeo = new T.BoxGeometry(1.2, 1.3, 9.2);"
);

src = src.replace(
  "const BARRIER_STEPS = 340;\n for (let i = 0; i < BARRIER_STEPS; i++) {",
  "const BARRIER_STEPS = 750;\n for (let i = 0; i < BARRIER_STEPS; i++) {"
);

src = src.replace(
  "const bPos = pt.clone().addScaledVector(binormal, side * (TRACK_WIDTH / 2 + 0.6));\n   const bBody = new CANNON.Body({ mass: 0, material: groundMat });\n   bBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.65, 3.4)));",
  "const bPos = pt.clone().addScaledVector(binormal, side * (TRACK_WIDTH / 2 + 0.65));\n   const bBody = new CANNON.Body({ mass: 0, material: groundMat });\n   bBody.addShape(new CANNON.Box(new CANNON.Vec3(0.6, 0.65, 4.6)));"
);

src = src.replace(
  "if (i % 10 === 0) {\n   const polePos = pt.clone().addScaledVector(binormal, (TRACK_WIDTH / 2 + 4.5));\n   const poleMesh = new T.Mesh(new T.CylinderGeometry(0.2, 0.25, 10, 8), barrierMat);",
  "if (i % 18 === 0) {\n   const polePos = pt.clone().addScaledVector(binormal, (TRACK_WIDTH / 2 + 5.5));\n   const poleMesh = new T.Mesh(new T.CylinderGeometry(0.25, 0.3, 11, 8), barrierMat);"
);

src = src.replace(
  "const light = new T.SpotLight('#ffe8c0', 4.5, 45, Math.PI / 4, 0.4);",
  "const light = new T.SpotLight('#ffe8c0', 5.0, 65, Math.PI / 4, 0.4);"
);

// 4. Update Covered Factory Hangar to 3X dimensions
src = src.replace(
  ` const centerX = 65.5;
 const zStart = -30.0;
 const zEnd = 160.0;
 const len = zEnd - zStart; // 190 meters
 const zMid = zStart + len * 0.5;
 const width = 28.0; // 5m clearance on both sides of 18m road
 const height = 10.0; // 10m high ceiling`,
  ` const centerX = 196.5;
 const zStart = -90.0;
 const zEnd = 480.0;
 const len = zEnd - zStart; // 570 meters long mega-facility!
 const zMid = zStart + len * 0.5;
 const width = 34.0; // 6m clearance on both sides of 22m road!
 const height = 12.0; // 12m high industrial ceiling`
);

src = src.replace(
  " const trussSpacing = 18.0;\n const numTrusses = Math.floor(len / trussSpacing);",
  " const trussSpacing = 24.0;\n const numTrusses = Math.floor(len / trussSpacing);"
);

src = src.replace(
  " const warehouseLight = new T.PointLight('#ffb355', 4.8, 45);",
  " const warehouseLight = new T.PointLight('#ffb355', 5.5, 55);"
);

src = src.replace(
  "const propZList = [-10, 15, 40, 65, 90, 115, 140];",
  "const propZList = [-50, 10, 70, 130, 190, 250, 310, 370, 430];"
);

src = src.replace(
  " const crusherZs = [20.0, 70.0, 120.0];",
  " const crusherZs = [30.0, 195.0, 360.0];"
);

src = src.replace(
  " const hammer = new T.Mesh(new T.BoxGeometry(10.5, 2.6, 3.6), crusherMat);",
  " const hammer = new T.Mesh(new T.BoxGeometry(14.0, 3.2, 4.5), crusherMat);"
);

src = src.replace(
  "const inHangarRegion = (pPos.x > 50 && pPos.x < 81 && pPos.z > -30 && pPos.z < 160);",
  "const inHangarRegion = (pPos.x > 175 && pPos.x < 218 && pPos.z > -90 && pPos.z < 480);"
);

// 5. Update Container Yard & Gantry Crane
src = src.replace(
  ` const trackX = 169.0;
 const stackZList = [-50, -10, 30, 60, 110, 145, 180, 215];`,
  ` const trackX = 507.0;
 const stackZList = [-180, -90, 0, 90, 180, 270, 360, 450, 540, 630];`
);

src = src.replace(
  "const sx = trackX + side * 14.5;",
  "const sx = trackX + side * 17.0;"
);

src = src.replace(
  ` const mastPositions = [
  [152.0, -30.0],
  [186.0, 35.0],
  [152.0, 125.0],
  [186.0, 195.0]
 ];`,
  ` const mastPositions = [
  [485.0, -120.0],
  [529.0, 60.0],
  [485.0, 240.0],
  [529.0, 420.0],
  [485.0, 600.0]
 ];`
);

src = src.replace(
  "const cranePos = new T.Vector3(169.0, 0, 84.0);",
  "const cranePos = new T.Vector3(507.0, 0, 252.0);"
);

src = src.replace(
  "const legX = side * 12.5;",
  "const legX = side * 16.0;"
);

src = src.replace(
  "const truss = new T.Mesh(new T.BoxGeometry(27.0, 1.8, 4.0), trussMat);",
  "const truss = new T.Mesh(new T.BoxGeometry(36.0, 2.2, 4.5), trussMat);"
);

// 6. Grandstands & Guards
src = src.replace(
  "const tierMesh = new T.Mesh(new T.BoxGeometry(3.0, 1.2, 70), concreteMat);\n  tierMesh.position.set(-15.5 - tier * 2.5, 0.6 + tier * 1.2, 50);",
  "const tierMesh = new T.Mesh(new T.BoxGeometry(3.5, 1.4, 180), concreteMat);\n  tierMesh.position.set(-18.5 - tier * 2.8, 0.7 + tier * 1.4, 140);"
);

src = src.replace(
  "const fence = new T.Mesh(new T.BoxGeometry(0.2, 6.0, 74), fenceMat);\n fence.position.set(-13.5, 3.0, 50);",
  "const fence = new T.Mesh(new T.BoxGeometry(0.2, 6.0, 184), fenceMat);\n fence.position.set(-15.5, 3.0, 140);"
);

src = src.replace(
  "for (let zT of [14, 86]) {",
  "for (let zT of [40, 240]) {"
);

src = src.replace(
  "const inStraight = pPos.z > 10 && pPos.z < 90 && pPos.x < 15;",
  "const inStraight = pPos.z > 20 && pPos.z < 350 && Math.abs(pPos.x) < 22;"
);

// 7. Activation Plates & Checkpoints
const oldPlatesPattern = /createPlate\('sword',\s*\[0,\s*100\]\);[\s\S]*?createPlate\('skull',\s*\[18\.0,\s*-145\]\);/;
const newPlatesCode = `createPlate('sword', [0, 300]);
createPlate('sword', [198.9, 252]);
createPlate('sword', [507.0, 0]);
createPlate('shield', [370.5, 1113]);
createPlate('shield', [253.5, -567]);
createPlate('shield', [93.6, 105]);
createPlate('skull', [195.0, -40]);
createPlate('skull', [126.0, 990]);
createPlate('skull', [54.0, -435]);`;

src = src.replace(oldPlatesPattern, newPlatesCode);

const oldCheckpointsPattern = /const CHECKPOINTS = \[\s*\{ pos: new T\.Vector3\(0, 0, 0\), radius: 24 \},[\s\S]*?\{ pos: new T\.Vector3\(8\.0, 0, -152\.0\), radius: 26 \},\s*\];/;
const newCheckpointsCode = `const CHECKPOINTS = [
 { pos: new T.Vector3(0, 0, 0), radius: 38 },
 { pos: new T.Vector3(195.0, 0, 1144.5), radius: 45 },
 { pos: new T.Vector3(507.0, 0, 252.0), radius: 45 },
 { pos: new T.Vector3(253.5, 0, -567.0), radius: 45 },
 { pos: new T.Vector3(198.9, 0, 252.0), radius: 45 },
 { pos: new T.Vector3(126.0, 0, 990.0), radius: 45 },
 { pos: new T.Vector3(93.6, 0, 105.0), radius: 45 },
 { pos: new T.Vector3(24.0, 0, -456.0), radius: 45 },
];`;

src = src.replace(oldCheckpointsPattern, newCheckpointsCode);

// 8. Dreadnought initial position & activate
src = src.replace(
  "position: new CANNON.Vec3(169.0, 2.2, 120)",
  "position: new CANNON.Vec3(507.0, 2.2, 360)"
);
src = src.replace(
  "dreadnoughtBody.position.set(169.0, 2.2, 120);",
  "dreadnoughtBody.position.set(507.0, 2.2, 360);"
);

src = src.replace(
  "speed: 38 / 3.6,",
  "speed: 62 / 3.6,"
);

// 9. Static boxes, barrels & crates
src = src.replace(
  "addStaticBox([8, 1.2, 14], [169.0, 0.6, 120], 0);",
  "addStaticBox([12, 1.8, 20], [507.0, 0.9, 360], 0);"
);

src = src.replace(
  "addBarrel([0, 0, 50]);\naddBarrel([-1.2, 0, 51]);\naddBarrel([1.2, 0, 51]);\naddBarrel([0, 1.2, 50.5]);",
  "addBarrel([0, 0, 150]);\naddBarrel([-1.2, 0, 151]);\naddBarrel([1.2, 0, 151]);\naddBarrel([0, 1.2, 150.5]);"
);

src = src.replace(
  "addBarrel([42.0, 0, 325]);\naddBarrel([43.5, 0, 326]);\naddBarrel([42.0, 1.2, 325.5]);",
  "addBarrel([126.0, 0, 975]);\naddBarrel([127.5, 0, 976]);\naddBarrel([126.0, 1.2, 975.5]);"
);

src = src.replace(
  "addBarrel([84.5, 0, -180]);\naddBarrel([86.0, 0, -181]);",
  "addBarrel([253.5, 0, -540]);\naddBarrel([255.0, 0, -541]);"
);

src = src.replace(
  "addCrate([2.5, 1.8, 2.5], [31.2, 0.9, 120]);\naddCrate([2.5, 1.8, 2.5], [169.0, 0.9, 10]);\naddCrate([2.0, 1.4, 2.0], [18.0, 0.7, -135]);",
  "addCrate([3.5, 2.4, 3.5], [93.6, 1.2, 360]);\naddCrate([3.5, 2.4, 3.5], [507.0, 1.2, 30]);\naddCrate([3.0, 2.0, 3.0], [54.0, 1.0, -405]);"
);

// 10. AI configs & target lookahead
src = src.replace(
  `const AI_CONFIGS = [
 { id: 'ai0', name: 'M.G. JOE', bodyColor: '#343840', startPos: [-4.2, 1.8, 22], maxSpeed: 48 },
 { id: 'ai1', name: 'GRIMM', bodyColor: '#5e1b17', startPos: [4.2, 1.8, 22], maxSpeed: 51 },
 { id: 'ai2', name: '14K', bodyColor: '#d4ac0d', startPos: [-4.2, 1.8, -22], maxSpeed: 54 },
 { id: 'ai3', name: 'PACHENKO', bodyColor: '#21618c', startPos: [4.2, 1.8, -22], maxSpeed: 47 }
];`,
  `const AI_CONFIGS = [
 { id: 'ai0', name: 'M.G. JOE', bodyColor: '#343840', startPos: [-4.2, 1.8, 22], maxSpeed: 130 },
 { id: 'ai1', name: 'GRIMM', bodyColor: '#5e1b17', startPos: [4.2, 1.8, 22], maxSpeed: 135 },
 { id: 'ai2', name: '14K', bodyColor: '#d4ac0d', startPos: [-4.2, 1.8, -22], maxSpeed: 140 },
 { id: 'ai3', name: 'PACHENKO', bodyColor: '#21618c', startPos: [4.2, 1.8, -22], maxSpeed: 125 }
];`
);

src = src.replace(
  "const targetStepOffset = 6;",
  "const targetStepOffset = 18;"
);

// Elimination timer
src = src.replace(
  "let eliminationTimer = 45.0;",
  "let eliminationTimer = 75.0;"
);

// Vehicle forces & top speeds
src = src.replace(
  "const baseTopSpeed = 55 + (upgrades.engine - 1) * 10;",
  "const baseTopSpeed = 68 + (upgrades.engine - 1) * 10;"
);

src = src.replace(
  "const baseEngineForce = 5200 * (1 + (upgrades.engine - 1) * 0.25);",
  "const baseEngineForce = 6200 * (1 + (upgrades.engine - 1) * 0.25);"
);

// 11. Radar Minimap (worldToRadar & factory/container highlights)
src = src.replace(
  `function worldToRadar(x, z) {
 return {
  rx: 14 + ((z + 200) / 600) * 152,
  ry: 124 - ((x + 10) / 200) * 112
 };
}`,
  `function worldToRadar(x, z) {
 return {
  rx: 12 + ((z + 620) / 1850) * 156,
  ry: 124 - ((x + 30) / 580) * 114
 };
}`
);

src = src.replace(
  ` const facS = worldToRadar(65.5, -30.0);
 const facE = worldToRadar(65.5, 160.0);`,
  ` const facS = worldToRadar(196.5, -90.0);
 const facE = worldToRadar(196.5, 480.0);`
);

src = src.replace(
  ` const cS = worldToRadar(169.0, -50.0);
 const cE = worldToRadar(169.0, 200.0);`,
  ` const cS = worldToRadar(507.0, -180.0);
 const cE = worldToRadar(507.0, 650.0);`
);

// 12. Dynamic Sun shadow follow
const updateCameraPattern = /function updateCamera\(dt\) \{([\s\S]*?)let relPos, relLook;/;
src = src.replace(
  updateCameraPattern,
  `function updateCamera(dt) {
 sun.position.set(chassisBody.position.x + 80, 110, chassisBody.position.z - 60);
 sun.target.position.set(chassisBody.position.x, chassisBody.position.y, chassisBody.position.z);
 sun.target.updateMatrixWorld();$1let relPos, relLook;`
);

fs.writeFileSync(gameJsPath, src, 'utf8');
console.log('Successfully updated game.js to 3X Mega Scale! New length:', src.length);
