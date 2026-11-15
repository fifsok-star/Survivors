# Survivors - giant pirate skeleton (jointed, animated by the game) and the intact plane for the intro.
# Blender: X right, -Y front, Z up.  Part origins sit on the joints.
PI = math.pi
BONE = M('bone', '#efe7d2'); BONE2 = M('bone_shade', '#d8cdb2'); HOLE = M('bone_hole', '#2a221e'); EYE = M('eye_glow', '#ff3a1a')
RAG = M('rag_red', '#b8302f'); RAG2 = M('rag_dark', '#6e2a24'); BELT = M('belt', '#4a3424'); GOLDB = M('gold', '#f2c230')

def rib_arc(b, z, w, d, side, thick=0.022):
    pts = []
    for k in range(7):
        a = k / 6 * PI * .92
        pts.append((side * math.sin(a) * w, -math.cos(a) * d * .1 + (math.sin(a) * d * .0) - (1 - math.cos(a)) * d * .5 + d * .02, z - k * .008))
    for k in range(6):
        b.limb(BONE, pts[k], pts[k + 1], thick, thick * .9, seg=5)

def skeleton():
    root = empty('skel', loc=place(3))
    body = empty('sk_body', root, (0, 0, 0))
    # pelvis
    b = B()
    b.sph(BONE, .17, (0, 0, 0), (1.25, .7, .55), seg=10, rings=7)
    for s in (-1, 1):
        b.sph(BONE2, .1, (s * .13, .02, .04), (.8, .5, 1.1), seg=8, rings=5)
    b.cyl(BELT, .2, .2, .06, (0, 0, .1), seg=12, scale=(1.1, .8, 1))
    b.box(GOLDB, (.08, .03, .07), (0, -.17, .1))
    b.box(RAG2, (.36, .2, .16), (0, .02, -.04), (0, 0, 0))           # torn trousers
    for k in range(5):
        b.box(RAG2, (.06, .02, .12 + (k % 2) * .05), (-.14 + k * .07, -.1, -.16 - (k % 2) * .03), (.1, 0, (k - 2) * .1))
    hips = b.obj('sk_hips', body, (0, 0, .98))
    # spine + ribs + shoulders
    b = B()
    for k in range(3): b.sph(BONE2, .065, (0, .03, -.04 + k * .07), (1.2, 1, .7), seg=8, rings=5)   # lumbar vertebrae
    for k in range(7):
        b.cyl(BONE, .042, .042, .055, (0, .03, .04 + k * .085), seg=7)
        b.box(BONE2, (.05, .05, .03), (0, .07, .05 + k * .085))
    for k in range(5):
        z = .24 + k * .075; w = .17 - abs(k - 2) * .012
        for s in (-1, 1): rib_arc(b, z, w, .2, s)
    b.box(BONE, (.05, .03, .26), (0, -.17, .32), (.12, 0, 0))            # sternum
    b.limb(BONE, (-.27, .02, .56), (.27, .02, .56), .028, .028, seg=6)   # collarbones
    for s in (-1, 1): b.sph(BONE2, .09, (s * .14, .09, .5), (1, .3, 1.3), seg=8, rings=5)   # shoulder blades
    # tattered shirt remains
    b.box(RAG, (.08, .02, .22), (-.15, -.17, .45), (.2, 0, .3)); b.box(RAG, (.07, .02, .18), (.16, -.16, .47), (.2, 0, -.35))
    b.box(RAG, (.4, .1, .05), (0, .02, .58))
    torso = b.obj('sk_torso', hips, (0, 0, .06))
    # skull (jaw separate)
    b = B()
    b.sph(BONE, .2, (0, 0, .15), (1.0, 1.08, 1.0), seg=14, rings=10)
    b.sph(BONE2, .13, (0, -.08, .03), (1.1, 1, .7), seg=10, rings=6)        # cheeks / upper jaw
    for s in (-1, 1):
        b.sph(HOLE, .062, (s * .075, -.17, .14), (1, .6, 1.05), seg=8, rings=6)
        b.sph(EYE, .028, (s * .075, -.205, .14), seg=6, rings=4)
        b.sph(BONE, .045, (s * .14, -.12, .08), (1, .8, .6), seg=6, rings=4)   # cheekbones
    b.cyl(HOLE, .03, .0, .06, (0, -.205, .065), (PI / 2, 0, 0), seg=3)       # nose hole
    for k in range(6): b.box(WHITE_T, (.024, .02, .035), (-.06 + k * .024, -.19, -.005))
    # pirate bandana with a knot
    b.sph(RAG, .21, (0, .02, .2), (1.03, 1.05, .78), seg=12, rings=7)
    b.sph(RAG, .05, (.12, .17, .2), seg=6, rings=4)
    b.box(RAG, (.05, .02, .16), (.14, .2, .1), (.3, 0, .3)); b.box(RAG, (.05, .02, .13), (.1, .21, .1), (.3, 0, -.2))
    head = b.obj('sk_head', torso, (0, 0, .7))
    b = B()
    b.box(BONE, (.17, .14, .05), (0, -.08, -.02))
    for k in range(5): b.box(WHITE_T, (.022, .018, .03), (-.05 + k * .025, -.145, .015))
    b.obj('sk_jaw', head, (0, 0, .02))
    # limbs
    for sx, n in ((-1, 'L'), (1, 'R')):
        b = B(); b.sph(BONE2, .06, (0, 0, 0), seg=8, rings=5); b.limb(BONE, (0, 0, 0), (0, 0, -.33), .036, .03, seg=7); b.sph(BONE2, .045, (0, 0, -.33), seg=6, rings=4)
        b.cyl(RAG, .065, .06, .09, (0, 0, -.06), seg=8)
        arm = b.obj('sk_arm' + n, torso, (sx * .27, 0, .56))
        b = B(); b.limb(BONE, (sx * .012, 0, 0), (sx * .012, 0, -.32), .026, .024, seg=6); b.limb(BONE, (-sx * .014, 0, 0), (-sx * .014, 0, -.32), .02, .018, seg=6)
        b.sph(BONE2, .045, (0, -.01, -.35), (1.1, .7, .9), seg=8, rings=5)
        for k in (-1, 0, 1): b.limb(BONE, (k * .028, -.02, -.37), (k * .04, -.06, -.5), .012, .007, seg=4)   # claws
        b.limb(BONE, (sx * -.04, -.02, -.36), (sx * -.07, -.07, -.44), .011, .007, seg=4)
        b.obj('sk_fore' + n, arm, (0, 0, -.33))
        b = B(); b.sph(BONE2, .065, (0, 0, 0), seg=8, rings=5); b.limb(BONE, (0, 0, 0), (0, 0, -.46), .045, .036, seg=7); b.sph(BONE2, .05, (0, 0, -.46), seg=6, rings=4)
        leg = b.obj('sk_leg' + n, hips, (sx * .12, 0, -.04))
        b = B(); b.limb(BONE, (0, 0, 0), (0, 0, -.44), .036, .03, seg=7); b.limb(BONE, (sx * .03, 0, -.02), (sx * .03, 0, -.42), .016, .014, seg=5)
        b.box(BONE, (.1, .2, .05), (0, -.06, -.47));
        for k in (-1, 0, 1): b.limb(BONE, (k * .03, -.15, -.48), (k * .035, -.22, -.49), .012, .01, seg=4)
        b.obj('sk_shin' + n, leg, (0, 0, -.46))
    # pile of bones for a defeated skeleton
    r = empty('skel_pile', loc=place(3)); b = B(); rnd = random.Random(7)
    for k in range(10):
        a = rnd.uniform(0, 6.28); d = rnd.uniform(0, .7); L = rnd.uniform(.3, .6)
        p0 = (math.cos(a) * d, math.sin(a) * d, .05); ang = rnd.uniform(0, 6.28)
        b.limb(BONE, p0, (p0[0] + math.cos(ang) * L, p0[1] + math.sin(ang) * L, .07), .04, .035, seg=6)
    b.sph(BONE, .26, (.2, .1, .18), seg=12, rings=8); b.sph(RAG, .27, (.2, .12, .24), (1.02, 1.04, .7), seg=10, rings=6)
    for s in (-1, 1): b.sph(HOLE, .07, (.2 + s * .09, -.1, .18), (1, .6, 1), seg=6, rings=4)
    for k in range(4): rib_arc(b, .06, .2, .2, 1 if k % 2 else -1)
    b.obj('skel_pile_m', r)

def plane_fly():
    r = empty('plane_fly', loc=place(14)); b = B()
    b.cyl(WHITE, 1.7, 1.7, 18, (0, 0, 0), (PI / 2, 0, 0), seg=18)
    b.cyl(BLUE, 1.72, 1.72, 18, (0, 0, -.35), (PI / 2, 0, 0), seg=18, caps=False, scale=(1, .18, 1))
    b.sph(WHITE, 1.7, (0, -9, 0), (1, 1.6, 1), seg=16, rings=10)
    b.sph(BLACK, 1.22, (0, -10.2, .55), (1.05, 1.0, .55), seg=12, rings=7)
    b.cyl(WHITE, 1.7, .5, 7, (0, 12.4, .35), (-PI / 2, 0, 0), seg=18)
    b.box(BLUE, (.25, 3.2, 4.2), (0, 14, 2.6), (-.45, 0, 0))
    b.box(WHITE, (8, 2.2, .2), (0, 14.2, .8))
    b.box(WHITE, (22, 3.6, .32), (0, -.8, -.6))
    for s in (-1, 1):
        b.box(BLUE, (1.4, 3.65, .34), (s * 10.4, -.8, -.6))
        b.cyl(METALD, .75, .62, 3.4, (s * 5.2, -1.6, -1.4), (PI / 2, 0, 0), seg=14)
        b.cyl(BLACK, .6, .6, .1, (s * 5.2, -3.32, -1.4), (PI / 2, 0, 0), seg=14)
        b.cyl(METAL, .2, .0, .5, (s * 5.2, -3.4, -1.4), (PI / 2, 0, 0), seg=8)
        for i in range(9): b.sph(GLASS, .22, (s * 1.66, 6 - i * 1.5, .45), (.25, 1.2, 1), seg=8, rings=5)
        b.box(METALD, (.05, .9, 1.6), (s * 1.69, -6.5, -.1))                 # door outline
    b.box(RED, (.06, .5, .5), (1.71, -5.3, .9))                              # door handle stripe
    b.obj('plane_fly_m', r)

WHITE_T = M('teeth', '#fffaf0')
skeleton(); plane_fly()
