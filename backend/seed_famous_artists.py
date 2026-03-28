import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import create_tables, SessionLocal
from app.models import User, Room, Artwork
from app.services.pixelizer import pixelize
from app.auth import hash_password

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "VikingHacksAssets", "Artists")

def seed_famous_artists():
    create_tables()
    db = SessionLocal()

    if not os.path.exists(ASSETS_DIR):
        print(f"Assets directory not found at: {ASSETS_DIR}")
        return

    for artist_name in os.listdir(ASSETS_DIR):
        artist_dir = os.path.join(ASSETS_DIR, artist_name)
        if not os.path.isdir(artist_dir):
            continue
        
        # Format the username nicely (e.g. Leonardo Da Vinci -> leonardodavinci)
        username = artist_name.lower().replace(" ", "")
        print(f"\n=======================")
        print(f"Seeding artist: {artist_name} (username: {username})")

        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"  User '{username}' already exists.")
            user = existing_user
            room = user.room
        else:
            user = User(username=username, password_hash=hash_password("1234"))
            db.add(user)
            db.flush()
            room = Room(owner_user_id=user.id, artist_description=f"The legendary gallery of {artist_name}.")
            db.add(room)
            db.flush()
            print(f"  Created user + room (id={room.id})")

        art_files = sorted(os.listdir(artist_dir))
        pos = 0

        for art_file in art_files:
            if art_file.startswith("."):
                continue

            # Skip checking DB collision sequentially, just find first open
            while db.query(Artwork).filter(Artwork.room_id == room.id, Artwork.position_index == pos).first():
                pos += 1

            if pos >= 25:
                print("  Room is full (25 slots filled)")
                break

            print(f"  Uploading '{art_file}' at slot {pos}...")
            
            # Pixelize
            img_path = os.path.join(artist_dir, art_file)
            try:
                paths = pixelize(img_path)
            except Exception as e:
                print(f"  Failed: {e}")
                continue
            
            # Remove extension for title
            title = os.path.splitext(art_file)[0].replace("_", " ").title()
            
            artwork = Artwork(
                room_id=room.id,
                title=title,
                description=f"A legendary masterpiece by {artist_name}: {title}",
                image_url=paths["display_path"],
                pixel_image_url=paths["pixel_path"],
                position_index=pos,
            )
            db.add(artwork)
            db.flush()
            print(f"    pixel: {paths['pixel_path']}")
            pos += 1
            
        db.commit()
    db.close()
    print("\nFamous artists seed complete!")

if __name__ == "__main__":
    seed_famous_artists()
