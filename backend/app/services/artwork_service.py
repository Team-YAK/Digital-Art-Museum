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

try:
    import boto3
except ModuleNotFoundError:
    boto3 = None

from app.config import (
    UPLOAD_DIR, SUPABASE_URL, SUPABASE_BUCKET, 
    AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, BASE_DIR
)
from app.models import User, Artwork
from app.services.pixelizer import pixelize

def upload_to_cloud(local_path: str, file_name: str) -> str | None:
    if not SUPABASE_URL:
        return None
    if boto3 is None:
        raise HTTPException(
            status_code=500,
            detail="Cloud storage is configured but boto3 is not installed on the backend.",
        )
    s3 = boto3.client(
        "s3",
        endpoint_url=SUPABASE_URL,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION
    )
    s3.upload_file(local_path, SUPABASE_BUCKET, file_name, ExtraArgs={"ContentType": "image/png"})
    base_url = SUPABASE_URL.replace("/s3", "")
    return f"{base_url}/object/public/{SUPABASE_BUCKET}/{file_name}"


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

        # Save original locally
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        file_id = uuid.uuid4().hex[:12]
        ext = os.path.splitext(file.filename or "image.png")[1] or ".png"
        original_filename = f"{file_id}_original{ext}"
        original_abs = os.path.join(UPLOAD_DIR, original_filename)
        shutil.copy2(tmp_path, original_abs)

        # Upload to cloud (if configured)
        display_img_path = paths["display_path"]
        pixel_img_path = paths["pixel_path"]

        display_abs = os.path.join(BASE_DIR, display_img_path.lstrip("/"))
        pixel_abs = os.path.join(BASE_DIR, pixel_img_path.lstrip("/"))

        cloud_display_url = upload_to_cloud(display_abs, f"uploads/{os.path.basename(display_abs)}")
        cloud_pixel_url = upload_to_cloud(pixel_abs, f"uploads/pixel/{os.path.basename(pixel_abs)}")
        
        # Override paths if cloud was successful
        final_image_url = cloud_display_url if cloud_display_url else display_img_path
        final_pixel_url = cloud_pixel_url if cloud_pixel_url else pixel_img_path

        # Create DB record
        artwork = Artwork(
            room_id=room.id,
            title=title,
            description=description,
            image_url=final_image_url,
            pixel_image_url=final_pixel_url,
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
