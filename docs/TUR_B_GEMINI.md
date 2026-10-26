# Tur B — Gemini İş Tanımı: İlerleme Sistemi

**Nasıl kullanılır:** Aşağıdaki "KOMUT" bölümünün tamamını Gemini'ye yapıştır ve şu dosyaları ekle:
- `docs/DR_API.md` (zorunlu: oyunun eklenti arayüzü)
- `index.html` (stil ve yerleşim için referans)

Gemini iki dosya üretecek: `js/progression.js` ve `css/progression.css`. Bunları repoda aynı yollara kaydedip push et. Kod incelemesini ve oyun içi testi ben yapacağım.

---

## KOMUT

Sen deneyimli bir oyun arayüzü ve JavaScript geliştiricisisin. Tarayıcıda çalışan, ileride **Steam (masaüstü, Electron/Tauri)** ve **Android (APK, WebView)** olarak paketlenecek bir Three.js yarış-savaş oyunu ("Death Race: Terminal Velocity") için **ilerleme sistemi modülü** yazmanı istiyorum.

Ekteki `DR_API.md`, oyunun eklenti arayüzünü (`window.DR`) tanımlıyor. Modülün oyuna **yalnızca bu arayüz üzerinden** bağlanacak.

### 1. Teslim edilecekler
1. `js/progression.js`: tek dosya, saf JavaScript (ES2020), harici kütüphane yok, derleme adımı yok. Tamamı bir IIFE içinde olacak. Dışarıya yalnızca `window.DRProgression` (hata ayıklama için okunabilir durum + `openProfile()`) açılacak.
2. `css/progression.css`: tüm sınıflar `drp-` önekli. Genel seçici yok (`div {}`, `button {}` gibi).

**Başka hiçbir dosyayı değiştirme.** `index.html`'de gereken yerleşim noktaları zaten var: `#sponsor-hud`, `#post-race-progress`, `#profile-root`, `#btn-profile-pause`, `#btn-profile-menu`.

### 2. Kesin kurallar
- Oyun döngüsüne bağlanma: `requestAnimationFrame` kullanma. Her şey **olaylarla** (`DR.on`) çalışacak. Gerekirse en fazla 4 Hz'lik `setInterval`. Her karede DOM'a yazma yok.
- DOM'a yalnızca **değer değiştiğinde** yaz. Kullanıcı girdisi olmadığı için `innerHTML` serbest, ama metinleri sabit şablonlardan üret.
- Kalıcı veri yalnızca `DR.storage.get/set` ile. Tek anahtar kullan: `progression`. Şemada sürüm alanı olsun (`{ v: 1, ... }`). Bozuk ya da eski veri gelirse varsayılana güvenle dönsün, asla hata fırlatmasın.
- Kredi yalnızca `DR.addCredits(amount, reason)` ile verilir. Duyuru `DR.showBanner`, telsiz `DR.showRadio` ile gösterilir.
- Garaj kilitleri `DR.lockProvider` ile uygulanır (aşağıdaki tablo).
- Tüm metinler **Türkçe**, büyük harfli başlık üslubunda, oyunun mevcut tonunda (distopik TV yayını, Weyland sponsorları).
- **Mobil ve masaüstü uyumu:** dokunmatik hedefler en az 44×44 px. 360 px genişlikte de taşmadan çalışsın. Fare hover'ına bağımlı bilgi olmasın. Profil penceresi klavyeyle (Esc kapatır, Tab/oklar) ve dokunarak kullanılabilsin.
- **Kimlikler sabit kalacak** (görev ve başarım `id`'leri). İleride Steam başarımlarına birebir eşlenecek; değiştirilmeyecek ve yeniden kullanılmayacak.
- Kodun başında kısa bir açıklama bloğu ve Türkçe yorumlar olsun.

### 3. Sponsor görevleri
- Her yarış başında (`raceStart`) havuzdan **3 farklı görev** seçilir. Barışçıl modda görev yok.
- Görev ilerlemesi olaylarla güncellenir. Tamamlanınca: `DR.showBanner('📺 SPONSOR GÖREVİ: <ad> ✓ +<kredi> PTS', 'good')`, kredi ve XP verilir.
- Yarış içi gösterim: `#sponsor-hud` içinde 3 satırlık kompakt liste (ikon, kısa ad, `2/3` ilerleme, tamamlanınca ✓). Genişlik en fazla 280 px.
- Görev havuzu (`id` · ad · koşul · kredi · XP):

| id | Ad | Koşul | Kredi | XP |
|---|---|---|---|---|
| `td_3` | KASAP | Bu yarışta 3 takedown | 40.000 | 60 |
| `td_wall` | DUVAR USTASI | 1 "wall" takedown | 35.000 | 50 |
| `td_flip` | AKROBAT | 1 "flip" takedown | 35.000 | 50 |
| `td_trap` | TUZAKÇI | 1 takedown (`trap`, `crusher` ya da `oil`) | 45.000 | 60 |
| `drift_10` | DRİFT KRALI | Toplam 10 sn drift (`driftEnd.seconds` toplamı) | 25.000 | 40 |
| `nearmiss_3` | KIL PAYI | 3 near miss | 30.000 | 45 |
| `plates_3` | SİLAHŞÖR | 3 plaka al (`platePickup`) | 20.000 | 30 |
| `rockets_2` | ROKETÇİ | 2 roket kullan (`weaponUsed` kind=`rockets`) | 20.000 | 30 |
| `clean_lap` | TEMİZ TUR | Hiç hasar almadan 1 tur (`lapComplete` arasında `playerDamaged` yok) | 40.000 | 60 |
| `top3` | PODYUM | Yarışı ilk 3'te bitir (`raceFinish.rank <= 3`) | 30.000 | 40 |
| `win` | ŞAMPİYON | Yarışı 1. bitir | 60.000 | 80 |
| `no_parts_lost` | ZIRHLI | Hiç parça kaybetmeden bitir (`partLost` yok, `raceFinish`'te kontrol) | 50.000 | 70 |

- `td_flip`, `td_wall` ve `rockets_2` 2. etaptan önce (`DR.getState().stage < 2`) yapılması zor görevler. Seçilen 3 görevden **en fazla biri** bu gruptan olsun.

### 4. XP ve seviye
- Yarış sonu XP (`raceFinish` ve `escape`):
  - Temel 100
  - Sıra bonusu: 1. → 150, 2. → 100, 3. → 60, 4. → 30, 5. → 10. `escape` 1. sayılır.
  - Takedown başına 25
  - Görev XP'leri ve başarım XP'leri
- Zorluk çarpanı (yalnızca temel + sıra + takedown kısmına): kolay ×0.8, normal ×1, zor ×1.3.
- Seviye eğrisi: seviye `n`'den `n+1`'e geçmek için `300 + (n − 1) × 150` XP. En yüksek seviye 30.
- Seviye atlayınca:
  - `DR.showBanner('⬆ SEVİYE <n>!', 'good')`
  - `DR.showRadio(...)`: yeni açılan parçaları söyler.
  - Her seviye `n × 10.000` kredi ödül.

### 5. Seviye kilitleri (`DR.lockProvider`)
Kilit metni: `'SEVİYE <n> GEREKLİ'`. Varsayılan parçalar (`classic_black, none, standard, cyan, fmj`) her zaman açık.

| Seviye | Açılanlar |
|---|---|
| 2 | skin `blood_carnage`, flame `fire` |
| 3 | decal `skull`, bumper `twin_spikes`, upgrade `engine:3`, `gun:3` |
| 4 | skin `desert_scorpion`, roof `strobe`, ammo `ap` |
| 5 | blades `ben_hur`, decal `number1`, upgrade `armor:3`, `rocket:3` |
| 6 | bumper `grate`, flame `purple`, ammo `incendiary` |
| 7 | roof `safari`, upgrade `engine:4`, `gun:4` |
| 8 | skin `weyland_enforcer`, decal `kill_marks`, ammo `acid` |
| 9 | blades `sawblade`, bumper `cowcatcher`, upgrade `armor:4`, `rocket:4` |
| 10 | roof `cage`, flame `acid`, upgrade `engine:5`, `gun:5`, `armor:5`, `rocket:5` |

Upgrade `X:2` seviyeleri her zaman açık.

**Garaj rozetleri:** `garageOpen` olayında, kilitli parçaların kart elemanına (`skin-<id>` vb.; tablo DR_API.md'de) bir rozet ekle: kartın sağ üstünde `🔒 SV <n>`, kart soluk. Yükseltmelerde `cost-<type>` metninin yanına ekle. Rozetler yeniden çağrılınca çoğalmasın.

### 6. Başarımlar
Kalıcı. Kazanılınca `DR.showBanner('🏆 BAŞARIM: <ad>', 'good')` gösterilir ve XP verilir. Sayaç gerektirenler için yaşam boyu istatistik tutulur.

| id | Ad | Koşul | XP |
|---|---|---|---|
| `first_race` | İLK KAN | İlk yarışı bitir | 50 |
| `first_win` | İLK ZAFER | İlk birincilik | 100 |
| `wins_10` | ŞAMPİYONLUK SERİSİ | 10 birincilik | 300 |
| `td_1` | İLK TAKEDOWN | İlk takedown | 50 |
| `td_50` | ARENA KASABI | Toplam 50 takedown | 300 |
| `td_200` | TERMINAL ISLAND EFSANESİ | Toplam 200 takedown | 800 |
| `td_all_types` | KOLEKSİYONCU | 12 takedown türünün her birinden en az 1 | 600 |
| `crusher` | PRES OPERATÖRÜ | 1 `crusher` takedown | 150 |
| `combo_3` | ÜÇLÜ KATLİAM | `combo >= 3` | 200 |
| `escape` | ÖZGÜRLÜK | Adadan kaç (`escape`) | 300 |
| `career_done` | KARİYER TAMAM | `careerProgress.done === true` (`raceFinish` sonrası `getState()`) | 500 |
| `hard_win` | ZORLU ZAFER | Zor zorlukta birincilik | 300 |
| `flawless` | KUSURSUZ | Hiç hasar almadan yarışı bitir | 400 |
| `drift_300` | DRİFT USTASI | Toplam 300 sn drift | 200 |
| `nearmiss_100` | ÖLÜMLE DANS | Toplam 100 near miss | 250 |
| `rich` | WEYLAND HİSSEDARI | Kredi 2.000.000'u geçsin (`getState().credits`, olaylarda kontrol) | 150 |
| `max_upgrades` | TAM DONANIM | Tüm yükseltmeler 5. seviye | 300 |
| `level_10` | KIDEMLİ | 10. seviyeye ulaş | 200 |

### 7. Profil penceresi (`#profile-root`)
- `openProfile` olayıyla açılır. Esc ya da ✕ ile kapanır. `z-index: 600`.
- Açıkken oyun duraklatılmış olmalı; bu zaten duraklatma menüsünden ya da ana menüden açılıyor. Kendin duraklatma yapma.
- Sekmeler:
  - **PROFİL:** seviye, XP çubuğu (`mevcut / gereken`), sıradaki seviyede açılacaklar.
  - **İSTATİSTİK:** toplam yarış, birincilik, podyum, toplam takedown ve türlere göre dağılımı, en iyi tur (`bestLapMs`'lerin en küçüğü), toplam drift süresi, near miss, kazanılan toplam kredi.
  - **BAŞARIMLAR:** 18 başarım; kazanılanlar renkli, kazanılmayanlar soluk ve ilerlemesiyle (ör. `37/50`).
- `ready` olayında `#btn-profile-pause` ve `#btn-profile-menu` düğmelerini görünür yap.

### 8. Yarış sonu özeti (`#post-race-progress`)
`raceFinish` ya da `escape` sonrasında doldur:
- Görevler (✓ / ✗ ve kazanılan)
- Kazanılan XP'nin dökümü (temel, sıra, takedown, görev, başarım)
- XP çubuğu (seviye atlandıysa vurgulu)
- Bu yarışta kazanılan başarımlar

Kompakt ve en fazla ~180 px yükseklikte olsun. Mobilde kaydırılabilsin.

### 9. Görsel dil
- Koyu panel (`#0d1118` – `#141a24`), altın vurgu `#ffcc44`, yeşil `#2ecc71`, kırmızı `#e74c3c`, mor kariyer `#9b59b6`. Köşe yarıçapı 6–10 px. Font `system-ui`. Başlıklar 900 kalınlıkta, harf aralığı 1–2 px.
- Animasyonlar kısa (≤ 250 ms) ve `prefers-reduced-motion` durumunda kapalı.

### 10. Kendi kendini kontrol
Dosyanın sonunda, `?progtest` URL parametresi varsa çalışan bir **test fonksiyonu** olsun:
- Sahte olaylarla (`DR.emit` ile) görev, XP, seviye atlama ve başarım akışını dener.
- Sonuçları `console.table` ile yazar.
- Testten sonra kayıtlı veriyi testten önceki hâline geri yükler.

Önce kısa bir mimari plan yaz (modüller, veri şeması, olay akışı). Sonra iki dosyanın tamamını ayrı kod bloklarında, **kısaltmadan** ver ("..." ile atlama yok).
