const fs = require('fs');
const path = require('path');

// --- 1. Update index.html ---
const htmlPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Add ceasefire button after elimination-hud
const elimTarget = `<div id="elimination-hud">
  ☠ ELEME SAYACI: <span id="elimination-timer">45.0s</span> (SONUNCU İMHA EDİLİR!)
</div>`;

const ceasefireBtn = `<div id="elimination-hud">
  ☠ ELEME SAYACI: <span id="elimination-timer">45.0s</span> (SONUNCU İMHA EDİLİR!)
</div>

<button id="ceasefire-btn" onclick="toggleAIFire()" style="position:absolute;top:16px;left:215px;background:rgba(20,24,32,0.85);border:1.5px solid rgba(255,255,255,0.35);border-radius:6px;padding:5px 14px;color:#fff;font-size:11.5px;font-weight:900;letter-spacing:1px;cursor:pointer;z-index:90;box-shadow:0 2px 10px rgba(0,0,0,0.6);transition:all 0.2s">⚔️ AI ATEŞİ: AÇIK [P]</button>`;

if (!html.includes('id="ceasefire-btn"')) {
  html = html.replace(elimTarget, ceasefireBtn);
}

// Add P and O to HUD
const hudOld = `<span class="key">G</span> Garaj &middot; 
  <span class="key">R</span> Sıfırla<br>`;
const hudNew = `<span class="key">G</span> Garaj &middot; 
  <span class="key" onclick="toggleAIFire()" style="cursor:pointer;background:#2ecc71;color:#111">P</span> Ateşkes &middot; 
  <span class="key" onclick="toggleGodMode()" style="cursor:pointer">O</span> Godmode &middot; 
  <span class="key">R</span> Sıfırla<br>`;

if (html.includes(hudOld)) {
  html = html.replace(hudOld, hudNew);
}

fs.writeFileSync(htmlPath, html, 'utf8');
console.log("Updated index.html with Ceasefire button and HUD keys.");

// --- 2. Update js/game.js ---
const gameJsPath = path.join(__dirname, '..', 'js', 'game.js');
let gameJs = fs.readFileSync(gameJsPath, 'utf8');

// Declare state & toggle functions
const toggleFns = `
/* ==========================================================
   ATEŞKES & TEST MEKANİZMASI (CEASEFIRE & GODMODE TOGGLES)
   ========================================================== */
let aiFireEnabled = true;
let godMode = false;

function toggleAIFire() {
 aiFireEnabled = !aiFireEnabled;
 const btn = document.getElementById('ceasefire-btn');
 if (btn) {
  btn.textContent = aiFireEnabled ? '⚔️ AI ATEŞİ: AÇIK [P]' : '🕊️ ATEŞKES: AÇIK (AI ATEŞİ KİLİTLİ) [P]';
  btn.style.background = aiFireEnabled ? 'rgba(20,24,32,0.85)' : 'rgba(46,204,113,0.9)';
  btn.style.borderColor = aiFireEnabled ? 'rgba(255,255,255,0.35)' : '#2ecc71';
  btn.style.color = aiFireEnabled ? '#fff' : '#111';
 }
 showBanner(aiFireEnabled ? 'AI SİLAHLARI: DEVREDE [P]' : '🕊️ ATEŞKES AKTİF! TÜM DÜŞMAN ATEŞİ KİLİTLENDİ [P]', aiFireEnabled ? 'buff-sword' : 'buff-shield');
 showRadioMessage(aiFireEnabled ? 'Düşman silah kilitleri açıldı Frankenstein! Çatışma yeniden başladı!' : 'Tüm düşman silahları kilitlendi Frankenstein! Rahatça gez ve test et!', 'case', aiFireEnabled ? 'Enemy weapons online!' : 'Ceasefire active, enemy weapons offline!');
}
window.toggleAIFire = toggleAIFire;

function toggleGodMode() {
 godMode = !godMode;
 showBanner(godMode ? '🛡️ ÖLÜMSÜZLÜK / GODMODE: AÇIK [O]' : 'ÖLÜMSÜZLÜK: KAPALI [O]', 'buff-shield');
 showRadioMessage(godMode ? 'Frankenstein hasar almaz kalkanı devrede!' : 'Normal hasar modu devrede!', 'case', godMode ? 'Godmode activated!' : 'Normal damage mode restored.');
 if (godMode) {
  carHealth = 100 + (upgrades.armor - 1) * 35;
 }
}
window.toggleGodMode = toggleGodMode;
`;

if (!gameJs.includes('function toggleAIFire()')) {
  const insertBeforeApplyDamage = `function applyCarDamage(dmg, contactPoint = null, normal = null) {`;
  gameJs = gameJs.replace(insertBeforeApplyDamage, toggleFns + '\n' + insertBeforeApplyDamage);
}

// Update applyCarDamage to respect godMode
gameJs = gameJs.replace(
  `function applyCarDamage(dmg, contactPoint = null, normal = null) {\n if (carHealth <= 0) return;`,
  `function applyCarDamage(dmg, contactPoint = null, normal = null) {\n if (carHealth <= 0 || godMode) return;`
);

// Update fireAIGun to respect aiFireEnabled
const aiGunTarget = `function fireAIGun(ai) {\n const now = performance.now();`;
const aiGunReplacement = `function fireAIGun(ai) {\n if (!aiFireEnabled) return;\n const now = performance.now();`;
if (gameJs.includes(aiGunTarget)) {
  gameJs = gameJs.replace(aiGunTarget, aiGunReplacement);
}

// Update Dreadnought to respect aiFireEnabled
gameJs = gameJs.replace(
  `if (dist < 75 && fwd.dot(new T.Vector3(toPlayer.x, toPlayer.y, toPlayer.z).normalize()) > 0.4 && carHealth > 0) {`,
  `if (dist < 75 && fwd.dot(new T.Vector3(toPlayer.x, toPlayer.y, toPlayer.z).normalize()) > 0.4 && carHealth > 0 && aiFireEnabled) {`
);

gameJs = gameJs.replace(
  `if (distToP < 14 && Math.random() < 0.2) {\n  triggerFlameJet(curPos.x + (Math.random() < 0.5 ? -3 : 3), curPos.z);`,
  `if (distToP < 14 && Math.random() < 0.2 && aiFireEnabled) {\n  triggerFlameJet(curPos.x + (Math.random() < 0.5 ? -3 : 3), curPos.z);`
);

// Update Keydown for 'p' and 'o'
const keyTarget = ` if (k === 'g') { toggleGarage(); }`;
const keyReplacement = ` if (k === 'g') { toggleGarage(); }
 if (k === 'p') { toggleAIFire(); }
 if (k === 'o') { toggleGodMode(); }`;

if (gameJs.includes(keyTarget) && !gameJs.includes(`k === 'p'`)) {
  gameJs = gameJs.replace(keyTarget, keyReplacement);
}

// Update window.__DBG
const dbgTarget = `  toggleGarageNow: () => toggleGarage(),`;
const dbgReplacement = `  aiFireEnabled,
  godMode,
  toggleAIFireNow: () => toggleAIFire(),
  toggleGodModeNow: () => toggleGodMode(),
  toggleGarageNow: () => toggleGarage(),`;

if (gameJs.includes(dbgTarget)) {
  gameJs = gameJs.replace(dbgTarget, dbgReplacement);
}

fs.writeFileSync(gameJsPath, gameJs, 'utf8');
console.log("Updated js/game.js with Ceasefire and GodMode logic.");
