"""
Database initialization script.

Run this once before starting the backend to ensure the database exists
and is populated with demo data.

Usage:
    cd backend
    python init_db.py

Or from the project root:
    python backend/init_db.py
"""

import os
import sys

# Ensure backend/ is importable regardless of CWD
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import create_tables, SessionLocal
from app.models import User, Room, Artwork
from app.config import DATABASE_URL


def count_records(db):
    users = db.query(User).count()
    rooms = db.query(Room).count()
    artworks = db.query(Artwork).count()
    return users, rooms, artworks


def check_demo_users(db):
    leonardo = db.query(User).filter(User.username == "leonardo").first()
    vangogh = db.query(User).filter(User.username == "vangogh").first()
    return leonardo, vangogh


def main():
    db_path = DATABASE_URL.replace("sqlite:///", "")
    print(f"Database : {db_path}")

    # Step 1: Create tables
    create_tables()
    print("Tables   : ready")

    db = SessionLocal()

    # Step 2: Check current state
    users, rooms, artworks = count_records(db)
    print(f"Records  : {users} users | {rooms} rooms | {artworks} artworks")

    # Step 3: Seed demo data if needed
    leonardo, vangogh = check_demo_users(db)
    needs_seed = not leonardo or not vangogh

    if needs_seed:
        print("Seeding  : running seed.py (demo users missing)...")
        db.close()
        # Import and run the seed function
        from seed import seed
        seed()
        # Reopen to show final counts
        db = SessionLocal()
        users, rooms, artworks = count_records(db)
        print(f"Records  : {users} users | {rooms} rooms | {artworks} artworks")
        leonardo, vangogh = check_demo_users(db)
    else:
        print("Seeding  : demo users already present — skipping")

    db.close()

    # Step 4: Status summary
    print(f"\nDemo users:")
    print(f"  leonardo : {'✓' if leonardo else '✗'}")
    print(f"  vangogh  : {'✓' if vangogh else '✗'}")
    print("\nReady.")


if __name__ == "__main__":
    main()
