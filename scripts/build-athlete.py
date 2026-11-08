"""Build our clothed, rigged athlete from pinned MakeHuman CC0 data.

Run with Blender: blender -b --python scripts/build-athlete.py -- SOURCE_DIR
No application/user data is read. Source assets are separate from GPL program code.
"""
import bpy
import json
import math
import sys
from collections import Counter
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[sys.argv.index('--') + 1])
DATA = SOURCE / 'makehuman/data'
OUT = ROOT / 'src/assets'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

vertices, uvs, faces, groups = [], [], [], []
group = ''
for line in (DATA / '3dobjs/base.obj').read_text().splitlines():
    if line.startswith('v '):
        vertices.append(Vector(map(float, line.split()[1:4])))
    elif line.startswith('vt '):
        uvs.append(tuple(map(float, line.split()[1:3])))
    elif line.startswith('g '):
        group = line[2:].strip()
    elif line.startswith('f '):
        faces.append([tuple(int(k) - 1 for k in p.split('/')[:2]) for p in line.split()[1:]])
        groups.append(group)

# Independent macro and muscle/weight groups; no copied MakeHuman program logic.
for name, factor in [
    ('caucasian-male-young.target', 1.0),
    ('universal-male-young-maxmuscle-averageweight.target', .35),
    ('universal-male-young-maxmuscle-minweight.target', .65),
    ('proportions/male-young-maxmuscle-averageweight-idealproportions.target', .85),
]:
    for line in (DATA / 'targets/macrodetails' / name).read_text().splitlines():
        if not line or line.startswith('#'):
            continue
        index, x, y, z = line.split()
        vertices[int(index)] += Vector((float(x), float(y), float(z))) * factor

floor = min(v.y for v in vertices[:13380])
vertices = [Vector((v.x * .1, (v.y - floor) * .1, v.z * .1)) for v in vertices]
# Original surface relief: a leaner waist, distinct pecs/abs and fuller muscle
# bellies. These are mesh changes, so lighting and muscle overlays retain them.
for point in vertices[:13380]:
    if point.z > .05 and abs(point.x) < .22:
        relief = 0
        for side in [-1, 1]:
            for height in [1.065, 1.125, 1.185]:
                relief += .016 * math.exp(-((point.x - side * .047) / .034) ** 2 - ((point.y - height) / .025) ** 2)
            relief += .022 * math.exp(-((point.x - side * .098) / .073) ** 2 - ((point.y - 1.29) / .050) ** 2)
            relief += .006 * math.exp(-((point.x - side * .133) / .030) ** 2 - ((point.y - 1.14) / .095) ** 2)
        relief -= .005 * math.exp(-(point.x / .014) ** 2 - ((point.y - 1.19) / .16) ** 4)
        point.z += relief
rig = json.loads((DATA / 'rigs/default.mhskel').read_text())
weights = json.loads((DATA / 'rigs/default_weights.mhw').read_text())['weights']

def joint(name):
    ids = rig['joints'][name]
    return sum((vertices[i] for i in ids), Vector()) / len(ids)

# Radial volume around fixed skeletal landmarks; joint locations and limb
# lengths are untouched. Smooth falloff avoids a seam at elbow and shoulder.
for side in ['L', 'R']:
    shoulder = joint(rig['bones']['upperarm01.' + side]['head'])
    elbow = joint(rig['bones']['lowerarm01.' + side]['head'])
    shaft = elbow - shoulder
    for point in vertices[:13380]:
        t = (point - shoulder).dot(shaft) / shaft.length_squared
        center = shoulder + shaft * max(0, min(1, t))
        radial = point - center
        if -.08 < t < 1 and radial.length < .115 and abs(point.x) > .19:
            belly = .19 * math.exp(-((t - .53) / .34) ** 2)
            delt = .16 * math.exp(-((t - .06) / .22) ** 2)
            point += radial * (belly + delt)

def blender(v):
    return Vector((v.x, -v.z, v.y))

def bone_name(name):
    return name.replace('.', '_')

head_y = joint(rig['bones']['head']['head']).y
hip_y = joint(rig['bones']['upperleg01.L']['head']).y
shoulder_y = joint(rig['bones']['upperarm01.L']['head']).y
selected, selected_groups = [], []
for face, group in zip(faces, groups):
    c = sum((vertices[i] for i, uv in face), Vector()) / len(face)
    keep = group == 'body' or group in ('helper-l-eye', 'helper-r-eye')
    if group == 'helper-tights':
        keep = hip_y - .24 < c.y < hip_y + .075
    if keep:
        selected.append(face)
        selected_groups.append(group)

edges = Counter()
for face, group in zip(selected, selected_groups):
    if group == 'helper-tights':
        ids = [i for i, uv in face]
        edges.update(tuple(sorted((a, b))) for a, b in zip(ids, ids[1:] + ids[:1]))
for index in {i for edge, count in edges.items() if count == 1 for i in edge}:
    point = vertices[index]
    point.y = min([hip_y - .24, hip_y + .075], key=lambda y: abs(y - point.y))

used = sorted({i for f in selected for i, uv in f})
remap = {source: target for target, source in enumerate(used)}
mesh = bpy.data.meshes.new('AthleteGeometry')
mesh.from_pydata([blender(vertices[i]) for i in used], [], [[remap[i] for i, uv in f] for f in selected])
mesh.update()
body = bpy.data.objects.new('Athlete', mesh)
bpy.context.collection.objects.link(body)
bpy.context.view_layer.objects.active = body
body.select_set(True)
layer = mesh.uv_layers.new(name='UVMap')
for poly, face in zip(mesh.polygons, selected):
    for loop, (_, uv) in zip(poly.loop_indices, face):
        layer.data[loop].uv = uvs[uv]
    poly.use_smooth = True

regions = ['rest', 'shorts', 'hair', 'eyes', 'iris']
for region in regions:
    mat = bpy.data.materials.new('skin_' + region)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
    color = (.55, .30, .18, 1)
    if region.startswith('shorts'): color = (.018, .023, .032, 1)
    if region == 'hair': color = (.042, .024, .016, 1)
    if region == 'eyes': color = (.82, .79, .72, 1)
    if region == 'iris': color = (.045, .024, .012, 1)
    node.inputs['Base Color'].default_value = color
    node.inputs['Roughness'].default_value = .56 if region not in ('shorts', 'hair') else .9
    node.inputs['Subsurface Weight'].default_value = .075 if region not in ('shorts', 'hair', 'eyes', 'iris') else 0
    mesh.materials.append(mat)

for poly, group in zip(mesh.polygons, selected_groups):
    if group == 'helper-hair': poly.material_index = regions.index('hair')
    elif 'eye' in group: poly.material_index = regions.index('eyes')
    elif group == 'helper-tights': poly.material_index = regions.index('shorts')

for name, pairs in weights.items():
    vg = body.vertex_groups.new(name=bone_name(name))
    for source, value in pairs:
        if source in remap and value > 0:
            vg.add([remap[source]], value, 'REPLACE')

# One smooth subdivision gives the face, hands and musculature a proper surface.
modifier = body.modifiers.new('AnatomicalSurface', 'SUBSURF')
modifier.levels = 1
bpy.ops.object.modifier_apply(modifier=modifier.name)
mesh = body.data
mesh.update()

def region_for(c, n):
    x, y, z = c.x, c.z, -c.y
    nx, ny, nz = n.x, n.z, -n.y
    ax = abs(x)
    if y > shoulder_y + .065 or y < .10:
        return 'rest'
    if hip_y - .24 < y < hip_y + .075 and ax < .27:
        if nz < -.2: return 'shorts_hipAbductors' if ax > .16 and y > hip_y - .04 else 'shorts_glutes' if y > hip_y - .1 else 'shorts_hamstrings'
        if nz > .2: return 'shorts_hipFlexors' if y > hip_y - .01 else 'shorts_quads'
        return 'shorts_adductors' if ax < .09 else 'shorts_hipAbductors'
    if y < hip_y - .20:
        if y < hip_y - .47:
            return 'calves' if nz < .25 and y > .17 else 'rest'
        if ax < .11 and nx * (1 if x > 0 else -1) < -.2:
            return 'adductors'
        return 'quads' if nz > -.1 else 'hamstrings'
    # Arm regions follow the actual rest-pose centre line rather than a picture mask.
    shoulder = joint(rig['bones']['upperarm01.L' if x > 0 else 'upperarm01.R']['head'])
    elbow = joint(rig['bones']['lowerarm01.L' if x > 0 else 'lowerarm01.R']['head'])
    if ax > .22 and y > hip_y - .12:
        if y < elbow.y + .025 or ax > abs(elbow.x) + .035:
            return 'forearms' if ax < .49 else 'rest'
        if Vector((x - shoulder.x, y - shoulder.y, z - shoulder.z)).length < .125:
            return 'frontDelts' if nz > .3 else 'rearDelts' if nz < -.3 else 'sideDelts'
        return 'biceps' if nz > 0 else 'triceps'
    if y < hip_y + .16:
        return 'glutes' if nz < -.15 else 'hipFlexors'
    if nz > .28:
        if shoulder_y - .23 < y < shoulder_y - .005 and ax < .22:
            return 'chest'
        return 'abs' if ax < .095 else 'obliques'
    if nz < -.2:
        if y > shoulder_y - .18 or (ax < .09 and y > hip_y + .34):
            return 'upperBack'
        return 'spinalErectors' if ax < .052 else 'lats'
    return 'obliques'

for poly in mesh.polygons:
    center = sum((mesh.vertices[i].co for i in poly.vertices), Vector()) / len(poly.vertices)
    if poly.material_index == regions.index('eyes'):
        if -center.y > .126 and abs(center.x) < .055:
            poly.material_index = regions.index('iris')
    elif poly.material_index == 0:
        if center.z > head_y + (.10 if -center.y > .065 else .048):
            poly.material_index = regions.index('hair')
        elif hip_y - .24 < center.z < hip_y + .075 and abs(center.x) < .27:
            poly.material_index = regions.index('shorts')
    poly.use_smooth = True

# Rest-space coordinates allow smooth muscle overlays that deform with the skin.
attribute = mesh.attributes.new(name='_ANATOMY', type='FLOAT_VECTOR', domain='POINT')
for point, entry in zip(mesh.vertices, attribute.data):
    entry.vector = (point.co.x, point.co.z, -point.co.y)

armature = bpy.data.armatures.new('AthleteSkeleton')
rig_object = bpy.data.objects.new('AthleteRig', armature)
bpy.context.collection.objects.link(rig_object)
body.select_set(False)
rig_object.select_set(True)
bpy.context.view_layer.objects.active = rig_object
bpy.ops.object.mode_set(mode='EDIT')
metadata = {}
for name, bone in rig['bones'].items():
    edit = armature.edit_bones.new(bone_name(name))
    a, b = joint(bone['head']), joint(bone['tail'])
    edit.head, edit.tail = blender(a), blender(b)
    if (edit.tail - edit.head).length < .00001:
        edit.tail.z += .005
    metadata[bone_name(name)] = {'head': list(a), 'tail': list(b), 'parent': bone_name(bone['parent']) if bone['parent'] else None}
for name, bone in rig['bones'].items():
    if bone['parent']:
        armature.edit_bones[bone_name(name)].parent = armature.edit_bones[bone_name(bone['parent'])]
bpy.ops.object.mode_set(mode='OBJECT')
body.parent = rig_object
modifier = body.modifiers.new('AthleteSkin', 'ARMATURE')
modifier.object = rig_object
body.select_set(True)
rig_object.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / 'athlete.glb'), export_format='GLB', use_selection=True, export_animations=False, export_yup=True, export_extras=True, export_attributes=True)
(OUT / 'athlete-rig.json').write_text(json.dumps({'license': 'CC0-1.0', 'height': max(v.y for v in vertices[:13380]), 'bones': metadata}, separators=(',', ':')))
print('Athlete exported:', len(mesh.vertices), 'vertices;', len(mesh.polygons), 'faces;', (OUT / 'athlete.glb').stat().st_size, 'bytes')

if '--render' in sys.argv:
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = False
    scene.render.resolution_x = scene.render.resolution_y = 600
    scene.render.resolution_percentage = 100
    scene.world.color = (.08, .08, .08)
    for position, energy, size in [((2, -3, 4), 350, 3), ((-2, -1, 2), 200, 3), ((1, 2, 3), 450, 2)]:
        light = bpy.data.lights.new('StudioLight', 'AREA')
        light.energy, light.shape, light.size = energy, 'DISK', size
        obj = bpy.data.objects.new('StudioLight', light)
        bpy.context.collection.objects.link(obj)
        obj.location = position
        obj.rotation_euler = (Vector((0, 0, .9)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    camera = bpy.data.cameras.new('Camera')
    obj = bpy.data.objects.new('Camera', camera)
    bpy.context.collection.objects.link(obj)
    obj.location = (2.5, -5, 2.0)
    obj.rotation_euler = (Vector((0, 0, .90)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    camera.type, camera.ortho_scale = 'ORTHO', 2.05
    scene.camera = obj
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(SOURCE / 'athlete-neutral.png')
    bpy.ops.render.render(write_still=True)
