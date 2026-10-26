const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '../js/game.js');
let code = fs.readFileSync(GAME_JS, 'utf8');

// 1. New Covered Factory Hangar & Container Yard Code
const newSectionsCode = `/* ==========================================================
   BÖLÜM 1: ÜZERİ KAPALI BOŞ FABRİKA İŞLETMESİ (COVERED FACTORY HANGAR)
   Merkez Sanayi Koridoru (Katman 3, X ≈ 65.5, Z = -30 .. 160)
   ========================================================== */
const HANGAR_CRUSHERS = [];
let insideHangarState = false;

function createCoveredFactoryHangar() {
 const hangarGroup = new T.Group();
 scene.add(hangarGroup);

 const wallMat = new T.MeshStandardMaterial({ color: '#252c37', roughness: 0.85, metalness: 0.3 });
 const concreteMat = new T.MeshStandardMaterial({ color: '#383f4b', roughness: 0.95, metalness: 0.1 });
 const roofMat = new T.MeshStandardMaterial({ color: '#1a1f26', roughness: 0.8, metalness: 0.4 });
 const trussMat = new T.MeshStandardMaterial({ color: '#14181f', roughness: 0.5, metalness: 0.85 });
 const hazardMat = new T.MeshStandardMaterial({ color: '#f39c12', roughness: 0.5 });
 const portalMat = new T.MeshStandardMaterial({ color: '#c0392b', roughness: 0.5, metalness: 0.4 });

 const centerX = 65.5;
 const zStart = -30.0;
 const zEnd = 160.0;
 const len = zEnd - zStart; // 190 meters
 const zMid = zStart + len * 0.5;
 const width = 28.0; // 5m clearance on both sides of 18m road
 const height = 10.0; // 10m high ceiling

 // 1. Sol ve Sağ Ana Duvarlar (Fiziksel Çarpışma Gövdesi & Mesh)
 for (let side of [-1, 1]) {
  const wallX = centerX + side * (width / 2);
  const wallBody = new CANNON.Body({ mass: 0, material: groundMat });
  wallBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, height / 2, len / 2)));
  wallBody.position.set(wallX, height / 2, zMid);
  world.addBody(wallBody);

  // Duvar Meshi
  const wallMesh = new T.Mesh(new T.BoxGeometry(0.8, height, len), wallMat);
  wallMesh.position.copy(wallBody.position);
  wallMesh.castShadow = wallMesh.receiveShadow = true;
  hangarGroup.add(wallMesh);

  // Sarı-Siyah Güvenlik Taban Bordürü
  const curbMesh = new T.Mesh(new T.BoxGeometry(0.6, 0.4, len), hazardMat);
  curbMesh.position.set(wallX - side * 0.5, 0.2, zMid);
  hangarGroup.add(curbMesh);
 }

 // 2. Üzeri Kapalı Çift Eğimli Çatı (Pitched Steel Roof - Yağmuru & Işığı Keser)
 const roofSlopeL = new T.Mesh(new T.BoxGeometry(width / 2 + 1.5, 0.4, len), roofMat);
 roofSlopeL.position.set(centerX - width / 4, height + 0.6, zMid);
 roofSlopeL.rotation.z = 0.08;
 roofSlopeL.castShadow = true;
 hangarGroup.add(roofSlopeL);

 const roofSlopeR = new T.Mesh(new T.BoxGeometry(width / 2 + 1.5, 0.4, len), roofMat);
 roofSlopeR.position.set(centerX + width / 4, height + 0.6, zMid);
 roofSlopeR.rotation.z = -0.08;
 roofSlopeR.castShadow = true;
 hangarGroup.add(roofSlopeR);

 // 3. Çelik Çatı Makasları & Kirişler (Trusses & Cross Beams every 18m)
 const trussSpacing = 18.0;
 const numTrusses = Math.floor(len / trussSpacing);
 for (let i = 0; i <= numTrusses; i++) {
  const tz = zStart + i * trussSpacing;

  // Yatay Ana Kiriş
  const beam = new T.Mesh(new T.BoxGeometry(width + 0.5, 0.7, 0.7), trussMat);
  beam.position.set(centerX, height - 0.4, tz);
  beam.castShadow = true;
  hangarGroup.add(beam);

  // Dikey Yan Destek Kolonları
  for (let side of [-1, 1]) {
   const col = new T.Mesh(new T.BoxGeometry(0.8, height, 0.8), concreteMat);
   col.position.set(centerX + side * (width / 2 - 0.4), height / 2, tz);
   col.castShadow = true;
   hangarGroup.add(col);
  }

  // Sıcak & Güçlü Endüstriyel Tavan Lambaları (High-Bay Sodium Warehouse Lamps)
  const lampFixture = new T.Mesh(new T.ConeGeometry(0.6, 0.5, 8), trussMat);
  lampFixture.position.set(centerX, height - 0.9, tz);
  lampFixture.rotation.x = Math.PI;
  hangarGroup.add(lampFixture);

  const bulb = new T.Mesh(new T.SphereGeometry(0.2, 8, 8), new T.MeshBasicMaterial({ color: '#ffcc66' }));
  bulb.position.set(centerX, height - 1.2, tz);
  hangarGroup.add(bulb);

  const warehouseLight = new T.PointLight('#ffaa44', 3.4, 38);
  warehouseLight.position.set(centerX, height - 1.3, tz);
  hangarGroup.add(warehouseLight);
 }

 // 4. Giriş ve Çıkış Kapı Takları (Industrial Portals)
 for (let [pz, isEntry] of [[zStart, true], [zEnd, false]]) {
  // Üst Başlık Takı
  const portalHeader = new T.Mesh(new T.BoxGeometry(width + 2, 2.2, 1.2), portalMat);
  portalHeader.position.set(centerX, height + 0.6, pz);
  portalHeader.castShadow = true;
  hangarGroup.add(portalHeader);

  // Yan Kapı Sütunları
  for (let s of [-1, 1]) {
   const pCol = new T.Mesh(new T.BoxGeometry(1.6, height + 1.8, 1.2), hazardMat);
   pCol.position.set(centerX + s * (width / 2 + 0.6), (height + 1.8) / 2, pz);
   pCol.castShadow = true;
   hangarGroup.add(pCol);
  }

  // Portal Tabelası & Uyarı Lambaları
  const signLight = new T.PointLight(isEntry ? '#ff9900' : '#00e1ff', 3.0, 18);
  signLight.position.set(centerX, height + 1.2, pz + (isEntry ? -1.5 : 1.5));
  hangarGroup.add(signLight);
 }

 // 5. Yan Boş İşletme Ekipmanları (Tersane & Fabrika Makineleri - Yoldan 4.5m Dışarıda)
 const propZList = [-10, 15, 40, 65, 90, 115, 140];
 for (let pz of propZList) {
  // Sol taraf: Ağır pres makineleri ve elektrik panoları
  const machineMesh = new T.Mesh(new T.BoxGeometry(2.4, 3.2, 4.0), trussMat);
  machineMesh.position.set(centerX - (width / 2 - 2.0), 1.6, pz);
  machineMesh.castShadow = true;
  hangarGroup.add(machineMesh);

  // Sağ taraf: Metal depolama rafları & paletler
  const rackMesh = new T.Mesh(new T.BoxGeometry(2.0, 4.5, 5.0), wallMat);
  rackMesh.position.set(centerX + (width / 2 - 1.8), 2.25, pz + 4);
  rackMesh.castShadow = true;
  hangarGroup.add(rackMesh);
 }

 // 6. 3 Adet Dev Hidrolik Ezici Pres (Tavana Monte)
 const crusherMat = new T.MeshStandardMaterial({ color: '#181d24', roughness: 0.3, metalness: 0.9 });
 const pistonShaftMat = new T.MeshStandardMaterial({ color: '#d0d4dc', roughness: 0.1, metalness: 0.95 });
 const hazardLightMat = new T.MeshBasicMaterial({ color: '#ff2200' });

 const crusherZs = [20.0, 70.0, 120.0];
 for (let idx = 0; idx < 3; idx++) {
  const cZ = crusherZs[idx];
  const cPos = new T.Vector3(centerX, height - 1.5, cZ);

  const group = new T.Group();
  group.position.copy(cPos);
  hangarGroup.add(group);

  const hammer = new T.Mesh(new T.BoxGeometry(10.5, 2.6, 3.6), crusherMat);
  hammer.castShadow = true;
  group.add(hammer);

  // Sivri ezici çiviler
  for (let spx = -4.2; spx <= 4.2; spx += 1.4) {
   for (let spz = -1.2; spz <= 1.2; spz += 1.2) {
    const spike = new T.Mesh(new T.ConeGeometry(0.2, 0.7, 6), crusherMat);
    spike.position.set(spx, -1.6, spz);
    spike.rotation.x = Math.PI;
    group.add(spike);
   }
  }

  // Dikey çift piston milleri
  for (let sx of [-3.5, 3.5]) {
   const shaft = new T.Mesh(new T.CylinderGeometry(0.18, 0.18, 6.0, 12), pistonShaftMat);
   shaft.position.set(sx, 3.5, 0);
   group.add(shaft);
  }

  // Kırmızı tehlike flaşörü
  const strobe = new T.Mesh(new T.SphereGeometry(0.3, 8, 8), hazardLightMat);
  strobe.position.set(0, -1.3, 1.9);
  group.add(strobe);

  const crusherLight = new T.PointLight('#ff2200', 0, 14);
  crusherLight.position.set(0, -1.3, 2.1);
  group.add(crusherLight);

  HANGAR_CRUSHERS.push({
   group, strobe, light: crusherLight,
   pos: new T.Vector3(centerX, 0, cZ),
   baseY: height - 1.5,
   phaseOffset: idx * 1.35,
   lastSlamTime: 0
  });
 }
}

function updateHangarCrushers(dt) {
 const time = performance.now() * 0.001;
 const pPos = chassisBody.position;
 const inHangarRegion = (pPos.x > 50 && pPos.x < 81 && pPos.z > -30 && pPos.z < 160);

 if (inHangarRegion && !insideHangarState) {
  insideHangarState = true;
  showBanner('🏭 KAPALI FABRİKA HANGARINA GİRİLDİ!', 'buff-sword');
  showRadioMessage('Boş fabrika işletmesine girdik Frankenstein! Preslerin zamanlamasına dikkat et!', 'case', 'Entered covered factory facility! Watch the crushers!');
  addViewers(55000);
 } else if (!inHangarRegion && insideHangarState) {
  insideHangarState = false;
  showBanner('🏭 FABRİKA HANGARINDAN ÇIKILDI! AÇIK YOLA DEVAM!', 'buff-sword');
  showRadioMessage('Temiz çıktık Frankenstein! Önümüz açık, gaza bas!', 'case', 'Exited factory facility, clear open track ahead!');
  addViewers(85000);
 }

 for (let c of HANGAR_CRUSHERS) {
  const cycle = (time + c.phaseOffset) % 3.6;
  let yPos = c.baseY;

  if (cycle < 1.8) {
   yPos = c.baseY;
   c.light.intensity = 0;
   c.strobe.material.color.set('#551100');
  } else if (cycle < 2.4) {
   yPos = c.baseY;
   const strobeOn = Math.sin(time * 25) > 0;
   c.light.intensity = strobeOn ? 4.5 : 0;
   c.strobe.material.color.set(strobeOn ? '#ff2200' : '#440000');
  } else if (cycle < 2.65) {
   const dropProgress = (cycle - 2.4) / 0.25;
   yPos = c.baseY - dropProgress * (c.baseY - 1.2);
   c.light.intensity = 6.0;
   c.strobe.material.color.set('#ff0000');

   if (cycle >= 2.6 && (time - c.lastSlamTime > 1.5)) {
    c.lastSlamTime = time;
    Snd.playHydraulicSlam();
    spawnSparks(new T.Vector3(c.pos.x, 0.2, c.pos.z), new T.Vector3(0, 1, 0), 25);
    cameraShake = Math.max(cameraShake, 0.4);

    const distToCar = Math.hypot(pPos.x - c.pos.x, pPos.z - c.pos.z);
    if (distToCar < 5.0 && pPos.y < 2.5) {
     applyCarDamage(45, pPos, new T.Vector3(0, -1, 0));
     showBanner('HİDROLİK PRESE YAKALANDIN!', 'buff-sword');
     showRadioMessage('Kahretsin! Pres aracın tavanını ezdi!', 'case', 'Warning! Direct crusher impact!');
     cameraShake = 0.8;
     detachArmorPart('part_roof');
    }

    for (let ai of aiOpponents) {
     if (ai.isDead) continue;
     const aPos = ai.chassisBody.position;
     const distToAI = Math.hypot(aPos.x - c.pos.x, aPos.z - c.pos.z);
     if (distToAI < 5.0 && aPos.y < 2.5) {
      applyAIDamage(ai, 50, aPos, new T.Vector3(0, 1, 0));
      showBanner(\`\${ai.name} HİDROLİK PRESE YAKALANDI!\`, 'buff-sword');
      showRadioMessage(\`\${ai.name} presin altında kaldı, ezildi!\`, 'hennessey', 'Racer crushed by the hydraulic press!');
     }
    }
   }
  } else if (cycle < 3.1) {
   yPos = 1.2;
   c.light.intensity = 2.0;
  } else {
   const retractProgress = (cycle - 3.1) / 0.5;
   yPos = 1.2 + retractProgress * (c.baseY - 1.2);
   c.light.intensity = 0;
   c.strobe.material.color.set('#220000');
  }

  c.group.position.y = yPos;
 }
}

/* ==========================================================
   BÖLÜM 2: AÇIK HAVA KONTEYNER LİMANI (CONTAINER PORT TERMINAL)
   Kuzey Sahil Düzlüğü (X ≈ 169.0, Z = -60 .. 220)
   ========================================================== */
function createContainerYard() {
 const yardGroup = new T.Group();
 scene.add(yardGroup);

 const containerColors = ['#1b4f72', '#922b21', '#145a32', '#d68910', '#2c3e50'];
 const containerGeo20 = new T.BoxGeometry(2.6, 2.6, 6.0);
 const containerGeo40 = new T.BoxGeometry(2.6, 2.6, 12.0);

 const trackX = 169.0;
 const stackZList = [-50, -10, 30, 60, 110, 145, 180, 215];

 stackZList.forEach((sz, idx) => {
  // Yolun her iki yanına (Sol: X=154.5, Sağ: X=183.5 - Yoldan 4.5m açıkta!)
  for (let side of [-1, 1]) {
   const sx = trackX + side * 14.5;
   const stackHeight = (idx % 2 === 0) ? 3 : 2;
   const is40ft = (idx + side) % 2 === 0;
   const geo = is40ft ? containerGeo40 : containerGeo20;

   for (let h = 0; h < stackHeight; h++) {
    const colIdx = (idx * 3 + side + h) % containerColors.length;
    const cMat = new T.MeshStandardMaterial({
     color: containerColors[colIdx],
     roughness: 0.65,
     metalness: 0.4
    });

    const cMesh = new T.Mesh(geo, cMat);
    cMesh.position.set(sx, 1.3 + h * 2.6, sz + (h % 2) * 0.4);
    cMesh.castShadow = cMesh.receiveShadow = true;
    yardGroup.add(cMesh);

    // Fiziksel CANNON çarpışma gövdesi
    const halfZ = is40ft ? 6.0 : 3.0;
    const cBody = new CANNON.Body({ mass: 0, material: groundMat });
    cBody.addShape(new CANNON.Box(new CANNON.Vec3(1.3, 1.3, halfZ)));
    cBody.position.copy(cMesh.position);
    world.addBody(cBody);
   }
  }
 });

 // Yüksek Deniz Feneri / Projektör Kuleleri (Harbor Floodlight Masts)
 const mastPositions = [
  [152.0, -30.0],
  [186.0, 35.0],
  [152.0, 125.0],
  [186.0, 195.0]
 ];

 const mastMat = new T.MeshStandardMaterial({ color: '#566573', roughness: 0.7, metalness: 0.6 });
 for (let [mx, mz] of mastPositions) {
  const mast = new T.Mesh(new T.CylinderGeometry(0.3, 0.4, 18, 8), mastMat);
  mast.position.set(mx, 9.0, mz);
  mast.castShadow = true;
  yardGroup.add(mast);

  const head = new T.Mesh(new T.BoxGeometry(2.0, 0.8, 1.2), mastMat);
  head.position.set(mx, 18.0, mz);
  yardGroup.add(head);

  // Güçlü Deniz Limanı Projektörü
  const spot = new T.SpotLight('#eaf2f8', 3.2, 55, Math.PI / 4, 0.35);
  spot.position.set(mx, 17.5, mz);
  spot.target.position.set(trackX, 0, mz);
  yardGroup.add(spot);
  yardGroup.add(spot.target);
 }
}
`;

// Replace old createHangarShortcut & updateHangarCrushers block
const oldHangarFullRegex = /\/\* ==========================================================\s+GİZLİ KISAYOL: HANGAR DÖKÜMHANESİ[\s\S]*?c\.group\.position\.y = yPos;\s+\}\s+\}/;

if (oldHangarFullRegex.test(code)) {
  code = code.replace(oldHangarFullRegex, newSectionsCode);
  console.log('Replaced createHangarShortcut with createCoveredFactoryHangar & createContainerYard');
} else {
  console.error('ERROR: oldHangarFullRegex not matched!');
  process.exit(1);
}

// Replace function calls
code = code.replace('createHangarShortcut();', 'createCoveredFactoryHangar();\n createContainerYard();');

// Update radar to draw the covered factory as an amber zone
const oldRadarTrackPathRegex = /\/\/ Kısayol \(Cyan kesik çizgi\)[\s\S]*?radarCtx\.setLineDash\(\[\]\);/;
const newRadarFacilityCode = `// Üzeri Kapalı Fabrika İşletmesi (Altın Amber Vurgu)
 const facS = worldToRadar(65.5, -30.0);
 const facE = worldToRadar(65.5, 160.0);
 radarCtx.strokeStyle = 'rgba(255, 170, 68, 0.9)';
 radarCtx.lineWidth = 6;
 radarCtx.beginPath();
 radarCtx.moveTo(facS.rx, facS.ry);
 radarCtx.lineTo(facE.rx, facE.ry);
 radarCtx.stroke();

 // Konteyner Limanı (Cyan Vurgu)
 const cS = worldToRadar(169.0, -50.0);
 const cE = worldToRadar(169.0, 200.0);
 radarCtx.strokeStyle = 'rgba(0, 225, 255, 0.7)';
 radarCtx.lineWidth = 4;
 radarCtx.beginPath();
 radarCtx.moveTo(cS.rx, cS.ry);
 radarCtx.lineTo(cE.rx, cE.ry);
 radarCtx.stroke();`;

if (oldRadarTrackPathRegex.test(code)) {
  code = code.replace(oldRadarTrackPathRegex, newRadarFacilityCode);
  console.log('Updated radar representation with covered factory and container port');
}

fs.writeFileSync(GAME_JS, code, 'utf8');
console.log('Successfully wrote updated js/game.js!');
