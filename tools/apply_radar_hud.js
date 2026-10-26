const fs = require('fs');
const path = require('path');

const INDEX_HTML = path.join(__dirname, '../index.html');
const GAME_JS = path.join(__dirname, '../js/game.js');

let html = fs.readFileSync(INDEX_HTML, 'utf8');

// 1. Add CSS for radar in index.html
const radarCss = `
  /* Taktiksel Radar / Minimap HUD */
  #radar-hud {
    position: absolute;
    top: 135px;
    left: 18px;
    width: 184px;
    background: rgba(10, 14, 20, 0.85);
    border: 1.5px solid rgba(0, 225, 255, 0.45);
    border-radius: 8px;
    padding: 5px;
    box-shadow: 0 4px 18px rgba(0,0,0,0.8), inset 0 0 12px rgba(0,225,255,0.06);
    pointer-events: none;
    z-index: 10;
  }
  #radar-title {
    font-size: 8.5px;
    font-weight: 900;
    letter-spacing: 1px;
    color: #00e1ff;
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  #radar-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #2ecc71;
    box-shadow: 0 0 6px #2ecc71;
    animation: radar-blink 1s infinite alternate;
  }
  @keyframes radar-blink { 0% { opacity: 0.3; } 100% { opacity: 1; } }
  #radar-canvas {
    width: 180px;
    height: 135px;
    display: block;
    border-radius: 4px;
    background: rgba(5, 8, 12, 0.92);
  }
`;

if (!html.includes('#radar-hud')) {
  html = html.replace('</style>', radarCss + '\n</style>');
  
  const radarHtml = `
<div id="radar-hud">
  <div id="radar-title"><span id="radar-dot"></span> RADAR &middot; TERMINAL ISLAND</div>
  <canvas id="radar-canvas" width="180" height="135"></canvas>
</div>
`;
  html = html.replace('<div id="ratings-box">', radarHtml + '<div id="ratings-box">');
  fs.writeFileSync(INDEX_HTML, html, 'utf8');
  console.log('Added radar HUD to index.html');
}

// 2. Add updateRadar to game.js
let code = fs.readFileSync(GAME_JS, 'utf8');

const radarJs = `
/* ==========================================================
   TAKTİKSEL RADAR (MINIMAP) ÇİZİM SİSTEMİ
   ========================================================== */
const radarCanvas = document.getElementById('radar-canvas');
const radarCtx = radarCanvas ? radarCanvas.getContext('2d') : null;

function worldToRadar(x, z) {
 return {
  rx: 14 + ((z + 200) / 600) * 152,
  ry: 124 - ((x + 10) / 200) * 112
 };
}

function updateRadar() {
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

 // Kısayol (Cyan kesik çizgi)
 radarCtx.strokeStyle = 'rgba(0, 225, 255, 0.8)';
 radarCtx.lineWidth = 2;
 radarCtx.setLineDash([3, 2]);
 radarCtx.beginPath();
 const scStart = worldToRadar(159.2, -140.0);
 const scEnd = worldToRadar(61.8, 295.0);
 radarCtx.moveTo(scStart.rx, scStart.ry);
 radarCtx.lineTo(scEnd.rx, scEnd.ry);
 radarCtx.stroke();
 radarCtx.setLineDash([]);

 // Start/Finish Takı
 const sf = worldToRadar(0, 0);
 radarCtx.strokeStyle = '#f1c40f';
 radarCtx.lineWidth = 3;
 radarCtx.beginPath();
 radarCtx.moveTo(sf.rx - 4, sf.ry);
 radarCtx.lineTo(sf.rx + 4, sf.ry);
 radarCtx.stroke();

 // Silah / Savunma Plakaları
 for (let p of activationPlates) {
  const pr = worldToRadar(p.x, p.z);
  radarCtx.fillStyle = p.type === 'sword' ? '#ff4400' : (p.type === 'shield' ? '#00bfff' : '#9b59b6');
  radarCtx.beginPath();
  radarCtx.arc(pr.rx, pr.ry, 2, 0, Math.PI * 2);
  radarCtx.fill();
 }

 // AI Araçları (Kırmızı Blip)
 for (let ai of aiOpponents) {
  if (ai.isDead) continue;
  const ar = worldToRadar(ai.chassisBody.position.x, ai.chassisBody.position.z);
  radarCtx.fillStyle = '#e74c3c';
  radarCtx.beginPath();
  radarCtx.arc(ar.rx, ar.ry, 3, 0, Math.PI * 2);
  radarCtx.fill();
 }

 // The Dreadnought (Mor / Kuru Kafa Blip)
 if (dreadnought.isActive && !dreadnought.isDead) {
  const dr = worldToRadar(dreadnoughtBody.position.x, dreadnoughtBody.position.z);
  radarCtx.fillStyle = '#9b59b6';
  radarCtx.beginPath();
  radarCtx.arc(dr.rx, dr.ry, 4.5, 0, Math.PI * 2);
  radarCtx.fill();
 }

 // Oyuncu (Frankenstein - Yeşil Ok / Blip)
 const pr = worldToRadar(chassisBody.position.x, chassisBody.position.z);
 const fwd = new T.Vector3(0, 0, 1).applyQuaternion(carGroup.quaternion);
 const heading = Math.atan2(fwd.z, fwd.x);

 radarCtx.save();
 radarCtx.translate(pr.rx, pr.ry);
 radarCtx.rotate(-heading + Math.PI / 2);
 radarCtx.fillStyle = '#2ecc71';
 radarCtx.beginPath();
 radarCtx.moveTo(0, -5);
 radarCtx.lineTo(4, 4);
 radarCtx.lineTo(0, 2);
 radarCtx.lineTo(-4, 4);
 radarCtx.closePath();
 radarCtx.fill();
 radarCtx.restore();
}
`;

if (!code.includes('function updateRadar()')) {
  // Add updateRadar before function loop(now)
  code = code.replace('function loop(now) {', radarJs + '\nfunction loop(now) {');
  // Call updateRadar(dt) in loop
  code = code.replace('updateControls(dt);', 'updateControls(dt);\n updateRadar();');
  fs.writeFileSync(GAME_JS, code, 'utf8');
  console.log('Added updateRadar to js/game.js');
}
