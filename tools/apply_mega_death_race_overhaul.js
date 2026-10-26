const fs = require('fs');
const path = require('path');

console.log('--- STARTING DEATH RACE FULL FEATURE OVERHAUL ---');

// 1. UPDATE index.html
let html = fs.readFileSync('index.html', 'utf8');

// Ensure new HUD styles
const newStyles = `
  /* === YENİ ÖZELLİKLER & HUD EKLENTİLERİ === */
  #stage-display {
    display: inline-block;
    margin-top: 4px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 1.5px;
    padding: 3px 10px;
    border-radius: 4px;
    background: rgba(0,0,0,0.7);
    border: 1px solid #3498db;
    color: #5dade2;
    text-shadow: 0 1px 3px #000;
    box-shadow: 0 0 10px rgba(52,152,219,0.3);
  }
  #stage-display.stage-1 { border-color: #3498db; color: #5dade2; box-shadow: 0 0 10px rgba(52,152,219,0.4); }
  #stage-display.stage-2 { border-color: #e74c3c; color: #ff5252; box-shadow: 0 0 12px rgba(231,76,60,0.5); }
  #stage-display.stage-3 { border-color: #9b59b6; color: #e056fd; box-shadow: 0 0 16px rgba(155,89,182,0.6); }

  /* Nemesis / Rivalry Uyarısı */
  #nemesis-hud {
    position: absolute;
    top: 98px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(160, 15, 15, 0.92);
    border: 2px solid #ff2200;
    border-radius: 6px;
    padding: 5px 18px;
    color: #fff;
    font-weight: 900;
    font-size: 12px;
    letter-spacing: 1.5px;
    text-shadow: 0 1px 4px #000;
    box-shadow: 0 0 20px rgba(255, 0, 0, 0.7);
    pointer-events: none;
    z-index: 85;
    animation: nemesisPulse 0.8s infinite alternate;
  }
  @keyframes nemesisPulse {
    from { transform: translateX(-50%) scale(0.97); }
    to { transform: translateX(-50%) scale(1.03); }
  }

  /* Tombstone Arka Zırh Barı */
  #tombstone-bar {
    position: absolute;
    left: 14px;
    bottom: 50px;
    width: 170px;
    height: 16px;
    background: rgba(10,12,16,0.85);
    border: 1.5px solid rgba(255,255,255,0.3);
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.8);
    pointer-events: none;
  }
  #tombstone-fill {
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, #7f8c8d, #bdc3c7);
    transition: width 0.1s ease-out;
  }
  #tombstone-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 1px;
    color: #fff;
    text-shadow: 0 1px 3px #000;
  }

  /* Fabrika Pit Stop Bildirimi */
  #pit-hud {
    position: absolute;
    bottom: 110px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(16, 44, 25, 0.92);
    border: 2px solid #2ecc71;
    border-radius: 6px;
    padding: 6px 20px;
    color: #2ecc71;
    font-weight: 900;
    font-size: 13px;
    letter-spacing: 1.5px;
    box-shadow: 0 0 18px rgba(46, 204, 113, 0.7);
    pointer-events: none;
    z-index: 85;
  }

  /* Garaj Butonu */
  .mode-pill-btn.garage-btn {
    background: rgba(255,204,68,0.18);
    border: 1.5px solid #ffcc44;
    color: #ffcc44;
    font-weight: 900;
  }
  .mode-pill-btn.garage-btn:hover {
    background: #ffcc44;
    color: #111;
    box-shadow: 0 0 12px rgba(255,204,68,0.5);
  }
`;

if (!html.includes('#stage-display')) {
  html = html.replace('</style>', newStyles + '\n</style>');
}

// Add stage display inside #race-hud
if (!html.includes('id="stage-display"')) {
  html = html.replace(
    '<div id="time-display">',
    '<div id="stage-display" class="stage-tag stage-1">ETAP 1: SAF SÜRÜŞ & RAMMING (SİLAHLAR KİLİTLİ)</div>\n  <div id="time-display">'
  );
}

// Add Garage Button to #game-mode-hud
if (!html.includes('id="btn-open-garage"')) {
  html = html.replace(
    '<button id="btn-open-mode-modal"',
    '<button id="btn-open-garage" class="mode-pill-btn garage-btn" onclick="toggleGarage()" title="Garaj & Yükseltmeler [G]">\n    <span>🛠️</span> GARAJ [G]\n  </button>\n  <button id="btn-open-mode-modal"'
  );
}

// Add Nemesis HUD, Pit HUD, Tombstone Bar & Escape Victory Modal
const newHudElements = `
<!-- NEMESIS RAKİP KİLİTLENME UYARISI -->
<div id="nemesis-hud" style="display:none;">
  <span class="nemesis-icon">⚠️</span> <span id="nemesis-text">NEMESIS KİLİTLENDİ: M.G. JOE İNTİKAM ARIYOR!</span>
</div>

<!-- FABRİKA PİT ALANI BİLDİRİMİ -->
<div id="pit-hud" style="display:none;">
  <span>🟢</span> PİT ALANI: ONARIM & MÜHİMMAT İKMALİ YAPILIYOR...
</div>

<!-- TOMBSTONE ARKA ZIRH BARI -->
<div id="tombstone-bar"><div id="tombstone-fill"></div><span id="tombstone-text">TOMBSTONE %100 [T]</span></div>

<!-- ADADAN KAÇIŞ / İSYAN ZAFER MODALI -->
<div id="escape-victory-modal" style="position:absolute;inset:0;background:rgba(10,12,18,0.92);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:400">
  <div style="background:linear-gradient(145deg,#121824,#1c2638);border:2px solid #2ecc71;border-radius:12px;padding:32px;max-width:560px;text-align:center;color:#fff;box-shadow:0 0 50px rgba(46,204,113,0.6)">
    <div style="font-size:48px;margin-bottom:8px">🗽💥🌊</div>
    <div style="font-size:12px;font-weight:900;letter-spacing:2px;color:#2ecc71;margin-bottom:6px">TERMINAL ISLAND DİRENİŞİ ZAFERLE BİTTİ</div>
    <h2 style="font-size:28px;font-weight:900;margin:0 0 12px 0;letter-spacing:1px;color:#fff">ADADAN KAÇIŞ BAŞARILI!</h2>
    <p style="font-size:13px;line-height:1.6;color:#cbd5e0;margin-bottom:20px">
      Frankenstein cezaevi ablukasını parçaladı, Dreadnought barikatını aştı ve limandaki kargo gemisine atlayarak özgürlüğüne kavuştu!
    </p>
    <div style="font-size:17px;font-weight:900;color:#ffcc44;margin-bottom:24px">KAZANILAN ÖDÜL: +500.000 PTS & 25.000.000 İZLEYİCİ</div>
    <button onclick="location.reload()" style="background:#2ecc71;color:#111;font-weight:900;border:none;padding:12px 34px;border-radius:8px;font-size:14px;cursor:pointer;letter-spacing:1px;box-shadow:0 0 15px rgba(46,204,113,0.5)">YENİDEN BAŞLA</button>
  </div>
</div>
`;

if (!html.includes('id="nemesis-hud"')) {
  html = html.replace('<div id="armor-bar">', newHudElements + '\n<div id="armor-bar">');
}

// Add Garage Card to Start Modal
const garageStartCard = `
      <!-- 3: Weyland Atölyesi & Garaj -->
      <div class="mode-choice-card" onclick="closeModeModal(); toggleGarage();" style="border-color:rgba(255,204,68,0.5)">
        <div class="mode-choice-icon">🛠️</div>
        <div class="mode-choice-title">WEYLAND ATÖLYESİ</div>
        <div class="mode-choice-badge" style="background:#ffcc44;color:#111">ÖZELLEŞTİRME & SİLAH</div>
        <p class="mode-choice-desc">
          Yarışa başlamadan önce Frankenstein'ı 360° incele, V8 motoru güçlendir, mühimmat tipini seç, jant bıçakları ve koçbaşı tak!
        </p>
        <button class="mode-choice-btn" style="background:#ffcc44;color:#111">GARAJA GİR [G]</button>
      </div>
`;

if (!html.includes('WEYLAND ATÖLYESİ</div>')) {
  html = html.replace('</div>\n\n    <div class="mode-modal-footer">', garageStartCard + '\n    </div>\n\n    <div class="mode-modal-footer">');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html updated successfully!');
