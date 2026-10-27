# Death Race — Yol Haritası

Yöntem: özellikler önce **ham ama çalışır** hâlde eklenir, sonra cilalanır.
Görsel tasarım, sesler ve 3D modeller en sona bırakılır. Arayüz/kullanılabilirlik (UI/UX) düzenlemeleri her adımda yapılabilir.

Durum işaretleri: `[x]` tamamlandı · `[~]` ham olarak eklendi, cilalanacak · `[ ]` yapılacak

---

## ✅ Tamamlananlar

### Performans
- [x] Işık havuzu (123 ışık → sabit 18), tek-context PiP, shader ön derleme
- [x] Nesne havuzları (mermi, duman, patlama, kıvılcım), ses buffer önbelleği
- [x] Statik geometri birleştirme (335 mesh → 65), bariyer gövdeleri 800 → 80
- [x] `?perf` teşhis paneli

### Hata düzeltmeleri
- [x] Yarışın 3. turda bitmesi + sonuç ekranı, sıraya göre ödül
- [x] İlerleme kaydı (kredi, yükseltme, boya, modifiye, ayarlar, kariyer)
- [x] Rakip tur sayımı / sıralama, eleme ayarları, telsiz tekrarı, tuş çakışmaları, tur zamanlayıcısı

### Mekanikler
- [~] Gamepad desteği (sahte kolla test edildi, gerçek kolla denenmeli)
- [~] Kariyer modu (5 etap)
- [~] Zorluk seviyesi, AI saldırganlığı, mühimmat tipleri
- [~] Hayalet araç, grafik kalitesi (otomatik çözünürlük dahil), radar işaretleri

### Arayüz
- [~] HUD yerleşimi (üst üste binmeler giderildi), F1 tuş paneli, garajda HUD gizleme

---

## 🔴 1. Temel eksikler
- [~] **Duraklatma menüsü (ESC / gamepad Start / üst bardaki ❚❚):** devam, aracı piste geri koy, yeniden başlat (`?start=<mod>`), ses, kontroller (klavye + gamepad listesi), ana menü; sekme değişince otomatik duraklama; duraklamada geçen süre tur süresine eklenmez
- [~] **Parça koptukça araç zayıflasın:** sol/sağ zırh +%15, tavan +%10 alınan hasar; ön mahmuzlar gidince çarpma hasarı −%40; can %50 altında motor gücü/azami hız düşer (%0 canda %80); rakiplere de uygulanır; zırh barının üstünde parça çipleri + "MOTOR %" göstergesi
- [~] **Rakipler de silah kullansın:** oyuncu arkadaysa mayın/yağ, öndeyse güdümlü roket (kolayda roket yok); bekleme süresi zorluğa ve saldırganlığa bağlı
- [~] Rakiplerin bıraktığı yağ oyuncuyu da kaydırır (önceden oyuncu için yağ kayması hiç tanımlı değildi)

- [~] **Filmdeki gibi silah aktivasyonu:** 1. etapta tüm silahlar kilitli (oyuncu + rakipler); 2. etaptan itibaren ⚔ kılıç (mermi, roket, EMP), 🛡 kalkan (yağ, mayın, diken, duman + kalkan/onarım), ☠ kafatası (tuzak + hava saldırısı) plakalarından dolar. Rakipler de plakalardan silahlanır, cephanesi azalınca plakalara yönelir. Barışçıl modda sınırsız.
- [~] **R tuşu yalnızca oyuncuyu** en yakın pist noktasına koyar; araç imha olduysa orada tam canla yeniden doğar
- [~] **Yarış başı 3-2-1 geri sayımı** (araçlar frende bekler, tur süresi yeşil ışıkla başlar)

### Arayüz (bu turda)
- [~] Silah yuvalarında kilit / boş / bekleme / hazır durumu ve kalan cephane
- [~] Duyuru sırası (art arda gelen duyurular birbirini ezmiyor)
- [~] Sonuç ekranında Tekrar yarış / Sıradaki etap / Ana menü; kaçış ekranında Tekrar yarış / Ana menü
- [~] Kariyer hedef çipi (yarış sırasında), menüde 1-4 tuşları ile mod seçimi, "Kapat" yerine "Hızlı başla"
- [x] Hız birimi km/s → km/sa

## ⚡ Tur A — Oyun hissi
- [~] **Telsiz uyarıları:** sana kilitlenen roket, önündeki rakip yağı/mayını, arkadan hızla yaklaşan rakip, eleme sayacında sonunculuk (sayaç da kırmızı yanıp söner), silahsızken öndeki kılıç plakası, yakındaki Dreadnought. Roket ve öndeki tuzak için yön oklu tehdit göstergesi.
- [~] **Takedown çeşitleri:** Çarpışma (x1), Duvara sıkıştırma (x1.5), Takla (x1.4), Minigun (x0.8), Roket (x1), Mayın (x1.3), Yağ kaydırması (x1.6), Alev (x1.2), Tuzak (x1.5), Pres ezmesi (x2), Hava saldırısı (x0.8), Jant bıçağı (x1.5). Sonuç ekranında takedown türleri.
- [x] Rakibin kendi kazası, başka rakibin ateşi ve eleme artık oyuncuya takedown/puan olarak yazılmıyor (önceden yazılıyordu)
- [~] **Hava durumu sürüşü etkiler:** yağmurda tutuş −%22 (rakipler de), gecede görüş 420 m, dumanlı gün batımında tutuş −%5 ve görüş 900 m; HUD'da hava çipi.
- [~] Fizik NaN koruması (bozulan araç son sağlam konumuna döner)

## 🧩 Eklenti altyapısı & model
- [x] `window.DR` eklenti arayüzü (olaylar, okuma/eylem API'si, garaj kilit kancası, yerleşim noktaları) — `docs/DR_API.md`
- [~] Araç modeli v2 (Gemini) oyunda; silüet tasarım aşamasında bir tur daha iyileştirilecek
- [x] Garaj sahnesi zeminin altındaydı (araç gökyüzüne fırlıyordu) → zemin seviyesine taşındı
- [x] Tampon kitlerinin etkisi yoktu (kimlik uyuşmazlığı) → `BUMPER_FX`
- [x] Boya ve rakip renkleri uygulanmıyordu → malzeme adına göre boyama
- [~] Deneme aracı: Garaj > Gövde & Jantlar > **Araç dosyası seç** (ya da .glb'yi oyun ekranına sürükle) ile oyuncu aracı olur, seçim hatırlanır; "Varsayılan araç" ile geri dönülür. Sunucuyla açılınca `?car=<ad>` da çalışır (boy 4.3 m'ye ölçeklenir, zemine oturur, roket kovanı tavana yerleşir). Tek parça modelde parça kopması ve boya yok, tekerlekler dönmez.
- [~] **Araç kuralları** (`docs/ARAC_KURALLARI.md`): `wheel_*` (4 tekerlek, fizik modelin tekerlek yerine/boyuna uyar), `part_*`, `T_Govde`, `anchor_*`. Kontrol programı `tools/arac_kontrol.py`. Devir notu `docs/DEVIR_NOTU.md`.
- [x] Parça göstergesinde SOL/SAĞ ters yazıyordu (`part_armor_l` aracın sağ yanında) → etiketler düzeltildi

## 🖥️📱 Platform (Steam + Android APK)
- [ ] Erken platform denemesi: Electron (masaüstü) ve Capacitor (Android) ile test paketi, orta segment bir telefonda FPS ölçümü
- [ ] Android WebView'de `speechSynthesis` güvenilir değil → telsiz için kayıtlı ses satırları ya da yalnızca yazı
- [ ] Dokunmatik kontroller ve küçük ekran HUD'u (tasarım aşamasında)
- [ ] Steamworks: başarımlar (Tur B kimlikleriyle birebir), bulut kayıt; Android: imzalama, ikon, mağaza sayfası (en son)

## 🏁 2. Yeni oyun modları (şimdilik atlandı)
- [ ] Zamana karşı (rakipsiz, hayaletle, tur rekoru)
- [ ] Hayatta kalma (tur yok, son araç kalana kadar)
- [ ] Takedown arenası (3 dk, rakipler yeniden doğar)
- [ ] Günlük meydan okuma (tarihe göre değişen kurallar)

## 🎯 3. Hedefler ve ilerleme (Tur B — Gemini yazdı, Claude inceledi)
- [~] Sponsor görevleri (yarış başına 3 hedef + bonus) — Gemini yazdı, incelendi
- [~] Başarımlar (18 kalıcı rozet, Steam'e eşlenecek sabit kimlikler)
- [~] Seviye / XP sistemi, seviyeyle açılan garaj parçaları (kilit rozetleri)
- [~] Profil penceresi: profil, istatistik, başarımlar (360 px'de sekme başlıkları sığmıyor — tasarımda)

## 🚗 4. Araçlar ve silahlar
- [ ] Birden fazla araç (farklı istatistik; model sonra)
- [ ] Silah slotu / loadout (yarış öncesi 2 özel silah)
- [ ] Yeni silahlar: alev püskürtücü, arka pompalı, kilitlenen füze

## 🛣️ 5. Pist olayları
- [ ] Rastgele tehlikeler (zincirleme variller, kapanan kapılar, düşen konteynerler)
- [ ] Ters yön ve kısa pist varyasyonları

## 🎮 6. Büyük işler (sonra)
- [ ] İki kişilik bölünmüş ekran
- [ ] Anlık tekrar (replay)
- [ ] Çevrimiçi skor tablosu (sunucu gerektirir)

## 🎨 7. En son: tasarım, ses, model
- [ ] Sonuç ekranı, garaj kartları, menülerin görsel tutarlılığı, mobil görünüm
- [ ] Ses dengesi (sesler önceden hiç çalmıyordu, seviyeler hiç duyulmadan ayarlanmış)
- [ ] Garaj çıkartmalarının (decal) araç üzerinde görünmesi, yeni araç modelleri

---

## 📝 Karar bekleyen konular
- Sabit fizik adımı (sürüş hissini değiştirir, oynanarak test edilmeli).
- Cephane miktarları ve plaka bekleme süresi (12 sn) oynanarak dengelenmeli.
- Garaj ve ses ayarları penceresi henüz bu turdaki arayüz düzenlemesinden geçmedi.
