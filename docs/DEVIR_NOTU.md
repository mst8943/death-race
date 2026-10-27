# Devir Notu — Death Race: Terminal Velocity

Bu not projeyi devralacak kişi ya da yapay zekâ için yazıldı: ne yapıldı, ne kaldı, nasıl çalışılıyor.
Ayrıntılı durum listesi `YOL_HARITASI.md` içinde, teknik günlük `memory/death-race.md` içinde.

*Son güncelleme: 27 Ekim 2026*

---

## 1. Proje bir bakışta
- **Ne:** tarayıcıda çalışan 3B savaşlı araba yarışı ("Death Race" filmi havasında, özgün tasarım).
- **Teknik:**
  - Three.js r158 (görüntü), cannon-es (fizik), Web Audio (ses).
  - Derleme adımı yok; düz HTML ve JS.
- **Hedef platform:** Steam (masaüstü) ve Android APK. Paketleme henüz yapılmadı (Bölüm 5).
- **Dil:** oyun içi metinler, kod yorumları ve belgeler Türkçe.

### Nasıl çalıştırılır
- **En kolay yol:** `index.html` dosyasına çift tıkla.
  - Modeller `js/models/*.js` içinde base64 olarak gömülü olduğu için sunucu gerekmez.
  - Sınırı: dosyaya çift tıklanarak (`file://`) açılan sayfa, `araclar/` gibi klasörlerden dosya **okuyamaz**. Bu yüzden kullanıcının seçtiği dosyalar garajdaki dosya seçiciyle yüklenir.
- **Geliştirme:** `python -m http.server 8765` ile sunucuyu başlat, sonra `http://localhost:8765/index.html` adresini aç.
- **Adres ekleri:**
  - `?perf`: FPS ve donma paneli.
  - `?start=deathrace|peaceful|career`: menüyü atlar.
  - `?car=<ad>`: `araclar/<ad>.glb` aracını takar (yalnızca sunucuyla).

### Dosya haritası

| Dosya | İçerik |
|---|---|
| `index.html` | Tüm arayüz (HUD, garaj, menüler) ve CSS |
| `js/game.js` | Oyunun tamamı (~9.200 satır): fizik, yapay zekâ, silahlar, pist, garaj, kayıt, ses |
| `js/progression.js`, `css/progression.css` | Eklenti: görevler, XP/seviye, başarımlar, profil (Gemini yazdı) |
| `docs/DR_API.md` | `window.DR` eklenti arayüzü: olaylar, okuma ve eylemler, garaj kilitleri |
| `docs/ARAC_KURALLARI.md` | **Araç modeli kuralları.** Her yeni araç buna göre yapılır. |
| `tools/arac_kontrol.py` | Bir `.glb` aracın kurallara uyup uymadığını yazar |
| `tools/pack_models.py` | `models/*.glb` dosyalarını `js/models/*.js` (base64) dosyalarına çevirir |
| `blender/car_v2.py`, `blender/GEMINI_PROMPT.md` | Varsayılan aracın Blender betiği ve onu yazdıran komut |
| `models/` | Varsayılan araç (`car_body.glb`) ve tekerlek (`wheel.glb`) |
| `araclar/` | Denenen yeni araçlar (`demo_car.glb`) |
| `YOL_HARITASI.md` | Yapılanlar ve yapılacaklar listesi (`[x]` bitti, `[~]` ham, `[ ]` yapılacak) |
| `tools/apply_*.js`, `tools/test_*.js` | Eski toplu yama ve test betikleri. Çoğu güncel değil, yalnızca başvuru için. |

---

## 2. Çalışma yöntemi (kullanıcının kararları)
1. **Önce hatalar, sonra mekanikler.** Özellikler **ham ama çalışır** hâlde eklenir, sonra cilalanır.
2. **Tasarım, ses ve 3B modeller en sona** bırakılır. Arayüz düzenlemeleri her adımda yapılabilir.
3. **Gemini kodlar, Claude denetler.** Büyük ve iyi tanımlanmış işler için `docs/` altına ayrıntılı bir komut yazılır (örnek: `docs/TUR_B_GEMINI.md`). Gemini kodu yazar, Claude inceler, düzeltir ve test eder.
4. **Eklentiler `game.js`'e dokunmaz,** yalnızca `window.DR` üzerinden bağlanır.
5. Her iş `claude/...` dalında yapılır, kullanıcı onay verince `main` dalına aktarılır. Kullanıcı Windows'ta çalışıyor (`C:\Users\USER\Desktop\death-race`) ve `git pull` / `git push` komutlarını ayrı ayrı, basit anlatımla ister.
6. Her değişiklikten sonra `YOL_HARITASI.md` ve `memory/death-race.md` güncellenir.

---

## 3. Yapılanlar (özet)

### Performans (takılma kök nedenleri)
- **Işık havuzu:** 123 ışık sabit 18'e indi. Işık sayısı sabit kaldığı için shader'lar yeniden derlenmiyor.
- **Resim içinde resim:** tek WebGL bağlamıyla çiziliyor. Önceden ilk takedown'da çok uzun donuyordu.
- **Shader ön derleme:** `compileAsync` ile oyun başlamadan derleniyor.
- **Nesne havuzları:** mermi, duman, patlama ve kıvılcım nesneleri yeniden kullanılıyor; ses buffer'ları önbellekte.
- **Statik geometri birleştirme:** 335 mesh 65'e indi.
- **Ses:** sesler hiç çalmıyordu, çünkü ana ses düğümü kendine bağlıydı. Düzeltildi.

### Oyun hataları
- Yarış bitişi ve sonuç ekranı düzeltildi.
- İlerleme kaydı eklendi.
- Turları sayan sıralama, NaN fizik koruması.
- Garaj zeminin altındaydı: araç gökyüzüne fırlıyordu.
- Boya ve rakip renkleri hiç işlemiyordu.
- Tampon kitlerinin etkisi yoktu.

### Mekanikler (ham)
- Gamepad, kariyer (5 etap), zorluk, hayalet araç, grafik kalitesi.
- Duraklatma menüsü, 3-2-1 geri sayım.
- **Filmdeki gibi silahlar:**
  - 1. etapta silahlar kilitli.
  - Sonraki etaplarda ⚔ (kılıç), 🛡 (kalkan) ve ☠ (kafatası) plakalarından geçince silahlar dolar.
  - Rakipler de plakalardan silahlanır.
- R tuşu yalnızca oyuncuyu piste geri koyar.
- Parça koptukça araç zayıflar.
- Rakipler de silah kullanır.
- 12 takedown türü.
- Telsiz tehdit uyarıları.
- Hava durumu sürüşü etkiler.

### Altyapı
- `window.DR` eklenti arayüzü.
- Tur B (Gemini): görevler, XP/seviye 1–30, 18 başarım, profil penceresi.

### Araçlar
- Varsayılan araç modeli v2 (Gemini, Blender betiği).
- **Araç takma sistemi:**
  - Garajdan `.glb` seçilir ya da dosya oyun ekranına sürüklenir.
  - Seçim IndexedDB'de hatırlanır.
  - Model `docs/ARAC_KURALLARI.md` kurallarının ne kadarına uyuyorsa o kadar özellik açılır: tekerlek dönmesi ve fiziğin tekerleklere uyması, parça kopması, boya, silah yerleri.
  - Kurallara uyan bir modelle (ayrı tekerlekli) ve tek parça `demo_car` ile test edildi.

---

## 4. Yapılacaklar (öncelik sırasıyla)

### Hemen sırada
1. **`demo_car`'ı kurallara uydurmak:** Blender'da tekerlekleri ayırmak, parçalara ad vermek, `T_Govde` atamak. Adımlar `docs/ARAC_KURALLARI.md` Bölüm 8'de. Bunu kullanıcı yapacak ya da bir yapay zekâya Blender betiği yazdıracak.
2. **Tur C — çoklu araç:**
   - Garajda araç seçimi.
   - Her aracın kendi ayarları: ağırlık, motor gücü, azami hız, zırh. Tekerlek yeri ve boyu modelden ölçülüyor (bu kısım hazır).
   - Rakiplerin de farklı araçlar kullanması.
   - Hayalet aracın oyuncunun aracını kullanması (şu an hep varsayılan modeli kullanıyor).
   - `araclar/` klasöründeki araçların oyuna gömülmesi: `pack_models.py` ile sunucusuz açılışta da listede görünmeleri.
3. Silah slotu / loadout (yarış öncesi 2 özel silah), yeni silahlar (alev püskürtücü, arka pompalı, kilitlenen füze).
4. Pist olayları: zincirleme variller, kapanan kapılar, düşen konteynerler; ters yön ve kısa pist.

### Platform (erken denenmeli)
- Electron (Steam) ve Capacitor (Android) ile birer test paketi, orta segment bir telefonda FPS ölçümü.
- **Android'de `speechSynthesis` güvenilir değil.** Telsiz için kayıtlı ses satırları ya da yalnızca yazı kullanılmalı.
- Dokunmatik kontroller, küçük ekran HUD'u.
- Steam başarımları: Tur B kimlikleri birebir kullanılacak. Bulut kayıt.

### En son
- Tasarım geçişi:
  - Sonuç ekranı, garaj kartları, menüler.
  - Profil sekmeleri 360 px genişlikte sığmıyor.
- Ses dengesi: sesler uzun süre hiç çalmadığı için seviyeler duyulmadan ayarlandı.
- Yeni araç modelleri, garaj çıkartmalarının araç üzerinde görünmesi.

### Sonraki büyük işler
Bölünmüş ekran, anlık tekrar, çevrimiçi skor tablosu.

---

## 5. Karar bekleyenler (kullanıcıya sorulacak)
- **Android test telefonu var mı?** Varsa platform denemesi öne alınmalı.
- **Paketleme aracı:** öneri Capacitor (Android) + Electron (Steam). İkisi de mevcut HTML/JS'i değiştirmeden sarar. Flutter tüm oyunun yeniden yazılmasını gerektirir.
- **Sabit fizik adımı:** sürüş hissini değiştirir, oynanarak karar verilmeli.
- **Denge ayarları:** cephane miktarları ve plaka bekleme süresi (12 sn).

---

## 6. Bilinen sorunlar ve tuzaklar
- **Sağ/sol adları:**
  - `part_armor_l` aracın −X yanında. Takip kamerasından bakınca bu aracın **sağ** yanı.
  - HUD etiketleri ve parça adları düzeltildi; kimlikler (`part_armor_l/r`) eklentiler ve kayıtlar için değiştirilmedi.
- **Sonsuz zemin düzlemi:** fizik zemini (`CANNON.Plane`) y = 0'ın altındaki her şeyi yukarı iter. Zeminin altına sahne kurma; garaj bu yüzden zemin seviyesinde (`GARAGE_POS`).
- **Boya malzeme adıyla bulunur:** GLTFLoader çok malzemeli nesneleri `Cube_1`, `Cube_2` diye böler, bu yüzden nesne adına güvenilmez.
- **Işık havuzu:** sahneye doğrudan yeni ışık ekleme; havuzdaki sanal ışıkları kullan. Yoksa shader'lar yeniden derlenir ve oyun takılır.
- **`file://` sınırı:** dosyaya çift tıklanarak açılan oyunda `fetch` ile yerel dosya okunamaz. Yeni dosya yükleme özelliklerinde garajdaki dosya seçici gibi bir yol düşünülmeli.
- **Tek parça araçlarda:** jant bıçakları ve tekerlek aksesuarları gizlenir. Ayrı tekerlekli araçlarda bıçaklar varsayılan tekerlek boyunda kalır.
- `game.js` büyük ve tek dosya. Bölmek (ES modülleri) platform paketlemesiyle birlikte düşünülebilir; şimdilik bilerek tek dosya.

---

## 7. Test
- **Otomatik:** Playwright + Chromium (yazılım GPU'su ile, `--use-gl=swiftshader`). Oyun `?start=peaceful` ile açılır, test için iç değişkenler sayfaya eklenen küçük bir kodla dışarı açılır.
- **Elle:**
  - `?perf` ile FPS ve donma takibi.
  - Barışçıl mod (hasar yok) ile mekanik denemeleri.
- **Araç modeli:**
  - `python tools/arac_kontrol.py araclar/<ad>.glb` ile kontrol.
  - Sonra garaj > Gövde & Jantlar > Araç dosyası seç ile oyunda dene.
