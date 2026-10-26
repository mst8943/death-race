const fs = require('fs');
const path = require('path');

const INDEX_HTML = path.join(__dirname, '../index.html');
const GAME_JS = path.join(__dirname, '../js/game.js');

let html = fs.readFileSync(INDEX_HTML, 'utf8');

// 1. Add CSS for Mode Modal & Top Mode Selector in index.html
const modeCss = `
  /* OYUN MODU SEÇİCİ & BAŞLATMA PENCERESİ */
  #game-mode-hud {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    background: rgba(12, 16, 24, 0.88);
    border: 1.5px solid rgba(255, 255, 255, 0.25);
    border-radius: 24px;
    padding: 3px 6px;
    gap: 4px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.8), 0 0 10px rgba(0,225,255,0.1);
    z-index: 100;
  }
  .mode-pill-btn {
    background: transparent;
    border: none;
    border-radius: 18px;
    padding: 6px 14px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.8px;
    color: #99a2b0;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .mode-pill-btn:hover {
    color: #fff;
    background: rgba(255,255,255,0.06);
  }
  .mode-pill-btn.active.combat {
    background: linear-gradient(135deg, #c0392b, #e74c3c);
    color: #fff;
    box-shadow: 0 0 12px rgba(231,76,60,0.6);
  }
  .mode-pill-btn.active.peaceful {
    background: linear-gradient(135deg, #27ae60, #2ecc71);
    color: #fff;
    box-shadow: 0 0 14px rgba(46,204,113,0.7);
  }
  .mode-pill-settings {
    background: rgba(255,255,255,0.08);
    border: none;
    border-radius: 50%;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #bbb;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }
  .mode-pill-settings:hover {
    background: rgba(255,255,255,0.2);
    color: #fff;
    transform: rotate(45deg);
  }

  /* BAŞLATMA PENCERESİ (START MODAL) */
  #mode-select-modal {
    position: absolute;
    inset: 0;
    background: rgba(6, 9, 14, 0.85);
    backdrop-filter: blur(8px);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 300;
    padding: 20px;
    animation: modal-fade-in 0.25s ease-out;
  }
  #mode-select-modal.open {
    display: flex;
  }
  @keyframes modal-fade-in {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
  }
  .mode-modal-card {
    background: linear-gradient(145deg, #101520, #18202d);
    border: 2px solid #ffcc44;
    border-radius: 14px;
    width: 100%;
    max-width: 680px;
    padding: 24px;
    box-shadow: 0 16px 50px rgba(0,0,0,0.95), 0 0 25px rgba(255,204,68,0.25);
    color: #fff;
    position: relative;
  }
  .mode-modal-tag {
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #ffcc44;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .mode-modal-title {
    font-size: 24px;
    font-weight: 900;
    letter-spacing: 1.5px;
    margin-bottom: 6px;
    color: #fff;
  }
  .mode-modal-desc {
    font-size: 12px;
    color: #a0aec0;
    margin-bottom: 20px;
    line-height: 1.4;
  }
  .mode-cards-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }
  @media(max-width: 600px) {
    .mode-cards-grid { grid-template-columns: 1fr; }
  }
  .mode-choice-card {
    background: rgba(255,255,255,0.03);
    border: 2px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    cursor: pointer;
    transition: all 0.25s;
    position: relative;
    overflow: hidden;
  }
  .mode-choice-card:hover {
    transform: translateY(-3px);
    border-color: rgba(255,255,255,0.35);
    background: rgba(255,255,255,0.06);
  }
  .mode-choice-card.recommended {
    border-color: #2ecc71;
    background: rgba(46,204,113,0.06);
  }
  .mode-choice-card.recommended:hover {
    border-color: #2ecc71;
    box-shadow: 0 0 20px rgba(46,204,113,0.3);
  }
  .mode-choice-icon {
    font-size: 36px;
    margin-bottom: 8px;
  }
  .mode-choice-title {
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 1px;
    margin-bottom: 4px;
    color: #fff;
  }
  .mode-choice-badge {
    display: inline-block;
    align-self: flex-start;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 9.5px;
    font-weight: 900;
    letter-spacing: 0.8px;
    margin-bottom: 10px;
  }
  .mode-choice-badge.combat {
    background: rgba(231,76,60,0.2);
    color: #e74c3c;
    border: 1px solid rgba(231,76,60,0.4);
  }
  .mode-choice-badge.peaceful {
    background: rgba(46,204,113,0.2);
    color: #2ecc71;
    border: 1px solid rgba(46,204,113,0.4);
  }
  .mode-choice-desc {
    font-size: 11px;
    color: #cbd5e0;
    line-height: 1.45;
    margin-bottom: 16px;
    flex-grow: 1;
  }
  .mode-choice-btn {
    width: 100%;
    border: none;
    border-radius: 6px;
    padding: 10px 0;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-combat {
    background: #c0392b;
    color: #fff;
  }
  .btn-combat:hover {
    background: #e74c3c;
    box-shadow: 0 0 12px rgba(231,76,60,0.5);
  }
  .btn-peaceful {
    background: #27ae60;
    color: #fff;
  }
  .btn-peaceful:hover {
    background: #2ecc71;
    box-shadow: 0 0 14px rgba(46,204,113,0.6);
  }
  .mode-modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 12px;
    font-size: 11px;
    color: #8892a0;
  }
  .mode-kbd {
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.25);
    border-radius: 3px;
    padding: 1px 5px;
    font-family: monospace;
    color: #ffcc44;
  }
`;

if (!html.includes('#game-mode-hud')) {
  html = html.replace('</style>', modeCss + '\n</style>');
}

// Replace ceasefire-btn with game-mode-hud
const oldCeasefireBtn = /<button id="ceasefire-btn"[\s\S]*?<\/button>/;
const newModeHud = `
<!-- OYUN MODU DEĞİŞTİRME BARI (ÜST MERKEZ) -->
<div id="game-mode-hud">
  <button id="btn-mode-deathrace" class="mode-pill-btn active combat" onclick="setGameMode('deathrace')">
    <span>💀</span> ÖLÜM YARIŞI
  </button>
  <button id="btn-mode-peaceful" class="mode-pill-btn" onclick="setGameMode('peaceful')">
    <span>🕊️</span> BARIŞÇIL TEST
  </button>
  <button id="btn-open-mode-modal" class="mode-pill-settings" onclick="openModeModal()" title="Oyun Modunu Değiştir">
    ⚙️
  </button>
</div>

<!-- OYUN BAŞLATMA / MOD SEÇİM PENCERESİ -->
<div id="mode-select-modal" class="open">
  <div class="mode-modal-card">
    <div class="mode-modal-tag">TERMINAL ISLAND ARENA</div>
    <h2 class="mode-modal-title">🏁 OYUN MODUNU SEÇİN</h2>
    <p class="mode-modal-desc">Yarışa nasıl başlamak istersiniz? Yarış esnasında üst bardan veya <kbd class="mode-kbd">P</kbd> tuşuyla anında değiştirebilirsiniz.</p>

    <div class="mode-cards-grid">
      <!-- 1: Klasik Ölüm Yarışı -->
      <div class="mode-choice-card" onclick="setGameMode('deathrace', true)">
        <div class="mode-choice-icon">💀</div>
        <div class="mode-choice-title">ÖLÜM YARIŞI</div>
        <div class="mode-choice-badge combat">TAM SAVAŞ & ELEME</div>
        <p class="mode-choice-desc">
          Tüm rakipler, minigunlar ve The Dreadnought aktiftir. Roket çatışmaları, zırh parçalanmaları ve 45 saniyelik eleme sayacı devrededir.
        </p>
        <button class="mode-choice-btn btn-combat">BU MODLA BAŞLA</button>
      </div>

      <!-- 2: Barışçıl Test & Keşif Modu -->
      <div class="mode-choice-card recommended" onclick="setGameMode('peaceful', true)">
        <div class="mode-choice-icon">🕊️</div>
        <div class="mode-choice-title">BARIŞÇIL TEST MODU</div>
        <div class="mode-choice-badge peaceful">HİÇ KİMSE VURMAZ · ÖLÜMSÜZ</div>
        <p class="mode-choice-desc">
          <b>Hiçbir araç veya kule sana ateş etmez, seni vuramaz!</b> Hasar almazsın (Ölümsüzlük). Yeni 18 virajlı pisti, virajları ve kısayolları özgürce test et.
        </p>
        <button class="mode-choice-btn btn-peaceful">BARIŞÇIL MODLA BAŞLA</button>
      </div>
    </div>

    <div class="mode-modal-footer">
      <span>🎮 İpucu: Klavye <kbd class="mode-kbd">P</kbd> tuşuyla istediğin an ateşkesi açıp kapatabilirsin.</span>
      <button onclick="closeModeModal()" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:#ccc;border-radius:4px;padding:4px 10px;font-size:11px;cursor:pointer">Kapat ✕</button>
    </div>
  </div>
</div>
`;

if (oldCeasefireBtn.test(html)) {
  html = html.replace(oldCeasefireBtn, newModeHud);
  fs.writeFileSync(INDEX_HTML, html, 'utf8');
  console.log('Replaced ceasefire button with game-mode-hud and start modal in index.html');
} else {
  console.log('ceasefire-btn not matched, checking if game-mode-hud exists');
}

// 2. Update js/game.js logic for setGameMode and AI ceasefire
let code = fs.readFileSync(GAME_JS, 'utf8');

const gameModeLogic = `
/* ==========================================================
   OYUN MODU YÖNETİCİSİ (DEATH RACE / BARIŞÇIL TEST MODU)
   ========================================================== */
let currentGameMode = 'deathrace'; // 'deathrace' veya 'peaceful'
let aiFireEnabled = true;
let godMode = false;

function setGameMode(mode, closeModal = false) {
 currentGameMode = mode;
 const btnDeath = document.getElementById('btn-mode-deathrace');
 const btnPeace = document.getElementById('btn-mode-peaceful');
 const elimHud = document.getElementById('elimination-hud');

 if (mode === 'peaceful') {
  aiFireEnabled = false;
  godMode = true;
  carHealth = 100 + (upgrades.armor - 1) * 35;

  if (btnPeace) {
   btnPeace.className = 'mode-pill-btn active peaceful';
  }
  if (btnDeath) {
   btnDeath.className = 'mode-pill-btn';
  }
  if (elimHud) {
   elimHud.innerHTML = '🕊️ BARIŞÇIL TEST MODU: <b>HİÇBİR ARAÇ VURMAZ & HASAR KAPALI</b>';
   elimHud.style.borderColor = '#2ecc71';
   elimHud.style.color = '#2ecc71';
  }

  showBanner('🕊️ BARIŞÇIL TEST MODU AKTİF! KİMSE SANA ATEŞ ETMEZ', 'buff-shield');
  showRadioMessage('Barışçıl test modu devrede Frankenstein! Kimse bize ateş açamaz, 18 virajlı pistin tadını çıkar!', 'case', 'Peaceful test drive active, all enemy fire locked!');
 } else {
  aiFireEnabled = true;
  godMode = false;

  if (btnDeath) {
   btnDeath.className = 'mode-pill-btn active combat';
  }
  if (btnPeace) {
   btnPeace.className = 'mode-pill-btn';
  }
  if (elimHud) {
   elimHud.innerHTML = '☠ ELEME SAYACI: <span id="elimination-timer">' + Math.max(0, eliminationTimer).toFixed(1) + 's</span> (SONUNCU İMHA EDİLİR!)';
   elimHud.style.borderColor = 'rgba(231,76,60,0.6)';
   elimHud.style.color = '#fff';
  }

  showBanner('💀 ÖLÜM YARIŞI AKTİF! TÜM SİLAHLAR SERBEST', 'buff-sword');
  showRadioMessage('Ölüm Yarışı başladı! Ateş serbest, arkana dikkat et Frankenstein!', 'case', 'Death Race engaged! Enemy weapons online!');
 }

 if (closeModal) closeModeModal();
}
window.setGameMode = setGameMode;

function openModeModal() {
 const m = document.getElementById('mode-select-modal');
 if (m) m.classList.add('open');
}
window.openModeModal = openModeModal;

function closeModeModal() {
 const m = document.getElementById('mode-select-modal');
 if (m) m.classList.remove('open');
}
window.closeModeModal = closeModeModal;

function toggleAIFire() {
 if (currentGameMode === 'peaceful') {
  setGameMode('deathrace');
 } else {
  setGameMode('peaceful');
 }
}
window.toggleAIFire = toggleAIFire;
`;

// Replace old toggleAIFire block
const oldTogglePattern = /\/\* ==========================================================\s+ATEŞKES & TEST MEKANİZMASI[\s\S]*?window\.toggleAIFire = toggleAIFire;/;

if (oldTogglePattern.test(code)) {
  code = code.replace(oldTogglePattern, gameModeLogic);
  console.log('Updated gameModeLogic in js/game.js');
} else {
  console.log('oldTogglePattern not matched');
}

// Ensure shootAIBullet has check for aiFireEnabled
code = code.replace(
  'function shootAIBullet(ai) {\n if (ai.isDead) return;',
  'function shootAIBullet(ai) {\n if (ai.isDead || !aiFireEnabled) return;'
);

// Ensure updateAIOpponents check for aiFireEnabled
code = code.replace(
  'if (distToPlayer < 40 && aimDot > 0.88 && carHealth > 0) {',
  'if (distToPlayer < 40 && aimDot > 0.88 && carHealth > 0 && aiFireEnabled) {'
);

// Ensure elimination timer is paused during peaceful mode
code = code.replace(
  '// Eleme Modu Sayacı Güncellemesi\n eliminationTimer -= dt;',
  '// Eleme Modu Sayacı Güncellemesi\n if (!aiFireEnabled) { return; }\n eliminationTimer -= dt;'
);

fs.writeFileSync(GAME_JS, code, 'utf8');
console.log('Successfully updated js/game.js with peaceful launcher support!');
