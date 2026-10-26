const fs = require('fs');
const path = require('path');

// ==========================================
// 1. UPDATE index.html
// ==========================================
const htmlPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Replace garage modal CSS
const oldGarageCss = `  /* GARAJ / YÜKSELTMELER MODALI */
  #garage-modal{position:absolute;inset:0;background:rgba(8,10,14,0.94);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:200}
  #garage-modal.open{display:flex}
  .garage-panel{width:700px;max-height:92vh;overflow-y:auto;background:linear-gradient(145deg,#121620,#1a202c);border:2px solid #ffcc44;border-radius:8px;padding:22px;box-shadow:0 12px 40px rgba(0,0,0,0.9);color:#fff}
  .garage-title{font-size:22px;font-weight:900;letter-spacing:2px;color:#ffcc44;text-transform:uppercase;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center}
  .garage-subtitle{font-size:11px;opacity:0.75;margin-bottom:14px}
  .garage-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
  .upgrade-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:10px;display:flex;flex-direction:column;gap:5px;cursor:pointer;transition:all 0.2s}
  .upgrade-card:hover{background:rgba(255,204,68,0.1);border-color:#ffcc44;transform:translateY(-2px)}
  .upgrade-head{display:flex;justify-content:space-between;font-weight:900;font-size:13px}
  .upgrade-desc{font-size:10.5px;opacity:0.8;line-height:1.3}
  .upgrade-cost{font-size:11.5px;color:#ffcc44;font-weight:800;align-self:flex-end}

  /* Skin / Boya Özelleştirme Bölümü */
  .skin-section{border-top:1px solid rgba(255,255,255,0.12);padding-top:12px;margin-bottom:14px}
  .skin-title{font-size:12px;font-weight:900;letter-spacing:1.5px;color:#ffcc44;margin-bottom:8px}
  .skin-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  .skin-card{background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px;cursor:pointer;text-align:center;transition:all 0.2s}
  .skin-card:hover{border-color:#ffcc44;transform:translateY(-2px)}
  .skin-card.active{border-color:#2ecc71;background:rgba(46,204,113,0.15);box-shadow:0 0 10px rgba(46,204,113,0.3)}
  .skin-swatch{width:100%;height:22px;border-radius:4px;margin-bottom:5px;border:1px solid rgba(0,0,0,0.5)}
  .skin-name{font-size:10px;font-weight:800;color:#fff}`;

const newGarageCss = `  /* GARAJ / YÜKSELTMELER MODALI & 3D VİTRİN */
  #garage-modal{position:absolute;inset:0;background:rgba(8,10,14,0.65);backdrop-filter:blur(3px);display:none;align-items:center;justify-content:flex-end;padding-right:24px;z-index:200}
  #garage-modal.open{display:flex}
  .garage-panel{width:560px;max-height:95vh;overflow-y:auto;background:linear-gradient(145deg,#121620,#1a202c);border:2px solid #ffcc44;border-radius:10px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,0.9);color:#fff}
  .garage-title{font-size:20px;font-weight:900;letter-spacing:2px;color:#ffcc44;text-transform:uppercase;margin-bottom:3px;display:flex;justify-content:space-between;align-items:center}
  .garage-subtitle{font-size:11px;opacity:0.75;margin-bottom:12px}

  /* Garaj Sekmeleri */
  .garage-tabs{display:flex;gap:6px;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:8px}
  .garage-tab{flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:7px 3px;font-size:10.5px;font-weight:900;color:#ccc;cursor:pointer;text-align:center;transition:all 0.2s}
  .garage-tab:hover{background:rgba(255,204,68,0.15);color:#fff}
  .garage-tab.active{background:#ffcc44;color:#111;border-color:#ffcc44;box-shadow:0 0 10px rgba(255,204,68,0.4)}

  .tab-pane{display:none}
  .tab-pane.active{display:block}

  .custom-section{margin-bottom:14px}
  .custom-title{font-size:11.5px;font-weight:900;letter-spacing:1px;color:#ffcc44;margin-bottom:6px}
  .custom-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:7px}
  .custom-card{background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.15);border-radius:6px;padding:8px;cursor:pointer;text-align:center;transition:all 0.2s}
  .custom-card:hover{border-color:#ffcc44;transform:translateY(-2px)}
  .custom-card.active{border-color:#2ecc71;background:rgba(46,204,113,0.15);box-shadow:0 0 10px rgba(46,204,113,0.3)}
  .custom-card-title{font-size:10.5px;font-weight:800;color:#fff;margin-bottom:2px}
  .custom-card-desc{font-size:9px;opacity:0.75;line-height:1.2}

  .garage-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
  .upgrade-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:10px;display:flex;flex-direction:column;gap:5px;cursor:pointer;transition:all 0.2s}
  .upgrade-card:hover{background:rgba(255,204,68,0.1);border-color:#ffcc44;transform:translateY(-2px)}
  .upgrade-head{display:flex;justify-content:space-between;font-weight:900;font-size:12.5px}
  .upgrade-desc{font-size:10px;opacity:0.8;line-height:1.3}
  .upgrade-cost{font-size:11px;color:#ffcc44;font-weight:800;align-self:flex-end}

  .skin-swatch{width:100%;height:20px;border-radius:4px;margin-bottom:4px;border:1px solid rgba(0,0,0,0.5)}`;

html = html.replace(oldGarageCss, newGarageCss);

// Replace garage modal HTML body
const oldGarageBodyStart = `<div id="garage-modal">`;
const oldGarageBodyEnd = `</div>\n\n<!-- Mobil Dokunmatik Kontroller -->`;

const newGarageBody = `<div id="garage-modal">
  <div class="garage-panel">
    <div class="garage-title">
      <span>WEYLAND MOTORWORKS &middot; ATÖLYE</span>
      <span style="font-size:14px;color:#2ecc71"><span id="garage-credits">150.000</span> PTS</span>
    </div>
    <div class="garage-subtitle">Frankenstein'ı özelleştir: boya, jant bıçakları, tamponlar, tepe lambası ve yarış kuralları!</div>

    <!-- Sekmeler -->
    <div class="garage-tabs">
      <button class="garage-tab active" id="tab-btn-paint" onclick="switchGarageTab('paint')">🎨 BOYA & GRAFİTİ</button>
      <button class="garage-tab" id="tab-btn-bodykits" onclick="switchGarageTab('bodykits')">⚙️ GÖVDE & JANTLAR</button>
      <button class="garage-tab" id="tab-btn-performance" onclick="switchGarageTab('performance')">🚀 PERFORMANS & SİLAH</button>
      <button class="garage-tab" id="tab-btn-match" onclick="switchGarageTab('match')">🏁 YARIŞ AYARLARI</button>
    </div>

    <!-- SEKME 1: BOYA & GRAFİTİ -->
    <div class="tab-pane active" id="tab-pane-paint">
      <div class="custom-section">
        <div class="custom-title">🎨 DİSTOPİK GÖVDE BOYASI (SKINS)</div>
        <div class="custom-grid">
          <div class="custom-card active" id="skin-classic_black" onclick="applyCarSkin('classic_black')">
            <div class="skin-swatch" style="background:#18181a;box-shadow:inset 0 0 4px #000"></div>
            <div class="custom-card-title">ÖLÜM MELEĞİ</div>
            <div class="custom-card-desc">Mat Titanyum Siyah</div>
          </div>
          <div class="custom-card" id="skin-blood_carnage" onclick="applyCarSkin('blood_carnage')">
            <div class="skin-swatch" style="background:linear-gradient(45deg,#8b0000,#ff2200)"></div>
            <div class="custom-card-title">KAN BANYOSU</div>
            <div class="custom-card-desc">Gore Kan Kırmızı</div>
          </div>
          <div class="custom-card" id="skin-desert_scorpion" onclick="applyCarSkin('desert_scorpion')">
            <div class="skin-swatch" style="background:linear-gradient(45deg,#7a5c29,#cba358)"></div>
            <div class="custom-card-title">ÇÖL AKREBİ</div>
            <div class="custom-card-desc">Paslı Kum Kamuflajı</div>
          </div>
          <div class="custom-card" id="skin-weyland_enforcer" onclick="applyCarSkin('weyland_enforcer')">
            <div class="skin-swatch" style="background:linear-gradient(45deg,#dcdde1,#f1c40f)"></div>
            <div class="custom-card-title">WEYLAND GÜVENLİK</div>
            <div class="custom-card-desc">Platin & İkaz Şeridi</div>
          </div>
        </div>
      </div>

      <div class="custom-section">
        <div class="custom-title">☠️ YARIŞ GRAFİTİSİ & ÇIKARTMALAR (LIVERY)</div>
        <div class="custom-grid">
          <div class="custom-card active" id="decal-none" onclick="applyDecal('none')">
            <div class="custom-card-title">SADE</div>
            <div class="custom-card-desc">Çıkartmasız metal gövde</div>
          </div>
          <div class="custom-card" id="decal-skull" onclick="applyDecal('skull')">
            <div class="custom-card-title">KURUKAFALIK</div>
            <div class="custom-card-desc">Kaputta kurukafa & kemik</div>
          </div>
          <div class="custom-card" id="decal-number1" onclick="applyDecal('number1')">
            <div class="custom-card-title">#1 FRANKENSTEIN</div>
            <div class="custom-card-desc">Yarış no & cezaevi barkodu</div>
          </div>
          <div class="custom-card" id="decal-kill_marks" onclick="applyDecal('kill_marks')">
            <div class="custom-card-title">KAN ÇENTİKLERİ</div>
            <div class="custom-card-desc">Kapıda av çentikleri</div>
          </div>
        </div>
      </div>
    </div>

    <!-- SEKME 2: GÖVDE & JANTLAR -->
    <div class="tab-pane" id="tab-pane-bodykits">
      <div class="custom-section">
        <div class="custom-title">⚔️ DÖNEN JANT BIÇAKLARI (WHEEL GRINDERS)</div>
        <div class="custom-grid">
          <div class="custom-card active" id="blades-none" onclick="applyWheelBlades('none')">
            <div class="custom-card-title">STANDART JANT</div>
            <div class="custom-card-desc">Bıçaksız jant kapağı</div>
          </div>
          <div class="custom-card" id="blades-ben_hur" onclick="applyWheelBlades('ben_hur')">
            <div class="custom-card-title">BEN-HUR ÇELİK BIÇAK</div>
            <div class="custom-card-desc">Yan sürtmede zırh doğrar!</div>
          </div>
          <div class="custom-card" id="blades-sawblade" onclick="applyWheelBlades('sawblade')">
            <div class="custom-card-title">ROTARY TESTERE</div>
            <div class="custom-card-desc">Dişli daire testere jantı</div>
          </div>
        </div>
      </div>

      <div class="custom-section">
        <div class="custom-title">🛡️ ÖN TAMPON / MAHMUZ KİTİ (BUMPERS)</div>
        <div class="custom-grid">
          <div class="custom-card active" id="bumper-standard" onclick="applyBumperKit('standard')">
            <div class="custom-card-title">STANDART IZGARA</div>
            <div class="custom-card-desc">Klasik çelik burun</div>
          </div>
          <div class="custom-card" id="bumper-twin_spikes" onclick="applyBumperKit('twin_spikes')">
            <div class="custom-card-title">ÇİFT SİVRİ MIZRAK</div>
            <div class="custom-card-desc">+%40 önden delme hasarı</div>
          </div>
          <div class="custom-card" id="bumper-cowcatcher" onclick="applyBumperKit('cowcatcher')">
            <div class="custom-card-title">TİTANYUM V-KOÇBAŞI</div>
            <div class="custom-card-desc">Ağır kaza direnci</div>
          </div>
          <div class="custom-card" id="bumper-grate" onclick="applyBumperKit('grate')">
            <div class="custom-card-title">YIKIM KAFESİ</div>
            <div class="custom-card-desc">Kafesli çelik bariyer</div>
          </div>
        </div>
      </div>

      <div class="custom-section">
        <div class="custom-title">🚨 TAVAN EKLENTİSİ (ROOF KITS)</div>
        <div class="custom-grid">
          <div class="custom-card active" id="roof-none" onclick="applyRoofKit('none')">
            <div class="custom-card-title">STANDART TAVAN</div>
            <div class="custom-card-desc">Sade tavan</div>
          </div>
          <div class="custom-card" id="roof-strobe" onclick="applyRoofKit('strobe')">
            <div class="custom-card-title">CEZAEVİ TEPE LAMBASI</div>
            <div class="custom-card-desc">Dönen mavi/kırmızı flaşör</div>
          </div>
          <div class="custom-card" id="roof-safari" onclick="applyRoofKit('safari')">
            <div class="custom-card-title">SAFARI LED BAR</div>
            <div class="custom-card-desc">Dörtlü güçlü projektör</div>
          </div>
          <div class="custom-card" id="roof-cage" onclick="applyRoofKit('cage')">
            <div class="custom-card-title">TAVAN KAFESİ</div>
            <div class="custom-card-desc">Takla koruma demiri</div>
          </div>
        </div>
      </div>

      <div class="custom-section">
        <div class="custom-title">🔥 NİTRO ALEV RENGİ (NITRO FLAMES)</div>
        <div class="custom-grid">
          <div class="custom-card active" id="flame-cyan" onclick="applyNitroFlame('cyan')">
            <div class="custom-card-title" style="color:#00e1ff">NEON CYAN</div>
            <div class="custom-card-desc">Standart mavi alev</div>
          </div>
          <div class="custom-card" id="flame-fire" onclick="applyNitroFlame('fire')">
            <div class="custom-card-title" style="color:#ff4400">CEHENNEM ATEŞİ</div>
            <div class="custom-card-desc">Kızıl kor alev</div>
          </div>
          <div class="custom-card" id="flame-purple" onclick="applyNitroFlame('purple')">
            <div class="custom-card-title" style="color:#b026ff">PLAZMA MORU</div>
            <div class="custom-card-desc">Yüksek oktanlı mor</div>
          </div>
          <div class="custom-card" id="flame-acid" onclick="applyNitroFlame('acid')">
            <div class="custom-card-title" style="color:#2ecc71">TOKSİK YEŞİL</div>
            <div class="custom-card-desc">Radyoaktif asit</div>
          </div>
        </div>
      </div>
    </div>

    <!-- SEKME 3: PERFORMANS & SİLAHLAR -->
    <div class="tab-pane" id="tab-pane-performance">
      <div class="garage-grid">
        <div class="upgrade-card" onclick="upgradeItem('engine')">
          <div class="upgrade-head"><span>⚡ SUPERCHARGED V8 MOTOR</span><span id="lvl-engine">SEVİYE 1/3</span></div>
          <div class="upgrade-desc">Maksimum gücü ve Nitro son hızını (130 km/s) artırır.</div>
          <div class="upgrade-cost" id="cost-engine">50.000 PTS</div>
        </div>
        <div class="upgrade-card" onclick="upgradeItem('armor')">
          <div class="upgrade-head"><span>🛡️ TİTANYUM KOÇBAŞI & ZIRH</span><span id="lvl-armor">SEVİYE 1/3</span></div>
          <div class="upgrade-desc">Maksimum zırhı 175 HP'ye çıkarır ve ön tampona çelik koçbaşı ekler.</div>
          <div class="upgrade-cost" id="cost-armor">60.000 PTS</div>
        </div>
        <div class="upgrade-card" onclick="upgradeItem('gun')">
          <div class="upgrade-head"><span>🔥 .50 CAL ALEVLİ MİNİGUN</span><span id="lvl-gun">SEVİYE 1/3</span></div>
          <div class="upgrade-desc">Mermi kalibresini büyütür, zırh delen alevli mermiler sıkar!</div>
          <div class="upgrade-cost" id="cost-gun">55.000 PTS</div>
        </div>
        <div class="upgrade-card" onclick="upgradeItem('rocket')">
          <div class="upgrade-head"><span>🚀 ÇİFTLİ SALVO ROKET</span><span id="lvl-rocket">SEVİYE 1/3</span></div>
          <div class="upgrade-desc">Aynı anda 2 güdümlü küme roketi fırlatır!</div>
          <div class="upgrade-cost" id="cost-rocket">75.000 PTS</div>
        </div>
      </div>

      <div class="custom-section">
        <div class="custom-title">🎯 MİNİGUN MÜHİMMAT TİPİ (AMMO TYPES)</div>
        <div class="custom-grid">
          <div class="custom-card active" id="ammo-fmj" onclick="applyAmmoType('fmj')">
            <div class="custom-card-title">.50 CAL FMJ</div>
            <div class="custom-card-desc">Standart yüksek hız</div>
          </div>
          <div class="custom-card" id="ammo-ap" onclick="applyAmmoType('ap')">
            <div class="custom-card-title">ZIRH DELİCİ AP</div>
            <div class="custom-card-desc">Zırh söker (+%40)</div>
          </div>
          <div class="custom-card" id="ammo-incendiary" onclick="applyAmmoType('incendiary')">
            <div class="custom-card-title">ALEVLİ İZLİ</div>
            <div class="custom-card-desc">Hedefi tutuşturur</div>
          </div>
          <div class="custom-card" id="ammo-acid" onclick="applyAmmoType('acid')">
            <div class="custom-card-title">TOKSİK ASİT</div>
            <div class="custom-card-desc">Hedefi yavaşlatır</div>
          </div>
        </div>
      </div>
    </div>

    <!-- SEKME 4: YARIŞ AYARLARI -->
    <div class="tab-pane" id="tab-pane-match">
      <div class="custom-section">
        <div class="custom-title">🤖 AI SALDIRGANLIK DÜZEYİ</div>
        <div class="custom-grid">
          <div class="custom-card active" id="ai-agg-normal" onclick="applyMatchSetting('aiAggression', 'normal')">
            <div class="custom-card-title">STANDART YARIŞ</div>
            <div class="custom-card-desc">Dengeli taktiksel sürüş</div>
          </div>
          <div class="custom-card" id="ai-agg-brutal" onclick="applyMatchSetting('aiAggression', 'brutal')">
            <div class="custom-card-title" style="color:#ff3300">VAHŞİ KATLİAM</div>
            <div class="custom-card-desc">Sürekli sıkıştırma & ramming!</div>
          </div>
        </div>
      </div>

      <div class="custom-section">
        <div class="custom-title">⏱️ ELEME SAYACI MODU</div>
        <div class="custom-grid">
          <div class="custom-card active" id="elim-45s" onclick="applyMatchSetting('elimination', '45s')">
            <div class="custom-card-title">STANDART (45s)</div>
            <div class="custom-card-desc">Her 45 sn'de sonuncu elenir</div>
          </div>
          <div class="custom-card" id="elim-30s" onclick="applyMatchSetting('elimination', '30s')">
            <div class="custom-card-title">HIZLI (30s)</div>
            <div class="custom-card-desc">Hızlı tempolu katliam</div>
          </div>
          <div class="custom-card" id="elim-off" onclick="applyMatchSetting('elimination', 'off')">
            <div class="custom-card-title">KAPALI</div>
            <div class="custom-card-desc">Sadece tur yarışı</div>
          </div>
        </div>
      </div>

      <div class="custom-section">
        <div class="custom-title">🛠️ TEST & HİLE MODLARI</div>
        <div class="custom-grid">
          <div class="custom-card" id="cheat-ceasefire" onclick="toggleAIFire()">
            <div class="custom-card-title">ATEŞKES [P]</div>
            <div class="custom-card-desc">AI ateşini kapat / aç</div>
          </div>
          <div class="custom-card" id="cheat-godmode" onclick="toggleGodMode()">
            <div class="custom-card-title">ÖLÜMSÜZLÜK [O]</div>
            <div class="custom-card-desc">Hasar almayı kapat / aç</div>
          </div>
        </div>
      </div>
    </div>

    <div class="garage-footer">
      <div style="font-size:11px;opacity:0.8"><span class="key">G</span> ile piste dönün. Sol alanda arabayı fareyle 360° döndürebilirsiniz.</div>
      <button class="btn-close-garage" onclick="toggleGarage()">PİSTE DÖN [G]</button>
    </div>
  </div>
</div>\n\n<!-- Mobil Dokunmatik Kontroller -->`;

const modalStartIdx = html.indexOf(oldGarageBodyStart);
const modalEndIdx = html.indexOf(oldGarageBodyEnd, modalStartIdx);
if (modalStartIdx !== -1 && modalEndIdx !== -1) {
  html = html.slice(0, modalStartIdx) + newGarageBody + html.slice(modalEndIdx + oldGarageBodyEnd.length);
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log("Successfully updated index.html with tabbed customization garage!");
} else {
  console.error("Could not find garage modal in index.html!");
}
