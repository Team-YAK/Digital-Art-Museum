"""
Seed script: creates two demo rooms with pre-pixelized artworks.

  python seed.py

Creates users "leonardo" and "vangogh" and populates their rooms
with synthetic pixel-art images that look interesting when run
through the pixelizer pipeline.

Run this AFTER the backend has started at least once (so museum.db exists),
or simply run it standalone -- it calls create_tables() itself.
"""

import os
import sys
import tempfile

# Ensure backend/ is on sys.path regardless of where this is run from
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image, ImageDraw
from app.database import create_tables, SessionLocal
from app.models import User, Room, Artwork
from app.services.pixelizer import pixelize


# ---------------------------------------------------------------------------
# Synthetic image generators (no network required)
# ---------------------------------------------------------------------------

def _make_gradient(width: int, height: int, colors: list[tuple]) -> Image.Image:
    """Vertical gradient between two or more RGB colors."""
    img = Image.new("RGB", (width, height))
    n = len(colors) - 1
    for y in range(height):
        seg = min(int(y / height * n), n - 1)
        t = (y / height * n) - seg
        c1, c2 = colors[seg], colors[seg + 1]
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        for x in range(width):
            img.putpixel((x, y), (r, g, b))
    return img


def _make_portrait(width: int, height: int, bg: tuple, skin: tuple, hair: tuple) -> Image.Image:
    """Simple blocky portrait -- oval face, hair, clothing."""
    img = _make_gradient(width, height, [bg, tuple(max(0, c - 40) for c in bg)])
    d = ImageDraw.Draw(img)
    cx, cy = width // 2, height // 2
    # Clothing
    d.ellipse([cx - 60, cy + 40, cx + 60, cy + 140], fill=(50, 50, 120))
    # Face
    d.ellipse([cx - 45, cy - 60, cx + 45, cy + 40], fill=skin)
    # Hair
    d.ellipse([cx - 50, cy - 90, cx + 50, cy - 20], fill=hair)
    # Eyes
    d.ellipse([cx - 20, cy - 25, cx - 8, cy - 13], fill=(30, 30, 30))
    d.ellipse([cx + 8, cy - 25, cx + 20, cy - 13], fill=(30, 30, 30))
    # Mouth
    d.arc([cx - 15, cy + 5, cx + 15, cy + 20], start=0, end=180, fill=(180, 80, 80), width=3)
    return img


def _make_starry(width: int, height: int) -> Image.Image:
    """Swirly night sky with stars and a moon."""
    img = _make_gradient(width, height, [(10, 20, 80), (30, 60, 120), (20, 40, 100)])
    d = ImageDraw.Draw(img)
    import math, random
    random.seed(42)
    # Swirl strokes
    for _ in range(200):
        x = random.randint(0, width)
        y = random.randint(0, height // 2)
        r = random.randint(2, 12)
        hue = random.choice([(200, 220, 255), (255, 255, 180), (180, 200, 240)])
        d.ellipse([x - r, y - r, x + r, y + r], fill=hue)
    # Stars
    for _ in range(80):
        x, y = random.randint(0, width), random.randint(0, height // 2)
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(255, 255, 220))
    # Moon
    d.ellipse([width - 90, 20, width - 30, 80], fill=(255, 250, 180))
    # Hills
    d.polygon([(0, height), (width // 3, height // 2), (width * 2 // 3, height * 2 // 3), (width, height)], fill=(20, 40, 20))
    # Village
    for i in range(5):
        bx = 20 + i * (width // 5)
        d.rectangle([bx, height - 60, bx + 25, height - 20], fill=(30, 30, 30))
        d.polygon([(bx - 5, height - 60), (bx + 12, height - 85), (bx + 30, height - 60)], fill=(60, 20, 20))
    return img


def _make_sunflowers(width: int, height: int) -> Image.Image:
    """Yellow sunflowers against a vivid blue sky."""
    img = _make_gradient(width, height, [(100, 160, 220), (60, 120, 200)])
    d = ImageDraw.Draw(img)
    import random
    random.seed(7)
    for i in range(6):
        cx = 30 + i * (width // 6) + random.randint(-10, 10)
        cy = height // 2 + random.randint(-20, 20)
        # Stem
        d.line([(cx, height), (cx, cy + 40)], fill=(60, 120, 40), width=6)
        # Petals
        for angle in range(0, 360, 30):
            import math
            px = cx + int(35 * math.cos(math.radians(angle)))
            py = cy + int(35 * math.sin(math.radians(angle)))
            d.ellipse([px - 15, py - 8, px + 15, py + 8], fill=(240, 200, 20))
        # Center
        d.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=(100, 50, 10))
    return img


def _make_vitruvian(width: int, height: int) -> Image.Image:
    """Schematic-style figure in a circle and square, sepia tone."""
    img = Image.new("RGB", (width, height), (220, 195, 150))
    d = ImageDraw.Draw(img)
    cx, cy = width // 2, height // 2
    ink = (80, 50, 20)
    # Circle
    d.ellipse([cx - 110, cy - 110, cx + 110, cy + 110], outline=ink, width=2)
    # Square
    d.rectangle([cx - 90, cy - 120, cx + 90, cy + 90], outline=ink, width=2)
    # Body
    d.line([(cx, cy - 100), (cx, cy + 60)], fill=ink, width=3)
    # Arms spread
    d.line([(cx - 100, cy - 20), (cx + 100, cy - 20)], fill=ink, width=3)
    # Arms diagonal
    d.line([(cx - 80, cy - 80), (cx + 80, cy - 80)], fill=ink, width=3)
    # Legs spread
    d.line([(cx, cy + 60), (cx - 70, cy + 130)], fill=ink, width=3)
    d.line([(cx, cy + 60), (cx + 70, cy + 130)], fill=ink, width=3)
    # Head
    d.ellipse([cx - 30, cy - 140, cx + 30, cy - 80], outline=ink, width=2)
    return img


def _make_last_supper(width: int, height: int) -> Image.Image:
    """Simplified long-table scene with color blocks."""
    img = _make_gradient(width, height, [(180, 150, 100), (140, 110, 70)])
    d = ImageDraw.Draw(img)
    # Background archways
    for i in range(3):
        bx = 40 + i * (width // 3)
        d.rectangle([bx, 20, bx + width // 3 - 20, height // 2], outline=(100, 70, 40), width=3)
    # Table
    d.rectangle([10, height // 2 + 20, width - 10, height - 10], fill=(120, 80, 40))
    # Figures (13 color blocks)
    colors = [(200, 50, 50), (50, 100, 200), (200, 150, 50), (50, 180, 50),
              (180, 50, 180), (100, 180, 180), (220, 100, 50), (80, 80, 200),
              (200, 200, 50), (50, 150, 100), (180, 80, 80), (100, 100, 180), (200, 180, 80)]
    for i, color in enumerate(colors):
        fx = 15 + i * (width // 13)
        d.rectangle([fx, height // 2 - 60, fx + width // 14, height // 2 + 20], fill=color)
        d.ellipse([fx + 4, height // 2 - 90, fx + width // 14 - 4, height // 2 - 65], fill=(220, 180, 140))
    return img


def _make_lady_ermine(width: int, height: int) -> Image.Image:
    """Lady holding a small white animal, dark background."""
    return _make_portrait(width, height,
                          bg=(30, 45, 60),
                          skin=(220, 185, 155),
                          hair=(60, 40, 20))


def _make_bedroom_arles(width: int, height: int) -> Image.Image:
    """Van Gogh's bedroom -- simple geometric room."""
    img = Image.new("RGB", (width, height), (190, 160, 90))
    d = ImageDraw.Draw(img)
    # Floor
    d.polygon([(0, height), (width, height), (width * 2 // 3, height // 2), (width // 3, height // 2)], fill=(160, 120, 70))
    # Left wall
    d.polygon([(0, 0), (width // 3, height // 2), (0, height)], fill=(140, 180, 210))
    # Right wall
    d.polygon([(width, 0), (width, height), (width * 2 // 3, height // 2)], fill=(130, 170, 200))
    # Bed
    d.rectangle([width // 4, height // 2 + 10, width * 3 // 4, height - 10], fill=(180, 80, 60))
    # Window
    d.rectangle([width // 3 + 10, 10, width * 2 // 3 - 10, height // 3], fill=(200, 230, 255))
    d.line([(width // 2, 10), (width // 2, height // 3)], fill=(100, 80, 50), width=3)
    d.line([(width // 3 + 10, height // 5), (width * 2 // 3 - 10, height // 5)], fill=(100, 80, 50), width=3)
    # Chair
    d.rectangle([width * 3 // 4, height * 2 // 3, width - 20, height - 20], fill=(100, 140, 80))
    return img


def _make_self_portrait(width: int, height: int) -> Image.Image:
    """Van Gogh self portrait style -- warm, textured background."""
    return _make_portrait(width, height,
                          bg=(80, 100, 140),
                          skin=(210, 170, 120),
                          hair=(180, 120, 50))


# ---------------------------------------------------------------------------
# Seed data definition
# ---------------------------------------------------------------------------

SEED_USERS = [
    {
        "username": "leonardo",
        "artist_description": "Renaissance master exploring the intersection of art and science. Known for sfumato technique, engineering diagrams, and timeless portraits.",
        "artworks": [
            {
                "position_index": 0,
                "title": "Mona Lisa",
                "description": "Portrait of Lisa Gherardini, wife of Francesco del Giocondo. Famous for her enigmatic smile and Leonardo's pioneering use of sfumato.",
                "generator": lambda w, h: _make_portrait(w, h, (160, 140, 100), (210, 175, 140), (60, 40, 20)),
            },
            {
                "position_index": 1,
                "title": "The Last Supper",
                "description": "Depiction of the final meal Jesus shared with his apostles before his crucifixion. A masterwork of perspective and emotional expression.",
                "generator": _make_last_supper,
            },
            {
                "position_index": 2,
                "title": "Vitruvian Man",
                "description": "Study of the ideal human proportions as described by ancient architect Vitruvius. Shows a man inscribed in both a circle and a square.",
                "generator": _make_vitruvian,
            },
            {
                "position_index": 3,
                "title": "Lady with an Ermine",
                "description": "Portrait of Cecilia Gallerani, mistress of Ludovico Sforza, Duke of Milan. One of the first portraits to show the subject in a three-quarter pose.",
                "generator": _make_lady_ermine,
            },
        ],
    },
    {
        "username": "vangogh",
        "artist_description": "Post-Impressionist painter capturing raw emotion through bold color, expressive brushwork, and swirling compositions. Created over 900 paintings in a decade.",
        "artworks": [
            {
                "position_index": 0,
                "title": "The Starry Night",
                "description": "View from the east-facing window of his asylum room at Saint-Paul-de-Mausole, with an idealized village added below. Swirling night sky over a sleeping town.",
                "generator": _make_starry,
            },
            {
                "position_index": 1,
                "title": "Sunflowers",
                "description": "Series of still life paintings featuring sunflowers in a vase. Painted in Arles in 1888 to decorate the room for Paul Gauguin's visit.",
                "generator": _make_sunflowers,
            },
            {
                "position_index": 2,
                "title": "Self-Portrait",
                "description": "One of over 30 self-portraits Van Gogh painted. His penetrating gaze and distinctive brushwork make this among the most recognizable faces in art history.",
                "generator": _make_self_portrait,
            },
            {
                "position_index": 3,
                "title": "Bedroom in Arles",
                "description": "Van Gogh's own bedroom at his Yellow House in Arles. The painting's skewed perspective and bold flat colors were intentional, meant to suggest absolute rest.",
                "generator": _make_bedroom_arles,
            },
        ],
    },
]


# ---------------------------------------------------------------------------
# Seeder
# ---------------------------------------------------------------------------

def seed():
    create_tables()
    db = SessionLocal()

    for user_data in SEED_USERS:
        uname = user_data["username"]
        print(f"\n{'=' * 50}")
        print(f"Seeding user: {uname}")

        # Check if user already exists
        existing_user = db.query(User).filter(User.username == uname).first()
        if existing_user:
            print(f"  User '{uname}' already exists -- skipping creation")
            user = existing_user
            room = user.room
        else:
            user = User(username=uname)
            db.add(user)
            db.flush()
            room = Room(owner_user_id=user.id, artist_description=user_data["artist_description"])
            db.add(room)
            db.flush()
            print(f"  Created user + room (id={room.id})")

        # Update artist description in case it changed
        room.artist_description = user_data["artist_description"]
        db.flush()

        for art_data in user_data["artworks"]:
            pos = art_data["position_index"]

            # Skip if slot already filled
            existing_art = db.query(Artwork).filter(
                Artwork.room_id == room.id,
                Artwork.position_index == pos
            ).first()
            if existing_art:
                print(f"  Slot {pos} already has '{existing_art.title}' -- skipping")
                continue

            print(f"  Generating '{art_data['title']}' at slot {pos}...")

            # Generate synthetic image
            img: Image.Image = art_data["generator"](256, 256)

            # Save to temp file and run through pixelizer
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                img.save(tmp.name, "PNG")
                tmp_path = tmp.name

            try:
                paths = pixelize(tmp_path)
            finally:
                os.unlink(tmp_path)

            artwork = Artwork(
                room_id=room.id,
                title=art_data["title"],
                description=art_data["description"],
                image_url=paths["display_path"],
                pixel_image_url=paths["pixel_path"],
                position_index=pos,
            )
            db.add(artwork)
            db.flush()
            print(f"    pixel: {paths['pixel_path']}")
            print(f"    sprite: {paths['sprite_path']}")

        db.commit()
        print(f"  Committed {uname}'s room.")

    db.close()
    print("\nSeed complete!")


if __name__ == "__main__":
    seed()
