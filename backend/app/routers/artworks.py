from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Artwork
from app.schemas import ArtworkResponse
from app.services.artwork_service import create_artwork, delete_artwork
from app.auth import get_current_user

router = APIRouter(prefix="/api/rooms", tags=["artworks"])


def _artwork_response(a: Artwork) -> ArtworkResponse:
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
    return [_artwork_response(a) for a in artworks]


@router.post("/{username}/artworks", response_model=ArtworkResponse)
def upload_artwork(
    username: str,
    title: str = Form(...),
    description: str = Form(""),
    position_index: int = Form(...),
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        if current_user.username != username.lower():
            raise HTTPException(status_code=403, detail="You can only upload to your own room")

        artwork = create_artwork(
            username=username,
            title=title,
            description=description,
            position_index=position_index,
            file=image,
            db=db,
        )
        return _artwork_response(artwork)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{username}/artworks/{position_index}", status_code=204)
def remove_artwork(
    username: str,
    position_index: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.username != username.lower():
        raise HTTPException(status_code=403, detail="You can only delete from your own room")

    delete_artwork(username=username, position_index=position_index, db=db)
