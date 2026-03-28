import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Room, Artwork
from app.schemas import (
    RoomResponse,
    RoomUpdate,
    RandomRoomResponse,
    ArtworkResponse,
    FeaturedArtworkResponse,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


def _artwork_to_response(a: Artwork) -> ArtworkResponse:
    return ArtworkResponse(
        id=a.id,
        room_id=a.room_id,
        title=a.title,
        description=a.description,
        image_url=a.image_url,
        pixel_image_url=a.pixel_image_url,
        position_index=a.position_index,
        created_at=a.created_at.isoformat(),
    )


@router.get("/random", response_model=RandomRoomResponse)
def get_random_room(db: Session = Depends(get_db)):
    rooms_with_art = (
        db.query(Room)
        .join(Artwork, Room.id == Artwork.room_id)
        .distinct()
        .all()
    )
    if not rooms_with_art:
        all_rooms = db.query(Room).all()
        if not all_rooms:
            raise HTTPException(status_code=404, detail="No rooms exist yet")
        room = random.choice(all_rooms)
    else:
        room = random.choice(rooms_with_art)

    return RandomRoomResponse(username=room.owner.username)


@router.get("/featured", response_model=list[FeaturedArtworkResponse])
def get_featured_artworks(limit: int = 27, db: Session = Depends(get_db)):
    """Return up to `limit` random artworks for display in the hub world."""
    artworks = (
        db.query(Artwork)
        .join(Room, Artwork.room_id == Room.id)
        .order_by(func.random())
        .limit(limit)
        .all()
    )
    return [
        FeaturedArtworkResponse(
            id=a.id,
            title=a.title,
            pixel_image_url=a.pixel_image_url,
            owner_username=a.room.owner.username,
        )
        for a in artworks
    ]


@router.get("/{username}", response_model=RoomResponse)
def get_room(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    room = user.room
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    return RoomResponse(
        id=room.id,
        owner_username=user.username,
        artist_description=room.artist_description,
        artworks=[_artwork_to_response(a) for a in room.artworks],
    )


@router.put("/{username}", response_model=RoomResponse)
def update_room(
    username: str,
    data: RoomUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.username != username.lower():
        raise HTTPException(status_code=403, detail="You can only edit your own room")

    user = db.query(User).filter(User.username == username.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    room = user.room
    room.artist_description = data.artist_description
    db.commit()
    db.refresh(room)

    return RoomResponse(
        id=room.id,
        owner_username=user.username,
        artist_description=room.artist_description,
        artworks=[_artwork_to_response(a) for a in room.artworks],
    )
