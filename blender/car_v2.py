"""Death Race: Terminal Velocity — Frankenstein (1970s Fastback Muscle War Car).
Tek dosyalık, baştan sona kendi kendine çalışan Blender 4.1+ / 5.x Python betiği.

Sözleşme & Teknik Kurallar:
- 6 Gövde Nesnesi: chassis, part_spikes, part_armor_l, part_armor_r, part_roof, part_tombstone
- 1 Tekerlek Nesnesi: wheel (Orijinde, X ekseninde döner, R=0.38, W=0.30)
- Koordinatlar: Ön -Y, Arka +Y, Sol -X, Sağ +X, Z yukarı.
- Gövde Zarfı: X[-1.00..+1.00], Y[-2.30..+2.05], Z[0.40..1.45]
- Zorunlu Malzemeler: T_Govde, GovdeKoyu, Far, StopIsigi (Toplam <= 12 malzeme)
- Bütçe: car_body.glb <= 12.000 üçgen, wheel.glb <= 1.200 üçgen
- Çıktılar: car_body.glb, wheel.glb, car.blend, 6 render PNG (car_exploded.png dahil)
- Dahili assert doğrulama bloğu.
"""
import bpy, math, sys, os, mathutils

P = math.pi

# ---------------------------------------------------------------------------
# 0. Komut satırı argümanları & Fabrika ayarları
# ---------------------------------------------------------------------------
out = os.path.abspath(sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv else os.path.abspath('blender/cikti_v2')
os.makedirs(out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


# ---------------------------------------------------------------------------
# 1. Renk & Malzeme Yardımcıları (sRGB -> Lineer, Principled BSDF)
# ---------------------------------------------------------------------------
def _lin(c):
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)


def mat(name, rgb, rough=0.55, metal=0.0, emit=None):
    rgb = _lin(rgb)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1.0)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        emit = _lin(emit)
        # Blender 4.0+ / 5.x socket names
        if 'Emission Color' in b.inputs:
            b.inputs['Emission Color'].default_value = (*emit, 1.0)
            b.inputs['Emission Strength'].default_value = 2.2
        elif 'Emission' in b.inputs:
            b.inputs['Emission'].default_value = (*emit, 1.0)
    return m


# ---------------------------------------------------------------------------
# 2. Primitif Geometri Üreteçleri
# ---------------------------------------------------------------------------
def E(kind, loc, scale, m, rot=(0, 0, 0), bevel=0.0, seg=12):
    """Primitif geometri oluşturur, ölçeği dondurur, malzemeyi atar."""
    if kind == 'cube':
        bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    elif kind == 'cyl':
        bpy.ops.mesh.primitive_cylinder_add(location=loc, rotation=rot, vertices=seg)
    elif kind == 'cone':
        bpy.ops.mesh.primitive_cone_add(location=loc, rotation=rot, vertices=seg)
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(location=loc, rotation=rot, segments=seg, ring_count=max(5, seg // 2))

    o = bpy.context.object
    o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    if bevel > 0.001:
        bv = o.modifiers.new('b', 'BEVEL')
        bv.width = bevel
        bv.segments = 2
        bpy.ops.object.modifier_apply(modifier='b')
    bpy.ops.object.shade_flat()
    return o


def join(objs, name):
    """Verilen nesneleri tek bir birleşik mesh nesnesi yapar."""
    if not objs:
        return None
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    bpy.ops.object.shade_flat()
    return o


# ---------------------------------------------------------------------------
# 3. Malzeme Paleti (Tam olarak 12 malzeme)
# ---------------------------------------------------------------------------
BODY       = mat('T_Govde', (0.42, 0.08, 0.06), rough=0.45, metal=0.15)      # 1970 muscle car koyu kiraz kırmızı
BODY_DARK  = mat('GovdeKoyu', (0.16, 0.03, 0.03), rough=0.60, metal=0.10)    # İkincil gövde boyası
ARMOR      = mat('Zirh', (0.15, 0.16, 0.18), rough=0.50, metal=0.60)         # Kaynaklı çelik zırh plakaları
ARMOR_DARK = mat('ZirhKoyu', (0.07, 0.07, 0.08), rough=0.65, metal=0.40)     # Koyu alt şasi ve çerçeve barları
STEEL      = mat('Celik', (0.45, 0.47, 0.50), rough=0.28, metal=0.88)        # Bıçaklar, perçinler, ızgara, jant
RUST       = mat('Pas', (0.38, 0.16, 0.07), rough=0.85, metal=0.10)          # Paslı hurda levhalar
GLASS_ARM  = mat('CamZirh', (0.03, 0.04, 0.06), rough=0.20, metal=0.25)      # Zırh vizör camı / koyu slit
LIGHT_HEAD = mat('Far', (1.0, 0.95, 0.80), rough=0.20, emit=(1.0, 0.90, 0.65)) # Farlar ve projektörler
LIGHT_TAIL = mat('StopIsigi', (0.85, 0.04, 0.04), rough=0.25, emit=(0.95, 0.04, 0.02)) # Arka stop lambaları
EXHAUST    = mat('Egzoz', (0.24, 0.23, 0.25), rough=0.38, metal=0.75)        # Yan zoomie egzoz boruları
BLOWER_RED = mat('BlowerKapak', (0.80, 0.08, 0.04), rough=0.35, emit=(0.60, 0.06, 0.03)) # Süperşarj kelebekleri
TIRE_MAT   = mat('T_Lastik', (0.04, 0.04, 0.04), rough=0.88, metal=0.0)      # Kalın dişli arazi lastiği

# Modüler parça konteynerleri
chassis_parts   = []
spikes_parts    = []
armor_l_parts   = []
armor_r_parts   = []
roof_parts      = []
tombstone_parts = []


# ===========================================================================
# 4. CHASSIS (Ana Gövde, Şasi, Fastback Kabin, Kaput, Blower, Egzozlar)
# ===========================================================================

# --- A. Alt Şasi ve Taban Koruma ---
# Ana şasi omurgası (Z: 0.42 .. 0.58)
chassis_parts.append(E('cube', (0, 0.0, 0.50), (0.84, 1.88, 0.07), ARMOR_DARK, bevel=0.02))
# Ön ve arka travers takviyeleri
chassis_parts.append(E('cube', (0, -1.45, 0.49), (0.84, 0.22, 0.06), ARMOR_DARK))
chassis_parts.append(E('cube', (0, 1.45, 0.49), (0.84, 0.25, 0.06), ARMOR_DARK))
# Yan marşpiyel altı çelik kızaklar
for s in (-1, 1):
    chassis_parts.append(E('cube', (s * 0.86, 0.0, 0.50), (0.035, 1.30, 0.05), ARMOR_DARK, bevel=0.01))

# --- B. 1970'ler Fastback Gövde Alt-Orta Kabuğu ---
# Ana gövde kütüğü (T_Govde geniş boyalı alan)
chassis_parts.append(E('cube', (0, 0.05, 0.70), (0.83, 1.86, 0.12), BODY, bevel=0.04))
# Alt gövde kavisli daralması
chassis_parts.append(E('cube', (0, 0.05, 0.60), (0.80, 1.84, 0.04), BODY_DARK))

# --- C. Kaslı Çamurluklar (Coke-Bottle Muscle Haunches) ---
for s in (-1, 1):
    # Ön çamurluk üstü ve kavis dudakları (Y = -1.45)
    chassis_parts.append(E('cube', (s * 0.89, -1.45, 0.76), (0.05, 0.42, 0.11), BODY, bevel=0.03))
    chassis_parts.append(E('cube', (s * 0.88, -1.45, 0.84), (0.035, 0.38, 0.02), BODY_DARK))
    chassis_parts.append(E('cube', (s * 0.93, -1.45, 0.73), (0.012, 0.38, 0.02), STEEL))
    # Arka geniş omuz çamurlukları (Y = +1.45) - 70'ler fastback kaslı arka omuz
    chassis_parts.append(E('cube', (s * 0.90, 1.45, 0.78), (0.06, 0.46, 0.13), BODY, bevel=0.03))
    chassis_parts.append(E('cube', (s * 0.88, 1.45, 0.87), (0.035, 0.42, 0.025), BODY_DARK))
    chassis_parts.append(E('cube', (s * 0.94, 1.45, 0.75), (0.012, 0.42, 0.02), STEEL))
    # İç tekerlek davlumbaz kapamaları
    chassis_parts.append(E('cube', (s * 0.76, -1.45, 0.66), (0.02, 0.40, 0.15), ARMOR_DARK))
    chassis_parts.append(E('cube', (s * 0.76, 1.45, 0.66), (0.02, 0.42, 0.15), ARMOR_DARK))

# --- D. Uzun Agresif Kaput & Süperşarj (Blower) ---
# Kaput ana paneli (T_Govde ana boyası ile kaplı geniş yüzey)
chassis_parts.append(E('cube', (0, -1.25, 0.90), (0.78, 0.64, 0.035), BODY, bevel=0.02))
# Ön burun eğimi
chassis_parts.append(E('cube', (0, -1.88, 0.80), (0.76, 0.10, 0.05), BODY_DARK, rot=(0.22, 0, 0), bevel=0.02))
# Cowl induction yükselti kanatları
chassis_parts.append(E('cube', (0, -0.98, 0.94), (0.40, 0.34, 0.025), BODY, bevel=0.01))

# Kaput zırh takviyeleri & kaba kaynaklı çelik levhalar
for s in (-1, 1):
    chassis_parts.append(E('cube', (s * 0.56, -1.24, 0.94), (0.15, 0.38, 0.015), ARMOR, bevel=0.01))
    chassis_parts.append(E('cube', (s * 0.56, -1.24, 0.955), (0.02, 0.38, 0.01), STEEL))
    for k in range(4):
        chassis_parts.append(E('cube', (s * 0.68, -0.95 - k * 0.20, 0.96), (0.012, 0.012, 0.01), STEEL))

# Süperşarj Blower Bloğu (Kaputtan fırlayan devasa aşırı besleme)
chassis_parts.append(E('cube', (0, -1.25, 0.98), (0.22, 0.26, 0.04), ARMOR_DARK, bevel=0.01))
chassis_parts.append(E('cube', (0, -1.25, 1.05), (0.19, 0.22, 0.06), STEEL, bevel=0.015))
# Öne bakan üç boğazlı hava kepçesi
chassis_parts.append(E('cube', (0, -1.48, 1.07), (0.18, 0.06, 0.045), STEEL, bevel=0.01))
# 3 adet kırmızı kelebek hava sübap kapağı
for bx in (-0.08, 0.0, 0.08):
    chassis_parts.append(E('cyl', (bx, -1.54, 1.07), (0.028, 0.028, 0.012), BLOWER_RED, rot=(P / 2, 0, 0), seg=10))
# Ön tahrik kasnağı ve V-kayışı
chassis_parts.append(E('cyl', (0, -1.52, 0.98), (0.045, 0.045, 0.018), STEEL, rot=(P / 2, 0, 0), seg=12))
chassis_parts.append(E('cube', (0, -1.51, 0.98), (0.048, 0.012, 0.04), TIRE_MAT))

# --- E. Fastback Kabin, Zırh Vizörü & Kafes Pencereler ---
# Kabin ana gövdesi
chassis_parts.append(E('cube', (0, 0.15, 1.05), (0.69, 0.64, 0.17), BODY_DARK, bevel=0.03))

# Fastback tavan sacı ve C-sütunları
chassis_parts.append(E('cube', (0, 0.02, 1.24), (0.67, 0.52, 0.02), BODY, bevel=0.01))
# Arkaya doğru süzülen fastback tavan eğimi (Y: 0.55 .. 1.45)
chassis_parts.append(E('cube', (0, 0.82, 1.08), (0.67, 0.38, 0.02), BODY, rot=(-0.38, 0, 0), bevel=0.01))
for s in (-1, 1):
    chassis_parts.append(E('cube', (s * 0.63, 0.82, 1.08), (0.04, 0.38, 0.12), BODY, rot=(-0.38, 0, 0)))

# Ön Cam Zırh Vizörü
chassis_parts.append(E('cube', (0, -0.52, 1.04), (0.66, 0.11, 0.16), ARMOR, rot=(0.52, 0, 0), bevel=0.01))
# Sürücü tarafı (-X) dar vizör yarığı
chassis_parts.append(E('cube', (-0.24, -0.55, 1.07), (0.18, 0.02, 0.035), GLASS_ARM, rot=(0.52, 0, 0)))
chassis_parts.append(E('cube', (-0.24, -0.57, 1.10), (0.19, 0.015, 0.012), STEEL, rot=(0.52, 0, 0)))
# Yolcu tarafı kaynaklı zırh kapağı
chassis_parts.append(E('cube', (0.24, -0.55, 1.06), (0.20, 0.02, 0.10), RUST, rot=(0.52, 0, 0)))

# Yan Cam Boşlukları ve Çelik Güvenlik Kafesleri
for s in (-1, 1):
    chassis_parts.append(E('cube', (s * 0.695, 0.15, 1.08), (0.01, 0.50, 0.08), GLASS_ARM))
    chassis_parts.append(E('cube', (s * 0.705, 0.15, 1.08), (0.01, 0.50, 0.012), STEEL))
    for k in range(5):
        chassis_parts.append(E('cyl', (s * 0.71, -0.18 + k * 0.18, 1.08), (0.009, 0.009, 0.08), ARMOR_DARK, seg=6))

# Arka Cam Zırhlı Panjurları (Fastback Louvers - 4 kademe)
for k in range(4):
    y_louver = 0.65 + k * 0.16
    z_louver = 1.16 - k * 0.075
    chassis_parts.append(E('cube', (0, y_louver, z_louver), (0.61, 0.045, 0.014), ARMOR, rot=(-0.42, 0, 0)))

# --- F. Ön Izgara, Çene Spoyleri & Agresif Farlar ---
# Shark-nose gömme ızgara haznesi
chassis_parts.append(E('cube', (0, -1.98, 0.66), (0.75, 0.06, 0.12), ARMOR_DARK, bevel=0.01))
for k in (-0.05, 0.0, 0.05):
    chassis_parts.append(E('cube', (0, -2.00, 0.66 + k), (0.73, 0.012, 0.012), STEEL))
# 4 adet yuvarlak savaş farı
for s in (-1, 1):
    for offset_x in (0.62, 0.47):
        chassis_parts.append(E('cyl', (s * offset_x, -2.01, 0.67), (0.055, 0.055, 0.02), LIGHT_HEAD, rot=(P / 2, 0, 0), seg=12))
        chassis_parts.append(E('cube', (s * offset_x, -2.03, 0.67), (0.056, 0.008, 0.008), STEEL, rot=(0, 0, P / 4)))
        chassis_parts.append(E('cube', (s * offset_x, -2.03, 0.67), (0.056, 0.008, 0.008), STEEL, rot=(0, 0, -P / 4)))

# Ön alt tampon ve çene koruyucusu
chassis_parts.append(E('cube', (0, -2.04, 0.52), (0.88, 0.06, 0.07), ARMOR, bevel=0.02))

# --- G. Yan Egzoz Boruları (Side-Exit Zoomies) & Isı Kalkanı ---
for s in (-1, 1):
    # Kapı altı pervaz
    chassis_parts.append(E('cube', (s * 0.86, 0.0, 0.47), (0.03, 1.40, 0.05), ARMOR_DARK, bevel=0.01))
    # 3'lü kalın açılı egzoz çıkışı (X sınırı içinde kalacak şekilde ofset)
    for k in range(3):
        yp = 0.58 + k * 0.13
        zp = 0.49 + k * 0.02
        chassis_parts.append(E('cyl', (s * 0.86, yp, zp), (0.03, 0.03, 0.08), EXHAUST, rot=(s * 0.22, 1.25, 0), seg=8))
    # Delikli çelik ısı kalkanı
    chassis_parts.append(E('cube', (s * 0.92, 0.71, 0.51), (0.012, 0.24, 0.055), STEEL))

# --- H. Arka Kuyruk, Ducktail Spoyler & Stop Lambaları ---
# Bagaj kapağı ve entegre ducktail spoyler
chassis_parts.append(E('cube', (0, 1.68, 0.96), (0.78, 0.26, 0.035), BODY, bevel=0.02))
chassis_parts.append(E('cube', (0, 1.86, 1.01), (0.76, 0.05, 0.04), BODY, rot=(-0.25, 0, 0), bevel=0.01))

# Gömme arka panel ve klasik stop lambaları
chassis_parts.append(E('cube', (0, 1.90, 0.73), (0.78, 0.04, 0.13), BODY_DARK))
for s in (-1, 1):
    chassis_parts.append(E('cube', (s * 0.70, 1.92, 0.75), (0.065, 0.015, 0.03), LIGHT_TAIL))
    chassis_parts.append(E('cube', (s * 0.54, 1.92, 0.75), (0.065, 0.015, 0.03), LIGHT_TAIL))

# Alt arka tampon ve kurtarma mapası
chassis_parts.append(E('cube', (0, 1.90, 0.50), (0.84, 0.05, 0.07), ARMOR, bevel=0.02))
chassis_parts.append(E('cyl', (0, 1.93, 0.46), (0.045, 0.045, 0.025), STEEL, rot=(P / 2, 0, 0), seg=8))

# Tombstone için sağlam şasi montaj pabuçları
for s in (-1, 1):
    chassis_parts.append(E('cube', (s * 0.48, 1.92, 0.84), (0.04, 0.025, 0.22), STEEL))
    chassis_parts.append(E('cube', (s * 0.48, 1.93, 0.94), (0.045, 0.015, 0.04), ARMOR_DARK))


# ===========================================================================
# 5. KOPABİLİR PARÇA: PART_SPIKES (Ön Ağır Yarma Koçbaşı ve Mahmuzlar)
# ===========================================================================
# Ana V-yarma çelik gövdesi (Y: -2.05 .. -2.15)
spikes_parts.append(E('cube', (0, -2.08, 0.54), (0.82, 0.06, 0.09), ARMOR, bevel=0.02))
# Merkez yarma burnu
spikes_parts.append(E('cube', (0, -2.16, 0.54), (0.11, 0.05, 0.10), STEEL))

# 4 adet sertleştirilmiş çelik hücum mahmuzu (Y min: -2.26, güvenle >= -2.30)
for s in (-1, 1):
    # Dış büyük mahmuzlar (Y: -2.13'te, boy=0.20, uzanım -2.23)
    spikes_parts.append(E('cone', (s * 0.60, -2.13, 0.54), (0.06, 0.06, 0.10), STEEL, rot=(P / 2, 0, 0), seg=6))
    # İç delici mahmuzlar (Y: -2.15'te, boy=0.22, uzanım -2.26)
    spikes_parts.append(E('cone', (s * 0.25, -2.15, 0.54), (0.055, 0.055, 0.11), STEEL, rot=(P / 2, 0, 0), seg=6))
    # Çapraz takviye kılıçları
    spikes_parts.append(E('cube', (s * 0.42, -2.10, 0.54), (0.13, 0.03, 0.07), STEEL, rot=(0, 0, s * 0.25)))

# Alt yarma bıçağı / testere dişi plakası
spikes_parts.append(E('cube', (0, -2.14, 0.46), (0.62, 0.05, 0.016), STEEL))
# Montaj perçinleri
for s in (-1, 1):
    spikes_parts.append(E('cube', (s * 0.70, -2.06, 0.58), (0.018, 0.018, 0.018), STEEL))
    spikes_parts.append(E('cube', (s * 0.70, -2.06, 0.50), (0.018, 0.018, 0.018), STEEL))


# ===========================================================================
# 6. KOPABİLİR PARÇALAR: PART_ARMOR_L & PART_ARMOR_R (Kapı Zırh Plakaları)
# ===========================================================================
# --- Sol Kapı Zırhı (-X) ---
# Ana paslı zırh levhası
armor_l_parts.append(E('cube', (-0.89, 0.12, 0.78), (0.025, 0.52, 0.13), RUST, bevel=0.01))
# Üst balistik takviye katmanı
armor_l_parts.append(E('cube', (-0.91, 0.10, 0.80), (0.015, 0.38, 0.08), ARMOR))
# Çelik montaj omurgası ve perçinler (2 sıra 8 adet)
for k in range(4):
    yp = -0.28 + k * 0.26
    armor_l_parts.append(E('cube', (-0.925, yp, 0.83), (0.012, 0.012, 0.012), STEEL))
    armor_l_parts.append(E('cube', (-0.925, yp, 0.73), (0.012, 0.012, 0.012), STEEL))
# Üst kilit çengelleri
armor_l_parts.append(E('cube', (-0.90, -0.25, 0.88), (0.018, 0.035, 0.022), ARMOR_DARK))
armor_l_parts.append(E('cube', (-0.90, 0.45, 0.88), (0.018, 0.035, 0.022), ARMOR_DARK))

# --- Sağ Kapı Zırhı (+X) ---
armor_r_parts.append(E('cube', (0.89, 0.12, 0.78), (0.025, 0.52, 0.13), RUST, bevel=0.01))
armor_r_parts.append(E('cube', (0.91, 0.10, 0.80), (0.015, 0.38, 0.08), ARMOR))
for k in range(4):
    yp = -0.28 + k * 0.26
    armor_r_parts.append(E('cube', (0.925, yp, 0.83), (0.012, 0.012, 0.012), STEEL))
    armor_r_parts.append(E('cube', (0.925, yp, 0.73), (0.012, 0.012, 0.012), STEEL))
armor_r_parts.append(E('cube', (0.90, -0.25, 0.88), (0.018, 0.035, 0.022), ARMOR_DARK))
armor_r_parts.append(E('cube', (0.90, 0.45, 0.88), (0.018, 0.035, 0.022), ARMOR_DARK))


# ===========================================================================
# 7. KOPABİLİR PARÇA: PART_ROOF (Tavan Roll-Cage & Sis Projektör Barı)
# ===========================================================================
# Dış boru roll-cage ayakları (Roket kovanı bölgesi (0, +0.20, 1.66) tamamen AÇIK!)
for s in (-1, 1):
    roof_parts.append(E('cyl', (s * 0.58, -0.26, 1.32), (0.02, 0.02, 0.09), ARMOR_DARK, seg=8))
    roof_parts.append(E('cyl', (s * 0.58, 0.16, 1.34), (0.018, 0.018, 0.42), ARMOR_DARK, rot=(P / 2, 0, 0), seg=8))
    roof_parts.append(E('cyl', (s * 0.58, 0.60, 1.26), (0.018, 0.018, 0.14), ARMOR_DARK, rot=(-0.45, 0, 0), seg=8))

# Ön Projektör Zırh Kutusu & Siperliği
roof_parts.append(E('cube', (0, -0.28, 1.35), (0.46, 0.05, 0.038), ARMOR_DARK, bevel=0.01))
roof_parts.append(E('cube', (0, -0.32, 1.38), (0.47, 0.015, 0.015), STEEL))

# 4 adet yüksek güçlü sis projektörü (Spotlights)
for k in range(4):
    spot_x = -0.30 + k * 0.20
    roof_parts.append(E('cyl', (spot_x, -0.29, 1.35), (0.035, 0.035, 0.025), LIGHT_HEAD, rot=(P / 2, 0, 0), seg=10))
    roof_parts.append(E('cyl', (spot_x, -0.27, 1.35), (0.040, 0.040, 0.018), ARMOR, rot=(P / 2, 0, 0), seg=10))


# ===========================================================================
# 8. KOPABİLİR PARÇA: PART_TOMBSTONE (Arka Ağır Mezar Taşı Kalkanı)
# ===========================================================================
# Kalın çok katmanlı ana çelik levha (hafif açılı balistik deflektör, Y max ~2.02, güvenle <= 2.05)
tombstone_parts.append(E('cube', (0, 1.94, 0.86), (0.84, 0.035, 0.25), ARMOR, rot=(-0.10, 0, 0), bevel=0.02))
# Orta ağır paslı levha katmanı
tombstone_parts.append(E('cube', (0, 1.965, 0.86), (0.65, 0.015, 0.21), RUST, rot=(-0.10, 0, 0)))

# İki adet dikey ağır çelik I-kiriş takviyesi
for s in (-1, 1):
    tombstone_parts.append(E('cube', (s * 0.46, 1.975, 0.86), (0.04, 0.022, 0.23), ARMOR_DARK, rot=(-0.10, 0, 0)))
    for k in range(4):
        zp = 0.68 + k * 0.12
        tombstone_parts.append(E('cube', (s * 0.46, 1.992, zp), (0.015, 0.010, 0.015), STEEL, rot=(-0.10, 0, 0)))

# Üst kaldırma / montaj mapaları
for s in (-1, 1):
    tombstone_parts.append(E('cyl', (s * 0.38, 1.95, 1.11), (0.028, 0.028, 0.018), STEEL, rot=(0, P / 2, 0), seg=8))


# ===========================================================================
# 9. NESNELERİ BİRLEŞTİR (JOIN) VE HAZIRLA
# ===========================================================================
chassis        = join(chassis_parts, 'chassis')
part_spikes    = join(spikes_parts, 'part_spikes')
part_armor_l   = join(armor_l_parts, 'part_armor_l')
part_armor_r   = join(armor_r_parts, 'part_armor_r')
part_roof      = join(roof_parts, 'part_roof')
part_tombstone = join(tombstone_parts, 'part_tombstone')

body_objects = [chassis, part_spikes, part_armor_l, part_armor_r, part_roof, part_tombstone]
for o in body_objects:
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.shade_flat()


# ===========================================================================
# 10. TEKERLEK (WHEEL.GLB)
# ===========================================================================
bpy.ops.object.select_all(action='DESELECT')
wparts = []

# Lastik ana kütüğü (R=0.38, W=0.30 -> X genişliği: -0.15 .. +0.15)
wparts.append(E('cyl', (0, 0, 0), (0.38, 0.38, 0.15), TIRE_MAT, rot=(0, P / 2, 0), seg=24, bevel=0.03))

# 16 adet açılı chevron / blok arazi tırnağı
for k in range(16):
    a = k * 2 * P / 16
    wparts.append(E('cube', (0, math.cos(a) * 0.378, math.sin(a) * 0.378), (0.138, 0.038, 0.024), TIRE_MAT, rot=(a, 0, 0)))

# Derin çanak çelik ralli jantı (Steel Deep-Dish Rim)
wparts.append(E('cyl', (0, 0, 0), (0.27, 0.27, 0.14), STEEL, rot=(0, P / 2, 0), seg=18))

# Her iki yana (Sol ve Sağ) bakan simetrik detaylar
for s_side in (-1, 1):
    wparts.append(E('cyl', (s_side * 0.14, 0, 0), (0.15, 0.15, 0.02), ARMOR_DARK, rot=(0, P / 2, 0), seg=14))
    for k in range(5):
        a = k * 2 * P / 5
        wparts.append(E('cube', (s_side * 0.154, math.cos(a) * 0.095, math.sin(a) * 0.095), (0.016, 0.016, 0.016), STEEL))
    wparts.append(E('cone', (s_side * 0.165, 0, 0), (0.045, 0.045, 0.042), STEEL, rot=(0, s_side * P / 2, 0), seg=8))

wheel = join(wparts, 'wheel')
bpy.context.view_layer.objects.active = wheel
bpy.ops.object.shade_flat()


# ===========================================================================
# 11. DOĞRULAMA (ASSERTION AUDIT) BLOĞU
# ===========================================================================
print('=' * 60)
print('TEKNİK SÖZLEŞME VE KURAL DOĞRULAMA DENETİMİ BAŞLIYOR...')
print('=' * 60)

# Kural 1: 6 nesne adının birebir varlığı
expected_names = {'chassis', 'part_spikes', 'part_armor_l', 'part_armor_r', 'part_roof', 'part_tombstone'}
found_names = {o.name for o in body_objects}
assert expected_names == found_names, f"HATA: Beklenen nesne adları eşleşmiyor! Bulunan: {found_names}"
assert 'wheel' in bpy.data.objects, "HATA: 'wheel' nesnesi bulunamadı!"
print("✓ 6 gövde nesnesi ve 'wheel' eksiksiz mevcut.")

# Kural 2: Zorunlu malzemelerin varlığı ve chassis üzerinde T_Govde kullanımı
mandatory_mats = {'T_Govde', 'GovdeKoyu', 'Far', 'StopIsigi'}
existing_mats = set(bpy.data.materials.keys())
assert mandatory_mats.issubset(existing_mats), f"HATA: Zorunlu malzemeler eksik! Eksik olanlar: {mandatory_mats - existing_mats}"
chassis_mat_names = {slot.material.name for slot in chassis.material_slots if slot.material}
assert 'T_Govde' in chassis_mat_names, "HATA: 'T_Govde' malzemesi chassis nesnesi üzerinde kullanılmamış!"
print("✓ Zorunlu malzemeler (T_Govde, GovdeKoyu, Far, StopIsigi) mevcut ve chassis'te T_Govde aktif.")

# Kural 3: Malzeme sayısı en fazla 12 olmalı
total_mat_count = len(bpy.data.materials)
assert total_mat_count <= 12, f"HATA: Toplam malzeme bütçesi aşıldı! Mevcut: {total_mat_count}, Maksimum: 12"
print(f"✓ Malzeme sayısı bütçe içinde: {total_mat_count}/12 malzeme.")

# Kural 4: Üçgen bütçesi (car_body <= 12.000 tris, wheel <= 1.200 tris)
body_tris = 0
for o in body_objects:
    o_tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    print(f"  - {o.name}: {o_tris} üçgen")
    body_tris += o_tris

wheel_tris = sum(len(p.vertices) - 2 for p in wheel.data.polygons)
print(f"  - wheel: {wheel_tris} üçgen")
print(f"  TOPLAM GÖVDE: {body_tris} üçgen (Bütçe: <= 12.000)")
print(f"  TOPLAM TEKERLEK: {wheel_tris} üçgen (Bütçe: <= 1.200)")
assert body_tris <= 12000, f"HATA: Gövde üçgen bütçesi aşıldı! {body_tris} > 12000"
assert wheel_tris <= 1200, f"HATA: Tekerlek üçgen bütçesi aşıldı! {wheel_tris} > 1200"

# Kural 5: Gövde sınırlayıcı kutusu (Bounding box) kontrolü
# Zarf: X: -1.00..+1.00, Y: -2.30..+2.05, Z: 0.40..1.45
min_coords = [float('inf')] * 3
max_coords = [float('-inf')] * 3
for o in body_objects:
    for v in o.bound_box:
        w_v = o.matrix_world @ mathutils.Vector(v)
        for i in range(3):
            min_coords[i] = min(min_coords[i], w_v[i])
            max_coords[i] = max(max_coords[i], w_v[i])

print(f"Gövde Zarfı Ölçüleri: X[{min_coords[0]:.3f} .. {max_coords[0]:.3f}], Y[{min_coords[1]:.3f} .. {max_coords[1]:.3f}], Z[{min_coords[2]:.3f} .. {max_coords[2]:.3f}]")

assert min_coords[0] >= -1.00, f"HATA: Sol sınır aşıldı! Min X: {min_coords[0]:.3f}"
assert max_coords[0] <=  1.00, f"HATA: Sağ sınır aşıldı! Max X: {max_coords[0]:.3f}"
assert min_coords[1] >= -2.30, f"HATA: Ön sınır aşıldı! Min Y: {min_coords[1]:.3f}"
assert max_coords[1] <=  2.05, f"HATA: Arka sınır aşıldı! Max Y: {max_coords[1]:.3f}"
assert min_coords[2] >=  0.40, f"HATA: Alt sınır aşıldı! Min Z: {min_coords[2]:.3f}"
assert max_coords[2] <=  1.45, f"HATA: Üst sınır aşıldı! Max Z: {max_coords[2]:.3f}"
print("✓ Gövde sınırlayıcı kutusu kurallara %100 uyuyor!")
print('=' * 60)


# ===========================================================================
# 12. SAHNE IŞIKLANDIRMASI VE İNCELEME RENDERLARI
# ===========================================================================
# Nötr gri zemin (mevcut zırh malzemesiyle boyanır, 12 malzeme sınırı korunur)
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.001))
ground = bpy.context.object
ground.name = 'Zemin'
ground.data.materials.append(ARMOR_DARK)

# Stüdyo Işıkları
bpy.ops.object.light_add(type='SUN', location=(5, -4, 7), rotation=(math.radians(52), 0, math.radians(38)))
bpy.context.object.data.energy = 3.2

bpy.ops.object.light_add(type='AREA', location=(-4, 3, 4))
bpy.context.object.data.energy = 55
bpy.context.object.data.size = 6

sc.world = bpy.data.worlds.new('w')
sc.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.84, 0.86, 0.90, 1.0)
sc.view_settings.view_transform = 'Standard'
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x, sc.render.resolution_y = 1400, 900


def cam(loc, tgt, lens, path):
    for o in [o for o in bpy.data.objects if o.type == 'CAMERA' or o.name == 'tgt']:
        bpy.data.objects.remove(o)
    bpy.ops.object.empty_add(location=tgt)
    t = bpy.context.object
    t.name = 'tgt'
    bpy.ops.object.camera_add(location=loc)
    c = bpy.context.object
    c.data.lens = lens
    sc.camera = c
    tc = c.constraints.new('TRACK_TO')
    tc.target = t
    tc.track_axis = 'TRACK_NEGATIVE_Z'
    tc.up_axis = 'UP_Y'
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


# Render için tekerlekleri 4 köşeye yerleştir
wheel.location = (1.0, -1.45, 0.38)
wheel_copies = []
for wx, wy in ((-1.0, -1.45), (1.0, 1.45), (-1.0, 1.45)):
    wc = wheel.copy()
    wc.data = wheel.data
    wc.location = (wx, wy, 0.38)
    sc.collection.objects.link(wc)
    wheel_copies.append(wc)

# 5 Standart Görünüm Renderı
cam((0, 0, 8.5), (0, 0, 0.7), 45, os.path.join(out, 'car_top.png'))
cam((3.8, -4.8, 1.8), (0, -0.2, 0.65), 38, os.path.join(out, 'car_34.png'))
cam((0, -5.8, 0.75), (0, 0, 0.65), 45, os.path.join(out, 'car_front.png'))
cam((5.4, 0, 1.0), (0, 0, 0.65), 45, os.path.join(out, 'car_side.png'))
cam((3.8, 4.8, 1.8), (0, 0.2, 0.65), 38, os.path.join(out, 'car_rear.png'))

# 6. Patlatılmış / Ayrılmış Parçalar Renderı (car_exploded.png)
# Her part_* kendi yönünde 0.4 m dışarı kaydırılır
part_spikes.location.y -= 0.4
part_tombstone.location.y += 0.4
part_armor_l.location.x -= 0.4
part_armor_r.location.x += 0.4
part_roof.location.z += 0.4

cam((4.4, -4.6, 2.4), (0, -0.1, 0.75), 36, os.path.join(out, 'car_exploded.png'))

# Konumları eski haline getir
part_spikes.location.y += 0.4
part_tombstone.location.y -= 0.4
part_armor_l.location.x += 0.4
part_armor_r.location.x -= 0.4
part_roof.location.z -= 0.4


# ===========================================================================
# 13. DIŞA AKTARIMLAR (GLB & BLEND)
# ===========================================================================
# Render için oluşturulan geçici nesneleri temizle
for wc in wheel_copies:
    bpy.data.objects.remove(wc)
bpy.data.objects.remove(ground)

# Blend dosyasını kaydet
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, 'car.blend'))

# Tekerleği GLB ihracı için orijine çek
wheel.location = (0, 0, 0)

# car_body.glb (Yalnızca 6 parça seçili)
bpy.ops.object.select_all(action='DESELECT')
for o in body_objects:
    o.select_set(True)
bpy.context.view_layer.objects.active = chassis
bpy.ops.export_scene.gltf(
    filepath=os.path.join(out, 'car_body.glb'),
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_yup=True
)

# wheel.glb (Yalnızca wheel seçili)
bpy.ops.object.select_all(action='DESELECT')
wheel.select_set(True)
bpy.context.view_layer.objects.active = wheel
bpy.ops.export_scene.gltf(
    filepath=os.path.join(out, 'wheel.glb'),
    export_format='GLB',
    use_selection=True,
    export_apply=False,
    export_yup=True
)

print('=' * 60)
print('TÜM GLB MODELLERİ VE RENDERLAR BAŞARIYLA TAMAMLANDI!')
print(f"Çıktı Dizini: {out}")
print('=' * 60)
