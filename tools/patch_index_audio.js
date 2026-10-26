const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// First remove any existing tab-pane-audio
code = code.replace(/<!-- SEKME 5: SES & MÜZİK AYARLARI -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, '');

const audioPane = `    <!-- SEKME 5: SES & MÜZİK AYARLARI -->
    <div class="tab-pane" id="tab-pane-audio">
      <div class="custom-section">
        <div class="custom-title">🔊 SES KANALLARI & AKUSTİK MİKSER</div>

        <div class="audio-row">
          <div class="audio-row-top">
            <span class="audio-label"><span>🔊</span> ANA SES (MASTER)</span>
            <span class="audio-val" id="garage-val-audio-master">85%</span>
          </div>
          <div class="audio-slider-wrap">
            <input type="range" min="0" max="100" value="85" class="audio-slider" id="garage-audio-master" oninput="setAudioVolume('master', this.value)">
          </div>
        </div>

        <div class="audio-row">
          <div class="audio-row-top">
            <span class="audio-label"><span>💥</span> EFEKT SESLERİ (SFX)</span>
            <span class="audio-val" id="garage-val-audio-sfx">90%</span>
          </div>
          <div class="audio-slider-wrap">
            <input type="range" min="0" max="100" value="90" class="audio-slider" id="garage-audio-sfx" oninput="setAudioVolume('sfx', this.value)">
          </div>
        </div>

        <div class="audio-row">
          <div class="audio-row-top">
            <span class="audio-label"><span>🏎️</span> V8 MOTOR KÜKREMESİ</span>
            <span class="audio-val" id="garage-val-audio-engine">75%</span>
          </div>
          <div class="audio-slider-wrap">
            <input type="range" min="0" max="100" value="75" class="audio-slider" id="garage-audio-engine" oninput="setAudioVolume('engine', this.value)">
          </div>
        </div>

        <div class="audio-row">
          <div class="audio-row-top">
            <span class="audio-label"><span>🎵</span> ENDÜSTRİYEL METAL MÜZİK</span>
            <span class="audio-val" id="garage-val-audio-music">65%</span>
          </div>
          <div class="audio-slider-wrap">
            <input type="range" min="0" max="100" value="65" class="audio-slider" id="garage-audio-music" oninput="setAudioVolume('music', this.value)">
          </div>
        </div>

        <div class="audio-row">
          <div class="audio-row-top">
            <span class="audio-label"><span>📻</span> TELSİZ & ANONS</span>
            <span class="audio-val" id="garage-val-audio-voice">85%</span>
          </div>
          <div class="audio-slider-wrap">
            <input type="range" min="0" max="100" value="85" class="audio-slider" id="garage-audio-voice" oninput="setAudioVolume('voice', this.value)">
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="audio-btn-sm" onclick="toggleAudioMute()" style="flex:1;padding:8px">🔇 SESİ SUSTUR / AÇ</button>
          <button class="audio-btn-sm" onclick="toggleAudioMusic()" style="flex:1;padding:8px">🎵 MÜZİK AÇ / KAPAT</button>
          <button class="audio-btn-sm" onclick="resetAudioDefaults()" style="flex:1;padding:8px">🔄 SIFIRLA</button>
        </div>
      </div>
    </div>`;

code = code.replace('<div class="garage-footer">', audioPane + '\n\n    <div class="garage-footer">');
fs.writeFileSync('index.html', code, 'utf8');
console.log('Fixed index.html, tab-pane-audio count:', (code.match(/tab-pane-audio/g) || []).length);
