const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. ADD CSS STYLES FOR GARAGE STATS AND VIEW CONTROLS
const garageCss = `
  /* Showroom & Atölye Sol Bilgi Kartı */
  #garage-stats-card{position:absolute;left:24px;top:80px;width:320px;background:rgba(12,16,24,0.85);backdrop-filter:blur(10px);border:1.5px solid rgba(255,204,68,0.45);border-radius:10px;padding:16px;color:#fff;box-shadow:0 12px 35px rgba(0,0,0,0.85);pointer-events:none;transition:all 0.3s;z-index:210}
  .stat-header{border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}
  .stat-car-name{font-size:16px;font-weight:900;letter-spacing:1.5px;color:#ffcc44}
  .stat-car-class{font-size:10px;font-weight:800;background:rgba(255,204,68,0.2);color:#ffcc44;padding:3px 7px;border-radius:4px;border:1px solid rgba(255,204,68,0.35)}
  .stat-row{margin-bottom:10px}
  .stat-row-top{display:flex;justify-content:space-between;font-size:11px;font-weight:800;margin-bottom:4px}
  .stat-name{color:#aaa}
  .stat-val{color:#fff;font-weight:900}
  .stat-bar-track{width:100%;height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)}
  .stat-bar-fill{height:100%;border-radius:4px;transition:width 0.4s cubic-bezier(0.2,0.8,0.2,1)}
  #stat-bar-speed{background:linear-gradient(90deg,#00a8ff,#00d2ff);box-shadow:0 0 8px rgba(0,210,255,0.5)}
  #stat-bar-armor{background:linear-gradient(90deg,#2ecc71,#27ae60);box-shadow:0 0 8px rgba(46,204,113,0.5)}
  #stat-bar-firepower{background:linear-gradient(90deg,#e67e22,#e74c3c);box-shadow:0 0 8px rgba(231,76,60,0.5)}
  #stat-bar-rockets{background:linear-gradient(90deg,#9b59b6,#8e44ad);box-shadow:0 0 8px rgba(155,89,182,0.5)}

  /* Alt Kontrol & Kamera Barı */
  #garage-bottom-bar{position:absolute;bottom:20px;left:24px;display:flex;gap:8px;align-items:center;z-index:210}
  .g-view-btn{background:rgba(18,22,30,0.85);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:9px 13px;font-size:11px;font-weight:800;color:#ddd;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.2s}
  .g-view-btn:hover{background:rgba(255,204,68,0.2);border-color:#ffcc44;color:#fff;transform:translateY(-2px)}
  .g-view-btn.active{background:#ffcc44;color:#111;border-color:#ffcc44;box-shadow:0 0 12px rgba(255,204,68,0.5)}
  .g-view-btn.rev-btn{background:linear-gradient(135deg,#c0392b,#e74c3c);border-color:#e74c3c;color:#fff;box-shadow:0 0 10px rgba(231,76,60,0.4)}
  .g-view-btn.rev-btn:hover{background:linear-gradient(135deg,#e74c3c,#ff5722);transform:scale(1.04)}

  /* 3D Orbit İpucu Rozeti */
  #garage-orbit-hint{position:absolute;left:24px;bottom:70px;background:rgba(0,0,0,0.65);padding:5px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);font-size:11px;font-weight:700;color:#aaa;pointer-events:none;z-index:210;display:flex;align-items:center;gap:6px}
`;

// Insert CSS
if (!html.includes('#garage-stats-card')) {
  html = html.replace('.btn-close-garage:hover{background:#ffe066}', '.btn-close-garage:hover{background:#ffe066}\n' + garageCss);
  console.log("Added garage styles to index.html.");
}

// 2. ADD STATS CARD AND BOTTOM CONTROLS TO #garage-modal
const garageElements = `
  <!-- Sol Araç Canlı İstatistik Kartı -->
  <div id="garage-stats-card">
    <div class="stat-header">
      <span class="stat-car-name">FRANKENSTEIN V8</span>
      <span class="stat-car-class">ZIRHLI GLADYATÖR</span>
    </div>
    <div class="stat-row">
      <div class="stat-row-top">
        <span class="stat-name">⚡ AZAMİ HIZ</span>
        <span class="stat-val" id="stat-val-speed">245 KM/S</span>
      </div>
      <div class="stat-bar-track"><div class="stat-bar-fill" id="stat-bar-speed" style="width:65%"></div></div>
    </div>
    <div class="stat-row">
      <div class="stat-row-top">
        <span class="stat-name">🛡️ GÖVDE ZIRHI</span>
        <span class="stat-val" id="stat-val-armor">100 HP</span>
      </div>
      <div class="stat-bar-track"><div class="stat-bar-fill" id="stat-bar-armor" style="width:42%"></div></div>
    </div>
    <div class="stat-row">
      <div class="stat-row-top">
        <span class="stat-name">🔥 ATEŞ GÜCÜ</span>
        <span class="stat-val" id="stat-val-firepower">45 DPS (.50 CAL)</span>
      </div>
      <div class="stat-bar-track"><div class="stat-bar-fill" id="stat-bar-firepower" style="width:40%"></div></div>
    </div>
    <div class="stat-row">
      <div class="stat-row-top">
        <span class="stat-name">🚀 ROKET SALVOSU</span>
        <span class="stat-val" id="stat-val-rockets">2X SALVO</span>
      </div>
      <div class="stat-bar-track"><div class="stat-bar-fill" id="stat-bar-rockets" style="width:33%"></div></div>
    </div>
    <div style="margin-top:10px;padding-top:8px;border-top:1px dashed rgba(255,255,255,0.15);font-size:10px;color:#888;display:flex;justify-content:space-between">
      <span>AĞIRLIK: 1,750 KG (AWD)</span>
      <span style="color:#2ecc71">LİFT: AKTİF</span>
    </div>
  </div>

  <!-- 3D Orbit İnceleme İpucu -->
  <div id="garage-orbit-hint">
    <span>🖱️</span>
    <span>Sol alanda fareyle basılı tutup sürükleyerek aracı 360&deg; inceleyin &middot; Tekerlekle yakınlaşın</span>
  </div>

  <!-- Alt Kamera Açısı & Test Barı -->
  <div id="garage-bottom-bar">
    <button class="g-view-btn active" id="btn-preset-overview" onclick="setGarageCameraPreset('overview')">🚗 GENEL</button>
    <button class="g-view-btn" id="btn-preset-weapons" onclick="setGarageCameraPreset('weapons')">🔫 SİLAHLAR</button>
    <button class="g-view-btn" id="btn-preset-tombstone" onclick="setGarageCameraPreset('tombstone')">🛡️ MEZAR TAŞI</button>
    <button class="g-view-btn" id="btn-preset-engine" onclick="setGarageCameraPreset('engine')">⚙️ V8 MOTOR</button>
    <button class="g-view-btn" id="btn-preset-wheels" onclick="setGarageCameraPreset('wheels')">🛞 JANT & ZIRH</button>
    <button class="g-view-btn" id="btn-turntable-toggle" onclick="toggleGarageTurntable()">🔄 DÖNDÜR: AÇIK</button>
    <button class="g-view-btn rev-btn" onclick="triggerTestEngineRev()">🔊 GAZA BAS (REV)</button>
  </div>
`;

if (!html.includes('id="garage-stats-card"')) {
  html = html.replace('<div id="garage-modal">', '<div id="garage-modal">\n' + garageElements);
  console.log("Added garageElements inside #garage-modal.");
}

fs.writeFileSync(indexPath, html);
console.log("Updated index.html successfully!");
