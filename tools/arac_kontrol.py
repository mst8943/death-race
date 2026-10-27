"""Araç modeli kural kontrolü (docs/ARAC_KURALLARI.md).

Kullanım:  python tools/arac_kontrol.py araclar/benim_aracim.glb

Yalnızca Python'un kendi kütüphanelerini kullanır (kurulum gerekmez).
Oyunun modelde neyi tanıyacağını ve hangi kuralın bozulduğunu yazar.
"""
import json
import math
import struct
import sys

PARTS = ['part_spikes', 'part_armor_l', 'part_armor_r', 'part_roof', 'part_tombstone']
ANCHORS = ['anchor_gun_l', 'anchor_gun_r', 'anchor_rocket']
BODY_TRI_BUDGET = 12000
WHEEL_TRI_BUDGET = 1200   # tekerlek başına
MAX_MATERIALS = 12
MAX_TEXTURE_BYTES = 1_000_000


def read_glb(path):
    with open(path, 'rb') as f:
        data = f.read()
    magic, _version, _length = struct.unpack_from('<4sII', data, 0)
    if magic != b'glTF':
        raise ValueError('GLB dosyası değil')
    off, gltf, binc = 12, None, b''
    while off < len(data):
        clen, ctype = struct.unpack_from('<I4s', data, off)
        chunk = data[off + 8: off + 8 + clen]
        if ctype == b'JSON':
            gltf = json.loads(chunk)
        elif ctype == b'BIN\x00':
            binc = chunk
        off += 8 + clen
    return gltf, binc


def mat_mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def node_matrix(n):
    if 'matrix' in n:
        m = n['matrix']  # sütun öncelikli
        return [[m[c * 4 + r] for c in range(4)] for r in range(4)]
    tx, ty, tz = n.get('translation', [0, 0, 0])
    x, y, z, w = n.get('rotation', [0, 0, 0, 1])
    sx, sy, sz = n.get('scale', [1, 1, 1])
    r = [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ]
    return [
        [r[0][0] * sx, r[0][1] * sy, r[0][2] * sz, tx],
        [r[1][0] * sx, r[1][1] * sy, r[1][2] * sz, ty],
        [r[2][0] * sx, r[2][1] * sy, r[2][2] * sz, tz],
        [0, 0, 0, 1],
    ]


def transform(m, p):
    return [sum(m[i][k] * p[k] for k in range(3)) + m[i][3] for i in range(3)]


def main(path):
    gltf, _ = read_glb(path)
    nodes = gltf.get('nodes', [])
    meshes = gltf.get('meshes', [])
    accessors = gltf.get('accessors', [])
    materials = gltf.get('materials', [])
    errors, warnings = [], []

    # Her düğümün dünya matrisi ve kendi adıyla başlayan "kök" adı (alt düğümler ebeveynin adına sayılır)
    world, owner = {}, {}

    def walk(i, parent_m, parent_owner):
        n = nodes[i]
        m = mat_mul(parent_m, node_matrix(n))
        name = n.get('name', '')
        own = name if name.startswith(('part_', 'wheel_', 'anchor_')) else parent_owner
        world[i], owner[i] = m, own
        for c in n.get('children', []):
            walk(c, m, own)

    ident = [[1 if i == j else 0 for j in range(4)] for i in range(4)]
    scene = gltf.get('scenes', [{}])[gltf.get('scene', 0)]
    for r in scene.get('nodes', []):
        walk(r, ident, '')

    bmin, bmax = [math.inf] * 3, [-math.inf] * 3
    tris = {}  # sahip adı → üçgen
    wheel_boxes = {}
    used_mats = set()
    for i, n in world.items():
        node = nodes[i]
        if 'mesh' not in node:
            continue
        own = owner[i] or 'gövde'
        for prim in meshes[node['mesh']]['primitives']:
            pos = accessors[prim['attributes']['POSITION']]
            count = accessors[prim['indices']]['count'] if 'indices' in prim else pos['count']
            if prim.get('mode', 4) == 4:
                tris[own] = tris.get(own, 0) + count // 3
            if 'material' in prim:
                used_mats.add(prim['material'])
            lo, hi = pos.get('min'), pos.get('max')
            if not lo:
                continue
            for cx in (lo[0], hi[0]):
                for cy in (lo[1], hi[1]):
                    for cz in (lo[2], hi[2]):
                        p = transform(n, [cx, cy, cz])
                        for k in range(3):
                            bmin[k] = min(bmin[k], p[k]); bmax[k] = max(bmax[k], p[k])
                        if own.startswith('wheel_'):
                            b = wheel_boxes.setdefault(own, [[math.inf] * 3, [-math.inf] * 3])
                            for k in range(3):
                                b[0][k] = min(b[0][k], p[k]); b[1][k] = max(b[1][k], p[k])

    size = [bmax[k] - bmin[k] for k in range(3)]
    print(f'\n== {path} ==')
    print(f'Boyut (genişlik × yükseklik × boy): {size[0]:.2f} × {size[1]:.2f} × {size[2]:.2f}')
    if 2.5 <= size[2] <= 8:
        print('Ölçek: metre kabul edilir (oyun büyütmez/küçültmez)')
    else:
        warnings.append(f'Boy {size[2]:.2f}: 2.5–8 m dışında, oyun aracı 4.3 m boya ölçekler (gerçek boyu farklıysa 1 birim = 1 metre olarak dışa aktar).')
    if size[0] > size[2]:
        errors.append('Araç X ekseninde Z ekseninden uzun: önü +Z (Blender\'da −Y) yönüne bakmıyor olabilir.')
    if size[0] > 2.6:
        warnings.append(f'Genişlik {size[0]:.2f} m: 2.6 m üstü pistte rakiplerle sığmayabilir.')

    names = [n.get('name', '') for n in nodes]
    wheels = sorted(set(o for o in owner.values() if o.startswith('wheel_')))
    parts = [p for p in PARTS if p in names]
    anchors = [a for a in ANCHORS if a in names]
    mat_names = [materials[m].get('name', '') for m in used_mats]
    auto = not any(n.startswith(('wheel_', 'part_')) for n in names)

    # Tekerlekler
    if len(wheels) == 4:
        print('Tekerlek: 4 ✓ (dönecek, direksiyonla dönecek, fizik bu konumlara uyacak)')
        cx = sum((wheel_boxes[w][0][0] + wheel_boxes[w][1][0]) / 2 for w in wheels) / 4
        cz = sum((wheel_boxes[w][0][2] + wheel_boxes[w][1][2]) / 2 for w in wheels) / 4
        corners = set()
        for w in wheels:
            lo, hi = wheel_boxes[w]
            r = (hi[1] - lo[1]) / 2
            c = [(lo[k] + hi[k]) / 2 for k in range(3)]
            corners.add((c[0] > cx, c[2] > cz))
            print(f'   {w}: merkez ({c[0]:+.2f}, {c[1]:.2f}, {c[2]:+.2f}), yarıçap {r:.2f}')
            if abs(c[1] - r - bmin[1]) > 0.05:
                warnings.append(f'{w} yere değmiyor: alt kenarı aracın en alt noktasından {c[1] - r - bmin[1]:.2f} m yukarıda.')
            if not 0.25 <= r <= 0.7:
                warnings.append(f'{w} yarıçapı {r:.2f} m: 0.25–0.70 dışında, sürüş hissi çok değişir.')
        if len(corners) != 4:
            errors.append('Tekerlekler dört köşeye dağılmamış (sol-ön, sağ-ön, sol-arka, sağ-arka birer tane olmalı).')
    elif wheels:
        errors.append(f'{len(wheels)} tekerlek bulundu ({", ".join(wheels)}); tam 4 olmalı.')
    else:
        if not any(n.startswith('part_') for n in names):
            print('Tekerlek: ayrı değil → oyun aracı yüklerken OTOMATİK BÖLECEK (tekerlek, parça, boya)')
        else:
            warnings.append('wheel_* yok ama part_* var: elle bölünmüş sayılır, otomatik bölme yapılmaz; tekerlekler dönmez.')

    if auto:
        print('Parçalar ve boya: oyun otomatik bölerken oluşturacak')
    else:
        print(f'Kopabilir parçalar: {len(parts)}/5 {", ".join(parts) or "-"}')
        for p in PARTS:
            if p not in parts:
                print(f'   eksik: {p} (bu parça kopmaz, HUD\'da görünmez)')
        print(f'Boya: {"T_Govde ✓" if "T_Govde" in mat_names else "✗ (garaj boyası işlemez)"}'
              f'{" · GovdeKoyu ✓" if "GovdeKoyu" in mat_names else ""}')
    if 'T_Govde' not in mat_names and any(n.startswith(('wheel_', 'part_')) for n in names):
        warnings.append('T_Govde malzemesi yok: garajdaki boya ve rakip renkleri işlemez.')
    print(f'Silah yerleri: {len(anchors)}/3 {", ".join(anchors) or "- (oyun varsayılan yerleri kullanır)"}')

    # Bütçe
    body_tris = sum(v for k, v in tris.items() if not k.startswith('wheel_'))
    print(f'Üçgen: gövde+parçalar {body_tris}' + ''.join(f', {w} {tris.get(w, 0)}' for w in wheels))
    if body_tris > BODY_TRI_BUDGET:
        warnings.append(f'Gövde {body_tris} üçgen: bütçe {BODY_TRI_BUDGET} (telefonda 5 araç birlikte çizilir).')
    for w in wheels:
        if tris.get(w, 0) > WHEEL_TRI_BUDGET:
            warnings.append(f'{w} {tris[w]} üçgen: tekerlek başına bütçe {WHEEL_TRI_BUDGET}.')
    print(f'Malzeme: {len(used_mats)} ({", ".join(mat_names) or "adsız"})')
    if len(used_mats) > MAX_MATERIALS:
        warnings.append(f'{len(used_mats)} malzeme: en fazla {MAX_MATERIALS}.')
    if any(not n for n in mat_names) and not auto:
        warnings.append('Adsız malzeme var: boya/far gibi özellikler malzeme adıyla bulunur.')
    for i, img in enumerate(gltf.get('images', [])):
        bv = gltf['bufferViews'][img['bufferView']] if 'bufferView' in img else None
        size_b = bv['byteLength'] if bv else 0
        print(f'Doku {i}: {img.get("mimeType", "?")} {size_b // 1024} KB')
        if size_b > MAX_TEXTURE_BYTES:
            warnings.append(f'Doku {i} {size_b // 1024} KB: 1 MB altı olmalı (en fazla 1024×1024).')

    print()
    for e in errors:
        print('HATA  :', e)
    for w in warnings:
        print('UYARI :', w)
    if not errors and not warnings:
        print('Tüm kurallara uyuyor ✓')
    return 1 if errors else 0


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    rc = 0
    for p in sys.argv[1:]:
        rc |= main(p)
    sys.exit(rc)
