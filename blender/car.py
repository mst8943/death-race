"""Death Race — özgün savaş arabası.
Modüler parçalanma sistemi: Şasi + Tombstone + Ön Mahmuzlar + Yan Zırhlar + Tavan Barı
Çıktı: car_body.glb (içinde isimlendirilmiş modüler parçalar), wheel.glb, render PNG'leri, car.blend
"""
import bpy, math, sys, os

P = math.pi
out = os.path.abspath(sys.argv[sys.argv.index('--') + 1])
os.makedirs(out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


def _lin(c):
    return tuple(((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in c)


def mat(name, rgb, rough=0.55, metal=0.0, emit=None):
    rgb = _lin(rgb)
    if emit: emit = _lin(emit)
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = 1.8
    return m


def E(kind, loc, scale, m, rot=(0, 0, 0), bevel=0.0, seg=12):
    if kind == 'cube': bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    elif kind == 'cyl': bpy.ops.mesh.primitive_cylinder_add(location=loc, rotation=rot, vertices=seg)
    elif kind == 'cone': bpy.ops.mesh.primitive_cone_add(location=loc, rotation=rot, vertices=seg)
    else: bpy.ops.mesh.primitive_uv_sphere_add(location=loc, rotation=rot, segments=seg, ring_count=max(5, seg // 2))
    o = bpy.context.object
    o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    if bevel:
        bv = o.modifiers.new('b', 'BEVEL'); bv.width = bevel; bv.segments = 2
        bpy.ops.object.modifier_apply(modifier='b')
    bpy.ops.object.shade_flat()
    return o


def join(objs, name):
    if not objs: return None
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    return o


# ---------- Malzemeler ----------
BODY   = mat('T_Govde', (.35, .06, .05), .55)
BODY_D = mat('GovdeKoyu', (.17, .03, .03), .65)
ARM    = mat('Zirh', (.13, .14, .16), .48, .45)
ARM_D  = mat('ZirhKoyu', (.06, .06, .07), .65, .30)
STEEL  = mat('Celik', (.32, .34, .36), .32, .85)
RUST   = mat('Pas', (.40, .18, .07), .88, .05)
GLASS  = mat('CamZirh', (.03, .05, .07), .20, .20)
LIGHTM = mat('Far', (1, .95, .8), .20, emit=(1, .88, .55))
TAIL   = mat('StopIsigi', (.85, .04, .04), .25, emit=(.95, .04, .02))
EXH    = mat('Egzoz', (.22, .22, .24), .40, .75)
TIREM  = mat('T_Lastik', (.04, .04, .04), .85)
RIM    = mat('Jant', (.25, .26, .28), .35, .75)
BLOWER_RED = mat('BlowerKapak', (.75, .10, .05), .4, emit=(.6, .08, .04))

# Modüler parça listeleri
chassis_parts = []
roof_parts = []
tombstone_parts = []
spikes_parts = []
armor_l_parts = []
armor_r_parts = []

# ==========================================================
# 1. ALT ŞASİ & ANA MONOLİTİK GÖVDE (Chassis)
# ==========================================================
chassis_parts.append(E('cube', (0, 0, .56), (.88, 1.95, .10), ARM_D, bevel=.03))
chassis_parts.append(E('cube', (0, 0, .76), (.88, 1.90, .12), BODY, bevel=.04))

# Geniş çamurluklar
for s in (-1, 1):
    chassis_parts.append(E('cube', (s * .92, -1.45, .76), (.06, .45, .11), BODY, bevel=.03))
    chassis_parts.append(E('cube', (s * .92, 1.45, .77), (.06, .48, .12), BODY, bevel=.03))

# Ön kaput & Supercharger
chassis_parts.append(E('cube', (0, -1.25, .93), (.82, .65, .05), BODY, bevel=.03))
chassis_parts.append(E('cube', (0, -1.82, .83), (.80, .10, .06), BODY_D, rot=(.25, 0, 0), bevel=.02))
chassis_parts.append(E('cube', (0, -1.15, 1.02), (.24, .30, .06), ARM_D, bevel=.02))
chassis_parts.append(E('cube', (0, -1.46, 1.03), (.22, .03, .04), STEEL))
for s in (-1, 1):
    chassis_parts.append(E('cyl', (s * .07, -1.48, 1.03), (.03, .03, .015), BLOWER_RED, rot=(P / 2, 0, 0), seg=10))

# Kaput zırh plakaları & perçinleri
for s in (-1, 1):
    chassis_parts.append(E('cube', (s * .55, -1.20, .99), (.18, .40, .015), ARM, bevel=.01))
    for k in range(3):
        chassis_parts.append(E('cube', (s * .70, -.90 - k * .30, 1.01), (.015, .015, .012), ARM_D))

# Kabin, vizör & pencereler
chassis_parts.append(E('cube', (0, .18, 1.06), (.72, .68, .18), BODY_D, bevel=.03))
chassis_parts.append(E('cube', (0, -.52, 1.02), (.68, .12, .17), GLASS, rot=(.50, 0, 0), bevel=.01))
chassis_parts.append(E('cube', (0, -.54, 1.04), (.69, .02, .05), ARM, rot=(.50, 0, 0)))
chassis_parts.append(E('cube', (0, -.60, 1.12), (.69, .02, .04), ARM, rot=(.50, 0, 0)))
chassis_parts.append(E('cube', (-.22, -.57, 1.07), (.18, .03, .02), STEEL, rot=(.50, 0, 0)))

for s in (-1, 1):
    chassis_parts.append(E('cube', (s * .725, .18, 1.09), (.01, .55, .09), GLASS))
    for k in range(4):
        chassis_parts.append(E('cyl', (s * .735, -.15 + k * .22, 1.09), (.01, .01, .09), ARM_D, seg=6))

chassis_parts.append(E('cube', (0, .88, 1.01), (.68, .11, .15), GLASS, rot=(-.48, 0, 0), bevel=.01))
for k in range(3):
    chassis_parts.append(E('cube', (0, .80 + k * .08, 1.10 - k * .06), (.69, .035, .015), ARM, rot=(-.48, 0, 0)))

chassis_parts.append(E('cube', (0, .18, 1.25), (.71, .62, .015), ARM, bevel=.01))
chassis_parts.append(E('cube', (0, 1.40, .92), (.84, .50, .04), BODY, bevel=.02))
chassis_parts.append(E('cube', (0, 1.88, 1.01), (.82, .06, .05), ARM, rot=(-.18, 0, 0), bevel=.02))

# Ön ana tampon ve ızgara
chassis_parts.append(E('cube', (0, -1.98, .54), (.95, .10, .15), ARM, bevel=.03))
chassis_parts.append(E('cube', (0, -2.03, .64), (.85, .05, .05), ARM_D, bevel=.02))
chassis_parts.append(E('cube', (0, -1.92, .68), (.65, .02, .08), ARM_D))
for s in (-1, 1):
    chassis_parts.append(E('cyl', (s * .70, -1.94, .68), (.075, .075, .03), LIGHTM, rot=(P / 2, 0, 0), seg=12))
    chassis_parts.append(E('cube', (s * .70, -1.98, .68), (.08, .01, .01), ARM_D))
    chassis_parts.append(E('cube', (s * .70, -1.98, .68), (.01, .01, .08), ARM_D))

# Arka stoplar, kanca, basamaklar ve egzozlar
for s in (-1, 1):
    chassis_parts.append(E('cube', (s * .78, 1.94, .68), (.06, .02, .03), TAIL))
    chassis_parts.append(E('cube', (s * .68, 1.94, .68), (.03, .02, .03), TAIL))
chassis_parts.append(E('cyl', (0, 1.96, .45), (.05, .05, .03), STEEL, rot=(P / 2, 0, 0), seg=8))

for s in (-1, 1):
    chassis_parts.append(E('cube', (s * .91, .0, .46), (.04, 1.60, .07), ARM_D, bevel=.02))
    for k in range(3):
        yp = .65 + k * .14
        zp = .48 + k * .03
        chassis_parts.append(E('cyl', (s * .92, yp, zp), (.032, .032, .09), EXH, rot=(s * .25, 1.25, 0), seg=8))

# ==========================================================
# 2. KOPABİLİR PARÇA: TAVAN ROLL-CAGE & PROJEKTÖRLER
# ==========================================================
for s in (-1, 1):
    roof_parts.append(E('cyl', (s * .55, .16, 1.32), (.018, .018, .10), ARM_D, rot=(P / 2, 0, 0), seg=8))
roof_parts.append(E('cube', (0, .16, 1.33), (.48, .05, .025), ARM_D, bevel=.01))
for k in range(4):
    roof_parts.append(E('cyl', (-.30 + k * .20, .16, 1.37), (.032, .032, .022), LIGHTM, rot=(P / 2, 0, 0), seg=10))

# ==========================================================
# 3. KOPABİLİR PARÇA: TOMBSTONE (AĞIR ARKA ÇELİK KALKAN)
# ==========================================================
tombstone_parts.append(E('cube', (0, 1.96, .84), (.86, .05, .24), ARM, rot=(-.12, 0, 0), bevel=.02))
for s in (-1, 1):
    tombstone_parts.append(E('cube', (s * .45, 1.98, .84), (.04, .04, .22), ARM_D, rot=(-.12, 0, 0)))
    tombstone_parts.append(E('cube', (s * .65, 1.94, .84), (.02, .02, .18), RUST, rot=(-.12, 0, 0)))

# ==========================================================
# 4. KOPABİLİR PARÇA: ÖN MAHMUZLAR & YARMA BIÇAĞI (Spikes)
# ==========================================================
for s in (-1, 1):
    spikes_parts.append(E('cube', (s * .20, -2.06, .54), (.18, .03, .12), STEEL, rot=(0, 0, s * .28)))
for s in (-1, 1):
    spikes_parts.append(E('cone', (s * .58, -2.12, .54), (.06, .06, .16), STEEL, rot=(P / 2, 0, 0), seg=6))
    spikes_parts.append(E('cone', (s * .25, -2.10, .54), (.05, .05, .14), ARM, rot=(P / 2, 0, 0), seg=6))

# ==========================================================
# 5. KOPABİLİR PARÇALAR: SOL & SAĞ KAPI ZIRH PLAKALARI
# ==========================================================
# Sol kapı zırhı (-X)
armor_l_parts.append(E('cube', (-.90, .10, .78), (.025, .50, .12), RUST, bevel=.01))
for k in range(4):
    armor_l_parts.append(E('cube', (-.92, -.30 + k * .28, .82), (.012, .012, .012), STEEL))
    armor_l_parts.append(E('cube', (-.92, -.30 + k * .28, .74), (.012, .012, .012), STEEL))

# Sağ kapı zırhı (+X)
armor_r_parts.append(E('cube', (.90, .10, .78), (.025, .50, .12), RUST, bevel=.01))
for k in range(4):
    armor_r_parts.append(E('cube', (.92, -.30 + k * .28, .82), (.012, .012, .012), STEEL))
    armor_r_parts.append(E('cube', (.92, -.30 + k * .28, .74), (.012, .012, .012), STEEL))

# Parçaları isimlendirip birleştir
chassis = join(chassis_parts, 'chassis')
part_tombstone = join(tombstone_parts, 'part_tombstone')
part_spikes = join(spikes_parts, 'part_spikes')
part_armor_l = join(armor_l_parts, 'part_armor_l')
part_armor_r = join(armor_r_parts, 'part_armor_r')
part_roof = join(roof_parts, 'part_roof')

body_objects = [chassis, part_tombstone, part_spikes, part_armor_l, part_armor_r, part_roof]
for o in body_objects:
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.shade_flat()

# ==========================================================
# 6. TEKERLEK (WHEEL)
# ==========================================================
bpy.ops.object.select_all(action='DESELECT')
wparts = []
wparts.append(E('cyl', (0, 0, 0), (.38, .38, .15), TIREM, rot=(0, P / 2, 0), seg=20))
for k in range(12):
    a = k * 2 * P / 12
    wparts.append(E('cube', (0, math.cos(a) * .375, math.sin(a) * .375), (.14, .04, .025), TIREM, rot=(a, 0, 0)))
wparts.append(E('cyl', (0, 0, 0), (.27, .27, .13), RIM, rot=(0, P / 2, 0), seg=16))

for s_side in (-1, 1):
    wparts.append(E('cyl', (s_side * .14, 0, 0), (.14, .14, .02), ARM_D, rot=(0, P / 2, 0), seg=12))
    for k in range(5):
        a = k * 2 * P / 5
        wparts.append(E('cube', (s_side * .155, math.cos(a) * .09, math.sin(a) * .09), (.018, .018, .018), STEEL))
    wparts.append(E('cone', (s_side * .165, 0, 0), (.04, .04, .04), STEEL, rot=(0, s_side * P / 2, 0), seg=6))

wheel = join(wparts, 'wheel')
bpy.context.view_layer.objects.active = wheel
bpy.ops.object.shade_flat()

# ==========================================================
# 7. SAHNE, IŞIKLANDIRMA & RENDER
# ==========================================================
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -.001))
bpy.context.object.data.materials.append(mat('Zemin', (.50, .52, .55), .9))

bpy.ops.object.light_add(type='SUN', location=(5, -4, 7), rotation=(math.radians(52), 0, math.radians(38)))
bpy.context.object.data.energy = 2.8

bpy.ops.object.light_add(type='AREA', location=(-4, 3, 4))
bpy.context.object.data.energy = 45
bpy.context.object.data.size = 6

sc.world = bpy.data.worlds.new('w')
sc.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.82, .85, .88, 1)
sc.view_settings.view_transform = 'Standard'
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x, sc.render.resolution_y = 1400, 900


def cam(loc, tgt, lens, path):
    for o in [o for o in bpy.data.objects if o.type == 'CAMERA' or o.name == 'tgt']:
        bpy.data.objects.remove(o)
    bpy.ops.object.empty_add(location=tgt); t = bpy.context.object; t.name = 'tgt'
    bpy.ops.object.camera_add(location=loc); c = bpy.context.object
    c.data.lens = lens; sc.camera = c
    tc = c.constraints.new('TRACK_TO'); tc.target = t; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


wheel.location = (1.0, -1.45, .38)
for wx, wy in ((-1.0, -1.45), (1.0, 1.45), (-1.0, 1.45)):
    wc = wheel.copy(); wc.data = wheel.data; wc.location = (wx, wy, .38)
    sc.collection.objects.link(wc)

cam((0, 0, 8.5), (0, 0, .7), 45, os.path.join(out, 'car_top.png'))
cam((3.8, -4.8, 1.8), (0, -.2, .65), 38, os.path.join(out, 'car_34.png'))
cam((0, -5.8, .75), (0, 0, .65), 45, os.path.join(out, 'car_front.png'))
cam((5.4, 0, 1.0), (0, 0, .65), 45, os.path.join(out, 'car_side.png'))
cam((3.8, 4.8, 1.8), (0, .2, .65), 38, os.path.join(out, 'car_rear.png'))

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, 'car.blend'))

# GLB aktarımı için tekerleği merkeze al
wheel.location = (0, 0, 0)

# Tüm gövde parçalarını tek bir GLB içinde dışa aktar (her biri kendi adını korur)
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

bpy.ops.object.select_all(action='DESELECT')
wheel.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=os.path.join(out, 'wheel.glb'),
    export_format='GLB',
    use_selection=True,
    export_apply=False,
    export_yup=True
)

print('ALL MODULAR RENDERS & GLB EXPORTS COMPLETED')
