const fs = require('fs');

let code = fs.readFileSync('js/game.js', 'utf8');

// 1. Fix Skull plate crash
code = code.replace(
  /for \(let c of HANGAR_CRUSHERS\) \{ c\.headMesh\.position\.y = 1\.2; c\.body\.position\.y = 1\.2; \}/g,
  'for (let c of HANGAR_CRUSHERS) { c.group.position.y = 1.8; c.lastSlamTime = performance.now(); }'
);

// 2. Fix Airdrop green smoke helper & call
if (!code.includes('function spawnCrateGreenSmoke')) {
  code = code.replace(
    'const activeAirdrops = [];',
    `const activeAirdrops = [];
function spawnCrateGreenSmoke(pos) {
 const mat = new T.MeshStandardMaterial({ color: '#2ecc71', roughness: 0.9, transparent: true, opacity: 0.75 });
 const m = new T.Mesh(smokeGeo, mat);
 m.position.set(pos.x + (Math.random() - 0.5) * 0.8, pos.y + 0.8, pos.z + (Math.random() - 0.5) * 0.8);
 m.scale.setScalar(0.7 + Math.random() * 0.4);
 scene.add(m);
 smokePuffs.push({
  mesh: m, vx: (Math.random() - 0.5) * 0.8, vy: 1.8 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 0.8,
  grow: 2.2, life: 1.2, maxLife: 1.2
 });
}`
  );
}

code = code.replace(
  /spawnDamageSmokePuff\(false\);(\s*\/\/\s*Yeşil sinyal dumanı|\s*\})/g,
  (match) => match.replace('spawnDamageSmokePuff(false);', 'spawnCrateGreenSmoke(ad.group.position);')
);

// Directly fix within updateAirdrops:
code = code.replace(
  /(\/\/ Yeşil sinyal dumanı[\s\r\n]+if\s*\(Math\.random\(\)\s*<\s*0\.25\)\s*\{[\s\r\n]+)spawnDamageSmokePuff\(false\);/,
  '$1spawnCrateGreenSmoke(ad.group.position);'
);

// 3. Fix Harbor Escape Victory Trigger point
code = code.replace(
  /pPos\.z > 830\.0 && pPos\.z < 865\.0 && Math\.abs\(pPos\.x\) < 10\.0 && pSpeedKmh > 75\.0/g,
  'pPos.z > 885.0 && Math.abs(pPos.x) < 18.0'
);

// 4. Fix Near Miss & Drift Stats Tracking
if (!code.includes('raceStats.nearMisses++')) {
  code = code.replace(
    /(lastNearMissTime = now;)/,
    '$1 raceStats.nearMisses++;'
  );
}

if (!code.includes('raceStats.driftScore +=')) {
  code = code.replace(
    /(driftComboScore \+= dt \* 450;)/,
    '$1 raceStats.driftScore += dt * 450;'
  );
}

// 5. Shield Bullet Deflection (Mechanic 16)
if (!code.includes('Mermiyi düşmana geri yansıt')) {
  code = code.replace(
    /(if \(b\.isEnemy\) \{\s+if \(hitBody === chassisBody\) \{)/,
    `if (b.isEnemy) {
     if (hitBody === chassisBody) {
      if (shieldTimer > 0) {
       spawnSparks(hitPt, hitNorm, 20);
       Snd.playImpact();
       // Mermiyi düşmana geri yansıt!
       b.isEnemy = false;
       b.vel.multiplyScalar(-1.15);
       b.life = 0.9;
       continue;
      }`
  );
}

// 6. Oil Slick Ignition (Mechanic 15)
if (!code.includes('function checkOilIgnition')) {
  code = code.replace(
    'const activeOilSlicks = [];',
    `const activeOilSlicks = [];
function checkOilIgnition(hitPos, radius = 3.8) {
 for (let oil of activeOilSlicks) {
  if (oil.isIgnited) continue;
  const dist = Math.hypot(hitPos.x - oil.pos.x, hitPos.z - oil.pos.z);
  if (dist < oil.radius + radius) {
   oil.isIgnited = true;
   triggerFlameJet(oil.pos.x - 1.2, oil.pos.z - 1.2);
   triggerFlameJet(oil.pos.x + 1.2, oil.pos.z + 1.2);
   triggerFlameJet(oil.pos.x, oil.pos.z);
   oil.mesh.material.color.setHex(0xff3300);
   showBanner('🔥 MOTOR YAĞI ALEV ALDI! ALEV DUVARI PARLADI!', 'buff-sword');
   Snd.playImpact();
   break;
  }
 }
}`
  );

  // Hook into bullet impacts & explosions
  code = code.replace(
    'spawnSparks(hitPt, hitNorm, 6);',
    'spawnSparks(hitPt, hitNorm, 6); checkOilIgnition(hitPt);'
  );
}

fs.writeFileSync('js/game.js', code, 'utf8');
console.log('apply_audit_fixes executed successfully.');
