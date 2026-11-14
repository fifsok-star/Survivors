# Run from Blender's Scripting tab (or via MCP): rebuilds every model and exports assets/models.glb
import bpy, os
HERE = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.path.join(os.path.expanduser('~'), 'Documents', 'Survivors', 'tools', 'blender')
ROOT = os.path.dirname(os.path.dirname(HERE))
ns = {}
exec(open(os.path.join(HERE, 'helpers.py'), encoding='utf-8').read(), ns)
ns['wipe']()
exec(open(os.path.join(HERE, 'build_characters.py'), encoding='utf-8').read(), ns)
exec(open(os.path.join(HERE, 'build_props.py'), encoding='utf-8').read(), ns)
STATS = ns['stats']()

def export():
    roots = [o for o in bpy.data.objects if o.parent is None and o.type == 'EMPTY']
    keep = {o.name: o.location.copy() for o in roots}
    for o in roots:
        o.location = (0, 0, 0)
    for o in bpy.data.objects:
        if o.type in ('CAMERA', 'LIGHT'):
            o.hide_set(True)
    os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
    out = os.path.join(ROOT, 'assets', 'models.glb')
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.data.objects:
        if o.type in ('MESH', 'EMPTY'):
            o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_texcoords=False, export_normals=True, export_animations=False,
                              export_cameras=False, export_lights=False)
    for o in roots:
        o.location = keep[o.name]
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'assets', 'survivors_models.blend'))
    return out, os.path.getsize(out)
