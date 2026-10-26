const fs = require('fs');

console.log('=== STARTING DEEP PHYSICS, RAMP, COLLISION & MECHANIC FIXES ===');

let code = fs.readFileSync('js/game.js', 'utf8');

// ==========================================================
// 1. REUSABLE PHYSICAL RAMP FUNCTION WITH REAL CANNON BODIES
// ==========================================================
const rampSystemCode = `
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
 
 // Position: center is at Y = pos[1] + height / 2 - 0.22 so entrance lip is flush with asphalt
 rampBody.position.set(pos[0], pos[1] + height / 2 - 0.22, pos[2]);

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
 activeTrackRamps.push({ body: rampBody, group: rampGroup, name, pos });
 return { body: rampBody, group: rampGroup };
}
`;

// Insert createPhysicalRamp right before addStaticBox
code = code.replace(/function addStaticBox/, rampSystemCode + '\nfunction addStaticBox');

// ==========================================================
// 2. PLACE 4 STRATEGIC PHYSICAL RAMPS ACROSS THE TRACK
// ==========================================================
const rampPlacements = `
// 1. Start/Finish Düzlüğü Atlama Rampası (SF Straight - Z=320, Patlayıcı Varillerin Üstünden Uçar)
createPhysicalRamp(18, 26, 4.2, [0, 0, 320], 0, 'ramp_sf');

// 2. Konteyner Limanı Otoyolu Mega Rampası (Layer 4 - X=507.0, Z=100)
createPhysicalRamp(18, 28, 4.8, [507.0, 0, 100], 0, 'ramp_container');

// 3. Doğu Kalesi Geri Dönüş Rampası (Layer 2 East - X=97.5, Z=180)
createPhysicalRamp(18, 24, 3.8, [97.5, 0, 180], Math.PI, 'ramp_layer2');

// 4. Liman Kale Çıkış Kaçış Rampası (Okyanusa ve Kargo Gemisine Doğru)
const escapeRampObj = createPhysicalRamp(20, 38, 6.2, [0, 0, 835], 0, 'ramp_escape');
`;

// Replace old static boxes and dummy escape ramp
code = code.replace(
  /addStaticBox\(\[12, 1\.8, 20\], \[507\.0, 0\.9, 360\], 0\);/,
  'addStaticBox([12, 1.8, 20], [507.0, 0.9, 360], 0);\n' + rampPlacements
);

// Remove the old non-physical escapeRampMesh
code = code.replace(
  /\/\/ Liman Atlama Rampası[\s\S]*?fortressGateGroup\.add\(escapeRampMesh\);/,
  '// Liman Atlama Rampası createPhysicalRamp ile gerçek Cannon gövdesiyle oluşturuldu'
);

// Add physical Cannon bodies for Fortress Gate Pillars and Doors
const fortressGatePhysics = `
// Kale Kapısı Direkleri ve Kapıları İçin Gerçek Fiziksel Gövdeler (Cannon.js)
const gatePillarBodyL = new CANNON.Body({ mass: 0, material: groundMat });
gatePillarBodyL.addShape(new CANNON.Box(new CANNON.Vec3(1.25, 6.0, 1.25)));
gatePillarBodyL.position.set(-16.0, 6.0, 810.0);
world.addBody(gatePillarBodyL);

const gatePillarBodyR = new CANNON.Body({ mass: 0, material: groundMat });
gatePillarBodyR.addShape(new CANNON.Box(new CANNON.Vec3(1.25, 6.0, 1.25)));
gatePillarBodyR.position.set(16.0, 6.0, 810.0);
world.addBody(gatePillarBodyR);

// Kapalı Kapı Fiziksel Bariyeri (Açılana kadar içinden geçilemez!)
const gateDoorBody = new CANNON.Body({ mass: 0, material: groundMat });
gateDoorBody.addShape(new CANNON.Box(new CANNON.Vec3(14.5, 4.8, 0.6)));
gateDoorBody.position.set(0, 5.0, 810.0);
world.addBody(gateDoorBody);

// Kargo Gemisi Güverte Fizik Gövdesi (Üzerine İniş Yapılabilir!)
const shipDeckBody = new CANNON.Body({ mass: 0, material: groundMat });
shipDeckBody.addShape(new CANNON.Box(new CANNON.Vec3(16.0, 1.0, 48.0)));
shipDeckBody.position.set(0, 7.0, 940.0);
world.addBody(shipDeckBody);
`;

code = code.replace(
  /scene\.add\(fortressGateGroup\);/,
  'scene.add(fortressGateGroup);\n' + fortressGatePhysics
);

// Update breachFortressGate to remove physical door barrier
code = code.replace(
  /function breachFortressGate\(\) {[\s\S]*?gateDoorL\.position\.x = -13\.5;\s+gateDoorR\.position\.x = 13\.5;/,
  `function breachFortressGate() {
 if (isGateBreached) return;
 isGateBreached = true;
 try { world.removeBody(gateDoorBody); } catch(e) {}
 gateDoorL.rotation.y = -Math.PI / 2.2;
 gateDoorR.rotation.y = Math.PI / 2.2;
 gateDoorL.position.x = -13.5;
 gateDoorR.position.x = 13.5;`
);

// ==========================================================
// 3. UNLOCK ALL WEAPONS IMMEDIATELY (NO MORE LOCKING IN TEST)
// ==========================================================
// Remove the annoying Stage 1 locks from shootBullet, fireRocket, triggerEMPBlast, deployStickyMine, deploySpikeStrip, callHelicopterStrike
code = code.replace(
  /if \(currentStage === 1\) {\s+const nw = performance\.now\(\);[\s\S]*?return;\s+}/g,
  ''
);
code = code.replace(
  /if \(currentStage === 1\) {\s+showBanner\([^)]+\);\s+return;\s+}/g,
  ''
);

// ==========================================================
// 4. FIX REARVIEW CAMERA MATH (V KEY)
// ==========================================================
const fixedRearviewCam = `
 if (KEYS['v']) {
  // 180° Geri Görüş Kamerası: Aracın arkasından geriye doğru bakış
  const rearEye = new T.Vector3(0, 2.2, -2.5).applyQuaternion(carGroup.quaternion).add(carGroup.position);
  const lookBack = new T.Vector3(0, 1.2, -35.0).applyQuaternion(carGroup.quaternion).add(carGroup.position);
  camera.position.copy(rearEye);
  camera.lookAt(lookBack);
  return;
 }
`;

code = code.replace(
  /if \(KEYS\['v'\]\) {[\s\S]*?return;\s+}/,
  fixedRearviewCam.trim()
);

// ==========================================================
// 5. ANIMATED SLIPSTREAM VORTEX PARTICLES
// ==========================================================
const animatedSlipstream = `
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
`;

code = code.replace(
  /isSlipstreaming = inWake;[\s\S]*?chassisBody\.applyForce\(new CANNON\.Vec3\(boost\.x, 0, boost\.z\), chassisBody\.position\);\s+}/,
  animatedSlipstream.trim()
);

// ==========================================================
// 6. 3D FLOATING BOUNTY TARGET BEACON
// ==========================================================
const bountyBeaconCode = `
// 3D Kelle Avı (Bounty) Dönen Hedef Göstergesi
const bountyMarkerMat = new T.MeshBasicMaterial({ color: '#ffcc00', wireframe: true });
const bountyMarkerMesh = new T.Mesh(new T.OctahedronGeometry(1.4), bountyMarkerMat);
bountyMarkerMesh.visible = false;
scene.add(bountyMarkerMesh);

const bountyMarkerLight = new T.PointLight('#ffcc00', 3.0, 16);
bountyMarkerMesh.add(bountyMarkerLight);
`;

code = code.replace(
  /const bountyHudEl = document\.getElementById\('bounty-hud'\);/,
  'const bountyHudEl = document.getElementById(\'bounty-hud\');\n' + bountyBeaconCode
);

// Update bounty marker position in loop()
const updateBountyMarkerCall = `
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
`;

code = code.replace(
  /updateDreadnoughtPhases\(\);/,
  'updateDreadnoughtPhases();\n' + updateBountyMarkerCall
);

// ==========================================================
// 7. FIX ROLL-OVER AUTO-RECOVERY (NORMALIZED QUATERNION)
// ==========================================================
const fixedRollOver = `
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
`;

code = code.replace(
  /function updateRollOverRecovery\(dt\) {[\s\S]*?upsideDownTimer = 0;\s+}\s+}/,
  fixedRollOver.trim()
);

// ==========================================================
// 8. PHYSICAL DESTRUCTIBLE SHORTCUT BARRICADES & EXPLODING FUEL SILOS
// ==========================================================
const destructibleStructures = `
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
`;

code = code.replace(
  /addCrate\(\[3\.0, 2\.0, 3\.0\], \[54\.0, 1\.0, -405\]\);/,
  'addCrate([3.0, 2.0, 3.0], [54.0, 1.0, -405]);\n' + destructibleStructures
);

// ==========================================================
// 9. REFINED LATERAL SHUNT FORCE
// ==========================================================
code = code.replace(
  /const shuntForce = sideDir\.clone\(\)\.multiplyScalar\(22000\);\s+chassisBody\.applyImpulse\(new CANNON\.Vec3\(shuntForce\.x, 200, shuntForce\.z\), chassisBody\.position\);/,
  `// Kontrollü Yanal Hız Artışı (Aracı Takla Attırmayan Oturaklı Shunt)
  chassisBody.velocity.x += sideDir.x * 6.2;
  chassisBody.velocity.z += sideDir.z * 6.2;
  chassisBody.angularVelocity.y += (dir === 'left' ? -0.8 : 0.8);`
);

fs.writeFileSync('js/game.js', code, 'utf8');
console.log('=== ALL DEEP PHYSICS, RAMPS, COLLISION & MECHANIC FIXES APPLIED SUCCESSFULLY ===');
