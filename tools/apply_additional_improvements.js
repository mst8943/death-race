const fs = require('fs');

console.log('--- APPLYING ADDITIONAL IMPROVEMENTS (DUSK WEATHER, AIRDROPS, COMBOS, TAUNTS) ---');

let code = fs.readFileSync('js/game.js', 'utf8');

// 1. ADD MODE 3 (KIZIL ENDÜSTRİYEL GÜN BATIMI / DUSK) TO setWeather
const sunsetWeather = `  } else if (mode === 3) {
   // Kızıl Endüstriyel Gün Batımı & Duman (Industrial Dusk)
   scene.background.set('#241219');
   scene.fog.color.set('#2b151e');
   sun.color.set('#ff6622');
   sun.intensity = 2.6;
   hemi.color.set('#ff8844');
   hemi.groundColor.set('#1a0d14');
   hemi.intensity = 1.3;
   rainPoints.visible = false;
   if (typeof leftHeadlight !== 'undefined' && leftHeadlight) { leftHeadlight.intensity = 3.5; rightHeadlight.intensity = 3.5; }
   showBanner('HAVA DURUMU: KIZIL ENDÜSTRİYEL GÜN BATIMI [H]', 'buff-sword');
   showRadioMessage('Kızıl gün batımı çöktü Frankenstein! Endüstriyel duman görüşü kısıtlıyor, farları açtık!', 'case');
  }`;

code = code.replace(
  /showRadioMessage\('Karanlık çöktü! Farlarını ve projektörleri açık tut!', 'case', 'Pitch black night! Keep headlights on!'\);\s+}/,
  `showRadioMessage('Karanlık çöktü! Farlarını ve projektörleri açık tut!', 'case', 'Pitch black night! Keep headlights on!');\n  }\n` + sunsetWeather
);

// Allow H key to cycle through all 4 weather modes: 0, 1, 2, 3
code = code.replace(
  /if \(KEYS\['h'\]\) {\s+weatherMode = \(weatherMode \+ 1\) % 3;/,
  `if (KEYS['h']) {
  weatherMode = (weatherMode + 1) % 4;`
);

// 2. SPECTATOR AIRDROP SUPPLY CRATES SYSTEM
const airdropSystem = `
/* ==========================================================
   SEYİRCİ REYTİNGİ HAVA İKMAL SANDIĞI (AIRDROP SUPPLY CRATE)
   ========================================================== */
const activeAirdrops = [];
let nextAirdropThreshold = 18000000;

const airdropCrateGeo = new T.BoxGeometry(2.2, 1.8, 2.2);
const airdropCrateMat = new T.MeshStandardMaterial({ color: '#27ae60', roughness: 0.5, metalness: 0.7 });
const parachuteMat = new T.MeshStandardMaterial({ color: '#ecf0f1', roughness: 0.8, side: T.DoubleSide });

function spawnAirdropCrate() {
 const playerInfo = getTrackDistance(chassisBody.position);
 const dropIdx = (playerInfo.index + 55) % NUM_TRACK_STEPS;
 const dropPt = TRACK_POINTS[dropIdx];

 const dropGroup = new T.Group();
 dropGroup.position.set(dropPt.x, 24.0, dropPt.z);

 const crate = new T.Mesh(airdropCrateGeo, airdropCrateMat);
 crate.castShadow = true;
 dropGroup.add(crate);

 // Paraşüt Kubbesi
 const chuteGeo = new T.SphereGeometry(3.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
 const chute = new T.Mesh(chuteGeo, parachuteMat);
 chute.position.y = 4.2;
 dropGroup.add(chute);

 // Yeşil Flare Işığı
 const flare = new T.PointLight('#2ecc71', 4.0, 25);
 flare.position.y = 1.5;
 dropGroup.add(flare);

 scene.add(dropGroup);
 activeAirdrops.push({ group: dropGroup, pos: dropPt, currentY: 24.0, isLanded: false, collected: false });

 Snd.playPadChime();
 showBanner('📦 WEYLAND İZLEYİCİLERİ HAVA İKMAL SANDIĞI İNDİRDİ!', 'buff-shield');
 showRadioMessage('İzleyiciler hava desteği indirdi Frankenstein! İlerideki yeşil sandığı kap!', 'case');
}

function updateAirdrops(dt) {
 for (let i = activeAirdrops.length - 1; i >= 0; i--) {
  const ad = activeAirdrops[i];
  if (ad.collected) continue;

  if (!ad.isLanded) {
   ad.currentY -= 6.5 * dt;
   if (ad.currentY <= 1.0) {
    ad.currentY = 1.0;
    ad.isLanded = true;
   }
   ad.group.position.y = ad.currentY;
  }

  // Yeşil sinyal dumanı
  if (Math.random() < 0.25) {
   spawnDamageSmokePuff(false);
  }

  // Oyuncu çarpışma kontrolü
  const pPos = chassisBody.position;
  const dist = Math.hypot(pPos.x - ad.pos.x, pPos.z - ad.pos.z);
  if (dist < 3.8 && Math.abs(pPos.y - ad.currentY) < 3.2) {
   ad.collected = true;
   scene.remove(ad.group);
   activeAirdrops.splice(i, 1);

   // Ödül: Full Zırh + Tombstone Onarımı + Mega Nitro + Puan
   const maxHP = 100 + (upgrades.armor - 1) * 35;
   carHealth = maxHP;
   tombstoneHealth = tombstoneMaxHealth;
   if (tombstoneFillEl) { tombstoneFillEl.style.width = '100%'; tombstoneFillEl.style.background = 'linear-gradient(90deg, #7f8c8d, #bdc3c7)'; }
   if (tombstoneTextEl) tombstoneTextEl.textContent = 'TOMBSTONE %100 [T]';
   nitroAmount = 100;
   overdriveTimer = 10.0;
   playerCredits += 75000;
   if (currencyValEl) currencyValEl.textContent = playerCredits.toLocaleString('tr-TR');

   Snd.playPowerup('shield');
   createExplosion(pPos, 8, 2000);
   showBanner('📦 HAVA SANDIĞI ALINDI! FULL ONARIM & SINIRSIZ NİTRO!', 'buff-shield');
   showRadioMessage('Sandık alındı Frankenstein! Sistemler tamamen onarıldı, canavar hazır!', 'case');
   addViewers(2000000, 'HAVA İKMALİ ALINDI!');
  }
 }
}
`;

if (!code.includes('spawnAirdropCrate')) {
  code = code.replace(/function updateActivationPlates/, airdropSystem + '\nfunction updateActivationPlates');
}

// 3. NEAR-MISS & DRIFT COMBO SCORING SYSTEM
const comboScoring = `
/* ==========================================================
   KIL PAYI GEÇİŞ (NEAR MISS) & DRIFT COMBO PUANLAMASI
   ========================================================== */
let lastNearMissTime = 0;
let driftComboScore = 0;

function updateCombosAndNearMiss(dt) {
 const pPos = chassisBody.position;
 const pSpeedKmh = chassisBody.velocity.length() * 3.6;

 // 1. Near Miss Kontrolü (>100 km/s hızda rakiplere çok yakın teğet geçme)
 if (pSpeedKmh > 95) {
  const now = performance.now();
  if (now - lastNearMissTime > 2800) {
   for (let ai of aiOpponents) {
    if (ai.isDead) continue;
    const dist = pPos.distanceTo(ai.chassisBody.position);
    if (dist > 2.6 && dist < 4.2) {
     lastNearMissTime = now;
     playerCredits += 12000;
     if (currencyValEl) currencyValEl.textContent = playerCredits.toLocaleString('tr-TR');
     addViewers(300000, 'KIL PAYI GEÇİŞ!');
     showBanner('⚡ KIL PAYI GEÇİŞ (NEAR MISS)! +12.000 PTS', 'buff-sword');
     Snd.playImpact();
     break;
    }
   }
  }
 }

 // 2. Drift Puan Biriktirme
 if (isDrifting && pSpeedKmh > 50) {
  driftComboScore += dt * 450;
  if (driftComboScore > 300) {
   playerCredits += Math.round(driftComboScore * 0.1);
   addViewers(Math.round(driftComboScore * 10));
   driftComboScore = 0;
  }
 } else {
  driftComboScore = 0;
 }

 // 3. İzleyici Eşiği Airdrop Kontrolü
 if (currentViewers >= nextAirdropThreshold) {
  nextAirdropThreshold += 7000000;
  spawnAirdropCrate();
 }
}
`;

if (!code.includes('updateCombosAndNearMiss')) {
  code = code.replace(/function updateActivationPlates/, comboScoring + '\nfunction updateActivationPlates');
}

// Hook updateAirdrops and updateCombosAndNearMiss into loop()
code = code.replace(
  /updateActivationPlates\(dt\);/,
  `updateActivationPlates(dt);
  updateAirdrops(dt);
  updateCombosAndNearMiss(dt);`
);

fs.writeFileSync('js/game.js', code, 'utf8');
console.log('--- ALL ADDITIONAL IMPROVEMENTS SUCCESSFULLY APPLIED ---');
