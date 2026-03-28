"""
Artwork upload orchestration.

Handles: save temp file -> pixelize -> create DB record -> clean up.
Does NOT modify the DB schema (that's owned by another team member).
"""

import os
import uuid
import shutil
import tempfile

from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException

from app.config import UPLOAD_DIR
from app.models import User, Artwork
from app.services.pixelizer import pixelize


def validate_upload(position_index: int, room_id: int, db: Session) -> None:
    """Check that position_index is valid and the slot is empty."""
    if position_index < 0 or position_index > 24:
        raise HTTPException(status_code=400, detail="position_index must be 0-24")

    existing = (
        db.query(Artwork)
        .filter(Artwork.room_id == room_id, Artwork.position_index == position_index)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409, detail=f"Slot {position_index} already has artwork"
        )


def save_upload_to_temp(file: UploadFile) -> str:
    """Save the uploaded file to a temp location and return the path."""
    suffix = os.path.splitext(file.filename or "image.png")[1] or ".png"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        shutil.copyfileobj(file.file, tmp)
    finally:
        tmp.close()
    return tmp.name


def create_artwork(
    username: str,
    title: str,
    description: str,
    position_index: int,
    file: UploadFile,
    db: Session,
) -> Artwork:
    """
    Full upload pipeline:
    1. Resolve user + room
    2. Validate slot is empty
    3. Save uploaded file to temp
    4. Run pixelizer
    5. Save original to uploads/
    6. Insert Artwork row
    7. Clean up temp file
    """
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user or not user.room:
        raise HTTPException(status_code=404, detail="Room not found")

    room = user.room
    validate_upload(position_index, room.id, db)

    # Save to temp
    tmp_path = save_upload_to_temp(file)

    try:
        # Pixelize
        paths = pixelize(tmp_path)

        # Save original to uploads/ as well
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        file_id = uuid.uuid4().hex[:12]
        ext = os.path.splitext(file.filename or "image.png")[1] or ".png"
        original_filename = f"{file_id}_original{ext}"
        original_abs = os.path.join(UPLOAD_DIR, original_filename)
        shutil.copy2(tmp_path, original_abs)

        # Create DB record
        artwork = Artwork(
            room_id=room.id,
            title=title,
            description=description,
            image_url=paths["display_path"],
            pixel_image_url=paths["pixel_path"],
            position_index=position_index,
        )
        db.add(artwork)
        db.commit()
        db.refresh(artwork)

        return artwork

    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def delete_artwork(username: str, position_index: int, db: Session) -> None:
    """Remove an artwork from a slot. Only the room owner should call this."""
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user or not user.room:
        raise HTTPException(status_code=404, detail="Room not found")

    artwork = (
        db.query(Artwork)
        .filter(
            Artwork.room_id == user.room.id,
            Artwork.position_index == position_index,
        )
        .first()
    )
    if not artwork:
        raise HTTPException(status_code=404, detail="No artwork at this position")

    db.delete(artwork)
    db.commit()
