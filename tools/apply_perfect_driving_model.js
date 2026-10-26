const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', 'js', 'game.js');
let src = fs.readFileSync(gameJsPath, 'utf8');

console.log("Original length:", src.length);

// 1. Chassis Body physics: Armored heft (1750kg) & firmly planted suspension
const oldChassisPhysics = `const chassisSize = new CANNON.Vec3(0.95, 0.4, 2.1);
const wheelOptions = {
 radius: 0.38,
 directionLocal: new CANNON.Vec3(0, -1, 0),
 suspensionStiffness: 42,
 suspensionRestLength: 0.40,
 maxSuspensionTravel: 0.25,
 frictionSlip: 2.8,
 dampingRelaxation: 3.2,
 dampingCompression: 5.0,
 maxSuspensionForce: 100000,
 rollInfluence: 0.03,
 axleLocal: new CANNON.Vec3(-1, 0, 0),
 chassisConnectionPointLocal: new CANNON.Vec3(),
 useCustomSlidingRotationalSpeed: false,
};`;

const newChassisPhysics = `const chassisSize = new CANNON.Vec3(0.95, 0.4, 2.1);
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
};`;

if (src.includes(oldChassisPhysics)) {
  src = src.replace(oldChassisPhysics, newChassisPhysics);
  console.log("Updated chassis wheelOptions with high-grip planted suspension.");
} else {
  console.log("Could not find oldChassisPhysics!");
}

// Update mass and dampings in createVehiclePhysics
src = src.replace(
  "  mass: 1400,\n  position: new CANNON.Vec3(startPos[0], startPos[1], startPos[2]),\n  material: debrisMat,\n });\n cBody.addShape(new CANNON.Box(chassisSize), new CANNON.Vec3(0, 0.15, 0));\n if (startEulerY !== 0) cBody.quaternion.setFromEuler(0, startEulerY, 0);\n cBody.angularVelocity.set(0, 0, 0);\n cBody.linearDamping = 0.03;\n cBody.angularDamping = 0.6;",
  "  mass: 1750,\n  position: new CANNON.Vec3(startPos[0], startPos[1], startPos[2]),\n  material: debrisMat,\n });\n cBody.addShape(new CANNON.Box(chassisSize), new CANNON.Vec3(0, 0.12, 0));\n if (startEulerY !== 0) cBody.quaternion.setFromEuler(0, startEulerY, 0);\n cBody.angularVelocity.set(0, 0, 0);\n cBody.linearDamping = 0.04;\n cBody.angularDamping = 0.88;"
);

// 2. High-Density Road Stripes (Fast visual optical flow)
src = src.replace(
  "for (let i = 0; i < 600; i++) {\n if (i % 2 === 0) continue;\n const p1 = trackCurve.getPointAt(i / 600);\n const p2 = trackCurve.getPointAt((i + 0.6) / 600);",
  "for (let i = 0; i < 1400; i++) {\n if (i % 2 === 0) continue;\n const p1 = trackCurve.getPointAt(i / 1400);\n const p2 = trackCurve.getPointAt((i + 0.6) / 1400);"
);

// 3. New Intuitive Controls System
const oldControlsPattern = /let smoothSteer = 0;[\s\S]*?function updateControls\(dt\) \{[\s\S]*?if \(KEYS\['r'\]\) \{ resetCar\(\); KEYS\['r'\] = false; \}\s*\}/;

const newControlsCode = `let smoothSteer = 0;

function updateControls(dt) {
 if (carHealth <= 0) {
  for (let i = 0; i < 4; i++) { vehicle.applyEngineForce(0, i); vehicle.setBrake(45, i); }
  if (KEYS['r']) { resetCar(); KEYS['r'] = false; }
  return;
 }

 const v = chassisBody.velocity;
 const speed = v.length();
 const speedKmh = speed * 3.6;

 // 1. Hıza duyarlı dinamik FOV (Hız arttıkça görüş açısı açılarak müthiş bir hız hissi verir)
 const speedRatio = Math.min(1.0, speedKmh / 230);
 const usingNitro = (KEYS['shift']) && nitroAmount > 5 && (KEYS['w'] || KEYS['arrowup']);
 targetFOV = 62 + speedRatio * 18 + (usingNitro ? 12 : 0);

 // 2. Akıllı Gaz & Fren (S tuşu ile savrulmayan, düz hatlı ayak freni)
 const isPressingForward = (KEYS['w'] || KEYS['arrowup']);
 const isPressingBrake = (KEYS['s'] || KEYS['arrowdown']);
 const isPressingHandbrake = KEYS[' '];

 // Aracın kendi ileri yönündeki hız bileşeni
 const fwdVec = new T.Vector3(0, 0, 1).applyQuaternion(carGroup.quaternion);
 const forwardSpeed = v.x * fwdVec.x + v.z * fwdVec.z;

 let forward = 0;
 let brakeForce = 0;

 if (isPressingForward) {
  forward = 1;
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
  vehicle.wheelInfos[0].frictionSlip = 3.8;
  vehicle.wheelInfos[1].frictionSlip = 3.8;
  vehicle.wheelInfos[2].frictionSlip = 1.85;
  vehicle.wheelInfos[3].frictionSlip = 1.85;

  nitroAmount = Math.min(100, nitroAmount + 24 * dt);
  const rearLeft = carGroup.position.clone().add(new T.Vector3(-1.0, 0.1, -1.5).applyQuaternion(carGroup.quaternion));
  const rearRight = carGroup.position.clone().add(new T.Vector3(1.0, 0.1, -1.5).applyQuaternion(carGroup.quaternion));
  spawnTireSmoke(rearLeft);
  spawnTireSmoke(rearRight);
  if (Math.random() < 0.25) Snd.playTireScreech();
  addViewers(Math.round(8000 * dt));
 } else {
  // Normal sürüşte sağlam yol tutuşu (3.8) - tok, oturaklı ve ağırlıklı sürüş hissi
  for (let i = 0; i < 4; i++) vehicle.wheelInfos[i].frictionSlip = 3.8;
 }

 // 4. Direksiyon: Hıza duyarlı ağırbaşlı dönüş (Yüksek hızda ani savrulmayı önler)
 const steerRaw = (KEYS['a'] || KEYS['arrowleft']) ? 1 : (KEYS['d'] || KEYS['arrowright']) ? -1 : 0;
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

 const baseTopSpeed = 72 + (upgrades.engine - 1) * 12; // 72 m/s = 260 km/h taban, nitro ile 365+ km/h
 const topSpeed = usingNitro ? baseTopSpeed * 1.45 : baseTopSpeed;
 const falloff = Math.max(0, 1 - speed / topSpeed);
 const baseEngineForce = 9600 * (1 + (upgrades.engine - 1) * 0.25);
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

 const firing = KEYS['j'] || KEYS['f'] || KEYS['control'] || KEYS['enter'] || isMouseDown;
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

 if (KEYS['e']) {
  const now = performance.now();
  if (now - lastSmokeTime > 3000) { lastSmokeTime = now; dropSmokeScreen(); }
 }

 if (KEYS['t']) { detachArmorPart('part_tombstone'); KEYS['t'] = false; }
 if (KEYS['r']) { resetCar(); KEYS['r'] = false; }
}`;

if (oldControlsPattern.test(src)) {
  src = src.replace(oldControlsPattern, newControlsCode);
  console.log("Updated updateControls with AWD, smart brake, and arcade drift!");
} else {
  // In case smoothSteer wasn't defined yet
  const fallbackPattern = /function updateControls\(dt\) \{[\s\S]*?if \(KEYS\['r'\]\) \{ resetCar\(\); KEYS\['r'\] = false; \}\s*\}/;
  if (fallbackPattern.test(src)) {
    src = src.replace(fallbackPattern, newControlsCode);
    console.log("Updated updateControls (fallback pattern)!");
  } else {
    console.log("Could not find updateControls!");
  }
}

// 4. Rock-Solid Ground-Yaw Camera (Zero high-speed suspension jitter)
const oldCameraPattern = /function updateCamera\(dt\) \{[\s\S]*?camera\.lookAt\(camLook\);/;

const newCameraCode = `let smoothCamYaw = 0;
let smoothCamY = 2.4;

function updateCamera(dt) {
 sun.position.set(chassisBody.position.x + 80, 110, chassisBody.position.z - 60);
 sun.target.position.set(chassisBody.position.x, chassisBody.position.y, chassisBody.position.z);
 sun.target.updateMatrixWorld();
 camera.fov = T.MathUtils.lerp(camera.fov, targetFOV, 0.12);
 camera.updateProjectionMatrix();

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
 camera.lookAt(camLook);`;

if (oldCameraPattern.test(src)) {
  src = src.replace(oldCameraPattern, newCameraCode);
  console.log("Updated camera tracking to vibration-isolated yaw follow!");
} else {
  console.log("Could not find oldCameraPattern!");
}

fs.writeFileSync(gameJsPath, src, 'utf8');
console.log("Finished updating game.js with perfect driving model!");
