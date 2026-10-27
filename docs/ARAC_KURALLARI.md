# Araç Modeli Kuralları

Bu kurallara uyan her `.glb` araç oyuna takıldığında tekerlekleri döner, parçaları kopar, garaj boyası işler. Kod değişikliği gerekmez. Kurallar bir kez yazıldı; her yeni araç için aynısı geçerli.

Model kuralların ne kadarına uyuyorsa oyun o kadar özelliği açar. Hiçbirine uymayan tek parça bir model de oyunda çalışır, ama "çıplak" kalır.

## Özet

| Özellik | Kural | Uyulmazsa |
|---|---|---|
| Ölçek | 1 birim = 1 metre, araç boyu 2.5–8 m | Araç 4.3 m boya büyütülür ya da küçültülür |
| Yön | Blender'da önü **−Y**, üstü **+Z** | Araç yan ya da ters gider |
| Tekerlek dönmesi ve direksiyon | 4 ayrı nesne, adları `wheel_` ile başlar | Tekerlekler gövdeye gömülü kalır, dönmez |
| Parça kopması | `part_spikes`, `part_armor_l`, `part_armor_r`, `part_roof`, `part_tombstone` | O parça kopmaz, alttaki parça göstergesinde görünmez |
| Garaj boyası, rakip renkleri | Ana boya malzemesinin adı `T_Govde` (koyu ton için `GovdeKoyu`) | Boya işlemez, araç dokusundaki renkle kalır |
| Silah yerleri (isteğe bağlı) | Boş nesneler: `anchor_gun_l`, `anchor_gun_r`, `anchor_rocket` | Minigunlar varsayılan yerde, roket kovanı tavana otomatik oturur |
| Performans | Gövde ≤ 12.000 üçgen, tekerlek başına ≤ 1.200, ≤ 12 malzeme, doku ≤ 1024×1024 | Telefonda yavaşlar (5 araç birlikte çizilir) |

## 1. Yön ve ölçek
- Blender'da Z yukarı, **aracın önü −Y** yönüne bakar. Dışa aktarımda "+Y Up" açık kalır; oyunda araç +Z yönüne gider.
- 1 birim = 1 metre. Tipik ölçüler: boy 4–5 m, genişlik 1.8–2.4 m, yükseklik 1.3–1.8 m.
- Zemin Blender'da z = 0'dır. Tekerleklerin alt kenarı z = 0'a değer.
- **Sağ ve sol:** önü −Y'ye bakan araçta **−X aracın sağ yanı**, +X sol yanıdır. `part_armor_l` −X yanında, `part_armor_r` +X yanında durur. Bu adlar eskiden kaldı, kimlik oldukları için değiştirilmiyor. Adlara değil, koordinatlara uy.

## 2. Tekerlekler (`wheel_*`)
- Tam **4** ayrı nesne. Adlar `wheel_` ile başlar, gerisi serbesttir (öneri: `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`).
- Oyun tekerlekleri adlarına göre değil, konumlarına göre (ön/arka, iki yan) eşleştirir.
- Her tekerlek kendi merkezinde döner. **Dönme ekseni X ekseni** (yan yana bakan tekerlek).
- Oyun tekerleklerin yerini ve yarıçapını modelden ölçer, sürüş fiziğini de bunlara göre ayarlar. Tekerlekler istenen yerde ve boyda olabilir.
  - Önerilen yarıçap 0.3–0.6 m.
  - Önerilen dingil mesafesi (ön-arka tekerlek arası) 2.6–3.4 m.
  - Önerilen iz genişliği (iki yan tekerlek arası) 1.8–2.2 m.
- Jant bıçakları gibi oyunun eklediği aksesuarlar tekerleğe otomatik bağlanır (şimdilik varsayılan tekerlek boyunda).

## 3. Kopabilir parçalar (`part_*`)

| Nesne adı | Nerede | Ne zaman kopar |
|---|---|---|
| `part_spikes` | Ön koçbaşı, mahmuzlar | Önden darbe |
| `part_armor_l` | −X yanı zırh plakası | −X yanından darbe |
| `part_armor_r` | +X yanı zırh plakası | +X yanından darbe |
| `part_roof` | Tavan kafesi, projektörler | Üstten darbe, takla |
| `part_tombstone` | Arka kalın kalkan | Arkadan darbe |

- Her parça **tek bir nesne** olmalı. Birden fazla parçayı birleştirmek için Blender'da `Ctrl+J` kullan; alt nesneler de kabul edilir.
- Parça gövdeye görsel olarak bağlı dursun. Koptuğunda altında delik görünmesin; gövdede bir kapama yüzeyi bırak.
- Kopan parça sınırlayıcı kutusu kadar fizik gövdesi alır. İnce uzun çubuklardan oluşan dağınık parçalardan kaçın.
- Kopan parçanın oyuna etkisi (daha fazla hasar, daha zayıf çarpma) bu adlara bağlıdır.

## 4. Malzemeler
- `T_Govde`: ana boya. Garajda seçilen boya ve rakip renkleri bunu değiştirir. Geniş, görünür paneller bu malzemeyi kullanır.
- `GovdeKoyu`: ana rengin koyu tonu (alt paneller, kenarlar).
- Malzemelerin hepsine anlamlı bir ad ver; adsız malzeme kullanma.
- En fazla 12 malzeme olsun. Dokulu modellerde boyanacak bölümün ayrı malzemesi olmalı. Doku rengi boyayla çarpılır, bu yüzden boyalı bölümün dokusu açık gri tonlarda olsun.

## 5. Silah yerleri (isteğe bağlı)
Blender'da `Add > Empty > Plain Axes` ile boş nesne ekle ve şu adları ver:
- `anchor_gun_l` (−X yanı) ve `anchor_gun_r` (+X yanı): minigunlar
- `anchor_rocket`: roket kovanının alt orta noktası

Bunlar yoksa oyun varsayılan yerleri kullanır, roket kovanını da tavanın üstüne kendisi oturtur.

## 6. Dışa aktarma (Blender)
`File > Export > glTF 2.0`:
- Format: **glTF Binary (.glb)**
- Include: Selected Objects (aracın tüm nesneleri seçili; kamera ve ışık hariç)
- Transform: **+Y Up açık**
- Data > Mesh: **Apply Modifiers açık**
- Material: Export

Dosyayı `araclar/` klasörüne koy.

## 7. Kontrol ve deneme
1. Kurallara uyup uymadığını kontrol et:
   ```
   python tools/arac_kontrol.py araclar/aracin_adi.glb
   ```
   Program neyin tanındığını (tekerlek, parça, boya, silah yeri) ve neyin eksik olduğunu yazar. "HATA" satırları düzeltilmelidir; "UYARI" satırları özelliği kapatır ama aracı bozmaz.
2. Oyunda dene: Garaj (**G**) > **⚙️ GÖVDE & JANTLAR** > **ARAÇ DOSYASI SEÇ**. Dosyayı oyun ekranına sürükleyip bırakmak da olur. Üstte çıkan duyuru ve garajdaki "Takılı:" satırı, oyunun neyi tanıdığını gösterir.

## 8. Hazır (tek parça) bir modeli kurallara uydurmak
İnternetten ya da yapay zekâ aracından gelen modeller genelde tek parça olur (`demo_car.glb` gibi). Bunları Blender'da kurallara uydurmak için:

1. `File > Import > glTF 2.0` ile modeli aç.
2. **Ölçek ve yön:**
   - Aracın önünü −Y'ye çevir (`R Z 90` veya `R Z 180`).
   - `S` ile boyu 4–5 m olacak kadar büyüt. Boyu sağdaki `N` panelinden okuyabilirsin.
   - `Ctrl+A > All Transforms` ile uygula.
   - Tekerleklerin altı z = 0'a gelsin.
3. **Tekerlekleri ayır:**
   - `Tab` ile düzenleme moduna geç.
   - Bir tekerleğin üstüne gel, `L` ile bağlı yüzeyleri seç ve gerekirse ekle/çıkar.
   - `P > Selection` ile ayrı nesne yap.
   - Bunu dört tekerlek için tekrarla.
   - Model tek bir sargı olarak gelmişse, tekerlek yüzeylerini kutu seçimle (`B`) ya da daire seçimle (`C`) seç.
4. **Tekerlek merkezleri:**
   - Her tekerlekte `Object > Set Origin > Origin to Geometry` uygula.
   - Adlarını `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr` yap.
5. **Parçalar:** zırh, tavan kafesi, koçbaşı ve arka kalkanı aynı yolla (`P > Selection`) ayır ve Bölüm 3'teki adları ver. Altta kalan delikleri basit bir yüzeyle kapat.
6. **Boya:**
   - Gövdenin boyanacak yüzeylerini seç.
   - Yeni bir malzeme oluştur, adını `T_Govde` koy ve `Assign` ile ata.
   - Dokulu modelde bu malzemeye açık gri bir doku ya da düz renk ver.
7. **Hafiflet:**
   - Üçgen sayısı 12.000'i aşıyorsa `Decimate` modifier'ını uygula (Ratio ~0.7).
   - Doku büyükse 1024×1024'e küçült.
8. Bölüm 6'daki ayarlarla dışa aktar, sonra Bölüm 7'deki adımlarla kontrol et ve oyunda dene.

## 9. Gemini veya başka bir yapay zekâ için
Gemini'ye Blender betiği yazdırırken `blender/GEMINI_PROMPT.md` dosyasını ve bu dosyayı birlikte ver. Betiğin sonunda Bölüm 7'deki kontrollerin `assert` ile yapılmasını iste.

---
*Teknik not:* Oyundaki karşılığı `js/game.js` içindeki `applyCustomCarModel()` fonksiyonudur. Kontrol programı `tools/arac_kontrol.py`. Kurallar değişirse ikisi ve bu dosya birlikte güncellenir.
