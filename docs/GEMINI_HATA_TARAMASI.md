# Gemini görevi 2: Hata taraması ve pist temizliği

**Kullanıcı için:** önce `docs/GEMINI_FIZIK_GOREVI.md` görevini yaptır. Bu dosyayı ondan sonra, aynı konuşmada ya da yeni bir konuşmada yapıştır. Ekler aynı: `js/game.js`, `docs/DEVIR_NOTU.md`, `docs/DR_API.md`. Yamaları Claude'a getir.

---

## KOMUT

"Death Race: Terminal Velocity" (Three.js r158 + cannon-es, tek dosya `js/game.js`) üzerinde **hata taraması** yapacaksın. Proje bilgisi `docs/DEVIR_NOTU.md` dosyasında. Kurallar ve teslim biçimi fizik görevindekiyle aynı:
- "Bul" / "Değiştir" blokları, Türkçe yorumlar.
- Yeni ışık ekleme, her karede `new` ile nesne üretme.
- `window.DR` olaylarını bozma, `progression.js`'e dokunma.

### 1. Rakipler kendini "yenilememeli" (kullanıcı şikâyeti)
Oyuncu **R** tuşuyla aracını piste geri koyabiliyor; bu yalnızca oyuncuya özel olmalı. Ama rakipler de sıkışınca ya da ters dönünce kendini ışınlıyor.
- **Yeri:** AI güncellemesinde (~4960) `if (speed < 0.6 || up.y < 0.25) { ai.stuckTimer += dt; if (ai.stuckTimer > 2.2) { ai.chassisBody.position.set(targetPt.x, 1.6, targetPt.z); ... } }`
- **İstenen:**
  - Sıkışan rakip ışınlanmasın. Önce geri vites ve ters direksiyonla kurtulmayı denesin (1.5–2 sn geri, sonra tekrar ileri).
  - Ters dönen rakip oyuncu gibi yerde ve durmuşken **yumuşakça** düzelsin (fizik görevindeki C maddesi).
  - Işınlama **yalnızca** şu durumlarda kalsın: araç haritadan düştü (y < −5), suya girdi ya da 15 sn'den uzun süre hiç ilerleyemedi. Bu durumda da oyuncunun kamerasının görmediği bir anda olsun (oyuncuya uzaklık > 80 m ya da kameranın arkasında).
  - Ölü rakipler (`ai.isDead`) asla yeniden doğmasın. Eleme ve takedown sayıları bozulmasın.
- AI'ya rastgele verilen dönme itmelerini de kontrol et: `ai.chassisBody.angularVelocity.y += ±6 / ±5.5` (~4849, ~6773). Bunlar rakibi gerçek dışı fırıldak gibi döndürüyorsa yumuşat.

### 2. Rampa uçuş yolundaki engeller (kullanıcı şikâyeti)
Rampadan uçarken araç havada çevredeki nesnelere (yapı, direk, varil, kule vb.) çarpıyor.
- Rampalar `createPhysicalRamp(...)` çağrılarında tanımlı (~5719–5731):
  - `ramp_sf` [0, 0, 320]
  - `ramp_container` [507, 0, 100], yön −Z
  - `ramp_layer2` [97.5, 0, 180], yön −Z
  - `ramp_escape` [−70, 0, 800], batıya
- Her rampa için **uçuş koridorunu** hesapla: rampanın çıkış ucundan itibaren ileri 0–90 m, yanlara ±12 m, yükseklik 0–18 m. Bu koridora giren her şeyi listele ve **ya kaldır ya da koridorun dışına taşı**:
  - statik kutular (`addStaticBox`)
  - varil ve sandıklar (`addBarrel` vb. `targets`)
  - ışık kuleleri, direkler, tabelalar, tribün parçaları
  - start/finish kemeri (`gantryLeft/Right/Top`, ~1676)
  - konteyner yığınları ve vinç (`2222` civarında yola konteyner düşüren olay da var)
  - hangar ve fabrika çatısı
  - "RAMPA KÖPRÜSÜ" bölümündeki (~5544) nesneler
- Hem görsel mesh'i hem fizik gövdesini (cannon `Body`) birlikte taşı ya da kaldır. Statik geometri birleştirme (`bakeStaticGroup`) ve ışık havuzu sonradan çalıştığı için yalnızca nesnenin oluşturulduğu yeri değiştir.
- Rampa inişinde yolun düz ve boş olduğundan emin ol. İniş bölgesinde varil kalacaksa yalnızca yerde, devrilebilir (dinamik) olsun; uçan aracı havada durdurmasın.
- Kaçış rampasının (`ramp_escape`) okyanustaki gemiye ulaşan yolu açık kalsın (`triggerEscapeVictory`).

### 3. Bildiğimiz/şüphelendiğimiz diğer hatalar
- **`timeScale` çakışması:** Dreadnought ölümü (~4379), takedown (~4775) ve yarış sonu (~7327) `setTimeout(() => timeScale = 1.0)` kullanıyor. Bu sırada Bullet-Time (~6830, T tuşu) açıksa ya da oyun duraklatılmışsa zaman yanlış geri dönüyor. Tek bir zaman yöneticisi yaz: istekler bir yığına girsin, süreler oyun zamanıyla saysın, duraklatmada dursun.
- **Duraklatmada çalışan `setTimeout`'lar:** oyundaki `setTimeout`/`setInterval` kullanımlarını tara. Oyun mantığını etkileyenler (silah bekleme, düşmanın bir sonraki hamlesi, gecikmeli patlamalar) duraklatmada ilerlememeli. Bunları oyun saatine bağla. Yalnızca arayüz animasyonları gerçek saatle kalabilir.
- **Takla düzeltici havada çalışıyor:** fizik görevindeki C maddesi; fizik görevi yapıldıysa atla.
- **Kopan parça ve enkaz temizliği:** `debrisList` ömrü dolunca hem mesh hem fizik gövdesi kaldırılıyor mu? Çok sayıda takedown sonrası gövde sayısı artıyor mu, kontrol et.
- **Rakip mermi ve roketleri:** `activeBullets`/`activeRockets` havuzları ömür sonunda ya da duvara çarpınca geri dönüyor mu? Sızıntı var mı?
- **Yeniden başlatma ve ana menü:** `?start=` ile yeniden başlatınca ya da ana menüye dönünce eski zamanlayıcılar ve olay dinleyicileri temizleniyor mu?
- **Yarış sonu:** yarış bitince rakipler ve oyuncu durmalı, silahlar ateş etmemeli, hasar alınmamalı.
- **Kamera:** araç ters dönünce ya da bir duvarın arkasında kalınca kamera duvarın içine girmesin (basit bir ışın testiyle kamerayı yaklaştır).
- **Konsol hataları:** kodda `undefined` olabilecek erişimleri tara (ör. model yüklenmeden `carBodyMesh` kullanımı, ölü rakibe hedeflenen roket) ve koru.

### 4. Kendi bulduğun hatalar
Kodu baştan sona oku. Oyuncunun fark edeceği hataları önem sırasıyla listele ve düzelt:
- mantık hatası
- sonsuz büyüyen dizi
- yanlış sıralama veya puan
- tuş çakışması
- arayüzde üst üste binme
- Türkçe yazım hatası

Her biri için "nasıl oluşur" diye tek cümle yaz.

### Teslim
1. Hata listesi: her biri için yeri, nasıl oluştuğu ve önemi (yüksek/orta/düşük).
2. Numaralı yamalar ("Bul" / "Değiştir").
3. Her yama için oyunda nasıl denenir.
4. Emin olmadığın yerler "SORU:" başlığıyla.
