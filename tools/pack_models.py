"""GLB modellerini mobil için hafifletip js/models/<ad>.js içine gömer.

Kullanım:  python tools/pack_models.py
- models/*.glb okunur, gömülü dokular MAX_TEX pikseline küçültülür
  (saydamlık yoksa JPEG, varsa PNG), sonuç base64 olarak JS dosyasına yazılır.
- JS dosyası <script> ile yüklenir; böylece file:// ve Flutter WebView'de fetch gerekmez.
"""
import base64, io, json, os, struct, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'models')
DST = os.path.join(ROOT, 'js', 'models')
MAX_TEX = {'buildings': 256}          # model adına özel doku sınırı
DEFAULT_TEX = 512


def read_glb(path):
    b = open(path, 'rb').read()
    magic, ver, total = struct.unpack('<III', b[:12])
    assert magic == 0x46546C67, 'GLB değil: ' + path
    off, js, binc = 12, None, b''
    while off < total:
        ln, typ = struct.unpack('<II', b[off:off + 8])
        chunk = b[off + 8:off + 8 + ln]
        if typ == 0x4E4F534A: js = json.loads(chunk)
        elif typ == 0x004E4942: binc = chunk
        off += 8 + ln
    return js, binc


def shrink(data, limit):
    im = Image.open(io.BytesIO(data))
    im.load()
    has_alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
    if has_alpha:
        im = im.convert('RGBA')
        if im.getextrema()[3][0] == 255: has_alpha = False
    if not has_alpha: im = im.convert('RGB')
    if max(im.size) > limit:
        k = limit / max(im.size)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = io.BytesIO()
    if has_alpha:
        im.save(out, 'PNG', optimize=True); mime = 'image/png'
    else:
        im.save(out, 'JPEG', quality=82, optimize=True); mime = 'image/jpeg'
    return out.getvalue(), mime


def pack(name):
    js, binc = read_glb(os.path.join(SRC, name + '.glb'))
    limit = MAX_TEX.get(name, DEFAULT_TEX)
    img_views = {}
    for img in js.get('images', []):
        if 'bufferView' in img:
            v = js['bufferViews'][img['bufferView']]
            raw = binc[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
            data, mime = shrink(raw, limit)
            img_views[img['bufferView']] = data
            img['mimeType'] = mime
    out = bytearray()
    for i, v in enumerate(js['bufferViews']):
        data = img_views.get(i)
        if data is None:
            o = v.get('byteOffset', 0); data = binc[o:o + v['byteLength']]
        while len(out) % 4: out.append(0)
        v['byteOffset'] = len(out); v['byteLength'] = len(data); v['buffer'] = 0
        out += data
    while len(out) % 4: out.append(0)
    js['buffers'] = [{'byteLength': len(out)}]
    jb = json.dumps(js, separators=(',', ':')).encode()
    while len(jb) % 4: jb += b' '
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(jb) + 8 + len(out))
    glb += struct.pack('<II', len(jb), 0x4E4F534A) + jb + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
    os.makedirs(DST, exist_ok=True)
    with open(os.path.join(DST, name + '.js'), 'w', encoding='ascii') as f:
        f.write("(window.GLB=window.GLB||{})['%s']='%s';\n" % (name, base64.b64encode(glb).decode()))
    credit = js.get('asset', {}).get('extras', {})
    print('%-28s %6.1f KB  (%s, %s)' % (name, len(glb) / 1024, credit.get('author', '?'), credit.get('license', '?')))


if __name__ == '__main__':
    names = sys.argv[1:] or [f[:-4] for f in sorted(os.listdir(SRC)) if f.endswith('.glb')]
    for n in names: pack(n)
