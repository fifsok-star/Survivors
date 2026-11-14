# Survivors - Blender model helpers. Run inside Blender (exec'd by the build scripts).
import bpy, bmesh, math, random
from mathutils import Vector, Matrix, Euler

PAL = {}

def M(name, rgb=None):
    """Get/create a flat-colour material. rgb in sRGB hex string or tuple."""
    if name in PAL:
        return PAL[name]
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    if isinstance(rgb, str):
        h = rgb.lstrip('#')
        rgb = tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    lin = tuple(((c / 12.92) if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4) for c in rgb)
    m.diffuse_color = (*lin, 1)
    try:
        m.use_nodes = True
    except Exception:
        pass
    if m.node_tree:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                n.inputs['Base Color'].default_value = (*lin, 1)
                n.inputs['Roughness'].default_value = 0.9
    PAL[name] = m
    return m

def wipe():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for me in list(bpy.data.meshes):
        bpy.data.meshes.remove(me)

def empty(name, parent=None, loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    o.empty_display_size = 0.1
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    if parent:
        o.parent = parent
    return o

def _mx(loc, rot, scale):
    return Matrix.Translation(loc) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Diagonal((scale[0], scale[1], scale[2], 1))

class B:
    """Accumulates primitives of several materials into one mesh."""
    def __init__(s):
        s.bm = bmesh.new()
        s.mats = []

    def mi(s, m):
        if m not in s.mats:
            s.mats.append(m)
        return s.mats.index(m)

    def _fin(s, ret, m, smooth):
        i = s.mi(m)
        vs = ret['verts']
        fs = set(f for v in vs for f in v.link_faces)
        for f in fs:
            f.material_index = i
            f.smooth = smooth
        return vs

    def box(s, m, size, loc=(0, 0, 0), rot=(0, 0, 0), smooth=False):
        r = bmesh.ops.create_cube(s.bm, size=1, matrix=_mx(loc, rot, size))
        return s._fin(r, m, smooth)

    def cyl(s, m, r1, r2, h, loc=(0, 0, 0), rot=(0, 0, 0), seg=8, smooth=True, caps=True, scale=(1, 1, 1)):
        r = bmesh.ops.create_cone(s.bm, cap_ends=caps, cap_tris=False, segments=seg, radius1=r1, radius2=r2,
                                  depth=h, matrix=_mx(loc, rot, scale))
        return s._fin(r, m, smooth)

    def sph(s, m, r, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), seg=10, rings=7, smooth=True):
        r_ = bmesh.ops.create_uvsphere(s.bm, u_segments=seg, v_segments=rings, radius=r, matrix=_mx(loc, rot, scale))
        return s._fin(r_, m, smooth)

    def ico(s, m, r, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), sub=1, smooth=False, jit=0.0, seed=0):
        r_ = bmesh.ops.create_icosphere(s.bm, subdivisions=sub, radius=r, matrix=_mx(loc, rot, scale))
        vs = s._fin(r_, m, smooth)
        if jit:
            rnd = random.Random(seed)
            for v in vs:
                v.co += Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * jit * r
        return vs

    def limb(s, m, p0, p1, r0, r1, seg=8, smooth=True, caps=True):
        p0 = Vector(p0); p1 = Vector(p1)
        d = p1 - p0
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        mx = Matrix.Translation((p0 + p1) / 2) @ q.to_matrix().to_4x4()
        r = bmesh.ops.create_cone(s.bm, cap_ends=caps, cap_tris=False, segments=seg, radius1=r0, radius2=r1,
                                  depth=d.length, matrix=mx)
        return s._fin(r, m, smooth)

    def quad(s, m, pts, smooth=False, double=False):
        vs = [s.bm.verts.new(p) for p in pts]
        f = s.bm.faces.new(vs)
        f.material_index = s.mi(m); f.smooth = smooth
        if double:
            vs2 = [s.bm.verts.new(p) for p in reversed(pts)]
            f2 = s.bm.faces.new(vs2)
            f2.material_index = s.mi(m); f2.smooth = smooth
        return vs

    def leaf(s, m, p0, p1, width, droop=0.0, up=(0, 0, 1), n=4, fold=0.25):
        """Double sided tapered leaf blade from p0 to p1 made of n segments, drooping, V-folded."""
        p0 = Vector(p0); p1 = Vector(p1)
        d = p1 - p0
        L = d.length
        side = d.cross(Vector(up))
        if side.length < 1e-5:
            side = Vector((1, 0, 0))
        side.normalize()
        upv = side.cross(d).normalized()
        i = s.mi(m)
        rows = []
        for k in range(n + 1):
            t = k / n
            c = p0 + d * t - Vector((0, 0, 1)) * droop * L * t * t
            w = width * math.sin(math.pi * (0.12 + 0.88 * t)) ** 0.8 * (1 - 0.15 * t)
            if k == n:
                w = 0.0
            rows.append((c - side * w - upv * w * fold * -1 * 0, c + upv * w * fold * 0 - Vector((0, 0, 0)), c + side * w))
            rows[-1] = (c - side * w + upv * w * fold, c, c + side * w + upv * w * fold)
        for sgn in (1, -1):
            vr = [[s.bm.verts.new(p) for p in row] for row in rows]
            for k in range(n):
                for j in range(2):
                    a, b, c2, d2 = vr[k][j], vr[k][j + 1], vr[k + 1][j + 1], vr[k + 1][j]
                    try:
                        f = s.bm.faces.new((a, b, c2, d2) if sgn > 0 else (d2, c2, b, a))
                        f.material_index = i; f.smooth = True
                    except Exception:
                        pass
        return None

    def obj(s, name, parent=None, loc=(0, 0, 0), rot=(0, 0, 0)):
        bmesh.ops.remove_doubles(s.bm, verts=s.bm.verts, dist=0.0005)
        me = bpy.data.meshes.new(name)
        s.bm.to_mesh(me)
        s.bm.free()
        for m in s.mats:
            me.materials.append(m)
        o = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = rot
        if parent:
            o.parent = parent
        return o

def jitter(vs, amt, seed=0):
    rnd = random.Random(seed)
    for v in vs:
        v.co += Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * amt

def look(center=(0, 0, 1), dist=6, rot=(70, 0, 30)):
    """Frame the first 3D viewport."""
    for win in bpy.context.window_manager.windows:
        for area in win.screen.areas:
            if area.type == 'VIEW_3D':
                sp = area.spaces.active
                r3 = sp.region_3d
                r3.view_perspective = 'PERSP'
                r3.view_location = Vector(center)
                r3.view_distance = dist
                r3.view_rotation = Euler((math.radians(rot[0]), math.radians(rot[1]), math.radians(rot[2]))).to_quaternion()
                sp.shading.type = 'SOLID'
                sp.shading.color_type = 'MATERIAL'
                sp.shading.light = 'STUDIO'
                sp.shading.show_shadows = False
                sp.overlay.show_overlays = False
                return True
    return False

def stats():
    v = sum(len(o.data.vertices) for o in bpy.data.objects if o.type == 'MESH')
    return {"objects": len(bpy.data.objects), "verts": v}
