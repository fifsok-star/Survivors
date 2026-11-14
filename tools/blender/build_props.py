# Survivors - world props, items, puzzle pieces and animals.
import math, random
PI = math.pi
_gx = [0.0]
def place(w=3.0, row=0):
    x = _gx[0]; _gx[0] += w
    return (x % 60, 6 + 8 * (x // 60) + row, 0)

G1 = M('leaf_a', '#3fae4b'); G2 = M('leaf_b', '#2c8f4a'); G3 = M('leaf_c', '#7cc344'); G4 = M('leaf_dark', '#1f6e44')
BARK = M('bark', '#7a5234'); BARK2 = M('bark_dark', '#5a3b26'); WOOD = M('wood', '#b98850'); WOODL = M('wood_light', '#e0b877')
ROCK = M('rock', '#8d8f98'); ROCK2 = M('rock_dark', '#6b6e7a'); SAND = M('sandstone', '#d9c08a'); MOSS = M('moss', '#6fa24a')
METAL = M('metal', '#c9d2da'); METALD = M('metal_dark', '#59616b'); WHITE = M('paint_white', '#f4f1ea'); RED = M('paint_red', '#d8403a')
BLUE = M('paint_blue', '#2e6fc4'); YEL = M('paint_yellow', '#f2c230'); BLACK = M('ink', '#1b1b22'); GLASS = M('glass', '#5fb4d9')
ROPE = M('rope', '#d8b56a'); ORANGE = M('paint_orange', '#f08a24'); PINK = M('petal_pink', '#f36fa0'); PURP = M('petal_purple', '#9a5fd0')

# ---------------------------------------------------------------- plane wreck
def plane():
    r = empty('plane_front', loc=place(12))
    b = B()
    b.cyl(WHITE, 1.7, 1.7, 9, (0, 0, 1.7), (PI / 2, 0, 0), seg=14, caps=False)
    b.cyl(BLUE, 1.72, 1.72, 9, (0, 0, 1.45), (PI / 2, 0, 0), seg=14, caps=False, scale=(1, 0.18, 1))
    b.sph(WHITE, 1.7, (0, -4.5, 1.7), (1, 1.5, 1), seg=14, rings=8)
    b.sph(BLACK, 1.2, (0, -5.3, 2.3), (1.05, 1.0, 0.55), seg=10, rings=6)       # cockpit glass
    b.box(METALD, (3.0, 9, 0.12), (0, 0, 0.75))                                 # cabin floor
    for i in range(6):
        for sx in (-1, 1):
            b.sph(GLASS, 0.24, (sx * 1.66, -3.2 + i * 1.3, 2.15), (0.25, 1, 1.25), seg=8, rings=5)
    for k in range(7):                                                          # torn rear edge
        a = k / 7 * PI * 2
        b.box(WHITE, (0.9, 0.9 + (k % 3) * 0.5, 0.06), (math.sin(a) * 1.68, 4.6 + (k % 3) * 0.2, 1.7 + math.cos(a) * 1.68), (0, -a, 0))
    b.box(WHITE, (4.2, 2.6, 0.22), (-3.4, 0.2, 1.1), (0, 0.12, 0.15))            # wing stub
    b.obj('plane_front_m', r)
    r = empty('plane_tail', loc=place(9))
    b = B()
    b.cyl(WHITE, 1.7, 0.7, 6, (0, 0, 1.7), (PI / 2, 0, 0), seg=14, caps=False)
    b.cyl(BLUE, 1.72, 0.72, 6, (0, 0, 1.5), (PI / 2, 0, 0), seg=14, caps=False, scale=(1, 0.18, 1))
    b.box(BLUE, (0.18, 2.6, 3.4), (0, 2.0, 3.9), (-0.45, 0, 0))
    b.box(WHITE, (5.6, 1.5, 0.16), (0, 2.5, 2.2))
    b.sph(WHITE, 0.7, (0, 3.0, 1.7), (1, 1.4, 1), seg=10, rings=6)
    b.obj('plane_tail_m', r)
    r = empty('plane_wing', loc=place(10))
    b = B()
    b.box(WHITE, (8.5, 2.6, 0.24), (0, 0, 0.3), (0, 0, 0))
    b.box(BLUE, (1.2, 2.62, 0.26), (3.7, 0, 0.3))
    b.cyl(METAL, 0.62, 0.5, 2.6, (-1, -0.5, 0.2), (PI / 2, 0, 0), seg=10)
    b.cyl(BLACK, 0.5, 0.5, 0.1, (-1, -1.82, 0.2), (PI / 2, 0, 0), seg=10)
    for k in range(3):
        b.box(METALD, (0.16, 0.06, 1.3), (-1, -1.9, 0.2), (0, k * PI * 2 / 3, 0))
    b.obj('plane_wing_m', r)
    r = empty('seat', loc=place(2))
    b = B(); b.box(BLUE, (0.6, 0.6, 0.18), (0, 0, 0.45)); b.box(BLUE, (0.6, 0.16, 0.8), (0, 0.26, 0.9), (-0.15, 0, 0)); b.box(METALD, (0.5, 0.5, 0.36), (0, 0, 0.18))
    b.box(WHITE, (0.4, 0.05, 0.22), (0, 0.2, 1.22), (-0.15, 0, 0)); b.obj('seat_m', r)
    r = empty('suitcase', loc=place(2))
    b = B(); b.box(RED, (0.75, 0.3, 0.5), (0, 0, 0.25)); b.box(METALD, (0.77, 0.04, 0.52), (0, 0, 0.25)); b.box(BLACK, (0.22, 0.05, 0.06), (0, 0, 0.54)); b.obj('suitcase_m', r)
    r = empty('crate', loc=place(2))
    b = B(); b.box(WOOD, (0.9, 0.9, 0.9), (0, 0, 0.45))
    for s in (-1, 1):
        b.box(WOODL, (0.96, 0.1, 0.96), (0, s * 0.42, 0.45)); b.box(WOODL, (0.1, 0.96, 0.96), (s * 0.42, 0, 0.45))
    b.obj('crate_m', r)

# ---------------------------------------------------------------- plants
def palm(name, h, lean, seed):
    rnd = random.Random(seed)
    r = empty(name, loc=place(5)); b = B()
    pts = []; n = 6
    for i in range(n + 1):
        t = i / n
        pts.append((lean * t * t * h * 0.35, 0, h * t))
    for i in range(n):
        b.limb(BARK, pts[i], pts[i + 1], 0.3 - 0.022 * i, 0.3 - 0.022 * (i + 1) + 0.02, seg=7)
        b.cyl(BARK2, 0.31 - 0.022 * i, 0.31 - 0.022 * i, 0.07, pts[i + 1], seg=7)
    top = Vector(pts[-1])
    for k in range(9):
        a = k / 9 * PI * 2 + rnd.uniform(-0.2, 0.2)
        L = rnd.uniform(2.6, 3.4)
        e = top + Vector((math.cos(a) * L, math.sin(a) * L, rnd.uniform(0.5, 1.3)))
        b.leaf(G1 if k % 2 else G3, top, e, 0.55, droop=rnd.uniform(0.5, 0.8), n=5, fold=0.35)
    for k in range(3):
        a = k * 2.1
        b.sph(BARK2, 0.17, top + Vector((math.cos(a) * 0.25, math.sin(a) * 0.25, -0.2)), seg=7, rings=5)
    b.obj(name + '_m', r)

def jtree(name, h, tr, seed, umbrella=False):
    rnd = random.Random(seed)
    r = empty(name, loc=place(8)); b = B()
    b.limb(BARK, (0, 0, 0), (0.2, 0.1, h * 0.55), tr, tr * 0.72, seg=9)
    b.limb(BARK, (0.2, 0.1, h * 0.55), (0, 0, h), tr * 0.72, tr * 0.45, seg=9)
    for k in range(5):                                                          # buttress roots
        a = k / 5 * PI * 2 + rnd.uniform(-0.3, 0.3)
        b.limb(BARK2, (math.cos(a) * tr * 2.2, math.sin(a) * tr * 2.2, -0.1), (math.cos(a) * tr * 0.5, math.sin(a) * tr * 0.5, tr * 3.2), tr * 0.32, tr * 0.2, seg=5)
    for k in range(4):                                                          # branches
        a = k / 4 * PI * 2 + rnd.uniform(-0.4, 0.4)
        z = h * rnd.uniform(0.6, 0.85)
        b.limb(BARK, (0, 0, z), (math.cos(a) * 2.4, math.sin(a) * 2.4, z + 1.4), tr * 0.3, tr * 0.14, seg=5)
    cols = [G1, G2, G3, G4]
    nb = 7
    for k in range(nb):
        a = k / nb * PI * 2 + rnd.uniform(-0.3, 0.3)
        d = rnd.uniform(1.6, 3.0) if k else 0
        rr = rnd.uniform(1.9, 2.7)
        sz = (1.3, 1.3, 0.55) if umbrella else (1, 1, 0.75)
        b.ico(cols[k % 4], rr, (math.cos(a) * d, math.sin(a) * d, h + rnd.uniform(0.2, 1.4) + (0 if k else 1.0)), sz, sub=2, smooth=False, jit=0.1, seed=seed + k)
    for k in range(4):                                                          # hanging vines
        a = rnd.uniform(0, PI * 2); d = rnd.uniform(1.2, 2.6)
        b.limb(G4, (math.cos(a) * d, math.sin(a) * d, h + 0.3), (math.cos(a) * d * 1.05, math.sin(a) * d * 1.05, h - rnd.uniform(2, 4.5)), 0.045, 0.03, seg=4, caps=False)
    b.obj(name + '_m', r)

def lookout():
    r = empty('lookout', loc=place(10)); b = B(); h = 15.0
    b.limb(BARK, (0, 0, 0), (0, 0, h * 0.5), 1.0, 0.8, seg=10)
    b.limb(BARK, (0, 0, h * 0.5), (0, 0, h + 2), 0.8, 0.5, seg=10)
    for k in range(6):
        a = k / 6 * PI * 2
        b.limb(BARK2, (math.cos(a) * 2.4, math.sin(a) * 2.4, -0.1), (math.cos(a) * 0.6, math.sin(a) * 0.6, 3.0), 0.36, 0.22, seg=5)
    for k in range(30):                                                         # climbing pegs spiral
        a = k * 0.55; z = 0.8 + k * 0.45
        rr = 1.0 - 0.3 * (z / h)
        b.limb(WOODL, (math.cos(a) * rr * 0.8, math.sin(a) * rr * 0.8, z), (math.cos(a) * (rr + 0.45), math.sin(a) * (rr + 0.45), z + 0.05), 0.07, 0.07, seg=5)
    b.cyl(WOOD, 2.6, 2.6, 0.16, (0, 0, h - 0.6), seg=10)                         # platform
    for k in range(10):
        a = k / 10 * PI * 2
        b.limb(WOODL, (math.cos(a) * 2.45, math.sin(a) * 2.45, h - 0.5), (math.cos(a) * 2.45, math.sin(a) * 2.45, h + 0.4), 0.06, 0.06, seg=4)
    b.cyl(ROPE, 2.47, 2.47, 0.06, (0, 0, h + 0.4), seg=10, caps=False)
    for k in range(7):
        a = k / 7 * PI * 2; d = 2.6 if k else 0
        b.ico([G1, G2, G3, G4][k % 4], 3.0, (math.cos(a) * d, math.sin(a) * d, h + 4.2 + (1.2 if not k else 0)), (1.2, 1.2, 0.6), sub=2, jit=0.1, seed=90 + k)
    b.obj('lookout_m', r)

def small_plants():
    rnd = random.Random(5)
    r = empty('fern', loc=place(3)); b = B()
    for k in range(8):
        a = k / 8 * PI * 2 + rnd.uniform(-0.2, 0.2); L = rnd.uniform(0.9, 1.3)
        b.leaf(G1 if k % 2 else G2, (0, 0, 0.05), (math.cos(a) * L, math.sin(a) * L, 0.75), 0.2, droop=0.9, n=4, fold=0.3)
    b.obj('fern_m', r)
    r = empty('banana_plant', loc=place(4)); b = B()
    b.limb(G3, (0, 0, 0), (0, 0, 1.6), 0.16, 0.1, seg=6)
    for k in range(6):
        a = k / 6 * PI * 2 + rnd.uniform(-0.3, 0.3); L = rnd.uniform(1.6, 2.2)
        b.leaf(G1 if k % 2 else G3, (0, 0, 1.5), (math.cos(a) * L, math.sin(a) * L, 2.9), 0.42, droop=0.75, n=5, fold=0.2)
    b.obj('banana_plant_m', r)
    r = empty('bush', loc=place(3)); b = B()
    for k in range(5):
        a = k / 5 * PI * 2; d = 0.55 if k else 0
        b.ico([G2, G1, G4][k % 3], 0.6 + 0.1 * (k % 2), (math.cos(a) * d, math.sin(a) * d, 0.45 + (0.25 if not k else 0)), (1, 1, 0.8), sub=1, jit=0.12, seed=k)
    for k in range(6):
        a = k * 1.1; b.sph(RED, 0.07, (math.cos(a) * 0.7, math.sin(a) * 0.7, 0.6 + 0.2 * math.sin(k)), seg=5, rings=4)
    b.obj('bush_m', r)
    for nm, col in (('flower_a', PINK), ('flower_b', YEL), ('flower_c', PURP)):
        r = empty(nm, loc=place(1.5)); b = B()
        for q in range(3):
            ox = (q - 1) * 0.22; oy = (q % 2) * 0.15; hh = 0.4 + 0.12 * q
            b.limb(G2, (ox, oy, 0), (ox, oy, hh), 0.02, 0.015, seg=4, caps=False)
            for k in range(5):
                a = k / 5 * PI * 2
                b.sph(col, 0.07, (ox + math.cos(a) * 0.08, oy + math.sin(a) * 0.08, hh), (1, 1, 0.4), seg=5, rings=3)
            b.sph(YEL if col != YEL else ORANGE, 0.05, (ox, oy, hh + 0.02), seg=5, rings=3)
        b.obj(nm + '_m', r)
    r = empty('grass', loc=place(1.5)); b = B()
    for k in range(6):
        a = k * 1.05; L = 0.25 + 0.1 * (k % 3)
        b.leaf(G3 if k % 2 else G1, (math.cos(a) * 0.08, math.sin(a) * 0.08, 0), (math.cos(a) * L, math.sin(a) * L, 0.55 + 0.1 * (k % 2)), 0.05, droop=0.4, n=2, fold=0.1)
    b.obj('grass_m', r)
    r = empty('mushroom', loc=place(1.5)); b = B()
    b.cyl(WHITE, 0.07, 0.05, 0.25, (0, 0, 0.12), seg=6); b.sph(RED, 0.2, (0, 0, 0.25), (1, 1, 0.6), seg=8, rings=5)
    for k in range(5):
        a = k * 1.3; b.sph(WHITE, 0.035, (math.cos(a) * 0.11, math.sin(a) * 0.11, 0.33), (1, 1, 0.5), seg=5, rings=3)
    b.obj('mushroom_m', r)
    r = empty('pine', loc=place(5)); b = B()
    b.limb(BARK2, (0, 0, 0), (0, 0, 2.2), 0.3, 0.2, seg=7)
    for k in range(4):
        b.cyl(G4 if k % 2 else G2, 2.0 - k * 0.42, 0.25, 2.3, (0, 0, 2.4 + k * 1.3), seg=8, smooth=False)
    b.obj('pine_m', r)
    r = empty('deadtree', loc=place(4)); b = B()
    b.limb(BARK2, (0, 0, 0), (0.2, 0, 3.4), 0.3, 0.14, seg=6)
    b.limb(BARK2, (0.1, 0, 1.8), (1.3, 0.3, 3.0), 0.12, 0.05, seg=5); b.limb(BARK2, (0.15, 0, 2.4), (-0.9, -0.4, 3.6), 0.1, 0.04, seg=5)
    b.obj('deadtree_m', r)

def rocks():
    for i, (nm, sc) in enumerate((('rock_a', (1.2, 1.0, 0.8)), ('rock_b', (1.0, 1.5, 0.7)), ('rock_c', (0.9, 0.9, 1.3)))):
        r = empty(nm, loc=place(3.5)); b = B()
        b.ico(ROCK if i != 1 else ROCK2, 1.0, (0, 0, sc[2] * 0.55), sc, sub=2, jit=0.16, seed=20 + i)
        b.ico(ROCK2 if i != 1 else ROCK, 0.55, (0.8, 0.4, 0.3), (1, 1, 0.8), sub=1, jit=0.18, seed=30 + i)
        b.obj(nm + '_m', r)
    r = empty('rock_moss', loc=place(4)); b = B()
    b.ico(ROCK, 1.2, (0, 0, 0.6), (1.2, 1, 0.75), sub=2, jit=0.14, seed=77)
    b.ico(MOSS, 1.0, (0, 0, 0.85), (1.1, 0.95, 0.6), sub=2, jit=0.1, seed=78)
    b.obj('rock_moss_m', r)

def woods():
    r = empty('log', loc=place(3)); b = B()          # unit log: length 1 along X, radius .28
    b.cyl(BARK, 0.28, 0.27, 1.0, (0, 0, 0), (0, PI / 2, 0), seg=9)
    b.cyl(WOODL, 0.22, 0.22, 1.01, (0, 0, 0), (0, PI / 2, 0), seg=9)
    b.cyl(BARK2, 0.07, 0.05, 0.25, (0.2, 0, 0.3), seg=5)
    b.obj('log_m', r)
    r = empty('stump', loc=place(3)); b = B()
    b.cyl(BARK, 0.6, 0.48, 0.6, (0, 0, 0.3), seg=9); b.cyl(WOODL, 0.42, 0.42, 0.02, (0, 0, 0.61), seg=9)
    for k in range(4):
        a = k * PI / 2 + 0.4; b.limb(BARK2, (math.cos(a) * 1.0, math.sin(a) * 1.0, -0.05), (math.cos(a) * 0.4, math.sin(a) * 0.4, 0.3), 0.14, 0.12, seg=5)
    b.obj('stump_m', r)
    r = empty('fallen_tree', loc=place(9)); b = B()  # blocks a 7 m wide path, lies along X
    b.cyl(BARK, 0.85, 0.7, 8.0, (0, 0, 0.8), (0, PI / 2, 0), seg=10)
    b.cyl(WOODL, 0.7, 0.7, 8.02, (0, 0, 0.8), (0, PI / 2, 0), seg=10, scale=(1, 1, 0.82))
    for k in range(5):
        x = -3 + k * 1.5; a = k * 1.7
        b.limb(BARK2, (x, 0, 0.8), (x + 0.3, math.cos(a) * 1.5, 0.8 + abs(math.sin(a)) * 1.8 + 0.5), 0.16, 0.06, seg=5)
    b.ico(G2, 1.0, (-3.6, 0.6, 1.9), (1.3, 1, 0.8), sub=1, jit=0.15, seed=4); b.ico(MOSS, 0.5, (1, 0, 1.45), (2.2, 1, 0.4), sub=1, jit=0.1, seed=6)
    b.obj('fallen_tree_m', r)

# ---------------------------------------------------------------- items
def items():
    r = empty('it_rope', loc=place(1.5)); b = B()
    for k in range(4):
        b.cyl(ROPE, 0.2, 0.2, 0.07, (0, 0, 0.05 + k * 0.065), seg=10, caps=False); b.cyl(ROPE, 0.13, 0.13, 0.07, (0, 0, 0.05 + k * 0.065), seg=10, caps=False)
        b.cyl(ROPE, 0.2, 0.13, 0.001, (0, 0, 0.085 + k * 0.065), seg=10, caps=False)
    b.obj('it_rope_m', r)
    r = empty('it_saw', loc=place(2.5)); b = B()     # two-man crosscut saw, along X
    b.box(METAL, (1.7, 0.02, 0.22), (0, 0, 0.2))
    for k in range(12):
        b.cyl(METAL, 0.07, 0.0, 0.1, (-0.78 + k * 0.142, 0, 0.05), (PI, 0, 0), seg=3, scale=(1, 0.2, 1))
    for s in (-1, 1):
        b.cyl(WOOD, 0.045, 0.045, 0.34, (s * 0.9, 0, 0.3), seg=6)
    b.obj('it_saw_m', r)
    r = empty('it_shovel', loc=place(1.5)); b = B()
    b.cyl(WOOD, 0.03, 0.03, 0.95, (0, 0, 0.7), seg=6); b.box(WOOD, (0.2, 0.05, 0.05), (0, 0, 1.18))
    b.sph(METALD, 0.16, (0, 0, 0.14), (0.9, 0.25, 1.15), seg=7, rings=5)
    b.obj('it_shovel_m', r)
    r = empty('it_map', loc=place(1.5)); b = B()
    b.cyl(SAND, 0.07, 0.07, 0.5, (0, 0, 0.07), (0, PI / 2, 0), seg=8); b.cyl(RED, 0.075, 0.075, 0.06, (0, 0, 0.07), (0, PI / 2, 0), seg=8)
    b.obj('it_map_m', r)
    r = empty('it_piton', loc=place(1.5)); b = B()
    b.cyl(METAL, 0.035, 0.0, 0.34, (0, 0, 0.17), (PI, 0, 0), seg=5); b.cyl(ORANGE, 0.07, 0.07, 0.02, (0, 0.04, 0.34), (PI / 2, 0, 0), seg=8, caps=False)
    b.obj('it_piton_m', r)
    r = empty('it_medkit', loc=place(1.5)); b = B()
    b.box(WHITE, (0.4, 0.26, 0.26), (0, 0, 0.13)); b.box(RED, (0.2, 0.27, 0.06), (0, 0, 0.13)); b.box(RED, (0.06, 0.27, 0.2), (0, 0, 0.13)); b.box(METALD, (0.14, 0.04, 0.04), (0, 0, 0.28))
    b.obj('it_medkit_m', r)
    r = empty('it_coconut', loc=place(1.5)); b = B()
    b.sph(BARK2, 0.17, (0, 0, 0.17), seg=8, rings=6); b.sph(BLACK, 0.025, (0.05, -0.15, 0.2), seg=4, rings=3); b.sph(BLACK, 0.025, (-0.05, -0.15, 0.2), seg=4, rings=3)
    b.obj('it_coconut_m', r)
    r = empty('it_banana', loc=place(1.5)); b = B()
    for k in range(3):
        o = (k - 1) * 0.07
        b.limb(YEL, (-0.15, o, 0.06), (0, o * 1.3, 0.03), 0.03, 0.045, seg=6); b.limb(YEL, (0, o * 1.3, 0.03), (0.15, o, 0.1), 0.045, 0.025, seg=6)
    b.obj('it_banana_m', r)
    r = empty('it_can', loc=place(1.5)); b = B()
    b.cyl(METAL, 0.1, 0.1, 0.24, (0, 0, 0.12), seg=10); b.cyl(RED, 0.102, 0.102, 0.14, (0, 0, 0.12), seg=10, caps=False)
    b.obj('it_can_m', r)
    r = empty('it_drink', loc=place(1.5)); b = B()
    b.cyl(BLUE, 0.07, 0.07, 0.28, (0, 0, 0.14), seg=8); b.cyl(YEL, 0.072, 0.072, 0.08, (0, 0, 0.16), seg=8, caps=False); b.cyl(METAL, 0.05, 0.05, 0.02, (0, 0, 0.29), seg=8)
    b.obj('it_drink_m', r)
    r = empty('it_flare', loc=place(1.5)); b = B()
    b.cyl(RED, 0.045, 0.045, 0.36, (0, 0, 0.05), (0, PI / 2, 0), seg=7); b.cyl(YEL, 0.05, 0.05, 0.07, (0.16, 0, 0.05), (0, PI / 2, 0), seg=7)
    b.obj('it_flare_m', r)
    r = empty('it_compass', loc=place(1.5)); b = B()
    b.cyl(YEL, 0.13, 0.13, 0.05, (0, 0, 0.03), seg=12); b.cyl(WHITE, 0.11, 0.11, 0.052, (0, 0, 0.032), seg=12); b.box(RED, (0.03, 0.16, 0.01), (0, 0, 0.062))
    b.obj('it_compass_m', r)
    r = empty('it_backpack', loc=place(1.5)); b = B()
    b.sph(ORANGE, 0.24, (0, 0, 0.27), (0.95, 0.7, 1.15), seg=9, rings=7); b.box(METALD, (0.3, 0.1, 0.18), (0, -0.17, 0.2)); b.cyl(ROPE, 0.1, 0.1, 0.12, (0, 0, 0.56), (0, PI / 2, 0), seg=7)
    b.obj('it_backpack_m', r)
    r = empty('it_idol', loc=place(1.5)); b = B()
    b.cyl(YEL, 0.11, 0.14, 0.16, (0, 0, 0.08), seg=7); b.sph(YEL, 0.15, (0, 0, 0.3), (1, 0.85, 1.1), seg=8, rings=6); b.sph(RED, 0.035, (0.06, -0.12, 0.33), seg=5, rings=3); b.sph(RED, 0.035, (-0.06, -0.12, 0.33), seg=5, rings=3)
    b.obj('it_idol_m', r)

# ---------------------------------------------------------------- puzzle / gameplay
def gameplay():
    r = empty('totem', loc=place(2.5)); b = B()
    b.cyl(WOOD, 0.42, 0.38, 2.3, (0, 0, 1.15), seg=9)
    b.box(BARK2, (0.95, 0.5, 0.16), (0, 0, 2.38)); b.box(WOODL, (1.3, 0.12, 0.32), (0, 0, 1.75))        # wings
    b.box(SAND, (0.56, 0.08, 0.56), (0, -0.39, 1.15))                                                   # symbol plaque
    for s in (-1, 1):
        b.sph(WHITE, 0.09, (s * 0.15, -0.36, 2.0), (1, 0.5, 1.2), seg=7, rings=5); b.sph(BLACK, 0.045, (s * 0.15, -0.4, 2.0), seg=5, rings=4)
    b.box(RED, (0.36, 0.08, 0.1), (0, -0.39, 1.72)); b.cyl(YEL, 0.1, 0.0, 0.26, (0, -0.44, 1.88), (PI / 2 + 0.4, 0, 0), seg=4)
    b.obj('totem_m', r)
    r = empty('plate', loc=place(2.5)); b = B()
    b.cyl(ROCK2, 0.95, 1.05, 0.14, (0, 0, 0.07), seg=12); b.cyl(SAND, 0.75, 0.75, 0.06, (0, 0, 0.16), seg=12)
    b.obj('plate_m', r)
    r = empty('lever_base', loc=place(2)); b = B()
    b.box(ROCK2, (0.6, 0.6, 0.4), (0, 0, 0.2)); b.box(METALD, (0.12, 0.42, 0.2), (0, 0, 0.45)); b.obj('lever_base_m', r)
    r = empty('lever_arm', loc=place(2)); b = B()     # pivot at origin, points up
    b.cyl(WOOD, 0.045, 0.045, 0.85, (0, 0, 0.42), seg=6); b.sph(RED, 0.11, (0, 0, 0.9), seg=8, rings=6); b.obj('lever_arm_m', r)
    r = empty('gate', loc=place(6)); b = B()          # stone slab 5 wide, 4 high, slides down
    b.box(ROCK, (5.0, 0.7, 4.2), (0, 0, 2.1))
    for k in range(5):
        b.box(ROCK2, (0.7, 0.76, 0.5), (-2 + k, 0, 0.6 + (k % 2) * 2.4))
    b.cyl(SAND, 0.9, 0.9, 0.78, (0, 0, 2.3), (PI / 2, 0, 0), seg=12)
    b.obj('gate_m', r)
    r = empty('pillar', loc=place(3)); b = B()
    b.box(ROCK, (1.3, 1.3, 5.2), (0, 0, 2.6)); b.box(ROCK2, (1.6, 1.6, 0.5), (0, 0, 5.2)); b.box(ROCK2, (1.6, 1.6, 0.4), (0, 0, 0.2)); b.ico(MOSS, 0.6, (0.3, 0.2, 5.5), (1.5, 1.4, 0.4), sub=1, jit=0.1)
    b.obj('pillar_m', r)
    r = empty('campfire', loc=place(3)); b = B()
    for k in range(8):
        a = k / 8 * PI * 2; b.ico(ROCK if k % 2 else ROCK2, 0.2, (math.cos(a) * 0.62, math.sin(a) * 0.62, 0.1), (1, 1, 0.8), sub=1, jit=0.15, seed=k)
    for k in range(4):
        a = k * PI / 2 + 0.3; b.limb(BARK2, (math.cos(a) * 0.5, math.sin(a) * 0.5, 0.06), (-math.cos(a) * 0.12, -math.sin(a) * 0.12, 0.5), 0.08, 0.06, seg=5)
    b.obj('campfire_m', r)
    r = empty('chest_base', loc=place(2.5)); b = B()
    b.box(WOOD, (1.0, 0.62, 0.5), (0, 0, 0.25))
    for s in (-1, 0, 1):
        b.box(YEL, (0.1, 0.66, 0.54), (s * 0.42, 0, 0.25))
    b.obj('chest_base_m', r)
    r = empty('chest_lid', loc=place(2.5)); b = B()   # hinge at origin (back edge)
    b.cyl(WOOD, 0.31, 0.31, 1.0, (0, -0.31, 0), (0, PI / 2, 0), seg=10, scale=(1, 1, 1))
    for s in (-1, 0, 1):
        b.cyl(YEL, 0.33, 0.33, 0.1, (s * 0.42, -0.31, 0), (0, PI / 2, 0), seg=10)
    b.box(YEL, (0.14, 0.06, 0.18), (0, -0.64, -0.02))
    b.obj('chest_lid_m', r)
    r = empty('stake', loc=place(1.5)); b = B()       # rope anchor
    b.cyl(WOOD, 0.1, 0.07, 0.9, (0, 0, 0.35), seg=6); b.cyl(METAL, 0.14, 0.14, 0.03, (0, -0.12, 0.7), (PI / 2, 0, 0), seg=8, caps=False); b.cyl(RED, 0.105, 0.105, 0.1, (0, 0, 0.72), seg=6, caps=False)
    b.obj('stake_m', r)
    r = empty('sign', loc=place(2)); b = B()
    b.cyl(WOOD, 0.07, 0.07, 1.7, (0, 0, 0.85), seg=6); b.box(WOODL, (1.1, 0.07, 0.36), (0.1, -0.05, 1.45)); b.cyl(WOODL, 0.26, 0.0, 0.3, (0.78, -0.05, 1.45), (0, PI / 2, 0), seg=4, scale=(1, 0.3, 1))
    b.obj('sign_m', r)
    r = empty('xmark', loc=place(2)); b = B()
    b.box(RED, (1.5, 0.3, 0.03), (0, 0, 0.03), (0, 0, PI / 4)); b.box(RED, (1.5, 0.3, 0.03), (0, 0, 0.035), (0, 0, -PI / 4)); b.obj('xmark_m', r)
    r = empty('tent', loc=place(4)); b = B()
    b.cyl(ORANGE, 1.6, 0.0, 1.7, (0, 0, 0.85), seg=4, smooth=False, scale=(1, 1.3, 1)); b.box(BLACK, (0.6, 0.05, 0.9), (0, -1.12, 0.45), (0, 0, 0))
    b.obj('tent_m', r)
    r = empty('antenna', loc=place(5)); b = B()       # summit radio station
    for s in ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)):
        b.limb(METALD, (s[0], s[1], 0), (s[0] * 0.2, s[1] * 0.2, 7.5), 0.06, 0.04, seg=4)
    for k in range(6):
        z = 0.9 + k * 1.15; w = 1.0 - 0.8 * z / 7.5
        b.box(METALD, (w, 0.05, 0.05), (0, -w / 2, z)); b.box(METALD, (w, 0.05, 0.05), (0, w / 2, z)); b.box(METALD, (0.05, w, 0.05), (-w / 2, 0, z)); b.box(METALD, (0.05, w, 0.05), (w / 2, 0, z))
    b.limb(RED, (0, 0, 7.5), (0, 0, 9.0), 0.04, 0.02, seg=4); b.sph(RED, 0.12, (0, 0, 9.05), seg=6, rings=4)
    b.sph(WHITE, 0.8, (0.3, -0.5, 6.0), (1, 0.35, 1), (0.5, 0, 0.3), seg=10, rings=6)
    b.box(METAL, (1.4, 1.0, 1.1), (1.6, 0, 0.55)); b.box(RED, (1.5, 1.1, 0.12), (1.6, 0, 1.15)); b.box(BLACK, (0.5, 0.03, 0.36), (1.6, -0.5, 0.7)); b.sph(YEL, 0.07, (2.05, -0.5, 0.85), seg=5, rings=4)
    b.obj('antenna_m', r)
    r = empty('heli_body', loc=place(7)); b = B()
    b.sph(RED, 1.3, (0, 0, 0), (1, 1.75, 1.05), seg=12, rings=8); b.sph(GLASS, 1.1, (0, -1.15, 0.2), (1.0, 1.1, 0.85), seg=10, rings=7)
    b.limb(RED, (0, 1.5, 0.3), (0, 5.6, 0.7), 0.45, 0.16, seg=8); b.box(WHITE, (0.1, 0.9, 1.3), (0, 5.5, 1.2), (-0.3, 0, 0)); b.box(WHITE, (2.8, 3.52, 0.12), (0, 0, 0), (0, 0, 0))
    b.cyl(METALD, 0.14, 0.14, 0.6, (0, 0, 1.45), seg=6)
    for s in (-1, 1):
        b.limb(METALD, (s * 0.95, -1.7, -1.55), (s * 0.95, 1.7, -1.55), 0.06, 0.06, seg=5); b.limb(METALD, (s * 0.6, -0.8, -0.9), (s * 0.95, -0.8, -1.55), 0.04, 0.04, seg=4); b.limb(METALD, (s * 0.6, 0.8, -0.9), (s * 0.95, 0.8, -1.55), 0.04, 0.04, seg=4)
    b.obj('heli_body_m', r)
    r = empty('heli_rotor', loc=place(7)); b = B()
    b.box(METALD, (9.5, 0.3, 0.04), (0, 0, 0)); b.box(METALD, (0.3, 9.5, 0.04), (0, 0, 0)); b.cyl(METALD, 0.25, 0.25, 0.14, (0, 0, 0), seg=8); b.obj('heli_rotor_m', r)

# ---------------------------------------------------------------- animals (jointed parts)
def animals():
    r = empty('crab', loc=place(1.5)); b = B()
    b.sph(RED, 0.2, (0, 0, 0.14), (1.25, 0.9, 0.6), seg=9, rings=6)
    for s in (-1, 1):
        b.limb(RED, (s * 0.08, -0.13, 0.2), (s * 0.08, -0.17, 0.3), 0.012, 0.012, seg=4); b.sph(BLACK, 0.03, (s * 0.08, -0.17, 0.31), seg=5, rings=4)
        for k in range(3):
            b.limb(ORANGE, (s * 0.18, 0.08 - k * 0.08, 0.12), (s * 0.36, 0.12 - k * 0.1, 0.0), 0.025, 0.012, seg=4)
    b.obj('crab_body', r)
    for s, n in ((-1, 'L'), (1, 'R')):
        b = B(); b.limb(RED, (0, 0, 0), (s * 0.08, -0.14, 0.03), 0.03, 0.03, seg=5); b.sph(RED, 0.085, (s * 0.1, -0.2, 0.05), (1, 1.3, 0.7), seg=7, rings=5)
        b.obj('crab_claw' + n, r, (s * 0.2, -0.12, 0.14))
    r = empty('parrot', loc=place(1.5)); b = B()
    b.sph(RED, 0.14, (0, 0, 0), (0.85, 1.5, 0.9), seg=8, rings=6); b.sph(RED, 0.1, (0, -0.2, 0.08), seg=8, rings=6)
    b.cyl(YEL, 0.045, 0.0, 0.11, (0, -0.31, 0.06), (PI / 2 + 0.3, 0, 0), seg=5); b.sph(BLACK, 0.02, (0.06, -0.25, 0.11), seg=4, rings=3); b.sph(BLACK, 0.02, (-0.06, -0.25, 0.11), seg=4, rings=3)
    b.box(BLUE, (0.1, 0.36, 0.02), (0, 0.33, -0.03), (0.15, 0, 0))
    b.obj('parrot_body', r)
    for s, n in ((-1, 'L'), (1, 'R')):
        b = B(); b.box(RED, (0.22, 0.24, 0.02), (s * 0.11, 0, 0)); b.box(YEL, (0.2, 0.2, 0.02), (s * 0.3, 0.02, 0)); b.box(BLUE, (0.2, 0.15, 0.02), (s * 0.46, 0.04, 0))
        b.obj('parrot_wing' + n, r, (s * 0.1, 0, 0.05))
    r = empty('gull', loc=place(1.5)); b = B()
    b.sph(WHITE, 0.13, (0, 0, 0), (0.85, 1.6, 0.85), seg=8, rings=6); b.sph(WHITE, 0.085, (0, -0.2, 0.06), seg=7, rings=5); b.cyl(YEL, 0.035, 0.0, 0.12, (0, -0.31, 0.05), (PI / 2, 0, 0), seg=4)
    b.obj('gull_body', r)
    for s, n in ((-1, 'L'), (1, 'R')):
        b = B(); b.box(WHITE, (0.34, 0.2, 0.02), (s * 0.17, 0, 0)); b.box(METALD, (0.3, 0.14, 0.02), (s * 0.47, 0.03, 0)); b.obj('gull_wing' + n, r, (s * 0.09, 0, 0.04))
    r = empty('butterfly', loc=place(1));
    b = B(); b.limb(BLACK, (0, -0.06, 0), (0, 0.06, 0), 0.012, 0.012, seg=4); b.obj('butterfly_body', r)
    for s, n in ((-1, 'L'), (1, 'R')):
        b = B(); b.quad(ORANGE, [(0, -0.07, 0), (s * 0.13, -0.11, 0), (s * 0.15, 0.02, 0), (0, 0.02, 0)], double=True); b.quad(YEL, [(0, 0.02, 0), (s * 0.11, 0.02, 0), (s * 0.08, 0.1, 0), (0, 0.06, 0)], double=True)
        b.obj('butterfly_wing' + n, r)
    fur = M('fur_brown', '#8a5a34'); face = M('fur_face', '#e8c79a')
    r = empty('monkey', loc=place(2)); b = B()
    b.sph(fur, 0.22, (0, 0, 0.42), (0.9, 0.85, 1.15), seg=8, rings=6); b.sph(fur, 0.19, (0, -0.04, 0.8), seg=9, rings=7); b.sph(face, 0.13, (0, -0.13, 0.77), (1, 0.6, 0.9), seg=7, rings=5)
    for s in (-1, 1):
        b.sph(face, 0.08, (s * 0.2, 0, 0.82), (0.4, 1, 1), seg=6, rings=4); b.sph(BLACK, 0.025, (s * 0.06, -0.19, 0.82), seg=4, rings=3)
        b.limb(fur, (s * 0.16, 0, 0.3), (s * 0.2, -0.1, 0.03), 0.07, 0.06, seg=5)
    b.limb(fur, (0, 0.15, 0.3), (0, 0.5, 0.5), 0.04, 0.03, seg=5); b.limb(fur, (0, 0.5, 0.5), (0, 0.45, 0.85), 0.03, 0.025, seg=5)
    b.obj('monkey_body', r)
    for s, n in ((-1, 'L'), (1, 'R')):
        b = B(); b.limb(fur, (0, 0, 0), (s * 0.08, -0.05, -0.38), 0.06, 0.05, seg=5); b.sph(face, 0.065, (s * 0.08, -0.05, -0.42), seg=5, rings=4); b.obj('monkey_arm' + n, r, (s * 0.2, 0, 0.6))
    wool = M('goat_wool', '#efe9dd')
    r = empty('goat', loc=place(2.5)); b = B()
    b.sph(wool, 0.36, (0, 0, 0.75), (0.8, 1.45, 0.85), seg=9, rings=7); b.sph(wool, 0.2, (0, -0.62, 1.05), (0.8, 1.15, 0.95), seg=8, rings=6); b.sph(METALD, 0.09, (0, -0.83, 1.0), seg=6, rings=4)
    b.limb(wool, (0, -0.5, 0.75), (0, -0.56, 0.65), 0.05, 0.02, seg=4)
    for s in (-1, 1):
        b.limb(SAND, (s * 0.09, -0.55, 1.2), (s * 0.14, -0.4, 1.48), 0.045, 0.012, seg=5); b.sph(BLACK, 0.025, (s * 0.12, -0.74, 1.1), seg=4, rings=3)
        for y in (-0.33, 0.33):
            b.limb(wool, (s * 0.17, y, 0.6), (s * 0.17, y, 0.06), 0.07, 0.045, seg=5); b.box(BLACK, (0.1, 0.12, 0.08), (s * 0.17, y - 0.01, 0.04))
    b.obj('goat_body', r)
    shell = M('shell', '#4f8a56'); tskin = M('turtle_skin', '#9cc46a')
    r = empty('turtle', loc=place(2)); b = B()
    b.sph(shell, 0.34, (0, 0, 0.17), (1, 1.2, 0.6), seg=9, rings=6); b.sph(tskin, 0.11, (0, -0.47, 0.17), seg=7, rings=5)
    for s in (-1, 1):
        b.sph(BLACK, 0.02, (s * 0.06, -0.55, 0.21), seg=4, rings=3)
        for y in (-0.25, 0.25):
            b.sph(tskin, 0.1, (s * 0.33, y, 0.07), (1.2, 0.8, 0.4), seg=6, rings=4)
    b.obj('turtle_body', r)
    r = empty('fish', loc=place(1.5)); b = B()
    b.sph(ORANGE, 0.12, (0, 0, 0), (0.45, 1.5, 0.9), seg=7, rings=5); b.cyl(ORANGE, 0.1, 0.0, 0.14, (0, 0.22, 0), (PI / 2, 0, 0), seg=4, scale=(0.3, 1, 1)); b.sph(BLACK, 0.018, (0.04, -0.12, 0.03), seg=4, rings=3)
    b.obj('fish_body', r)

plane(); palm('palm_a', 7.0, 1.0, 1); palm('palm_b', 5.5, -1.4, 2)
jtree('jtree_a', 8.0, 0.55, 11); jtree('jtree_b', 11.0, 0.5, 12, umbrella=True); jtree('jtree_c', 6.0, 0.4, 13)
lookout(); small_plants(); rocks(); woods(); items(); gameplay(); animals()
