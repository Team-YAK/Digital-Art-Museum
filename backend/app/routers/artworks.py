from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Artwork
from app.schemas import ArtworkResponse

router = APIRouter(prefix="/api/rooms", tags=["artworks"])


@router.get("/{username}/artworks", response_model=list[ArtworkResponse])
def get_artworks(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user or not user.room:
        raise HTTPException(status_code=404, detail="Room not found")

    artworks = (
        db.query(Artwork)
        .filter(Artwork.room_id == user.room.id)
        .order_by(Artwork.position_index)
        .all()
    )

    return [
        ArtworkResponse(
            id=a.id,
            room_id=a.room_id,
            title=a.title,
            description=a.description,
            image_url=a.image_url,
            pixel_image_url=a.pixel_image_url,
            position_index=a.position_index,
            created_at=a.created_at.isoformat(),
        )
        for a in artworks
    ]
