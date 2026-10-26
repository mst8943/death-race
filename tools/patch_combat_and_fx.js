const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', 'js', 'game.js');
let code = fs.readFileSync(gameJsPath, 'utf8');

// 1. ADD TAKEDOWN CAMERA VARIABLES AND OVERHAUL triggerTakedown()
const takedownImplementation = `
/* ==========================================================
   BURNOUT-TARZI SİNEMATİK TAKEDOWN KAMERASI & RAKİP SESLERİ
   ========================================================== */
let takedownCamActive = false;
let takedownCamTimer = 0;
let takedownVictimAI = null;
let lastRivalTauntTime = 0;

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
 showRadioMessage(\`\${ai.name}: \${line}\`, ai.name);
}
window.triggerRivalTaunt = triggerRivalTaunt;

function triggerTakedown(victimAI) {
 takedownCamActive = true;
 takedownCamTimer = 1.35;
 takedownVictimAI = victimAI;
 timeScale = 0.28;

 // Rakip araca sinematik takla ve fırlama darbesi uygula
 victimAI.chassisBody.velocity.y += 7.2;
 victimAI.chassisBody.velocity.x += (Math.random() - 0.5) * 5.5;
 victimAI.chassisBody.angularVelocity.set(
  (Math.random() < 0.5 ? 4.8 : -4.8),
  (Math.random() - 0.5) * 3.5,
  (Math.random() < 0.5 ? 4.2 : -4.2)
 );

 nitroAmount = 100;
 Snd.playTakedownSting();
 addViewers(2000000, '★ BURNOUT TAKEDOWN: ' + victimAI.name + ' ★');
 playerCredits += 65000;
 if (currencyValEl) currencyValEl.textContent = playerCredits.toLocaleString('tr-TR');
 showBanner('🔥 BURNOUT TAKEDOWN! ' + victimAI.name + ' PARÇALANDI!', 'buff-sword');

 const lastWords = {
  ai0: "Hennessey beni aldattı... lanet olsun!",
  ai1: "Mezarıma senin adını yazacağım Frankenstein...",
  ai2: "Arabam! Paramparça oldu!",
  ai3: "Kahretsin! Motor patladı!"
 };
 const victimWords = lastWords[victimAI.id] || "Arabam havaya uçtu!";
 showRadioMessage(\`\${victimAI.name}: \${victimWords}\`, victimAI.name);

 if (victimAI.isNemesis) {
  victimAI.isNemesis = false;
  if (nemesisHudEl) nemesisHudEl.style.display = 'none';
  showBanner('NEMESIS İNTİKAMI ALINDI!', 'buff-shield');
 }
}
`;

// Replace old triggerTakedown
const oldTriggerTakedownRegex = /function triggerTakedown\(victimAI\)[\s\S]*?showBanner\('NEMESIS İNTİKAMI ALINDI!', 'buff-shield'\);\s*\}\s*\}/;
if (oldTriggerTakedownRegex.test(code)) {
  code = code.replace(oldTriggerTakedownRegex, takedownImplementation.trim());
  console.log("Replaced triggerTakedown with cinematic burnout takedown.");
} else {
  console.log("Warning: oldTriggerTakedownRegex not matched directly.");
}

// 2. HOOK TAKEDOWN CAMERA INTO updateCamera()
const targetUpdateCam = "function updateCamera(dt) {";
const takedownCamUpdateCode = `
 if (takedownCamActive && takedownVictimAI) {
  takedownCamTimer -= dt;
  if (takedownCamTimer <= 0) {
   takedownCamActive = false;
   takedownVictimAI = null;
   timeScale = 1.0;
  } else {
   const vp = takedownVictimAI.chassisBody.position;
   const relOffset = new T.Vector3(5.5, 2.6, -4.8);
   camera.position.lerp(new T.Vector3(vp.x + relOffset.x, vp.y + relOffset.y, vp.z + relOffset.z), 1 - Math.exp(-18 * dt));
   camera.lookAt(vp.x, vp.y + 0.8, vp.z);
   return;
  }
 }
`;

if (code.includes(targetUpdateCam) && !code.includes('takedownCamActive && takedownVictimAI')) {
  code = code.replace(targetUpdateCam, targetUpdateCam + '\n' + takedownCamUpdateCode);
  console.log("Hooked takedown cinematic camera into updateCamera().");
}

// 3. HOOK RIVAL TAUNTS INTO updateAIOpponents()
const aiFireHookTarget = "if (distToCar < 38.0 && Math.abs(angleDiff) < 0.35 && aiFireEnabled) {";
const rivalTauntTrigger = `
   if (distToCar < 28.0 && Math.random() < 0.25) {
    triggerRivalTaunt(ai, 'attack');
   }
`;
if (code.includes(aiFireHookTarget) && !code.includes('triggerRivalTaunt(ai')) {
  code = code.replace(aiFireHookTarget, rivalTauntTrigger + '\n   ' + aiFireHookTarget);
  console.log("Hooked rival taunts into updateAIOpponents().");
}

// 4. ADD DREADNOUGHT MODULAR TARGETING SUBSYSTEMS
const oldDreadnoughtHitTarget = "const isWeakpoint = localPt.z < -4.2;\n   const finalDmg = isWeakpoint ? dmg * 3 : dmg;";
const newDreadnoughtHitTarget = `// Modüler Hasar Alt Sistemleri (Sol Alev, Sağ Alev, Yakıt Tankı, Paletler)
   if (!dreadnought.subsystems) {
    dreadnought.subsystems = { leftTurret: 90, rightTurret: 90, fuelTanks: 140, tracks: 160 };
   }

   let isWeakpoint = false;
   let hitSubsystem = null;

   if (localPt.z < -3.8) {
    // Arka Yakıt Tankları (Kritik 3X Hasar)
    isWeakpoint = true;
    hitSubsystem = 'fuelTanks';
    dreadnought.subsystems.fuelTanks = Math.max(0, dreadnought.subsystems.fuelTanks - dmg);
    if (dreadnought.subsystems.fuelTanks <= 0 && !dreadnought.tanksBlown) {
     dreadnought.tanksBlown = true;
     createExplosion(new T.Vector3(hitPt.x, hitPt.y, hitPt.z), 10, 5000);
     showBanner('💥 DREADNOUGHT YAKIT TANKLARI İNFİLAK ETTİ!', 'buff-sword');
     showRadioMessage('Muhteşem vuruş! Yakıt tankları patladı, canı yarı yarıya indi!');
     dmg *= 1.8;
    }
   } else if (localPt.x < -1.1 && localPt.z > 0) {
    hitSubsystem = 'leftTurret';
    dreadnought.subsystems.leftTurret = Math.max(0, dreadnought.subsystems.leftTurret - dmg);
    if (dreadnought.subsystems.leftTurret <= 0 && !dreadnought.leftTurretDestroyed) {
     dreadnought.leftTurretDestroyed = true;
     createExplosion(new T.Vector3(hitPt.x, hitPt.y, hitPt.z), 5, 2500);
     showBanner('🛡️ DREADNOUGHT SOL ALEV SİLAHI DEVRE DIŞI!', 'buff-shield');
    }
   } else if (localPt.x > 1.1 && localPt.z > 0) {
    hitSubsystem = 'rightTurret';
    dreadnought.subsystems.rightTurret = Math.max(0, dreadnought.subsystems.rightTurret - dmg);
    if (dreadnought.subsystems.rightTurret <= 0 && !dreadnought.rightTurretDestroyed) {
     dreadnought.rightTurretDestroyed = true;
     createExplosion(new T.Vector3(hitPt.x, hitPt.y, hitPt.z), 5, 2500);
     showBanner('🛡️ DREADNOUGHT SAĞ ALEV SİLAHI DEVRE DIŞI!', 'buff-shield');
    }
   } else if (localPt.y < 0.2) {
    hitSubsystem = 'tracks';
    dreadnought.subsystems.tracks = Math.max(0, dreadnought.subsystems.tracks - dmg);
    if (dreadnought.subsystems.tracks <= 0) {
     dreadnought.speed = Math.max(8.0, dreadnought.speed * 0.65); // Palet hasarı yavaşlatır
     showBanner('⚙️ DREADNOUGHT PALETLERİ AĞIR HASAR ALDI (-%35 HIZ)!', 'buff-shield');
    }
   }

   const finalDmg = isWeakpoint ? dmg * 3 : dmg;`;

if (code.includes(oldDreadnoughtHitTarget)) {
  code = code.replace(oldDreadnoughtHitTarget, newDreadnoughtHitTarget);
  console.log("Upgraded Dreadnought with modular destructible subsystems.");
}

// 5. ADD VISUAL EFFECTS: TIRE SMOKE & BACKFIRE FLAMES
const fxImplementation = `
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
const smokeGeo = new T.SphereGeometry(0.35, 6, 6);
const smokeMat = new T.MeshBasicMaterial({ color: '#888888', transparent: true, opacity: 0.45 });

function spawnDriftSmoke(pos) {
 const m = new T.Mesh(smokeGeo, smokeMat.clone());
 m.position.copy(pos);
 m.scale.set(1, 1, 1);
 scene.add(m);
 smokeParticles.push({ mesh: m, life: 0.65, maxLife: 0.65 });
}
`;

if (!code.includes('triggerExhaustBackfire')) {
  // Insert before updateControls
  code = code.replace("function updateControls(dt) {", fxImplementation + '\nfunction updateControls(dt) {');
  console.log("Added visual FX: Backfire and Drift Smoke.");
}

// 6. UPDATE updateControls() TO TRIGGER BACKFIRE AND SMOKE
const controlsTarget = "Snd.updateEngine(speedKmh, isPressingForward);";
const controlsHook = `
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

 // Drift ve sert fren lastik dumanı
 if (isPressingHandbrake || (Math.abs(forwardSpeed) > 15 && isPressingBrake)) {
  if (Math.random() < 0.55) {
   const leftWheelPos = new T.Vector3(-0.9, 0.1, -1.3).applyQuaternion(carGroup.quaternion).add(carGroup.position);
   const rightWheelPos = new T.Vector3(0.9, 0.1, -1.3).applyQuaternion(carGroup.quaternion).add(carGroup.position);
   spawnDriftSmoke(leftWheelPos);
   spawnDriftSmoke(rightWheelPos);
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
  sp.mesh.material.opacity = (sp.life / sp.maxLife) * 0.45;
  if (sp.life <= 0) {
   scene.remove(sp.mesh);
   smokeParticles.splice(i, 1);
  }
 }
`;

if (code.includes(controlsTarget) && !code.includes('Drift ve sert fren lastik dumanı')) {
  code = code.replace(controlsTarget, controlsTarget + '\n' + controlsHook);
  console.log("Hooked backfire and drift smoke into updateControls().");
}

fs.writeFileSync(gameJsPath, code);
console.log("Updated js/game.js with combat and visual FX!");
