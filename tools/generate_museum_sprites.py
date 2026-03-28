"""Generate museum-themed sprites (mostly 64x64 PNGs).

Outputs to:
  - frontend/VikingHacksAssets/MuseumSprites/{Tiles,Walls,Props,UI}
  - frontend/public/assets/museum/{tiles,walls,props,ui}

Design goals:
  - Keep tiles 64x64 to match existing environment.
  - Use descriptive filenames.
  - Provide a broad variety of walls/floors + museum decorations (statues, paintings, plants, lights).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_VH = ROOT / "frontend" / "VikingHacksAssets" / "MuseumSprites"
OUT_PUBLIC = ROOT / "frontend" / "public" / "assets" / "museum"

TILE = 64


@dataclass(frozen=True)
class Palette:
    bg: tuple[int, int, int]
    wall_dark: tuple[int, int, int]
    wall_mid: tuple[int, int, int]
    wall_light: tuple[int, int, int]
    floor_light: tuple[int, int, int]
    floor_mid: tuple[int, int, int]
    floor_dark: tuple[int, int, int]
    gold: tuple[int, int, int]
    accent_red: tuple[int, int, int]
    accent_green: tuple[int, int, int]
    glass: tuple[int, int, int]


PAL = Palette(
    bg=(12, 16, 24),
    wall_dark=(26, 32, 46),
    wall_mid=(52, 62, 86),
    wall_light=(86, 98, 128),
    floor_light=(198, 202, 208),
    floor_mid=(160, 166, 170),
    floor_dark=(124, 130, 136),
    gold=(204, 170, 90),
    accent_red=(233, 69, 96),
    accent_green=(78, 204, 163),
    glass=(140, 180, 220),
)


def _img(w: int, h: int, fill=(0, 0, 0, 0)) -> Image.Image:
    return Image.new("RGBA", (w, h), fill)


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
                max(0, min(255, r + n)),
                max(0, min(255, g + n)),
                max(0, min(255, b + n)),
                a,
            )


def _rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], r: int, fill, outline=None, width: int = 1) -> None:
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def _write(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="PNG", optimize=True)


def floor_marble_white(seed: int) -> Image.Image:
    img = _img(TILE, TILE, (*PAL.floor_mid, 255))
    draw = ImageDraw.Draw(img)

    # subtle tile grid
    for i in range(0, TILE + 1, 16):
        draw.line((i, 0, i, TILE), fill=(*PAL.floor_dark, 90), width=1)
        draw.line((0, i, TILE, i), fill=(*PAL.floor_dark, 90), width=1)

    rng = random.Random(seed)
    for _ in range(18):
        x0 = rng.randint(-10, TILE + 10)
        y0 = rng.randint(-10, TILE + 10)
        x1 = x0 + rng.randint(24, 90)
        y1 = y0 + rng.randint(10, 40)
        draw.ellipse((x0, y0, x1, y1), outline=(235, 238, 242, 50), width=2)

    _noise(img, 7, seed + 91)
    return img


def floor_marble_dark(seed: int) -> Image.Image:
    img = _img(TILE, TILE, (110, 114, 122, 255))
    draw = ImageDraw.Draw(img)
    for i in range(0, TILE + 1, 16):
        draw.line((i, 0, i, TILE), fill=(70, 74, 82, 120), width=1)
        draw.line((0, i, TILE, i), fill=(70, 74, 82, 120), width=1)
    rng = random.Random(seed)
    for _ in range(12):
        x0 = rng.randint(-12, TILE + 12)
        y0 = rng.randint(-12, TILE + 12)
        x1 = x0 + rng.randint(28, 100)
        y1 = y0 + rng.randint(10, 40)
        draw.ellipse((x0, y0, x1, y1), outline=(200, 204, 210, 45), width=2)
    _noise(img, 8, seed + 77)
    return img


def floor_wood_oak(seed: int) -> Image.Image:
    img = _img(TILE, TILE, (122, 86, 54, 255))
    draw = ImageDraw.Draw(img)
    rng = random.Random(seed)
    plank = rng.choice([8, 10, 12])
    for y in range(0, TILE, plank):
        c = (118 + rng.randint(-8, 8), 82 + rng.randint(-8, 8), 50 + rng.randint(-8, 8), 255)
        draw.rectangle((0, y, TILE - 1, y + plank - 1), fill=c)
        draw.line((0, y, TILE, y), fill=(70, 52, 34, 110), width=1)
    for _ in range(30):
        x = rng.randint(0, TILE - 1)
        y = rng.randint(0, TILE - 1)
        draw.point((x, y), fill=(70, 52, 34, 50))
    _noise(img, 8, seed + 3)
    return img


def floor_carpet(seed: int, tint: tuple[int, int, int]) -> Image.Image:
    img = _img(TILE, TILE, (*tint, 255))
    draw = ImageDraw.Draw(img)
    # subtle woven pattern
    for y in range(0, TILE, 4):
        draw.line((0, y, TILE, y), fill=(0, 0, 0, 25), width=1)
    for x in range(0, TILE, 4):
        draw.line((x, 0, x, TILE), fill=(255, 255, 255, 18), width=1)
    # border
    draw.rectangle((3, 3, TILE - 4, TILE - 4), outline=(PAL.gold[0], PAL.gold[1], PAL.gold[2], 160), width=2)
    _noise(img, 10, seed + 14)
    return img


def floor_mosaic(seed: int) -> Image.Image:
    img = _img(TILE, TILE, (*PAL.floor_light, 255))
    draw = ImageDraw.Draw(img)
    rng = random.Random(seed)
    colors = [
        (PAL.floor_mid[0], PAL.floor_mid[1], PAL.floor_mid[2], 255),
        (PAL.floor_light[0], PAL.floor_light[1], PAL.floor_light[2], 255),
        (PAL.gold[0], PAL.gold[1], PAL.gold[2], 255),
        (PAL.accent_green[0], PAL.accent_green[1], PAL.accent_green[2], 255),
        (PAL.accent_red[0], PAL.accent_red[1], PAL.accent_red[2], 255),
    ]
    for y in range(0, TILE, 8):
        for x in range(0, TILE, 8):
            c = rng.choice(colors)
            draw.rectangle((x, y, x + 7, y + 7), fill=c)
            draw.rectangle((x, y, x + 7, y + 7), outline=(0, 0, 0, 35), width=1)
    _noise(img, 7, seed + 33)
    return img


def wall_gallery(seed: int, base: tuple[int, int, int]) -> Image.Image:
    img = _img(TILE, TILE, (*base, 255))
    draw = ImageDraw.Draw(img)

    # paneling
    for x in range(10, TILE, 18):
        draw.line((x, 8, x, TILE - 12), fill=(base[0] + 10, base[1] + 10, base[2] + 14, 180), width=2)
        draw.line((x + 1, 8, x + 1, TILE - 12), fill=(base[0] - 10, base[1] - 10, base[2] - 12, 120), width=1)

    # molding + baseboard
    draw.rectangle((0, 0, TILE - 1, 7), fill=(base[0] - 8, base[1] - 8, base[2] - 10, 255))
    draw.line((0, 7, TILE, 7), fill=(base[0] + 18, base[1] + 18, base[2] + 22, 140), width=1)

    draw.rectangle((0, TILE - 10, TILE - 1, TILE - 1), fill=(base[0] - 12, base[1] - 12, base[2] - 16, 255))
    draw.line((0, TILE - 10, TILE, TILE - 10), fill=(base[0] + 20, base[1] + 20, base[2] + 24, 150), width=1)

    _noise(img, 6, seed + 5)
    return img


def wall_stone(seed: int, tint: tuple[int, int, int]) -> Image.Image:
    img = _img(TILE, TILE, (*tint, 255))
    draw = ImageDraw.Draw(img)
    rng = random.Random(seed)
    for y in range(0, TILE, 12):
        offset = rng.randint(-4, 4)
        for x in range(offset, TILE, 20):
            w = rng.randint(14, 22)
            h = rng.randint(8, 12)
            c = (tint[0] + rng.randint(-8, 8), tint[1] + rng.randint(-8, 8), tint[2] + rng.randint(-8, 8), 255)
            draw.rectangle((x, y, x + w, y + h), fill=c)
            draw.rectangle((x, y, x + w, y + h), outline=(0, 0, 0, 55), width=1)
    _noise(img, 8, seed + 17)
    return img


def wall_wood_panel(seed: int) -> Image.Image:
    img = _img(TILE, TILE, (170, 124, 78, 255))
    draw = ImageDraw.Draw(img)
    rng = random.Random(seed)
    for x in range(0, TILE, 10):
        c = (168 + rng.randint(-10, 8), 122 + rng.randint(-10, 8), 76 + rng.randint(-10, 8), 255)
        draw.rectangle((x, 0, x + 9, TILE - 1), fill=c)
        draw.line((x, 0, x, TILE), fill=(90, 65, 38, 110), width=1)
    draw.rectangle((0, TILE - 10, TILE - 1, TILE - 1), fill=(130, 92, 56, 255))
    draw.line((0, TILE - 10, TILE, TILE - 10), fill=(220, 190, 120, 70), width=1)
    _noise(img, 8, seed + 29)
    return img


def prop_painting(seed: int, style: str = "modern") -> Image.Image:
    img = _img(TILE, TILE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # frame
    frame = (*PAL.gold, 255)
    frame_outline = (120, 90, 40, 255)
    _rounded(draw, (8, 10, 56, 54), 7, fill=frame, outline=frame_outline, width=2)

    # canvas
    draw.rectangle((14, 16, 50, 48), fill=(24, 30, 48, 255))
    rng = random.Random(seed)

    if style == "classic":
        # landscape-ish bands
        draw.rectangle((14, 16, 50, 30), fill=(40, 58, 86, 255))
        draw.rectangle((14, 30, 50, 38), fill=(70, 100, 120, 255))
        draw.rectangle((14, 38, 50, 48), fill=(90, 70, 50, 255))
        for _ in range(14):
            x = rng.randint(14, 49)
            y = rng.randint(16, 47)
            draw.point((x, y), fill=(230, 220, 190, 255) if rng.random() < 0.08 else (0, 0, 0, 0))
    else:
        # modern confetti
        colors = [
            (*PAL.accent_green, 255),
            (*PAL.accent_red, 255),
            (90, 140, 210, 255),
            (230, 220, 190, 255),
            (160, 166, 170, 255),
        ]
        for _ in range(28):
            x = rng.randint(14, 49)
            y = rng.randint(16, 47)
            draw.point((x, y), fill=rng.choice(colors))
        for _ in range(6):
            x0 = rng.randint(14, 42)
            y0 = rng.randint(16, 40)
            draw.rectangle((x0, y0, x0 + rng.randint(4, 10), y0 + rng.randint(2, 8)), outline=rng.choice(colors), width=1)

    # subtle shadow
    draw.rectangle((10, 54, 58, 58), fill=(0, 0, 0, 70))
    return img


def prop_pedestal(seed: int) -> Image.Image:
    img = _img(TILE, TILE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    base = (120, 124, 132, 255)
    outline = (60, 62, 70, 255)
    _rounded(draw, (18, 40, 46, 60), 5, fill=base, outline=outline, width=2)
    draw.rectangle((20, 34, 44, 42), fill=(145, 150, 158, 255))
    draw.line((22, 36, 22, 58), fill=(210, 214, 220, 170), width=1)
    _noise(img, 4, seed + 9)
    return img


def prop_statue(seed: int, variant: int = 0) -> Image.Image:
    img = _img(TILE, TILE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # pedestal
    ped = prop_pedestal(seed)
    img.alpha_composite(ped)

    rng = random.Random(seed)
    body = (176, 178, 184, 255)

    if variant == 0:
        # standing figure
        head_r = rng.randint(5, 7)
        draw.ellipse((32 - head_r, 16 - head_r, 32 + head_r, 16 + head_r), fill=body)
        draw.rounded_rectangle((28, 20, 36, 40), radius=4, fill=body)
        draw.rounded_rectangle((24, 24, 28, 38), radius=2, fill=body)
        draw.rounded_rectangle((36, 24, 40, 38), radius=2, fill=body)
        draw.rounded_rectangle((28, 40, 32, 48), radius=2, fill=body)
        draw.rounded_rectangle((32, 40, 36, 48), radius=2, fill=body)
    elif variant == 1:
        # bust
        draw.ellipse((24, 10, 40, 26), fill=body)
        draw.rounded_rectangle((24, 22, 40, 42), radius=6, fill=body)
        draw.rectangle((26, 38, 38, 46), fill=body)
    else:
        # abstract
        draw.ellipse((26, 12, 44, 30), outline=(220, 222, 226, 255), width=3)
        draw.rectangle((28, 24, 42, 42), outline=(220, 222, 226, 255), width=2)
        draw.line((28, 42, 42, 24), fill=(220, 222, 226, 255), width=2)

    draw.line((28, 20, 28, 48), fill=(220, 222, 226, 170), width=1)
    return img


def prop_plant(seed: int) -> Image.Image:
    img = _img(TILE, TILE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # pot
    _rounded(draw, (22, 44, 42, 60), 5, fill=(*PAL.accent_red, 255), outline=(70, 22, 34, 255), width=2)
    draw.rectangle((24, 44, 40, 48), fill=(250, 230, 200, 60))

    rng = random.Random(seed)
    greens = [
        (*PAL.accent_green, 255),
        (60, 170, 130, 255),
        (90, 210, 170, 255),
        (40, 140, 110, 255),
    ]

    for _ in range(12):
        cx = rng.randint(18, 46)
        cy = rng.randint(14, 44)
        rx = rng.randint(6, 14)
        ry = rng.randint(10, 20)
        draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), outline=rng.choice(greens), width=2)

    return img


def prop_bench(seed: int, modern: bool = False) -> Image.Image:
    img = _img(TILE, TILE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if modern:
        # sleek bench
        _rounded(draw, (10, 34, 54, 44), 8, fill=(70, 80, 110, 255), outline=(25, 30, 48, 255), width=2)
        draw.rectangle((14, 44, 18, 56), fill=(45, 52, 74, 255))
        draw.rectangle((46, 44, 50, 56), fill=(45, 52, 74, 255))
    else:
        # wood bench
        draw.rectangle((10, 34, 54, 42), fill=(120, 86, 54, 255))
        draw.rectangle((10, 42, 54, 46), fill=(100, 70, 44, 255))
        draw.rectangle((14, 46, 18, 58), fill=(80, 58, 36, 255))
        draw.rectangle((46, 46, 50, 58), fill=(80, 58, 36, 255))
        for x in range(12, 54, 8):
            draw.line((x, 34, x, 46), fill=(60, 42, 26, 80), width=1)

    _noise(img, 4, seed + 1)
    return img


def prop_rope_barrier(seed: int) -> Image.Image:
    img = _img(TILE, TILE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # posts
    for x in (18, 46):
        _rounded(draw, (x - 3, 26, x + 3, 58), 3, fill=(70, 80, 110, 255), outline=(25, 30, 48, 255), width=2)
        draw.ellipse((x - 5, 22, x + 5, 32), fill=(*PAL.gold, 255), outline=(120, 90, 40, 255), width=2)

    # rope
    draw.line((18, 34, 46, 34), fill=(PAL.accent_red[0], PAL.accent_red[1], PAL.accent_red[2], 255), width=3)
    draw.line((18, 36, 46, 36), fill=(140, 40, 60, 150), width=1)

    _noise(img, 3, seed + 13)
    return img


def prop_display_case(seed: int) -> Image.Image:
    img = _img(TILE, TILE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # base
    _rounded(draw, (12, 44, 52, 60), 6, fill=(70, 80, 110, 255), outline=(25, 30, 48, 255), width=2)

    # glass box
    draw.rectangle((14, 18, 50, 46), outline=(PAL.glass[0], PAL.glass[1], PAL.glass[2], 220), width=2)
    draw.rectangle((16, 20, 48, 44), fill=(PAL.glass[0], PAL.glass[1], PAL.glass[2], 35))
    draw.line((20, 22, 20, 44), fill=(255, 255, 255, 40), width=1)

    # tiny artifact
    rng = random.Random(seed)
    col = rng.choice([(PAL.gold[0], PAL.gold[1], PAL.gold[2], 255), (220, 222, 226, 255)])
    draw.ellipse((30, 30, 36, 36), fill=col)

    _noise(img, 3, seed + 2)
    return img


def prop_wall_sconce(seed: int) -> Image.Image:
    img = _img(TILE, TILE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    _rounded(draw, (8, 22, 20, 42), 4, fill=(*PAL.gold, 255), outline=(120, 90, 40, 255), width=2)
    draw.line((18, 32, 30, 32), fill=(*PAL.gold, 255), width=3)
    draw.ellipse((28, 24, 40, 36), fill=(250, 220, 120, 255))

    glow = _img(TILE, TILE)
    g = ImageDraw.Draw(glow)
    g.ellipse((22, 18, 48, 44), fill=(250, 220, 120, 45))
    img.alpha_composite(glow)

    _noise(img, 2, seed + 19)
    return img


def prop_chandelier(seed: int) -> Image.Image:
    img = _img(TILE, TILE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    draw.line((32, 0, 32, 16), fill=(180, 150, 90, 255), width=2)
    draw.ellipse((16, 14, 48, 34), outline=(*PAL.gold, 255), width=3)

    for dx in (-14, -2, 10):
        draw.rectangle((32 + dx - 2, 10, 32 + dx + 2, 16), fill=(230, 220, 190, 255))
        draw.ellipse((32 + dx - 2, 6, 32 + dx + 2, 10), fill=(250, 220, 120, 255))

    glow = _img(TILE, TILE)
    g = ImageDraw.Draw(glow)
    g.ellipse((10, 6, 54, 50), fill=(250, 220, 120, 35))
    img.alpha_composite(glow)

    _noise(img, 3, seed + 21)
    return img


def ui_homepage(seed: int) -> Image.Image:
    w, h = 1280, 720
    img = _img(w, h, (*PAL.bg, 255))
    draw = ImageDraw.Draw(img)

    floor_h = 260
    wall = wall_gallery(seed + 1, base=PAL.wall_dark)
    floor = floor_marble_white(seed + 2)

    # tile wall/floor
    for x in range(0, w, TILE):
        for y in range(0, h - floor_h, TILE):
            img.paste(wall, (x, y), wall)
        for y in range(h - floor_h, h, TILE):
            img.paste(floor, (x, y), floor)

    # hang paintings
    for i in range(7):
        px = 80 + i * 170
        p = prop_painting(seed + 100 + i, style="classic" if i % 2 else "modern")
        img.paste(p, (px, 140), p)

    # chandeliers
    for i in range(3):
        c = prop_chandelier(seed + 300 + i)
        img.paste(c, (220 + i * 360, 18), c)

    # plants
    for i in range(3):
        pl = prop_plant(seed + 400 + i)
        img.paste(pl, (120 + i * 420, h - floor_h + 90), pl)

    # title
    try:
        font = ImageFont.truetype("Arial.ttf", 56)
        small = ImageFont.truetype("Arial.ttf", 22)
    except Exception:
        font = ImageFont.load_default()
        small = ImageFont.load_default()

    title = "Digital Art Museum"
    tb = draw.textbbox((0, 0), title, font=font)
    tw = tb[2] - tb[0]
    draw.text(((w - tw) / 2, 26), title, font=font, fill=(235, 235, 240, 255))

    subtitle = "Explore exhibits, collect pieces, curate your gallery"
    sb = draw.textbbox((0, 0), subtitle, font=small)
    sw = sb[2] - sb[0]
    draw.text(((w - sw) / 2, 96), subtitle, font=small, fill=(190, 198, 210, 255))

    # central panel
    _rounded(draw, (w // 2 - 260, h - 230, w // 2 + 260, h - 140), 18, fill=(26, 32, 46, 240), outline=(80, 96, 130, 255), width=3)
    draw.text((w // 2 - 200, h - 205), "Start Tour", font=small, fill=(235, 235, 240, 255))
    draw.text((w // 2 - 25, h - 205), "Gallery", font=small, fill=(235, 235, 240, 255))
    draw.text((w // 2 + 110, h - 205), "Settings", font=small, fill=(235, 235, 240, 255))

    _noise(img, 3, seed + 999)
    return img


def main() -> int:
    # Tiles
    floors: dict[str, Image.Image] = {
        "floor_marble_white_01.png": floor_marble_white(1),
        "floor_marble_white_02.png": floor_marble_white(2),
        "floor_marble_dark_01.png": floor_marble_dark(3),
        "floor_wood_oak_01.png": floor_wood_oak(4),
        "floor_wood_oak_02.png": floor_wood_oak(5),
        "floor_carpet_red_01.png": floor_carpet(6, (120, 40, 58)),
        "floor_carpet_blue_01.png": floor_carpet(7, (40, 58, 96)),
        "floor_mosaic_color_01.png": floor_mosaic(8),
    }

    walls: dict[str, Image.Image] = {
        "wall_gallery_navy_01.png": wall_gallery(10, base=PAL.wall_dark),
        "wall_gallery_navy_02.png": wall_gallery(11, base=(20, 26, 40)),
        "wall_gallery_green_01.png": wall_gallery(12, base=(22, 40, 36)),
        "wall_stone_gray_01.png": wall_stone(13, tint=(120, 126, 132)),
        "wall_stone_sand_01.png": wall_stone(14, tint=(168, 148, 110)),
        "wall_wood_panel_01.png": wall_wood_panel(15),
        "wall_wood_panel_02.png": wall_wood_panel(16),
    }

    # Props
    props: dict[str, Image.Image] = {}

    for i in range(1, 11):
        props[f"painting_modern_{i:02d}.png"] = prop_painting(100 + i, style="modern")
        props[f"painting_classic_{i:02d}.png"] = prop_painting(200 + i, style="classic")

    for i in range(1, 4):
        props[f"pedestal_stone_{i:02d}.png"] = prop_pedestal(300 + i)

    props["statue_marble_01.png"] = prop_statue(410, variant=0)
    props["statue_bust_marble_01.png"] = prop_statue(411, variant=1)
    props["statue_abstract_01.png"] = prop_statue(412, variant=2)

    for i in range(1, 5):
        props[f"plant_potted_{i:02d}.png"] = prop_plant(500 + i)

    props["bench_wood_01.png"] = prop_bench(601, modern=False)
    props["bench_modern_01.png"] = prop_bench(602, modern=True)

    props["rope_barrier_red_01.png"] = prop_rope_barrier(700)
    props["display_case_glass_01.png"] = prop_display_case(800)

    for i in range(1, 4):
        props[f"light_wall_sconce_gold_{i:02d}.png"] = prop_wall_sconce(900 + i)

    for i in range(1, 4):
        props[f"light_chandelier_gold_{i:02d}.png"] = prop_chandelier(950 + i)

    # UI
    ui: dict[str, Image.Image] = {
        "museum_homepage_1280x720.png": ui_homepage(42),
    }

    # Write all
    for name, img in floors.items():
        _write(img, OUT_VH / "Tiles" / name)
        _write(img, OUT_PUBLIC / "tiles" / name)

    for name, img in walls.items():
        _write(img, OUT_VH / "Walls" / name)
        _write(img, OUT_PUBLIC / "walls" / name)

    for name, img in props.items():
        _write(img, OUT_VH / "Props" / name)
        _write(img, OUT_PUBLIC / "props" / name)

    for name, img in ui.items():
        _write(img, OUT_VH / "UI" / name)
        _write(img, OUT_PUBLIC / "ui" / name)

    print(f"Wrote {len(floors)} floors, {len(walls)} walls, {len(props)} props, {len(ui)} ui images")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
