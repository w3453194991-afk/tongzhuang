# -*- coding: utf-8 -*-
"""童装款式图生成器 v4：272 张 900×1200 平铺款图 + 品牌 logo。
   视觉语言：奶油底 + 平滑轮廓的服装平铺插画（印花 / 罗纹 / 缝线 / 吊牌），纯程序绘制。
   输入 build/kids-image-spec.json，输出 assets/img/p/{sku}.jpg
   运行：python build\\make_kids_images.py [数量]
"""
import json, math, os, random, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPEC = os.path.join(ROOT, 'build', 'kids-image-spec.json')
OUT = os.path.join(ROOT, 'assets', 'img', 'p')

W, H = 900, 1200
S = 2
CW, CH = W * S, H * S
INK = (47, 58, 63)
CORAL = '#E8896F'

# ---------------- 颜色 ----------------
def hex2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def mix(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(round(a + (b - a) * t)) for a, b in zip(c1, c2))

def shade(c, t):
    return mix(c, (255, 255, 255), t) if t >= 0 else mix(c, (32, 27, 22), -t)

def rgb2hsl(c):
    r, g, b = [x / 255 for x in c]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    if mx == mn:
        h = s = 0.0
    else:
        d = mx - mn
        s = d / (2 - mx - mn) if l > .5 else d / (mx + mn)
        if mx == r: h = ((g - b) / d + (6 if g < b else 0)) / 6
        elif mx == g: h = ((b - r) / d + 2) / 6
        else: h = ((r - g) / d + 4) / 6
    return h, s, l

def hsl2rgb(h, s, l):
    def f(p, q, t):
        t %= 1
        if t < 1 / 6: return p + (q - p) * 6 * t
        if t < 1 / 2: return q
        if t < 2 / 3: return p + (q - p) * (2 / 3 - t) * 6
        return p
    if s == 0:
        r = g = b = l
    else:
        q = l * (1 + s) if l < .5 else l + s - l * s
        p = 2 * l - q
        r, g, b = f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)
    return tuple(int(round(x * 255)) for x in (r, g, b))

def tune(c, ds=0.0, dl=0.0):
    h, s, l = rgb2hsl(c)
    return hsl2rgb(h, max(0.0, min(1.0, s + ds)), max(0.0, min(1.0, l + dl)))

_cf = {}
def font(size, bold=False):
    key = (int(size), bold)
    if key in _cf: return _cf[key]
    cands = [r'C:\Windows\Fonts\msyhbd.ttc' if bold else r'C:\Windows\Fonts\msyh.ttc',
             r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\simhei.ttf']
    f = None
    for p in cands:
        if os.path.exists(p):
            try:
                f = ImageFont.truetype(p, int(size)); break
            except Exception:
                pass
    _cf[key] = f or ImageFont.load_default()
    return _cf[key]

# ---------------- 曲线 ----------------
def catmull(pts, n=22, closed=True):
    """Catmull-Rom 平滑：把控制点变成密集点"""
    P = list(pts)
    if closed:
        P = [P[-1]] + P + [P[0], P[1]]
    else:
        P = [P[0]] + P + [P[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t +
                       (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
                       (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t +
                       (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
                       (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            out.append((x, y))
    return out

def mirror(pts, cx):
    return [(2 * cx - x, y) for (x, y) in pts]

def smooth_closed(half, cx):
    """右半控制点 + 镜像 → 闭合平滑轮廓"""
    full = half + mirror(list(reversed(half)), cx)
    return catmull(full, 16, True)

# ---------------- 印花 ----------------
def pattern_layer(size, base, pat, rnd):
    w, h = size
    im = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    dark = shade(base, -0.24)
    light = shade(base, 0.68)
    accs = [hex2rgb(x) for x in ('#EF9AA6', '#8FB6D9', '#F0CE6A', '#9DC3A2', '#EE9E7C', '#C2A6D9')]
    if pat == 'solid':
        for _ in range(w * h // 1400):
            d.point((rnd.randrange(w), rnd.randrange(h)), fill=(*shade(base, -0.05), 70))
        return im
    if pat == 'stripe':
        for x in range(-h, w + 60, 58):
            d.line([(x, 0), (x + h, h)], fill=(*dark, 95), width=26)
        return im
    if pat == 'dot':
        step = 84
        for y in range(0, h + step, step):
            for x in range(0, w + step, step):
                ox = step // 2 if (y // step) % 2 else 0
                d.ellipse([x + ox - 12, y - 12, x + ox + 12, y + 12], fill=(*light, 232))
        return im
    if pat == 'check':
        step = 92
        for x in range(0, w, step):
            d.rectangle([x, 0, x + 34, h], fill=(*dark, 52))
        for y in range(0, h, step):
            d.rectangle([0, y, w, y + 34], fill=(*dark, 52))
        for x in range(0, w, step):
            for y in range(0, h, step):
                d.rectangle([x, y, x + 34, y + 34], fill=(*dark, 56))
        return im
    if pat == 'floral':
        for _ in range(200):
            cx, cy = rnd.randrange(w), rnd.randrange(h)
            r = rnd.randint(8, 15)
            c = rnd.choice(accs)
            for k in range(5):
                a = 2 * math.pi * k / 5 + rnd.random()
                d.ellipse([cx + math.cos(a) * r - 6, cy + math.sin(a) * r - 6,
                           cx + math.cos(a) * r + 6, cy + math.sin(a) * r + 6], fill=(*c, 230))
            d.ellipse([cx - 3.5, cy - 3.5, cx + 3.5, cy + 3.5], fill=(*light, 245))
        return im
    if pat == 'letter':
        f = font(48, True)
        for y in range(20, h, 144):
            for x in range(0, w, 156):
                d.text((x, y), 'XM', font=f, fill=(*light, 215))
        return im
    if pat == 'star':
        for _ in range(95):
            cx, cy = rnd.randrange(w), rnd.randrange(h)
            r = rnd.randint(9, 17)
            pts = []
            for k in range(10):
                a = -math.pi / 2 + k * math.pi / 5
                rr = r if k % 2 == 0 else r * .45
                pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
            d.polygon(pts, fill=(*light, 238))
        return im
    if pat == 'cloud':
        for _ in range(36):
            cx, cy = rnd.randrange(w), rnd.randrange(h)
            r = rnd.randint(20, 32)
            for dx, dy, rr in ((-r * .8, 3, r * .68), (0, -r * .3, r), (r * .8, 4, r * .64)):
                d.ellipse([cx + dx - rr, cy + dy - rr, cx + dx + rr, cy + dy + rr], fill=(*light, 215))
        return im
    if pat == 'bear':
        c = shade(base, -0.30)
        for _ in range(32):
            cx, cy = rnd.randrange(w), rnd.randrange(h)
            r = rnd.randint(18, 25)
            for dx in (-r * .78, r * .78):
                d.ellipse([cx + dx - r * .36, cy - r * .95 - r * .36,
                           cx + dx + r * .36, cy - r * .95 + r * .36], fill=(*c, 222))
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*c, 222))
            d.ellipse([cx - r * .16, cy - r * .18, cx + r * .16, cy + r * .16], fill=(255, 252, 246, 240))
        return im
    if pat == 'denim':
        for i in range(-h, w, 14):
            d.line([(i, 0), (i + h, h)], fill=(*shade(base, 0.44), 70), width=3)
        for _ in range(65):
            cx, cy = rnd.randrange(w), rnd.randrange(h)
            d.line([(cx, cy), (cx + rnd.randint(26, 96), cy + rnd.randint(-10, 10))],
                   fill=(*shade(base, 0.54), 88), width=4)
        return im
    if pat == 'planet':
        for _ in range(36):
            cx, cy = rnd.randrange(w), rnd.randrange(h)
            r = rnd.randint(13, 21)
            c = rnd.choice(accs)
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*c, 234))
            d.arc([cx - r * 1.8, cy - r * .55, cx + r * 1.8, cy + r * .55], 0, 360,
                  fill=(*shade(base, -0.26), 200), width=4)
        return im
    if pat == 'lace':
        for y in range(0, h, 94):
            for x in range(0, w, 94):
                d.arc([x - 38, y - 38, x + 38, y + 38], 0, 360, fill=(*light, 105), width=3)
        return im
    return im

# ---------------- 服装轮廓 ----------------
def px(x): return x * CW
def py(y): return y * CH

# 平铺位置（相对画布的比例坐标）
T = {
    'tee':    dict(neck=(0.500, 0.212), half=[
        (0.500, 0.212), (0.556, 0.216), (0.634, 0.238), (0.690, 0.256), (0.742, 0.288),
        (0.790, 0.320), (0.792, 0.356), (0.752, 0.372), (0.706, 0.346), (0.712, 0.470),
        (0.718, 0.640), (0.722, 0.742), (0.690, 0.756), (0.560, 0.762), (0.500, 0.764)]),
}
def ctrl_tee(neck_y=0.212, hem_y=0.762, sleeve=1.0, flare=0.0):
    """右半控制点：领口 → 肩 → 袖 → 腋 → 侧缝 → 下摆"""
    n = (0.5, neck_y)
    sw = 0.5 + 0.072
    pts = [n, (0.556, neck_y + 0.004), (0.634, neck_y + 0.026),
           (0.5 + 0.190 * sleeve, neck_y + 0.044), (0.5 + 0.242 * sleeve, neck_y + 0.076),
           (0.5 + 0.290 * sleeve, neck_y + 0.108), (0.5 + 0.292 * sleeve, neck_y + 0.144),
           (0.5 + 0.252 * sleeve, neck_y + 0.160), (0.5 + 0.206 * sleeve, neck_y + 0.134)]
    # 侧缝
    waist_y = neck_y + (hem_y - neck_y) * 0.55
    pts += [(0.5 + 0.212, waist_y), (0.5 + 0.222 + flare, hem_y - 0.020)]
    # 下摆
    pts += [(0.5 + 0.190 + flare, hem_y), (0.5 + 0.060, hem_y + 0.004), (0.5, hem_y + 0.004)]
    return pts

def draw_masks(kind, rnd):
    """返回 [(mask, color_kind)]，mask 为 L 模式"""
    layer = Image.new('L', (CW, CH), 0)
    d = ImageDraw.Draw(layer)
    def to_px(ctrl):
        return [(x * CW, y * CH) for (x, y) in ctrl]
    def poly(ctrl, cx=CW * 0.5):
        pts = smooth_closed(to_px(ctrl), cx)
        d.polygon(pts, fill=255)
        return pts

    parts = []
    if kind in ('tee', 'hoodie', 'coat', 'lounge', 'bodysuit'):
        hem = {'tee': 0.762, 'hoodie': 0.775, 'coat': 0.790, 'lounge': 0.700, 'bodysuit': 0.700}[kind]
        sle = {'tee': 1.0, 'hoodie': 1.26, 'coat': 1.10, 'lounge': 1.30, 'bodysuit': 0.92}[kind]
        poly(ctrl_tee(0.212, hem, sle))
        parts.append(layer)
        if kind == 'lounge':
            # 家居裤放在上衣下方
            c = Image.new('L', (CW, CH), 0)
            dc = ImageDraw.Draw(c)
            dc.rounded_rectangle([px(0.315), py(0.722), px(0.685), py(0.752)], radius=py(0.010), fill=255)
            for sgn in (-1, 1):
                dc.polygon([(px(0.5 + sgn * 0.178), py(0.740)), (px(0.5 + sgn * 0.182), py(0.905)),
                            (px(0.5 + sgn * 0.120), py(0.918)), (px(0.5 + sgn * 0.055), py(0.900)),
                            (px(0.5 + sgn * 0.052), py(0.740))], fill=255)
            parts.append(c)
        if kind == 'bodysuit':
            c = Image.new('L', (CW, CH), 0)
            dc = ImageDraw.Draw(c)
            dc.polygon([(px(0.40), py(0.70)), (px(0.60), py(0.70)),
                        (px(0.565), py(0.775)), (px(0.435), py(0.775))], fill=255)
            parts.append(c)

    elif kind == 'dress':
        hem = 0.800
        pts = ctrl_tee(0.204, 0.470, 0.94)
        # 替换下摆段：收腰后 A 字展开
        pts = pts[:9] + [(0.5 + 0.208, 0.400), (0.5 + 0.202, 0.462),
                         (0.5 + 0.300, 0.640), (0.5 + 0.345, 0.788),
                         (0.5 + 0.300, hem - 0.004), (0.5 + 0.120, hem + 0.006), (0.5, hem + 0.008)]
        poly(pts)
        parts.append(layer)

    elif kind == 'pants':
        # 腰头
        d.rounded_rectangle([px(0.298), py(0.222), px(0.702), py(0.278)], radius=py(0.012), fill=255)
        # 两条腿
        for sgn in (-1, 1):
            ctrl = [
                (0.5 + sgn * 0.196, 0.252), (0.5 + sgn * 0.200, 0.380),
                (0.5 + sgn * 0.196, 0.560), (0.5 + sgn * 0.188, 0.760),
                (0.5 + sgn * 0.112, 0.775), (0.5 + sgn * 0.058, 0.700),
                (0.5 + sgn * 0.045, 0.540), (0.5 + sgn * 0.030, 0.330), (0.5 + sgn * 0.030, 0.252)
            ]
            pts = catmull(to_px(ctrl), 18, True)
            d.polygon(pts, fill=255)
        parts.append(layer)

    elif kind == 'set':
        # 上衣（小一号）
        poly(ctrl_tee(0.150, 0.500, 0.95))
        parts.append(layer)
        # 短裤
        c = Image.new('L', (CW, CH), 0)
        dc = ImageDraw.Draw(c)
        dc.rounded_rectangle([px(0.330), py(0.545), px(0.670), py(0.580)], radius=py(0.010), fill=255)
        for sgn in (-1, 1):
            dc.polygon([(px(0.5 + sgn * 0.170), py(0.560)), (px(0.5 + sgn * 0.176), py(0.680)),
                        (px(0.5 + sgn * 0.115), py(0.700)), (px(0.5 + sgn * 0.060), py(0.680)),
                        (px(0.5 + sgn * 0.055), py(0.560))], fill=255)
        parts.append(c)

    return parts

# ---------------- 服装渲染 ----------------
def garment_image(kind, base, pat, rnd):
    parts = draw_masks(kind, rnd)
    mask = Image.new('L', (CW, CH), 0)
    for p in parts:
        mask = ImageChops.lighter(mask, p)
    mask = mask.filter(ImageFilter.GaussianBlur(0.8 * S))

    fabric = Image.new('RGBA', (CW, CH), (*base, 255))
    fabric = Image.alpha_composite(fabric, pattern_layer((CW, CH), base, pat, rnd))

    g = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    g.paste(fabric, (0, 0), mask)

    # 明暗：上亮下暗 + 左侧高光
    grad = Image.new('L', (1, CH))
    for y in range(CH):
        grad.putpixel((0, y), int(255 * (1 - 0.16 * (y / CH))))
    grad = grad.resize((CW, CH))
    g = Image.composite(g.convert('RGB'), Image.new('RGB', (CW, CH), shade(base, -0.10)), grad)
    side = Image.new('L', (CW, 1))
    for x in range(CW):
        t = x / CW
        side.putpixel((x, 0), int(255 * min(1, max(0, 0.15 + 1.1 * t))))
    side = side.resize((CW, CH))
    g = Image.composite(g.convert('RGB'), Image.blend(g.convert('RGB'), Image.new('RGB', (CW, CH), (255, 255, 255)), 0.13), side)
    g = g.convert('RGBA')
    g.putalpha(mask)

    # 边缘暗部
    inner = ImageChops.subtract(mask.filter(ImageFilter.GaussianBlur(CW * .018)), mask)
    edge = Image.eval(inner, lambda v: min(255, v * 3)).point(lambda v: int(v * 0.42))
    shadow = Image.new('RGBA', (CW, CH), (34, 26, 20, 0))
    shadow.putalpha(Image.composite(edge, Image.new('L', (CW, CH), 0), mask))
    g = Image.alpha_composite(g, shadow)

    # 描边
    stroke = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(7)))
    stroke = stroke.point(lambda v: 255 if v > 20 else 0).filter(ImageFilter.GaussianBlur(0.8 * S))
    line = Image.new('RGBA', (CW, CH), (*shade(base, -0.38), 120))
    g = Image.composite(line, g, stroke)
    return g, mask

def add_details(canvas, mask, kind, base):
    det = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    d = ImageDraw.Draw(det)
    ink = (*shade(base, -0.48), 118)
    lw = int(2.4 * S)
    cx = px(0.5)

    def neck(y, wr, hr, fill):
        d.ellipse([cx - wr, y - hr, cx + wr, y + hr], fill=fill)

    if kind in ('tee', 'hoodie', 'coat', 'lounge', 'bodysuit', 'set'):
        ny = py(0.212 if kind != 'set' else 0.150)
        nw, nh = CW * 0.062, CH * 0.020
        neck(ny, nw, nh, (*shade(base, -0.16), 255))
        d.arc([cx - nw, ny - nh, cx + nw, ny + nh], 200, 340, fill=ink, width=lw)
    if kind == 'dress':
        ny = py(0.204)
        nw, nh = CW * 0.060, CH * 0.019
        neck(ny, nw, nh, (*shade(base, -0.16), 255))
        d.arc([cx - nw, ny - nh, cx + nw, ny + nh], 200, 340, fill=ink, width=lw)
        # 腰线 + 蝴蝶结
        y = py(0.462)
        d.line([(cx - CW * 0.205, y), (cx + CW * 0.205, y)], fill=(*shade(base, -0.30), 140), width=lw)
        bc = hex2rgb(CORAL) if rgb2hsl(base)[2] > .62 else shade(base, -0.28)
        d.ellipse([cx - CW * .050, y - CH * .010, cx - CW * .006, y + CH * .010], fill=(*bc, 240))
        d.ellipse([cx + CW * .006, y - CH * .010, cx + CW * .050, y + CH * .010], fill=(*bc, 240))
        d.ellipse([cx - CW * .011, y - CH * .008, cx + CW * .011, y + CH * .008], fill=(*bc, 250))
    if kind == 'hoodie':
        # 帽兜
        d.arc([cx - CW * .105, py(0.150), cx + CW * .105, py(0.250)], 185, 355, fill=(*shade(base, -0.28), 190), width=lw + 2)
        # 口袋
        y0, y1 = py(0.640), py(0.760)
        pw = CW * .120
        d.line([(cx - pw, y0), (cx + pw, y0)], fill=ink, width=lw)
        d.line([(cx - pw, y0), (cx - pw, y1)], fill=ink, width=lw)
        d.line([(cx + pw, y0), (cx + pw, y1)], fill=ink, width=lw)
        # 帽绳
        for sgn in (-1, 1):
            d.line([(cx + sgn * CW * .022, py(0.246)), (cx + sgn * CW * .026, py(0.330))],
                   fill=(*shade(base, 0.92), 235), width=lw)
    if kind == 'coat':
        d.line([(cx, py(0.262)), (cx, py(0.786))], fill=(*shade(base, -0.34), 190), width=int(3.2 * S))
        for sgn in (-1, 1):
            d.line([(cx + sgn * CW * .040, py(0.640)), (cx + sgn * CW * .130, py(0.640))], fill=ink, width=lw)
        # 翻领
        for sgn in (-1, 1):
            d.line([(cx, py(0.262)), (cx + sgn * CW * .080, py(0.268))], fill=ink, width=lw)
            d.line([(cx + sgn * CW * .080, py(0.268)), (cx + sgn * CW * .046, py(0.330))], fill=ink, width=lw)
    if kind == 'pants':
        d.line([(cx, py(0.278)), (cx, py(0.360))], fill=ink, width=lw)
        for sgn in (-1, 1):
            d.arc([cx + sgn * CW * .118 - CW * .040, py(0.222), cx + sgn * CW * .118 + CW * .040, py(0.300)],
                  0, 180, fill=ink, width=lw)
        d.line([(cx - CW * .20, py(0.226)), (cx + CW * .20, py(0.226))], fill=ink, width=S + 1)
    if kind == 'set':
        d.line([(cx - CW * .20, py(0.500)), (cx + CW * .20, py(0.500))], fill=(*shade(base, -0.30), 130), width=lw)
    if kind == 'bodysuit':
        for i in range(3):
            dx = (i - 1) * CW * .042
            cyy = py(0.752)
            d.ellipse([cx + dx - 4.4 * S, cyy - 4.4 * S, cx + dx + 4.4 * S, cyy + 4.4 * S],
                      fill=(*shade(base, -0.42), 205))
    if kind == 'lounge':
        d.line([(cx - CW * .20, py(0.700)), (cx + CW * .20, py(0.700))], fill=(*shade(base, -0.30), 120), width=lw)

    det = Image.composite(det, Image.new('RGBA', (CW, CH), (0, 0, 0, 0)), mask)
    return Image.alpha_composite(canvas, det)

# ---------------- 背景 ----------------
def make_bg(base):
    top = hex2rgb('#FDFBF6')
    bot = tune(mix(base, (255, 255, 255), .74), 0, .01)
    bg = Image.new('RGB', (CW, CH), top)
    d = ImageDraw.Draw(bg)
    for y in range(0, CH, 6):
        d.rectangle([0, y, CW, y + 6], fill=mix(top, bot, (y / CH) * .90))
    glow = Image.new('L', (CW, CH), 0)
    ImageDraw.Draw(glow).ellipse([CW * .02, -CH * .14, CW * .98, CH * .70], fill=105)
    glow = glow.filter(ImageFilter.GaussianBlur(CW * .11))
    bg = Image.composite(Image.new('RGB', (CW, CH), (255, 254, 250)), bg, glow)
    return bg

# ---------------- 单张 ----------------
def render(item, path):
    base = hex2rgb(item['hex'])
    kind = item.get('sil', 'tee')
    rnd = random.Random(abs(hash(item['sku'])) % (2 ** 31))

    canvas = make_bg(base).convert('RGBA')

    g, mask = garment_image(kind, base, item.get('pat', 'solid'), rnd)

    # 地面投影
    sh = mask.filter(ImageFilter.GaussianBlur(CW * .020)).point(lambda v: int(v * .26))
    shadow = Image.new('RGBA', (CW, CH), (74, 56, 42, 0))
    shadow.putalpha(sh)
    shadow = shadow.transform((CW, CH), Image.AFFINE, (1, 0, 0, 0, 1, -CH * .012), resample=Image.BICUBIC)
    canvas = Image.alpha_composite(canvas, shadow)
    canvas = Image.alpha_composite(canvas, g)
    canvas = add_details(canvas, mask, kind, base)

    # 吊牌（右上，挂在一根细线上）
    tx, ty = CW * .700, CH * .255
    tw_, th_ = CW * .150, CW * .092
    strim = ImageDraw.Draw(canvas)
    strim.line([(tx + tw_ * .06, ty + th_ * .10), (CW * .640, CH * .335)], fill=(176, 162, 148, 220), width=int(2.2 * S))
    tag = Image.new('RGBA', (int(tw_), int(th_)), (0, 0, 0, 0))
    td = ImageDraw.Draw(tag)
    td.rounded_rectangle([0, 0, tw_ - 2, th_ - 2], radius=CW * .008,
                         fill=(252, 249, 243, 250), outline=(196, 184, 170, 255), width=3)
    td.ellipse([tw_ * .10, th_ * .14, tw_ * .10 + CW * .010, th_ * .14 + CW * .010],
               outline=(168, 154, 140, 255), width=3)
    td.text((tw_ * .26, th_ * .16), 'XIAOMAN', font=font(CW * .0158, True), fill=(112, 96, 82, 255))
    td.text((tw_ * .26, th_ * .52), 'KIDS · 小满', font=font(CW * .0138, False), fill=(148, 132, 116, 255))
    rtag = tag.rotate(-7, resample=Image.BICUBIC, expand=True)
    canvas.alpha_composite(rtag, (int(tx), int(ty)))

    # 底部品类说明
    fd = ImageDraw.Draw(canvas)
    sub = item['name'].split('｜')[-1] if '｜' in item['name'] else item['cat']
    fd.text((CW * .5, CH * .948), f"{item['cat']} · {sub}", font=font(CW * .0140, False),
            fill=(138, 124, 110), anchor='mm')
    fd.line([(CW * .5 - CW * .028, CH * .968), (CW * .5 + CW * .028, CH * .968)], fill=(210, 198, 184), width=2)

    out = canvas.convert('RGB').resize((W, H), Image.LANCZOS)
    out.save(path, 'JPEG', quality=90, optimize=True, progressive=True)

# ---------------- 品牌图 ----------------
def make_logo():
    size = 512
    im = Image.new('RGB', (size, size), hex2rgb('#FBEFE6'))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, size, size], radius=size * .24, fill=hex2rgb('#FBEFE6'))
    coral, cream = hex2rgb(CORAL), hex2rgb('#FBEFE6')
    cx, cy = size * .5, size * .39
    d.polygon([(cx - 44, cy - 54), (cx + 44, cy - 54), (cx + 30, cy + 2), (cx - 30, cy + 2)], fill=coral)
    d.polygon([(cx - 30, cy + 2), (cx + 30, cy + 2), (cx + 72, cy + 72), (cx - 72, cy + 72)], fill=coral)
    d.ellipse([cx - 21, cy - 76, cx + 21, cy - 40], fill=cream)
    d.rectangle([cx - 31, cy - 3, cx + 31, cy + 7], fill=hex2rgb('#F6C77A'))
    d.text((size * .5, size * .705), '小满', font=font(size * .128, True), fill=INK, anchor='mm')
    d.text((size * .5, size * .802), 'XIAOMAN KIDS', font=font(size * .058, True), fill=(124, 110, 96), anchor='mm')
    im.save(os.path.join(ROOT, 'assets', 'img', 'logo.jpg'), 'JPEG', quality=93)

    w, h = 540, 128
    wm = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wm)
    wd.rounded_rectangle([2, 2, h - 4, h - 4], radius=26, fill=coral)
    cxx, cyy = h / 2, h / 2
    wd.polygon([(cxx - 24, cyy - 28), (cxx + 24, cyy - 28), (cxx + 15, cyy + 5), (cxx - 15, cyy + 5)],
               fill=(255, 255, 255, 248))
    wd.polygon([(cxx - 15, cyy + 5), (cxx + 15, cyy + 5), (cxx + 38, cyy + 37), (cxx - 38, cyy + 37)],
               fill=(255, 255, 255, 248))
    wd.text((h + 16, h * .5), '小满 XIAOMAN', font=font(44, True), fill=INK, anchor='lm')
    wm.save(os.path.join(ROOT, 'assets', 'img', 'site', 'logo-site.png'), 'PNG')

def main():
    with open(SPEC, encoding='utf-8') as f:
        items = json.load(f)
    os.makedirs(OUT, exist_ok=True)
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    todo = items[:n] if n else items
    for i, it in enumerate(todo, 1):
        render(it, os.path.join(OUT, it['sku'].lower() + '.jpg'))
        if i % 25 == 0 or i == len(todo):
            print(f'  {i}/{len(todo)}', flush=True)
    make_logo()
    print(f'OK {len(todo)} images + logo')

if __name__ == '__main__':
    main()

