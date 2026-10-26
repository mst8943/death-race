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

## 🏁 2. Yeni oyun modları
- [ ] Zamana karşı (rakipsiz, hayaletle, tur rekoru)
- [ ] Hayatta kalma (tur yok, son araç kalana kadar)
- [ ] Takedown arenası (3 dk, rakipler yeniden doğar)
- [ ] Günlük meydan okuma (tarihe göre değişen kurallar)

## 🎯 3. Hedefler ve ilerleme
- [ ] Sponsor görevleri (yarış başına 2-3 hedef + bonus)
- [ ] Başarımlar (kalıcı rozetler)
- [ ] Seviye / XP sistemi, seviyeyle açılan parçalar
- [ ] Kariyer istatistikleri ekranı

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

## 📝 Kod incelemesinde fark edilen, karar bekleyen konular
- "ETAP 1: SİLAHLAR KİLİTLİ" yazıyor ama oyuncunun ve rakiplerin silahları 1. etapta da çalışıyor.
- **R (Sıfırla)** yalnızca oyuncuyu değil tüm rakipleri de başlangıca ışınlıyor, tur sayısı ise korunuyor.
- Sabit fizik adımı (sürüş hissini değiştirir, oynanarak test edilmeli).
