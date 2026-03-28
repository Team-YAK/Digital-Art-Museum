from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Room
from app.schemas import UserCreate, UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=UserResponse)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    username = data.username.strip().lower()

    if not username or len(username) < 2 or len(username) > 20:
        raise HTTPException(status_code=400, detail="Username must be 2-20 characters")

    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    user = User(username=username)
    db.add(user)
    db.flush()

    room = Room(owner_user_id=user.id, artist_description="")
    db.add(room)
    db.commit()
    db.refresh(user)
    db.refresh(room)

    return UserResponse(
        id=user.id,
        username=user.username,
        room_id=room.id,
        created_at=user.created_at.isoformat(),
    )


@router.get("/{username}", response_model=UserResponse)
def get_user(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=user.id,
        username=user.username,
        room_id=user.room.id,
        created_at=user.created_at.isoformat(),
    )
