"""Generate portal sprites (64x64 PNGs) consistent with MuseumSprites style.

Outputs to:
  - frontend/VikingHacksAssets/MuseumSprites/Props
  - frontend/public/assets/museum/props

Sprites generated:
  - portal_rune_circle_{blue,green}_frame_01..16.png (animated loop)
  - portal_pad_floor_{blue,green}.png (stand-on portal tile)
  - portal_arch_stone_{blue,green}.png (doorway frame)
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import math
import random

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT_VH = ROOT / "frontend" / "VikingHacksAssets" / "MuseumSprites" / "Props"
OUT_PUBLIC = ROOT / "frontend" / "public" / "assets" / "museum" / "props"

TILE = 64
SCALE = 2  # render at 128x128 then downsample for smoother curves


@dataclass(frozen=True)
class Palette:
    bg: tuple[int, int, int]
    stone_dark: tuple[int, int, int]
    stone_mid: tuple[int, int, int]
    stone_light: tuple[int, int, int]
    gold: tuple[int, int, int]
    blue: tuple[int, int, int]
    green: tuple[int, int, int]


PAL = Palette(
    bg=(12, 16, 24),
    stone_dark=(70, 74, 82),
    stone_mid=(118, 124, 132),
    stone_light=(180, 184, 190),
    gold=(204, 170, 90),
    blue=(90, 140, 210),
    green=(78, 204, 163),
)


def _img(w: int, h: int, fill=(0, 0, 0, 0)) -> Image.Image:
    return Image.new("RGBA", (w, h), fill)


def _clamp_u8(x: int) -> int:
    return 0 if x < 0 else 255 if x > 255 else x


def _noise(img: Image.Image, strength: int, seed: int) -> None:
    rng = random.Random(seed)
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            n = rng.randint(-strength, strength)
            px[x, y] = (
                _clamp_u8(r + n),
                _clamp_u8(g + n),
                _clamp_u8(b + n),
                a,
            )


def _radial_glow(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, rgb: tuple[int, int, int], alpha: int) -> None:
    # simple layered circles glow
    for i in range(r, 0, -1):
        a = int(alpha * (i / r) ** 2)
        if a <= 0:
            continue
        draw.ellipse((cx - i, cy - i, cx + i, cy + i), fill=(rgb[0], rgb[1], rgb[2], a))


def _downsample(img: Image.Image) -> Image.Image:
    return img.resize((TILE, TILE), resample=Image.Resampling.LANCZOS)


def portal_rune_circle_frame(color: tuple[int, int, int], frame: int, frames: int, seed: int) -> Image.Image:
    w = TILE * SCALE
    img = _img(w, w)
    draw = ImageDraw.Draw(img)

    cx = cy = w // 2
    t = (frame % frames) / frames

    # base glow
    _radial_glow(draw, cx, cy, int(28 * SCALE), color, 80)
    _radial_glow(draw, cx, cy, int(18 * SCALE), (250, 220, 120), 24)

    outer_r = int(24 * SCALE)
    inner_r = int(14 * SCALE)

    # ring
    draw.ellipse((cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r), outline=(*color, 230), width=3)
    draw.ellipse((cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r), outline=(*color, 200), width=2)

    # rotating arc segments for motion
    arc_r = int(20 * SCALE)
    for k in range(4):
        start = int((t * 360) + k * 90)
        end = start + 42
        bbox = (cx - arc_r, cy - arc_r, cx + arc_r, cy + arc_r)
        draw.arc(bbox, start=start, end=end, fill=(*color, 220), width=3)

    # runes (small rectangles) around ring
    rng = random.Random(seed)
    rune_count = 12
    for i in range(rune_count):
        ang = (i / rune_count) * math.tau + t * 0.4
        rr = int(22 * SCALE)
        x = cx + int(math.cos(ang) * rr)
        y = cy + int(math.sin(ang) * rr)
        rw = rng.randint(2, 4) * SCALE
        rh = rng.randint(6, 9) * SCALE
        # rotate-ish by drawing a short line segment
        x2 = x + int(math.cos(ang) * rh)
        y2 = y + int(math.sin(ang) * rh)
        draw.line((x, y, x2, y2), fill=(*color, 220), width=rw)

    # inner swirl (spiral polyline)
    pts = []
    spiral_turns = 2.6
    steps = 70
    for s in range(steps):
        u = s / (steps - 1)
        ang = (u * spiral_turns * math.tau) + (t * math.tau)
        rad = (u ** 1.2) * (12 * SCALE)
        px = cx + math.cos(ang) * rad
        py = cy + math.sin(ang) * rad
        pts.append((px, py))
    draw.line(pts, fill=(*color, 180), width=2)

    # center core
    _radial_glow(draw, cx, cy, int(6 * SCALE), (255, 255, 255), 90)

    _noise(img, 3, seed + frame * 17)
    return _downsample(img)


def portal_pad_floor(color: tuple[int, int, int], seed: int) -> Image.Image:
    # a standable tile with an embedded portal circle
    w = TILE * SCALE
    img = _img(w, w, (160, 166, 170, 255))
    draw = ImageDraw.Draw(img)

    # tile grid hint
    for i in range(0, w + 1, 16 * SCALE):
        draw.line((i, 0, i, w), fill=(90, 94, 100, 90), width=1)
        draw.line((0, i, w, i), fill=(90, 94, 100, 90), width=1)

    cx = cy = w // 2
    _radial_glow(draw, cx, cy, int(26 * SCALE), color, 55)
    draw.ellipse((cx - int(24 * SCALE), cy - int(24 * SCALE), cx + int(24 * SCALE), cy + int(24 * SCALE)), outline=(*color, 210), width=3)
    draw.ellipse((cx - int(16 * SCALE), cy - int(16 * SCALE), cx + int(16 * SCALE), cy + int(16 * SCALE)), outline=(*color, 170), width=2)

    # rune ticks
    for i in range(16):
        ang = (i / 16) * math.tau
        r1 = int(18 * SCALE)
        r2 = int(22 * SCALE)
        x1 = cx + int(math.cos(ang) * r1)
        y1 = cy + int(math.sin(ang) * r1)
        x2 = cx + int(math.cos(ang) * r2)
        y2 = cy + int(math.sin(ang) * r2)
        draw.line((x1, y1, x2, y2), fill=(*color, 200), width=2)

    _noise(img, 5, seed)
    return _downsample(img)


def portal_arch_stone(color: tuple[int, int, int], seed: int) -> Image.Image:
    w = TILE * SCALE
    img = _img(w, w)
    draw = ImageDraw.Draw(img)

    # stone arch frame (transparent center)
    arch_outer = (int(10 * SCALE), int(8 * SCALE), int(54 * SCALE), int(60 * SCALE))
    arch_inner = (int(18 * SCALE), int(18 * SCALE), int(46 * SCALE), int(58 * SCALE))

    draw.rounded_rectangle(arch_outer, radius=12 * SCALE, fill=(*PAL.stone_mid, 255), outline=(*PAL.stone_dark, 255), width=3)
    draw.rounded_rectangle(arch_inner, radius=10 * SCALE, fill=(0, 0, 0, 0), outline=(*PAL.stone_dark, 255), width=2)

    # inset glow
    cx = cy = w // 2
    _radial_glow(draw, cx, cy, int(22 * SCALE), color, 60)

    # gold inlays
    for i in range(6):
        x = int((16 + i * 6) * SCALE)
        draw.rectangle((x, int(12 * SCALE), x + int(3 * SCALE), int(16 * SCALE)), fill=(*PAL.gold, 255))

    # small side runes
    for y in (int(30 * SCALE), int(38 * SCALE), int(46 * SCALE)):
        draw.rectangle((int(12 * SCALE), y, int(16 * SCALE), y + int(2 * SCALE)), fill=(*PAL.gold, 255))
        draw.rectangle((int(48 * SCALE), y, int(52 * SCALE), y + int(2 * SCALE)), fill=(*PAL.gold, 255))

    _noise(img, 4, seed)
    return _downsample(img)


def _write(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="PNG", optimize=True)


def main() -> int:
    frames = 16

    variants = {
        "blue": PAL.blue,
        "green": PAL.green,
    }

    for name, col in variants.items():
        for i in range(frames):
            img = portal_rune_circle_frame(col, frame=i, frames=frames, seed=1234)
            fname = f"portal_rune_circle_{name}_frame_{i+1:02d}.png"
            _write(img, OUT_VH / fname)
            _write(img, OUT_PUBLIC / fname)

        pad = portal_pad_floor(col, seed=2000)
        _write(pad, OUT_VH / f"portal_pad_floor_{name}.png")
        _write(pad, OUT_PUBLIC / f"portal_pad_floor_{name}.png")

        arch = portal_arch_stone(col, seed=3000)
        _write(arch, OUT_VH / f"portal_arch_stone_{name}.png")
        _write(arch, OUT_PUBLIC / f"portal_arch_stone_{name}.png")

    print("Wrote portal sprites (2 colors, 16 frames each + pads + arches)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
