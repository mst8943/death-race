const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', 'js', 'game.js');
let src = fs.readFileSync(gameJsPath, 'utf8');

console.log("Original length:", src.length);

// 1. Optimize Radar (Cache static track to offscreen canvas)
const oldRadarFn = `function updateRadar() {
 if (!radarCtx) return;
 radarCtx.clearRect(0, 0, 180, 135);

 // Pist yolu
 radarCtx.strokeStyle = 'rgba(0, 200, 255, 0.35)';
 radarCtx.lineWidth = 5;
 radarCtx.lineCap = 'round';
 radarCtx.lineJoin = 'round';
 radarCtx.beginPath();
 for (let i = 0; i <= NUM_TRACK_STEPS; i++) {
  const pt = TRACK_POINTS[i % NUM_TRACK_STEPS];
  const { rx, ry } = worldToRadar(pt.x, pt.z);
  if (i === 0) radarCtx.moveTo(rx, ry);
  else radarCtx.lineTo(rx, ry);
 }
 radarCtx.stroke();

 // İnce yarış çizgisi
 radarCtx.strokeStyle = 'rgba(255, 60, 60, 0.7)';
 radarCtx.lineWidth = 1.5;
 radarCtx.stroke();

 // Üzeri Kapalı Fabrika İşletmesi (Altın Amber Vurgu)
 const facS = worldToRadar(196.5, -90.0);
 const facE = worldToRadar(196.5, 480.0);
 radarCtx.strokeStyle = 'rgba(255, 170, 68, 0.9)';
 radarCtx.lineWidth = 6;
 radarCtx.beginPath();
 radarCtx.moveTo(facS.rx, facS.ry);
 radarCtx.lineTo(facE.rx, facE.ry);
 radarCtx.stroke();

 // Konteyner Limanı (Cyan Vurgu)
 const cS = worldToRadar(507.0, -180.0);
 const cE = worldToRadar(507.0, 650.0);
 radarCtx.strokeStyle = 'rgba(0, 225, 255, 0.7)';
 radarCtx.lineWidth = 4;
 radarCtx.beginPath();
 radarCtx.moveTo(cS.rx, cS.ry);
 radarCtx.lineTo(cE.rx, cE.ry);
 radarCtx.stroke();

 // Start/Finish Takı
 const sf = worldToRadar(0, 0);
 radarCtx.strokeStyle = '#f1c40f';
 radarCtx.lineWidth = 3;
 radarCtx.beginPath();
 radarCtx.moveTo(sf.rx - 4, sf.ry);
 radarCtx.lineTo(sf.rx + 4, sf.ry);
 radarCtx.stroke();`;

const newRadarFn = `let staticRadarCanvas = null;
function initStaticRadar() {
 staticRadarCanvas = document.createElement('canvas');
 staticRadarCanvas.width = 180;
 staticRadarCanvas.height = 135;
 const sCtx = staticRadarCanvas.getContext('2d');
 if (!sCtx) return;

 // Pist yolu
 sCtx.strokeStyle = 'rgba(0, 200, 255, 0.35)';
 sCtx.lineWidth = 5;
 sCtx.lineCap = 'round';
 sCtx.lineJoin = 'round';
 sCtx.beginPath();
 for (let i = 0; i <= NUM_TRACK_STEPS; i++) {
  const pt = TRACK_POINTS[i % NUM_TRACK_STEPS];
  const { rx, ry } = worldToRadar(pt.x, pt.z);
  if (i === 0) sCtx.moveTo(rx, ry);
  else sCtx.lineTo(rx, ry);
 }
 sCtx.stroke();

 // İnce yarış çizgisi
 sCtx.strokeStyle = 'rgba(255, 60, 60, 0.7)';
 sCtx.lineWidth = 1.5;
 sCtx.stroke();

 // Üzeri Kapalı Fabrika İşletmesi (Altın Amber Vurgu)
 const facS = worldToRadar(196.5, -90.0);
 const facE = worldToRadar(196.5, 480.0);
 sCtx.strokeStyle = 'rgba(255, 170, 68, 0.9)';
 sCtx.lineWidth = 6;
 sCtx.beginPath();
 sCtx.moveTo(facS.rx, facS.ry);
 sCtx.lineTo(facE.rx, facE.ry);
 sCtx.stroke();

 // Konteyner Limanı (Cyan Vurgu)
 const cS = worldToRadar(507.0, -180.0);
 const cE = worldToRadar(507.0, 650.0);
 sCtx.strokeStyle = 'rgba(0, 225, 255, 0.7)';
 sCtx.lineWidth = 4;
 sCtx.beginPath();
 sCtx.moveTo(cS.rx, cS.ry);
 sCtx.lineTo(cE.rx, cE.ry);
 sCtx.stroke();

 // Start/Finish Takı
 const sf = worldToRadar(0, 0);
 sCtx.strokeStyle = '#f1c40f';
 sCtx.lineWidth = 3;
 sCtx.beginPath();
 sCtx.moveTo(sf.rx - 4, sf.ry);
 sCtx.lineTo(sf.rx + 4, sf.ry);
 sCtx.stroke();
}

function updateRadar() {
 if (!radarCtx) return;
 if (!staticRadarCanvas) initStaticRadar();
 radarCtx.clearRect(0, 0, 180, 135);
 if (staticRadarCanvas) radarCtx.drawImage(staticRadarCanvas, 0, 0);`;

if (src.includes(oldRadarFn)) {
  src = src.replace(oldRadarFn, newRadarFn);
  console.log("Cached static radar path to offscreen canvas!");
} else {
  console.log("Could not find oldRadarFn!");
}

// 2. Camera Lerp Optimization (Fluid frame-rate independent camera tracking)
const oldCamLerp = ` camPos.lerp(worldTargetPos, 1 - Math.pow(0.001, dt));
 camLook.lerp(worldLookTarget, 1 - Math.pow(0.0005, dt));`;

const newCamLerp = ` const posLerp = 1 - Math.exp(-22 * dt);
 const lookLerp = 1 - Math.exp(-28 * dt);
 camPos.lerp(worldTargetPos, posLerp);
 camLook.lerp(worldLookTarget, lookLerp);`;

if (src.includes(oldCamLerp)) {
  src = src.replace(oldCamLerp, newCamLerp);
  console.log("Updated camera tracking to exponential frame-independent lerp!");
} else {
  console.log("Could not find oldCamLerp!");
}

// 3. Physics Step: Monitörün yenileme hızına (165Hz, 144Hz, 60Hz) tam uyumlu, teklemesiz fizik adımı!
const oldPhysicsStep = ` world.step(FIXED_DT, dt, 5);`;
const newPhysicsStep = ` // 165Hz / 144Hz / 60Hz monitörlerde sıfır tekleme için dinamik senkron fizik adımı
 const physicsDt = Math.min(0.02, dt);
 world.step(physicsDt);`;

if (src.includes(oldPhysicsStep)) {
  src = src.replace(oldPhysicsStep, newPhysicsStep);
  console.log("Updated physics step to dynamic per-frame step!");
} else {
  console.log("Could not find oldPhysicsStep!");
}

// 4. Raw DT Clamping (Max 33ms to prevent lag spikes from causing jumps)
src = src.replace(
  "const rawDt = Math.min(0.05, (now - last) / 1000);",
  "const rawDt = Math.min(0.033, (now - last) / 1000);"
);

fs.writeFileSync(gameJsPath, src, 'utf8');
console.log("Finished updating game.js for buttery smooth driving!");
