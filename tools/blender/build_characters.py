# Survivors - six playable survivors, cartoon style (big head, bean body, stubby legs).
# Built from jointed parts that the game animates. Blender: X right, -Y front, Z up. Part origins sit on the joints.
PI = math.pi
WHITE = M('eye_white', '#ffffff'); BLACK = M('ink', '#1b1b22'); BLUSH = M('blush', '#f08f86'); MOUTH = M('mouth', '#8a2f3a'); TONGUE = M('tongue', '#f0707a')
GOLD = M('gold', '#f2c230')

def face(b, skin, hair, brow=0.0, eye=1.0, smile=True):
    for sx in (-1, 1):
        b.sph(WHITE, 0.082 * eye, (sx * 0.115, -0.262, 0.33), (1, 0.45, 1.2), seg=12, rings=8)
        b.sph(BLACK, 0.05 * eye, (sx * 0.112, -0.292, 0.325), (1, 0.4, 1.15), seg=10, rings=6)
        b.sph(WHITE, 0.016, (sx * 0.112 + 0.02, -0.312, 0.35), seg=6, rings=4)
        b.sph(BLUSH, 0.05, (sx * 0.2, -0.235, 0.215), (1, 0.3, 0.7), seg=8, rings=5)
        b.box(hair, (0.11, 0.03, 0.03), (sx * 0.115, -0.275, 0.46), (0, sx * (0.25 + brow), 0), smooth=True)
        b.sph(skin, 0.06, (sx * 0.3, 0.0, 0.3), (0.45, 0.9, 1.1), seg=8, rings=6)
    b.sph(skin, 0.042, (0, -0.31, 0.255), (1.1, 0.8, 0.9), seg=8, rings=6)
    if smile:
        b.sph(MOUTH, 0.062, (0, -0.272, 0.18), (1.25, 0.4, 0.5), seg=10, rings=6)
        b.sph(WHITE, 0.046, (0, -0.287, 0.194), (1.25, 0.3, 0.26), seg=8, rings=4)
    else:
        b.box(MOUTH, (0.13, 0.03, 0.028), (0, -0.292, 0.17), smooth=True)

def character(idx, skin, shirt, pants, shoes, hair, style, x=0.0, wide=1.0, sleeve=True, bare_legs=False):
    pre = 'c%d_' % idx
    root = empty('char%d' % idx, loc=(x, 0, 0))
    # ---- hips
    b = B()
    b.sph(pants, 0.26, (0, 0, 0.03), (1.0 * wide, 0.84, 0.68), seg=14, rings=9)
    hips = b.obj(pre + 'hips', root, (0, 0, 0.5))
    # ---- torso (bean)
    b = B()
    b.sph(shirt, 0.285, (0, 0, 0.26), (1.0 * wide, 0.82, 1.12), seg=16, rings=11)
    b.sph(shirt, 0.24, (0, 0.0, 0.44), (1.08 * wide, 0.8, 0.72), seg=14, rings=8)
    b.cyl(M('belt', '#4a3424'), 0.27 * wide, 0.268 * wide, 0.055, (0, 0, 0.04), seg=16, scale=(1, 0.84, 1))
    b.box(GOLD, (0.07, 0.03, 0.06), (0, -0.225, 0.04), smooth=True)
    b.cyl(skin, 0.085, 0.09, 0.12, (0, 0, 0.6), seg=10)
    if style == 'pilot':
        wool = M('wool', '#f2ead6')
        b.cyl(wool, 0.2, 0.15, 0.1, (0, 0.01, 0.585), seg=14, scale=(1.12, 0.95, 1))
        b.box(M('jacket_dark', '#6a4226'), (0.035, 0.02, 0.46), (0, -0.235, 0.3), smooth=True)
        for k in range(3): b.sph(GOLD, 0.022, (0.05, -0.238 + 0.004 * k, 0.16 + k * 0.12), seg=6, rings=4)
        b.box(M('jacket_dark', '#6a4226'), (0.13, 0.02, 0.1), (-0.13 * wide, -0.215, 0.2), smooth=True)
    elif style == 'steward':
        red = M('scarf_red', '#e0383e')
        b.cyl(red, 0.115, 0.125, 0.07, (0, 0, 0.6), seg=12)
        b.box(red, (0.11, 0.035, 0.15), (0.07, -0.13, 0.52), (0.35, 0.35, 0), smooth=True)
        b.box(red, (0.09, 0.035, 0.12), (-0.03, -0.14, 0.52), (0.35, -0.5, 0), smooth=True)
        for k in range(3): b.sph(GOLD, 0.024, (0, -0.238, 0.16 + k * 0.11), seg=6, rings=4)
        b.box(GOLD, (0.09, 0.02, 0.03), (-0.14 * wide, -0.2, 0.42), (0, 0.2, 0), smooth=True)   # wings badge
        b.cyl(pants, 0.3 * wide, 0.33 * wide, 0.16, (0, 0, -0.03), seg=16, scale=(1, 0.84, 1), caps=False)  # skirt
    elif style == 'tourist':
        fl = M('flower_yel', '#ffe066'); fl2 = M('flower_pink', '#ff7fa8')
        pts = [(-.16, .12), (.14, .2), (-.05, .3), (.18, .42), (-.19, .42), (.02, .5), (.1, .08), (-.12, .0 + .26)]
        for k, (px, pz) in enumerate(pts):
            b.sph(fl if k % 2 else fl2, 0.04, (px * wide, -math.sqrt(max(0.001, 1 - (px / .3) ** 2)) * 0.235, pz), (1, 0.35, 1), seg=6, rings=4)
            b.sph(fl2 if k % 2 else fl, 0.04, (px * wide, math.sqrt(max(0.001, 1 - (px / .3) ** 2)) * 0.235, pz + .03), (1, 0.35, 1), seg=6, rings=4)
        b.box(BLACK, (0.02, 0.02, 0.3), (-0.07, -0.21, 0.44), (-0.35, 0.3, 0), smooth=True); b.box(BLACK, (0.02, 0.02, 0.3), (0.07, -0.21, 0.44), (-0.35, -0.3, 0), smooth=True)
        b.box(BLACK, (0.17, 0.1, 0.12), (0, -0.265, 0.27), smooth=True); b.cyl(M('lens', '#8fd0f0'), 0.045, 0.04, 0.07, (0, -0.33, 0.27), (PI / 2, 0, 0), seg=10)
        b.cyl(M('metal_dark', '#59616b'), 0.05, 0.05, 0.02, (0, -0.315, 0.27), (PI / 2, 0, 0), seg=10)
    elif style == 'boss':
        b.box(M('tie_red', '#c9303a'), (0.075, 0.025, 0.34), (0, -0.24, 0.3), (0.06, 0, 0), smooth=True)
        b.cyl(M('tie_red', '#c9303a'), 0.055, 0.0, 0.09, (0, -0.25, 0.1), (PI, 0, 0), seg=4, scale=(1, 0.4, 1))
        b.sph(M('tie_red', '#c9303a'), 0.045, (0, -0.215, 0.5), seg=6, rings=4)
        for sx in (-1, 1): b.box(WHITE, (0.1, 0.03, 0.09), (sx * 0.07, -0.19, 0.555), (0.3, 0, sx * -0.5), smooth=True)
        b.box(M('pen_blue', '#2e6fc4'), (0.02, 0.02, 0.09), (-0.15, -0.22, 0.4)); b.box(M('pocket', '#dedbd2'), (0.11, 0.02, 0.1), (-0.14, -0.213, 0.36), smooth=True)
    elif style == 'hiker':
        pk = M('pack_orange', '#f08a24'); pk2 = M('pack_dark', '#b85f14')
        b.sph(pk, 0.26, (0, 0.27, 0.3), (0.85, 0.6, 1.15), seg=12, rings=8); b.sph(pk2, 0.14, (0, 0.4, 0.2), (1, 0.5, 0.8), seg=8, rings=6)
        b.cyl(M('mat_roll', '#6fa8dc'), 0.09, 0.09, 0.46, (0, 0.27, 0.64), (0, PI / 2, 0), seg=10)
        for sx in (-1, 1): b.cyl(pk2, 0.3, 0.3, 0.05, (sx * 0.13 * wide, 0.02, 0.3), (0, PI / 2, 0), seg=14, caps=False, scale=(1, 0.86, 1.0))
    elif style == 'mech':
        ov = M('overall', '#3f6fb5'); ov2 = M('overall_dark', '#2f548c')
        b.box(ov, (0.3 * wide, 0.04, 0.3), (0, -0.215, 0.25), smooth=True); b.box(ov2, (0.16, 0.03, 0.11), (0, -0.24, 0.27), smooth=True)
        for sx in (-1, 1):
            b.box(ov, (0.06, 0.03, 0.26), (sx * 0.12 * wide, -0.19, 0.48), (-0.4, 0, 0), smooth=True); b.box(ov, (0.06, 0.34, 0.03), (sx * 0.12 * wide, 0.0, 0.565), smooth=True)
            b.box(ov, (0.06, 0.03, 0.4), (sx * 0.12 * wide, 0.2, 0.36), (0.25, 0, 0), smooth=True); b.sph(GOLD, 0.028, (sx * 0.12 * wide, -0.245, 0.39), seg=6, rings=4)
        b.cyl(M('metal', '#c9d2da'), 0.018, 0.018, 0.16, (0.05, -0.25, 0.34), seg=6); b.box(M('metal', '#c9d2da'), (0.06, 0.02, 0.05), (0.05, -0.25, 0.43))
    torso = b.obj(pre + 'torso', hips, (0, 0, 0.05))
    # ---- head
    b = B()
    b.sph(skin, 0.31, (0, 0, 0.3), (1.0, 0.95, 0.97), seg=18, rings=12)
    if style == 'pilot':
        face(b, skin, hair, brow=0.1)
        b.sph(hair, 0.315, (0, 0.035, 0.33), (1.0, 0.96, 0.95), seg=14, rings=9)
        b.box(hair, (0.21, 0.05, 0.055), (0, -0.305, 0.215), smooth=True)                         # moustache
        for sx in (-1, 1): b.sph(hair, 0.045, (sx * 0.12, -0.3, 0.2), (1.3, 0.7, 0.9), seg=6, rings=4)
        cap = M('cap_navy', '#27344f')
        b.cyl(cap, 0.3, 0.33, 0.13, (0, 0.01, 0.56), seg=16); b.cyl(cap, 0.36, 0.34, 0.05, (0, 0.01, 0.645), seg=16)
        b.cyl(BLACK, 0.31, 0.31, 0.025, (0, -0.1, 0.5), (0.2, 0, 0), seg=16, scale=(0.95, 1.05, 1))  # peak
        b.cyl(GOLD, 0.305, 0.305, 0.03, (0, 0.01, 0.52), seg=16, caps=False)
        b.sph(GOLD, 0.05, (0, -0.31, 0.585), (1.2, 0.4, 1), seg=8, rings=5)
    elif style == 'steward':
        face(b, skin, hair, eye=1.08)
        b.sph(hair, 0.325, (0, 0.045, 0.33), (1.02, 0.97, 0.97), seg=14, rings=9)
        for k in range(5): b.sph(hair, 0.1, (-0.2 + k * 0.1, -0.24 + abs(k - 2) * 0.03, 0.53 - abs(k - 2) * 0.03), (1, 0.8, 0.8), seg=8, rings=5)   # fringe
        b.sph(hair, 0.15, (0, 0.2, 0.62), seg=10, rings=7)                                        # bun
        hat = M('uniform_blue', '#2f5fae')
        b.cyl(hat, 0.15, 0.17, 0.09, (-0.08, -0.06, 0.63), (0.15, -0.2, 0), seg=12); b.sph(GOLD, 0.03, (-0.1, -0.215, 0.62), seg=6, rings=4)
        for sx in (-1, 1): b.limb(BLACK, (sx * 0.06, -0.27, 0.42), (sx * 0.19, -0.25, 0.44), 0.012, 0.006, seg=4)  # lashes
    elif style == 'tourist':
        face(b, skin, hair, smile=True)
        b.sph(hair, 0.31, (0, 0.05, 0.32), (1.0, 0.95, 0.95), seg=12, rings=8)
        straw = M('straw', '#ecc96a'); straw2 = M('straw_dark', '#d4a94a')
        b.cyl(straw, 0.56, 0.54, 0.035, (0, 0, 0.5), (0.08, 0, 0), seg=18); b.cyl(straw, 0.3, 0.26, 0.18, (0, 0.01, 0.59), seg=16)
        b.cyl(straw2, 0.57, 0.57, 0.02, (0, 0, 0.5), (0.08, 0, 0), seg=18, caps=False)
        b.cyl(M('band_red', '#d6453c'), 0.303, 0.297, 0.06, (0, 0.01, 0.545), seg=16, caps=False)
        gl = M('shades', '#20222c')
        for sx in (-1, 1): b.sph(gl, 0.1, (sx * 0.115, -0.275, 0.335), (1, 0.4, 0.85), seg=10, rings=6)
        b.box(gl, (0.1, 0.025, 0.025), (0, -0.3, 0.36)); b.box(gl, (0.64, 0.02, 0.025), (0, -0.14, 0.36))
        b.sph(M('sunscreen', '#ffffff'), 0.046, (0, -0.318, 0.262), (1.1, 0.7, 0.8), seg=8, rings=5)  # sunscreen on the nose
    elif style == 'boss':
        face(b, skin, hair, brow=0.25, smile=False)
        for sx in (-1, 1): b.sph(hair, 0.16, (sx * 0.22, 0.06, 0.36), (0.75, 1.3, 1.0), seg=10, rings=7)   # side hair
        b.sph(hair, 0.22, (0, 0.17, 0.3), (1.2, 0.7, 1.0), seg=10, rings=7)
        for k in range(3): b.limb(hair, (-0.16, -0.06 + k * 0.07, 0.585 - k * 0.012), (0.17, -0.02 + k * 0.07, 0.59 - k * 0.012), 0.018, 0.012, seg=4)  # comb-over
        g = M('glass_frame', '#30303a'); gl = M('glass_lens', '#bfe4f5')
        for sx in (-1, 1):
            b.cyl(g, 0.105, 0.105, 0.03, (sx * 0.115, -0.288, 0.33), (PI / 2, 0, 0), seg=14, caps=False); b.cyl(gl, 0.1, 0.1, 0.006, (sx * 0.115, -0.3, 0.33), (PI / 2, 0, 0), seg=14)
            b.sph(BLACK, 0.04, (sx * 0.112, -0.308, 0.325), (1, 0.3, 1.1), seg=8, rings=5); b.box(g, (0.02, 0.26, 0.02), (sx * 0.24, -0.16, 0.34))
        b.box(g, (0.05, 0.02, 0.02), (0, -0.295, 0.34))
    elif style == 'hiker':
        face(b, skin, hair, eye=1.05)
        b.sph(hair, 0.325, (0, 0.045, 0.335), (1.02, 0.97, 0.97), seg=14, rings=9)
        b.limb(hair, (0, 0.27, 0.5), (0, 0.5, 0.3), 0.11, 0.09, seg=8); b.sph(hair, 0.12, (0, 0.52, 0.2), (0.9, 0.9, 1.4), seg=8, rings=6)   # ponytail
        ban = M('bandana', '#f08a24')
        b.cyl(ban, 0.318, 0.322, 0.09, (0, 0.02, 0.5), (0.1, 0, 0), seg=16, caps=False); b.sph(ban, 0.06, (0.27, 0.12, 0.5), (0.7, 1.2, 1.5), seg=6, rings=4)
        for k in range(3): b.sph(hair, 0.085, (-0.12 + k * 0.12, -0.265, 0.585), (1.1, 0.7, 0.7), seg=8, rings=5)
    elif style == 'mech':
        face(b, skin, hair, brow=-0.05)
        b.sph(hair, 0.27, (0, -0.07, 0.17), (1.06, 0.86, 0.8), seg=14, rings=9)                    # beard
        b.sph(MOUTH, 0.07, (0, -0.3, 0.18), (1.1, 0.4, 0.55), seg=10, rings=6); b.sph(WHITE, 0.052, (0, -0.315, 0.198), (1.1, 0.3, 0.28), seg=8, rings=4)
        b.sph(hair, 0.07, (-0.07, -0.31, 0.225), (1.3, 0.6, 0.6), seg=8, rings=5); b.sph(hair, 0.07, (0.07, -0.31, 0.225), (1.3, 0.6, 0.6), seg=8, rings=5)
        bean = M('beanie', '#d24a3a'); bean2 = M('beanie_dark', '#a8352a')
        b.sph(bean, 0.325, (0, 0.03, 0.4), (1.0, 0.97, 0.9), seg=14, rings=9); b.cyl(bean2, 0.33, 0.33, 0.09, (0, 0.02, 0.47), (0.12, 0, 0), seg=16)
        b.sph(WHITE, 0.07, (0, 0.03, 0.72), seg=8, rings=6)
    head = b.obj(pre + 'head', torso, (0, 0, 0.6))
    # ---- arms
    for sx, s in ((-1, 'L'), (1, 'R')):
        b = B(); am = shirt if sleeve else skin
        b.sph(shirt, 0.115, (0, 0, 0), seg=12, rings=8)
        b.limb(am, (0, 0, 0), (0, 0, -0.23), 0.09, 0.078, seg=10)
        if not sleeve: b.limb(shirt, (0, 0, 0.02), (0, 0, -0.11), 0.1, 0.098, seg=10)
        arm = b.obj(pre + 'arm' + s, torso, (sx * 0.305 * wide, 0, 0.45))
        b = B()
        b.sph(am, 0.093, (0, 0, 0), seg=12, rings=8)
        b.limb(skin if not sleeve or style in ('tourist',) else am, (0, 0, 0), (0, 0, -0.2), 0.078, 0.075, seg=10)
        if sleeve: b.cyl(shirt if style != 'pilot' else M('wool', '#f2ead6'), 0.086, 0.086, 0.05, (0, 0, -0.19), seg=10)
        b.sph(skin, 0.105, (0, -0.005, -0.285), (0.9, 1.0, 1.05), seg=10, rings=7)                 # mitten hand
        b.sph(skin, 0.05, (sx * -0.085, -0.035, -0.26), (1, 1, 1.2), seg=6, rings=5)
        if style == 'boss' and s == 'L': b.cyl(GOLD, 0.085, 0.085, 0.04, (0, 0, -0.17), seg=10)  # watch
        b.obj(pre + 'fore' + s, arm, (0, 0, -0.23))
    # ---- legs
    for sx, s in ((-1, 'L'), (1, 'R')):
        b = B()
        b.limb(pants, (0, 0, 0.03), (0, 0, -0.2), 0.12, 0.105, seg=10)
        leg = b.obj(pre + 'leg' + s, hips, (sx * 0.125 * wide, 0, -0.06))
        b = B(); lm = skin if bare_legs else pants
        b.sph(lm, 0.12, (0, 0, 0), seg=12, rings=8)
        b.limb(lm, (0, 0, 0), (0, 0, -0.16), 0.1, 0.09, seg=10)
        if bare_legs: b.cyl(M('sock', '#f4f1ea'), 0.095, 0.095, 0.06, (0, 0, -0.13), seg=10)
        b.sph(shoes, 0.125, (0, -0.06, -0.19), (0.95, 1.5, 0.62), seg=12, rings=7)                 # big shoe
        b.cyl(M('sole', '#2a2622'), 0.118, 0.118, 0.03, (0, -0.06, -0.235), seg=12, scale=(0.97, 1.52, 1))
        b.obj(pre + 'shin' + s, leg, (0, 0, -0.2))
    return root

SK = [M('skin_a', '#f6c7a0'), M('skin_b', '#d59a6c'), M('skin_c', '#96603f'), M('skin_d', '#ffdcbf')]
character(0, SK[0], M('jacket_brown', '#9a6034'), M('pants_khaki', '#c2a86a'), M('boot_dark', '#4a3226'), M('hair_brown', '#5a3a22'), 'pilot', x=0.0, wide=1.05)
character(1, SK[3], M('uniform_blue', '#2f5fae'), M('skirt_navy', '#263a6a'), M('shoe_red', '#d23a40'), M('hair_blonde', '#f4d062'), 'steward', x=1.3, wide=0.92, bare_legs=True)
character(2, SK[1], M('hawaii', '#ff7d3c'), M('shorts_teal', '#2fb8ac'), M('sandal', '#a8763f'), M('hair_black', '#2a2224'), 'tourist', x=2.6, wide=1.18, sleeve=False, bare_legs=True)
character(3, SK[0], M('shirt_white', '#f4f2ea'), M('suit_grey', '#555a68'), M('shoe_black', '#26262e'), M('hair_grey', '#a9a9ad'), 'boss', x=3.9, wide=1.0)
character(4, SK[2], M('top_green', '#4fb05e'), M('cargo', '#7a6842'), M('boot_tan', '#b87c3c'), M('hair_dark', '#33211a'), 'hiker', x=5.2, wide=0.93, sleeve=False, bare_legs=True)
character(5, SK[1], M('tee_yellow', '#f4c93a'), M('overall', '#3f6fb5'), M('boot_dark', '#4a3226'), M('hair_ginger', '#d06a2a'), 'mech', x=6.5, wide=1.12, sleeve=False)
