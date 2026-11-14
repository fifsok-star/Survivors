# Survivors - six playable survivors, built from jointed parts (animated in the game code).
# Blender: X right, -Y front, Z up.  Part origins sit on the joints.

SKIN = [M('skin_a', '#f2c29b'), M('skin_b', '#c98d62'), M('skin_c', '#8a5a3c'), M('skin_d', '#ffd9b8')]
WHITE = M('eye_white', '#ffffff'); BLACK = M('ink', '#1b1b22')

def character(idx, skin, shirt, pants, shoes, hair, style, x=0.0, shorts=False, wide=1.0, sleeve=True):
    pre = 'c%d_' % idx
    root = empty('char%d' % idx, loc=(x, 0, 0))
    # hips
    b = B()
    b.sph(pants, 0.19, (0, 0, 0.0), (1.12 * wide, 0.86, 0.78))
    b.cyl(M('belt', '#4a3424'), 0.2 * wide, 0.2 * wide, 0.05, (0, 0, 0.09), seg=10, scale=(1.08, 0.86, 1))
    hips = b.obj(pre + 'hips', root, (0, 0, 0.92))
    # torso
    b = B()
    b.sph(shirt, 0.25, (0, 0, 0.27), (1.0 * wide, 0.74, 1.18), seg=12, rings=8)
    b.sph(shirt, 0.2, (0, 0, 0.44), (1.3 * wide, 0.72, 0.6), seg=12, rings=6)
    b.cyl(skin, 0.07, 0.075, 0.1, (0, 0, 0.58), seg=8)
    torso = b.obj(pre + 'torso', hips, (0, 0, 0.06))
    # head
    b = B()
    b.sph(skin, 0.2, (0, 0, 0.18), (1.0, 0.98, 1.06), seg=12, rings=9)
    b.sph(skin, 0.045, (0, -0.2, 0.15), (1, 1, 1), seg=6, rings=4)            # nose
    for sx in (-1, 1):
        b.sph(WHITE, 0.05, (sx * 0.078, -0.158, 0.215), (1, 0.6, 1.1), seg=8, rings=6)
        b.sph(BLACK, 0.024, (sx * 0.078, -0.19, 0.212), (1, 0.6, 1.1), seg=6, rings=4)
        b.sph(skin, 0.045, (sx * 0.2, 0, 0.17), (0.5, 1, 1.2), seg=6, rings=4)  # ears
        b.box(hair, (0.08, 0.02, 0.022), (sx * 0.078, -0.178, 0.285), (0, sx * -0.18, 0))  # brows
    b.box(M('mouth', '#7a3b34'), (0.09, 0.02, 0.022), (0, -0.185, 0.075))
    if style == 'pilot':
        b.sph(hair, 0.205, (0, 0.02, 0.22), (1.0, 1.0, 0.95), seg=10, rings=6)
        cap = M('cap_navy', '#27344f')
        b.cyl(cap, 0.215, 0.235, 0.1, (0, 0, 0.36), seg=12)
        b.cyl(cap, 0.25, 0.25, 0.03, (0, 0, 0.42), seg=12)
        b.box(BLACK, (0.26, 0.16, 0.02), (0, -0.2, 0.31), (0.25, 0, 0))
        b.sph(M('gold', '#f2c230'), 0.03, (0, -0.225, 0.37), (1, 0.4, 1), seg=6, rings=4)
        b.box(hair, (0.16, 0.035, 0.035), (0, -0.2, 0.105))                   # moustache
    elif style == 'steward':
        b.sph(hair, 0.215, (0, 0.03, 0.22), (1.02, 1.02, 1.0), seg=10, rings=7)
        b.sph(hair, 0.1, (0, 0.14, 0.4), (1, 1, 1), seg=8, rings=6)           # bun
        b.cyl(M('scarf_red', '#d8343a'), 0.1, 0.11, 0.06, (0, 0, 0.0), seg=8)
        b.box(M('scarf_red', '#d8343a'), (0.1, 0.03, 0.12), (0.07, -0.1, -0.04), (0.2, 0.3, 0))
    elif style == 'tourist':
        straw = M('straw', '#e8c66a')
        b.cyl(straw, 0.36, 0.36, 0.025, (0, 0, 0.3), seg=14)
        b.cyl(straw, 0.2, 0.17, 0.14, (0, 0, 0.37), seg=12)
        b.cyl(M('band_red', '#c9403a'), 0.203, 0.2, 0.04, (0, 0, 0.33), seg=12)
        b.box(BLACK, (0.3, 0.03, 0.07), (0, -0.19, 0.215))                    # sunglasses
    elif style == 'boss':
        b.sph(hair, 0.2, (0, 0.05, 0.2), (1.04, 0.95, 0.8), seg=10, rings=6)  # balding ring
        b.sph(skin, 0.19, (0, -0.01, 0.25), (0.98, 0.98, 0.98), seg=10, rings=6)
        g = M('glass_frame', '#30303a')
        for sx in (-1, 1):
            b.cyl(g, 0.062, 0.062, 0.02, (sx * 0.078, -0.2, 0.215), (math.pi / 2, 0, 0), seg=8, caps=False)
        b.box(g, (0.05, 0.015, 0.015), (0, -0.2, 0.22))
    elif style == 'hiker':
        b.sph(hair, 0.215, (0, 0.03, 0.22), (1.02, 1.02, 1.0), seg=10, rings=7)
        b.limb(hair, (0, 0.18, 0.3), (0, 0.33, 0.02), 0.07, 0.03, seg=6)      # ponytail
        b.cyl(M('bandana', '#f08a24'), 0.213, 0.213, 0.06, (0, 0.0, 0.3), seg=12)
    elif style == 'mech':
        bean = M('beanie', '#c94a3a')
        b.sph(bean, 0.215, (0, 0.01, 0.25), (1.0, 1.0, 0.9), seg=10, rings=6)
        b.cyl(bean, 0.22, 0.22, 0.06, (0, 0.01, 0.27), seg=12)
        b.sph(hair, 0.17, (0, -0.07, 0.06), (1.05, 0.8, 0.9), seg=10, rings=6)  # beard
    head = b.obj(pre + 'head', torso, (0, 0, 0.6))
    # extra torso gear
    if style == 'boss':
        b = B(); b.box(M('tie_red', '#c22b34'), (0.07, 0.02, 0.3), (0, -0.19, 0.36), (0.12, 0, 0)); b.obj(pre + 'tie', torso)
    if style == 'tourist':
        b = B(); b.box(BLACK, (0.14, 0.08, 0.1), (0, -0.21, 0.3)); b.cyl(M('lens', '#8fb6d9'), 0.04, 0.04, 0.06, (0, -0.27, 0.3), (math.pi / 2, 0, 0)); b.obj(pre + 'camera', torso)
    if style == 'mech':
        b = B(); ov = M('overall', '#3f6fb5')
        b.box(ov, (0.3, 0.03, 0.26), (0, -0.175, 0.3)); b.box(ov, (0.05, 0.3, 0.03), (-0.12, -0.02, 0.5)); b.box(ov, (0.05, 0.3, 0.03), (0.12, -0.02, 0.5)); b.obj(pre + 'bib', torso)
    if style == 'pilot':
        b = B(); j = M('wool', '#efe6cf'); b.cyl(j, 0.13, 0.11, 0.07, (0, 0, 0.56), seg=10, scale=(1.2, 1, 1)); b.obj(pre + 'collar', torso)
    # arms
    for sx, s in ((-1, 'L'), (1, 'R')):
        b = B()
        b.sph(shirt if sleeve else skin, 0.095, (0, 0, 0), seg=8, rings=6)
        b.limb(shirt if sleeve else skin, (0, 0, 0), (0, 0, -0.27), 0.085, 0.07)
        arm = b.obj(pre + 'arm' + s, torso, (sx * 0.3 * wide, 0, 0.47))
        b = B()
        b.sph(skin, 0.072, (0, 0, 0), seg=8, rings=5)
        b.limb(skin, (0, 0, 0), (0, 0, -0.24), 0.066, 0.08)
        b.sph(skin, 0.095, (0, -0.005, -0.3), (0.85, 1, 1.05), seg=8, rings=6)   # chunky hand
        b.sph(skin, 0.04, (sx * -0.07, -0.03, -0.28), seg=6, rings=4)            # thumb
        b.obj(pre + 'fore' + s, arm, (0, 0, -0.27))
    # legs
    for sx, s in ((-1, 'L'), (1, 'R')):
        b = B()
        b.limb(pants, (0, 0, 0.02), (0, 0, -0.4), 0.11, 0.09)
        leg = b.obj(pre + 'leg' + s, hips, (sx * 0.115 * wide, 0, -0.05))
        b = B()
        lm = skin if shorts else pants
        b.sph(lm, 0.09, (0, 0, 0), seg=8, rings=5)
        b.limb(lm, (0, 0, 0), (0, 0, -0.36), 0.085, 0.07)
        b.box(shoes, (0.15, 0.3, 0.12), (0, -0.05, -0.41))
        b.sph(shoes, 0.085, (0, -0.17, -0.41), (0.9, 1, 0.75), seg=8, rings=5)
        b.obj(pre + 'shin' + s, leg, (0, 0, -0.4))
    return root

character(0, SKIN[0], M('jacket_brown', '#8a5730'), M('pants_khaki', '#b59a62'), M('boot_dark', '#3a2a22'), M('hair_brown', '#5a3a22'), 'pilot', x=0.0, wide=1.05)
character(1, SKIN[3], M('uniform_blue', '#2f5fae'), M('skirt_navy', '#22355e'), M('shoe_red', '#c0353a'), M('hair_blonde', '#f0cf6a'), 'steward', x=1.2, wide=0.9)
character(2, SKIN[1], M('hawaii', '#ff8a3c'), M('shorts_teal', '#2fb3a8'), M('sandal', '#a8763f'), M('hair_black', '#2a2224'), 'tourist', x=2.4, shorts=True, wide=1.15, sleeve=False)
character(3, SKIN[0], M('shirt_white', '#f1efe8'), M('suit_grey', '#4b4f5c'), M('shoe_black', '#22222a'), M('hair_grey', '#9a9a9a'), 'boss', x=3.6, wide=1.0)
character(4, SKIN[2], M('top_green', '#4fa75a'), M('cargo', '#6b5a3a'), M('boot_tan', '#b0763a'), M('hair_dark', '#33211a'), 'hiker', x=4.8, shorts=True, wide=0.9, sleeve=False)
character(5, SKIN[1], M('tee_yellow', '#f0c53a'), M('overall', '#3f6fb5'), M('boot_dark', '#3a2a22'), M('hair_ginger', '#c8642a'), 'mech', x=6.0, wide=1.12)
