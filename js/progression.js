/**
 * ============================================================================
 * DEATH RACE: TERMINAL VELOCITY — İLERLEME SİSTEMİ (js/progression.js)
 * ============================================================================
 * 
 * Bu modül oyunun seviye/XP, sponsor görevleri, kalıcı başarımlar, garaj kilitleri
 * ve profil arayüzünü yönetir.
 * 
 * Mimari İlkeler:
 * - Saf JavaScript (ES2020), harici bağımlılık yok, derleme adımı yok.
 * - Oyuna YALNIZCA `window.DR` eklenti arayüzü üzerinden bağlanır.
 * - Oyun döngüsüne (requestAnimationFrame) bağlanmaz; tamamen olay tabanlıdır (DR.on).
 * - DOM güncellemeleri yalnızca değer değiştiğinde (dirty-check) yapılır.
 * - Kalıcı veriler `DR.storage` (JSON, v:1 şeması) üzerinde tek anahtarda tutulur.
 * - Dışarıya yalnızca `window.DRProgression` nesnesi açılır.
 */

(() => {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. SABİTLER, TANIMLAR VE VERİ ŞEMALARI
  // --------------------------------------------------------------------------

  const STORAGE_KEY = 'progression';
  const SCHEMA_VERSION = 1;
  const MAX_LEVEL = 30;

  // 12 Takedown türü (DR_API sözleşmesi)
  const ALL_TAKEDOWN_TYPES = [
    'ram', 'wall', 'flip', 'gun', 'rocket', 'mine',
    'oil', 'fire', 'trap', 'crusher', 'airstrike', 'blades'
  ];

  // İstatistik ekranı için Türkçe takedown adları
  const TAKEDOWN_NAMES = {
    ram: 'ÇARPIŞMA', wall: 'DUVAR', flip: 'TAKLA', gun: 'MİNİGUN', rocket: 'ROKET', mine: 'MAYIN',
    oil: 'YAĞ', fire: 'ALEV', trap: 'TUZAK', crusher: 'PRES', airstrike: 'HAVA SALDIRISI', blades: 'JANT BIÇAĞI'
  };

  // Seviye Kilit Tablosu
  const UNLOCKS_BY_LEVEL = {
    2: [
      { kind: 'skin', id: 'blood_carnage', name: 'KAN BANYOSU DESENİ' },
      { kind: 'flame', id: 'fire', name: 'ALEV NİTRO RENGİ' }
    ],
    3: [
      { kind: 'decal', id: 'skull', name: 'KAFATASI ÇIKARTMASI' },
      { kind: 'bumper', id: 'twin_spikes', name: 'ÇİFT MAHMUZ TAMPON' },
      { kind: 'upgrade', id: 'engine:3', name: 'MOTOR SV 3' },
      { kind: 'upgrade', id: 'gun:3', name: 'SİLAH SV 3' }
    ],
    4: [
      { kind: 'skin', id: 'desert_scorpion', name: 'ÇÖL AKREBİ DESENİ' },
      { kind: 'roof', id: 'strobe', name: 'FLAŞÖR TAVAN LAMBASI' },
      { kind: 'ammo', id: 'ap', name: 'ZIRH DELİCİ (AP) MERMİ' }
    ],
    5: [
      { kind: 'blades', id: 'ben_hur', name: 'BEN-HUR MAHMUZLARI' },
      { kind: 'decal', id: 'number1', name: '1 NUMARA ÇIKARTMASI' },
      { kind: 'upgrade', id: 'armor:3', name: 'ZIRH SV 3' },
      { kind: 'upgrade', id: 'rocket:3', name: 'ROKET SV 3' }
    ],
    6: [
      { kind: 'bumper', id: 'grate', name: 'IZGARA DARBE TAMPONU' },
      { kind: 'flame', id: 'purple', name: 'MOR PLAZMA NİTRO' },
      { kind: 'ammo', id: 'incendiary', name: 'YANICI (INCENDIARY) MERMİ' }
    ],
    7: [
      { kind: 'roof', id: 'safari', name: 'SAFARİ TAVAN BARI' },
      { kind: 'upgrade', id: 'engine:4', name: 'MOTOR SV 4' },
      { kind: 'upgrade', id: 'gun:4', name: 'SİLAH SV 4' }
    ],
    8: [
      { kind: 'skin', id: 'weyland_enforcer', name: 'WEYLAND İNFAZCI DESENİ' },
      { kind: 'decal', id: 'kill_marks', name: 'LEŞ ÇENTİKLERİ' },
      { kind: 'ammo', id: 'acid', name: 'ASİT KOVANI MERMİ' }
    ],
    9: [
      { kind: 'blades', id: 'sawblade', name: 'DÖNER TESTERE BIÇAKLARI' },
      { kind: 'bumper', id: 'cowcatcher', name: 'AĞIR KOÇBAŞI TAMPON' },
      { kind: 'upgrade', id: 'armor:4', name: 'ZIRH SV 4' },
      { kind: 'upgrade', id: 'rocket:4', name: 'ROKET SV 4' }
    ],
    10: [
      { kind: 'roof', id: 'cage', name: 'KAFES ROLL-CAGE' },
      { kind: 'flame', id: 'acid', name: 'ASİT YEŞİLİ NİTRO' },
      { kind: 'upgrade', id: 'engine:5', name: 'MOTOR SV 5 (MAKS)' },
      { kind: 'upgrade', id: 'gun:5', name: 'SİLAH SV 5 (MAKS)' },
      { kind: 'upgrade', id: 'armor:5', name: 'ZIRH SV 5 (MAKS)' },
      { kind: 'upgrade', id: 'rocket:5', name: 'ROKET SV 5 (MAKS)' }
    ]
  };

  // Hızlı erişim için kilit seviyesi sözlüğü
  const REQUIRED_LEVEL_MAP = {};
  Object.keys(UNLOCKS_BY_LEVEL).forEach(lvl => {
    const levelNum = parseInt(lvl, 10);
    UNLOCKS_BY_LEVEL[levelNum].forEach(item => {
      REQUIRED_LEVEL_MAP[`${item.kind}:${item.id}`] = levelNum;
    });
  });

  // 12 Sponsor Görevi Tanımı
  const MISSION_DEFS = [
    { id: 'td_3', name: 'KASAP', desc: 'Bu yarışta 3 takedown', target: 3, credits: 40000, xp: 60, icon: '💥' },
    { id: 'td_wall', name: 'DUVAR USTASI', desc: '1 "wall" takedown', target: 1, credits: 35000, xp: 50, icon: '🧱' },
    { id: 'td_flip', name: 'AKROBAT', desc: '1 "flip" takedown', target: 1, credits: 35000, xp: 50, icon: '🔄' },
    { id: 'td_trap', name: 'TUZAKÇI', desc: '1 takedown (trap, crusher, oil)', target: 1, credits: 45000, xp: 60, icon: '🪤' },
    { id: 'drift_10', name: 'DRİFT KRALI', desc: 'Toplam 10 sn drift', target: 10, credits: 25000, xp: 40, icon: '🏎️' },
    { id: 'nearmiss_3', name: 'KIL PAYI', desc: '3 near miss', target: 3, credits: 30000, xp: 45, icon: '⚡' },
    { id: 'plates_3', name: 'SİLAHŞÖR', desc: '3 plaka al', target: 3, credits: 20000, xp: 30, icon: '🛡️' },
    { id: 'rockets_2', name: 'ROKETÇİ', desc: '2 roket kullan', target: 2, credits: 20000, xp: 30, icon: '🚀' },
    { id: 'clean_lap', name: 'TEMİZ TUR', desc: 'Hasar almadan 1 tur', target: 1, credits: 40000, xp: 60, icon: '✨' },
    { id: 'top3', name: 'PODYUM', desc: 'Yarışı ilk 3\'te bitir', target: 1, credits: 30000, xp: 40, icon: '🥉' },
    { id: 'win', name: 'ŞAMPİYON', desc: 'Yarışı 1. bitir', target: 1, credits: 60000, xp: 80, icon: '🏆' },
    { id: 'no_parts_lost', name: 'ZIRHLI', desc: 'Hiç parça kaybetmeden bitir', target: 1, credits: 50000, xp: 70, icon: '🛡️' }
  ];

  // 18 Kalıcı Başarım Tanımı
  const ACHIEVEMENT_DEFS = {
    first_race:    { id: 'first_race',    name: 'İLK KAN',                 desc: 'İlk yarışı bitir',                          xp: 50,  icon: '🏁' },
    first_win:     { id: 'first_win',     name: 'İLK ZAFER',               desc: 'İlk birincilik',                            xp: 100, icon: '🏆' },
    wins_10:       { id: 'wins_10',       name: 'ŞAMPİYONLUK SERİSİ',      desc: '10 birincilik',                             xp: 300, icon: '👑' },
    td_1:          { id: 'td_1',          name: 'İLK TAKEDOWN',            desc: 'İlk takedown',                              xp: 50,  icon: '💥' },
    td_50:         { id: 'td_50',         name: 'ARENA KASABI',            desc: 'Toplam 50 takedown',                        xp: 300, icon: '⚔️' },
    td_200:        { id: 'td_200',        name: 'TERMINAL ISLAND EFSANESİ', desc: 'Toplam 200 takedown',                       xp: 800, icon: '💀' },
    td_all_types:  { id: 'td_all_types',  name: 'KOLEKSİYONCU',            desc: '12 takedown türünün her birinden en az 1',  xp: 600, icon: '🎯' },
    crusher:       { id: 'crusher',       name: 'PRES OPERATÖRÜ',          desc: '1 crusher takedown',                        xp: 150, icon: '🚜' },
    combo_3:       { id: 'combo_3',       name: 'ÜÇLÜ KATLİAM',            desc: '3 veya üzeri kombo takedown',               xp: 200, icon: '🔥' },
    escape:        { id: 'escape',        name: 'ÖZGÜRLÜK',                desc: 'Adadan kaç (escape)',                       xp: 300, icon: '🚢' },
    career_done:   { id: 'career_done',   name: 'KARİYER TAMAM',           desc: 'Kariyer modunu bitir',                      xp: 500, icon: '🌟' },
    hard_win:      { id: 'hard_win',      name: 'ZORLU ZAFER',             desc: 'Zor zorlukta birincilik',                   xp: 300, icon: '🎖️' },
    flawless:      { id: 'flawless',      name: 'KUSURSUZ',                desc: 'Hiç hasar almadan yarışı bitir',            xp: 400, icon: '💎' },
    drift_300:     { id: 'drift_300',     name: 'DRİFT USTASI',            desc: 'Toplam 300 sn drift',                       xp: 200, icon: '🌪️' },
    nearmiss_100:  { id: 'nearmiss_100',  name: 'ÖLÜMLE DANS',             desc: 'Toplam 100 near miss',                      xp: 250, icon: '⚡' },
    rich:          { id: 'rich',          name: 'WEYLAND HİSSEDARI',       desc: 'Kredi 2.000.000\'u geçsin',                 xp: 150, icon: '💰' },
    max_upgrades:  { id: 'max_upgrades',  name: 'TAM DONANIM',             desc: 'Tüm yükseltmeler 5. seviye',                xp: 300, icon: '🛠️' },
    level_10:      { id: 'level_10',      name: 'KIDEMLİ',                 desc: '10. seviyeye ulaş',                         xp: 200, icon: '🎖️' }
  };


  // --------------------------------------------------------------------------
  // 2. KALICI DURUM YÖNETİMİ (STORAGE & SCHEMA)
  // --------------------------------------------------------------------------

  function getDefaultState() {
    const defaultAch = {};
    Object.keys(ACHIEVEMENT_DEFS).forEach(id => {
      defaultAch[id] = { unlocked: false, unlockedAt: null };
    });

    const defaultTdTypes = {};
    ALL_TAKEDOWN_TYPES.forEach(t => {
      defaultTdTypes[t] = 0;
    });

    return {
      v: SCHEMA_VERSION,
      level: 1,
      xp: 0,
      totalXp: 0,
      stats: {
        racesCompleted: 0,
        wins: 0,
        podiums: 0,
        takedowns: 0,
        takedownTypes: defaultTdTypes,
        bestLapMs: null,
        driftSeconds: 0,
        nearMisses: 0,
        totalCreditsEarned: 0,
        maxCombo: 0
      },
      achievements: defaultAch
    };
  }

  let state = getDefaultState();

  function loadState() {
    try {
      const saved = window.DR.storage.get(STORAGE_KEY, null);
      if (!saved || typeof saved !== 'object' || saved.v !== SCHEMA_VERSION) {
        state = getDefaultState();
        saveState();
        return;
      }

      // Güvenli derin birleştirme
      const def = getDefaultState();
      state = {
        v: SCHEMA_VERSION,
        level: Math.max(1, Math.min(MAX_LEVEL, Number(saved.level) || 1)),
        xp: Math.max(0, Number(saved.xp) || 0),
        totalXp: Math.max(0, Number(saved.totalXp) || 0),
        stats: {
          racesCompleted: Number(saved.stats?.racesCompleted) || 0,
          wins: Number(saved.stats?.wins) || 0,
          podiums: Number(saved.stats?.podiums) || 0,
          takedowns: Number(saved.stats?.takedowns) || 0,
          takedownTypes: Object.assign({}, def.stats.takedownTypes, saved.stats?.takedownTypes || {}),
          bestLapMs: saved.stats?.bestLapMs ? Number(saved.stats.bestLapMs) : null,
          driftSeconds: Number(saved.stats?.driftSeconds) || 0,
          nearMisses: Number(saved.stats?.nearMisses) || 0,
          totalCreditsEarned: Number(saved.stats?.totalCreditsEarned) || 0,
          maxCombo: Number(saved.stats?.maxCombo) || 0
        },
        achievements: Object.assign({}, def.achievements, saved.achievements || {})
      };
    } catch (e) {
      console.warn('[DRProgression] Kayıt okuma hatası, varsayılan yüklendi:', e);
      state = getDefaultState();
    }
  }

  function saveState() {
    try {
      window.DR.storage.set(STORAGE_KEY, state);
    } catch (e) {
      console.warn('[DRProgression] Kayıt yazma hatası:', e);
    }
  }


  // --------------------------------------------------------------------------
  // 3. SEVİYE & XP EĞRİSİ
  // --------------------------------------------------------------------------

  // Seviye n -> n+1 geçiş XP'si: 300 + (n - 1) * 150
  function getRequiredXpForLevel(lvl) {
    if (lvl >= MAX_LEVEL) return 4650;
    return 300 + (lvl - 1) * 150;
  }

  function addXp(amount, announceLevelUp = true) {
    if (amount <= 0) return { leveledUp: false, levelsGained: 0 };
    state.totalXp += amount;
    state.xp += amount;

    let levelsGained = 0;
    while (state.level < MAX_LEVEL && state.xp >= getRequiredXpForLevel(state.level)) {
      state.xp -= getRequiredXpForLevel(state.level);
      state.level++;
      levelsGained++;

      if (announceLevelUp) {
        // Seviye ödül kredisi: n * 10.000 PTS
        const awardCredits = state.level * 10000;
        window.DR.addCredits(awardCredits);
        window.DR.showBanner(`⬆ SEVİYE ${state.level}! +${window.DR.format(awardCredits)} PTS`, 'good');

        // Yeni açılan parçaları telsizden duyur
        const unlocks = UNLOCKS_BY_LEVEL[state.level];
        if (unlocks && unlocks.length > 0) {
          const names = unlocks.map(u => u.name).join(', ');
          window.DR.showRadio(`YENİ AÇILANLAR: ${names}`);
        }
      }

      if (state.level >= 10) {
        unlockAchievement('level_10');
      }
    }

    if (state.level >= MAX_LEVEL) {
      state.xp = getRequiredXpForLevel(MAX_LEVEL);
    }

    saveState();
    return { leveledUp: levelsGained > 0, levelsGained, newLevel: state.level };
  }


  // --------------------------------------------------------------------------
  // 4. GARAJ KİLİTLERİ (DR.lockProvider) & ROZETLER
  // --------------------------------------------------------------------------

  function getRequiredLevel(kind, id) {
    // Varsayılan parçalar her zaman açık
    const defaultIds = ['classic_black', 'none', 'standard', 'cyan', 'fmj'];
    if (defaultIds.includes(id)) return 1;

    // Yükseltmelerde 2. seviyeler her zaman açık
    if (kind === 'upgrade') {
      const parts = String(id).split(':');
      const targetLvl = parseInt(parts[1], 10);
      if (targetLvl <= 2) return 1;
    }

    const key = `${kind}:${id}`;
    return REQUIRED_LEVEL_MAP[key] || 1;
  }

  // Eklenti arayüzü lockProvider sözleşmesi
  window.DR.lockProvider = (kind, id) => {
    const reqLvl = getRequiredLevel(kind, id);
    if (state.level < reqLvl) {
      return `SEVİYE ${reqLvl} GEREKLİ`;
    }
    return null;
  };

  function updateGarageBadges() {
    const stateDR = window.DR.getState();
    const currentUpgrades = stateDR?.upgrades || { engine: 1, armor: 1, gun: 1, rocket: 1 };

    // Özelleştirme kartları
    const customTypes = [
      { kind: 'skin', ids: ['classic_black', 'blood_carnage', 'desert_scorpion', 'weyland_enforcer'] },
      { kind: 'decal', ids: ['none', 'skull', 'number1', 'kill_marks'] },
      { kind: 'blades', ids: ['none', 'ben_hur', 'sawblade'] },
      { kind: 'bumper', ids: ['standard', 'twin_spikes', 'cowcatcher', 'grate'] },
      { kind: 'roof', ids: ['none', 'strobe', 'safari', 'cage'] },
      { kind: 'flame', ids: ['cyan', 'fire', 'purple', 'acid'] },
      { kind: 'ammo', ids: ['fmj', 'ap', 'incendiary', 'acid'] }
    ];

    customTypes.forEach(group => {
      group.ids.forEach(id => {
        const el = document.getElementById(`${group.kind}-${id}`);
        if (!el) return;

        const reqLvl = getRequiredLevel(group.kind, id);
        const isLocked = state.level < reqLvl;
        const existingBadge = el.querySelector('.drp-garage-badge');

        if (isLocked) {
          el.classList.add('drp-garage-locked');
          if (!existingBadge) {
            const badge = document.createElement('span');
            badge.className = 'drp-garage-badge';
            badge.textContent = `🔒 SV ${reqLvl}`;
            el.appendChild(badge);
          } else {
            existingBadge.textContent = `🔒 SV ${reqLvl}`;
          }
        } else {
          el.classList.remove('drp-garage-locked');
          if (existingBadge) {
            existingBadge.remove();
          }
        }
      });
    });

    // Yükseltme butonları (lvl-<type>, cost-<type>)
    ['engine', 'armor', 'gun', 'rocket'].forEach(type => {
      const curLvl = currentUpgrades[type] || 1;
      const nextLvl = curLvl + 1;
      const costEl = document.getElementById(`cost-${type}`);
      if (!costEl) return;

      const existingBadge = costEl.querySelector('.drp-upgrade-badge');
      if (nextLvl <= 5) {
        const reqLvl = getRequiredLevel('upgrade', `${type}:${nextLvl}`);
        if (state.level < reqLvl) {
          if (!existingBadge) {
            const badge = document.createElement('span');
            badge.className = 'drp-garage-badge drp-upgrade-badge';
            badge.textContent = `🔒 SV ${reqLvl}`;
            costEl.appendChild(badge);
          } else {
            existingBadge.textContent = `🔒 SV ${reqLvl}`;
          }
        } else if (existingBadge) {
          existingBadge.remove();
        }
      } else if (existingBadge) {
        existingBadge.remove();
      }
    });
  }


  // --------------------------------------------------------------------------
  // 5. SPONSOR GÖREVLERİ
  // --------------------------------------------------------------------------

  let activeMissions = [];
  let damagedThisLap = false;
  let damagedThisRace = false;
  let partsLostThisRace = 0;
  let missionsCompletedThisRace = [];
  let lastSponsorHudHtml = '';

  function selectMissionsForRace() {
    const stage = window.DR.getState()?.stage ?? 1;
    const isHardEarly = (id) => ['td_flip', 'td_wall', 'rockets_2'].includes(id);

    // Rastgele karıştırılmış havuz
    const pool = [...MISSION_DEFS].sort(() => Math.random() - 0.5);
    const selected = [];
    let hardEarlyCount = 0;

    for (const m of pool) {
      if (stage < 2 && isHardEarly(m.id)) {
        if (hardEarlyCount >= 1) continue;
        hardEarlyCount++;
      }
      selected.push({
        ...m,
        current: 0,
        completed: false
      });
      if (selected.length === 3) break;
    }

    return selected;
  }

  function renderSponsorHud() {
    const hudContainer = document.getElementById('sponsor-hud');
    if (!hudContainer) return;

    if (!activeMissions || activeMissions.length === 0) {
      if (hudContainer.innerHTML !== '') {
        hudContainer.innerHTML = '';
        lastSponsorHudHtml = '';
      }
      return;
    }

    let itemsHtml = '';
    activeMissions.forEach(m => {
      const progText = m.completed ? '✓' : `${Math.floor(Math.min(m.current, m.target))}/${m.target}`;
      itemsHtml += `
        <div class="drp-sponsor-item ${m.completed ? 'drp-done' : ''}">
          <div class="drp-sponsor-main">
            <span class="drp-sponsor-icon">${m.icon}</span>
            <span class="drp-sponsor-name">${m.name}</span>
          </div>
          <span class="drp-sponsor-prog">${progText}</span>
        </div>`;
    });

    const fullHtml = `
      <div class="drp-sponsor-hud">
        <div class="drp-sponsor-header">📺 WEYLAND GÖREVLERİ</div>
        <div class="drp-sponsor-list">${itemsHtml}</div>
      </div>`;

    if (fullHtml !== lastSponsorHudHtml) {
      hudContainer.innerHTML = fullHtml;
      lastSponsorHudHtml = fullHtml;
    }
  }

  function checkCompleteMission(m) {
    if (m.completed) return;
    if (m.current >= m.target) {
      m.completed = true;
      missionsCompletedThisRace.push(m);
      window.DR.showBanner(`📺 SPONSOR GÖREVİ: ${m.name} ✓ +${window.DR.format(m.credits)} PTS`, 'good');
      window.DR.addCredits(m.credits); // [İnceleme düzeltmesi] ayrıca ikinci bir duyuru göstermesin
      addXp(m.xp, true);
      renderSponsorHud();
    }
  }


  // --------------------------------------------------------------------------
  // 6. BAŞARIMLAR
  // --------------------------------------------------------------------------

  let recentAchievementsThisRace = [];
  // [İnceleme düzeltmesi] Barışçıl test modunda kimse ateş etmez ve hasar kapalıdır; orada kazanılan
  // birincilik, "KUSURSUZ" başarımı, takedown sayaçları ve XP önceden sayılıyordu (kolay istismar).
  let raceCounts = false;

  function unlockAchievement(id) {
    const ach = state.achievements[id];
    if (!ach || ach.unlocked) return false;

    ach.unlocked = true;
    ach.unlockedAt = Date.now();

    const def = ACHIEVEMENT_DEFS[id];
    if (def) {
      window.DR.showBanner(`🏆 BAŞARIM: ${def.name}`, 'good');
      addXp(def.xp, true);
      recentAchievementsThisRace.push(def);
    }

    saveState();
    return true;
  }

  function checkGenericAchievements() {
    if (state.stats.racesCompleted >= 1) unlockAchievement('first_race');
    if (state.stats.wins >= 1) unlockAchievement('first_win');
    if (state.stats.wins >= 10) unlockAchievement('wins_10');
    if (state.stats.takedowns >= 1) unlockAchievement('td_1');
    if (state.stats.takedowns >= 50) unlockAchievement('td_50');
    if (state.stats.takedowns >= 200) unlockAchievement('td_200');

    // 12 takedown türü kontrolü
    const allTypesDone = ALL_TAKEDOWN_TYPES.every(t => (state.stats.takedownTypes[t] || 0) > 0);
    if (allTypesDone) unlockAchievement('td_all_types');

    if (state.stats.driftSeconds >= 300) unlockAchievement('drift_300');
    if (state.stats.nearMisses >= 100) unlockAchievement('nearmiss_100');

    const curCredits = window.DR.getState()?.credits ?? 0;
    if (curCredits >= 2000000) unlockAchievement('rich');

    const curUpgrades = window.DR.getState()?.upgrades;
    if (curUpgrades &&
        curUpgrades.engine >= 5 &&
        curUpgrades.armor >= 5 &&
        curUpgrades.gun >= 5 &&
        curUpgrades.rocket >= 5) {
      unlockAchievement('max_upgrades');
    }
  }


  // --------------------------------------------------------------------------
  // 7. YARIŞ SONU ÖZETİ (#post-race-progress)
  // --------------------------------------------------------------------------

  function renderPostRaceProgress(raceSummary) {
    const root = document.getElementById('post-race-progress');
    if (!root) return;

    const {
      baseXp,
      rankBonusXp,
      takedownXp,
      diffMultiplier,
      combatXp,
      missionsXp,
      achievementsXp,
      totalEarnedXp,
      leveledUp
    } = raceSummary;

    // Görev kartları
    let missionsHtml = '';
    if (activeMissions && activeMissions.length > 0) {
      activeMissions.forEach(m => {
        missionsHtml += `
          <div class="drp-pr-mission-card ${m.completed ? 'drp-success' : 'drp-failed'}">
            <span>${m.icon} ${m.name}</span>
            <span style="font-weight:900;">${m.completed ? `✓ +${m.xp} XP` : '✗ 0 XP'}</span>
          </div>`;
      });
    } else {
      missionsHtml = `<div class="drp-pr-mission-card"><span>GÖREV YOK (BARIŞÇIL)</span></div>`;
    }

    // Başarım rozetleri
    let achHtml = '';
    if (recentAchievementsThisRace.length > 0) {
      recentAchievementsThisRace.forEach(ach => {
        achHtml += `<span class="drp-pr-ach-badge">${ach.icon} ${ach.name} (+${ach.xp} XP)</span>`;
      });
    }

    const curLvl = state.level;
    const reqXp = getRequiredXpForLevel(curLvl);
    const xpPct = curLvl >= MAX_LEVEL ? 100 : Math.min(100, Math.round((state.xp / reqXp) * 100));

    root.innerHTML = `
      <div class="drp-post-race">
        <div class="drp-pr-section">
          <div class="drp-pr-title">
            <span>SPONSOR GÖREVLERİ</span>
            <span>+${missionsXp} XP</span>
          </div>
          <div class="drp-pr-missions-grid">${missionsHtml}</div>
        </div>

        <div class="drp-pr-section">
          <div class="drp-pr-title">
            <span>XP KAZANIMI</span>
            <span>TOPLAM: +${totalEarnedXp} XP</span>
          </div>
          <div class="drp-pr-xp-card">
            <div class="drp-pr-xp-breakdown">
              <span class="drp-pr-xp-pill">TEMEL: <span class="drp-pr-xp-pill-val">${baseXp}</span></span>
              <span class="drp-pr-xp-pill">SIRA: <span class="drp-pr-xp-pill-val">+${rankBonusXp}</span></span>
              <span class="drp-pr-xp-pill">TAKEDOWN: <span class="drp-pr-xp-pill-val">+${takedownXp}</span></span>
              <span class="drp-pr-xp-pill">ZORLUK: <span class="drp-pr-xp-pill-val">×${diffMultiplier}</span></span>
            </div>
            <div class="drp-pr-bar-wrap">
              <div class="drp-pr-bar-fill ${leveledUp ? 'drp-level-up' : ''}" style="width: ${xpPct}%;"></div>
              <div class="drp-pr-bar-text">SEVİYE ${curLvl} · ${curLvl >= MAX_LEVEL ? 'MAKSİMUM' : `${state.xp} / ${reqXp} XP`}</div>
            </div>
          </div>
        </div>

        ${recentAchievementsThisRace.length > 0 ? `
        <div class="drp-pr-section">
          <div class="drp-pr-title">KAZANILAN BAŞARIMLAR</div>
          <div class="drp-pr-achievements">${achHtml}</div>
        </div>` : ''}
      </div>`;
  }


  // --------------------------------------------------------------------------
  // 8. PROFİL PENCERESİ MODALİ (#profile-root)
  // --------------------------------------------------------------------------

  let isProfileOpen = false;
  let activeTab = 'profile'; // 'profile' | 'stats' | 'achievements'

  function openProfileModal() {
    isProfileOpen = true;
    renderProfileModal();
    // [İnceleme düzeltmesi] Yakalama aşamasında dinlenir ve olay durdurulur: önceden Esc profil ile birlikte
    // arkadaki duraklatma menüsünü de kapatıp oyunu devam ettiriyordu; ok/Enter tuşları da menüye gidiyordu.
    window.addEventListener('keydown', handleProfileKeyDown, true);
  }

  function closeProfileModal() {
    isProfileOpen = false;
    const root = document.getElementById('profile-root');
    if (root) root.innerHTML = '';
    window.removeEventListener('keydown', handleProfileKeyDown, true);
  }

  function handleProfileKeyDown(e) {
    if (!isProfileOpen) return;
    if (e.key === 'Tab') return; // odak gezinmesi tarayıcıda kalsın
    e.stopImmediatePropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      closeProfileModal();
    }
  }

  function renderProfileModal(animate = true) {
    const root = document.getElementById('profile-root');
    if (!root || !isProfileOpen) return;

    const curLvl = state.level;
    const reqXp = getRequiredXpForLevel(curLvl);
    const xpPct = curLvl >= MAX_LEVEL ? 100 : Math.min(100, Math.round((state.xp / reqXp) * 100));

    // Sıradaki seviyede açılacaklar
    let nextUnlocksText = 'Maksimum seviyeye ulaşıldı!';
    if (curLvl < MAX_LEVEL) {
      const nextUnlocks = UNLOCKS_BY_LEVEL[curLvl + 1];
      if (nextUnlocks && nextUnlocks.length > 0) {
        nextUnlocksText = nextUnlocks.map(u => u.name).join(', ');
      } else {
        nextUnlocksText = `Seviye ${curLvl + 1} Ödülü: ${window.DR.format((curLvl + 1) * 10000)} PTS Kredi`;
      }
    }

    // İstatistikler
    const st = state.stats;
    let tdTypesHtml = '';
    ALL_TAKEDOWN_TYPES.forEach(t => {
      tdTypesHtml += `
        <div class="drp-td-chip">
          <span class="drp-td-type">${TAKEDOWN_NAMES[t] || t}</span>
          <span class="drp-td-count">${st.takedownTypes[t] || 0}</span>
        </div>`;
    });

    // Başarımlar listesi
    const achKeys = Object.keys(ACHIEVEMENT_DEFS);
    let unlockedCount = 0;
    let achListHtml = '';

    achKeys.forEach(id => {
      const def = ACHIEVEMENT_DEFS[id];
      const userAch = state.achievements[id];
      const isUnlocked = userAch && userAch.unlocked;
      if (isUnlocked) unlockedCount++;

      // İlerleme metni (henüz açılmamış sayaçlar için)
      let progressStatus = '';
      if (!isUnlocked) {
        if (id === 'wins_10') progressStatus = `${Math.min(st.wins, 10)} / 10 Zafer`;
        else if (id === 'td_50') progressStatus = `${Math.min(st.takedowns, 50)} / 50 Takedown`;
        else if (id === 'td_200') progressStatus = `${Math.min(st.takedowns, 200)} / 200 Takedown`;
        else if (id === 'td_all_types') {
          const typesDone = ALL_TAKEDOWN_TYPES.filter(t => (st.takedownTypes[t] || 0) > 0).length;
          progressStatus = `${typesDone} / 12 Tür Tamamlandı`;
        } else if (id === 'drift_300') progressStatus = `${Math.round(st.driftSeconds)} / 300 sn Drift`;
        else if (id === 'nearmiss_100') progressStatus = `${st.nearMisses} / 100 Near Miss`;
        else if (id === 'level_10') progressStatus = `Seviye ${curLvl} / 10`;
      }

      achListHtml += `
        <div class="drp-ach-item ${isUnlocked ? 'drp-unlocked' : 'drp-locked'}">
          <div class="drp-ach-icon-box">${def.icon}</div>
          <div class="drp-ach-info">
            <div class="drp-ach-name-row">
              <span class="drp-ach-name">${def.name}</span>
              <span class="drp-ach-xp">+${def.xp} XP</span>
            </div>
            <div class="drp-ach-desc">${def.desc}</div>
            ${progressStatus ? `<div class="drp-ach-status">${progressStatus}</div>` : ''}
            ${isUnlocked && userAch.unlockedAt ? `<div class="drp-ach-status" style="color:#2ecc71;">✓ KAZANILDI</div>` : ''}
          </div>
        </div>`;
    });

    root.innerHTML = `
      <div class="drp-modal-backdrop${animate ? '' : ' drp-no-anim'}" id="drp-backdrop">
        <div class="drp-modal-dialog" role="dialog" aria-modal="true">
          <div class="drp-modal-header">
            <h2 class="drp-modal-title">🏆 PİLOT PROFİLİ & BAŞARIMLAR</h2>
            <button class="drp-modal-close" id="drp-btn-close" aria-label="Kapat">✕</button>
          </div>

          <div class="drp-modal-tabs">
            <button class="drp-modal-tab-btn ${activeTab === 'profile' ? 'drp-active' : ''}" data-tab="profile">👤 PROFİL</button>
            <button class="drp-modal-tab-btn ${activeTab === 'stats' ? 'drp-active' : ''}" data-tab="stats">📊 İSTATİSTİK</button>
            <button class="drp-modal-tab-btn ${activeTab === 'achievements' ? 'drp-active' : ''}" data-tab="achievements">🏆 BAŞARIMLAR (${unlockedCount}/${achKeys.length})</button>
          </div>

          <div class="drp-modal-body">
            <!-- 1. PROFİL SEKMESİ -->
            <div class="drp-tab-pane ${activeTab === 'profile' ? 'drp-active' : ''}" id="drp-tab-profile">
              <div class="drp-profile-card">
                <div class="drp-level-emblem">
                  <span class="drp-emblem-sub">SEVİYE</span>
                  <span class="drp-emblem-num">${curLvl}</span>
                </div>
                <div class="drp-profile-details">
                  <div class="drp-profile-name">FRANKENSTEIN</div>
                  <div class="drp-profile-subtitle">WEYLAND ÖLÜM YARIŞI PİLOTU</div>
                  <div class="drp-xp-track">
                    <div class="drp-xp-fill" style="width: ${xpPct}%;"></div>
                    <div class="drp-xp-text">${curLvl >= MAX_LEVEL ? 'MAKSİMUM SEVİYE' : `${state.xp} / ${reqXp} XP (${xpPct}%)`}</div>
                  </div>
                </div>
              </div>

              <div class="drp-unlock-preview-card">
                <div class="drp-unlock-title">🔓 SIRADAKİ SEVİYE KİLİT AÇILIŞLARI (SEVİYE ${curLvl < MAX_LEVEL ? curLvl + 1 : MAX_LEVEL})</div>
                <div class="drp-unlock-list">${nextUnlocksText}</div>
              </div>
            </div>

            <!-- 2. İSTATİSTİK SEKMESİ -->
            <div class="drp-tab-pane ${activeTab === 'stats' ? 'drp-active' : ''}" id="drp-tab-stats">
              <div class="drp-stats-grid">
                <div class="drp-stat-box">
                  <div class="drp-stat-val">${st.racesCompleted}</div>
                  <div class="drp-stat-lbl">Toplam Yarış</div>
                </div>
                <div class="drp-stat-box">
                  <div class="drp-stat-val">${st.wins}</div>
                  <div class="drp-stat-lbl">Birincilik</div>
                </div>
                <div class="drp-stat-box">
                  <div class="drp-stat-val">${st.podiums}</div>
                  <div class="drp-stat-lbl">Podyum</div>
                </div>
                <div class="drp-stat-box">
                  <div class="drp-stat-val">${st.takedowns}</div>
                  <div class="drp-stat-lbl">Takedown</div>
                </div>
                <div class="drp-stat-box">
                  <div class="drp-stat-val">${st.bestLapMs ? window.DR.formatTime(st.bestLapMs) : '--:--.-'}</div>
                  <div class="drp-stat-lbl">En İyi Tur</div>
                </div>
                <div class="drp-stat-box">
                  <div class="drp-stat-val">${Math.round(st.driftSeconds)} sn</div>
                  <div class="drp-stat-lbl">Drift Süresi</div>
                </div>
                <div class="drp-stat-box">
                  <div class="drp-stat-val">${st.nearMisses}</div>
                  <div class="drp-stat-lbl">Kıl Payı</div>
                </div>
                <div class="drp-stat-box">
                  <div class="drp-stat-val">${window.DR.format(st.totalCreditsEarned)}</div>
                  <div class="drp-stat-lbl">Toplam Kredi</div>
                </div>
              </div>

              <div class="drp-takedown-breakdown">
                <div class="drp-pr-title">TAKEDOWN TÜRLERİ DAĞILIMI</div>
                <div class="drp-td-grid">${tdTypesHtml}</div>
              </div>
            </div>

            <!-- 3. BAŞARIMLAR SEKMESİ -->
            <div class="drp-tab-pane ${activeTab === 'achievements' ? 'drp-active' : ''}" id="drp-tab-achievements">
              <div class="drp-ach-list">${achListHtml}</div>
            </div>
          </div>
        </div>
      </div>`;

    // Olay bağlayıcıları
    document.getElementById('drp-btn-close')?.addEventListener('click', closeProfileModal);
    document.getElementById('drp-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'drp-backdrop') closeProfileModal();
    });

    const tabBtns = root.querySelectorAll('.drp-modal-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab');
        renderProfileModal(false);
        root.querySelector(`[data-tab="${activeTab}"]`)?.focus();
      });
    });
  }


  // --------------------------------------------------------------------------
  // 9. OYUN OLAY DİNLEYİCİLERİ (DR.on)
  // --------------------------------------------------------------------------

  // A. Hazır olduğunda butonları göster ve garaj rozetlerini yenile
  window.DR.on('ready', () => {
    loadState();

    const btnPause = document.getElementById('btn-profile-pause');
    const btnMenu = document.getElementById('btn-profile-menu');
    if (btnPause) {
      btnPause.style.display = 'block';
      btnPause.onclick = () => window.DR.emit('openProfile', {});
    }
    if (btnMenu) {
      btnMenu.style.display = 'inline-block';
      btnMenu.onclick = () => window.DR.emit('openProfile', {});
    }

    updateGarageBadges();
    checkGenericAchievements();
  });

  // B. Profil açma olayı
  window.DR.on('openProfile', () => {
    openProfileModal();
  });

  // C. Garaj açıldığında rozetleri güncelle
  window.DR.on('garageOpen', () => {
    updateGarageBadges();
  });

  // D. Garajda satın alma / geliştirme yapıldığında
  window.DR.on('garagePurchase', () => {
    updateGarageBadges();
    checkGenericAchievements();
  });

  window.DR.on('garageCustomize', () => {
    updateGarageBadges();
  });

  // E. Yarış Başlangıcı: Görevleri seç ve HUD'u hazırla
  window.DR.on('raceStart', (data) => {
    damagedThisLap = false;
    damagedThisRace = false;
    partsLostThisRace = 0;
    missionsCompletedThisRace = [];
    recentAchievementsThisRace = [];

    raceCounts = data.mode !== 'peaceful';
    if (data.mode === 'peaceful') {
      activeMissions = [];
    } else {
      activeMissions = selectMissionsForRace();
    }

    renderSponsorHud();
  });

  // F. Takedown Olayı
  window.DR.on('takedown', (data) => {
    if (!raceCounts) return;
    state.stats.takedowns++;
    if (data.type && state.stats.takedownTypes[data.type] !== undefined) {
      state.stats.takedownTypes[data.type]++;
    }

    if (data.combo && data.combo > state.stats.maxCombo) {
      state.stats.maxCombo = data.combo;
    }

    // Görev ilerlemeleri
    activeMissions.forEach(m => {
      if (m.completed) return;
      if (m.id === 'td_3') {
        m.current++;
        checkCompleteMission(m);
      } else if (m.id === 'td_wall' && data.type === 'wall') {
        m.current++;
        checkCompleteMission(m);
      } else if (m.id === 'td_flip' && data.type === 'flip') {
        m.current++;
        checkCompleteMission(m);
      } else if (m.id === 'td_trap' && ['trap', 'crusher', 'oil'].includes(data.type)) {
        m.current++;
        checkCompleteMission(m);
      }
    });

    // Başarım kontrolleri
    if (data.type === 'crusher') unlockAchievement('crusher');
    if (data.combo >= 3) unlockAchievement('combo_3');
    checkGenericAchievements();
    renderSponsorHud();
  });

  // G. Drift Olayı
  window.DR.on('driftEnd', (data) => {
    if (!raceCounts) return;
    const sec = Number(data.seconds) || 0;
    state.stats.driftSeconds += sec;

    activeMissions.forEach(m => {
      if (!m.completed && m.id === 'drift_10') {
        m.current += sec; // [İnceleme düzeltmesi] yuvarlama kısa driftleri fazla sayıyordu
        checkCompleteMission(m);
      }
    });

    checkGenericAchievements();
    renderSponsorHud();
  });

  // H. Kıl Payı (Near Miss)
  window.DR.on('nearMiss', () => {
    if (!raceCounts) return;
    state.stats.nearMisses++;

    activeMissions.forEach(m => {
      if (!m.completed && m.id === 'nearmiss_3') {
        m.current++;
        checkCompleteMission(m);
      }
    });

    checkGenericAchievements();
    renderSponsorHud();
  });

  // I. Plaka Alma (Plate Pickup)
  window.DR.on('platePickup', () => {
    activeMissions.forEach(m => {
      if (!m.completed && m.id === 'plates_3') {
        m.current++;
        checkCompleteMission(m);
      }
    });
    renderSponsorHud();
  });

  // J. Silah Kullanımı
  window.DR.on('weaponUsed', (data) => {
    if (data.kind === 'rockets') {
      activeMissions.forEach(m => {
        if (!m.completed && m.id === 'rockets_2') {
          m.current++;
          checkCompleteMission(m);
        }
      });
      renderSponsorHud();
    }
  });

  // K. Oyuncu Hasar Aldı
  window.DR.on('playerDamaged', () => {
    damagedThisLap = true;
    damagedThisRace = true;
  });

  // L. Zırh Parçası Koptu
  window.DR.on('partLost', () => {
    partsLostThisRace++;
  });

  // M. Tur Tamamlandı
  window.DR.on('lapComplete', (data) => {
    if (!raceCounts) return;
    if (data.lapMs) {
      if (!state.stats.bestLapMs || data.lapMs < state.stats.bestLapMs) {
        state.stats.bestLapMs = data.lapMs;
      }
    }

    activeMissions.forEach(m => {
      if (!m.completed && m.id === 'clean_lap') {
        if (!damagedThisLap) {
          m.current = 1;
          checkCompleteMission(m);
        }
      }
    });

    damagedThisLap = false;
    renderSponsorHud();
  });

  // N. Yarış Sonu ve Kaçış Olayları
  function handleRaceCompletion(isEscape, data) {
    if (!raceCounts) {
      const root = document.getElementById('post-race-progress');
      if (root) root.innerHTML = `<div class="drp-post-race"><div class="drp-pr-title">🕊️ BARIŞÇIL TEST MODU · XP, GÖREV VE BAŞARIM KAZANILMAZ</div></div>`;
      return;
    }
    raceCounts = false; // aynı yarış iki kez sayılmasın (ör. bitişten sonra kaçış)
    state.stats.racesCompleted++;
    const rank = isEscape ? 1 : (Number(data?.rank) || 5);
    const difficulty = data?.difficulty || 'normal';
    const raceStats = data?.stats || window.DR.getRaceStats() || {};

    if (rank === 1) state.stats.wins++;
    if (rank <= 3) state.stats.podiums++;

    if (raceStats.creditsThisRace) {
      state.stats.totalCreditsEarned += raceStats.creditsThisRace;
    }
    if (raceStats.bestLapMs) {
      if (!state.stats.bestLapMs || raceStats.bestLapMs < state.stats.bestLapMs) {
        state.stats.bestLapMs = raceStats.bestLapMs;
      }
    }

    // Yarış sonu görev kontrolleri
    activeMissions.forEach(m => {
      if (m.completed) return;
      if (m.id === 'top3' && rank <= 3) {
        m.current = 1;
        checkCompleteMission(m);
      } else if (m.id === 'win' && rank === 1) {
        m.current = 1;
        checkCompleteMission(m);
      } else if (m.id === 'no_parts_lost' && partsLostThisRace === 0) {
        m.current = 1;
        checkCompleteMission(m);
      }
    });

    // XP Hesaplaması
    const baseXp = 100;
    let rankBonusXp = 0;
    if (rank === 1) rankBonusXp = 150;
    else if (rank === 2) rankBonusXp = 100;
    else if (rank === 3) rankBonusXp = 60;
    else if (rank === 4) rankBonusXp = 30;
    else if (rank === 5) rankBonusXp = 10;

    const takedownCount = raceStats.takedowns || 0;
    const takedownXp = takedownCount * 25;

    let diffMultiplier = 1.0;
    if (difficulty === 'easy') diffMultiplier = 0.8;
    else if (difficulty === 'hard') diffMultiplier = 1.3;

    const combatXp = Math.round((baseXp + rankBonusXp + takedownXp) * diffMultiplier);
    const missionsXp = missionsCompletedThisRace.reduce((sum, m) => sum + m.xp, 0);

    // Başarım kontrolleri
    if (isEscape) unlockAchievement('escape');
    if (rank === 1 && difficulty === 'hard') unlockAchievement('hard_win');
    if (!damagedThisRace) unlockAchievement('flawless');

    const curState = window.DR.getState();
    if (curState?.careerProgress?.done === true) {
      unlockAchievement('career_done');
    }

    checkGenericAchievements();

    const achievementsXp = recentAchievementsThisRace.reduce((sum, a) => sum + a.xp, 0);
    const totalEarnedXp = combatXp + missionsXp + achievementsXp;

    // XP'yi oyuncu profiline ekle
    const { leveledUp } = addXp(combatXp, true);

    saveState();

    // Yarış sonu özetini ekrana bas
    renderPostRaceProgress({
      baseXp,
      rankBonusXp,
      takedownXp,
      diffMultiplier,
      combatXp,
      missionsXp,
      achievementsXp,
      totalEarnedXp,
      leveledUp
    });
  }

  window.DR.on('raceFinish', (data) => {
    handleRaceCompletion(false, data);
  });

  window.DR.on('escape', (data) => {
    handleRaceCompletion(true, data);
  });


  // --------------------------------------------------------------------------
  // 10. DIŞA AÇILAN ARAYÜZ (window.DRProgression)
  // --------------------------------------------------------------------------

  window.DRProgression = {
    getState: () => JSON.parse(JSON.stringify(state)),
    openProfile: () => openProfileModal(),
    closeProfile: () => closeProfileModal(),
    reset: () => {
      state = getDefaultState();
      saveState();
      updateGarageBadges();
      console.log('[DRProgression] İlerleme verisi sıfırlandı.');
    },
    runSelfTest: runProgressionTest
  };


  // --------------------------------------------------------------------------
  // 11. KENDİ KENDİNİ TEST ETME FONKSİYONU (?progtest)
  // --------------------------------------------------------------------------

  function runProgressionTest() {
    console.warn('[DRProgression] KENDİ KENDİNİ TEST ETME BAŞLATILIYOR...');
    const originalBackup = window.DR.storage.get(STORAGE_KEY, null);
    const testResults = [];
    // [İnceleme düzeltmesi] Test gerçek krediyi ve duyuruları etkilemesin; yarış durumu da geri alınsın
    const realApi = { addCredits: window.DR.addCredits, showBanner: window.DR.showBanner, showRadio: window.DR.showRadio };
    const realRace = { activeMissions, raceCounts, recentAchievementsThisRace, missionsCompletedThisRace };
    window.DR.addCredits = () => {}; window.DR.showBanner = () => {}; window.DR.showRadio = () => {};
    raceCounts = true;

    function record(testName, passed, details) {
      testResults.push({
        'Test Adı': testName,
        'Durum': passed ? '✓ BAŞARILI' : '✗ HATA',
        'Detay': details
      });
    }

    try {
      // 1. Durum sıfırlama
      state = getDefaultState();

      // 2. XP ve Seviye Eğrisi Testi
      const initLvl = state.level;
      addXp(300, false); // Seviye 1 -> 2 olmalı
      record('XP & Seviye Artışı (Lvl 1 -> 2)', state.level === 2, `Seviye: ${state.level}, XP: ${state.xp}`);

      // 3. Garaj Kilit Sözleşmesi Testi
      const lock1 = window.DR.lockProvider('skin', 'blood_carnage'); // Seviye 2 parçası -> Lvl 2'de açık olmalı
      const lock2 = window.DR.lockProvider('skin', 'weyland_enforcer'); // Seviye 8 parçası -> Kilitli olmalı
      record('Garaj Kilit Sağlayıcı', lock1 === null && lock2 !== null, `blood_carnage: ${lock1}, weyland_enforcer: ${lock2}`);

      // 4. Görev Havuzu ve Seçimi Testi
      activeMissions = selectMissionsForRace();
      record('Sponsor Görev Seçimi', activeMissions.length === 3, `Seçilen görev adedi: ${activeMissions.length}`);

      // 5. Olay Entegrasyonları Testi
      window.DR.emit('takedown', { type: 'crusher', combo: 3, victim: 'TEST_BOT' });
      record('Takedown ve Başarım Tetikleme', state.stats.takedowns >= 1 && state.achievements.crusher.unlocked, 'Crusher başarımı kazanıldı');

      // 6. Drift & Near Miss Testi
      window.DR.emit('driftEnd', { seconds: 15 });
      window.DR.emit('nearMiss', { speedKmh: 120 });
      record('İstatistik Güncelleme (Drift & NearMiss)', state.stats.driftSeconds >= 15 && state.stats.nearMisses >= 1, `Drift: ${state.stats.driftSeconds}s, NM: ${state.stats.nearMisses}`);

      // 7. Yarış Sonu XP ve Özet Testi
      window.DR.emit('raceFinish', {
        rank: 1,
        difficulty: 'normal',
        stats: { takedowns: 3, bestLapMs: 45000, creditsThisRace: 100000 }
      });
      record('Yarış Sonu İşleme & Zafer', state.stats.wins >= 1 && state.stats.racesCompleted >= 1, `Zafer: ${state.stats.wins}, Toplam: ${state.stats.racesCompleted}`);

      console.table(testResults);
      console.log('%c[DRProgression] TÜM TESTLER BAŞARIYLA TAMAMLANDI!', 'color:#2ecc71; font-weight:bold; font-size:14px;');
    } catch (err) {
      console.error('[DRProgression] Test esnasında hata oluştu:', err);
    } finally {
      // Testten önceki orijinal veriyi geri yükle (önceden kayıt yoksa test verisi kalıcı oluyordu)
      window.DR.storage.set(STORAGE_KEY, originalBackup);
      loadState();
      Object.assign(window.DR, realApi);
      ({ activeMissions, raceCounts, recentAchievementsThisRace, missionsCompletedThisRace } = realRace);
      renderSponsorHud();
      updateGarageBadges();
      console.log('[DRProgression] Orijinal kullanıcı verisi geri yüklendi.');
    }
  }

  // URL parametresinde ?progtest varsa otomatik test çalıştır
  if (typeof window !== 'undefined' && window.location && window.location.search.includes('progtest')) {
    window.DR.on('ready', () => {
      setTimeout(() => {
        runProgressionTest();
      }, 500);
    });
  }

})();
