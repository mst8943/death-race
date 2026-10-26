# DR — Eklenti Arayüzü (window.DR)

Ayrı dosyalardaki modüller (ör. `js/progression.js`) oyunun ana koduna (`js/game.js`) dokunmadan **yalnızca bu arayüz üzerinden** bağlanır.

- `js/game.js` yüklendiğinde `window.DR` hazırdır. Eklenti dosyaları `index.html`'de `game.js`'ten **sonra** yüklenir.
- `ready` olayı ve bekleyen yarış başlangıcı, sayfadaki tüm betikler yüklendikten sonra (`DOMContentLoaded`) işlenir. Eklentiler `ready` ve `raceStart` olaylarını kaçırmaz.
- Dinleyicilerdeki hatalar yakalanıp konsola yazılır; bir eklentinin hatası oyun döngüsünü durdurmaz.
- Kayıt geri yüklenirken (`silentRestore`) olay yayınlanmaz.

## Olay aboneliği
```js
const off = DR.on('takedown', (data) => { ... }); // aboneliği bırakmak için off()
DR.off('takedown', handler);
```
`ready` olayına geç abone olunursa dinleyici yine (bir kez, asenkron) çağrılır.

## Olaylar

| Olay | Ne zaman | Veri |
|---|---|---|
| `ready` | Oyun ve tüm betikler yüklendi | `{}` |
| `raceStart` | Yarış ilk kez başlatıldı (geri sayım başlıyor) | `{ mode: 'deathrace'\|'peaceful'\|'career', careerEvent: number\|null, difficulty: 'easy'\|'normal'\|'hard', laps }` |
| `countdownGo` | 3-2-1 bitti, araçlar serbest | `{}` |
| `lapComplete` | Oyuncu bir turu bitirdi | `{ lap, lapMs, bestLapMs }` (`lap`: biten tur numarası) |
| `raceFinish` | Oyuncu son turu bitirdi | `{ rank, mode, reward, careerEvent, careerPassed, bestLapMs, difficulty, stats }` (`stats` = `DR.getRaceStats()`) |
| `escape` | Limandaki gemiye atlayıp adadan kaçış | `{ stats }` |
| `takedown` | Oyuncu bir rakibi patlattı | `{ type, name, victim, reward, combo }` — `type`: `ram, wall, flip, gun, rocket, mine, oil, fire, trap, crusher, airstrike, blades` |
| `aiDeath` | Rakip oyuncunun payı olmadan öldü | `{ victim, cause }` — `cause`: `crash, ai, elimination, misc` |
| `playerDamaged` | Oyuncu hasar aldı | `{ amount, health }` |
| `playerDestroyed` | Oyuncunun aracı imha oldu | `{}` |
| `nearMiss` | Yüksek hızda rakibe kıl payı teğet | `{ victim, speedKmh }` |
| `driftEnd` | En az 0.5 sn süren drift bitti | `{ seconds }` |
| `weaponUsed` | Oyuncu bir silah kullandı (minigun'da her mermi) | `{ kind }` — `gun, rockets, emp, mines, oil, spikes, smoke, strike` |
| `platePickup` | Oyuncu bir plakadan geçti | `{ type: 'sword'\|'shield'\|'skull' }` |
| `partLost` | Oyuncunun zırh parçası koptu | `{ part }` — `part_spikes, part_armor_l, part_armor_r, part_roof, part_tombstone` |
| `garagePurchase` | Garajda yükseltme alındı | `{ type: 'engine'\|'armor'\|'gun'\|'rocket', level, cost }` |
| `garageCustomize` | Garajda bir parça seçildi (kilit kontrolünden geçtikten sonra) | `{ kind, id }` (aşağıdaki kimlik tablosu) |
| `garageOpen` | Garaj açıldı (kilit rozetlerini yenilemek için) | `{}` |
| `openProfile` | Kullanıcı "Profil" düğmesine bastı | `{}` |

## Okuma
- `DR.getState()` →
  ```
  { isRacing, isStarted, isPaused, inGarage, raceFinished,
    mode, careerEvent, careerProgress: { event, done },
    lap, maxLaps, stage, rank, racers, aliveRivals,
    health, maxHealth, speedKmh, credits, difficulty, weather,
    upgrades: { engine, armor, gun, rocket }, lostParts: [...], armory: {...} }
  ```
- `DR.getRaceStats()` → `{ takedowns, takedownTypes: { type: count }, maxSpeedKmh, nearMisses, driftScore, finishRank, bestLapMs, creditsThisRace }`

## Eylemler
- `DR.addCredits(amount, reason?)`: kredi ekler (negatif de olabilir), HUD'u günceller, kaydeder; `reason` varsa banner gösterir.
- `DR.showBanner(text, kind?)`: üst orta duyuru; `kind`: `'good' | 'bad' | ''`. Duyurular sıraya girer.
- `DR.showRadio(text)`: telsiz kutusu (sesli okuma 4 sn'de en fazla bir kez).
- `DR.format(n)`: `1.234.567` biçimi. `DR.formatTime(ms)`: `01:23.4` biçimi.
- `DR.storage.get(key, fallback)` / `DR.storage.set(key, value)`: JSON olarak kalıcı depo (`localStorage`, `death_race_ext_` önekiyle). Hata fırlatmaz.

## Garaj kilitleri
```js
DR.lockProvider = (kind, id) => null;          // açık
DR.lockProvider = (kind, id) => 'SEVİYE 5 GEREKLİ'; // kilitli: banner gösterilir, seçim engellenir
```
Oyun, garaj fonksiyonlarının başında `DR.isLocked(kind, id)` sorar. Kayıt geri yüklenirken kilit uygulanmaz; daha önce seçilmiş parça kalır.

### Kimlikler (`kind` → `id`) ve garaj kart elemanları
| kind | id değerleri | Kart elemanı id'si |
|---|---|---|
| `skin` | `classic_black, blood_carnage, desert_scorpion, weyland_enforcer` | `skin-<id>` |
| `decal` | `none, skull, number1, kill_marks` | `decal-<id>` |
| `blades` | `none, ben_hur, sawblade` | `blades-<id>` |
| `bumper` | `standard, twin_spikes, cowcatcher, grate` | `bumper-<id>` |
| `roof` | `none, strobe, safari, cage` | `roof-<id>` |
| `flame` | `cyan, fire, purple, acid` | `flame-<id>` |
| `ammo` | `fmj, ap, incendiary, acid` | `ammo-<id>` |
| `upgrade` | `engine:N, armor:N, gun:N, rocket:N` (N = alınacak seviye, 2–5) | `lvl-<type>`, `cost-<type>` (seviye/fiyat etiketleri) |

## Sayfadaki yerleşim noktaları
| Eleman | Konum | Kullanım |
|---|---|---|
| `#sponsor-hud` | Sol üst yarış bilgisinin altı (`#race-hud` içinde) | Yarış içi görev listesi |
| `#post-race-progress` | Yarış sonu ekranı, düğmelerin üstü | Görev sonuçları, XP, yeni başarımlar |
| `#profile-root` | `body` sonu | Profil / başarımlar / istatistik penceresi |
| `#btn-profile-pause`, `#btn-profile-menu` | Duraklatma menüsü, mod menüsü alt satırı | Varsayılan gizli; eklenti `style.display` ile gösterir. Tıklanınca `openProfile` olayı yayınlanır. |

## Mevcut z-index katmanları (çakışmamak için)
HUD 80–130 · geri sayım 130 · PiP 150 · garaj 200–210 · duraklatma 240 · ses penceresi 250–260 · mod menüsü 300 · kaçış ekranı 400 · yarış sonu ekranı 500. Profil penceresi için **600** kullanılmalı (her ekranın üstünde açılabilsin).
