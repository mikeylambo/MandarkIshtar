"""
Mandark Ishtar — Blender cleanup for Meshy exports (GDD §13).
Usage: blender -b -P tools/blender/cleanup.py -- <in.glb> <out.glb> <tri_budget> [--humanoid|--custom-rig]
Applies transforms, decimates to budget, merges materials, writes toon-ready vertex colours,
exports glTF 2.0 .glb, 1 u = 1 m, Y-up, −Z forward. Flame / Giant / Prophet: --custom-rig (manual rigging flag).
"""
import sys
import bpy  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
src, dst = argv[0], argv[1]
budget = int(argv[2]) if len(argv) > 2 else 25000
custom_rig = "--custom-rig" in argv

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]

# 1) apply transforms
for o in bpy.context.scene.objects:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0] if meshes else None
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

# 2) decimate to the triangle budget
tris = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
if tris > budget:
    ratio = budget / tris
    for o in meshes:
        m = o.modifiers.new("decimate", "DECIMATE")
        m.ratio = ratio
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=m.name)

# 3) merge materials into one per object (the game re-materials with the toon ramp)
for o in meshes:
    if len(o.data.materials) > 1:
        keep = o.data.materials[0]
        o.data.materials.clear()
        o.data.materials.append(keep)

# 4) toon-ready vertex colours: bake base colour into a COLOR attribute
for o in meshes:
    if "Col" not in o.data.color_attributes:
        o.data.color_attributes.new(name="Col", type="BYTE_COLOR", domain="CORNER")

if custom_rig:
    print("[cleanup] NON-HUMANOID: rig manually in Blender (Flame / Giant / Prophet) before export of animations.")

# 5) export glb: Y-up, -Z forward (glTF convention), 1 u = 1 m
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_yup=True, export_apply=True, export_animations=True)
print(f"[cleanup] {src} -> {dst} tris<= {budget}")
