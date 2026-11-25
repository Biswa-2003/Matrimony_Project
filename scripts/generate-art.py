"""
Generates the site's original decorative artwork (SVG) and the default avatar (JPG).

    python scripts/generate-art.py

Everything here is drawn from code, so there are no licensing concerns.
Outputs go to public/images/ and public/uploads/default.jpg.
"""
import math
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "images")
os.makedirs(OUT, exist_ok=True)

GOLD = "#c9a24a"
GOLD_L = "#e8cf8e"
GOLD_D = "#9c7a2c"
MAROON = "#5a0f22"
RUBY = "#a3123a"
IVORY = "#fbf7f0"


def write(name, svg):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(svg.strip() + "\n")
    print("wrote", name)


def petal_path(cx, cy, r_in, r_out, width_deg, angle_deg):
    """A pointed petal from r_in to r_out, centred on angle."""
    a = math.radians(angle_deg)
    w = math.radians(width_deg / 2)
    x1, y1 = cx + r_in * math.cos(a - w), cy + r_in * math.sin(a - w)
    x2, y2 = cx + r_in * math.cos(a + w), cy + r_in * math.sin(a + w)
    tx, ty = cx + r_out * math.cos(a), cy + r_out * math.sin(a)
    rc = (r_in + r_out) * 0.62
    c1x, c1y = cx + rc * math.cos(a - w * 1.25), cy + rc * math.sin(a - w * 1.25)
    c2x, c2y = cx + rc * math.cos(a + w * 1.25), cy + rc * math.sin(a + w * 1.25)
    return (f"M{x1:.2f},{y1:.2f} Q{c1x:.2f},{c1y:.2f} {tx:.2f},{ty:.2f} "
            f"Q{c2x:.2f},{c2y:.2f} {x2:.2f},{y2:.2f}")


def mandala(color=GOLD, stroke=1.2, size=400):
    c = size / 2
    parts = []
    rings = [  # (count, r_in, r_out, width_deg, offset)
        (8, 18, 52, 40, 0),
        (12, 50, 96, 26, 15),
        (16, 92, 132, 20, 0),
        (24, 128, 162, 13, 7.5),
        (32, 160, 190, 10, 0),
    ]
    for count, ri, ro, wd, off in rings:
        for i in range(count):
            ang = off + i * 360 / count
            parts.append(f'<path d="{petal_path(c, c, ri, ro, wd, ang)}"/>')
            # inner vein
            a = math.radians(ang)
            parts.append(
                f'<line x1="{c + (ri + 4) * math.cos(a):.2f}" y1="{c + (ri + 4) * math.sin(a):.2f}" '
                f'x2="{c + (ro - 8) * math.cos(a):.2f}" y2="{c + (ro - 8) * math.sin(a):.2f}" stroke-width="{stroke * 0.5}"/>'
            )
    circles = "".join(f'<circle cx="{c}" cy="{c}" r="{r}"/>' for r in (14, 50, 92, 128, 160, 194))
    dots = []
    for i in range(48):
        a = math.radians(i * 7.5)
        dots.append(f'<circle cx="{c + 176 * math.cos(a):.2f}" cy="{c + 176 * math.sin(a):.2f}" r="1.6" fill="{color}" stroke="none"/>')
    for i in range(24):
        a = math.radians(i * 15 + 7.5)
        dots.append(f'<circle cx="{c + 110 * math.cos(a):.2f}" cy="{c + 110 * math.sin(a):.2f}" r="2" fill="{color}" stroke="none"/>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" fill="none" stroke="{color}" stroke-width="{stroke}" stroke-linecap="round">
<g>{circles}{"".join(parts)}{"".join(dots)}
<circle cx="{c}" cy="{c}" r="6" fill="{color}" stroke="none"/></g></svg>'''


def divider():
    # Ornamental divider: lines with a central lotus/diamond motif
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 24" fill="none">
<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="{GOLD}" stop-opacity="0"/><stop offset=".5" stop-color="{GOLD}"/><stop offset="1" stop-color="{GOLD}" stop-opacity="0"/></linearGradient></defs>
<line x1="0" y1="12" x2="96" y2="12" stroke="url(#g)" stroke-width="1.2"/>
<line x1="144" y1="12" x2="240" y2="12" stroke="url(#g)" stroke-width="1.2"/>
<g stroke="{GOLD}" stroke-width="1.2" stroke-linejoin="round">
<path d="M120 2 L128 12 L120 22 L112 12 Z" fill="{GOLD}" fill-opacity=".25"/>
<path d="M104 12 Q110 4 116 12 Q110 20 104 12 Z"/>
<path d="M136 12 Q130 4 124 12 Q130 20 136 12 Z"/>
<circle cx="98" cy="12" r="1.8" fill="{GOLD}"/><circle cx="142" cy="12" r="1.8" fill="{GOLD}"/>
</g></svg>'''


def toran():
    # Repeating marigold garland strip with mango leaves (tileable horizontally, 160px)
    w, h = 160, 70
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMin slice">']
    out.append(f'<path d="M0 8 Q40 30 80 8 Q120 30 160 8" fill="none" stroke="{GOLD_D}" stroke-width="2"/>')
    # marigold beads along the swag
    for i in range(17):
        t = i / 16
        x = t * w
        local = (t * 2) % 1
        y = 8 + 22 * 4 * local * (1 - local)
        col = "#f59e0b" if i % 2 else "#ea580c"
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5.2" fill="{col}"/>')
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2.2" fill="#fde68a" opacity=".8"/>')
    # hanging strands with leaf
    for x in (40, 120):
        out.append(f'<line x1="{x}" y1="30" x2="{x}" y2="52" stroke="{GOLD_D}" stroke-width="1.2"/>')
        for j, yy in enumerate((34, 41, 48)):
            col = "#ea580c" if j % 2 else "#f59e0b"
            out.append(f'<circle cx="{x}" cy="{yy}" r="3.6" fill="{col}"/>')
        out.append(f'<path d="M{x} 52 Q{x - 7} 60 {x} 68 Q{x + 7} 60 {x} 52 Z" fill="#3f7d3a"/>')
        out.append(f'<line x1="{x}" y1="53" x2="{x}" y2="66" stroke="#9bd18f" stroke-width=".8"/>')
    # small leaves at the swag tops
    for x in (0, 80, 160):
        out.append(f'<path d="M{x} 8 Q{x - 9} 16 {x - 4} 24 Q{x + 2} 16 {x} 8 Z" fill="#3f7d3a"/>')
        out.append(f'<path d="M{x} 8 Q{x + 9} 16 {x + 4} 24 Q{x - 2} 16 {x} 8 Z" fill="#4d8f46"/>')
    out.append("</svg>")
    return "".join(out)


def paisley_pattern(color=GOLD, opacity=0.18):
    # Subtle tiling paisley + dot pattern (80x80 tile)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
<g fill="none" stroke="{color}" stroke-opacity="{opacity}" stroke-width="1">
<path d="M22 30 C10 30 8 14 20 10 C32 6 40 18 34 30 C30 38 26 46 30 52 C20 48 18 38 22 30 Z"/>
<path d="M22 28 C16 26 16 18 22 16 C28 15 30 22 26 26"/>
<path d="M62 70 C50 70 48 54 60 50 C72 46 80 58 74 70 C70 78 66 86 70 92" transform="translate(-4 -10)"/>
<circle cx="58" cy="18" r="2"/><circle cx="12" cy="66" r="2"/><circle cx="40" cy="44" r="1.2"/>
</g></svg>'''


def logo_mark():
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs>
<linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a1530"/><stop offset="1" stop-color="#3b0a16"/></linearGradient>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dc9b"/><stop offset=".5" stop-color="{GOLD}"/><stop offset="1" stop-color="{GOLD_D}"/></linearGradient>
</defs>
<rect x="2" y="2" width="60" height="60" rx="16" fill="url(#m)"/>
<rect x="5.5" y="5.5" width="53" height="53" rx="13" fill="none" stroke="url(#g)" stroke-width="1.2"/>
<circle cx="26" cy="34" r="11" fill="none" stroke="url(#g)" stroke-width="3"/>
<circle cx="38" cy="34" r="11" fill="none" stroke="url(#g)" stroke-width="3"/>
<path d="M38 17 L41 21 L38 25 L35 21 Z" fill="#fff" stroke="url(#g)" stroke-width="1"/>
</svg>'''


def avatar(gender):
    # Elegant silhouette avatar on an ivory/blush gradient with a gold ring
    bg1, bg2 = ("#fbe9ee", "#f3d3dc") if gender == "female" else ("#f4ecdf", "#e7d9c2")
    body = MAROON if gender == "female" else "#4a1424"
    hair = ""
    if gender == "female":
        hair = (f'<path d="M100 54 C70 54 62 80 64 104 C66 128 60 142 54 150 C74 150 82 140 84 128 L116 128 '
                f'C118 140 126 150 146 150 C140 142 134 128 136 104 C138 80 130 54 100 54 Z" fill="#2b0a12"/>'
                f'<circle cx="100" cy="72" r="4" fill="{RUBY}"/>')
    else:
        hair = '<path d="M74 86 C72 62 86 52 100 52 C116 52 130 62 126 86 C122 74 112 70 100 70 C88 70 78 74 74 86 Z" fill="#2b0a12"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{bg1}"/><stop offset="1" stop-color="{bg2}"/></linearGradient>
<clipPath id="c"><circle cx="100" cy="100" r="96"/></clipPath></defs>
<circle cx="100" cy="100" r="98" fill="url(#bg)"/>
<g clip-path="url(#c)">
{hair}
<circle cx="100" cy="90" r="30" fill="{body}" opacity=".9"/>
<path d="M40 200 C40 150 66 128 100 128 C134 128 160 150 160 200 Z" fill="{body}"/>
<path d="M78 136 Q100 152 122 136" fill="none" stroke="{GOLD}" stroke-width="3"/>
</g>
<circle cx="100" cy="100" r="96" fill="none" stroke="{GOLD}" stroke-width="3"/>
</svg>'''


def couple_mandap():
    """Hand-composed illustration: a couple beneath a decorated wedding mandap."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
<defs>
<radialGradient id="sky" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="#fff4dc"/><stop offset=".45" stop-color="#f6d9b8"/><stop offset="1" stop-color="#e9b7a5"/></radialGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dc9b"/><stop offset=".5" stop-color="{GOLD}"/><stop offset="1" stop-color="{GOLD_D}"/></linearGradient>
<linearGradient id="red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c0183f"/><stop offset="1" stop-color="#7a0f2a"/></linearGradient>
<linearGradient id="cream" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7e6"/><stop offset="1" stop-color="#eedcb8"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a1530"/><stop offset="1" stop-color="#3b0a16"/></linearGradient>
<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".9"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
<clipPath id="frame"><path d="M60 600 L60 250 C60 120 170 40 300 40 C430 40 540 120 540 250 L540 600 Z"/></clipPath>
</defs>
<g clip-path="url(#frame)">
<rect width="600" height="600" fill="url(#sky)"/>
<circle cx="300" cy="250" r="150" fill="url(#glow)"/>
<!-- distant mandala -->
<g opacity=".45" transform="translate(150 100) scale(.75)" fill="none" stroke="{GOLD_D}" stroke-width="1.4" stroke-linecap="round">{mandala(GOLD_D, 1.4).split(">",1)[1].rsplit("</svg>",1)[0]}</g>
<!-- floor -->
<path d="M0 470 Q300 440 600 470 L600 600 L0 600 Z" fill="url(#floor)"/>
<ellipse cx="300" cy="478" rx="200" ry="18" fill="#2a0612" opacity=".35"/>
<!-- havan kund -->
<path d="M270 478 L330 478 L322 456 L278 456 Z" fill="url(#gold)"/>
<path d="M292 456 Q300 420 308 456 Z" fill="#f59e0b"/><path d="M296 456 Q300 434 304 456 Z" fill="#fde68a"/>
<!-- diyas -->
<g fill="url(#gold)"><path d="M120 486 q12 10 24 0 z"/><path d="M456 486 q12 10 24 0 z"/></g>
<g fill="#fbbf24"><path d="M132 484 q-3 -10 0 -16 q3 6 0 16z"/><path d="M468 484 q-3 -10 0 -16 q3 6 0 16z"/></g>

<!-- GROOM (left) -->
<g transform="translate(205 0)">
  <path d="M-42 470 L-36 330 C-34 300 -20 288 0 286 C20 288 34 300 36 330 L42 470 Z" fill="url(#cream)"/>
  <path d="M-6 290 L-4 470 M6 290 L4 470" stroke="{GOLD}" stroke-width="1.5" opacity=".6"/>
  <g fill="{GOLD}" opacity=".9"><circle cx="0" cy="310" r="2.4"/><circle cx="0" cy="330" r="2.4"/><circle cx="0" cy="350" r="2.4"/><circle cx="0" cy="370" r="2.4"/></g>
  <path d="M-36 330 C-50 360 -48 400 -30 410 L-22 404 C-34 390 -32 360 -24 336 Z" fill="#eedcb8"/>
  <path d="M-30 300 Q0 330 30 300" fill="none" stroke="#c0183f" stroke-width="7" stroke-linecap="round"/>
  <!-- varmala -->
  <path d="M-26 300 Q0 380 26 300" fill="none" stroke="#f59e0b" stroke-width="7" stroke-dasharray="1 8" stroke-linecap="round"/>
  <rect x="-9" y="270" width="18" height="20" rx="6" fill="#d8a47f"/>
  <ellipse cx="0" cy="252" rx="22" ry="25" fill="#d8a47f"/>
  <!-- safa -->
  <path d="M-25 246 C-28 214 -6 204 4 206 C26 208 30 228 26 246 C14 236 -12 236 -25 246 Z" fill="url(#red)"/>
  <path d="M-24 236 C-6 226 12 226 26 236" stroke="url(#gold)" stroke-width="3" fill="none"/>
  <path d="M8 208 C18 190 24 196 22 212" fill="url(#gold)"/>
  <circle cx="2" cy="222" r="4" fill="#fff" stroke="url(#gold)" stroke-width="1.5"/>
  <path d="M24 244 C40 270 38 320 30 340" stroke="url(#red)" stroke-width="7" fill="none" stroke-linecap="round"/>
</g>

<!-- BRIDE (right) -->
<g transform="translate(395 0)">
  <path d="M-58 470 C-50 420 -40 380 -30 340 L30 340 C40 380 50 420 58 470 Z" fill="url(#red)"/>
  <g stroke="url(#gold)" stroke-width="2.4" fill="none">
    <path d="M-54 455 Q0 470 54 455"/><path d="M-48 430 Q0 444 48 430"/><path d="M-42 405 Q0 418 42 405"/>
  </g>
  <g fill="{GOLD}"><circle cx="-30" cy="450" r="2.4"/><circle cx="0" cy="456" r="2.4"/><circle cx="30" cy="450" r="2.4"/><circle cx="-16" cy="425" r="2"/><circle cx="16" cy="425" r="2"/></g>
  <path d="M-30 340 C-30 306 -18 290 0 288 C18 290 30 306 30 340 Z" fill="#a3123a"/>
  <path d="M-26 306 Q0 336 26 306" fill="none" stroke="url(#gold)" stroke-width="4"/>
  <path d="M-22 304 Q0 360 22 304" fill="none" stroke="#f59e0b" stroke-width="7" stroke-dasharray="1 8" stroke-linecap="round"/>
  <rect x="-8" y="272" width="16" height="18" rx="6" fill="#d9a882"/>
  <ellipse cx="0" cy="256" rx="20" ry="23" fill="#d9a882"/>
  <path d="M-21 252 C-24 228 -10 222 0 222 C12 222 24 228 21 252 C14 238 -12 238 -21 252 Z" fill="#2b0a12"/>
  <circle cx="0" cy="240" r="2.6" fill="#c0183f"/>
  <path d="M0 222 L0 232" stroke="url(#gold)" stroke-width="2"/>
  <circle cx="-19" cy="262" r="3.4" fill="none" stroke="url(#gold)" stroke-width="2"/>
  <!-- dupatta / veil -->
  <path d="M-34 250 C-36 206 -10 196 0 196 C14 196 38 206 36 250 C44 300 56 380 66 470 L44 470 C38 390 30 320 24 280 C20 260 -20 260 -24 280 C-30 320 -40 390 -46 470 L-66 470 C-56 380 -44 300 -34 250 Z" fill="#e11d48" fill-opacity=".55"/>
  <path d="M-34 250 C-36 206 -10 196 0 196 C14 196 38 206 36 250" fill="none" stroke="url(#gold)" stroke-width="3"/>
  <path d="M-46 470 C-40 390 -30 320 -24 280 M44 470 C38 390 30 320 24 280" stroke="url(#gold)" stroke-width="2" fill="none"/>
</g>

<!-- mandap pillars -->
<g fill="url(#gold)">
  <rect x="96" y="200" width="18" height="280" rx="4"/><rect x="486" y="200" width="18" height="280" rx="4"/>
  <rect x="88" y="470" width="34" height="12" rx="3"/><rect x="478" y="470" width="34" height="12" rx="3"/>
  <rect x="88" y="194" width="34" height="12" rx="3"/><rect x="478" y="194" width="34" height="12" rx="3"/>
</g>
<g fill="#fff" opacity=".35"><rect x="100" y="210" width="3" height="256"/><rect x="490" y="210" width="3" height="256"/></g>
<!-- canopy arch -->
<path d="M90 200 C120 110 200 80 300 80 C400 80 480 110 510 200" fill="none" stroke="url(#gold)" stroke-width="10" stroke-linecap="round"/>
<path d="M110 200 C140 130 210 104 300 104 C390 104 460 130 490 200" fill="none" stroke="url(#gold)" stroke-width="3" opacity=".8"/>
<path d="M300 56 L312 76 L300 96 L288 76 Z" fill="url(#gold)"/>
<!-- hanging garlands from the arch -->
<g stroke-linecap="round" stroke-dasharray="1 9" fill="none" stroke-width="9">
  <path d="M112 196 Q205 260 300 108" stroke="#f59e0b"/><path d="M488 196 Q395 260 300 108" stroke="#ea580c"/>
  <path d="M150 140 L150 250" stroke="#f59e0b"/><path d="M450 140 L450 250" stroke="#f59e0b"/>
  <path d="M200 110 L200 196" stroke="#ea580c"/><path d="M400 110 L400 196" stroke="#ea580c"/>
</g>
<g fill="#3f7d3a"><path d="M150 252 q-6 8 0 16 q6 -8 0 -16z"/><path d="M450 252 q-6 8 0 16 q6 -8 0 -16z"/><path d="M200 198 q-6 8 0 16 q6 -8 0 -16z"/><path d="M400 198 q-6 8 0 16 q6 -8 0 -16z"/></g>
<!-- petals -->
<g fill="#e11d48" opacity=".75">
  <ellipse cx="250" cy="160" rx="4" ry="2" transform="rotate(30 250 160)"/><ellipse cx="350" cy="190" rx="4" ry="2" transform="rotate(-20 350 190)"/>
  <ellipse cx="300" cy="230" rx="4" ry="2" transform="rotate(60 300 230)"/><ellipse cx="230" cy="250" rx="4" ry="2"/>
  <ellipse cx="372" cy="140" rx="4" ry="2" transform="rotate(10 372 140)"/>
</g>
<g fill="#f59e0b" opacity=".8"><circle cx="270" cy="200" r="2.5"/><circle cx="335" cy="150" r="2.5"/><circle cx="322" cy="262" r="2"/></g>
</g>
<!-- outer frame -->
<path d="M60 600 L60 250 C60 120 170 40 300 40 C430 40 540 120 540 250 L540 600" fill="none" stroke="url(#gold)" stroke-width="6"/>
<path d="M76 600 L76 252 C76 134 180 58 300 58 C420 58 524 134 524 252 L524 600" fill="none" stroke="url(#gold)" stroke-width="1.5" opacity=".8"/>
</svg>'''


def ritual_icon(kind):
    """Small gold line-art icons for the 'traditions' gallery cards."""
    s = f'stroke="url(#g)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"'
    defs = f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dc9b"/><stop offset=".5" stop-color="{GOLD}"/><stop offset="1" stop-color="{GOLD_D}"/></linearGradient></defs>'
    body = {
        "kalash": f'<path {s} d="M40 54 C28 60 26 88 40 98 L80 98 C94 88 92 60 80 54 Z"/><path {s} d="M44 54 L76 54 M48 46 L72 46 L76 54 M44 54 L48 46"/><path {s} d="M60 46 C50 30 54 20 60 14 C66 20 70 30 60 46 Z"/><path {s} d="M48 44 C38 34 34 30 30 32 M72 44 C82 34 86 30 90 32"/><path {s} d="M38 74 L82 74"/><circle cx="60" cy="84" r="5" {s}/>',
        "mehendi": f'<path {s} d="M44 104 L44 64 C44 58 52 58 52 64 L52 40 C52 34 60 34 60 40 L60 34 C60 28 68 28 68 34 L68 42 C68 36 76 36 76 42 L76 74 C80 66 90 68 86 78 L76 104 Z"/><circle cx="62" cy="76" r="8" {s}/><circle cx="62" cy="76" r="2.5" fill="{GOLD}"/><path {s} d="M50 94 Q62 88 74 94"/>',
        "rings": f'<circle cx="48" cy="70" r="22" {s}/><circle cx="72" cy="70" r="22" {s}/><path {s} d="M72 30 L80 40 L72 50 L64 40 Z"/><path {s} d="M66 40 L78 40"/>',
        "diya": f'<path {s} d="M26 76 C34 96 86 96 94 76 Z"/><path {s} d="M60 72 C48 58 54 40 60 30 C66 40 72 58 60 72 Z"/><path {s} d="M60 66 C56 58 58 50 60 46 C62 50 64 58 60 66"/><path {s} d="M40 98 L80 98"/>',
    }[kind]
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">{defs}{body}</svg>'


def default_avatar_jpg():
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        print("PIL not installed; skipping default.jpg", file=sys.stderr)
        return
    S = 4  # supersample
    W = 400 * S
    img = Image.new("RGB", (W, W), IVORY)
    d = ImageDraw.Draw(img)
    # vertical gradient ivory -> blush
    for y in range(W):
        t = y / W
        r = int(251 + (243 - 251) * t); g = int(247 + (222 - 247) * t); b = int(240 + (214 - 240) * t)
        d.line([(0, y), (W, y)], fill=(r, g, b))
    cx = W // 2
    maroon = (90, 15, 34)
    gold = (201, 162, 74)
    d.ellipse([cx - 70 * S, 92 * S, cx + 70 * S, 232 * S], fill=maroon)  # head
    d.ellipse([cx - 150 * S, 250 * S, cx + 150 * S, 560 * S], fill=maroon)  # shoulders
    d.arc([cx - 60 * S, 236 * S, cx + 60 * S, 300 * S], 20, 160, fill=gold, width=7 * S)
    d.ellipse([12 * S, 12 * S, W - 12 * S, W - 12 * S], outline=gold, width=6 * S)
    img = img.resize((400, 400), Image.LANCZOS)
    dest = os.path.join(ROOT, "public", "uploads", "default.jpg")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    img.save(dest, "JPEG", quality=90)
    print("wrote uploads/default.jpg")


if __name__ == "__main__":
    write("mandala-gold.svg", mandala(GOLD))
    write("mandala-light.svg", mandala("#ffffff", 1))
    write("divider.svg", divider())
    write("toran.svg", toran())
    write("paisley.svg", paisley_pattern())
    write("paisley-light.svg", paisley_pattern("#ffffff", 0.08))
    write("logo-mark.svg", logo_mark())
    write("avatar-female.svg", avatar("female"))
    write("avatar-male.svg", avatar("male"))
    write("couple-mandap.svg", couple_mandap())
    for k in ("kalash", "mehendi", "rings", "diya"):
        write(f"ritual-{k}.svg", ritual_icon(k))
    default_avatar_jpg()
