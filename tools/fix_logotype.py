"""Re-set the English line of the CI logotype PNGs: ASSOCIATION -> COUNCIL (정관 제1조).
Font = CI spec 'Noto Sans Korean Bold' (Noto Sans CJK KR Bold). Cap height, left edge,
colour and tracking are measured from the original line; mode 'keep' keeps tracking,
mode 'justify' stretches tracking so the line keeps its original width."""
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
OLD, NEW = 'INCHEON TOURISM ASSOCIATION', 'INCHEON TOURISM COUNCIL'

def bands(v):
    out, s = [], None
    for i, on in enumerate(v):
        if on and s is None: s = i
        if not on and s is not None: out.append((s, i)); s = None
    if s is not None: out.append((s, len(v)))
    return out

def font_for_cap(cap):
    lo, hi = 4, 400
    while hi - lo > 1:
        m = (lo + hi) // 2
        f = ImageFont.truetype(FONT, m, index=1); b = f.getbbox('O')
        (lo, hi) = (m, hi) if b[3] - b[1] <= cap else (lo, m)
    return lo

def width(f, s, t):  # advance width with tracking t between glyphs (ink extent)
    b0 = f.getbbox(s[0]); bl = f.getbbox(s[-1])
    return f.getlength(s[:-1]) + (len(s) - 1) * t + bl[2] - b0[0]

def process(src, dst, xmin, mode, dark_bg=False, SS=4):
    im = Image.open(src).convert('RGBA'); a = np.array(im).astype(int)
    if dark_bg: mask = a[..., :3].mean(-1) > 140
    else: mask = a[..., 3] > 40
    sub = mask[:, xmin:]
    rows = bands(sub.sum(1) > 0)
    y0, y1 = rows[-1]                                   # last text band = English line
    cols = np.where(sub[y0:y1].sum(0) > 0)[0]
    x0, x1 = xmin + cols[0], xmin + cols[-1] + 1
    ink = a[y0:y1, x0:x1][mask[y0:y1, x0:x1]]
    col = tuple(int(c) for c in np.median(ink[:, :3], 0))
    cap = y1 - y0
    # fit at supersampled size
    fs = font_for_cap(cap * SS); f = ImageFont.truetype(FONT, fs, index=1)
    t_old = ((x1 - x0) * SS - width(f, OLD, 0)) / (len(OLD) - 1)
    t = t_old if mode == 'keep' else ((x1 - x0) * SS - width(f, NEW, 0)) / (len(NEW) - 1)
    # erase old line (pad 2px)
    pad = 3
    if dark_bg:
        bgc = np.median(a[max(0, y0 - 8):y0 - 2, x0:x1].reshape(-1, 4), 0).astype(int)
        a[y0 - pad:y1 + pad, x0 - pad:x1 + pad] = bgc
    else:
        a[y0 - pad:y1 + pad, x0 - pad:x1 + pad] = 0
    base = Image.fromarray(a.astype('uint8'), 'RGBA')
    # draw new line on a supersampled layer
    W = int(width(f, NEW, t)) + 40; H = cap * SS + 60
    layer = Image.new('L', (W, H), 0); d = ImageDraw.Draw(layer)
    hb = f.getbbox('O'); ox = -f.getbbox(NEW[0])[0] + 10; oy = -hb[1] + 20
    x = ox
    for i, ch in enumerate(NEW):
        d.text((x, oy), ch, font=f, fill=255)
        x += f.getlength(NEW[:i + 1]) - f.getlength(NEW[:i]) + t
    small = layer.resize((W // SS, H // SS), Image.LANCZOS)
    glyph = Image.new('RGBA', small.size, col + (255,)); glyph.putalpha(small)
    base.alpha_composite(glyph, (x0 - 10 // SS, y0 - 20 // SS))
    base.save(dst, optimize=True)
    print(f'{src}: band y{y0}-{y1} x{x0}-{x1} cap={cap}px colour={col} tracking old={t_old/SS:.2f}px new={t/SS:.2f}px mode={mode}')

if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'keep'
    outdir = sys.argv[2] if len(sys.argv) > 2 else None
    import os
    J = [('logo-horizontal-v3.png', 270, False), ('logo-horizontal.png', 270, False), ('logo-white-v3.png', 270, False),
         ('logo-reverse.png', 340, True), ('logo-vertical.png', 0, False)]
    for fn, xm, dk in J:
        src = os.path.join('assets/img', fn); dst = os.path.join(outdir or 'assets/img', fn)
        process(src, dst, xm, mode, dk)
